/**
 * Application constants
 */

// Supported locales
export const LOCALES = ['en', 'lt', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

// Booking statuses
export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// Vehicle statuses
export const VEHICLE_STATUSES = [
  'available',
  'rented',
  'maintenance',
  'retired',
] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

// User roles
export const USER_ROLES = [
  'customer',
  'staff',
  'admin',
  'platform_admin',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Tenant statuses
export const TENANT_STATUSES = ['active', 'suspended', 'pending'] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

// Price types for add-ons
export const ADDON_PRICE_TYPES = ['per_day', 'per_rental', 'one_time'] as const;
export type AddonPriceType = (typeof ADDON_PRICE_TYPES)[number];

// Discount types for coupons
export const DISCOUNT_TYPES = ['percentage', 'fixed'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

// Fuel types
export const FUEL_TYPES = [
  'petrol',
  'diesel',
  'electric',
  'hybrid',
  'plugin_hybrid',
] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

// Transmission types
export const TRANSMISSION_TYPES = ['manual', 'automatic'] as const;
export type TransmissionType = (typeof TRANSMISSION_TYPES)[number];

// Page statuses
export const PAGE_STATUSES = ['draft', 'published'] as const;
export type PageStatus = (typeof PAGE_STATUSES)[number];

// Default pagination
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

// Date/time formats
export const DATE_FORMAT = 'yyyy-MM-dd';
export const TIME_FORMAT = 'HH:mm';
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm';

// Default currency
export const DEFAULT_CURRENCY = 'EUR';

// Image upload limits
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_VEHICLE_IMAGES = 10;
