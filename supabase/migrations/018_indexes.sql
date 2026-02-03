-- Migration: 018_indexes
-- Description: Additional database indexes for common queries and performance optimization
-- Date: 2026-01-31

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Bookings: Common dashboard queries
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_status_pickup
    ON bookings(tenant_id, status, pickup_at);

CREATE INDEX IF NOT EXISTS idx_bookings_tenant_status_return
    ON bookings(tenant_id, status, return_at);

-- Bookings: Today's pickups and returns
CREATE INDEX IF NOT EXISTS idx_bookings_pickup_date
    ON bookings(tenant_id, DATE(pickup_at), status);

CREATE INDEX IF NOT EXISTS idx_bookings_return_date
    ON bookings(tenant_id, DATE(return_at), status);

-- Bookings: Customer history
CREATE INDEX IF NOT EXISTS idx_bookings_customer_status
    ON bookings(customer_id, status, created_at DESC);

-- Vehicles: Availability queries
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_branch_status
    ON vehicles(tenant_id, branch_id, status);

CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_category_status_branch
    ON vehicles(tenant_id, category_id, status, branch_id);

-- Vehicles: Search filters
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_transmission_fuel
    ON vehicles(tenant_id, transmission, fuel_type, status);

CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_seats
    ON vehicles(tenant_id, seats, status);

-- ============================================================================
-- PARTIAL INDEXES FOR FILTERED QUERIES
-- ============================================================================

-- Active bookings only (most common query)
CREATE INDEX IF NOT EXISTS idx_bookings_active
    ON bookings(tenant_id, vehicle_id, pickup_at, return_at)
    WHERE status IN ('pending', 'confirmed', 'active');

-- Available vehicles only
CREATE INDEX IF NOT EXISTS idx_vehicles_available
    ON vehicles(tenant_id, category_id, branch_id)
    WHERE status = 'available';

-- Active coupons only
CREATE INDEX IF NOT EXISTS idx_coupons_active_valid
    ON coupons(tenant_id, code)
    WHERE status = 'active';

-- Published pages only
CREATE INDEX IF NOT EXISTS idx_pages_published
    ON pages(tenant_id, slug)
    WHERE status = 'published';

-- Active pricing rules only
CREATE INDEX IF NOT EXISTS idx_pricing_rules_active
    ON pricing_rules(tenant_id, category_id, rate_type)
    WHERE status = 'active';

-- Active seasons with date range
CREATE INDEX IF NOT EXISTS idx_seasons_active_dates
    ON seasons(tenant_id, start_date, end_date)
    WHERE status = 'active';

-- Active addons only
CREATE INDEX IF NOT EXISTS idx_addons_active_sorted
    ON addons(tenant_id, sort_order)
    WHERE status = 'active';

-- Active branches only
CREATE INDEX IF NOT EXISTS idx_branches_active
    ON branches(tenant_id, sort_order)
    WHERE status = 'active';

-- Active categories only
CREATE INDEX IF NOT EXISTS idx_categories_active
    ON vehicle_categories(tenant_id, sort_order)
    WHERE status = 'active';

-- ============================================================================
-- JSONB INDEXES FOR SETTINGS/CONTENT QUERIES
-- ============================================================================

-- Tenant settings (for feature flags, etc.)
CREATE INDEX IF NOT EXISTS idx_tenants_settings
    ON tenants USING gin(settings);

-- Vehicle features (for feature filtering)
CREATE INDEX IF NOT EXISTS idx_vehicles_features
    ON vehicles USING gin(features);

-- User profile (for customer search)
CREATE INDEX IF NOT EXISTS idx_users_profile
    ON users USING gin(profile);

-- Booking pricing (for reporting)
CREATE INDEX IF NOT EXISTS idx_bookings_pricing
    ON bookings USING gin(pricing);

-- ============================================================================
-- TEXT SEARCH INDEXES
-- ============================================================================

-- Vehicles: Make and model search
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model_search
    ON vehicles USING gin(
        to_tsvector('english', make || ' ' || model)
    );

-- Users: Name search
CREATE INDEX IF NOT EXISTS idx_users_name_search
    ON users USING gin(
        to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
    );

-- ============================================================================
-- FOREIGN KEY INDEXES (ensure these exist)
-- ============================================================================

-- These should already exist but let's make sure
CREATE INDEX IF NOT EXISTS idx_users_tenant_fk ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_branches_tenant_fk ON branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_branch_fk ON vehicles(branch_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_category_fk ON vehicles(category_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_fk ON bookings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_fk ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pickup_branch_fk ON bookings(pickup_branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_return_branch_fk ON bookings(return_branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_coupon_fk ON bookings(coupon_id);
CREATE INDEX IF NOT EXISTS idx_booking_addons_booking_fk ON booking_addons(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_addons_addon_fk ON booking_addons(addon_id);
CREATE INDEX IF NOT EXISTS idx_page_blocks_page_fk ON page_blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_category_fk ON pricing_rules(category_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_vehicle_fk ON pricing_rules(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_coupons_free_addon_fk ON coupons(free_addon_id);

-- ============================================================================
-- UNIQUE INDEXES (ensure these exist for data integrity)
-- ============================================================================

-- These should be created by constraints but let's verify
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug_unique ON tenants(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_domain_unique ON tenants(domain) WHERE domain IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_id_unique ON users(auth_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_reference_unique ON bookings(reference);

-- ============================================================================
-- STATISTICS UPDATE
-- ============================================================================

-- Analyze tables to update statistics for query planner
ANALYZE tenants;
ANALYZE users;
ANALYZE branches;
ANALYZE vehicle_categories;
ANALYZE vehicles;
ANALYZE pricing_rules;
ANALYZE seasons;
ANALYZE addons;
ANALYZE coupons;
ANALYZE bookings;
ANALYZE booking_addons;
ANALYZE pages;
ANALYZE page_blocks;
ANALYZE media;

-- ============================================================================
-- COMMENTS ON INDEX USAGE
-- ============================================================================

COMMENT ON INDEX idx_bookings_active IS 'Partial index for active bookings - used in availability checks';
COMMENT ON INDEX idx_vehicles_available IS 'Partial index for available vehicles - used in search';
COMMENT ON INDEX idx_coupons_active_valid IS 'Partial index for active coupons - used in validation';
COMMENT ON INDEX idx_bookings_tenant_status_pickup IS 'Composite index for dashboard pickup queries';
COMMENT ON INDEX idx_vehicles_tenant_category_status_branch IS 'Composite index for fleet filtering';
