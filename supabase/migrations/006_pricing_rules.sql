-- Migration: 006_pricing_rules
-- Description: Create pricing_rules table for base rate configuration
-- Date: 2026-01-31

-- Create pricing_rules table
CREATE TABLE pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES vehicle_categories(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    rate_type VARCHAR(20) NOT NULL CHECK (rate_type IN ('hourly', 'daily', 'weekly', 'monthly')),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) DEFAULT 'EUR',
    min_duration INTEGER CHECK (min_duration IS NULL OR min_duration > 0),
    max_duration INTEGER CHECK (max_duration IS NULL OR max_duration > 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Either category_id OR vehicle_id must be set (not both, not neither)
    CONSTRAINT chk_pricing_rules_target CHECK (
        (category_id IS NOT NULL AND vehicle_id IS NULL) OR
        (category_id IS NULL AND vehicle_id IS NOT NULL)
    ),

    -- min_duration must be less than max_duration if both set
    CONSTRAINT chk_pricing_rules_duration CHECK (
        min_duration IS NULL OR max_duration IS NULL OR min_duration <= max_duration
    )
);

-- Add comments for documentation
COMMENT ON TABLE pricing_rules IS 'Base rate configuration per category or specific vehicle';
COMMENT ON COLUMN pricing_rules.category_id IS 'Category-wide pricing (NULL if vehicle-specific)';
COMMENT ON COLUMN pricing_rules.vehicle_id IS 'Vehicle-specific pricing override (NULL if category-wide)';
COMMENT ON COLUMN pricing_rules.rate_type IS 'Rate period: hourly, daily, weekly, monthly';
COMMENT ON COLUMN pricing_rules.amount IS 'Rate amount in specified currency';
COMMENT ON COLUMN pricing_rules.min_duration IS 'Minimum rental duration (in rate_type units)';
COMMENT ON COLUMN pricing_rules.max_duration IS 'Maximum rental duration (in rate_type units)';

-- Create indexes for common queries
CREATE INDEX idx_pricing_rules_tenant_id ON pricing_rules(tenant_id);
CREATE INDEX idx_pricing_rules_category_id ON pricing_rules(category_id);
CREATE INDEX idx_pricing_rules_vehicle_id ON pricing_rules(vehicle_id);
CREATE INDEX idx_pricing_rules_status ON pricing_rules(status);
CREATE INDEX idx_pricing_rules_rate_type ON pricing_rules(rate_type);
CREATE INDEX idx_pricing_rules_tenant_category ON pricing_rules(tenant_id, category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_pricing_rules_tenant_vehicle ON pricing_rules(tenant_id, vehicle_id) WHERE vehicle_id IS NOT NULL;

-- Apply updated_at trigger
CREATE TRIGGER update_pricing_rules_updated_at
    BEFORE UPDATE ON pricing_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: Enable Row Level Security
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can view active pricing rules (for booking flow)
CREATE POLICY "Public can view active pricing rules"
    ON pricing_rules
    FOR SELECT
    USING (status = 'active');

-- RLS Policy: Tenant staff can view all pricing rules in their tenant
CREATE POLICY "Tenant staff can view all tenant pricing rules"
    ON pricing_rules
    FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    );

-- RLS Policy: Tenant admins can manage pricing rules
CREATE POLICY "Tenant admins can manage pricing rules"
    ON pricing_rules
    FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager'])
    )
    WITH CHECK (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager'])
    );

-- RLS Policy: Platform admins can manage all pricing rules
CREATE POLICY "Platform admins can manage all pricing rules"
    ON pricing_rules
    FOR ALL
    USING (has_role('platform_admin'))
    WITH CHECK (has_role('platform_admin'));

-- Helper function to get the applicable price for a vehicle
CREATE OR REPLACE FUNCTION get_vehicle_price(
    p_vehicle_id UUID,
    p_rate_type VARCHAR DEFAULT 'daily'
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    v_price DECIMAL(10, 2);
    v_category_id UUID;
BEGIN
    -- First try vehicle-specific pricing
    SELECT amount INTO v_price
    FROM pricing_rules
    WHERE vehicle_id = p_vehicle_id
      AND rate_type = p_rate_type
      AND status = 'active'
    LIMIT 1;

    IF v_price IS NOT NULL THEN
        RETURN v_price;
    END IF;

    -- Fall back to category pricing
    SELECT v.category_id INTO v_category_id
    FROM vehicles v
    WHERE v.id = p_vehicle_id;

    SELECT amount INTO v_price
    FROM pricing_rules
    WHERE category_id = v_category_id
      AND rate_type = p_rate_type
      AND status = 'active'
    LIMIT 1;

    RETURN COALESCE(v_price, 0);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_vehicle_price IS 'Get applicable price for a vehicle, checking vehicle-specific then category pricing';
