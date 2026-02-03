-- Migration: 002_users
-- Description: Create users table with tenant association and roles
-- Date: 2026-01-31

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    auth_id UUID UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('platform_admin', 'tenant_admin', 'tenant_manager', 'tenant_staff', 'customer')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    avatar_url TEXT,
    profile JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE users IS 'All platform users with tenant association and roles';
COMMENT ON COLUMN users.tenant_id IS 'Tenant association (NULL for platform admins)';
COMMENT ON COLUMN users.auth_id IS 'Supabase Auth user ID (from auth.users)';
COMMENT ON COLUMN users.role IS 'User role: platform_admin, tenant_admin, tenant_manager, tenant_staff, customer';
COMMENT ON COLUMN users.profile IS 'Additional profile data (driver license, address, preferences)';

-- Create indexes for common queries
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role);

-- Apply updated_at trigger
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Platform admins can see all users
CREATE POLICY "Platform admins can manage all users"
    ON users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.auth_id = auth.uid()
            AND u.role = 'platform_admin'
        )
    );

-- RLS Policy: Tenant staff can see users in their tenant
CREATE POLICY "Tenant staff can view tenant users"
    ON users
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT u.tenant_id FROM users u
            WHERE u.auth_id = auth.uid()
            AND u.role IN ('tenant_admin', 'tenant_manager', 'tenant_staff')
        )
    );

-- RLS Policy: Tenant admins can manage users in their tenant
CREATE POLICY "Tenant admins can manage tenant users"
    ON users
    FOR ALL
    USING (
        tenant_id IN (
            SELECT u.tenant_id FROM users u
            WHERE u.auth_id = auth.uid()
            AND u.role IN ('tenant_admin', 'tenant_manager')
        )
    )
    WITH CHECK (
        tenant_id IN (
            SELECT u.tenant_id FROM users u
            WHERE u.auth_id = auth.uid()
            AND u.role IN ('tenant_admin', 'tenant_manager')
        )
    );

-- RLS Policy: Users can view and update their own profile
CREATE POLICY "Users can view own profile"
    ON users
    FOR SELECT
    USING (auth_id = auth.uid());

CREATE POLICY "Users can update own profile"
    ON users
    FOR UPDATE
    USING (auth_id = auth.uid())
    WITH CHECK (auth_id = auth.uid());

-- Function to get current user's tenant_id from JWT
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
    SELECT tenant_id FROM users WHERE auth_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to get current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS VARCHAR AS $$
    SELECT role FROM users WHERE auth_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if current user has a specific role
CREATE OR REPLACE FUNCTION has_role(required_role VARCHAR)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid()
        AND role = required_role
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if current user has any of the specified roles
CREATE OR REPLACE FUNCTION has_any_role(required_roles VARCHAR[])
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid()
        AND role = ANY(required_roles)
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Example profile JSONB structure for customers (for reference):
/*
{
    "dateOfBirth": "1990-01-15",
    "driverLicense": {
        "number": "ABC123456",
        "expiryDate": "2028-01-15",
        "country": "LT"
    },
    "address": {
        "street": "Main Street 1",
        "city": "Vilnius",
        "postalCode": "01001",
        "country": "LT"
    },
    "preferences": {
        "language": "en",
        "newsletter": true
    }
}
*/
