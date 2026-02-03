-- Migration: 017_rls_bookings
-- Description: Enhanced RLS policies for bookings (customers see own, staff see tenant's)
-- Date: 2026-01-31

-- Drop existing policies to replace with refined versions
DROP POLICY IF EXISTS "Customers can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can create own bookings" ON bookings;
DROP POLICY IF EXISTS "Tenant staff can view all tenant bookings" ON bookings;
DROP POLICY IF EXISTS "Tenant staff can manage bookings" ON bookings;
DROP POLICY IF EXISTS "Platform admins can manage all bookings" ON bookings;

-- ============================================================================
-- CUSTOMER POLICIES
-- ============================================================================

-- Customers can view their own bookings
CREATE POLICY "Customers view own bookings"
    ON bookings
    FOR SELECT
    USING (
        customer_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid()
        )
    );

-- Customers can create bookings for themselves
CREATE POLICY "Customers create own bookings"
    ON bookings
    FOR INSERT
    WITH CHECK (
        customer_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid()
        )
        AND tenant_id IN (
            SELECT id FROM tenants WHERE status = 'active'
        )
    );

-- Customers can update their own pending bookings (limited modifications)
CREATE POLICY "Customers update own pending bookings"
    ON bookings
    FOR UPDATE
    USING (
        customer_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid()
        )
        AND status IN ('pending', 'confirmed')
    )
    WITH CHECK (
        customer_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid()
        )
        -- Customers cannot change status to active/completed (only staff can)
        AND status IN ('pending', 'confirmed', 'cancelled')
    );

-- ============================================================================
-- TENANT STAFF POLICIES
-- ============================================================================

-- Tenant staff can view all bookings in their tenant
CREATE POLICY "Staff view tenant bookings"
    ON bookings
    FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    );

-- Tenant staff can create bookings (walk-ins, phone reservations)
CREATE POLICY "Staff create tenant bookings"
    ON bookings
    FOR INSERT
    WITH CHECK (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    );

-- Tenant staff can update any booking in their tenant
CREATE POLICY "Staff update tenant bookings"
    ON bookings
    FOR UPDATE
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    )
    WITH CHECK (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    );

-- Only tenant admins/managers can delete bookings (soft delete via status preferred)
CREATE POLICY "Admins delete tenant bookings"
    ON bookings
    FOR DELETE
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager'])
    );

-- ============================================================================
-- PLATFORM ADMIN POLICIES
-- ============================================================================

-- Platform admins have full access to all bookings
CREATE POLICY "Platform admins full access"
    ON bookings
    FOR ALL
    USING (has_role('platform_admin'))
    WITH CHECK (has_role('platform_admin'));

-- ============================================================================
-- BOOKING ADDONS POLICIES (Enhanced)
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view booking addons for accessible bookings" ON booking_addons;
DROP POLICY IF EXISTS "Tenant staff can manage booking addons" ON booking_addons;
DROP POLICY IF EXISTS "Customers can add addons to own bookings" ON booking_addons;
DROP POLICY IF EXISTS "Platform admins can manage all booking addons" ON booking_addons;

-- Customers can view addons for their own bookings
CREATE POLICY "Customers view own booking addons"
    ON booking_addons
    FOR SELECT
    USING (
        booking_id IN (
            SELECT b.id FROM bookings b
            WHERE b.customer_id IN (
                SELECT id FROM users WHERE auth_id = auth.uid()
            )
        )
    );

-- Customers can add/update addons on their pending bookings
CREATE POLICY "Customers manage own booking addons"
    ON booking_addons
    FOR ALL
    USING (
        booking_id IN (
            SELECT b.id FROM bookings b
            WHERE b.customer_id IN (
                SELECT id FROM users WHERE auth_id = auth.uid()
            )
            AND b.status = 'pending'
        )
    )
    WITH CHECK (
        booking_id IN (
            SELECT b.id FROM bookings b
            WHERE b.customer_id IN (
                SELECT id FROM users WHERE auth_id = auth.uid()
            )
            AND b.status = 'pending'
        )
    );

-- Staff can view all booking addons in their tenant
CREATE POLICY "Staff view tenant booking addons"
    ON booking_addons
    FOR SELECT
    USING (
        booking_id IN (
            SELECT b.id FROM bookings b
            WHERE b.tenant_id = current_tenant_id()
        )
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    );

-- Staff can manage all booking addons in their tenant
CREATE POLICY "Staff manage tenant booking addons"
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

-- Platform admins have full access
CREATE POLICY "Platform admins manage all booking addons"
    ON booking_addons
    FOR ALL
    USING (has_role('platform_admin'))
    WITH CHECK (has_role('platform_admin'));

-- ============================================================================
-- HELPER FUNCTIONS FOR BOOKING ACCESS
-- ============================================================================

-- Function to check if user can view a booking
CREATE OR REPLACE FUNCTION can_view_booking(p_booking_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_booking RECORD;
    v_user_id UUID;
BEGIN
    -- Get current user ID
    SELECT id INTO v_user_id FROM users WHERE auth_id = auth.uid();

    -- Get booking details
    SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;

    IF v_booking IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Platform admin can view all
    IF has_role('platform_admin') THEN
        RETURN TRUE;
    END IF;

    -- Tenant staff can view tenant bookings
    IF v_booking.tenant_id = current_tenant_id()
       AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff']) THEN
        RETURN TRUE;
    END IF;

    -- Customer can view own bookings
    IF v_booking.customer_id = v_user_id THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION can_view_booking IS 'Check if current user can view a specific booking';

-- Function to check if user can modify a booking
CREATE OR REPLACE FUNCTION can_modify_booking(p_booking_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_booking RECORD;
    v_user_id UUID;
BEGIN
    -- Get current user ID
    SELECT id INTO v_user_id FROM users WHERE auth_id = auth.uid();

    -- Get booking details
    SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;

    IF v_booking IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Platform admin can modify all
    IF has_role('platform_admin') THEN
        RETURN TRUE;
    END IF;

    -- Tenant staff can modify tenant bookings
    IF v_booking.tenant_id = current_tenant_id()
       AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff']) THEN
        RETURN TRUE;
    END IF;

    -- Customer can modify own pending/confirmed bookings
    IF v_booking.customer_id = v_user_id
       AND v_booking.status IN ('pending', 'confirmed') THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION can_modify_booking IS 'Check if current user can modify a specific booking';

-- Function to get customer's bookings
CREATE OR REPLACE FUNCTION get_my_bookings(
    p_status VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    reference VARCHAR,
    vehicle_id UUID,
    pickup_at TIMESTAMPTZ,
    return_at TIMESTAMPTZ,
    status VARCHAR,
    pricing JSONB,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT u.id INTO v_user_id FROM users u WHERE u.auth_id = auth.uid();

    RETURN QUERY
    SELECT
        b.id,
        b.reference,
        b.vehicle_id,
        b.pickup_at,
        b.return_at,
        b.status,
        b.pricing,
        b.created_at
    FROM bookings b
    WHERE b.customer_id = v_user_id
      AND (p_status IS NULL OR b.status = p_status)
    ORDER BY b.pickup_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_my_bookings IS 'Get current user''s bookings with optional status filter';
