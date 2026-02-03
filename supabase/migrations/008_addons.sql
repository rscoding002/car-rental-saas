-- Migration: 008_addons
-- Description: Create addons table for optional extras (GPS, child seat, insurance)
-- Date: 2026-01-31

-- Create addons table
CREATE TABLE addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name JSONB NOT NULL,
    description JSONB DEFAULT '{}'::jsonb,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    price_type VARCHAR(20) NOT NULL CHECK (price_type IN ('per_day', 'per_rental', 'one_time')),
    max_quantity INTEGER DEFAULT 1 CHECK (max_quantity >= 1 AND max_quantity <= 100),
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE addons IS 'Optional extras available for booking (GPS, child seat, insurance, etc.)';
COMMENT ON COLUMN addons.name IS 'Localized names: {"en": "GPS Navigation", "lt": "GPS navigacija", "ru": "GPS навигация"}';
COMMENT ON COLUMN addons.description IS 'Localized descriptions for each addon';
COMMENT ON COLUMN addons.price IS 'Price amount in tenant currency';
COMMENT ON COLUMN addons.price_type IS 'Pricing model: per_day (multiplied by rental days), per_rental (flat fee), one_time (same as per_rental)';
COMMENT ON COLUMN addons.max_quantity IS 'Maximum quantity customer can select (e.g., 4 child seats)';
COMMENT ON COLUMN addons.sort_order IS 'Display order in addon selection';

-- Create indexes for common queries
CREATE INDEX idx_addons_tenant_id ON addons(tenant_id);
CREATE INDEX idx_addons_status ON addons(status);
CREATE INDEX idx_addons_tenant_status ON addons(tenant_id, status);
CREATE INDEX idx_addons_sort ON addons(tenant_id, sort_order);

-- Apply updated_at trigger
CREATE TRIGGER update_addons_updated_at
    BEFORE UPDATE ON addons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: Enable Row Level Security
ALTER TABLE addons ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can view active addons (for booking flow)
CREATE POLICY "Public can view active addons"
    ON addons
    FOR SELECT
    USING (status = 'active');

-- RLS Policy: Tenant staff can view all addons in their tenant
CREATE POLICY "Tenant staff can view all tenant addons"
    ON addons
    FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    );

-- RLS Policy: Tenant admins can manage addons
CREATE POLICY "Tenant admins can manage addons"
    ON addons
    FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager'])
    )
    WITH CHECK (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager'])
    );

-- RLS Policy: Platform admins can manage all addons
CREATE POLICY "Platform admins can manage all addons"
    ON addons
    FOR ALL
    USING (has_role('platform_admin'))
    WITH CHECK (has_role('platform_admin'));

-- Helper function to calculate addon total price
CREATE OR REPLACE FUNCTION calculate_addon_price(
    p_addon_id UUID,
    p_quantity INTEGER,
    p_rental_days INTEGER
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    v_addon RECORD;
    v_total DECIMAL(10, 2);
BEGIN
    SELECT price, price_type INTO v_addon
    FROM addons
    WHERE id = p_addon_id AND status = 'active';

    IF v_addon IS NULL THEN
        RETURN 0;
    END IF;

    CASE v_addon.price_type
        WHEN 'per_day' THEN
            v_total := v_addon.price * p_quantity * p_rental_days;
        WHEN 'per_rental', 'one_time' THEN
            v_total := v_addon.price * p_quantity;
        ELSE
            v_total := 0;
    END CASE;

    RETURN v_total;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_addon_price IS 'Calculate total price for an addon based on quantity and rental duration';

-- Example name/description JSONB structure (for reference):
/*
name: {
    "en": "GPS Navigation",
    "lt": "GPS navigacija",
    "ru": "GPS навигация"
}

description: {
    "en": "Portable GPS device with European maps and live traffic updates",
    "lt": "Nešiojamas GPS įrenginys su Europos žemėlapiais ir eismo informacija",
    "ru": "Портативное GPS устройство с картами Европы и информацией о пробках"
}

Common addons:
- GPS Navigation (per_day)
- Child Seat (per_day)
- Baby Seat (per_day)
- Booster Seat (per_day)
- Additional Driver (per_day)
- Full Insurance (per_day)
- Snow Chains (per_rental)
- Roof Box (per_day)
- WiFi Hotspot (per_day)
- Cross-Border Fee (one_time)
*/
