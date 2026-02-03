/**
 * Pricing Calculation Engine
 *
 * Combines all pricing components into a unified calculation:
 * - Base rates (vehicle-specific or category-level)
 * - Duration-based pricing (weekly/monthly rates)
 * - Seasonal pricing (date-based multipliers)
 * - Add-ons (per-day, per-rental, one-time)
 * - One-way fees (flat, distance, or zone-based)
 * - Coupons (percentage, fixed amount, free add-on)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, RateType, DiscountType, Branch } from '@/lib/supabase/types';
import type {
  PricingCalculationInput,
  PricingBreakdown,
  PricingResult,
  PricingWarning,
  SelectedAddon,
  AppliedCoupon,
  VehicleRates,
  CouponData,
  AddonData,
} from './types';
import {
  calculateDurationDays,
  calculateDurationHours,
  calculateDiscount,
  DEFAULT_CURRENCY,
  DAYS_PER_WEEK,
  DAYS_PER_MONTH,
} from './types';
import { getVehicleRates } from './queries';
import { calculateSeasonOverlap } from './season-queries';
import { calculateAddonsTotal, calculateAddonsFromData } from './addon-calculator';
import { validateCoupon, applyCoupon } from './coupons';
import { calculateOneWayFee } from '@/lib/availability/one-way';
import { isOneWayRental } from '@/lib/availability/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for pricing calculation
 */
export interface PricingCalculationOptions {
  /** Include detailed breakdown */
  includeBreakdown?: boolean;
  /** Locale for add-on names */
  locale?: string;
  /** Pre-fetched vehicle rates (for optimization) */
  vehicleRates?: VehicleRates;
  /** Pre-fetched add-ons data (for optimization) */
  addonsData?: AddonData[];
  /** Skip coupon validation (for preview) */
  skipCouponValidation?: boolean;
}

/**
 * Internal calculation context
 */
