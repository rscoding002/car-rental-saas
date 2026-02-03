-- Migration: 013_page_blocks
-- Description: Create page_blocks table for CMS block content
-- Date: 2026-01-31

-- Create page_blocks table
CREATE TABLE page_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    block_type VARCHAR(50) NOT NULL CHECK (block_type IN (
        'hero',
        'features',
        'fleet_gallery',
        'testimonials',
        'faq',
        'cta',
        'text_image',
        'contact_form',
        'location_map',
        'pricing_table',
        'text',
        'image',
        'video',
        'divider',
        'spacer',
        'html'
    )),
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE page_blocks IS 'Block content for CMS pages (page builder sections)';
COMMENT ON COLUMN page_blocks.page_id IS 'Parent page this block belongs to';
COMMENT ON COLUMN page_blocks.block_type IS 'Type of block: hero, features, fleet_gallery, testimonials, faq, cta, text_image, contact_form, location_map, pricing_table, text, image, video, divider, spacer, html';
COMMENT ON COLUMN page_blocks.content IS 'Localized block content (varies by block type)';
COMMENT ON COLUMN page_blocks.settings IS 'Block layout/display settings (background, padding, alignment)';
COMMENT ON COLUMN page_blocks.sort_order IS 'Display order on the page';

-- Create indexes for common queries
CREATE INDEX idx_page_blocks_page_id ON page_blocks(page_id);
CREATE INDEX idx_page_blocks_block_type ON page_blocks(block_type);
CREATE INDEX idx_page_blocks_sort ON page_blocks(page_id, sort_order);

-- Apply updated_at trigger
CREATE TRIGGER update_page_blocks_updated_at
    BEFORE UPDATE ON page_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: Enable Row Level Security
ALTER TABLE page_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can view blocks for published pages
CREATE POLICY "Public can view blocks for published pages"
    ON page_blocks
    FOR SELECT
    USING (
        page_id IN (
            SELECT id FROM pages WHERE status = 'published'
        )
    );

-- RLS Policy: Tenant staff can view all blocks for their pages
CREATE POLICY "Tenant staff can view all tenant page blocks"
    ON page_blocks
    FOR SELECT
    USING (
        page_id IN (
            SELECT id FROM pages WHERE tenant_id = current_tenant_id()
        )
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    );

-- RLS Policy: Tenant admins can manage page blocks
CREATE POLICY "Tenant admins can manage page blocks"
    ON page_blocks
    FOR ALL
    USING (
        page_id IN (
            SELECT id FROM pages WHERE tenant_id = current_tenant_id()
        )
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager'])
    )
    WITH CHECK (
        page_id IN (
            SELECT id FROM pages WHERE tenant_id = current_tenant_id()
        )
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager'])
    );

-- RLS Policy: Platform admins can manage all page blocks
CREATE POLICY "Platform admins can manage all page blocks"
    ON page_blocks
    FOR ALL
    USING (has_role('platform_admin'))
    WITH CHECK (has_role('platform_admin'));

-- Function to reorder blocks
CREATE OR REPLACE FUNCTION reorder_page_blocks(
    p_page_id UUID,
    p_block_ids UUID[]
)
RETURNS VOID AS $$
DECLARE
    v_order INTEGER := 0;
    v_block_id UUID;
BEGIN
    FOREACH v_block_id IN ARRAY p_block_ids
    LOOP
        UPDATE page_blocks
        SET sort_order = v_order, updated_at = NOW()
        WHERE id = v_block_id AND page_id = p_page_id;
        v_order := v_order + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reorder_page_blocks IS 'Reorder blocks on a page by providing array of block IDs in desired order';

-- Example content JSONB structures by block type (for reference):
/*

-- HERO BLOCK
{
    "en": {
        "heading": "Rent Your Perfect Car",
        "subheading": "Best prices in Lithuania",
        "ctaText": "Book Now",
        "ctaLink": "/booking"
    },
    "lt": {
        "heading": "Išsinuomokite tobulą automobilį",
        "subheading": "Geriausios kainos Lietuvoje",
        "ctaText": "Rezervuoti",
        "ctaLink": "/booking"
    },
    "backgroundImage": "https://storage.example.com/hero-bg.jpg",
    "overlayOpacity": 0.5
}

-- FEATURES BLOCK
{
    "en": {
        "heading": "Why Choose Us",
        "features": [
            {
                "icon": "shield",
                "title": "Full Insurance",
                "description": "All our vehicles come with comprehensive insurance"
            },
            {
                "icon": "clock",
                "title": "24/7 Support",
                "description": "Round the clock customer assistance"
            },
            {
                "icon": "map-pin",
                "title": "Multiple Locations",
                "description": "Convenient pickup and return points"
            }
        ]
    },
    "lt": {
        "heading": "Kodėl rinktis mus",
        "features": [...]
    }
}

-- FAQ BLOCK
{
    "en": {
        "heading": "Frequently Asked Questions",
        "items": [
            {
                "question": "What documents do I need?",
                "answer": "You need a valid driver's license and ID/passport."
            },
            {
                "question": "Is there a deposit?",
                "answer": "Yes, we require a security deposit that varies by vehicle class."
            }
        ]
    },
    "lt": {
        "heading": "Dažnai užduodami klausimai",
        "items": [...]
    }
}

-- TESTIMONIALS BLOCK
{
    "en": {
        "heading": "What Our Customers Say",
        "testimonials": [
            {
                "name": "John D.",
                "text": "Excellent service and great cars!",
                "rating": 5,
                "avatar": "https://..."
            }
        ]
    }
}

-- CTA BLOCK
{
    "en": {
        "heading": "Ready to Hit the Road?",
        "description": "Book your car today and save up to 20%",
        "buttonText": "Book Now",
        "buttonLink": "/booking"
    },
    "backgroundColor": "#3B82F6",
    "textColor": "#FFFFFF"
}

-- TEXT_IMAGE BLOCK
{
    "en": {
        "heading": "About Our Fleet",
        "text": "We maintain a diverse fleet of vehicles...",
        "ctaText": "View Fleet",
        "ctaLink": "/fleet"
    },
    "image": "https://storage.example.com/fleet-showcase.jpg",
    "imagePosition": "right"
}

-- CONTACT_FORM BLOCK
{
    "en": {
        "heading": "Get in Touch",
        "description": "Fill out the form and we'll get back to you shortly",
        "submitText": "Send Message",
        "successMessage": "Thank you! We'll be in touch soon."
    },
    "fields": ["name", "email", "phone", "message"],
    "recipientEmail": "contact@company.com"
}

-- LOCATION_MAP BLOCK
{
    "en": {
        "heading": "Our Locations"
    },
    "showAllBranches": true,
    "mapZoom": 12,
    "mapStyle": "default"
}

*/

-- Example settings JSONB structure (for reference):
/*
{
    "background": {
        "type": "color",
        "value": "#F9FAFB"
    },
    "padding": {
        "top": "lg",
        "bottom": "lg"
    },
    "maxWidth": "container",
    "alignment": "center"
}
*/
