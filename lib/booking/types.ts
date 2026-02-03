/**
 * Booking Types & Interfaces
 *
 * Type definitions and Zod schemas for the booking engine.
 * Handles booking creation, modification, cancellation, and payment processing.
 */

import { z } from 'zod';
import type {
  BookingStatus,
  BookingPricing,
  DriverInfo,
  DriverLicense,
  RateType,
  PriceType,
  DiscountType,
  LocalizedString,
} from '@/lib/supabase/types';

// Re-export types from supabase for convenience
export type { BookingStatus, BookingPricing, DriverInfo, DriverLicense };

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/**
 * All possible booking statuses
 */
export const BOOKING_STATUSES: readonly BookingStatus[] = [
  'pending',
  'confirmed',
  'active',
  'completed',
  'cancelled',
];

/**
 * Statuses that indicate an active/upcoming booking
 */
export const ACTIVE_BOOKING_STATUSES: readonly BookingStatus[] = [
  'pending',
  'confirmed',
  'active',
];

/**
 * Statuses that allow modification
 */
export const MODIFIABLE_STATUSES: readonly BookingStatus[] = [
  'pending',
  'confirmed',
];

/**
 * Statuses that allow cancellation
 */
export const CANCELLABLE_STATUSES: readonly BookingStatus[] = [
  'pending',
  'confirmed',
];

/**
 * Statuses that block vehicle availability
 */
export const BLOCKING_STATUSES: readonly BookingStatus[] = [
  'pending',
  'confirmed',
  'active',
];

/**
 * Payment status for bookings
 */
export type PaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'paid'
  | 'partially_refunded'
  | 'refunded'
  | 'failed';

/**
 * Booking source (how the booking was created)
 */
export type BookingSource =
  | 'website' // Online booking by customer
  | 'admin' // Created by staff in admin panel
  | 'phone' // Phone booking entered by staff
  | 'walkin' // Walk-in customer at branch
  | 'api'; // External API integration

/**
 * Cancellation reason categories
 */
export type CancellationReasonType =
  | 'customer_request'
  | 'vehicle_unavailable'
  | 'payment_failed'
  | 'no_show'
  | 'force_majeure'
  | 'other';

// ============================================================================
// BOOKING DATA TYPES
// ============================================================================

/**
 * Booking data from database (mapped to camelCase)
 */
export interface BookingData {
  id: string;
  tenantId: string;
  reference: string;
  customerId: string;
  vehicleId: string;
  pickupBranchId: string;
  returnBranchId: string;
  pickupAt: string;
  returnAt: string;
  status: BookingStatus;
  pricing: BookingPricing;
  couponId: string | null;
  driverInfo: DriverInfo;
  notes: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  stripePaymentIntentId: string | null;
  stripeCheckoutSessionId: string | null;
  stripeRefundId: string | null;
  refundAmount: number | null;
  refundStatus: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Booking with related data (vehicle, customer, branches, addons)
 */
export interface BookingWithRelations extends BookingData {
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    transmission: 'manual' | 'automatic';
    fuelType: string;
    seats: number;
    photoUrl?: string;
    category?: {
      id: string;
      name: LocalizedString;
    };
  };
  customer?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  };
  pickupBranch?: {
    id: string;
    name: string;
    address: string;
    city: string;
    phone: string | null;
  };
  returnBranch?: {
    id: string;
    name: string;
    address: string;
    city: string;
    phone: string | null;
  };
  addons?: BookingAddonData[];
  coupon?: {
    id: string;
    code: string;
    discountType: DiscountType;
    discountValue: number;
  };
}

/**
 * Booking addon data from database
 */
export interface BookingAddonData {
  id: string;
  bookingId: string;
  addonId: string;
  quantity: number;
  unitPrice: number;
  priceType: PriceType;
  totalPrice: number;
  createdAt: string;
  /** Addon details (when joined) */
  addon?: {
    id: string;
    name: LocalizedString;
    description: LocalizedString;
    imageUrl: string | null;
  };
}

/**
 * Booking summary for lists and cards
 */
export interface BookingSummary {
  id: string;
  reference: string;
  vehicleName: string;
  vehiclePhoto?: string;
  pickupBranch: string;
  returnBranch: string;
  pickupAt: string;
  returnAt: string;
  status: BookingStatus;
  total: number;
  currency: string;
  customerName?: string;
  customerEmail?: string;
  isOneWay: boolean;
  durationDays: number;
}