interface CalculationContext {
  tenantId: string;
  vehicleId: string;
  categoryId: string;
  pickupAt: Date;
  returnAt: Date;
  pickupBranchId: string;
  returnBranchId: string;
  durationDays: number;
  durationHours: number;
  currency: string;
  locale: string;
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Calculate complete pricing for a rental
 * Combines all pricing rules and returns a full breakdown
 */
export async function calculatePricing(
  supabase: SupabaseClient<Database>,
  input: PricingCalculationInput,
  options: PricingCalculationOptions = {}
): Promise<PricingResult> {
  const { includeBreakdown = true, locale = 'en' } = options;
  const warnings: PricingWarning[] = [];

  // Build calculation context
  const ctx = buildCalculationContext(input, options);

  // Get vehicle rates (use cached if provided)
  const rates = options.vehicleRates || await getVehicleRates(
    supabase,
    input.vehicleId,
    input.categoryId
  );

  if (!rates) {
    return {
      total: 0,
      currency: ctx.currency,
      dailyRate: 0,
      warnings: [{
        code: 'no_rates',
        message: 'No pricing rules found for this vehicle',
        severity: 'warning',
      }],
    };
  }

  // Step 1: Calculate base price using optimal duration pricing
  const baseResult = calculateBasePrice(ctx, rates);
  let subtotal = baseResult.total;

  // Step 2: Apply seasonal pricing
  const seasonResult = await calculateSeasonalPricing(
    supabase,
    ctx,
    subtotal
  );
  subtotal = seasonResult.adjustedTotal;

  // Step 3: Calculate add-ons
  const addonsResult = await calculateAddonsPrice(
    supabase,
    ctx,
    input.addons || [],
    options.addonsData
  );

  // Step 4: Calculate one-way fee
  const oneWayResult = await calculateOneWayPrice(
    supabase,
    ctx
  );

  // Step 5: Calculate subtotal before coupon
  const subtotalBeforeCoupon = subtotal + addonsResult.total + oneWayResult.fee;

  // Step 6: Apply coupon discount
  let couponResult: AppliedCoupon | undefined;
  let discountAmount = 0;

  if (input.couponCode && !options.skipCouponValidation) {
    const coupon = await validateAndApplyCouponInternal(
      supabase,
      ctx,
      input.couponCode,
      subtotalBeforeCoupon,
      input.customerId
    );

    if (coupon.isValid && coupon.applied) {
      couponResult = coupon.applied;
      discountAmount = coupon.applied.discountAmount;
    } else if (coupon.warning) {
      warnings.push(coupon.warning);
    }
  }

  // Step 7: Calculate final total
  const total = Math.max(0, subtotalBeforeCoupon - discountAmount);

  // Build result
  const result: PricingResult = {
    total: roundPrice(total),
    currency: ctx.currency,
    dailyRate: roundPrice(total / ctx.durationDays),
  };

  if (includeBreakdown) {
    result.breakdown = {
      baseRate: baseResult.rate,
      rateType: baseResult.rateType,
      duration: baseResult.duration,
      durationUnit: baseResult.durationUnit,
      subtotal: baseResult.total,
      season: seasonResult.season,
      addonsTotal: addonsResult.total,
      addons: addonsResult.items,
      oneWayFee: oneWayResult.fee,
      isOneWay: oneWayResult.isOneWay,
      coupon: couponResult,
      discountAmount,
      total: roundPrice(total),
      currency: ctx.currency,
    };
  }

  if (warnings.length > 0) {
    result.warnings = warnings;
  }

  return result;
}

/**
 * Calculate pricing for display (simpler, faster)
 * Use this for fleet listings where full breakdown isn't needed
 */
export async function calculateDisplayPrice(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  categoryId: string,
  pickupAt: string,
  returnAt: string,
  currency: string = DEFAULT_CURRENCY
): Promise<{ total: number; dailyRate: number; currency: string } | null> {
  const rates = await getVehicleRates(supabase, vehicleId, categoryId);
  if (!rates) return null;

  const durationDays = calculateDurationDays(pickupAt, returnAt);
  const baseResult = calculateBasePrice(
    {
      durationDays,
      durationHours: calculateDurationHours(pickupAt, returnAt),
      currency,
    } as CalculationContext,
    rates
  );

  return {
    total: roundPrice(baseResult.total),
    dailyRate: roundPrice(baseResult.total / durationDays),
    currency,
  };
}

/**
 * Calculate pricing preview (without database calls for add-ons/coupons)
 * Use this for real-time price updates during booking form changes
 */
export function calculatePricingPreview(
  rates: VehicleRates,
  pickupAt: string,
  returnAt: string,
  addons: AddonData[],
  selectedAddons: Array<{ addonId: string; quantity: number }>,
  oneWayFee: number = 0,
  seasonMultiplier: number = 1.0,
  locale: string = 'en'
): PricingBreakdown {
  const durationDays = calculateDurationDays(pickupAt, returnAt);
  const durationHours = calculateDurationHours(pickupAt, returnAt);
  const currency = rates.currency;

  // Base price
  const baseResult = calculateBasePrice(
    { durationDays, durationHours, currency } as CalculationContext,
    rates
  );

  // Apply season multiplier
  let subtotal = baseResult.total;
  let seasonInfo: PricingBreakdown['season'] | undefined;

  if (seasonMultiplier !== 1.0) {
    const adjustment = subtotal * (seasonMultiplier - 1);
    subtotal = subtotal * seasonMultiplier;
    seasonInfo = {
      id: 'preview',
      name: 'Seasonal pricing',
      multiplier: seasonMultiplier,
      amount: roundPrice(adjustment),
    };
  }

  // Calculate add-ons
  const addonsCalc = calculateAddonsFromData(
    addons,
    selectedAddons,
    durationDays,
    currency,
    locale
  );

  // Calculate total
  const total = subtotal + addonsCalc.total + oneWayFee;

  return {
    baseRate: baseResult.rate,
    rateType: baseResult.rateType,
    duration: baseResult.duration,
    durationUnit: baseResult.durationUnit,
    subtotal: roundPrice(baseResult.total),
    season: seasonInfo,
    addonsTotal: addonsCalc.total,
    addons: addonsCalc.items,
    oneWayFee,
    isOneWay: oneWayFee > 0,
    discountAmount: 0,
    total: roundPrice(total),
    currency,
  };
}

// ============================================================================
// COMPONENT CALCULATIONS
// ============================================================================

/**
 * Build calculation context from input
 */
function buildCalculationContext(
  input: PricingCalculationInput,
  options: PricingCalculationOptions
): CalculationContext {
  const pickupAt = new Date(input.pickupAt);
  const returnAt = new Date(input.returnAt);

  return {
    tenantId: input.tenantId,
    vehicleId: input.vehicleId,
    categoryId: input.categoryId,
    pickupAt,
    returnAt,
    pickupBranchId: input.pickupBranchId,
    returnBranchId: input.returnBranchId || input.pickupBranchId,
    durationDays: calculateDurationDays(input.pickupAt, input.returnAt),
    durationHours: calculateDurationHours(input.pickupAt, input.returnAt),
    currency: input.currency || DEFAULT_CURRENCY,
    locale: options.locale || 'en',
  };
}

/**
 * Calculate base price using optimal duration pricing
 */
function calculateBasePrice(
  ctx: Pick<CalculationContext, 'durationDays' | 'durationHours' | 'currency'>,
  rates: VehicleRates
): {
  rate: number;
  rateType: RateType;
  duration: number;
  durationUnit: 'hours' | 'days' | 'weeks' | 'months';
  total: number;
} {
  const { durationDays, durationHours } = ctx;

  // For very short rentals (< 24 hours), consider hourly rate if available
  if (durationHours < 24 && rates.hourly) {
    return {
      rate: rates.hourly.amount,
      rateType: 'hourly',
      duration: durationHours,
      durationUnit: 'hours',
      total: roundPrice(rates.hourly.amount * durationHours),
    };
  }

  // Check if monthly rate is better (28+ days)
  if (rates.monthly && durationDays >= 28) {
    const fullMonths = Math.floor(durationDays / DAYS_PER_MONTH);
    const remainingDays = durationDays % DAYS_PER_MONTH;

    // Option 1: Full months + remaining days at daily rate
    const option1 = fullMonths * rates.monthly.amount + remainingDays * rates.daily.amount;

    // Option 2: Round up to next month
    const option2 = remainingDays > 0 ? (fullMonths + 1) * rates.monthly.amount : option1;

    // Option 3: All at daily rate
    const option3 = durationDays * rates.daily.amount;

    const bestTotal = Math.min(option1, option2, option3);

    if (bestTotal === option2 && remainingDays > 0) {
      return {
        rate: rates.monthly.amount,
        rateType: 'monthly',
        duration: fullMonths + 1,
        durationUnit: 'months',
        total: roundPrice(bestTotal),
      };
    }

    if (bestTotal === option1 && fullMonths > 0) {
      return {
        rate: rates.monthly.amount,
        rateType: 'monthly',
        duration: fullMonths,
        durationUnit: 'months',
        total: roundPrice(bestTotal),
      };
    }
  }

  // Check if weekly rate is better (5+ days)
  if (rates.weekly && durationDays >= 5) {
    const fullWeeks = Math.floor(durationDays / DAYS_PER_WEEK);
    const remainingDays = durationDays % DAYS_PER_WEEK;

    // Option 1: Full weeks + remaining days at daily rate
    const option1 = fullWeeks * rates.weekly.amount + remainingDays * rates.daily.amount;

    // Option 2: Round up to next week
    const option2 = remainingDays > 0 ? (fullWeeks + 1) * rates.weekly.amount : option1;

    // Option 3: All at daily rate
    const option3 = durationDays * rates.daily.amount;

    const bestTotal = Math.min(option1, option2, option3);

    if (bestTotal === option2 && remainingDays > 0) {
      return {
        rate: rates.weekly.amount,
        rateType: 'weekly',
        duration: fullWeeks + 1,
        durationUnit: 'weeks',
        total: roundPrice(bestTotal),
      };
    }

    if (bestTotal === option1 && fullWeeks > 0 && bestTotal < option3) {
      // Mixed: weeks + days, report as weekly with days overflow
      return {
        rate: rates.weekly.amount,
        rateType: 'weekly',
        duration: fullWeeks,
        durationUnit: 'weeks',
        total: roundPrice(bestTotal),
      };
    }
  }

  // Default to daily rate
  return {
    rate: rates.daily.amount,
    rateType: 'daily',
    duration: durationDays,
    durationUnit: 'days',
    total: roundPrice(durationDays * rates.daily.amount),
  };
}

/**
 * Calculate seasonal pricing adjustment
 */
async function calculateSeasonalPricing(
  supabase: SupabaseClient<Database>,
  ctx: CalculationContext,
  baseTotal: number
): Promise<{
  adjustedTotal: number;
  season?: PricingBreakdown['season'];
}> {
  const overlap = await calculateSeasonOverlap(
    supabase,
    ctx.tenantId,
    ctx.pickupAt.toISOString().split('T')[0],
    ctx.returnAt.toISOString().split('T')[0],
    baseTotal
  );

  if (overlap.seasons.length === 0 || overlap.averageMultiplier === 1.0) {
    return { adjustedTotal: baseTotal };
  }

  // Use the highest priority (first) season for display
  const primarySeason = overlap.seasons[0];

  return {
    adjustedTotal: roundPrice(baseTotal * overlap.averageMultiplier),
    season: {
      id: primarySeason.id,
      name: primarySeason.name,
      multiplier: overlap.averageMultiplier,
      amount: roundPrice(overlap.seasonalAmount),
    },
  };
}

/**
 * Calculate add-ons pricing
 */
async function calculateAddonsPrice(
  supabase: SupabaseClient<Database>,
  ctx: CalculationContext,
  selections: Array<{ addonId: string; quantity: number }>,
  cachedAddons?: AddonData[]
): Promise<{ items: SelectedAddon[]; total: number }> {
  if (selections.length === 0) {
    return { items: [], total: 0 };
  }

  if (cachedAddons) {
    const result = calculateAddonsFromData(
      cachedAddons,
      selections,
      ctx.durationDays,
      ctx.currency,
      ctx.locale
    );
    return { items: result.items, total: result.total };
  }

  const result = await calculateAddonsTotal(supabase, {
    addons: selections,
    rentalDays: ctx.durationDays,
    currency: ctx.currency,
  }, ctx.locale);

  return { items: result.items, total: result.total };
}

/**
 * Calculate one-way fee
 */
async function calculateOneWayPrice(
  supabase: SupabaseClient<Database>,
  ctx: CalculationContext
): Promise<{ fee: number; isOneWay: boolean; currency: string }> {
  if (!isOneWayRental(ctx.pickupBranchId, ctx.returnBranchId)) {
    return { fee: 0, isOneWay: false, currency: ctx.currency };
  }

  // Get branches for fee calculation
  const { data: branchesData } = await supabase
    .from('branches')
    .select('*')
    .in('id', [ctx.pickupBranchId, ctx.returnBranchId]);

  // Cast to Branch type to work around Supabase type inference issues
  const branches = branchesData as unknown as Branch[] | null;

  if (!branches || branches.length !== 2) {
    return { fee: 0, isOneWay: true, currency: ctx.currency };
  }

  const pickupBranch = branches.find(b => b.id === ctx.pickupBranchId);
  const returnBranch = branches.find(b => b.id === ctx.returnBranchId);

  if (!pickupBranch || !returnBranch) {
    return { fee: 0, isOneWay: true, currency: ctx.currency };
  }

  const feeResult = await calculateOneWayFee(
    supabase,
    ctx.tenantId,
    pickupBranch,
    returnBranch
  );

  return {
    fee: feeResult.fee,
    isOneWay: true,
    currency: feeResult.currency,
  };
}

/**
 * Validate a coupon code and calculate discount
 * Exported for use in booking forms to preview discount before full calculation
 */
export async function validateCouponForPricing(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  couponCode: string,
  orderValue: number,
  customerId?: string
): Promise<{
  isValid: boolean;
  appliedCoupon?: AppliedCoupon;
  errorMessage?: string;
}> {
  const validationResult = await validateCoupon(supabase, {
    code: couponCode,
    tenantId,
    customerId,
    orderValue,
  });

  if (!validationResult.isValid || !validationResult.coupon) {
    return {
      isValid: false,
      errorMessage: validationResult.errorMessage,
    };
  }

  const applied = applyCoupon(validationResult.coupon, orderValue);

  return {
    isValid: true,
    appliedCoupon: applied,
  };
}

/**
 * Validate and apply coupon using centralized coupon validation
 */
async function validateAndApplyCouponInternal(
  supabase: SupabaseClient<Database>,
  ctx: CalculationContext,
  couponCode: string,
  subtotal: number,
  customerId?: string
): Promise<{
  isValid: boolean;
  applied?: AppliedCoupon;
  warning?: PricingWarning;
}> {
  // Use centralized coupon validation from coupons.ts
  const validationResult = await validateCoupon(supabase, {
    code: couponCode,
    tenantId: ctx.tenantId,
    customerId,
    orderValue: subtotal,
  });

  if (!validationResult.isValid || !validationResult.coupon) {
    // Map error codes to pricing warnings
    const errorMessages: Record<string, string> = {
      not_found: 'Coupon code not found',
      expired: 'This coupon has expired',
      not_active: 'This coupon is no longer active',
      min_order_not_met: `Minimum order value of ${validationResult.coupon?.minOrderValue || 0} ${ctx.currency} required`,
      usage_limit_reached: 'This coupon has reached its usage limit',
      per_customer_limit_reached: 'You have already used this coupon',
      not_yet_valid: 'This coupon is not yet valid',
    };

    return {
      isValid: false,
      warning: {
        code: `coupon_${validationResult.errorCode || 'invalid'}`,
        message: validationResult.errorMessage || errorMessages[validationResult.errorCode || ''] || 'Invalid coupon',
        severity: 'warning',
      },
    };
  }

  // Apply coupon using centralized function
  const applied = applyCoupon(validationResult.coupon, subtotal);

  return {
    isValid: true,
    applied: {
      ...applied,
      discountAmount: roundPrice(applied.discountAmount),
    },
  };
}

// ============================================================================
// COMPARISON & ESTIMATION UTILITIES
// ============================================================================

/**
 * Calculate pricing for multiple vehicles (for search results)
 */
export async function calculateBulkPricing(
  supabase: SupabaseClient<Database>,
  vehicles: Array<{ vehicleId: string; categoryId: string }>,
  pickupAt: string,
  returnAt: string,
  tenantId: string,
  currency: string = DEFAULT_CURRENCY
): Promise<Map<string, { total: number; dailyRate: number }>> {
  const durationDays = calculateDurationDays(pickupAt, returnAt);
  const durationHours = calculateDurationHours(pickupAt, returnAt);

  // Get all vehicle rates in bulk
  const vehicleIds = vehicles.map(v => v.vehicleId);
  const categoryIds = [...new Set(vehicles.map(v => v.categoryId))];

  // Fetch all pricing rules in bulk
  const { data: vehicleRulesData } = await supabase
    .from('pricing_rules')
    .select('*')
    .in('vehicle_id', vehicleIds)
    .eq('status', 'active');

  const { data: categoryRulesData } = await supabase
    .from('pricing_rules')
    .select('*')
    .in('category_id', categoryIds)
    .eq('status', 'active');

  // Build rate maps
  const vehicleRulesMap = new Map<string, Map<string, { amount: number; currency: string }>>();
  for (const rule of (vehicleRulesData || []) as any[]) {
    if (!rule.vehicle_id) continue;
    if (!vehicleRulesMap.has(rule.vehicle_id)) {
      vehicleRulesMap.set(rule.vehicle_id, new Map());
    }
    vehicleRulesMap.get(rule.vehicle_id)!.set(rule.rate_type, {
      amount: rule.amount,
      currency: rule.currency,
    });
  }

  const categoryRulesMap = new Map<string, Map<string, { amount: number; currency: string }>>();
  for (const rule of (categoryRulesData || []) as any[]) {
    if (!rule.category_id) continue;
    if (!categoryRulesMap.has(rule.category_id)) {
      categoryRulesMap.set(rule.category_id, new Map());
    }
    categoryRulesMap.get(rule.category_id)!.set(rule.rate_type, {
      amount: rule.amount,
      currency: rule.currency,
    });
  }

  // Calculate prices for each vehicle
  const results = new Map<string, { total: number; dailyRate: number }>();

  for (const { vehicleId, categoryId } of vehicles) {
    const vehicleRules = vehicleRulesMap.get(vehicleId);
    const categoryRules = categoryRulesMap.get(categoryId);

    // Get daily rate (vehicle > category)
    const dailyRule = vehicleRules?.get('daily') || categoryRules?.get('daily');
    if (!dailyRule) continue;

    const weeklyRule = vehicleRules?.get('weekly') || categoryRules?.get('weekly');
    const monthlyRule = vehicleRules?.get('monthly') || categoryRules?.get('monthly');

    // Build simplified rates object
    const rates: VehicleRates = {
      vehicleId,
      categoryId,
      daily: {
        amount: dailyRule.amount,
        rateType: 'daily',
        currency: dailyRule.currency,
        source: vehicleRules?.has('daily') ? 'vehicle' : 'category',
      },
      weekly: weeklyRule ? {
        amount: weeklyRule.amount,
        rateType: 'weekly',
        currency: weeklyRule.currency,
        source: vehicleRules?.has('weekly') ? 'vehicle' : 'category',
      } : undefined,
      monthly: monthlyRule ? {
        amount: monthlyRule.amount,
        rateType: 'monthly',
        currency: monthlyRule.currency,
        source: vehicleRules?.has('monthly') ? 'vehicle' : 'category',
      } : undefined,
      currency: dailyRule.currency,
    };

    const baseResult = calculateBasePrice(
      { durationDays, durationHours, currency },
      rates
    );

    results.set(vehicleId, {
      total: roundPrice(baseResult.total),
      dailyRate: roundPrice(baseResult.total / durationDays),
    });
  }

  return results;
}

/**
 * Estimate pricing for a rental period (quick estimate without all details)
 */
export function estimatePrice(
  dailyRate: number,
  durationDays: number,
  seasonMultiplier: number = 1.0,
  addonsEstimate: number = 0,
  oneWayFee: number = 0
): number {
  const basePrice = dailyRate * durationDays * seasonMultiplier;
  return roundPrice(basePrice + addonsEstimate + oneWayFee);
}

/**
 * Get pricing summary text for display
 */
export function getPricingSummary(
  breakdown: PricingBreakdown,
  locale: string = 'en'
): string {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: breakdown.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);

