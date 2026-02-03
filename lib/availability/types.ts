/**
 * Availability Types & Interfaces
 *
 * Type definitions and Zod schemas for the vehicle availability system.
 * Handles availability checking, buffer time logic, and manual blocks.
 */

import { z } from 'zod';
import type { BookingStatus, VehicleStatus } from '@/lib/supabase/types';

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/**
 * Reasons why a vehicle might be unavailable
 */
export type UnavailabilityReason =
  | 'booking_conflict' // Vehicle is booked during this period
  | 'buffer_time' // Buffer time between bookings
  | 'maintenance' // Manual maintenance block
  | 'reserved' // Reserved for specific customer/purpose
  | 'out_of_service' // Vehicle is out of service
  | 'branch_closed' // Branch is closed during pickup/return time
  | 'vehicle_status' // Vehicle status is not 'available'
  | 'one_way_conflict'; // One-way rental conflicts at either branch

/**
 * Types of availability blocks
 */
export type AvailabilityBlockType =
  | 'maintenance' // Scheduled maintenance
  | 'reserved' // Reserved for specific use
  | 'out_of_service' // Temporarily unavailable
  | 'inspection' // Vehicle inspection
  | 'damage_repair' // Repair after damage
  | 'cleaning' // Deep cleaning
  | 'other'; // Other reasons

/**
 * Block recurrence patterns
 */
export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'monthly';

// ============================================================================
// DATE RANGE TYPES
// ============================================================================

/**
 * Date/time range for availability queries
 */
export interface DateTimeRange {
  /** Start date/time (ISO string) */
  startAt: string;
  /** End date/time (ISO string) */
  endAt: string;
}

/**
 * Date-only range (for calendar views)
 */
export interface DateRange {
  /** Start date (YYYY-MM-DD) */
  startDate: string;
  /** End date (YYYY-MM-DD) */
  endDate: string;
}

// ============================================================================
// AVAILABILITY QUERY TYPES
// ============================================================================

/**
 * Input for checking single vehicle availability
 */
export interface AvailabilityQueryInput {
  /** Vehicle ID to check */
  vehicleId: string;
  /** Pickup date/time */
  pickupAt: string;
  /** Return date/time */
  returnAt: string;
  /** Pickup branch ID (for one-way rentals) */
  pickupBranchId?: string;
  /** Return branch ID (for one-way rentals) */
  returnBranchId?: string;
  /** Booking ID to exclude (for modifications) */
  excludeBookingId?: string;
}

/**
 * Input for searching available vehicles
 */
export interface AvailabilitySearchInput {
  /** Tenant ID */
  tenantId: string;
  /** Pickup date/time */
  pickupAt: string;
  /** Return date/time */
  returnAt: string;
  /** Pickup branch ID */
  pickupBranchId: string;
  /** Return branch ID (optional, defaults to pickup branch) */
  returnBranchId?: string;
  /** Filter by category ID */
  categoryId?: string;
  /** Filter by transmission type */
  transmission?: 'manual' | 'automatic';
  /** Filter by fuel type */
  fuelType?: string;
  /** Minimum number of seats */
  minSeats?: number;
  /** Minimum number of doors */
  minDoors?: number;
  /** Feature requirements */
  features?: string[];
}

/**
 * Input for getting calendar availability view
 */
export interface CalendarQueryInput {
  /** Vehicle ID or 'all' for fleet view */
  vehicleId?: string;
  /** Branch ID to filter by */
  branchId?: string;
  /** Category ID to filter by */
  categoryId?: string;
  /** Start date for calendar range */
  startDate: string;
  /** End date for calendar range */
  endDate: string;
}

// ============================================================================
// AVAILABILITY RESULT TYPES
// ============================================================================

/**
 * Result of checking single vehicle availability
 */
