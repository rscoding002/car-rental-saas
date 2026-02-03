-- Migration: 021_availability_blocks
-- Description: Create availability_blocks table for manual vehicle blocking
-- Date: 2026-02-01

-- Create availability_blocks table
CREATE TABLE availability_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    block_type VARCHAR(50) NOT NULL CHECK (block_type IN (
        'maintenance',
        'reserved',
        'out_of_service',
        'inspection',
        'damage_repair',
        'cleaning',
        'other'
    )),
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    reason VARCHAR(500),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    recurrence VARCHAR(20) DEFAULT 'none' CHECK (recurrence IN (
        'none',
        'daily',
        'weekly',
        'monthly'
    )),
    recurrence_end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure end_at is after start_at
    CONSTRAINT valid_date_range CHECK (end_at > start_at),
    -- Ensure recurrence_end_date is set if recurrence is not 'none'
    CONSTRAINT valid_recurrence CHECK (
        recurrence = 'none' OR recurrence_end_date IS NOT NULL
    )
);

-- Add comments for documentation
COMMENT ON TABLE availability_blocks IS 'Manual availability blocks for vehicles (maintenance, reserved, etc.)';
COMMENT ON COLUMN availability_blocks.block_type IS 'Type of block: maintenance, reserved, out_of_service, inspection, damage_repair, cleaning, other';
COMMENT ON COLUMN availability_blocks.start_at IS 'Block start date/time';
COMMENT ON COLUMN availability_blocks.end_at IS 'Block end date/time';
COMMENT ON COLUMN availability_blocks.reason IS 'Short reason for the block (visible to staff)';
COMMENT ON COLUMN availability_blocks.notes IS 'Internal notes about the block';
COMMENT ON COLUMN availability_blocks.created_by IS 'User who created the block';
COMMENT ON COLUMN availability_blocks.recurrence IS 'Recurrence pattern: none, daily, weekly, monthly';
COMMENT ON COLUMN availability_blocks.recurrence_end_date IS 'End date for recurring blocks';
COMMENT ON COLUMN availability_blocks.is_active IS 'Whether the block is currently active';

-- Create indexes for common queries
CREATE INDEX idx_availability_blocks_tenant_id ON availability_blocks(tenant_id);
CREATE INDEX idx_availability_blocks_vehicle_id ON availability_blocks(vehicle_id);
CREATE INDEX idx_availability_blocks_dates ON availability_blocks(start_at, end_at);
CREATE INDEX idx_availability_blocks_active ON availability_blocks(is_active) WHERE is_active = true;
CREATE INDEX idx_availability_blocks_vehicle_active ON availability_blocks(vehicle_id, is_active) WHERE is_active = true;
CREATE INDEX idx_availability_blocks_type ON availability_blocks(block_type);

-- Composite index for availability queries
CREATE INDEX idx_availability_blocks_lookup ON availability_blocks(vehicle_id, start_at, end_at, is_active);

-- Apply updated_at trigger
CREATE TRIGGER update_availability_blocks_updated_at
    BEFORE UPDATE ON availability_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: Enable Row Level Security
ALTER TABLE availability_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenant staff can view blocks in their tenant
CREATE POLICY "Tenant staff can view availability blocks"
    ON availability_blocks
    FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    );

-- RLS Policy: Tenant admins/managers can manage blocks
CREATE POLICY "Tenant admins can manage availability blocks"
    ON availability_blocks
    FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager'])
    )
    WITH CHECK (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager'])
    );

-- RLS Policy: Platform admins can manage all blocks
CREATE POLICY "Platform admins can manage all availability blocks"
    ON availability_blocks
    FOR ALL
    USING (has_role('platform_admin'))
    WITH CHECK (has_role('platform_admin'));

-- Function to check if a vehicle has any active blocks in a time range
CREATE OR REPLACE FUNCTION check_vehicle_blocks(
    p_vehicle_id UUID,
    p_start_at TIMESTAMPTZ,
    p_end_at TIMESTAMPTZ,
    p_exclude_block_id UUID DEFAULT NULL
)
RETURNS TABLE (
    has_blocks BOOLEAN,
    block_count INTEGER,
    block_ids UUID[]
) AS $$
DECLARE
    v_block_ids UUID[];
    v_count INTEGER;
BEGIN
    SELECT
        ARRAY_AGG(id),
        COUNT(*)::INTEGER
    INTO v_block_ids, v_count
    FROM availability_blocks
    WHERE vehicle_id = p_vehicle_id
      AND is_active = true
      AND (p_exclude_block_id IS NULL OR id != p_exclude_block_id)
      AND start_at < p_end_at
      AND end_at > p_start_at;

    RETURN QUERY SELECT
        (v_count > 0)::BOOLEAN,
        COALESCE(v_count, 0),
        COALESCE(v_block_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_vehicle_blocks IS
    'Check if a vehicle has any active availability blocks in a time range';

-- Function to get all blocks for a vehicle in a date range
CREATE OR REPLACE FUNCTION get_vehicle_blocks(
    p_vehicle_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    id UUID,
    block_type VARCHAR(50),
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    reason VARCHAR(500),
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ab.id,
        ab.block_type,
        ab.start_at,
        ab.end_at,
        ab.reason,
        ab.is_active
    FROM availability_blocks ab
    WHERE ab.vehicle_id = p_vehicle_id
      AND ab.start_at < (p_end_date + INTERVAL '1 day')::TIMESTAMPTZ
      AND ab.end_at > p_start_date::TIMESTAMPTZ
    ORDER BY ab.start_at;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_vehicle_blocks IS
    'Get all availability blocks for a vehicle within a date range';

-- Update the check_vehicle_availability function to include blocks
CREATE OR REPLACE FUNCTION check_vehicle_availability(
    p_vehicle_id UUID,
    p_pickup_at TIMESTAMPTZ,
    p_return_at TIMESTAMPTZ,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_buffer_result RECORD;
    v_block_result RECORD;
BEGIN
    -- Check for booking conflicts with buffer time
    SELECT * INTO v_buffer_result
    FROM check_vehicle_availability_with_buffer(p_vehicle_id, p_pickup_at, p_return_at, p_exclude_booking_id);

    IF NOT v_buffer_result.is_available THEN
        RETURN FALSE;
    END IF;

    -- Check for manual blocks
    SELECT * INTO v_block_result
    FROM check_vehicle_blocks(p_vehicle_id, p_pickup_at, p_return_at, NULL);

    RETURN NOT v_block_result.has_blocks;
END;
$$ LANGUAGE plpgsql STABLE;