  const parts: string[] = [];

  // Base rate
  parts.push(`Base: ${formatCurrency(breakdown.subtotal)}`);

  // Season adjustment
  if (breakdown.season) {
    const sign = breakdown.season.amount >= 0 ? '+' : '';
    parts.push(`Season: ${sign}${formatCurrency(breakdown.season.amount)}`);
  }

  // Add-ons
  if (breakdown.addonsTotal > 0) {
    parts.push(`Add-ons: ${formatCurrency(breakdown.addonsTotal)}`);
  }

  // One-way fee
  if (breakdown.oneWayFee > 0) {
    parts.push(`One-way: ${formatCurrency(breakdown.oneWayFee)}`);
  }

  // Discount
  if (breakdown.discountAmount > 0) {
    parts.push(`Discount: -${formatCurrency(breakdown.discountAmount)}`);
  }

  return parts.join(' | ');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Round price to 2 decimal places
 */
function roundPrice(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Format price for display
 */
export function formatPrice(
  amount: number,
  currency: string,
  locale: string = 'en'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculate savings compared to daily rate
 */
export function calculateSavings(
  actualTotal: number,
  dailyRate: number,
  durationDays: number
): { amount: number; percent: number } {
  const dailyTotal = dailyRate * durationDays;
  const amount = dailyTotal - actualTotal;
  const percent = dailyTotal > 0 ? (amount / dailyTotal) * 100 : 0;

  return {
    amount: roundPrice(amount),
    percent: Math.round(percent * 10) / 10,
  };
}
