-- Seed Data for Development/Testing
-- Run this after all migrations: psql -f supabase/seed.sql
-- Or via Supabase Dashboard SQL Editor

-- ============================================================================
-- CLEAR EXISTING DATA (for re-seeding)
-- ============================================================================
-- Uncomment these lines if you want to reset data before seeding
-- TRUNCATE booking_addons, bookings, media, page_blocks, pages, coupons, addons, seasons, pricing_rules, vehicles, vehicle_categories, branches, users, tenants CASCADE;

-- ============================================================================
-- SAMPLE TENANT
-- ============================================================================
INSERT INTO tenants (id, name, slug, domain, logo_url, settings, subscription_tier, status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Baltic Car Rental',
    'baltic-rental',
    NULL,
    'https://placehold.co/200x60/3B82F6/white?text=Baltic+Rental',
    '{
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
            "email": "info@balticrental.com",
            "phone": "+370 600 12345",
            "address": "Gedimino pr. 1, Vilnius, Lithuania"
        }
    }'::jsonb,
    'pro',
    'active'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE USERS
-- Note: auth_id would normally come from Supabase Auth. Using UUIDs for testing.
-- In production, users are created via auth signup flow.
-- ============================================================================

-- Platform Admin (no tenant)
INSERT INTO users (id, tenant_id, auth_id, email, role, first_name, last_name, status)
VALUES (
    '00000000-0000-0000-0001-000000000001',
    NULL,
    '00000000-0000-0000-0001-000000000001',
    'admin@platform.com',
    'platform_admin',
    'Platform',
    'Admin',
    'active'
) ON CONFLICT (id) DO NOTHING;

-- Tenant Admin
INSERT INTO users (id, tenant_id, auth_id, email, role, first_name, last_name, phone, status)
VALUES (
    '00000000-0000-0000-0001-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0001-000000000002',
    'owner@balticrental.com',
    'tenant_admin',
    'Jonas',
    'Jonaitis',
    '+370 600 11111',
    'active'
) ON CONFLICT (id) DO NOTHING;

-- Tenant Staff
INSERT INTO users (id, tenant_id, auth_id, email, role, first_name, last_name, phone, status)
VALUES (
    '00000000-0000-0000-0001-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0001-000000000003',
    'staff@balticrental.com',
    'tenant_staff',
    'Petras',
    'Petraitis',
    '+370 600 22222',
    'active'
) ON CONFLICT (id) DO NOTHING;

-- Sample Customers
INSERT INTO users (id, tenant_id, auth_id, email, role, first_name, last_name, phone, profile, status)
VALUES
(
    '00000000-0000-0000-0001-000000000010',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0001-000000000010',
    'john.doe@example.com',
    'customer',
    'John',
    'Doe',
    '+370 600 33333',
    '{
        "dateOfBirth": "1985-06-15",
        "driverLicense": {
            "number": "DL123456",
            "expiryDate": "2028-06-15",
            "country": "LT"
        },
        "address": {
            "street": "Sample Street 1",
            "city": "Vilnius",
            "postalCode": "01001",
            "country": "LT"
        }
    }'::jsonb,
    'active'
),
(
    '00000000-0000-0000-0001-000000000011',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0001-000000000011',
    'jane.smith@example.com',
    'customer',
    'Jane',
    'Smith',
    '+370 600 44444',
    '{
        "dateOfBirth": "1990-03-20",
        "driverLicense": {
            "number": "DL789012",
            "expiryDate": "2027-03-20",
            "country": "GB"
        }
    }'::jsonb,
    'active'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE BRANCHES
