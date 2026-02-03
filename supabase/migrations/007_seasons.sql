-- Migration: 007_seasons
-- Description: Create seasons table for seasonal pricing periods
-- Date: 2026-01-31

-- Create seasons table
CREATE TABLE seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    multiplier DECIMAL(4, 2) DEFAULT 1.00 CHECK (multiplier > 0 AND multiplier <= 10.00),
    priority INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- End date must be after start date
    CONSTRAINT chk_seasons_dates CHECK (end_date >= start_date)
);

-- Add comments for documentation
COMMENT ON TABLE seasons IS 'Seasonal pricing periods with price multipliers';
COMMENT ON COLUMN seasons.name IS 'Season name (e.g., "Summer Peak", "Christmas Holiday", "Off Season")';
COMMENT ON COLUMN seasons.start_date IS 'Season start date (inclusive)';
COMMENT ON COLUMN seasons.end_date IS 'Season end date (inclusive)';
COMMENT ON COLUMN seasons.multiplier IS 'Price multiplier (1.0 = no change, 1.5 = 50% increase, 0.8 = 20% discount)';
COMMENT ON COLUMN seasons.priority IS 'Higher priority wins when seasons overlap (0 = default)';

-- Create indexes for common queries
CREATE INDEX idx_seasons_tenant_id ON seasons(tenant_id);
CREATE INDEX idx_seasons_dates ON seasons(start_date, end_date);
CREATE INDEX idx_seasons_status ON seasons(status);
CREATE INDEX idx_seasons_tenant_status ON seasons(tenant_id, status);
CREATE INDEX idx_seasons_tenant_dates ON seasons(tenant_id, start_date, end_date);

-- Apply updated_at trigger
CREATE TRIGGER update_seasons_updated_at
    BEFORE UPDATE ON seasons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: Enable Row Level Security
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can view active seasons (for pricing display)
CREATE POLICY "Public can view active seasons"
    ON seasons
    FOR SELECT
    USING (status = 'active');

-- RLS Policy: Tenant staff can view all seasons in their tenant
CREATE POLICY "Tenant staff can view all tenant seasons"
    ON seasons
    FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    );

-- RLS Policy: Tenant admins can manage seasons
CREATE POLICY "Tenant admins can manage seasons"
    ON seasons
    FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager'])
    )
    WITH CHECK (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager'])
    );

-- RLS Policy: Platform admins can manage all seasons
CREATE POLICY "Platform admins can manage all seasons"
    ON seasons
    FOR ALL
    USING (has_role('platform_admin'))
    WITH CHECK (has_role('platform_admin'));

-- Helper function to get season multiplier for a date range
CREATE OR REPLACE FUNCTION get_season_multiplier(
    p_tenant_id UUID,
    p_date DATE
)
RETURNS DECIMAL(4, 2) AS $$
DECLARE
    v_multiplier DECIMAL(4, 2);
BEGIN
    SELECT multiplier INTO v_multiplier
    FROM seasons
    WHERE tenant_id = p_tenant_id
      AND status = 'active'
      AND p_date BETWEEN start_date AND end_date
    ORDER BY priority DESC
    LIMIT 1;

    RETURN COALESCE(v_multiplier, 1.00);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_season_multiplier IS 'Get the applicable season multiplier for a specific date, returns 1.00 if no season applies';

-- Helper function to get season info for a date
CREATE OR REPLACE FUNCTION get_season_for_date(
    p_tenant_id UUID,
    p_date DATE
)
RETURNS TABLE (
    season_id UUID,
    season_name VARCHAR(100),
    multiplier DECIMAL(4, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.name, s.multiplier
    FROM seasons s
    WHERE s.tenant_id = p_tenant_id
      AND s.status = 'active'
      AND p_date BETWEEN s.start_date AND s.end_date
    ORDER BY s.priority DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_season_for_date IS 'Get full season info for a specific date';
