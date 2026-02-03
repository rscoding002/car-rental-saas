-- Migration: 011_booking_addons
-- Description: Create booking_addons table for add-ons selected per booking
-- Date: 2026-01-31

-- Create booking_addons table
CREATE TABLE booking_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    addon_id UUID NOT NULL REFERENCES addons(id) ON DELETE RESTRICT,
    quantity INTEGER DEFAULT 1 CHECK (quantity >= 1),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    price_type VARCHAR(20) NOT NULL CHECK (price_type IN ('per_day', 'per_rental', 'one_time')),
    total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Each addon can only be added once per booking
    CONSTRAINT uq_booking_addons_booking_addon UNIQUE (booking_id, addon_id)
);

-- Add comments for documentation
COMMENT ON TABLE booking_addons IS 'Add-ons selected for each booking with pricing at time of booking';
COMMENT ON COLUMN booking_addons.booking_id IS 'Parent booking';
COMMENT ON COLUMN booking_addons.addon_id IS 'Selected addon';
COMMENT ON COLUMN booking_addons.quantity IS 'Quantity selected (e.g., 2 child seats)';
COMMENT ON COLUMN booking_addons.unit_price IS 'Price per unit at time of booking';
COMMENT ON COLUMN booking_addons.price_type IS 'Pricing model used for calculation';
COMMENT ON COLUMN booking_addons.total_price IS 'Pre-calculated total (unit_price * quantity * days if per_day)';

-- Create indexes for common queries
CREATE INDEX idx_booking_addons_booking_id ON booking_addons(booking_id);
CREATE INDEX idx_booking_addons_addon_id ON booking_addons(addon_id);

-- RLS: Enable Row Level Security
ALTER TABLE booking_addons ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users who can view bookings can view their addons
CREATE POLICY "Users can view booking addons for accessible bookings"
    ON booking_addons
    FOR SELECT
    USING (
        booking_id IN (
            SELECT b.id FROM bookings b
            WHERE b.customer_id IN (
                SELECT id FROM users WHERE auth_id = auth.uid()
            )
        )
        OR has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff', 'platform_admin'])
    );

-- RLS Policy: Tenant staff can manage booking addons
CREATE POLICY "Tenant staff can manage booking addons"
    ON booking_addons
    FOR ALL
    USING (
        booking_id IN (
            SELECT b.id FROM bookings b
            WHERE b.tenant_id = current_tenant_id()
        )
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    )
    WITH CHECK (
        booking_id IN (
            SELECT b.id FROM bookings b
            WHERE b.tenant_id = current_tenant_id()
        )
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    );

-- RLS Policy: Customers can add addons to their own bookings (during booking flow)
CREATE POLICY "Customers can add addons to own bookings"
    ON booking_addons
    FOR INSERT
    WITH CHECK (
        booking_id IN (
            SELECT b.id FROM bookings b
            WHERE b.customer_id IN (
                SELECT id FROM users WHERE auth_id = auth.uid()
            )
            AND b.status = 'pending'
        )
    );

-- RLS Policy: Platform admins can manage all booking addons
CREATE POLICY "Platform admins can manage all booking addons"
    ON booking_addons
    FOR ALL
    USING (has_role('platform_admin'))
    WITH CHECK (has_role('platform_admin'));

-- Function to get total addons cost for a booking
CREATE OR REPLACE FUNCTION get_booking_addons_total(p_booking_id UUID)
RETURNS DECIMAL(10, 2) AS $$
    SELECT COALESCE(SUM(total_price), 0)
    FROM booking_addons
    WHERE booking_id = p_booking_id;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_booking_addons_total IS 'Get total cost of all addons for a booking';

-- Function to add addon to booking with price calculation
CREATE OR REPLACE FUNCTION add_booking_addon(
    p_booking_id UUID,
    p_addon_id UUID,
    p_quantity INTEGER DEFAULT 1
)
RETURNS booking_addons AS $$
DECLARE
    v_addon RECORD;
    v_booking RECORD;
    v_rental_days INTEGER;
    v_total_price DECIMAL(10, 2);
    v_result booking_addons;
BEGIN
    -- Get addon details
    SELECT * INTO v_addon FROM addons WHERE id = p_addon_id AND status = 'active';
    IF v_addon IS NULL THEN
        RAISE EXCEPTION 'Addon not found or inactive';
    END IF;

    -- Check quantity limit
    IF p_quantity > v_addon.max_quantity THEN
        RAISE EXCEPTION 'Quantity exceeds maximum allowed (%)' , v_addon.max_quantity;
    END IF;

    -- Get booking details
    SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
    IF v_booking IS NULL THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    -- Calculate rental days
    v_rental_days := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_booking.return_at - v_booking.pickup_at)) / 86400));

    -- Calculate total price based on price type
    CASE v_addon.price_type
        WHEN 'per_day' THEN
            v_total_price := v_addon.price * p_quantity * v_rental_days;
        WHEN 'per_rental', 'one_time' THEN
            v_total_price := v_addon.price * p_quantity;
        ELSE
            v_total_price := 0;
    END CASE;

    -- Insert or update booking addon
    INSERT INTO booking_addons (booking_id, addon_id, quantity, unit_price, price_type, total_price)
    VALUES (p_booking_id, p_addon_id, p_quantity, v_addon.price, v_addon.price_type, v_total_price)
    ON CONFLICT (booking_id, addon_id)
    DO UPDATE SET
        quantity = EXCLUDED.quantity,
        total_price = EXCLUDED.total_price
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_booking_addon IS 'Add or update an addon for a booking with automatic price calculation';
