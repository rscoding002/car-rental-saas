-- Migration: 004_vehicle_categories
-- Description: Create vehicle_categories table for fleet groupings
-- Date: 2026-01-31

-- Create vehicle_categories table
CREATE TABLE vehicle_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name JSONB NOT NULL,
    description JSONB DEFAULT '{}'::jsonb,
    icon VARCHAR(50),
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE vehicle_categories IS 'Vehicle groupings/categories per tenant (Economy, SUV, Luxury, etc.)';
COMMENT ON COLUMN vehicle_categories.name IS 'Localized names: {"en": "Economy", "lt": "Ekonominė", "ru": "Эконом"}';
COMMENT ON COLUMN vehicle_categories.description IS 'Localized descriptions for each category';
COMMENT ON COLUMN vehicle_categories.icon IS 'Icon identifier (e.g., "car", "suv", "van", "luxury")';
COMMENT ON COLUMN vehicle_categories.sort_order IS 'Display order in lists and filters';

-- Create indexes for common queries
CREATE INDEX idx_vehicle_categories_tenant_id ON vehicle_categories(tenant_id);
CREATE INDEX idx_vehicle_categories_status ON vehicle_categories(status);
CREATE INDEX idx_vehicle_categories_tenant_status ON vehicle_categories(tenant_id, status);
CREATE INDEX idx_vehicle_categories_sort ON vehicle_categories(tenant_id, sort_order);

-- Apply updated_at trigger
CREATE TRIGGER update_vehicle_categories_updated_at
    BEFORE UPDATE ON vehicle_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: Enable Row Level Security
ALTER TABLE vehicle_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can view active categories (for public website)
CREATE POLICY "Public can view active categories"
    ON vehicle_categories
    FOR SELECT
    USING (status = 'active');

-- RLS Policy: Tenant staff can view all categories in their tenant
CREATE POLICY "Tenant staff can view all tenant categories"
    ON vehicle_categories
    FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    );

-- RLS Policy: Tenant admins can manage categories
CREATE POLICY "Tenant admins can manage categories"
    ON vehicle_categories
    FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager'])
    )
    WITH CHECK (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager'])
    );

-- RLS Policy: Platform admins can manage all categories
CREATE POLICY "Platform admins can manage all categories"
    ON vehicle_categories
    FOR ALL
    USING (has_role('platform_admin'))
    WITH CHECK (has_role('platform_admin'));

-- Example name/description JSONB structure (for reference):
/*
name: {
    "en": "Economy",
    "lt": "Ekonominė klasė",
    "ru": "Эконом класс"
}

description: {
    "en": "Fuel-efficient compact cars perfect for city driving",
    "lt": "Ekonomiški kompaktiški automobiliai, puikiai tinkantys važiavimui mieste",
    "ru": "Экономичные компактные автомобили, идеальные для городской езды"
}
*/