export interface AvailabilityResult {
  /** Whether the vehicle is available */
  isAvailable: boolean;
  /** Vehicle ID */
  vehicleId: string;
  /** Requested pickup time */
  pickupAt: string;
  /** Requested return time */
  returnAt: string;
  /** Reasons why unavailable (if not available) */
  unavailabilityReasons?: UnavailabilityReason[];
  /** Conflicting bookings (if any) */
  conflictingBookings?: ConflictingBooking[];
  /** Conflicting blocks (if any) */
  conflictingBlocks?: AvailabilityBlock[];
  /** Buffer time applied (in minutes) */
  bufferTimeApplied?: number;
  /** Is this a one-way rental */
  isOneWay?: boolean;
  /** One-way availability at pickup branch */
  pickupBranchAvailable?: boolean;
  /** One-way availability at return branch */
  returnBranchAvailable?: boolean;
}

/**
 * Conflicting booking information
 */
export interface ConflictingBooking {
  /** Booking ID */
  bookingId: string;
  /** Booking reference number */
  reference: string;
  /** Pickup time */
  pickupAt: string;
  /** Return time */
  returnAt: string;
  /** Booking status */
  status: BookingStatus;
  /** Customer name (for admin views) */
  customerName?: string;
}

/**
 * Vehicle with availability status for search results
 */
export interface AvailableVehicle {
  /** Vehicle ID */
  id: string;
  /** Vehicle make */
  make: string;
  /** Vehicle model */
  model: string;
  /** Model year */
  year: number;
  /** Category ID */
  categoryId: string;
  /** Category name (localized) */
  categoryName?: string;
  /** Branch ID */
  branchId: string;
  /** Branch name */
  branchName?: string;
  /** Transmission type */
  transmission: 'manual' | 'automatic';
  /** Fuel type */
  fuelType: string;
  /** Number of seats */
  seats: number;
  /** Number of doors */
  doors: number;
  /** Luggage capacity */
  luggageCapacity?: number;
  /** Vehicle features */
  features: string[];
  /** Primary photo URL */
  photoUrl?: string;
  /** All photos */
  photos?: { url: string; isPrimary?: boolean }[];
  /** Is available (always true for search results) */
  isAvailable: true;
  /** Daily rate (if pricing loaded) */
  dailyRate?: number;
  /** Currency */
  currency?: string;
}

// ============================================================================
// CALENDAR VIEW TYPES
// ============================================================================

/**
 * Single day availability data
 */
export interface DayAvailability {
  /** Date (YYYY-MM-DD) */
  date: string;
  /** Is the day fully available */
  isAvailable: boolean;
  /** Is the day partially available (some hours blocked) */
  isPartiallyAvailable: boolean;
  /** Bookings on this day */
  bookings: CalendarBooking[];
  /** Blocks on this day */
  blocks: CalendarBlock[];
  /** Total hours booked */
  bookedHours: number;
  /** Total hours blocked */
  blockedHours: number;
}

/**
 * Booking information for calendar view
 */
export interface CalendarBooking {
  /** Booking ID */
  id: string;
  /** Booking reference */
  reference: string;
  /** Vehicle ID */
  vehicleId: string;
  /** Vehicle name (make model) */
  vehicleName?: string;
  /** Pickup time */
  pickupAt: string;
  /** Return time */
  returnAt: string;
  /** Status */
  status: BookingStatus;
  /** Customer name */
  customerName?: string;
  /** Is pickup on this day */
  isPickup: boolean;
  /** Is return on this day */
  isReturn: boolean;
  /** Is all-day on this day (spans multiple days) */
  isAllDay: boolean;
}

/**
 * Block information for calendar view
 */
export interface CalendarBlock {
  /** Block ID */
  id: string;
  /** Vehicle ID */
  vehicleId: string;
  /** Block type */
  type: AvailabilityBlockType;
  /** Start time */
  startAt: string;
  /** End time */
  endAt: string;
  /** Reason/notes */
  reason?: string;
  /** Is all-day block */
  isAllDay: boolean;
}

/**
 * Full calendar data for a date range
 */
export interface CalendarData {
  /** Vehicle info (if single vehicle) */
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
  };
  /** Date range queried */
  dateRange: DateRange;
  /** Day-by-day availability */
  days: DayAvailability[];
  /** Summary statistics */
  stats: CalendarStats;
}

