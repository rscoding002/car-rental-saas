/**
 * Pricing Types & Interfaces
 *
 * Type definitions and Zod schemas for the pricing engine.
 * Handles base rates, seasonal pricing, duration discounts, add-ons, and coupons.
 */

import { z } from 'zod';
import type {
  RateType,
  PriceType,
  DiscountType,
  CouponStatus,
  LocalizedString,
} from '@/lib/supabase/types';

// Re-export types from supabase for convenience
export type { RateType, PriceType, DiscountType, CouponStatus, LocalizedString };

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/**
 * Rate types for pricing rules
 */
export const RATE_TYPES: readonly RateType[] = ['hourly', 'daily', 'weekly', 'monthly'];

/**
 * Price types for add-ons
 */
export const PRICE_TYPES: readonly PriceType[] = ['per_day', 'per_rental', 'one_time'];

/**
 * Discount types for coupons
 */
export const DISCOUNT_TYPES: readonly DiscountType[] = ['percentage', 'fixed_amount', 'free_addon'];

/**
 * Rule status options
 */
export type RuleStatus = 'active' | 'inactive';

/**
 * Pricing rule scope
 */
export type PricingRuleScope = 'category' | 'vehicle';

// ============================================================================
// BASE RATE TYPES
// ============================================================================

/**
 * Pricing rule from database
 */
export interface PricingRuleData {
  id: string;
  tenantId: string;
  categoryId: string | null;
  vehicleId: string | null;
  rateType: RateType;
  amount: number;
  currency: string;
  minDuration: number | null;
  maxDuration: number | null;
  status: RuleStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Extended pricing rule with related data
 */
export interface PricingRuleWithRelations extends PricingRuleData {
  category?: {
    id: string;
    name: LocalizedString;
  };
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: number;
  };
}

/**
 * Input for creating a pricing rule
 */
export interface CreatePricingRuleInput {
  categoryId?: string;
  vehicleId?: string;
  rateType: RateType;
  amount: number;
  currency?: string;
  minDuration?: number;
  maxDuration?: number;
  status?: RuleStatus;
}

/**
 * Input for updating a pricing rule
 */
export type UpdatePricingRuleInput = Partial<CreatePricingRuleInput>;

/**
 * Effective rate for a vehicle/category
 */
export interface EffectiveRate {
  /** The rate amount */
  amount: number;
  /** Rate type (hourly, daily, etc.) */
  rateType: RateType;
  /** Currency code */
  currency: string;
  /** Source of the rate */
  source: 'vehicle' | 'category' | 'default';
  /** ID of the source (vehicle or category) */
  sourceId?: string;
  /** Pricing rule ID */
  ruleId?: string;
  /** Minimum duration requirement */
  minDuration?: number;
  /** Maximum duration limit */
  maxDuration?: number;
}

/**
 * All rates available for a vehicle
 */
export interface VehicleRates {
  /** Vehicle ID */
  vehicleId: string;
  /** Category ID */
  categoryId: string;
  /** Hourly rate (if available) */
  hourly?: EffectiveRate;
  /** Daily rate */
  daily: EffectiveRate;
  /** Weekly rate (if available) */
  weekly?: EffectiveRate;
  /** Monthly rate (if available) */
  monthly?: EffectiveRate;
  /** Currency for all rates */
  currency: string;
}

// ============================================================================
// SEASON TYPES
// ============================================================================

/**
 * Season data from database
 */