// ============================================================================
// BOOKING CREATION TYPES
// ============================================================================

/**
 * Input for creating a new booking
 */
export interface CreateBookingInput {
  vehicleId: string;
  pickupBranchId: string;
  returnBranchId: string;
  pickupAt: string;
  returnAt: string;
  driverInfo: DriverInfo;
  addons?: { addonId: string; quantity: number }[];
  couponCode?: string;
  notes?: string;
  source?: BookingSource;
}

/**
 * Input for creating a booking as staff (includes customer selection)
 */
export interface CreateStaffBookingInput extends CreateBookingInput {
  customerId?: string;
  customerEmail?: string;
  skipPayment?: boolean;
}

/**
 * Input for updating an existing booking
 */
export interface UpdateBookingInput {
  pickupAt?: string;
  returnAt?: string;
  pickupBranchId?: string;
  returnBranchId?: string;
  addons?: { addonId: string; quantity: number }[];
  driverInfo?: DriverInfo;
  notes?: string;
  status?: BookingStatus;
}

/**
 * Result of creating a booking
 */
export interface CreateBookingResult {
  success: boolean;
  bookingId?: string;
  reference?: string;
  checkoutUrl?: string;
  error?: string;
  errorCode?: BookingErrorCode;
}

// ============================================================================
// BOOKING SEARCH & FILTER TYPES
// ============================================================================

/**
 * Search parameters for available vehicles
 */
export interface VehicleSearchInput {
  pickupBranchId: string;
  returnBranchId?: string;
  pickupAt: string;
  returnAt: string;
  categoryId?: string;
  transmission?: 'manual' | 'automatic';
  fuelType?: string;
  minSeats?: number;
  features?: string[];
}

/**
 * Vehicle search result with pricing
 */
export interface VehicleSearchResult {
  vehicleId: string;
  make: string;
  model: string;
  year: number;
  categoryId: string;
  categoryName: string;
  transmission: 'manual' | 'automatic';
  fuelType: string;
  seats: number;
  doors: number;
  luggageCapacity: number | null;
  features: string[];
  photoUrl?: string;
  photos?: { url: string; isPrimary?: boolean }[];
  dailyRate: number;
  totalPrice: number;
  currency: string;
  hasSeasonalPricing: boolean;
  isAvailable: true;
}

/**
 * Booking list filter options
 */
