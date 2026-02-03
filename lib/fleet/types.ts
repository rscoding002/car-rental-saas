/**
 * Fleet Types & Zod Schemas
 *
 * Type definitions and validation schemas for vehicle and category management.
 */

import { z } from 'zod';
import type {
  VehicleStatus,
  Transmission,
  FuelType,
  LocalizedString,
  VehiclePhoto,
} from '@/lib/supabase/types';

// Re-export base types for convenience
export type { VehicleStatus, Transmission, FuelType, VehiclePhoto };

// ============================================================================
// VEHICLE CATEGORY TYPES
// ============================================================================

/**
 * Vehicle Category from database
 */
export interface VehicleCategory {
  id: string;
  tenant_id: string;
  name: LocalizedString;
  description: LocalizedString;
  icon: string | null;
  image_url: string | null;
  sort_order: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export type VehicleCategoryInsert = Omit<VehicleCategory, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type VehicleCategoryUpdate = Partial<VehicleCategoryInsert>;

/**
 * Category with vehicle count
 */
export interface VehicleCategoryWithCount extends VehicleCategory {
  vehicleCount: number;
}

/**
 * Category list item (for dropdowns)
 */
export interface CategoryListItem {
  id: string;
  name: LocalizedString;
  status: 'active' | 'inactive';
}

// ============================================================================
// VEHICLE TYPES
// ============================================================================

/**
 * Vehicle from database
 */
export interface Vehicle {
  id: string;
  tenant_id: string;
  branch_id: string;
  category_id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  vin: string | null;
  transmission: Transmission;
  fuel_type: FuelType;
  seats: number;
  doors: number;
  luggage_capacity: number | null;
  features: string[];
  photos: VehiclePhoto[];
  status: VehicleStatus;
  odometer: number | null;
  color: string | null;
  description: LocalizedString;
  created_at: string;
  updated_at: string;
}

export type VehicleInsert = Omit<Vehicle, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type VehicleUpdate = Partial<VehicleInsert>;

/**
 * Vehicle with related data
 */
export interface VehicleWithRelations extends Vehicle {
  category?: VehicleCategory;
  branch?: {
    id: string;
    name: string;
    city: string;
  };
}

/**
 * Vehicle list item (optimized for lists)
 */
export interface VehicleListItem {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  transmission: Transmission;
  fuel_type: FuelType;
  seats: number;
  status: VehicleStatus;
  photos: VehiclePhoto[];
  category_id: string;
  branch_id: string;
}

/**
 * Vehicle for public display (with pricing)
 */
export interface VehiclePublic extends Vehicle {
  category?: VehicleCategory;
  branch?: {
    id: string;
    name: string;
    city: string;
  };
  dailyRate?: number;
  currency?: string;
}

// ============================================================================
// ZOD SCHEMAS - CATEGORY
// ============================================================================

/**
 * Localized string schema
 */
export const localizedStringSchema = z.object({
  en: z.string().optional(),
  lt: z.string().optional(),
  ru: z.string().optional(),
}).passthrough();

/**
 * Category status schema
 */
export const categoryStatusSchema = z.enum(['active', 'inactive']);

/**
 * Create category schema
 */
export const createCategorySchema = z.object({
  name: localizedStringSchema.refine(
    (val) => val.en || val.lt || val.ru,
    { message: 'At least one language name is required' }
  ),
  description: localizedStringSchema.optional().default({}),
  icon: z.string().max(50).optional().nullable(),
  image_url: z.string().url('Invalid image URL').optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
  status: categoryStatusSchema.default('active'),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

/**
 * Update category schema
 */
export const updateCategorySchema = createCategorySchema.partial();

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// ============================================================================
// ZOD SCHEMAS - VEHICLE
// ============================================================================

/**
 * Vehicle status schema
 */
export const vehicleStatusSchema = z.enum(['available', 'rented', 'maintenance', 'retired']);

/**
 * Transmission schema
 */
export const transmissionSchema = z.enum(['manual', 'automatic']);

/**
 * Fuel type schema
 */
export const fuelTypeSchema = z.enum(['petrol', 'diesel', 'electric', 'hybrid', 'plugin_hybrid']);

/**
 * Vehicle photo schema
 */
export const vehiclePhotoSchema = z.object({
  url: z.string().url('Invalid photo URL'),
  isPrimary: z.boolean().optional().default(false),
  order: z.number().int().min(0).optional().default(0),
});

/**
 * Create vehicle schema
 */
export const createVehicleSchema = z.object({
  branch_id: z.string().uuid('Invalid branch ID'),
  category_id: z.string().uuid('Invalid category ID'),
  make: z.string().min(1, 'Make is required').max(100),
  model: z.string().min(1, 'Model is required').max(100),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 2),
  license_plate: z.string().min(1, 'License plate is required').max(20),
  vin: z.string().max(17).optional().nullable(),
  transmission: transmissionSchema,
  fuel_type: fuelTypeSchema,
  seats: z.number().int().min(1).max(50),
  doors: z.number().int().min(1).max(10),
  luggage_capacity: z.number().int().min(0).optional().nullable(),
  features: z.array(z.string()).default([]),
  photos: z.array(vehiclePhotoSchema).default([]),
  status: vehicleStatusSchema.default('available'),
  odometer: z.number().int().min(0).optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  description: localizedStringSchema.optional().default({}),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

/**
 * Update vehicle schema
 */
export const updateVehicleSchema = createVehicleSchema.partial();

export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

/**
 * Vehicle form schema (for form handling with string inputs)
 */
export const vehicleFormSchema = z.object({
  branch_id: z.string().min(1, 'Branch is required'),
  category_id: z.string().min(1, 'Category is required'),
  make: z.string().min(1, 'Make is required').max(100),
  model: z.string().min(1, 'Model is required').max(100),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 2),
  license_plate: z.string().min(1, 'License plate is required').max(20),
  vin: z.string().max(17).optional().or(z.literal('')),
  transmission: transmissionSchema,
  fuel_type: fuelTypeSchema,
  seats: z.coerce.number().int().min(1).max(50),
  doors: z.coerce.number().int().min(1).max(10),
  luggage_capacity: z.coerce.number().int().min(0).optional().or(z.literal('')),
  features: z.string().optional(), // Comma-separated, will be transformed
  status: vehicleStatusSchema.default('available'),
  odometer: z.coerce.number().int().min(0).optional().or(z.literal('')),
  color: z.string().max(50).optional().or(z.literal('')),
  description_en: z.string().optional(),
  description_lt: z.string().optional(),
  description_ru: z.string().optional(),
});

export type VehicleFormData = z.infer<typeof vehicleFormSchema>;

// ============================================================================
// FILTER & SORT TYPES
// ============================================================================

/**
 * Vehicle filter options
 */
export interface VehicleFilters {
  status?: VehicleStatus;
  categoryId?: string;
  branchId?: string;
  transmission?: Transmission;
  fuelType?: FuelType;
  minSeats?: number;
  maxSeats?: number;
  minYear?: number;
  maxYear?: number;
  search?: string;
}

/**
 * Vehicle sort options
 */
export type VehicleSortField = 'make' | 'model' | 'year' | 'status' | 'created_at';
export type SortDirection = 'asc' | 'desc';

export interface VehicleSort {
  field: VehicleSortField;
  direction: SortDirection;
}

/**
 * Category filter options
 */
export interface CategoryFilters {
  status?: 'active' | 'inactive';
  search?: string;
}

/**
 * Category sort options
 */
export type CategorySortField = 'name' | 'sort_order' | 'created_at';

export interface CategorySort {
  field: CategorySortField;
  direction: SortDirection;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get vehicle display name
 */
export function getVehicleDisplayName(vehicle: Pick<Vehicle, 'make' | 'model' | 'year'>): string {
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}

/**
 * Get localized category name
 */
export function getCategoryName(category: Pick<VehicleCategory, 'name'>, locale: string): string {
  return category.name[locale] || category.name.en || Object.values(category.name).find(v => v) || 'Unnamed';
}

/**
 * Get localized category description
 */
export function getCategoryDescription(category: Pick<VehicleCategory, 'description'>, locale: string): string {
  return category.description[locale] || category.description.en || '';
}

/**
 * Get localized vehicle description
 */
export function getVehicleDescription(vehicle: Pick<Vehicle, 'description'>, locale: string): string {
  return vehicle.description[locale] || vehicle.description.en || '';
}

/**
 * Get primary photo URL
 */
export function getPrimaryPhotoUrl(photos: VehiclePhoto[]): string | null {
  if (!photos || photos.length === 0) return null;
  const primary = photos.find(p => p.isPrimary);
  return primary?.url || photos[0]?.url || null;
}

/**
 * Sort photos by order
 */
export function sortPhotos(photos: VehiclePhoto[]): VehiclePhoto[] {
  return [...photos].sort((a, b) => {
    // Primary photo first
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    // Then by order
    return (a.order || 0) - (b.order || 0);
  });
}

/**
 * Parse features from comma-separated string
 */
export function parseFeatures(featuresString: string): string[] {
  if (!featuresString) return [];
  return featuresString
    .split(',')
    .map(f => f.trim())
    .filter(f => f.length > 0);
}

/**
 * Format features as comma-separated string
 */
export function formatFeatures(features: string[]): string {
  return features.join(', ');
}

/**
 * Transform form data to vehicle insert
 */
export function formDataToVehicle(formData: VehicleFormData, tenantId: string): VehicleInsert {
  return {
    tenant_id: tenantId,
    branch_id: formData.branch_id,
    category_id: formData.category_id,
    make: formData.make,
    model: formData.model,
    year: formData.year,
    license_plate: formData.license_plate,
    vin: formData.vin || null,
    transmission: formData.transmission,
    fuel_type: formData.fuel_type,
    seats: formData.seats,
    doors: formData.doors,
    luggage_capacity: typeof formData.luggage_capacity === 'number' ? formData.luggage_capacity : null,
    features: formData.features ? parseFeatures(formData.features) : [],
    photos: [],
    status: formData.status,
    odometer: typeof formData.odometer === 'number' ? formData.odometer : null,
    color: formData.color || null,
    description: {
      en: formData.description_en || '',
      lt: formData.description_lt || '',
      ru: formData.description_ru || '',
    },
  };
}

/**
 * Transform vehicle to form data
 */
export function vehicleToFormData(vehicle: Vehicle): Partial<VehicleFormData> {
  return {
    branch_id: vehicle.branch_id,
    category_id: vehicle.category_id,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    license_plate: vehicle.license_plate,
    vin: vehicle.vin || '',
    transmission: vehicle.transmission,
    fuel_type: vehicle.fuel_type,
    seats: vehicle.seats,
    doors: vehicle.doors,
    luggage_capacity: vehicle.luggage_capacity || undefined,
    features: formatFeatures(vehicle.features),
    status: vehicle.status,
    odometer: vehicle.odometer || undefined,
    color: vehicle.color || '',
    description_en: vehicle.description.en || '',
    description_lt: vehicle.description.lt || '',
    description_ru: vehicle.description.ru || '',
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Vehicle status options for forms
 */
export const VEHICLE_STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'rented', label: 'Rented' },
  { value: 'maintenance', label: 'In Maintenance' },
  { value: 'retired', label: 'Retired' },
] as const;

/**
 * Transmission options for forms
 */
export const TRANSMISSION_OPTIONS = [
  { value: 'automatic', label: 'Automatic' },
  { value: 'manual', label: 'Manual' },
] as const;

/**
 * Fuel type options for forms
 */
export const FUEL_TYPE_OPTIONS = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'plugin_hybrid', label: 'Plug-in Hybrid' },
] as const;

/**
 * Common vehicle features
 */
export const COMMON_FEATURES = [
  'Air Conditioning',
  'Bluetooth',
  'GPS Navigation',
  'Backup Camera',
  'Cruise Control',
  'Heated Seats',
  'Leather Interior',
  'Sunroof',
  'Apple CarPlay',
  'Android Auto',
  'USB Ports',
  'Parking Sensors',
  'Keyless Entry',
  'Lane Assist',
  'Blind Spot Monitor',
] as const;
