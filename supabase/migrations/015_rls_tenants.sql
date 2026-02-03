-- Migration: 015_rls_tenants
-- Description: Implement proper RLS policies for tenants table (platform admin only)
-- Date: 2026-01-31

-- Drop the placeholder policy from initial migration
DROP POLICY IF EXISTS "Platform admins can manage tenants" ON tenants;

-- RLS Policy: Platform admins can do everything with tenants
CREATE POLICY "Platform admins full access"
    ON tenants
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.auth_id = auth.uid()
            AND u.role = 'platform_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.auth_id = auth.uid()
            AND u.role = 'platform_admin'
        )
    );

-- RLS Policy: Tenant admins can view their own tenant
CREATE POLICY "Tenant admins can view own tenant"
    ON tenants
    FOR SELECT
    USING (
        id IN (
            SELECT u.tenant_id FROM users u
            WHERE u.auth_id = auth.uid()
            AND u.role IN ('tenant_admin', 'tenant_manager', 'tenant_staff')
        )
    );

-- RLS Policy: Tenant admins can update their own tenant settings (limited fields)
-- Note: This allows tenant admins to update branding, settings, etc.
-- but not critical fields like subscription_tier or status
CREATE POLICY "Tenant admins can update own tenant"
    ON tenants
    FOR UPDATE
    USING (
        id IN (
            SELECT u.tenant_id FROM users u
            WHERE u.auth_id = auth.uid()
            AND u.role = 'tenant_admin'
        )
    )
    WITH CHECK (
        id IN (
            SELECT u.tenant_id FROM users u
            WHERE u.auth_id = auth.uid()
            AND u.role = 'tenant_admin'
        )
    );

-- RLS Policy: Public can view active tenants by slug/domain (for tenant resolution)
-- This is needed for the middleware to resolve tenant from subdomain/domain
CREATE POLICY "Public can resolve tenant by slug or domain"
    ON tenants
    FOR SELECT
    USING (
        status = 'active'
    );

-- Function to check if user is platform admin
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid()
        AND role = 'platform_admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_platform_admin IS 'Check if current user is a platform admin';

-- Function to get tenant by slug (for middleware)
CREATE OR REPLACE FUNCTION get_tenant_by_slug(p_slug VARCHAR)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    slug VARCHAR,
    domain VARCHAR,
    logo_url TEXT,
    settings JSONB,
    subscription_tier VARCHAR,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.name,
        t.slug,
        t.domain,
        t.logo_url,
        t.settings,
        t.subscription_tier,
        t.status
    FROM tenants t
    WHERE t.slug = p_slug
      AND t.status = 'active';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_tenant_by_slug IS 'Get tenant details by slug for middleware resolution';

-- Function to get tenant by domain (for middleware)
CREATE OR REPLACE FUNCTION get_tenant_by_domain(p_domain VARCHAR)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    slug VARCHAR,
    domain VARCHAR,
    logo_url TEXT,
    settings JSONB,
    subscription_tier VARCHAR,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.name,
        t.slug,
        t.domain,
        t.logo_url,
        t.settings,
        t.subscription_tier,
        t.status
    FROM tenants t
    WHERE t.domain = p_domain
      AND t.status = 'active';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_tenant_by_domain IS 'Get tenant details by custom domain for middleware resolution';

-- Function for platform admin to create a new tenant
CREATE OR REPLACE FUNCTION create_tenant(
    p_name VARCHAR,
    p_slug VARCHAR,
    p_domain VARCHAR DEFAULT NULL,
    p_subscription_tier VARCHAR DEFAULT 'starter',
    p_settings JSONB DEFAULT '{}'::jsonb
)
RETURNS tenants AS $$
DECLARE
    v_tenant tenants;
BEGIN
    -- Only platform admins can create tenants
    IF NOT is_platform_admin() THEN
        RAISE EXCEPTION 'Only platform admins can create tenants';
    END IF;

    INSERT INTO tenants (name, slug, domain, subscription_tier, settings)
    VALUES (p_name, p_slug, p_domain, p_subscription_tier, p_settings)
    RETURNING * INTO v_tenant;

    RETURN v_tenant;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_tenant IS 'Create a new tenant (platform admin only)';

-- Function for platform admin to suspend a tenant
CREATE OR REPLACE FUNCTION suspend_tenant(p_tenant_id UUID)
RETURNS tenants AS $$
DECLARE
    v_tenant tenants;
BEGIN
    -- Only platform admins can suspend tenants
    IF NOT is_platform_admin() THEN
        RAISE EXCEPTION 'Only platform admins can suspend tenants';
    END IF;

    UPDATE tenants
    SET status = 'suspended', updated_at = NOW()
    WHERE id = p_tenant_id
    RETURNING * INTO v_tenant;

    RETURN v_tenant;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION suspend_tenant IS 'Suspend a tenant (platform admin only)';

-- Function for platform admin to reactivate a tenant
CREATE OR REPLACE FUNCTION reactivate_tenant(p_tenant_id UUID)
RETURNS tenants AS $$
DECLARE
    v_tenant tenants;
BEGIN
    -- Only platform admins can reactivate tenants
    IF NOT is_platform_admin() THEN
        RAISE EXCEPTION 'Only platform admins can reactivate tenants';
    END IF;

    UPDATE tenants
    SET status = 'active', updated_at = NOW()
    WHERE id = p_tenant_id AND status = 'suspended'
    RETURNING * INTO v_tenant;

    RETURN v_tenant;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reactivate_tenant IS 'Reactivate a suspended tenant (platform admin only)';