export interface SeasonData {
  id: string;
  tenantId: string;
  name: string;
  startDate: string;
  endDate: string;
  multiplier: number;
  priority: number;
  status: RuleStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a season
 */
export interface CreateSeasonInput {
  name: string;
  startDate: string;
  endDate: string;
  multiplier: number;
  priority?: number;
  status?: RuleStatus;
}

/**
 * Input for updating a season
 */
export type UpdateSeasonInput = Partial<CreateSeasonInput>;

/**
 * Active season affecting a date range
 */
export interface ActiveSeason {
  /** Season ID */
  id: string;
  /** Season name */
  name: string;
  /** Price multiplier (1.0 = no change, 1.5 = 50% increase) */
  multiplier: number;
  /** Days this season applies to */
  applicableDays: number;
  /** Start date of the season */
  startDate: string;
  /** End date of the season */
  endDate: string;
}

/**
 * Season overlap analysis
 */
export interface SeasonOverlap {
  /** Rental start date */
  rentalStart: string;
  /** Rental end date */
  rentalEnd: string;
  /** Total rental days */
  totalDays: number;
  /** Active seasons affecting this rental */
  seasons: ActiveSeason[];
  /** Weighted average multiplier */
  averageMultiplier: number;
  /** Additional amount from seasonal pricing */
  seasonalAmount: number;
}

// ============================================================================
// DURATION PRICING TYPES
// ============================================================================

/**
 * Duration-based rate discount
 */
export interface DurationDiscount {
  /** Minimum days for this discount */
  minDays: number;
  /** Maximum days (optional) */
  maxDays?: number;
  /** Discount percentage or flat rate */
  discountType: 'percentage' | 'flat_rate';
  /** Discount value (percentage or daily rate) */
  value: number;
  /** Label for display */
  label?: string;
}

/**
 * Duration tier for weekly/monthly rates
 */
export interface DurationTier {
  /** Rate type (weekly, monthly) */
  rateType: 'weekly' | 'monthly';
  /** Days included in this tier */
  days: number;
  /** Total rate for the tier */
  totalRate: number;
  /** Effective daily rate */
  effectiveDailyRate: number;
  /** Savings compared to daily rate */
  savings: number;
  /** Savings percentage */
  savingsPercent: number;
}

/**
 * Optimal duration pricing recommendation
 */
export interface OptimalDurationPricing {
  /** Requested rental days */
  requestedDays: number;
  /** Best rate type to use */
  bestRateType: RateType;
  /** Calculated total */
  total: number;
  /** Effective daily rate */
  effectiveDailyRate: number;
  /** Alternative options */
  alternatives: DurationTier[];
}

// ============================================================================
// ONE-WAY FEE TYPES
// ============================================================================

/**
 * One-way fee configuration
 */
export interface OneWayFeeConfig {
  /** Is one-way rental enabled */
  enabled: boolean;
  /** Fixed fee amount */
  fixedFee?: number;
  /** Per-kilometer fee */
  perKmFee?: number;
  /** Maximum fee cap */
  maxFee?: number;
  /** Currency */
  currency: string;
  /** Branches that allow one-way */
  allowedBranchPairs?: BranchPairFee[];
}

/**
 * Fee for a specific branch pair
 */
export interface BranchPairFee {
  /** Pickup branch ID */
  pickupBranchId: string;
  /** Pickup branch name */
  pickupBranchName?: string;
  /** Return branch ID */
  returnBranchId: string;
  /** Return branch name */
  returnBranchName?: string;
  /** Fixed fee for this pair */
  fee: number;
}

/**
 * Calculated one-way fee
 */
export interface OneWayFeeResult {
  /** Is one-way rental */
  isOneWay: boolean;
  /** Fee amount */
  fee: number;
  /** Currency */
  currency: string;
  /** Distance in km (if distance-based) */
  distanceKm?: number;
  /** Fee breakdown */
  breakdown?: {
    fixedFee: number;
    distanceFee: number;
  };
}

// ============================================================================
// ADD-ON TYPES
// ============================================================================

/**
 * Add-on from database
 */
export interface AddonData {
  id: string;
  tenantId: string;
  name: LocalizedString;
  description: LocalizedString;
  price: number;
  priceType: PriceType;
  maxQuantity: number;
  imageUrl: string | null;
  sortOrder: number;
  status: RuleStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating an add-on
 */
export interface CreateAddonInput {
  name: LocalizedString;
  description?: LocalizedString;
  price: number;
  priceType: PriceType;
  maxQuantity?: number;
  imageUrl?: string;
  sortOrder?: number;
  status?: RuleStatus;
}

/**
 * Input for updating an add-on
 */
export type UpdateAddonInput = Partial<CreateAddonInput>;

/**
 * Selected add-on for a booking
 */
export interface SelectedAddon {
  /** Add-on ID */
  addonId: string;
  /** Add-on name (localized) */
  name: string;
  /** Quantity selected */
  quantity: number;
  /** Unit price at time of booking */
  unitPrice: number;
  /** Price type */
  priceType: PriceType;
  /** Total price for this add-on */
  totalPrice: number;
}

/**
 * Add-on pricing calculation input
 */
export interface AddonCalculationInput {
  /** Add-on selections */
  addons: { addonId: string; quantity: number }[];
  /** Rental duration in days */
  rentalDays: number;
  /** Currency */
  currency: string;
}

/**
 * Add-on pricing calculation result
 */
export interface AddonCalculationResult {
  /** Individual add-on prices */
  items: SelectedAddon[];
  /** Total add-on cost */
  total: number;
  /** Currency */
  currency: string;
}

// ============================================================================
// COUPON TYPES
// ============================================================================

/**
 * Coupon from database
 */
export interface CouponData {
  id: string;
  tenantId: string;
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  freeAddonId: string | null;
  minOrderValue: number | null;
  validFrom: string;
  validUntil: string;
  usageLimit: number | null;
  usagePerCustomer: number;
  usageCount: number;
  status: CouponStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Coupon with free addon details
 */
export interface CouponWithAddon extends CouponData {
  freeAddon?: {
    id: string;
    name: LocalizedString;
    price: number;
    priceType: PriceType;
  };
}

/**
 * Input for creating a coupon
 */
export interface CreateCouponInput {
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  freeAddonId?: string;
  minOrderValue?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usagePerCustomer?: number;
  status?: CouponStatus;
}

/**
 * Input for updating a coupon
 */
export type UpdateCouponInput = Partial<CreateCouponInput>;

/**
 * Coupon validation input
 */
export interface CouponValidationInput {
  code: string;
  tenantId: string;
  customerId?: string;
  orderValue: number;
}

/**
 * Coupon validation result
 */
export interface CouponValidationResult {
  /** Is the coupon valid */
  isValid: boolean;
  /** Coupon data (if valid) */
  coupon?: CouponData;
  /** Error message (if invalid) */
  errorMessage?: string;
  /** Error code for programmatic handling */
  errorCode?: CouponErrorCode;
}

/**
 * Coupon error codes
 */
export type CouponErrorCode =
  | 'not_found'
  | 'expired'
  | 'not_active'
  | 'min_order_not_met'
  | 'usage_limit_reached'
  | 'per_customer_limit_reached'
  | 'not_yet_valid';

/**
 * Applied coupon discount
 */
export interface AppliedCoupon {
  /** Coupon ID */
  couponId: string;
  /** Coupon code */
  code: string;
  /** Discount type */
  discountType: DiscountType;
  /** Discount value */
  discountValue: number;
  /** Calculated discount amount */
  discountAmount: number;
  /** Free addon ID (if free_addon type) */
  freeAddonId?: string;
}

// ============================================================================
// PRICING CALCULATION TYPES
// ============================================================================

/**
 * Input for full pricing calculation
 */
export interface PricingCalculationInput {
  /** Tenant ID */
  tenantId: string;
  /** Vehicle ID */
  vehicleId: string;
  /** Category ID */
  categoryId: string;
  /** Pickup date/time */
  pickupAt: string;
  /** Return date/time */
  returnAt: string;
  /** Pickup branch ID */
  pickupBranchId: string;
  /** Return branch ID (for one-way) */
  returnBranchId?: string;
  /** Selected add-ons */
  addons?: { addonId: string; quantity: number }[];
  /** Coupon code */
  couponCode?: string;
  /** Customer ID (for coupon validation) */
  customerId?: string;
  /** Currency override */
  currency?: string;
}

/**
 * Full pricing breakdown
 */
export interface PricingBreakdown {
  /** Base rate used */
  baseRate: number;
  /** Rate type used */
  rateType: RateType;
  /** Rental duration */
  duration: number;
  /** Duration unit */
  durationUnit: 'hours' | 'days' | 'weeks' | 'months';
  /** Subtotal (base rate * duration) */
  subtotal: number;
  /** Season information */
  season?: {
    id: string;
    name: string;
    multiplier: number;
    amount: number;
  };
  /** Add-ons total */
  addonsTotal: number;
  /** Add-on details */
  addons: SelectedAddon[];
  /** One-way fee */
  oneWayFee: number;
  /** Is one-way rental */
  isOneWay: boolean;
  /** Applied coupon */
  coupon?: AppliedCoupon;
  /** Discount amount */
  discountAmount: number;
  /** Final total */
  total: number;
  /** Currency */
  currency: string;
}

/**
 * Simplified pricing result for display
 */
export interface PricingResult {
  /** Final total */
  total: number;
  /** Currency */
  currency: string;
  /** Effective daily rate */
  dailyRate: number;
  /** Full breakdown (optional) */
  breakdown?: PricingBreakdown;
  /** Any warnings */
  warnings?: PricingWarning[];
}

/**
 * Pricing warning
 */
export interface PricingWarning {
  code: string;
  message: string;
  severity: 'info' | 'warning';
}

/**
 * Price comparison for vehicle selection
 */
export interface PriceComparison {
  /** Vehicle ID */
  vehicleId: string;
  /** Daily rate */
  dailyRate: number;
  /** Total for rental period */
  totalPrice: number;
  /** Currency */
  currency: string;
  /** Has seasonal pricing applied */
  hasSeasonalPricing: boolean;
  /** Seasonal multiplier (if applicable) */
  seasonalMultiplier?: number;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Rate type schema
 */
export const rateTypeSchema = z.enum(['hourly', 'daily', 'weekly', 'monthly']);

/**
 * Price type schema
 */
export const priceTypeSchema = z.enum(['per_day', 'per_rental', 'one_time']);

/**
 * Discount type schema
 */
export const discountTypeSchema = z.enum(['percentage', 'fixed_amount', 'free_addon']);

/**
 * Rule status schema
 */
export const ruleStatusSchema = z.enum(['active', 'inactive']);

/**
 * Coupon status schema
 */
export const couponStatusSchema = z.enum(['active', 'inactive', 'expired']);

/**
 * Date validation schema
 */
export const dateSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Invalid date format. Use YYYY-MM-DD.'
);

/**
 * DateTime validation schema
 */
export const dateTimeSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid date/time format. Use ISO 8601 format.' }
);

/**
 * Currency schema (ISO 4217)
 */
export const currencySchema = z.string().length(3).toUpperCase();

/**
 * Positive amount schema
 */
export const positiveAmountSchema = z.number().positive('Amount must be positive');

/**
 * Non-negative amount schema
 */
export const nonNegativeAmountSchema = z.number().min(0, 'Amount cannot be negative');

/**
 * Multiplier schema (must be > 0)
 */
export const multiplierSchema = z.number().positive().max(10, 'Multiplier cannot exceed 10x');

/**
 * Create pricing rule schema
 */
export const createPricingRuleSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID').optional(),
  vehicleId: z.string().uuid('Invalid vehicle ID').optional(),
  rateType: rateTypeSchema,
  amount: positiveAmountSchema,
  currency: currencySchema.optional().default('EUR'),
  minDuration: z.number().int().positive().optional(),
  maxDuration: z.number().int().positive().optional(),
  status: ruleStatusSchema.optional().default('active'),
}).refine(
  (data) => data.categoryId || data.vehicleId,
  { message: 'Either categoryId or vehicleId must be provided' }
).refine(
  (data) => !(data.categoryId && data.vehicleId),
  { message: 'Cannot set both categoryId and vehicleId' }
).refine(
  (data) => {
    if (data.minDuration && data.maxDuration) {
      return data.minDuration <= data.maxDuration;
    }
    return true;
  },
  { message: 'minDuration must be less than or equal to maxDuration' }
);

