# Database Schema Design (ERD)

**Version:** 1.0
**Date:** 2026-01-31
**Scope:** Phase 1 MVP

---

## Overview

This document defines the complete database schema for the multi-tenant SaaS car rental platform. All tables include `tenant_id` for multi-tenant isolation enforced via Row Level Security (RLS).

---

## Entity Relationship Diagram (Text)

```
tenants
    │
    ├──< users (tenant_id)
    │
    ├──< branches (tenant_id)
    │       │
    │       └──< vehicles (branch_id)
    │
    ├──< vehicle_categories (tenant_id)
    │       │
    │       └──< vehicles (category_id)
    │
    ├──< vehicles (tenant_id)
    │       │
    │       └──< bookings (vehicle_id)
    │
    ├──< pricing_rules (tenant_id, category_id?, vehicle_id?)
    │
    ├──< seasons (tenant_id)
    │
    ├──< addons (tenant_id)
    │       │
    │       └──< booking_addons (addon_id)
    │
    ├──< coupons (tenant_id)
    │
    ├──< bookings (tenant_id, customer_id, vehicle_id)
    │       │
    │       └──< booking_addons (booking_id)
    │
    ├──< pages (tenant_id)
    │       │
    │       └──< page_blocks (page_id)
    │
    └──< media (tenant_id)
```

---

## Tables

### 1. tenants

Platform tenants (car rental companies).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| name | varchar(255) | NOT NULL | Company name |
| slug | varchar(100) | UNIQUE, NOT NULL | URL-safe identifier (subdomain) |
| domain | varchar(255) | UNIQUE, NULL | Custom domain (e.g., rent.company.com) |
| logo_url | text | NULL | Logo image URL |
| settings | jsonb | DEFAULT '{}' | Tenant settings (see Settings JSONB) |
| subscription_tier | varchar(50) | DEFAULT 'starter' | starter, pro, business, enterprise |
| status | varchar(20) | DEFAULT 'active' | active, suspended, deleted |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Settings JSONB Structure:**
```json
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
```

**Indexes:**
- `idx_tenants_slug` on (slug)
- `idx_tenants_domain` on (domain)
- `idx_tenants_status` on (status)

---

### 2. users

All platform users with tenant association and roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| tenant_id | uuid | FK → tenants.id, NULL | Tenant association (NULL for platform admins) |
| auth_id | uuid | UNIQUE, NOT NULL | Supabase Auth user ID |
| email | varchar(255) | NOT NULL | Email address |
| role | varchar(50) | NOT NULL | User role (see Roles) |
| first_name | varchar(100) | NULL | First name |
| last_name | varchar(100) | NULL | Last name |
| phone | varchar(50) | NULL | Phone number |
| avatar_url | text | NULL | Profile photo URL |
| profile | jsonb | DEFAULT '{}' | Additional profile data |
| status | varchar(20) | DEFAULT 'active' | active, inactive, suspended |
| last_login_at | timestamptz | NULL | Last login timestamp |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Roles:**
- `platform_admin` - Platform owner (no tenant_id)
- `tenant_admin` - Tenant administrator (full access)
- `tenant_manager` - Tenant manager (limited admin)
- `tenant_staff` - Tenant staff (operational access)
- `customer` - End customer (booking access)

**Profile JSONB Structure (for customers):**
```json
{
  "dateOfBirth": "1990-01-15",
  "driverLicense": {
    "number": "...",
    "expiryDate": "2028-01-15",
    "country": "LT"
  },
  "address": {
    "street": "...",
    "city": "...",
    "postalCode": "...",
    "country": "LT"
  },
  "preferences": {
    "language": "en",
    "newsletter": true
  }
}
```

**Indexes:**
- `idx_users_tenant_id` on (tenant_id)
- `idx_users_auth_id` on (auth_id)
- `idx_users_email` on (email)
- `idx_users_role` on (role)

---

### 3. branches

