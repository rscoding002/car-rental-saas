-- Migration: 020_buffer_time
-- Description: Add buffer time settings to vehicle_categories for per-category overrides
-- Date: 2026-02-01

-- Add buffer_time_minutes column to vehicle_categories
-- NULL means use global tenant setting, a value overrides for this category
ALTER TABLE vehicle_categories
ADD COLUMN buffer_time_minutes INTEGER DEFAULT NULL
    CHECK (buffer_time_minutes IS NULL OR (buffer_time_minutes >= 0 AND buffer_time_minutes <= 1440));

COMMENT ON COLUMN vehicle_categories.buffer_time_minutes IS
    'Buffer time in minutes between bookings for this category. NULL = use tenant global setting. Max 1440 (24 hours).';

-- Add buffer_time_minutes column to vehicles for vehicle-specific overrides
-- NULL means use category setting (or global if category is also NULL)
ALTER TABLE vehicles
ADD COLUMN buffer_time_minutes INTEGER DEFAULT NULL
    CHECK (buffer_time_minutes IS NULL OR (buffer_time_minutes >= 0 AND buffer_time_minutes <= 1440));

COMMENT ON COLUMN vehicles.buffer_time_minutes IS
    'Buffer time in minutes between bookings for this vehicle. NULL = use category/global setting. Max 1440 (24 hours).';

-- Create a function to get effective buffer time for a vehicle
-- Priority: Vehicle setting > Category setting > Tenant global setting
CREATE OR REPLACE FUNCTION get_vehicle_buffer_time(
    p_vehicle_id UUID
)
RETURNS TABLE (
    buffer_minutes INTEGER,
    source TEXT,
    source_id UUID
) AS $$
DECLARE
    v_vehicle RECORD;
    v_category RECORD;
    v_tenant RECORD;
BEGIN
    -- Get vehicle with its buffer time
    SELECT v.id, v.buffer_time_minutes, v.category_id, v.tenant_id
    INTO v_vehicle
    FROM vehicles v
    WHERE v.id = p_vehicle_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 60::INTEGER, 'default'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Check vehicle-specific buffer time
    IF v_vehicle.buffer_time_minutes IS NOT NULL THEN
        RETURN QUERY SELECT v_vehicle.buffer_time_minutes, 'vehicle'::TEXT, v_vehicle.id;
        RETURN;
    END IF;

    -- Check category buffer time
    SELECT c.id, c.buffer_time_minutes
    INTO v_category
    FROM vehicle_categories c
    WHERE c.id = v_vehicle.category_id;

    IF FOUND AND v_category.buffer_time_minutes IS NOT NULL THEN
        RETURN QUERY SELECT v_category.buffer_time_minutes, 'category'::TEXT, v_category.id;
        RETURN;
    END IF;

    -- Use tenant global setting
    SELECT t.id, (t.settings->>'bufferTime')::INTEGER as buffer_time
    INTO v_tenant
    FROM tenants t
    WHERE t.id = v_vehicle.tenant_id;

    IF FOUND AND v_tenant.buffer_time IS NOT NULL THEN
        RETURN QUERY SELECT v_tenant.buffer_time, 'global'::TEXT, v_tenant.id;
        RETURN;
    END IF;

    -- Default fallback (60 minutes)
    RETURN QUERY SELECT 60::INTEGER, 'default'::TEXT, NULL::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_vehicle_buffer_time IS
    'Returns the effective buffer time for a vehicle. Priority: Vehicle > Category > Tenant Global > Default (60 min)';

-- Create a function to check vehicle availability with buffer time
CREATE OR REPLACE FUNCTION check_vehicle_availability_with_buffer(
    p_vehicle_id UUID,
    p_pickup_at TIMESTAMPTZ,
    p_return_at TIMESTAMPTZ,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS TABLE (
    is_available BOOLEAN,
    buffer_minutes INTEGER,
    conflict_count INTEGER
) AS $$
DECLARE
    v_buffer_minutes INTEGER;
    v_buffered_pickup TIMESTAMPTZ;
    v_buffered_return TIMESTAMPTZ;
    v_conflict_count INTEGER;
BEGIN
    -- Get effective buffer time
    SELECT bt.buffer_minutes INTO v_buffer_minutes
    FROM get_vehicle_buffer_time(p_vehicle_id) bt;

    -- Calculate buffered time range
    v_buffered_pickup := p_pickup_at - (v_buffer_minutes || ' minutes')::INTERVAL;
    v_buffered_return := p_return_at + (v_buffer_minutes || ' minutes')::INTERVAL;

    -- Count conflicting bookings
    SELECT COUNT(*)::INTEGER INTO v_conflict_count
    FROM bookings b
    WHERE b.vehicle_id = p_vehicle_id
      AND b.status IN ('pending', 'confirmed', 'active')
      AND (p_exclude_booking_id IS NULL OR b.id != p_exclude_booking_id)
      AND b.pickup_at < v_buffered_return
      AND b.return_at > v_buffered_pickup;

    RETURN QUERY SELECT
        (v_conflict_count = 0)::BOOLEAN,
        v_buffer_minutes,
        v_conflict_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_vehicle_availability_with_buffer IS
    'Checks if a vehicle is available for a time range, considering buffer time and excluding a specific booking';

-- Update the existing check_vehicle_availability function if it exists
-- or create it if it doesn't
CREATE OR REPLACE FUNCTION check_vehicle_availability(
    p_vehicle_id UUID,
    p_pickup_at TIMESTAMPTZ,
    p_return_at TIMESTAMPTZ,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_result RECORD;
BEGIN
    SELECT * INTO v_result
    FROM check_vehicle_availability_with_buffer(p_vehicle_id, p_pickup_at, p_return_at, p_exclude_booking_id);

    RETURN v_result.is_available;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_vehicle_availability IS
    'Simple boolean check if a vehicle is available for a time range (uses buffer time)';