/**
 * Calendar statistics
 */
export interface CalendarStats {
  /** Total days in range */
  totalDays: number;
  /** Days with at least one booking */
  bookedDays: number;
  /** Days with blocks */
  blockedDays: number;
  /** Days fully available */
  availableDays: number;
  /** Utilization percentage (0-100) */
  utilizationPercent: number;
}

// ============================================================================
// AVAILABILITY BLOCK TYPES
// ============================================================================

/**
 * Manual availability block (from database)
 */
export interface AvailabilityBlock {
  id: string;
  tenantId: string;
  vehicleId: string;
  blockType: AvailabilityBlockType;
  startAt: string;
  endAt: string;
  reason?: string;
  notes?: string;
  createdBy?: string;
  recurrence?: RecurrencePattern;
  recurrenceEndDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Insert type for availability block
 */
export type AvailabilityBlockInsert = Omit<
  AvailabilityBlock,
  'id' | 'createdAt' | 'updatedAt'
> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Update type for availability block
 */
export type AvailabilityBlockUpdate = Partial<AvailabilityBlockInsert>;

// ============================================================================
// BUFFER TIME TYPES
// ============================================================================

/**
 * Buffer time settings
 */
export interface BufferTimeSettings {
  /** Global buffer time in minutes (from tenant settings) */
  globalBufferMinutes: number;
  /** Category-specific buffer time overrides */
  categoryOverrides: CategoryBufferTime[];
  /** Vehicle-specific buffer time overrides */
  vehicleOverrides: VehicleBufferTime[];
}

/**
 * Category buffer time override
 */
export interface CategoryBufferTime {
  categoryId: string;
  categoryName?: string;
  bufferMinutes: number;
}

/**
 * Vehicle buffer time override
 */
export interface VehicleBufferTime {
  vehicleId: string;
  vehicleName?: string;
  bufferMinutes: number;
}

/**
 * Effective buffer time for a specific vehicle
 */
export interface EffectiveBufferTime {
  vehicleId: string;
  bufferMinutes: number;
  source: 'global' | 'category' | 'vehicle';
  /** The ID of the source (category or vehicle ID, null for global) */
  sourceId?: string;
}

// ============================================================================
// ONE-WAY RENTAL TYPES
// ============================================================================

/**
 * One-way rental availability check
 */
export interface OneWayAvailability {
  /** Is one-way rental available */
  isAvailable: boolean;
  /** Pickup branch ID */
  pickupBranchId: string;
  /** Pickup branch name */
  pickupBranchName?: string;
  /** Return branch ID */
  returnBranchId: string;
  /** Return branch name */
  returnBranchName?: string;
  /** One-way fee amount */
  oneWayFee?: number;
  /** Currency for fee */
  currency?: string;
  /** Reason if unavailable */
  unavailableReason?: string;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Date/time validation (ISO 8601)
 */
export const dateTimeSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid date/time format. Use ISO 8601 format.' }
);

/**
 * Date-only validation (YYYY-MM-DD)
 */
export const dateOnlySchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Invalid date format. Use YYYY-MM-DD.'
);

/**
 * Availability block type schema
 */
export const availabilityBlockTypeSchema = z.enum([
  'maintenance',
  'reserved',
  'out_of_service',
  'inspection',
  'damage_repair',
  'cleaning',
  'other',
]);

/**
 * Recurrence pattern schema
 */
export const recurrencePatternSchema = z.enum(['none', 'daily', 'weekly', 'monthly']);

/**
 * Availability query input schema
 */
export const availabilityQuerySchema = z.object({
  vehicleId: z.string().uuid('Invalid vehicle ID'),
  pickupAt: dateTimeSchema,
  returnAt: dateTimeSchema,
  pickupBranchId: z.string().uuid('Invalid pickup branch ID').optional(),
  returnBranchId: z.string().uuid('Invalid return branch ID').optional(),
  excludeBookingId: z.string().uuid('Invalid booking ID').optional(),
}).refine(
  (data) => new Date(data.pickupAt) < new Date(data.returnAt),
  { message: 'Return time must be after pickup time', path: ['returnAt'] }
);

