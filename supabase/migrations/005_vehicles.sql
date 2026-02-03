-- Migration: 005_vehicles
-- Description: Create vehicles table for fleet inventory
-- Date: 2026-01-31

-- Create vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES vehicle_categories(id) ON DELETE RESTRICT,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2100),
    license_plate VARCHAR(20) NOT NULL,
    vin VARCHAR(50),
    transmission VARCHAR(20) NOT NULL CHECK (transmission IN ('manual', 'automatic')),
    fuel_type VARCHAR(20) NOT NULL CHECK (fuel_type IN ('petrol', 'diesel', 'electric', 'hybrid', 'plugin_hybrid')),
    seats INTEGER NOT NULL CHECK (seats >= 1 AND seats <= 50),
    doors INTEGER NOT NULL CHECK (doors >= 1 AND doors <= 10),
    luggage_capacity INTEGER CHECK (luggage_capacity >= 0),
    features JSONB DEFAULT '[]'::jsonb,
    photos JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'rented', 'maintenance', 'retired')),
    odometer INTEGER CHECK (odometer >= 0),
    color VARCHAR(50),
    description JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: license plate must be unique within tenant
    CONSTRAINT uq_vehicles_tenant_license_plate UNIQUE (tenant_id, license_plate)
);

-- Add comments for documentation
COMMENT ON TABLE vehicles IS 'Fleet inventory with specifications and photos';
COMMENT ON COLUMN vehicles.branch_id IS 'Home branch where vehicle is based';
COMMENT ON COLUMN vehicles.license_plate IS 'Vehicle registration plate (unique per tenant)';
COMMENT ON COLUMN vehicles.vin IS 'Vehicle Identification Number';
COMMENT ON COLUMN vehicles.transmission IS 'Transmission type: manual or automatic';
COMMENT ON COLUMN vehicles.fuel_type IS 'Fuel type: petrol, diesel, electric, hybrid, plugin_hybrid';
COMMENT ON COLUMN vehicles.luggage_capacity IS 'Number of luggage pieces that fit';
COMMENT ON COLUMN vehicles.features IS 'Array of feature strings: ["AC", "GPS", "Bluetooth", "Cruise Control"]';
COMMENT ON COLUMN vehicles.photos IS 'Array of photo objects with url, isPrimary, order';
COMMENT ON COLUMN vehicles.odometer IS 'Current odometer reading in kilometers';
COMMENT ON COLUMN vehicles.description IS 'Localized descriptions for vehicle details page';

-- Create indexes for common queries
CREATE INDEX idx_vehicles_tenant_id ON vehicles(tenant_id);
CREATE INDEX idx_vehicles_branch_id ON vehicles(branch_id);
CREATE INDEX idx_vehicles_category_id ON vehicles(category_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_tenant_status ON vehicles(tenant_id, status);
CREATE INDEX idx_vehicles_make_model ON vehicles(make, model);
CREATE INDEX idx_vehicles_transmission ON vehicles(transmission);
CREATE INDEX idx_vehicles_fuel_type ON vehicles(fuel_type);

-- Composite index for common filter combinations
CREATE INDEX idx_vehicles_tenant_category_status ON vehicles(tenant_id, category_id, status);

-- Apply updated_at trigger
CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: Enable Row Level Security
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can view available vehicles (for public website)
CREATE POLICY "Public can view available vehicles"
    ON vehicles
    FOR SELECT
    USING (status IN ('available', 'rented'));

-- RLS Policy: Tenant staff can view all vehicles in their tenant
CREATE POLICY "Tenant staff can view all tenant vehicles"
    ON vehicles
    FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    );

-- RLS Policy: Tenant admins can manage vehicles
CREATE POLICY "Tenant admins can manage vehicles"
    ON vehicles
    FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager'])
    )
    WITH CHECK (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager'])
    );

-- RLS Policy: Tenant staff can update vehicle status (for check-in/out)
CREATE POLICY "Tenant staff can update vehicle status"
    ON vehicles
    FOR UPDATE
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    )
    WITH CHECK (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    );

-- RLS Policy: Platform admins can manage all vehicles
CREATE POLICY "Platform admins can manage all vehicles"
    ON vehicles
    FOR ALL
    USING (has_role('platform_admin'))
    WITH CHECK (has_role('platform_admin'));

-- Example features JSONB structure (for reference):
/*
[
    "Air Conditioning",
    "Bluetooth",
    "USB Charging",
    "GPS Navigation",
    "Cruise Control",
    "Backup Camera",
    "Heated Seats",
    "Leather Interior",
    "Sunroof"
]
*/

-- Example photos JSONB structure (for reference):
/*
[
    {
        "url": "https://storage.example.com/vehicles/vehicle-1-front.jpg",
        "isPrimary": true,
        "order": 0
    },
    {
        "url": "https://storage.example.com/vehicles/vehicle-1-side.jpg",
        "isPrimary": false,
        "order": 1
    },
    {
        "url": "https://storage.example.com/vehicles/vehicle-1-interior.jpg",
        "isPrimary": false,
        "order": 2
    }
]
*/
