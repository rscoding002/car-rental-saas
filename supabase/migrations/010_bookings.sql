-- Migration: 010_bookings
-- Description: Create bookings table for reservations
-- Date: 2026-01-31

-- Create bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reference VARCHAR(20) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    pickup_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    return_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    pickup_at TIMESTAMPTZ NOT NULL,
    return_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
    pricing JSONB NOT NULL,
    coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
    driver_info JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    stripe_payment_intent_id VARCHAR(255),
    stripe_checkout_session_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Return must be after pickup
    CONSTRAINT chk_bookings_dates CHECK (return_at > pickup_at),

    -- Cancellation fields must be set together
    CONSTRAINT chk_bookings_cancellation CHECK (
        (cancelled_at IS NULL AND cancellation_reason IS NULL) OR
        (cancelled_at IS NOT NULL AND status = 'cancelled')
    )
);

-- Add comments for documentation
COMMENT ON TABLE bookings IS 'Vehicle reservations with pricing and status tracking';
COMMENT ON COLUMN bookings.reference IS 'Human-readable booking reference (e.g., BK-240131-001)';
COMMENT ON COLUMN bookings.customer_id IS 'Customer who made the booking';
COMMENT ON COLUMN bookings.vehicle_id IS 'Reserved vehicle';
COMMENT ON COLUMN bookings.pickup_branch_id IS 'Pickup location';
COMMENT ON COLUMN bookings.return_branch_id IS 'Return location (may differ for one-way rentals)';
COMMENT ON COLUMN bookings.pricing IS 'Complete pricing breakdown at time of booking';
COMMENT ON COLUMN bookings.driver_info IS 'Driver details (name, license, contact)';
COMMENT ON COLUMN bookings.stripe_payment_intent_id IS 'Stripe PaymentIntent ID for payment tracking';
COMMENT ON COLUMN bookings.stripe_checkout_session_id IS 'Stripe Checkout Session ID';

-- Create indexes for common queries
CREATE INDEX idx_bookings_tenant_id ON bookings(tenant_id);
CREATE INDEX idx_bookings_reference ON bookings(reference);
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_vehicle_id ON bookings(vehicle_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(pickup_at, return_at);
CREATE INDEX idx_bookings_pickup_branch ON bookings(pickup_branch_id);
CREATE INDEX idx_bookings_return_branch ON bookings(return_branch_id);
CREATE INDEX idx_bookings_tenant_status ON bookings(tenant_id, status);
CREATE INDEX idx_bookings_tenant_dates ON bookings(tenant_id, pickup_at, return_at);
CREATE INDEX idx_bookings_stripe_session ON bookings(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;

-- Apply updated_at trigger
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: Enable Row Level Security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Customers can view their own bookings
CREATE POLICY "Customers can view own bookings"
    ON bookings
    FOR SELECT
    USING (
        customer_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid()
        )
    );

-- RLS Policy: Customers can create bookings for themselves
CREATE POLICY "Customers can create own bookings"
    ON bookings
    FOR INSERT
    WITH CHECK (
        customer_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid()
        )
    );

-- RLS Policy: Tenant staff can view all bookings in their tenant
CREATE POLICY "Tenant staff can view all tenant bookings"
    ON bookings
    FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    );

-- RLS Policy: Tenant staff can manage bookings
CREATE POLICY "Tenant staff can manage bookings"
    ON bookings
    FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    )
    WITH CHECK (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    );

-- RLS Policy: Platform admins can manage all bookings
CREATE POLICY "Platform admins can manage all bookings"
    ON bookings
    FOR ALL
    USING (has_role('platform_admin'))
    WITH CHECK (has_role('platform_admin'));

-- Function to generate booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS VARCHAR AS $$
DECLARE
    v_date_part VARCHAR;
    v_seq_num INTEGER;
    v_ref VARCHAR;
BEGIN
    v_date_part := to_char(NOW(), 'YYMMDD');

    SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM 11) AS INTEGER)), 0) + 1
    INTO v_seq_num
    FROM bookings
    WHERE reference LIKE 'BK-' || v_date_part || '-%';

    v_ref := 'BK-' || v_date_part || '-' || LPAD(v_seq_num::TEXT, 3, '0');
    RETURN v_ref;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_booking_reference IS 'Generate human-readable booking reference (BK-YYMMDD-NNN)';

-- Trigger to auto-generate booking reference
CREATE OR REPLACE FUNCTION set_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference IS NULL OR NEW.reference = '' THEN
        NEW.reference := generate_booking_reference();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_booking_reference
    BEFORE INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION set_booking_reference();

-- Function to check vehicle availability
CREATE OR REPLACE FUNCTION check_vehicle_availability(
    p_vehicle_id UUID,
    p_pickup_at TIMESTAMPTZ,
    p_return_at TIMESTAMPTZ,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_buffer_minutes INTEGER;
    v_conflict_count INTEGER;
BEGIN
    -- Get buffer time from tenant settings (default 60 minutes)
    SELECT COALESCE((t.settings->>'bufferTime')::INTEGER, 60)
    INTO v_buffer_minutes
    FROM vehicles v
    JOIN tenants t ON t.id = v.tenant_id
    WHERE v.id = p_vehicle_id;

    -- Check for overlapping bookings (considering buffer time)
    SELECT COUNT(*) INTO v_conflict_count
    FROM bookings b
    WHERE b.vehicle_id = p_vehicle_id
      AND b.status NOT IN ('cancelled', 'completed')
      AND (p_exclude_booking_id IS NULL OR b.id != p_exclude_booking_id)
      AND (
          -- New booking overlaps with existing (with buffer)
          (p_pickup_at < b.return_at + (v_buffer_minutes || ' minutes')::INTERVAL)
          AND
          (p_return_at + (v_buffer_minutes || ' minutes')::INTERVAL > b.pickup_at)
      );

    RETURN v_conflict_count = 0;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_vehicle_availability IS 'Check if vehicle is available for given date range (respects buffer time)';

-- Example pricing JSONB structure (for reference):
/*
{
    "baseRate": 50.00,
    "rateType": "daily",
    "duration": 3,
    "durationUnit": "days",
    "subtotal": 150.00,
    "seasonId": "uuid...",
    "seasonName": "Summer Peak",
    "seasonMultiplier": 1.2,
    "seasonAmount": 30.00,
    "addonsTotal": 45.00,
    "oneWayFee": 25.00,
    "discountType": "percentage",
    "discountValue": 10,
    "discountAmount": 22.50,
    "couponCode": "SUMMER10",
    "total": 227.50,
    "currency": "EUR"
}
*/

-- Example driver_info JSONB structure (for reference):
/*
{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+37060012345",
    "dateOfBirth": "1990-01-15",
    "driverLicense": {
        "number": "ABC123456",
        "expiryDate": "2028-01-15",
        "country": "LT"
    }
}
*/
