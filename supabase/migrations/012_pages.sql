-- Migration: 012_pages
-- Description: Create pages table for CMS pages per tenant
-- Date: 2026-01-31

-- Create pages table
CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    title JSONB NOT NULL,
    meta JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    is_system BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Slug must be unique within tenant
    CONSTRAINT uq_pages_tenant_slug UNIQUE (tenant_id, slug)
);

-- Add comments for documentation
COMMENT ON TABLE pages IS 'CMS pages per tenant with localized content';
COMMENT ON COLUMN pages.slug IS 'URL path (e.g., "about", "contact", "terms")';
COMMENT ON COLUMN pages.title IS 'Localized page titles: {"en": "About Us", "lt": "Apie mus"}';
COMMENT ON COLUMN pages.meta IS 'SEO metadata per language (description, keywords, ogImage)';
COMMENT ON COLUMN pages.is_system IS 'System pages cannot be deleted (home, terms, privacy)';
COMMENT ON COLUMN pages.published_at IS 'Timestamp when page was first published';

-- Create indexes for common queries
CREATE INDEX idx_pages_tenant_id ON pages(tenant_id);
CREATE INDEX idx_pages_status ON pages(status);
CREATE INDEX idx_pages_tenant_status ON pages(tenant_id, status);
CREATE INDEX idx_pages_tenant_slug ON pages(tenant_id, slug);

-- Apply updated_at trigger
CREATE TRIGGER update_pages_updated_at
    BEFORE UPDATE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to set published_at when status changes to published
CREATE OR REPLACE FUNCTION set_page_published_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'published' AND OLD.status != 'published' AND NEW.published_at IS NULL THEN
        NEW.published_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_page_published_at
    BEFORE UPDATE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION set_page_published_at();

-- RLS: Enable Row Level Security
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can view published pages
CREATE POLICY "Public can view published pages"
    ON pages
    FOR SELECT
    USING (status = 'published');

-- RLS Policy: Tenant staff can view all pages in their tenant
CREATE POLICY "Tenant staff can view all tenant pages"
    ON pages
    FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    );

-- RLS Policy: Tenant admins can manage pages
CREATE POLICY "Tenant admins can manage pages"
    ON pages
    FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager'])
    )
    WITH CHECK (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager'])
    );

-- RLS Policy: Platform admins can manage all pages
CREATE POLICY "Platform admins can manage all pages"
    ON pages
    FOR ALL
    USING (has_role('platform_admin'))
    WITH CHECK (has_role('platform_admin'));

-- Prevent deletion of system pages
CREATE OR REPLACE FUNCTION prevent_system_page_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_system = true THEN
        RAISE EXCEPTION 'System pages cannot be deleted';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_system_page_deletion
    BEFORE DELETE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION prevent_system_page_deletion();

-- Example title JSONB structure (for reference):
/*
{
    "en": "About Us",
    "lt": "Apie mus",
    "ru": "О нас"
}
*/

-- Example meta JSONB structure (for reference):
/*
{
    "en": {
        "description": "Learn more about our car rental company and our mission.",
        "keywords": "car rental, about us, company",
        "ogImage": "https://storage.example.com/og-about.jpg",
        "canonical": "/about"
    },
    "lt": {
        "description": "Sužinokite daugiau apie mūsų automobilių nuomos įmonę.",
        "keywords": "automobilių nuoma, apie mus, įmonė",
        "ogImage": "https://storage.example.com/og-about-lt.jpg"
    },
    "ru": {
        "description": "Узнайте больше о нашей компании по аренде автомобилей.",
        "keywords": "аренда авто, о нас, компания"
    }
}
*/