Tenant locations/branches.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| tenant_id | uuid | FK → tenants.id, NOT NULL | Tenant association |
| name | varchar(255) | NOT NULL | Branch name |
| slug | varchar(100) | NOT NULL | URL-safe identifier |
| address | text | NOT NULL | Full address |
| city | varchar(100) | NOT NULL | City name |
| country | varchar(2) | DEFAULT 'LT' | ISO country code |
| latitude | decimal(10,7) | NULL | GPS latitude |
| longitude | decimal(10,7) | NULL | GPS longitude |
| phone | varchar(50) | NULL | Contact phone |
| email | varchar(255) | NULL | Contact email |
| operating_hours | jsonb | DEFAULT '{}' | Hours by day (see structure) |
| status | varchar(20) | DEFAULT 'active' | active, inactive |
| sort_order | integer | DEFAULT 0 | Display order |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Operating Hours JSONB Structure:**
```json
{
  "monday": { "open": "08:00", "close": "18:00" },
  "tuesday": { "open": "08:00", "close": "18:00" },
  "wednesday": { "open": "08:00", "close": "18:00" },
  "thursday": { "open": "08:00", "close": "18:00" },
  "friday": { "open": "08:00", "close": "18:00" },
  "saturday": { "open": "09:00", "close": "14:00" },
  "sunday": null
}
```

**Indexes:**
- `idx_branches_tenant_id` on (tenant_id)
- `idx_branches_status` on (status)

**Unique Constraints:**
- `uq_branches_tenant_slug` on (tenant_id, slug)

---

### 4. vehicle_categories

Vehicle groupings/categories per tenant.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| tenant_id | uuid | FK → tenants.id, NOT NULL | Tenant association |
| name | jsonb | NOT NULL | Localized names {"en": "...", "lt": "..."} |
| description | jsonb | DEFAULT '{}' | Localized descriptions |
| icon | varchar(50) | NULL | Icon identifier (e.g., "car", "suv") |
| image_url | text | NULL | Category image |
| sort_order | integer | DEFAULT 0 | Display order |
| status | varchar(20) | DEFAULT 'active' | active, inactive |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_vehicle_categories_tenant_id` on (tenant_id)
- `idx_vehicle_categories_status` on (status)

---

### 5. vehicles

Fleet inventory.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| tenant_id | uuid | FK → tenants.id, NOT NULL | Tenant association |
| branch_id | uuid | FK → branches.id, NOT NULL | Home branch |
| category_id | uuid | FK → vehicle_categories.id, NOT NULL | Vehicle category |
| make | varchar(100) | NOT NULL | Manufacturer (e.g., "Toyota") |
| model | varchar(100) | NOT NULL | Model name (e.g., "Corolla") |
| year | integer | NOT NULL | Model year |
| license_plate | varchar(20) | NOT NULL | License plate number |
| vin | varchar(50) | NULL | Vehicle identification number |
| transmission | varchar(20) | NOT NULL | manual, automatic |
| fuel_type | varchar(20) | NOT NULL | petrol, diesel, electric, hybrid |
| seats | integer | NOT NULL | Passenger capacity |
| doors | integer | NOT NULL | Number of doors |
| luggage_capacity | integer | NULL | Luggage pieces capacity |
| features | jsonb | DEFAULT '[]' | Feature list ["AC", "GPS", "Bluetooth"] |
| photos | jsonb | DEFAULT '[]' | Photo URLs array (see structure) |
| status | varchar(20) | DEFAULT 'available' | available, rented, maintenance, retired |
| odometer | integer | NULL | Current odometer reading (km) |
| color | varchar(50) | NULL | Vehicle color |
| description | jsonb | DEFAULT '{}' | Localized descriptions |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Photos JSONB Structure:**
```json
[
  {
    "url": "https://...",
    "isPrimary": true,
    "order": 0
  },
  {
    "url": "https://...",
    "isPrimary": false,
    "order": 1
  }
]
```

**Indexes:**
- `idx_vehicles_tenant_id` on (tenant_id)
- `idx_vehicles_branch_id` on (branch_id)
- `idx_vehicles_category_id` on (category_id)
- `idx_vehicles_status` on (status)

**Unique Constraints:**
- `uq_vehicles_tenant_license_plate` on (tenant_id, license_plate)

---

### 6. pricing_rules

Base rate configuration per category or vehicle.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| tenant_id | uuid | FK → tenants.id, NOT NULL | Tenant association |
| category_id | uuid | FK → vehicle_categories.id, NULL | Category (NULL if vehicle-specific) |
| vehicle_id | uuid | FK → vehicles.id, NULL | Vehicle (NULL if category-wide) |
| rate_type | varchar(20) | NOT NULL | daily, hourly, weekly, monthly |
| amount | decimal(10,2) | NOT NULL | Rate amount |
| currency | varchar(3) | DEFAULT 'EUR' | Currency code |
| min_duration | integer | NULL | Minimum duration (hours/days) |
| max_duration | integer | NULL | Maximum duration (hours/days) |
| status | varchar(20) | DEFAULT 'active' | active, inactive |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_pricing_rules_tenant_id` on (tenant_id)
- `idx_pricing_rules_category_id` on (category_id)
- `idx_pricing_rules_vehicle_id` on (vehicle_id)

