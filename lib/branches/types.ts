/**
 * Branch Types & Zod Schemas
 *
 * Type definitions and validation schemas for branch/location management.
 * Branches represent physical locations where vehicles are picked up and returned.
 */

import { z } from 'zod';
import type {
  Branch,
  BranchInsert,
  BranchUpdate,
  BranchStatus,
  OperatingHours,
} from '@/lib/supabase/types';

// Re-export base types for convenience
export type { Branch, BranchInsert, BranchUpdate, BranchStatus, OperatingHours };

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Day of week type for operating hours
 */
export const dayOfWeekSchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;

/**
 * Time slot for a single day's operating hours
 */
export const timeSlotSchema = z.object({
  open: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  close: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
}).nullable();

export type TimeSlot = z.infer<typeof timeSlotSchema>;

/**
 * Operating hours schema
 * null means closed, object with open/close means open
 */
export const operatingHoursSchema = z.object({
  monday: timeSlotSchema.optional(),
  tuesday: timeSlotSchema.optional(),
  wednesday: timeSlotSchema.optional(),
  thursday: timeSlotSchema.optional(),
  friday: timeSlotSchema.optional(),
  saturday: timeSlotSchema.optional(),
  sunday: timeSlotSchema.optional(),
});

/**
 * Branch status enum
 */
export const branchStatusSchema = z.enum(['active', 'inactive']);

/**
 * GPS coordinates schema
 */
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type Coordinates = z.infer<typeof coordinatesSchema>;

/**
 * Branch contact info schema
 */
export const branchContactSchema = z.object({
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email('Invalid email address').max(255).optional().nullable(),
});

export type BranchContact = z.infer<typeof branchContactSchema>;

/**
 * Branch address schema
 */
export const branchAddressSchema = z.object({
  address: z.string().min(5, 'Address is required').max(500),
  city: z.string().min(2, 'City is required').max(100),
  country: z.string().length(2, 'Country must be ISO 2-letter code').default('LT'),
});

export type BranchAddress = z.infer<typeof branchAddressSchema>;

/**
 * Create branch schema (for form validation)
 */
export const createBranchSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  address: z.string().min(5, 'Address is required').max(500),
  city: z.string().min(2, 'City is required').max(100),
  country: z.string().length(2, 'Country must be ISO 2-letter code').default('LT'),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email('Invalid email').max(255).optional().nullable(),
  operating_hours: operatingHoursSchema.optional(),
  status: branchStatusSchema.default('active'),
  sort_order: z.number().int().min(0).default(0),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;

/**
 * Update branch schema (partial)
 */
export const updateBranchSchema = createBranchSchema.partial();

export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;

/**
 * Branch form data (for use in forms)
 */
export const branchFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  address: z.string().min(5, 'Address is required').max(500),
  city: z.string().min(2, 'City is required').max(100),
  country: z.string().length(2, 'Country code required').default('LT'),
  latitude: z.string().optional().transform((val) => val ? parseFloat(val) : null),
  longitude: z.string().optional().transform((val) => val ? parseFloat(val) : null),
  phone: z.string().max(50).optional(),
  email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
  status: branchStatusSchema.default('active'),
  sort_order: z.coerce.number().int().min(0).default(0),
  // Operating hours as individual fields for form handling
  monday_open: z.string().optional(),
  monday_close: z.string().optional(),
  tuesday_open: z.string().optional(),
  tuesday_close: z.string().optional(),
  wednesday_open: z.string().optional(),
  wednesday_close: z.string().optional(),
  thursday_open: z.string().optional(),
  thursday_close: z.string().optional(),
  friday_open: z.string().optional(),
  friday_close: z.string().optional(),
  saturday_open: z.string().optional(),
  saturday_close: z.string().optional(),
  sunday_open: z.string().optional(),
  sunday_close: z.string().optional(),
});

export type BranchFormData = z.infer<typeof branchFormSchema>;

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Branch with computed fields
 */
export interface BranchWithDetails extends Branch {
  vehicleCount?: number;
  isOpen?: boolean;
  todayHours?: TimeSlot;
}

/**
 * Branch list item (optimized for lists/dropdowns)
 */
export interface BranchListItem {
  id: string;
  name: string;
  city: string;
  status: BranchStatus;
}

/**
 * Branch selector option (for dropdowns)
 */
export interface BranchOption {
  value: string;
  label: string;
  city?: string;
  disabled?: boolean;
}

/**
 * Branch filter options
 */
export interface BranchFilters {
  status?: BranchStatus;
  city?: string;
  search?: string;
}