export type CreatePricingRuleSchema = z.infer<typeof createPricingRuleSchema>;

/**
 * Update pricing rule schema
 */
export const updatePricingRuleSchema = createPricingRuleSchema.partial();

export type UpdatePricingRuleSchema = z.infer<typeof updatePricingRuleSchema>;

/**
 * Create season schema
 */
export const createSeasonSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  startDate: dateSchema,
  endDate: dateSchema,
  multiplier: multiplierSchema,
  priority: z.number().int().min(0).optional().default(0),
  status: ruleStatusSchema.optional().default('active'),
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  { message: 'End date must be on or after start date', path: ['endDate'] }
);

export type CreateSeasonSchema = z.infer<typeof createSeasonSchema>;

/**
 * Update season schema
 */
export const updateSeasonSchema = createSeasonSchema.partial();

export type UpdateSeasonSchema = z.infer<typeof updateSeasonSchema>;

/**
 * Localized string schema
 */
export const localizedStringSchema = z.object({
  en: z.string().optional(),
  lt: z.string().optional(),
  ru: z.string().optional(),
}).passthrough();

/**
 * Create addon schema
 */
export const createAddonSchema = z.object({
  name: localizedStringSchema.refine(
    (data) => Object.values(data).some((v) => typeof v === 'string' && v.trim().length > 0),
    { message: 'At least one language translation is required for name' }
  ),
  description: localizedStringSchema.optional().default({}),
  price: positiveAmountSchema,
  priceType: priceTypeSchema,
  maxQuantity: z.number().int().min(1).optional().default(1),
  imageUrl: z.string().url().optional(),
  sortOrder: z.number().int().min(0).optional().default(0),
  status: ruleStatusSchema.optional().default('active'),
});

