-- Migration: 003_branches
-- Description: Create branches table for tenant locations
-- Date: 2026-01-31

-- Create branches table
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(2) DEFAULT 'LT',
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    phone VARCHAR(50),
    email VARCHAR(255),
    operating_hours JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: slug must be unique within tenant
    CONSTRAINT uq_branches_tenant_slug UNIQUE (tenant_id, slug)
);

-- Add comments for documentation
COMMENT ON TABLE branches IS 'Tenant locations/branches for vehicle pickup and return';
COMMENT ON COLUMN branches.slug IS 'URL-safe identifier unique within tenant';
COMMENT ON COLUMN branches.country IS 'ISO 3166-1 alpha-2 country code';
COMMENT ON COLUMN branches.latitude IS 'GPS latitude with ~1cm precision';
COMMENT ON COLUMN branches.longitude IS 'GPS longitude with ~1cm precision';
COMMENT ON COLUMN branches.operating_hours IS 'Operating hours per day of week';
COMMENT ON COLUMN branches.sort_order IS 'Display order in lists and dropdowns';

-- Create indexes for common queries
CREATE INDEX idx_branches_tenant_id ON branches(tenant_id);
CREATE INDEX idx_branches_status ON branches(status);
CREATE INDEX idx_branches_city ON branches(city);
CREATE INDEX idx_branches_tenant_status ON branches(tenant_id, status);

-- Apply updated_at trigger
CREATE TRIGGER update_branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: Enable Row Level Security
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can view active branches (for public website)
CREATE POLICY "Public can view active branches"
    ON branches
    FOR SELECT
    USING (status = 'active');

-- RLS Policy: Tenant staff can view all branches in their tenant
CREATE POLICY "Tenant staff can view all tenant branches"
    ON branches
    FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    );

-- RLS Policy: Tenant admins can manage branches
CREATE POLICY "Tenant admins can manage branches"
    ON branches
    FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager'])
    )
    WITH CHECK (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager'])
    );

-- RLS Policy: Platform admins can manage all branches
CREATE POLICY "Platform admins can manage all branches"
    ON branches
    FOR ALL
    USING (has_role('platform_admin'))
    WITH CHECK (has_role('platform_admin'));

-- Example operating_hours JSONB structure (for reference):
/*
{
    "monday": { "open": "08:00", "close": "18:00" },
    "tuesday": { "open": "08:00", "close": "18:00" },
    "wednesday": { "open": "08:00", "close": "18:00" },
    "thursday": { "open": "08:00", "close": "18:00" },
    "friday": { "open": "08:00", "close": "18:00" },
    "saturday": { "open": "09:00", "close": "14:00" },
    "sunday": null
}
*/