-- ============================================================================
INSERT INTO branches (id, tenant_id, name, slug, address, city, country, latitude, longitude, phone, email, operating_hours, status, sort_order)
VALUES
(
    '00000000-0000-0000-0002-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Vilnius Airport',
    'vilnius-airport',
    'Rodūnios kelias 10A, Vilnius',
    'Vilnius',
    'LT',
    54.643056,
    25.279722,
    '+370 600 00001',
    'airport@balticrental.com',
    '{
        "monday": {"open": "06:00", "close": "23:00"},
        "tuesday": {"open": "06:00", "close": "23:00"},
        "wednesday": {"open": "06:00", "close": "23:00"},
        "thursday": {"open": "06:00", "close": "23:00"},
        "friday": {"open": "06:00", "close": "23:00"},
        "saturday": {"open": "07:00", "close": "22:00"},
        "sunday": {"open": "07:00", "close": "22:00"}
    }'::jsonb,
    'active',
    1
),
(
    '00000000-0000-0000-0002-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Vilnius City Center',
    'vilnius-center',
    'Gedimino pr. 1, Vilnius',
    'Vilnius',
    'LT',
    54.687157,
    25.279652,
    '+370 600 00002',
    'center@balticrental.com',
    '{
        "monday": {"open": "08:00", "close": "18:00"},
        "tuesday": {"open": "08:00", "close": "18:00"},
        "wednesday": {"open": "08:00", "close": "18:00"},
        "thursday": {"open": "08:00", "close": "18:00"},
        "friday": {"open": "08:00", "close": "18:00"},
        "saturday": {"open": "09:00", "close": "14:00"},
        "sunday": null
    }'::jsonb,
    'active',
    2
),
(
    '00000000-0000-0000-0002-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'Kaunas City',
    'kaunas',
    'Laisvės al. 50, Kaunas',
    'Kaunas',
    'LT',
    54.896872,
    23.892433,
    '+370 600 00003',
    'kaunas@balticrental.com',
    '{
        "monday": {"open": "08:00", "close": "18:00"},
        "tuesday": {"open": "08:00", "close": "18:00"},
        "wednesday": {"open": "08:00", "close": "18:00"},
        "thursday": {"open": "08:00", "close": "18:00"},
        "friday": {"open": "08:00", "close": "18:00"},
        "saturday": {"open": "09:00", "close": "14:00"},
        "sunday": null
    }'::jsonb,
    'active',
    3
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE VEHICLE CATEGORIES
-- ============================================================================
INSERT INTO vehicle_categories (id, tenant_id, name, description, icon, sort_order, status)
VALUES
(
    '00000000-0000-0000-0003-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '{"en": "Economy", "lt": "Ekonominė klasė", "ru": "Эконом класс"}'::jsonb,
    '{"en": "Fuel-efficient compact cars perfect for city driving", "lt": "Ekonomiški kompaktiški automobiliai miestui", "ru": "Экономичные компактные автомобили для города"}'::jsonb,
    'car-compact',
    1,
    'active'
),
(
    '00000000-0000-0000-0003-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '{"en": "Compact", "lt": "Kompaktinė klasė", "ru": "Компакт класс"}'::jsonb,
    '{"en": "Comfortable compact cars with more space", "lt": "Patogūs kompaktiniai automobiliai su daugiau vietos", "ru": "Комфортные компактные автомобили с большим пространством"}'::jsonb,
    'car',
    2,
    'active'
),
(
    '00000000-0000-0000-0003-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '{"en": "SUV", "lt": "Visureigiai", "ru": "Внедорожники"}'::jsonb,
    '{"en": "Spacious SUVs for families and adventures", "lt": "Erdvūs visureigiai šeimoms ir nuotykiams", "ru": "Просторные внедорожники для семей и приключений"}'::jsonb,
    'suv',
    3,
    'active'
),
(
    '00000000-0000-0000-0003-000000000004',
    '00000000-0000-0000-0000-000000000001',
    '{"en": "Premium", "lt": "Premium klasė", "ru": "Премиум класс"}'::jsonb,
    '{"en": "Luxury vehicles for a premium experience", "lt": "Prabangūs automobiliai aukščiausio lygio patirčiai", "ru": "Роскошные автомобили для премиум опыта"}'::jsonb,
    'luxury',
    4,
    'active'
),
(
    '00000000-0000-0000-0003-000000000005',
    '00000000-0000-0000-0000-000000000001',
    '{"en": "Van", "lt": "Mikroautobusai", "ru": "Микроавтобусы"}'::jsonb,
    '{"en": "Spacious vans for groups and cargo", "lt": "Erdvūs mikroautobusai grupėms ir kroviniams", "ru": "Просторные микроавтобусы для групп и грузов"}'::jsonb,
    'van',
    5,
    'active'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE VEHICLES
-- ============================================================================
INSERT INTO vehicles (id, tenant_id, branch_id, category_id, make, model, year, license_plate, transmission, fuel_type, seats, doors, luggage_capacity, features, photos, status, color)
VALUES
-- Economy
(
    '00000000-0000-0000-0004-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0002-000000000001',
    '00000000-0000-0000-0003-000000000001',
    'Volkswagen', 'Polo', 2023, 'ABC 001', 'manual', 'petrol',
    5, 5, 2,
    '["Air Conditioning", "Bluetooth", "USB Charging"]'::jsonb,
    '[{"url": "https://placehold.co/800x600/e2e8f0/475569?text=VW+Polo", "isPrimary": true, "order": 0}]'::jsonb,
    'available', 'White'
),
(
    '00000000-0000-0000-0004-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0002-000000000001',
    '00000000-0000-0000-0003-000000000001',
    'Toyota', 'Yaris', 2023, 'ABC 002', 'automatic', 'hybrid',
    5, 5, 2,
    '["Air Conditioning", "Bluetooth", "Backup Camera", "Cruise Control"]'::jsonb,
    '[{"url": "https://placehold.co/800x600/e2e8f0/475569?text=Toyota+Yaris", "isPrimary": true, "order": 0}]'::jsonb,
    'available', 'Red'
),
-- Compact
(
    '00000000-0000-0000-0004-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0002-000000000001',
    '00000000-0000-0000-0003-000000000002',
    'Volkswagen', 'Golf', 2023, 'ABC 003', 'automatic', 'petrol',
    5, 5, 3,
    '["Air Conditioning", "Bluetooth", "GPS Navigation", "Cruise Control", "Heated Seats"]'::jsonb,
    '[{"url": "https://placehold.co/800x600/e2e8f0/475569?text=VW+Golf", "isPrimary": true, "order": 0}]'::jsonb,
    'available', 'Gray'
),
(
    '00000000-0000-0000-0004-000000000004',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0002-000000000002',
    '00000000-0000-0000-0003-000000000002',
    'Skoda', 'Octavia', 2023, 'ABC 004', 'automatic', 'diesel',
    5, 5, 4,
    '["Air Conditioning", "Bluetooth", "GPS Navigation", "Cruise Control", "Parking Sensors"]'::jsonb,
    '[{"url": "https://placehold.co/800x600/e2e8f0/475569?text=Skoda+Octavia", "isPrimary": true, "order": 0}]'::jsonb,
    'available', 'Blue'
),
-- SUV
(
    '00000000-0000-0000-0004-000000000005',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0002-000000000001',
    '00000000-0000-0000-0003-000000000003',
    'Toyota', 'RAV4', 2023, 'ABC 005', 'automatic', 'hybrid',
    5, 5, 4,
    '["Air Conditioning", "Bluetooth", "GPS Navigation", "Cruise Control", "All-Wheel Drive", "Backup Camera"]'::jsonb,
    '[{"url": "https://placehold.co/800x600/e2e8f0/475569?text=Toyota+RAV4", "isPrimary": true, "order": 0}]'::jsonb,
    'available', 'Black'
),
(
    '00000000-0000-0000-0004-000000000006',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0002-000000000002',
    '00000000-0000-0000-0003-000000000003',
    'Volkswagen', 'Tiguan', 2023, 'ABC 006', 'automatic', 'diesel',
    5, 5, 4,
    '["Air Conditioning", "Bluetooth", "GPS Navigation", "Panoramic Roof", "All-Wheel Drive"]'::jsonb,
    '[{"url": "https://placehold.co/800x600/e2e8f0/475569?text=VW+Tiguan", "isPrimary": true, "order": 0}]'::jsonb,
    'available', 'Silver'
),
-- Premium
(
    '00000000-0000-0000-0004-000000000007',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0002-000000000001',
    '00000000-0000-0000-0003-000000000004',
    'BMW', '5 Series', 2023, 'ABC 007', 'automatic', 'diesel',
    5, 4, 3,
    '["Air Conditioning", "Leather Interior", "GPS Navigation", "Heated Seats", "Premium Sound System", "Sunroof"]'::jsonb,
    '[{"url": "https://placehold.co/800x600/e2e8f0/475569?text=BMW+5+Series", "isPrimary": true, "order": 0}]'::jsonb,
    'available', 'Black'
),
-- Van
(
    '00000000-0000-0000-0004-000000000008',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0002-000000000001',
    '00000000-0000-0000-0003-000000000005',
    'Volkswagen', 'Transporter', 2023, 'ABC 008', 'manual', 'diesel',
    9, 5, 6,
    '["Air Conditioning", "Bluetooth", "Backup Camera", "Parking Sensors"]'::jsonb,
    '[{"url": "https://placehold.co/800x600/e2e8f0/475569?text=VW+Transporter", "isPrimary": true, "order": 0}]'::jsonb,
    'available', 'White'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE PRICING RULES
-- ============================================================================
INSERT INTO pricing_rules (id, tenant_id, category_id, rate_type, amount, currency, status)
VALUES
-- Economy: €25/day
('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0003-000000000001', 'daily', 25.00, 'EUR', 'active'),
-- Compact: €35/day
('00000000-0000-0000-0005-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0003-000000000002', 'daily', 35.00, 'EUR', 'active'),
-- SUV: €55/day
('00000000-0000-0000-0005-000000000003', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0003-000000000003', 'daily', 55.00, 'EUR', 'active'),
-- Premium: €85/day
('00000000-0000-0000-0005-000000000004', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0003-000000000004', 'daily', 85.00, 'EUR', 'active'),
-- Van: €65/day
('00000000-0000-0000-0005-000000000005', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0003-000000000005', 'daily', 65.00, 'EUR', 'active'),
-- Weekly rates (15% discount)
('00000000-0000-0000-0005-000000000011', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0003-000000000001', 'weekly', 150.00, 'EUR', 'active'),
('00000000-0000-0000-0005-000000000012', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0003-000000000002', 'weekly', 210.00, 'EUR', 'active'),
('00000000-0000-0000-0005-000000000013', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0003-000000000003', 'weekly', 330.00, 'EUR', 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE SEASONS
-- ============================================================================
INSERT INTO seasons (id, tenant_id, name, start_date, end_date, multiplier, priority, status)
VALUES
('00000000-0000-0000-0006-000000000001', '00000000-0000-0000-0000-000000000001', 'Summer Peak', '2026-06-15', '2026-08-31', 1.30, 1, 'active'),
('00000000-0000-0000-0006-000000000002', '00000000-0000-0000-0000-000000000001', 'Christmas Holiday', '2026-12-20', '2027-01-05', 1.25, 2, 'active'),
('00000000-0000-0000-0006-000000000003', '00000000-0000-0000-0000-000000000001', 'Winter Low', '2026-01-15', '2026-03-15', 0.85, 0, 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE ADDONS
-- ============================================================================
INSERT INTO addons (id, tenant_id, name, description, price, price_type, max_quantity, sort_order, status)
VALUES
(
    '00000000-0000-0000-0007-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '{"en": "GPS Navigation", "lt": "GPS navigacija", "ru": "GPS навигация"}'::jsonb,
    '{"en": "Portable GPS device with European maps", "lt": "Nešiojamas GPS įrenginys su Europos žemėlapiais", "ru": "Портативное GPS устройство с картами Европы"}'::jsonb,
    5.00, 'per_day', 1, 1, 'active'
),
(
    '00000000-0000-0000-0007-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '{"en": "Child Seat", "lt": "Vaikiška kėdutė", "ru": "Детское кресло"}'::jsonb,
    '{"en": "Child safety seat (9-18 kg)", "lt": "Vaikiška saugos kėdutė (9-18 kg)", "ru": "Детское автокресло (9-18 кг)"}'::jsonb,
    8.00, 'per_day', 3, 2, 'active'
),
(
    '00000000-0000-0000-0007-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '{"en": "Additional Driver", "lt": "Papildomas vairuotojas", "ru": "Дополнительный водитель"}'::jsonb,
    '{"en": "Add another authorized driver", "lt": "Pridėti kitą įgaliotą vairuotoją", "ru": "Добавить еще одного водителя"}'::jsonb,
    10.00, 'per_day', 2, 3, 'active'
),
(
    '00000000-0000-0000-0007-000000000004',
    '00000000-0000-0000-0000-000000000001',
    '{"en": "Full Insurance", "lt": "Pilnas draudimas", "ru": "Полная страховка"}'::jsonb,
    '{"en": "Zero deductible coverage", "lt": "Draudimas be išskaitos", "ru": "Страховка без франшизы"}'::jsonb,
    15.00, 'per_day', 1, 4, 'active'
),
(
    '00000000-0000-0000-0007-000000000005',
    '00000000-0000-0000-0000-000000000001',
    '{"en": "WiFi Hotspot", "lt": "WiFi prieigos taškas", "ru": "WiFi роутер"}'::jsonb,
    '{"en": "Portable WiFi with unlimited data", "lt": "Nešiojamas WiFi su neribotu internetu", "ru": "Портативный WiFi с безлимитным интернетом"}'::jsonb,
    7.00, 'per_day', 1, 5, 'active'
),
(
    '00000000-0000-0000-0007-000000000006',
    '00000000-0000-0000-0000-000000000001',
    '{"en": "Cross-Border Fee", "lt": "Tarptautinis mokestis", "ru": "Выезд за границу"}'::jsonb,
    '{"en": "Permission to travel outside Lithuania", "lt": "Leidimas keliauti už Lietuvos ribų", "ru": "Разрешение на выезд за пределы Литвы"}'::jsonb,
    25.00, 'per_rental', 1, 6, 'active'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE COUPONS
-- ============================================================================
INSERT INTO coupons (id, tenant_id, code, description, discount_type, discount_value, min_order_value, valid_from, valid_until, usage_limit, status)
VALUES
(
    '00000000-0000-0000-0008-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'WELCOME10',
    'Welcome discount for new customers',
    'percentage', 10.00, 50.00,
    '2026-01-01 00:00:00+00', '2026-12-31 23:59:59+00',
    1000, 'active'
),
(
    '00000000-0000-0000-0008-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'SUMMER25',
    'Summer special - 25 EUR off',
    'fixed_amount', 25.00, 100.00,
    '2026-06-01 00:00:00+00', '2026-08-31 23:59:59+00',
    500, 'active'
),
(
    '00000000-0000-0000-0008-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'FREEGPS',
    'Free GPS with your rental',
    'free_addon', 0.00, NULL,
    '2026-01-01 00:00:00+00', '2026-12-31 23:59:59+00',
    200, 'active'
)
ON CONFLICT (id) DO NOTHING;

-- Update free addon reference
UPDATE coupons SET free_addon_id = '00000000-0000-0000-0007-000000000001' WHERE id = '00000000-0000-0000-0008-000000000003';

-- ============================================================================
-- SAMPLE PAGES
-- ============================================================================
INSERT INTO pages (id, tenant_id, slug, title, meta, status, is_system, published_at)
VALUES
(
    '00000000-0000-0000-0009-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'home',
    '{"en": "Home", "lt": "Pradžia", "ru": "Главная"}'::jsonb,
    '{"en": {"description": "Rent a car in Lithuania - Best prices and service", "keywords": "car rental, Lithuania, Vilnius"}}'::jsonb,
    'published', true, NOW()
),
(
    '00000000-0000-0000-0009-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'about',
    '{"en": "About Us", "lt": "Apie mus", "ru": "О нас"}'::jsonb,
    '{"en": {"description": "Learn about Baltic Car Rental - Your trusted car rental partner"}}'::jsonb,
    'published', false, NOW()
),
(
    '00000000-0000-0000-0009-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'contact',
    '{"en": "Contact", "lt": "Kontaktai", "ru": "Контакты"}'::jsonb,
    '{"en": {"description": "Get in touch with Baltic Car Rental"}}'::jsonb,
    'published', false, NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE PAGE BLOCKS
-- ============================================================================
INSERT INTO page_blocks (id, page_id, block_type, content, settings, sort_order)
VALUES
-- Home page blocks
(
    '00000000-0000-0000-000A-000000000001',
    '00000000-0000-0000-0009-000000000001',
    'hero',
    '{
        "en": {
            "heading": "Your Journey Starts Here",
            "subheading": "Rent the perfect car for your adventure in Lithuania",
            "ctaText": "Book Now",
            "ctaLink": "/booking"
        },
        "lt": {
            "heading": "Jūsų kelionė prasideda čia",
            "subheading": "Išsinuomokite tobulą automobilį savo nuotykiui Lietuvoje",
            "ctaText": "Rezervuoti",
            "ctaLink": "/booking"
        },
        "backgroundImage": "https://placehold.co/1920x800/1e40af/white?text=Hero+Background"
    }'::jsonb,
    '{"padding": {"top": "lg", "bottom": "lg"}}'::jsonb,
    1
),
(
    '00000000-0000-0000-000A-000000000002',
    '00000000-0000-0000-0009-000000000001',
    'features',
    '{
        "en": {
            "heading": "Why Choose Us",
            "features": [
                {"icon": "shield", "title": "Full Insurance", "description": "All vehicles include comprehensive insurance"},
                {"icon": "clock", "title": "24/7 Support", "description": "Round-the-clock customer assistance"},
                {"icon": "map-pin", "title": "Multiple Locations", "description": "Convenient pickup points across Lithuania"},
                {"icon": "credit-card", "title": "Best Prices", "description": "Competitive rates with no hidden fees"}
            ]
        }
    }'::jsonb,
    '{"background": {"type": "color", "value": "#F9FAFB"}, "padding": {"top": "lg", "bottom": "lg"}}'::jsonb,
    2
),
(
    '00000000-0000-0000-000A-000000000003',
    '00000000-0000-0000-0009-000000000001',
    'fleet_gallery',
    '{
        "en": {"heading": "Our Fleet"},
        "showCategories": true,
        "maxVehicles": 6
    }'::jsonb,
    '{"padding": {"top": "lg", "bottom": "lg"}}'::jsonb,
    3
),
(
    '00000000-0000-0000-000A-000000000004',
    '00000000-0000-0000-0009-000000000001',
    'cta',
    '{
        "en": {
            "heading": "Ready to Hit the Road?",
            "description": "Book your car today and enjoy 10% off with code WELCOME10",
            "buttonText": "Start Booking",
            "buttonLink": "/booking"
        },
        "backgroundColor": "#3B82F6",
        "textColor": "#FFFFFF"
    }'::jsonb,
    '{"padding": {"top": "lg", "bottom": "lg"}}'::jsonb,
    4
),
-- About page blocks
(
    '00000000-0000-0000-000A-000000000010',
    '00000000-0000-0000-0009-000000000002',
    'text_image',
    '{
        "en": {
            "heading": "About Baltic Car Rental",
            "text": "Founded in 2020, Baltic Car Rental has grown to become one of the leading car rental companies in Lithuania. We pride ourselves on providing exceptional service, well-maintained vehicles, and competitive prices.",
            "ctaText": "View Our Fleet",
            "ctaLink": "/fleet"
        },
        "image": "https://placehold.co/600x400/e2e8f0/475569?text=About+Us",
        "imagePosition": "right"
    }'::jsonb,
    '{"padding": {"top": "lg", "bottom": "lg"}}'::jsonb,
    1
),
-- Contact page blocks
(
    '00000000-0000-0000-000A-000000000020',
    '00000000-0000-0000-0009-000000000003',
    'contact_form',
    '{
        "en": {
            "heading": "Get in Touch",
            "description": "Have questions? We are here to help!",
            "submitText": "Send Message",
            "successMessage": "Thank you! We will get back to you shortly."
        },
        "fields": ["name", "email", "phone", "message"]
    }'::jsonb,
    '{"padding": {"top": "lg", "bottom": "lg"}}'::jsonb,
    1
),
(
    '00000000-0000-0000-000A-000000000021',
    '00000000-0000-0000-0009-000000000003',
    'location_map',
    '{
        "en": {"heading": "Our Locations"},
        "showAllBranches": true,
        "mapZoom": 8
    }'::jsonb,
    '{"padding": {"top": "lg", "bottom": "lg"}}'::jsonb,
    2
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE BOOKINGS
-- ============================================================================
INSERT INTO bookings (id, tenant_id, reference, customer_id, vehicle_id, pickup_branch_id, return_branch_id, pickup_at, return_at, status, pricing, driver_info)
VALUES
(
    '00000000-0000-0000-000B-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'BK-260201-001',
    '00000000-0000-0000-0001-000000000010',
    '00000000-0000-0000-0004-000000000003',
    '00000000-0000-0000-0002-000000000001',
    '00000000-0000-0000-0002-000000000001',
    '2026-02-15 10:00:00+00',
    '2026-02-18 10:00:00+00',
    'confirmed',
    '{
        "baseRate": 35.00,
        "rateType": "daily",
        "duration": 3,
        "subtotal": 105.00,
        "addonsTotal": 15.00,
        "discountAmount": 0,
        "total": 120.00,
        "currency": "EUR"
    }'::jsonb,
    '{
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "phone": "+370 600 33333"
    }'::jsonb
),
(
    '00000000-0000-0000-000B-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'BK-260201-002',
    '00000000-0000-0000-0001-000000000011',
    '00000000-0000-0000-0004-000000000005',
    '00000000-0000-0000-0002-000000000001',
    '00000000-0000-0000-0002-000000000002',
    '2026-02-20 14:00:00+00',
    '2026-02-25 14:00:00+00',
    'confirmed',
    '{
        "baseRate": 55.00,
        "rateType": "daily",
        "duration": 5,
        "subtotal": 275.00,
        "oneWayFee": 25.00,
        "addonsTotal": 40.00,
        "discountType": "percentage",
        "discountValue": 10,
        "discountAmount": 34.00,
        "couponCode": "WELCOME10",
        "total": 306.00,
        "currency": "EUR"
    }'::jsonb,
    '{
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane.smith@example.com",
        "phone": "+370 600 44444"
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE BOOKING ADDONS
-- ============================================================================
INSERT INTO booking_addons (id, booking_id, addon_id, quantity, unit_price, price_type, total_price)
VALUES
(
    '00000000-0000-0000-000C-000000000001',
    '00000000-0000-0000-000B-000000000001',
    '00000000-0000-0000-0007-000000000001',
    1, 5.00, 'per_day', 15.00
),
(
    '00000000-0000-0000-000C-000000000002',
    '00000000-0000-0000-000B-000000000002',
    '00000000-0000-0000-0007-000000000002',
    1, 8.00, 'per_day', 40.00
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify seed data was inserted correctly:
-- SELECT 'tenants' as table_name, count(*) FROM tenants;
-- SELECT 'users' as table_name, count(*) FROM users;
-- SELECT 'branches' as table_name, count(*) FROM branches;
-- SELECT 'vehicle_categories' as table_name, count(*) FROM vehicle_categories;
-- SELECT 'vehicles' as table_name, count(*) FROM vehicles;
-- SELECT 'pricing_rules' as table_name, count(*) FROM pricing_rules;
-- SELECT 'seasons' as table_name, count(*) FROM seasons;
-- SELECT 'addons' as table_name, count(*) FROM addons;
-- SELECT 'coupons' as table_name, count(*) FROM coupons;
-- SELECT 'pages' as table_name, count(*) FROM pages;
-- SELECT 'page_blocks' as table_name, count(*) FROM page_blocks;
-- SELECT 'bookings' as table_name, count(*) FROM bookings;
-- SELECT 'booking_addons' as table_name, count(*) FROM booking_addons;