**Check Constraints:**
- Either `category_id` OR `vehicle_id` must be set (not both NULL, not both set)

---

### 7. seasons

Seasonal pricing periods with multipliers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| tenant_id | uuid | FK → tenants.id, NOT NULL | Tenant association |
| name | varchar(100) | NOT NULL | Season name (e.g., "Summer Peak") |
| start_date | date | NOT NULL | Season start date |
| end_date | date | NOT NULL | Season end date |
| multiplier | decimal(4,2) | DEFAULT 1.00 | Price multiplier (1.5 = 50% increase) |
| priority | integer | DEFAULT 0 | Higher priority wins on overlap |
| status | varchar(20) | DEFAULT 'active' | active, inactive |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_seasons_tenant_id` on (tenant_id)
- `idx_seasons_dates` on (start_date, end_date)
- `idx_seasons_status` on (status)

---

### 8. addons

Optional extras (GPS, child seat, insurance).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| tenant_id | uuid | FK → tenants.id, NOT NULL | Tenant association |
| name | jsonb | NOT NULL | Localized names {"en": "...", "lt": "..."} |
| description | jsonb | DEFAULT '{}' | Localized descriptions |
| price | decimal(10,2) | NOT NULL | Price amount |
| price_type | varchar(20) | NOT NULL | per_day, per_rental, one_time |
| max_quantity | integer | DEFAULT 1 | Maximum selectable quantity |
| image_url | text | NULL | Addon image |
| sort_order | integer | DEFAULT 0 | Display order |
| status | varchar(20) | DEFAULT 'active' | active, inactive |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_addons_tenant_id` on (tenant_id)
- `idx_addons_status` on (status)

---

### 9. coupons

Discount codes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| tenant_id | uuid | FK → tenants.id, NOT NULL | Tenant association |
| code | varchar(50) | NOT NULL | Coupon code (uppercase) |
| description | text | NULL | Internal description |
| discount_type | varchar(20) | NOT NULL | percentage, fixed_amount, free_addon |
| discount_value | decimal(10,2) | NOT NULL | Discount value (% or amount) |
| free_addon_id | uuid | FK → addons.id, NULL | Free addon (if discount_type = free_addon) |
| min_order_value | decimal(10,2) | NULL | Minimum order value |
| valid_from | timestamptz | NOT NULL | Validity start |
| valid_until | timestamptz | NOT NULL | Validity end |
| usage_limit | integer | NULL | Total usage limit (NULL = unlimited) |
| usage_per_customer | integer | DEFAULT 1 | Per-customer limit |
| usage_count | integer | DEFAULT 0 | Current usage count |
| status | varchar(20) | DEFAULT 'active' | active, inactive, expired |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_coupons_tenant_id` on (tenant_id)
- `idx_coupons_code` on (tenant_id, code)
- `idx_coupons_status` on (status)
- `idx_coupons_validity` on (valid_from, valid_until)

**Unique Constraints:**
- `uq_coupons_tenant_code` on (tenant_id, code)

---

### 10. bookings

Reservations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| tenant_id | uuid | FK → tenants.id, NOT NULL | Tenant association |
| reference | varchar(20) | UNIQUE, NOT NULL | Human-readable reference (e.g., "BK-240131-001") |
| customer_id | uuid | FK → users.id, NOT NULL | Customer who booked |
| vehicle_id | uuid | FK → vehicles.id, NOT NULL | Booked vehicle |
| pickup_branch_id | uuid | FK → branches.id, NOT NULL | Pickup location |
| return_branch_id | uuid | FK → branches.id, NOT NULL | Return location |
| pickup_at | timestamptz | NOT NULL | Pickup date/time |
| return_at | timestamptz | NOT NULL | Return date/time |
| status | varchar(20) | DEFAULT 'pending' | See Booking Statuses |
| pricing | jsonb | NOT NULL | Pricing breakdown (see structure) |
| coupon_id | uuid | FK → coupons.id, NULL | Applied coupon |
| driver_info | jsonb | DEFAULT '{}' | Driver details (see structure) |
| notes | text | NULL | Internal notes |
| cancelled_at | timestamptz | NULL | Cancellation timestamp |
| cancellation_reason | text | NULL | Cancellation reason |
| stripe_payment_intent_id | varchar(255) | NULL | Stripe payment intent |
| stripe_checkout_session_id | varchar(255) | NULL | Stripe checkout session |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Booking Statuses:**
- `pending` - Awaiting payment
- `confirmed` - Payment received, reservation confirmed
- `active` - Vehicle checked out, rental in progress
- `completed` - Vehicle returned, rental complete
- `cancelled` - Booking cancelled

**Pricing JSONB Structure:**
```json
{
  "baseRate": 50.00,
  "rateType": "daily",
  "duration": 3,
  "subtotal": 150.00,
  "seasonMultiplier": 1.2,
  "seasonName": "Summer Peak",
  "seasonAmount": 30.00,
  "addonsTotal": 45.00,
  "oneWayFee": 0.00,
  "discountType": "percentage",
  "discountValue": 10,
  "discountAmount": 22.50,
  "total": 202.50,
  "currency": "EUR"
}
```

**Driver Info JSONB Structure:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+370...",
  "dateOfBirth": "1990-01-15",
  "driverLicense": {
    "number": "...",
    "expiryDate": "2028-01-15",
    "country": "LT"
  }
}
```