export interface BookingListFilters {
  status?: BookingStatus | BookingStatus[];
  customerId?: string;
  vehicleId?: string;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  source?: BookingSource;
  sortBy?: BookingSortField;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * Fields available for sorting bookings
 */
export type BookingSortField =
  | 'created_at'
  | 'pickup_at'
  | 'return_at'
  | 'reference'
  | 'status'
  | 'total';

/**
 * Paginated booking list result
 */
export interface BookingListResult {
  bookings: BookingSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

// ============================================================================
// BOOKING FLOW TYPES (Multi-step form)
// ============================================================================

/**
 * Step 1: Vehicle and dates selection
 */
export interface BookingStep1Data {
  vehicleId: string;
  pickupBranchId: string;
  returnBranchId: string;
  pickupAt: string;
  returnAt: string;
}

/**
 * Step 2: Add-ons selection
 */
export interface BookingStep2Data {
  addons: { addonId: string; quantity: number }[];
}

/**
 * Step 3: Driver information
 */
export interface BookingStep3Data {
  driverInfo: DriverInfo;
}

/**
 * Step 4: Review and coupon
 */
export interface BookingStep4Data {
  couponCode?: string;
  acceptTerms: boolean;
  notes?: string;
}

/**
 * Complete booking form data (all steps combined)
 */
export interface BookingFormData
  extends BookingStep1Data,
    BookingStep2Data,
    BookingStep3Data,
    BookingStep4Data {}

/**
 * Current booking flow state
 */
export interface BookingFlowState {
  currentStep: 1 | 2 | 3 | 4;
  data: Partial<BookingFormData>;
  pricing: BookingPricing | null;
  vehicle: VehicleSearchResult | null;
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// CANCELLATION & REFUND TYPES
// ============================================================================

/**
 * Cancellation policy configuration
 */
export interface CancellationPolicy {
  /** Hours before pickup for free cancellation */
  freeCancellationHours: number;
  /** Hours before pickup for partial refund */
  partialRefundHours: number;
  /** Partial refund percentage (0-100) */
  partialRefundPercent: number;
  /** Whether cancellation is allowed at all */
  allowCancellation: boolean;
}

/**
 * Refund calculation result
 */
export interface RefundCalculation {
  /** Original booking total */
  originalAmount: number;
  /** Refund amount */
  refundAmount: number;
  /** Refund percentage */
  refundPercent: number;
  /** Retained amount (fees) */
  retainedAmount: number;
  /** Cancellation fee applied */
  cancellationFee: number;
  /** Is eligible for any refund */
  isEligible: boolean;
  /** Refund policy tier applied */
  policyTier: 'full' | 'partial' | 'none';
  /** Hours until pickup */
  hoursUntilPickup: number;
  /** Currency */
  currency: string;
}

/**
 * Cancellation request input
 */
export interface CancellationInput {
  bookingId: string;
  reason: string;
  reasonType: CancellationReasonType;
  requestRefund: boolean;
}

/**
 * Cancellation result
 */
export interface CancellationResult {
  success: boolean;
  bookingId: string;
  refund?: RefundCalculation;
  stripeRefundId?: string;
  error?: string;
}

// ============================================================================
// MODIFICATION TYPES
// ============================================================================

/**
 * Booking modification request
 */
export interface ModificationInput {
  bookingId: string;
  pickupAt?: string;
  returnAt?: string;
  pickupBranchId?: string;
  returnBranchId?: string;
  addons?: { addonId: string; quantity: number }[];
}

/**
 * Modification price difference calculation
 */
export interface ModificationPricing {
  /** Original booking pricing */
  originalPricing: BookingPricing;
  /** New pricing after modification */
  newPricing: BookingPricing;
  /** Price difference (positive = customer owes more) */
  priceDifference: number;
  /** Whether additional payment is required */
  requiresPayment: boolean;
  /** Whether a refund is due */
  requiresRefund: boolean;
  /** Currency */
  currency: string;
}

/**
 * Modification result
 */
export interface ModificationResult {
  success: boolean;
  bookingId: string;
  pricing?: ModificationPricing;
  checkoutUrl?: string;
  error?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Booking error codes for programmatic handling
 */
export type BookingErrorCode =
  | 'vehicle_unavailable'
  | 'invalid_dates'
  | 'past_pickup_date'
  | 'min_duration_not_met'
  | 'max_duration_exceeded'
  | 'branch_closed'
  | 'invalid_coupon'
  | 'payment_required'
  | 'payment_failed'
  | 'not_cancellable'
  | 'not_modifiable'
  | 'booking_not_found'
  | 'unauthorized'
  | 'validation_error'
  | 'server_error';

/**
 * Booking error with details
 */
export interface BookingError {
  code: BookingErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// REFERENCE NUMBER TYPES
// ============================================================================

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Booking status schema
 */
export const bookingStatusSchema = z.enum([
  'pending',
  'confirmed',
  'active',
  'completed',
  'cancelled',
]);

/**
 * Payment status schema
 */
export const paymentStatusSchema = z.enum([
  'unpaid',
  'pending',
  'paid',
  'partially_refunded',
  'refunded',
  'failed',
]);

/**
 * Booking source schema
 */
export const bookingSourceSchema = z.enum([
  'website',
  'admin',
  'phone',
  'walkin',
  'api',
]);

/**
 * Cancellation reason type schema
 */
export const cancellationReasonTypeSchema = z.enum([
  'customer_request',
  'vehicle_unavailable',
  'payment_failed',
  'no_show',
  'force_majeure',
  'other',
]);

/**
 * Date/time validation schema
 */
export const dateTimeSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid date/time format. Use ISO 8601 format.' }
);

/**
 * Future date/time validation schema
 */
export const futureDateTimeSchema = dateTimeSchema.refine(
  (val) => new Date(val) > new Date(),
  { message: 'Date must be in the future.' }
);

/**
 * Phone number schema
 */
export const phoneSchema = z
  .string()
  .min(7, 'Phone number is too short')
  .max(20, 'Phone number is too long')
  .regex(
    /^[+]?[\d\s\-().]+$/,
    'Invalid phone number format'
  );

/**
 * Driver license schema
 */
export const driverLicenseSchema = z.object({
  number: z.string().min(1, 'License number is required').optional(),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
    .optional(),
  country: z.string().optional(),
});

/**
 * Driver info schema
 */
export const driverInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: phoneSchema,
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
    .optional(),
  driverLicense: driverLicenseSchema.optional(),
});

export type DriverInfoSchema = z.infer<typeof driverInfoSchema>;

/**
 * Addon selection schema
 */
export const addonSelectionSchema = z.object({
  addonId: z.string().uuid('Invalid addon ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

/**
 * Create booking input schema
 */
export const createBookingSchema = z.object({
  vehicleId: z.string().uuid('Invalid vehicle ID'),
  pickupBranchId: z.string().uuid('Invalid pickup branch ID'),
  returnBranchId: z.string().uuid('Invalid return branch ID'),
  pickupAt: dateTimeSchema,
  returnAt: dateTimeSchema,
  driverInfo: driverInfoSchema,
  addons: z.array(addonSelectionSchema).optional().default([]),
  couponCode: z.string().optional(),
  notes: z.string().max(1000).optional(),
  source: bookingSourceSchema.optional().default('website'),
}).refine(
  (data) => new Date(data.pickupAt) < new Date(data.returnAt),
  { message: 'Return time must be after pickup time', path: ['returnAt'] }
).refine(
  (data) => {
    const pickup = new Date(data.pickupAt);
    const now = new Date();
    // Allow booking with at least 1 hour notice
    return pickup.getTime() > now.getTime() + 60 * 60 * 1000;
  },
  { message: 'Pickup time must be at least 1 hour from now', path: ['pickupAt'] }
);

export type CreateBookingSchema = z.infer<typeof createBookingSchema>;

/**
 * Create staff booking input schema (extends create booking)
 */
export const createStaffBookingSchema = createBookingSchema.extend({
  customerId: z.string().uuid('Invalid customer ID').optional(),
  customerEmail: z.string().email('Invalid email').optional(),
  skipPayment: z.boolean().optional().default(false),
}).refine(
  (data) => data.customerId || data.customerEmail,
  { message: 'Either customerId or customerEmail is required' }
);

export type CreateStaffBookingSchema = z.infer<typeof createStaffBookingSchema>;

/**
 * Update booking input schema
 */
export const updateBookingSchema = z.object({
  pickupAt: dateTimeSchema.optional(),
  returnAt: dateTimeSchema.optional(),
  pickupBranchId: z.string().uuid('Invalid pickup branch ID').optional(),
  returnBranchId: z.string().uuid('Invalid return branch ID').optional(),
  addons: z.array(addonSelectionSchema).optional(),
  driverInfo: driverInfoSchema.partial().optional(),
  notes: z.string().max(1000).optional(),
  status: bookingStatusSchema.optional(),
}).refine(
  (data) => {
    if (data.pickupAt && data.returnAt) {
      return new Date(data.pickupAt) < new Date(data.returnAt);
    }
    return true;
  },
  { message: 'Return time must be after pickup time', path: ['returnAt'] }
);

export type UpdateBookingSchema = z.infer<typeof updateBookingSchema>;

/**
 * Vehicle search input schema
 */
export const vehicleSearchSchema = z.object({
  pickupBranchId: z.string().uuid('Invalid pickup branch ID'),
  returnBranchId: z.string().uuid('Invalid return branch ID').optional(),
  pickupAt: dateTimeSchema,
  returnAt: dateTimeSchema,
  categoryId: z.string().uuid('Invalid category ID').optional(),
  transmission: z.enum(['manual', 'automatic']).optional(),
  fuelType: z.string().optional(),
  minSeats: z.number().int().min(1).optional(),
  features: z.array(z.string()).optional(),
}).refine(
  (data) => new Date(data.pickupAt) < new Date(data.returnAt),
  { message: 'Return time must be after pickup time', path: ['returnAt'] }
);

export type VehicleSearchSchema = z.infer<typeof vehicleSearchSchema>;

/**
 * Booking list filters schema
 */
export const bookingListFiltersSchema = z.object({
  status: z.union([
    bookingStatusSchema,
    z.array(bookingStatusSchema),
  ]).optional(),
  customerId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  source: bookingSourceSchema.optional(),
  sortBy: z.enum([
    'created_at',
    'pickup_at',
    'return_at',
    'reference',
    'status',
    'total',
  ]).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(100).optional().default(20),
});

export type BookingListFiltersSchema = z.infer<typeof bookingListFiltersSchema>;

/**
 * Cancellation input schema
 */
export const cancellationSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  reason: z.string().min(1, 'Reason is required').max(500),
  reasonType: cancellationReasonTypeSchema,
  requestRefund: z.boolean(),
});

export type CancellationSchema = z.infer<typeof cancellationSchema>;

/**
 * Modification input schema
 */
export const modificationSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  pickupAt: dateTimeSchema.optional(),
  returnAt: dateTimeSchema.optional(),
  pickupBranchId: z.string().uuid('Invalid pickup branch ID').optional(),
  returnBranchId: z.string().uuid('Invalid return branch ID').optional(),
  addons: z.array(addonSelectionSchema).optional(),
}).refine(
  (data) => {
    if (data.pickupAt && data.returnAt) {
      return new Date(data.pickupAt) < new Date(data.returnAt);
    }
    return true;
  },
  { message: 'Return time must be after pickup time', path: ['returnAt'] }
);

export type ModificationSchema = z.infer<typeof modificationSchema>;

/**
 * Booking step 1 schema (vehicle & dates)
 */
export const bookingStep1Schema = z.object({
  vehicleId: z.string().uuid('Please select a vehicle'),
  pickupBranchId: z.string().uuid('Please select a pickup location'),
  returnBranchId: z.string().uuid('Please select a return location'),
  pickupAt: dateTimeSchema,
  returnAt: dateTimeSchema,
}).refine(
  (data) => new Date(data.pickupAt) < new Date(data.returnAt),
  { message: 'Return time must be after pickup time', path: ['returnAt'] }
);

export type BookingStep1Schema = z.infer<typeof bookingStep1Schema>;

/**
 * Booking step 2 schema (addons)
 */
export const bookingStep2Schema = z.object({
  addons: z.array(addonSelectionSchema).default([]),
});

export type BookingStep2Schema = z.infer<typeof bookingStep2Schema>;

/**
 * Booking step 3 schema (driver info)
 */
export const bookingStep3Schema = z.object({
  driverInfo: driverInfoSchema,
});

export type BookingStep3Schema = z.infer<typeof bookingStep3Schema>;

/**
 * Booking step 4 schema (review & confirm)
 */
export const bookingStep4Schema = z.object({
  couponCode: z.string().optional(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions' }),
  }),
  notes: z.string().max(1000).optional(),
});