export type CreateAddonSchema = z.infer<typeof createAddonSchema>;

/**
 * Update addon schema
 */
export const updateAddonSchema = createAddonSchema.partial();

export type UpdateAddonSchema = z.infer<typeof updateAddonSchema>;

/**
 * Create coupon schema
 */
export const createCouponSchema = z.object({
  code: z.string()
    .min(3, 'Code must be at least 3 characters')
    .max(50, 'Code cannot exceed 50 characters')
    .transform((val) => val.toUpperCase().replace(/\s+/g, '')),
  description: z.string().max(500).optional(),
  discountType: discountTypeSchema,
  discountValue: positiveAmountSchema,
  freeAddonId: z.string().uuid().optional(),
  minOrderValue: nonNegativeAmountSchema.optional(),
  validFrom: dateTimeSchema,
  validUntil: dateTimeSchema,
  usageLimit: z.number().int().positive().optional(),
  usagePerCustomer: z.number().int().min(1).optional().default(1),
  status: couponStatusSchema.optional().default('active'),
}).refine(
  (data) => new Date(data.validFrom) < new Date(data.validUntil),
  { message: 'Valid until must be after valid from', path: ['validUntil'] }
).refine(
  (data) => {
    if (data.discountType === 'percentage') {
      return data.discountValue <= 100;
    }
    return true;
  },
  { message: 'Percentage discount cannot exceed 100%', path: ['discountValue'] }
).refine(
  (data) => {
    if (data.discountType === 'free_addon' && !data.freeAddonId) {
      return false;
    }
    return true;
  },
  { message: 'Free addon ID is required for free_addon discount type', path: ['freeAddonId'] }
);