/**
 * Availability search input schema
 */
export const availabilitySearchSchema = z.object({
  tenantId: z.string().uuid('Invalid tenant ID'),
  pickupAt: dateTimeSchema,
  returnAt: dateTimeSchema,
  pickupBranchId: z.string().uuid('Invalid pickup branch ID'),
  returnBranchId: z.string().uuid('Invalid return branch ID').optional(),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  transmission: z.enum(['manual', 'automatic']).optional(),
  fuelType: z.string().optional(),
  minSeats: z.number().int().min(1).optional(),
  minDoors: z.number().int().min(1).optional(),
  features: z.array(z.string()).optional(),
}).refine(
  (data) => new Date(data.pickupAt) < new Date(data.returnAt),
  { message: 'Return time must be after pickup time', path: ['returnAt'] }
);

/**
 * Calendar query input schema
 */
export const calendarQuerySchema = z.object({
  vehicleId: z.string().uuid('Invalid vehicle ID').optional(),
  branchId: z.string().uuid('Invalid branch ID').optional(),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  startDate: dateOnlySchema,
  endDate: dateOnlySchema,
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  { message: 'End date must be on or after start date', path: ['endDate'] }
);

/**
 * Create availability block schema
 */
export const createAvailabilityBlockSchema = z.object({
  vehicleId: z.string().uuid('Invalid vehicle ID'),
  blockType: availabilityBlockTypeSchema,
  startAt: dateTimeSchema,
  endAt: dateTimeSchema,
  reason: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  recurrence: recurrencePatternSchema.optional().default('none'),
  recurrenceEndDate: dateOnlySchema.optional(),
  isActive: z.boolean().optional().default(true),
}).refine(
  (data) => new Date(data.startAt) < new Date(data.endAt),
  { message: 'End time must be after start time', path: ['endAt'] }
).refine(
  (data) => {
    if (data.recurrence !== 'none' && !data.recurrenceEndDate) {
      return false;
    }
    return true;
  },
  { message: 'Recurrence end date is required for recurring blocks', path: ['recurrenceEndDate'] }
);

export type CreateAvailabilityBlockInput = z.infer<typeof createAvailabilityBlockSchema>;

/**
 * Update availability block schema
 */
export const updateAvailabilityBlockSchema = createAvailabilityBlockSchema.partial();

export type UpdateAvailabilityBlockInput = z.infer<typeof updateAvailabilityBlockSchema>;

/**
 * Buffer time settings schema
 */
export const bufferTimeSettingsSchema = z.object({
  globalBufferMinutes: z.number().int().min(0).max(1440), // Max 24 hours
  categoryOverrides: z.array(z.object({
    categoryId: z.string().uuid(),
    bufferMinutes: z.number().int().min(0).max(1440),
  })),
  vehicleOverrides: z.array(z.object({
    vehicleId: z.string().uuid(),
    bufferMinutes: z.number().int().min(0).max(1440),
  })),
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if two date ranges overlap
 */
export function dateRangesOverlap(
  range1Start: Date | string,
  range1End: Date | string,
  range2Start: Date | string,
  range2End: Date | string
): boolean {
  const start1 = new Date(range1Start);
  const end1 = new Date(range1End);
  const start2 = new Date(range2Start);
  const end2 = new Date(range2End);

  return start1 < end2 && end1 > start2;
}

/**
 * Check if a date falls within a range
 */
export function isDateInRange(
  date: Date | string,
  rangeStart: Date | string,
  rangeEnd: Date | string
): boolean {
  const d = new Date(date);
  const start = new Date(rangeStart);
  const end = new Date(rangeEnd);

  return d >= start && d <= end;
}

/**
 * Calculate duration between two dates in hours
 */
export function getDurationHours(
  startAt: Date | string,
  endAt: Date | string
): number {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const diffMs = end.getTime() - start.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Calculate duration between two dates in days (rounded up)
 */
export function getDurationDays(
  startAt: Date | string,
  endAt: Date | string
): number {
  const hours = getDurationHours(startAt, endAt);
  return Math.ceil(hours / 24);
}

/**
 * Add buffer time to a date
 */
export function addBufferTime(date: Date | string, bufferMinutes: number): Date {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + bufferMinutes);
  return d;
}

/**
 * Subtract buffer time from a date
 */
export function subtractBufferTime(date: Date | string, bufferMinutes: number): Date {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - bufferMinutes);
  return d;
}

/**
 * Get the effective buffer time for a vehicle
 * Priority: Vehicle override > Category override > Global setting
 */
export function getEffectiveBufferTime(
  vehicleId: string,
  categoryId: string,
  settings: BufferTimeSettings
): EffectiveBufferTime {
  // Check for vehicle-specific override
  const vehicleOverride = settings.vehicleOverrides.find(
    (v) => v.vehicleId === vehicleId
  );
  if (vehicleOverride) {
    return {
      vehicleId,
      bufferMinutes: vehicleOverride.bufferMinutes,
      source: 'vehicle',
      sourceId: vehicleId,
    };
  }

  // Check for category-specific override
  const categoryOverride = settings.categoryOverrides.find(
    (c) => c.categoryId === categoryId
  );
  if (categoryOverride) {
    return {
      vehicleId,
      bufferMinutes: categoryOverride.bufferMinutes,
      source: 'category',
      sourceId: categoryId,
    };
  }

  // Use global setting
  return {
    vehicleId,
    bufferMinutes: settings.globalBufferMinutes,
    source: 'global',
  };
}

/**
 * Check if a rental is one-way (different pickup and return branches)
 */
export function isOneWayRental(pickupBranchId: string, returnBranchId?: string): boolean {
  return !!returnBranchId && pickupBranchId !== returnBranchId;
}

/**
 * Get dates between two dates (inclusive)
 */
export function getDatesBetween(
  startDate: Date | string,
  endDate: Date | string
): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Format an availability block type for display
 */
export function formatBlockType(type: AvailabilityBlockType): string {
  const labels: Record<AvailabilityBlockType, string> = {
    maintenance: 'Maintenance',
    reserved: 'Reserved',
    out_of_service: 'Out of Service',
    inspection: 'Inspection',
    damage_repair: 'Damage Repair',
    cleaning: 'Cleaning',
    other: 'Other',
  };
  return labels[type] || type;
}

/**
 * Format an unavailability reason for display
 */
export function formatUnavailabilityReason(reason: UnavailabilityReason): string {
  const labels: Record<UnavailabilityReason, string> = {
    booking_conflict: 'Already booked during this period',
    buffer_time: 'Buffer time between bookings',
    maintenance: 'Scheduled for maintenance',
    reserved: 'Reserved',
    out_of_service: 'Currently out of service',
    branch_closed: 'Branch is closed',
    vehicle_status: 'Vehicle is not available',
    one_way_conflict: 'One-way rental conflict',
  };
  return labels[reason] || reason;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default buffer time in minutes (1 hour)
 */
export const DEFAULT_BUFFER_MINUTES = 60;

/**
 * Minimum rental duration in hours
 */
export const MIN_RENTAL_HOURS = 1;

/**
 * Maximum advance booking days
 */
export const MAX_ADVANCE_BOOKING_DAYS = 365;

/**
 * Availability block type options for forms
 */
export const AVAILABILITY_BLOCK_TYPE_OPTIONS = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'out_of_service', label: 'Out of Service' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'damage_repair', label: 'Damage Repair' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'other', label: 'Other' },
] as const;

/**
 * Recurrence pattern options for forms
 */
export const RECURRENCE_PATTERN_OPTIONS = [
  { value: 'none', label: 'No Recurrence' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
] as const;

/**
 * Booking statuses that affect availability
 */
export const BLOCKING_BOOKING_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'active',
];

/**
 * Vehicle statuses that are considered available
 */
export const AVAILABLE_VEHICLE_STATUSES: VehicleStatus[] = ['available'];
