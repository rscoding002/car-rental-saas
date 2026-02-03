-- Migration: 014_media
-- Description: Create media table for uploaded files and images
-- Date: 2026-01-31

-- Create media table
CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    url TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size INTEGER NOT NULL CHECK (size > 0),
    width INTEGER CHECK (width IS NULL OR width > 0),
    height INTEGER CHECK (height IS NULL OR height > 0),
    alt_text JSONB DEFAULT '{}'::jsonb,
    folder VARCHAR(100) DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE media IS 'Uploaded files and images for CMS and vehicle photos';
COMMENT ON COLUMN media.filename IS 'Original filename as uploaded';
COMMENT ON COLUMN media.storage_path IS 'Path in Supabase Storage bucket';
COMMENT ON COLUMN media.url IS 'Public URL for accessing the file';
COMMENT ON COLUMN media.mime_type IS 'MIME type (image/jpeg, image/png, application/pdf, etc.)';
COMMENT ON COLUMN media.size IS 'File size in bytes';
COMMENT ON COLUMN media.width IS 'Image width in pixels (NULL for non-images)';
COMMENT ON COLUMN media.height IS 'Image height in pixels (NULL for non-images)';
COMMENT ON COLUMN media.alt_text IS 'Localized alt text for accessibility: {"en": "...", "lt": "..."}';
COMMENT ON COLUMN media.folder IS 'Organization folder (general, vehicles, pages, branding)';

-- Create indexes for common queries
CREATE INDEX idx_media_tenant_id ON media(tenant_id);
CREATE INDEX idx_media_folder ON media(tenant_id, folder);
CREATE INDEX idx_media_mime_type ON media(mime_type);
CREATE INDEX idx_media_created_at ON media(tenant_id, created_at DESC);

-- Apply updated_at trigger
CREATE TRIGGER update_media_updated_at
    BEFORE UPDATE ON media
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: Enable Row Level Security
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can view media (images are public)
CREATE POLICY "Public can view media"
    ON media
    FOR SELECT
    USING (true);

-- RLS Policy: Tenant staff can manage media in their tenant
CREATE POLICY "Tenant staff can manage media"
    ON media
    FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    )
    WITH CHECK (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    );

-- RLS Policy: Platform admins can manage all media
CREATE POLICY "Platform admins can manage all media"
    ON media
    FOR ALL
    USING (has_role('platform_admin'))
    WITH CHECK (has_role('platform_admin'));

-- Function to get media by folder
CREATE OR REPLACE FUNCTION get_media_by_folder(
    p_tenant_id UUID,
    p_folder VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    filename VARCHAR,
    url TEXT,
    mime_type VARCHAR,
    size INTEGER,
    width INTEGER,
    height INTEGER,
    folder VARCHAR,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.filename,
        m.url,
        m.mime_type,
        m.size,
        m.width,
        m.height,
        m.folder,
        m.created_at
    FROM media m
    WHERE m.tenant_id = p_tenant_id
      AND (p_folder IS NULL OR m.folder = p_folder)
    ORDER BY m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_media_by_folder IS 'Get paginated media files optionally filtered by folder';

-- Function to get storage usage per tenant
CREATE OR REPLACE FUNCTION get_tenant_storage_usage(p_tenant_id UUID)
RETURNS TABLE (
    total_files BIGINT,
    total_size BIGINT,
    size_by_folder JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_files,
        COALESCE(SUM(m.size), 0)::BIGINT as total_size,
        COALESCE(
            jsonb_object_agg(
                m.folder,
                folder_stats.folder_size
            ),
            '{}'::jsonb
        ) as size_by_folder
    FROM media m
    LEFT JOIN (
        SELECT folder, SUM(size) as folder_size
        FROM media
        WHERE tenant_id = p_tenant_id
        GROUP BY folder
    ) folder_stats ON m.folder = folder_stats.folder
    WHERE m.tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_tenant_storage_usage IS 'Get storage usage statistics for a tenant';

-- Common folders reference:
/*
Folders:
- 'general'   : General uploads, misc files
- 'vehicles'  : Vehicle photos
- 'pages'     : CMS page images
- 'branding'  : Logo, favicon, brand assets
- 'documents' : PDFs, contracts, terms
- 'avatars'   : User profile photos
*/

-- Example alt_text JSONB structure:
/*
{
    "en": "Red Toyota Corolla front view",
    "lt": "Raudonos Toyota Corolla vaizdas iš priekio",
    "ru": "Красная Toyota Corolla вид спереди"
}
*/