export type CreateCouponSchema = z.infer<typeof createCouponSchema>;

/**
 * Update coupon schema
 */
export const updateCouponSchema = createCouponSchema.partial();

export type UpdateCouponSchema = z.infer<typeof updateCouponSchema>;

/**
 * Pricing calculation input schema
 */
export const pricingCalculationInputSchema = z.object({
  tenantId: z.string().uuid('Invalid tenant ID'),
  vehicleId: z.string().uuid('Invalid vehicle ID'),
  categoryId: z.string().uuid('Invalid category ID'),
  pickupAt: dateTimeSchema,
  returnAt: dateTimeSchema,
  pickupBranchId: z.string().uuid('Invalid pickup branch ID'),
  returnBranchId: z.string().uuid('Invalid return branch ID').optional(),
  addons: z.array(z.object({
    addonId: z.string().uuid('Invalid addon ID'),
    quantity: z.number().int().min(1),
  })).optional(),
  couponCode: z.string().optional(),
  customerId: z.string().uuid().optional(),
  currency: currencySchema.optional(),
}).refine(
  (data) => new Date(data.pickupAt) < new Date(data.returnAt),
  { message: 'Return time must be after pickup time', path: ['returnAt'] }
);

export type PricingCalculationInputSchema = z.infer<typeof pricingCalculationInputSchema>;