**Indexes:**
- `idx_bookings_tenant_id` on (tenant_id)
- `idx_bookings_reference` on (reference)
- `idx_bookings_customer_id` on (customer_id)
- `idx_bookings_vehicle_id` on (vehicle_id)
- `idx_bookings_status` on (status)
- `idx_bookings_dates` on (pickup_at, return_at)
- `idx_bookings_pickup_branch` on (pickup_branch_id)

---

### 11. booking_addons

Add-ons selected per booking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| booking_id | uuid | FK → bookings.id, NOT NULL | Parent booking |
| addon_id | uuid | FK → addons.id, NOT NULL | Selected addon |
| quantity | integer | DEFAULT 1 | Quantity selected |
| unit_price | decimal(10,2) | NOT NULL | Price at time of booking |
| price_type | varchar(20) | NOT NULL | per_day, per_rental, one_time |
| total_price | decimal(10,2) | NOT NULL | Calculated total |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_booking_addons_booking_id` on (booking_id)
- `idx_booking_addons_addon_id` on (addon_id)

**Unique Constraints:**
- `uq_booking_addons_booking_addon` on (booking_id, addon_id)

---

### 12. pages

CMS pages per tenant.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| tenant_id | uuid | FK → tenants.id, NOT NULL | Tenant association |
| slug | varchar(100) | NOT NULL | URL path (e.g., "about", "contact") |
| title | jsonb | NOT NULL | Localized titles {"en": "...", "lt": "..."} |
| meta | jsonb | DEFAULT '{}' | SEO metadata (see structure) |
| status | varchar(20) | DEFAULT 'draft' | draft, published, archived |
| is_system | boolean | DEFAULT false | System page (non-deletable) |
| published_at | timestamptz | NULL | Publication timestamp |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Meta JSONB Structure:**
```json
{
  "en": {
    "description": "...",
    "keywords": "...",
    "ogImage": "https://...",
    "canonical": "..."
  },
  "lt": {
    "description": "...",
    "keywords": "..."
  }
}
```

**Indexes:**
- `idx_pages_tenant_id` on (tenant_id)
- `idx_pages_status` on (status)

**Unique Constraints:**
- `uq_pages_tenant_slug` on (tenant_id, slug)

---

### 13. page_blocks

Block content per page.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| page_id | uuid | FK → pages.id ON DELETE CASCADE, NOT NULL | Parent page |
| block_type | varchar(50) | NOT NULL | Block type (see Block Types) |
| content | jsonb | NOT NULL | Localized block content |
| settings | jsonb | DEFAULT '{}' | Block settings (layout, etc.) |
| sort_order | integer | DEFAULT 0 | Display order |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Block Types:**
- `hero` - Hero section with heading, CTA, background
- `features` - Feature grid with icons
- `fleet_gallery` - Vehicle showcase
- `testimonials` - Customer testimonials
- `faq` - FAQ accordion
- `cta` - Call-to-action section
- `text_image` - Text with image (side-by-side)
- `contact_form` - Contact form
- `location_map` - Map with branch locations
- `pricing_table` - Pricing comparison table

**Content JSONB Structure (example for hero block):**
```json
{
  "en": {
    "heading": "Rent Your Perfect Car",
    "subheading": "Best prices in town",
    "ctaText": "Book Now",
    "ctaLink": "/booking"
  },
  "lt": {
    "heading": "Išsinuomokite tobulą automobilį",
    "subheading": "Geriausios kainos mieste",
    "ctaText": "Rezervuoti",
    "ctaLink": "/booking"
  },
  "backgroundImage": "https://..."
}
```

**Indexes:**
- `idx_page_blocks_page_id` on (page_id)
- `idx_page_blocks_sort_order` on (page_id, sort_order)

---

### 14. media

Uploaded files/images.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| tenant_id | uuid | FK → tenants.id, NOT NULL | Tenant association |
| filename | varchar(255) | NOT NULL | Original filename |
| storage_path | text | NOT NULL | Supabase Storage path |
| url | text | NOT NULL | Public URL |
| mime_type | varchar(100) | NOT NULL | MIME type (image/jpeg, etc.) |
| size | integer | NOT NULL | File size in bytes |
| width | integer | NULL | Image width (pixels) |
| height | integer | NULL | Image height (pixels) |
| alt_text | jsonb | DEFAULT '{}' | Localized alt text |
| folder | varchar(100) | DEFAULT 'general' | Organization folder |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_media_tenant_id` on (tenant_id)
- `idx_media_folder` on (tenant_id, folder)
- `idx_media_mime_type` on (mime_type)