/**
 * Branch sort options
 */
export type BranchSortField = 'name' | 'city' | 'sort_order' | 'created_at';
export type SortDirection = 'asc' | 'desc';

export interface BranchSort {
  field: BranchSortField;
  direction: SortDirection;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert form data to operating hours object
 */
export function formDataToOperatingHours(formData: BranchFormData): OperatingHours {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
  const hours: OperatingHours = {};

  for (const day of days) {
    const open = formData[`${day}_open` as keyof BranchFormData] as string | undefined;
    const close = formData[`${day}_close` as keyof BranchFormData] as string | undefined;

    if (open && close) {
      hours[day] = { open, close };
    } else {
      hours[day] = null;
    }
  }

  return hours;
}

/**
 * Convert operating hours to form data fields
 */
export function operatingHoursToFormData(hours: OperatingHours): Partial<BranchFormData> {
  const formData: Record<string, string | undefined> = {};
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

  for (const day of days) {
    const slot = hours[day];
    if (slot) {
      formData[`${day}_open`] = slot.open;
      formData[`${day}_close`] = slot.close;
    }
  }

  return formData as Partial<BranchFormData>;
}

/**
 * Check if a branch is currently open
 */
export function isBranchOpen(hours: OperatingHours, date: Date = new Date()): boolean {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const dayName = days[date.getDay()];
  const slot = hours[dayName];

  if (!slot) return false;

  const currentTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  return currentTime >= slot.open && currentTime < slot.close;
}

/**
 * Get today's operating hours for a branch
 */
export function getTodayHours(hours: OperatingHours, date: Date = new Date()): TimeSlot {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const dayName = days[date.getDay()];
  return hours[dayName] ?? null;
}

/**
 * Generate a slug from branch name
 */
export function generateBranchSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Format operating hours for display
 */
export function formatOperatingHours(slot: TimeSlot): string {
  if (!slot) return 'Closed';
  return `${slot.open} - ${slot.close}`;
}

/**
 * Get all operating hours as a formatted object
 */
export function formatAllOperatingHours(hours: OperatingHours): Record<DayOfWeek, string> {
  const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const result: Record<DayOfWeek, string> = {} as Record<DayOfWeek, string>;

  for (const day of days) {
    result[day] = formatOperatingHours(hours[day] ?? null);
  }

  return result;
}

/**
 * Convert branch to selector option
 */
export function branchToOption(branch: Branch | BranchListItem): BranchOption {
  return {
    value: branch.id,
    label: branch.name,
    city: branch.city,
    disabled: branch.status !== 'active',
  };
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find nearest branch to given coordinates
 */
export function findNearestBranch(
  branches: Branch[],
  latitude: number,
  longitude: number
): Branch | null {
  if (branches.length === 0) return null;

  let nearest: Branch | null = null;
  let minDistance = Infinity;

  for (const branch of branches) {
    if (branch.latitude && branch.longitude && branch.status === 'active') {
      const distance = calculateDistance(
        latitude,
        longitude,
        branch.latitude,
        branch.longitude
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearest = branch;
      }
    }
  }

  return nearest;
}

/**
 * Sort branches by distance from coordinates
 */
export function sortBranchesByDistance(
  branches: Branch[],
  latitude: number,
  longitude: number
): Array<Branch & { distance: number }> {
  return branches
    .filter((b) => b.latitude && b.longitude && b.status === 'active')
    .map((branch) => ({
      ...branch,
      distance: calculateDistance(
        latitude,
        longitude,
        branch.latitude!,
        branch.longitude!
      ),
    }))
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Default operating hours template (Mon-Fri 8-18, Sat 9-14, Sun closed)
 */
export const DEFAULT_OPERATING_HOURS: OperatingHours = {
  monday: { open: '08:00', close: '18:00' },
  tuesday: { open: '08:00', close: '18:00' },
  wednesday: { open: '08:00', close: '18:00' },
  thursday: { open: '08:00', close: '18:00' },
  friday: { open: '08:00', close: '18:00' },
  saturday: { open: '09:00', close: '14:00' },
  sunday: null,
};

/**
 * 24/7 operating hours template
 */
export const OPERATING_HOURS_24_7: OperatingHours = {
  monday: { open: '00:00', close: '23:59' },
  tuesday: { open: '00:00', close: '23:59' },
  wednesday: { open: '00:00', close: '23:59' },
  thursday: { open: '00:00', close: '23:59' },
  friday: { open: '00:00', close: '23:59' },
  saturday: { open: '00:00', close: '23:59' },
  sunday: { open: '00:00', close: '23:59' },
};