/**
 * Coupon validation input schema
 */
export const couponValidationInputSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  tenantId: z.string().uuid('Invalid tenant ID'),
  customerId: z.string().uuid().optional(),
  orderValue: nonNegativeAmountSchema,
});

export type CouponValidationInputSchema = z.infer<typeof couponValidationInputSchema>;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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
 * Calculate rental duration in hours
 */
export function calculateDurationHours(pickupAt: string, returnAt: string): number {
  const pickup = new Date(pickupAt);
  const returnDate = new Date(returnAt);
  const diffMs = returnDate.getTime() - pickup.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60));
}

/**
 * Get the best rate type for a duration
 */
export function getBestRateType(
  durationDays: number,
  availableRates: Partial<Record<RateType, EffectiveRate>>
): RateType {
  // If monthly rate available and duration >= 28 days
  if (availableRates.monthly && durationDays >= 28) {
    const monthlyDailyRate = availableRates.monthly.amount / 30;
    const dailyRate = availableRates.daily?.amount ?? Infinity;
    if (monthlyDailyRate < dailyRate) {
      return 'monthly';
    }
  }

  // If weekly rate available and duration >= 7 days
  if (availableRates.weekly && durationDays >= 7) {
    const weeklyDailyRate = availableRates.weekly.amount / 7;
    const dailyRate = availableRates.daily?.amount ?? Infinity;
    if (weeklyDailyRate < dailyRate) {
      return 'weekly';
    }
  }

  // If less than 24 hours and hourly rate available
  if (availableRates.hourly && durationDays < 1) {
    return 'hourly';
  }

  // Default to daily
  return 'daily';
}

/**
 * Calculate price for a duration using the best available rate
 */
export function calculatePriceForDuration(
  durationDays: number,
  rates: VehicleRates
): { total: number; rateType: RateType; effectiveDailyRate: number } {
  const rateType = getBestRateType(durationDays, {
    hourly: rates.hourly,
    daily: rates.daily,
    weekly: rates.weekly,
    monthly: rates.monthly,
  });

  let total: number;
  let effectiveDailyRate: number;

  switch (rateType) {
    case 'monthly':
      const months = Math.ceil(durationDays / 30);
      total = months * (rates.monthly?.amount ?? 0);
      effectiveDailyRate = total / durationDays;
      break;
    case 'weekly':
      const weeks = Math.ceil(durationDays / 7);
      total = weeks * (rates.weekly?.amount ?? 0);
      effectiveDailyRate = total / durationDays;
      break;
    case 'hourly':
      const hours = durationDays * 24;
      total = hours * (rates.hourly?.amount ?? 0);
      effectiveDailyRate = total / durationDays;
      break;
    default:
      total = durationDays * rates.daily.amount;
      effectiveDailyRate = rates.daily.amount;
  }

  return { total, rateType, effectiveDailyRate };
}