---

## Additional Tables (Phase 2+)

These tables are planned for future phases but documented here for reference:

### availability_blocks (Phase 2)
Manual availability blocks for maintenance, etc.

### invoices (Phase 2)
Generated invoices for completed bookings.

### audit_logs (Phase 2)
Activity tracking for compliance.

### damage_reports (Phase 2)
Damage documentation per booking.

### check_in_out_records (Phase 2)
Check-in/check-out documentation with photos.

### long_term_plans (Phase 2)
Subscription plans for long-term rentals.

### contracts (Phase 2)
Digital contracts for long-term rentals.

---

## Row Level Security (RLS) Strategy

### Platform Admin Tables
- `tenants`: Only platform_admin can read/write

### Tenant-Scoped Tables
All other tables enforce:
```sql
-- Read policy
CREATE POLICY "tenant_isolation_read" ON table_name
  FOR SELECT USING (tenant_id = current_tenant_id());

-- Write policy
CREATE POLICY "tenant_isolation_write" ON table_name
  FOR ALL USING (tenant_id = current_tenant_id());
```

### Special Cases
- `users`:
  - Customers can only see their own profile
  - Staff can see all tenant users
- `bookings`:
  - Customers can only see their own bookings
  - Staff can see all tenant bookings

---

## Database Functions

### current_tenant_id()
Returns the current tenant ID from JWT claims.

```sql
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid,
    NULL
  );
$$ LANGUAGE sql STABLE;
```

### generate_booking_reference()
Generates human-readable booking reference.

```sql
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS varchar AS $$
DECLARE
  date_part varchar;
  seq_num integer;
  ref varchar;
BEGIN
  date_part := to_char(NOW(), 'YYMMDD');
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM 11) AS integer)), 0) + 1
  INTO seq_num
  FROM bookings
  WHERE reference LIKE 'BK-' || date_part || '-%';
  ref := 'BK-' || date_part || '-' || LPAD(seq_num::text, 3, '0');
  RETURN ref;
END;
$$ LANGUAGE plpgsql;
```

---

## Triggers

### updated_at Trigger
Auto-update `updated_at` timestamp on all tables.

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER update_timestamp
  BEFORE UPDATE ON table_name
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Migration Order

Migrations should be created in this order to respect foreign key dependencies:

1. `001_tenants.sql` - tenants table
2. `002_users.sql` - users table
3. `003_branches.sql` - branches table
4. `004_vehicle_categories.sql` - vehicle_categories table
5. `005_vehicles.sql` - vehicles table
6. `006_pricing_rules.sql` - pricing_rules table
7. `007_seasons.sql` - seasons table
8. `008_addons.sql` - addons table
9. `009_coupons.sql` - coupons table
10. `010_bookings.sql` - bookings table
11. `011_booking_addons.sql` - booking_addons table
12. `012_pages.sql` - pages table
13. `013_page_blocks.sql` - page_blocks table
14. `014_media.sql` - media table
15. `015_rls_policies.sql` - Row Level Security policies
16. `016_indexes.sql` - Additional indexes
17. `017_functions.sql` - Database functions
18. `018_triggers.sql` - Triggers
19. `019_seed.sql` - Seed data

---

## Notes

1. All `id` columns use UUID for security (non-guessable) and distributed systems compatibility
2. JSONB columns provide flexibility for localized content and complex nested data
3. Soft deletes via `status` column preferred over hard deletes for audit trail
4. All timestamps are `timestamptz` for timezone-aware storage
5. Decimal precision (10,2) for currency amounts
6. GPS coordinates use decimal(10,7) for ~1cm precision
