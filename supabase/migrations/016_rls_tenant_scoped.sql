-- Migration: 016_rls_tenant_scoped
-- Description: Consolidated RLS policies for all tenant-scoped tables
-- Date: 2026-01-31

-- This migration ensures consistent RLS enforcement across all tenant-scoped tables.
-- Individual table migrations already created basic policies; this adds refinements
-- and ensures the tenant isolation pattern is consistently applied.

-- ============================================================================
-- HELPER FUNCTIONS FOR TENANT CONTEXT
-- ============================================================================

-- Function to set tenant context for service role operations
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', p_tenant_id::TEXT, true);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_tenant_context IS 'Set tenant context for service role operations (local to transaction)';

-- Function to get tenant context (for service role)
CREATE OR REPLACE FUNCTION get_tenant_context()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_tenant_context IS 'Get tenant context set by service role';

-- Enhanced current_tenant_id that checks both user and context
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- First try to get from authenticated user
    SELECT tenant_id INTO v_tenant_id
    FROM users
    WHERE auth_id = auth.uid();

    -- If not found, try context (for service role operations)
    IF v_tenant_id IS NULL THEN
        v_tenant_id := get_tenant_context();
    END IF;

    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION current_tenant_id IS 'Get current tenant ID from user or context';

-- Function to verify tenant access
CREATE OR REPLACE FUNCTION verify_tenant_access(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Platform admins have access to all tenants
    IF has_role('platform_admin') THEN
        RETURN TRUE;
    END IF;

    -- Check if user belongs to the tenant
    RETURN p_tenant_id = current_tenant_id();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION verify_tenant_access IS 'Verify current user has access to specified tenant';

-- ============================================================================
-- ENSURE RLS IS ENABLED ON ALL TENANT-SCOPED TABLES
-- ============================================================================

-- Verify RLS is enabled (these are idempotent)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SERVICE ROLE BYPASS POLICIES
-- ============================================================================
-- These allow the service role (used by server-side code) to bypass RLS
-- when needed, while still respecting tenant context

-- Note: By default, service role bypasses RLS. These policies are for
-- cases where we want to use RLS with service role for extra safety.

-- ============================================================================
-- CROSS-TENANT QUERY PREVENTION
-- ============================================================================

-- Function to validate tenant_id on insert (prevents cross-tenant data insertion)
CREATE OR REPLACE FUNCTION validate_tenant_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip for platform admins
    IF has_role('platform_admin') THEN
        RETURN NEW;
    END IF;

    -- Ensure tenant_id matches current user's tenant
    IF NEW.tenant_id IS NOT NULL AND NEW.tenant_id != current_tenant_id() THEN
        RAISE EXCEPTION 'Cannot insert data for another tenant';
    END IF;

    -- Auto-set tenant_id if not provided
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := current_tenant_id();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply tenant validation triggers to all tenant-scoped tables
CREATE TRIGGER validate_tenant_branches
    BEFORE INSERT ON branches
    FOR EACH ROW EXECUTE FUNCTION validate_tenant_id_on_insert();

CREATE TRIGGER validate_tenant_vehicle_categories
    BEFORE INSERT ON vehicle_categories
    FOR EACH ROW EXECUTE FUNCTION validate_tenant_id_on_insert();

CREATE TRIGGER validate_tenant_vehicles
    BEFORE INSERT ON vehicles
    FOR EACH ROW EXECUTE FUNCTION validate_tenant_id_on_insert();

CREATE TRIGGER validate_tenant_pricing_rules
    BEFORE INSERT ON pricing_rules
    FOR EACH ROW EXECUTE FUNCTION validate_tenant_id_on_insert();

CREATE TRIGGER validate_tenant_seasons
    BEFORE INSERT ON seasons
    FOR EACH ROW EXECUTE FUNCTION validate_tenant_id_on_insert();

CREATE TRIGGER validate_tenant_addons
    BEFORE INSERT ON addons
    FOR EACH ROW EXECUTE FUNCTION validate_tenant_id_on_insert();

CREATE TRIGGER validate_tenant_coupons
    BEFORE INSERT ON coupons
    FOR EACH ROW EXECUTE FUNCTION validate_tenant_id_on_insert();

CREATE TRIGGER validate_tenant_bookings
    BEFORE INSERT ON bookings
    FOR EACH ROW EXECUTE FUNCTION validate_tenant_id_on_insert();

CREATE TRIGGER validate_tenant_pages
    BEFORE INSERT ON pages
    FOR EACH ROW EXECUTE FUNCTION validate_tenant_id_on_insert();

CREATE TRIGGER validate_tenant_media
    BEFORE INSERT ON media
    FOR EACH ROW EXECUTE FUNCTION validate_tenant_id_on_insert();

-- ============================================================================
-- TENANT STATISTICS FUNCTIONS
-- ============================================================================

-- Function to get tenant statistics (for admin dashboard)
CREATE OR REPLACE FUNCTION get_tenant_stats(p_tenant_id UUID DEFAULT NULL)
RETURNS TABLE (
    tenant_id UUID,
    total_vehicles BIGINT,
    available_vehicles BIGINT,
    total_bookings BIGINT,
    active_bookings BIGINT,
    total_customers BIGINT,
    total_revenue DECIMAL(12, 2)
) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := COALESCE(p_tenant_id, current_tenant_id());

    -- Verify access
    IF NOT verify_tenant_access(v_tenant_id) THEN
        RAISE EXCEPTION 'Access denied to tenant statistics';
    END IF;

    RETURN QUERY
    SELECT
        v_tenant_id,
        (SELECT COUNT(*) FROM vehicles v WHERE v.tenant_id = v_tenant_id)::BIGINT,
        (SELECT COUNT(*) FROM vehicles v WHERE v.tenant_id = v_tenant_id AND v.status = 'available')::BIGINT,
        (SELECT COUNT(*) FROM bookings b WHERE b.tenant_id = v_tenant_id)::BIGINT,
        (SELECT COUNT(*) FROM bookings b WHERE b.tenant_id = v_tenant_id AND b.status = 'active')::BIGINT,
        (SELECT COUNT(*) FROM users u WHERE u.tenant_id = v_tenant_id AND u.role = 'customer')::BIGINT,
        (SELECT COALESCE(SUM((b.pricing->>'total')::DECIMAL), 0)
         FROM bookings b
         WHERE b.tenant_id = v_tenant_id
         AND b.status IN ('confirmed', 'active', 'completed'))::DECIMAL(12, 2);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_tenant_stats IS 'Get statistics for a tenant (dashboard metrics)';

-- ============================================================================
-- AUDIT HELPER FOR FUTURE USE
-- ============================================================================

-- Function to log tenant operations (stub for future audit log integration)
CREATE OR REPLACE FUNCTION log_tenant_operation(
    p_operation VARCHAR,
    p_table_name VARCHAR,
    p_record_id UUID,
    p_old_data JSONB DEFAULT NULL,
    p_new_data JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Placeholder for future audit log implementation
    -- Will insert into audit_logs table when created in Phase 2
    NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_tenant_operation IS 'Log tenant operations for audit trail (Phase 2)';