/**
 * Apply seasonal multiplier to a price
 */
export function applySeasonalMultiplier(
  basePrice: number,
  multiplier: number
): { total: number; adjustment: number } {
  const total = Math.round(basePrice * multiplier * 100) / 100;
  const adjustment = Math.round((total - basePrice) * 100) / 100;
  return { total, adjustment };
}

/**
 * Calculate discount amount
 */
export function calculateDiscount(
  subtotal: number,
  discountType: DiscountType,
  discountValue: number
): number {
  switch (discountType) {
    case 'percentage':
      return Math.round(subtotal * (discountValue / 100) * 100) / 100;
    case 'fixed_amount':
      return Math.min(discountValue, subtotal);
    case 'free_addon':
      // For free_addon, the discount is applied separately
      return 0;
    default:
      return 0;
  }
}

/**
 * Format rate type for display
 */
export function formatRateType(rateType: RateType): string {
  const labels: Record<RateType, string> = {
    hourly: 'per hour',
    daily: 'per day',
    weekly: 'per week',
    monthly: 'per month',
  };
  return labels[rateType];
}

/**
 * Format price type for display
 */
export function formatPriceType(priceType: PriceType): string {
  const labels: Record<PriceType, string> = {
    per_day: 'per day',
    per_rental: 'per rental',
    one_time: 'one-time',
  };
  return labels[priceType];
}

/**
 * Format discount type for display
 */
export function formatDiscountType(discountType: DiscountType, value: number): string {
  switch (discountType) {
    case 'percentage':
      return `${value}% off`;
    case 'fixed_amount':
      return `${value} off`;
    case 'free_addon':
      return 'Free add-on';
    default:
      return discountType;
  }
}

/**
 * Check if a coupon is currently valid (date-wise)
 */
export function isCouponDateValid(coupon: CouponData): boolean {
  const now = new Date();
  const validFrom = new Date(coupon.validFrom);
  const validUntil = new Date(coupon.validUntil);
  return now >= validFrom && now <= validUntil;
}

/**
 * Check if a coupon has remaining uses
 */
export function hasCouponUsesRemaining(coupon: CouponData): boolean {
  if (coupon.usageLimit === null) {
    return true;
  }
  return coupon.usageCount < coupon.usageLimit;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default currency
 */
export const DEFAULT_CURRENCY = 'EUR';

/**
 * Minimum rental hours
 */
export const MIN_RENTAL_HOURS = 1;

/**
 * Maximum rental days
 */
export const MAX_RENTAL_DAYS = 365;

/**
 * Days in a week (for weekly rate calculation)
 */
export const DAYS_PER_WEEK = 7;

/**
 * Days in a month (for monthly rate calculation)
 */
export const DAYS_PER_MONTH = 30;

/**
 * Rate type options for forms
 */
export const RATE_TYPE_OPTIONS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
] as const;

/**
 * Price type options for forms
 */
export const PRICE_TYPE_OPTIONS = [
  { value: 'per_day', label: 'Per Day' },
  { value: 'per_rental', label: 'Per Rental' },
  { value: 'one_time', label: 'One Time' },
] as const;

/**
 * Discount type options for forms
 */
export const DISCOUNT_TYPE_OPTIONS = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed_amount', label: 'Fixed Amount' },
  { value: 'free_addon', label: 'Free Add-on' },
] as const;

/**
 * Status options for forms
 */
export const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

/**
 * Coupon status options for forms
 */
export const COUPON_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'expired', label: 'Expired' },
] as const;
