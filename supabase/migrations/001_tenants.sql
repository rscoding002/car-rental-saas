-- Migration: 001_tenants
-- Description: Create tenants table for multi-tenant foundation
-- Date: 2026-01-31

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255) UNIQUE,
    logo_url TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    subscription_tier VARCHAR(50) DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'pro', 'business', 'enterprise')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE tenants IS 'Platform tenants (car rental companies)';
COMMENT ON COLUMN tenants.slug IS 'URL-safe identifier used for subdomain (e.g., tenant.platform.com)';
COMMENT ON COLUMN tenants.domain IS 'Custom domain (e.g., rent.company.com)';
COMMENT ON COLUMN tenants.settings IS 'Tenant configuration: branding, languages, currency, policies';
COMMENT ON COLUMN tenants.subscription_tier IS 'Subscription plan: starter, pro, business, enterprise';

-- Create indexes for common queries
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_domain ON tenants(domain) WHERE domain IS NOT NULL;
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_subscription_tier ON tenants(subscription_tier);

-- Create updated_at trigger function (will be reused by other tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tenants table
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: Enable Row Level Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only platform admins can manage tenants
-- Note: Platform admin check will be implemented via JWT claims
-- For now, create a permissive policy that will be refined when auth is set up
CREATE POLICY "Platform admins can manage tenants"
    ON tenants
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Example settings JSONB structure (for reference):
/*
{
    "branding": {
        "primaryColor": "#3B82F6",
        "secondaryColor": "#1E40AF",
        "accentColor": "#F59E0B",
        "fontFamily": "Inter"
    },
    "languages": {
        "enabled": ["en", "lt", "ru"],
        "default": "en"
    },
    "currency": "EUR",
    "timezone": "Europe/Vilnius",
    "bufferTime": 60,
    "cancellationPolicy": {
        "freeCancellationHours": 48,
        "partialRefundHours": 24,
        "partialRefundPercent": 50
    },
    "contact": {
        "email": "info@company.com",
        "phone": "+370...",
        "address": "..."
    }
}
*/