export type BookingStep4Schema = z.infer<typeof bookingStep4Schema>;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a booking can be cancelled
 */
export function isBookingCancellable(status: BookingStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}

/**
 * Check if a booking can be modified
 */
export function isBookingModifiable(status: BookingStatus): boolean {
  return MODIFIABLE_STATUSES.includes(status);
}

/**
 * Check if a booking is active (blocks availability)
 */
export function isBookingBlocking(status: BookingStatus): boolean {
  return BLOCKING_STATUSES.includes(status);
}

/**
 * Check if a booking is upcoming (not yet started)
 */
export function isBookingUpcoming(booking: { pickupAt: string; status: BookingStatus }): boolean {
  if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
    return false;
  }
  return new Date(booking.pickupAt) > new Date();
}

/**
 * Check if a booking is in progress
 */
export function isBookingInProgress(booking: { pickupAt: string; returnAt: string; status: BookingStatus }): boolean {
  if (booking.status !== 'active') {
    return false;
  }
  const now = new Date();
  return new Date(booking.pickupAt) <= now && new Date(booking.returnAt) > now;
}

/**
 * Get hours until pickup
 */
export function getHoursUntilPickup(pickupAt: string): number {
  const pickup = new Date(pickupAt);
  const now = new Date();
  const diffMs = pickup.getTime() - now.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60));
}

/**
 * Calculate rental duration in days (rounded up)
 */
export function calculateDurationDays(pickupAt: string, returnAt: string): number {
  const pickup = new Date(pickupAt);
  const returnDate = new Date(returnAt);
  const diffMs = returnDate.getTime() - pickup.getTime();
  const hours = diffMs / (1000 * 60 * 60);
  return Math.ceil(hours / 24);
}

/**
 * Check if it's a one-way rental
 */
export function isOneWayRental(pickupBranchId: string, returnBranchId: string): boolean {
  return pickupBranchId !== returnBranchId;
}

/**
 * Format booking status for display
 */
export function formatBookingStatus(status: BookingStatus): string {
  const labels: Record<BookingStatus, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    active: 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

/**
 * Get status color class for UI
 */
export function getStatusColorClass(status: BookingStatus): string {
  const colors: Record<BookingStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Format booking source for display
 */
export function formatBookingSource(source: BookingSource): string {
  const labels: Record<BookingSource, string> = {
    website: 'Website',
    admin: 'Admin',
    phone: 'Phone',
    walkin: 'Walk-in',
    api: 'API',
  };
  return labels[source] || source;
}

/**
 * Calculate refund amount based on cancellation policy
 */
export function calculateRefund(
  booking: { pickupAt: string; pricing: BookingPricing },
  policy: CancellationPolicy
): RefundCalculation {
  const hoursUntilPickup = getHoursUntilPickup(booking.pickupAt);
  const originalAmount = booking.pricing.total;
  const currency = booking.pricing.currency;

  let refundPercent: number;
  let policyTier: 'full' | 'partial' | 'none';

  if (!policy.allowCancellation) {
    refundPercent = 0;
    policyTier = 'none';
  } else if (hoursUntilPickup >= policy.freeCancellationHours) {
    refundPercent = 100;
    policyTier = 'full';
  } else if (hoursUntilPickup >= policy.partialRefundHours) {
    refundPercent = policy.partialRefundPercent;
    policyTier = 'partial';
  } else {
    refundPercent = 0;
    policyTier = 'none';
  }

  const refundAmount = Math.round((originalAmount * refundPercent) / 100 * 100) / 100;
  const retainedAmount = originalAmount - refundAmount;
  const cancellationFee = policyTier === 'partial' ? retainedAmount : 0;

  return {
    originalAmount,
    refundAmount,
    refundPercent,
    retainedAmount,
    cancellationFee,
    isEligible: refundPercent > 0,
    policyTier,
    hoursUntilPickup: Math.round(hoursUntilPickup * 10) / 10,
    currency,
  };
}

/**
 * Validate booking dates
 */
export function validateBookingDates(
  pickupAt: string,
  returnAt: string,
  options: {
    minHoursNotice?: number;
    minDurationHours?: number;
    maxDurationDays?: number;
  } = {}
): { valid: boolean; error?: string } {
  const {
    minHoursNotice = 1,
    minDurationHours = 1,
    maxDurationDays = 365,
  } = options;

  const pickup = new Date(pickupAt);
  const returnDate = new Date(returnAt);
  const now = new Date();

  // Check if pickup is in the future
  const hoursUntilPickup = (pickup.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilPickup < minHoursNotice) {
    return {
      valid: false,
      error: `Pickup must be at least ${minHoursNotice} hour(s) from now`,
    };
  }

  // Check if return is after pickup
  if (returnDate <= pickup) {
    return { valid: false, error: 'Return time must be after pickup time' };
  }

  // Check minimum duration
  const durationHours = (returnDate.getTime() - pickup.getTime()) / (1000 * 60 * 60);
  if (durationHours < minDurationHours) {
    return {
      valid: false,
      error: `Minimum rental duration is ${minDurationHours} hour(s)`,
    };
  }

  // Check maximum duration
  const durationDays = durationHours / 24;
  if (durationDays > maxDurationDays) {
    return {
      valid: false,
      error: `Maximum rental duration is ${maxDurationDays} days`,
    };
  }

  return { valid: true };
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default cancellation policy
 */
export const DEFAULT_CANCELLATION_POLICY: CancellationPolicy = {
  freeCancellationHours: 48,
  partialRefundHours: 24,
  partialRefundPercent: 50,
  allowCancellation: true,
};

/**
 * Minimum rental hours
 */
export const MIN_RENTAL_HOURS = 1;

/**
 * Maximum rental days
 */
export const MAX_RENTAL_DAYS = 365;

/**
 * Minimum advance booking hours
 */
export const MIN_ADVANCE_BOOKING_HOURS = 1;

/**
 * Status options for forms/filters
 */
export const BOOKING_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

/**
 * Booking source options for forms/filters
 */
export const BOOKING_SOURCE_OPTIONS = [
  { value: 'website', label: 'Website' },
  { value: 'admin', label: 'Admin Panel' },
  { value: 'phone', label: 'Phone' },
  { value: 'walkin', label: 'Walk-in' },
  { value: 'api', label: 'API' },
] as const;

/**
 * Cancellation reason options for forms
 */
export const CANCELLATION_REASON_OPTIONS = [
  { value: 'customer_request', label: 'Customer Request' },
  { value: 'vehicle_unavailable', label: 'Vehicle Unavailable' },
  { value: 'payment_failed', label: 'Payment Failed' },
  { value: 'no_show', label: 'No Show' },
  { value: 'force_majeure', label: 'Force Majeure' },
  { value: 'other', label: 'Other' },
] as const;
