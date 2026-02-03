/**
 * Duration-Based Pricing Calculator
 *
 * Calculates optimal pricing for rental durations using weekly and monthly rates.
 * Handles rate selection, savings calculations, and comparison tiers.
 */

import type {
  RateType,
  VehicleRates,
  EffectiveRate,
  DurationTier,
  OptimalDurationPricing,
  DurationDiscount,
} from './types';
import {
  DAYS_PER_WEEK,
  DAYS_PER_MONTH,
  calculateDurationDays,
  calculateDurationHours,
} from './types';

// ============================================================================
// DURATION CONSTANTS
// ============================================================================

/**
 * Thresholds for rate tier application
 */
export const DURATION_THRESHOLDS = {
  /** Minimum days to consider weekly rate */
  weeklyMinDays: 5,
  /** Days for full weekly rate (7 days) */
  weeklyFullDays: 7,
  /** Minimum days to consider monthly rate */
  monthlyMinDays: 21,
  /** Days for full monthly rate (30 days) */
  monthlyFullDays: 30,
  /** Maximum hours for hourly rate */
  maxHourlyHours: 12,
} as const;

// ============================================================================
// DURATION TIER CALCULATIONS
// ============================================================================

/**
 * Calculate a duration tier for weekly or monthly rates
 */
export function calculateDurationTier(
  rateType: 'weekly' | 'monthly',
  rate: EffectiveRate,
  dailyRate: EffectiveRate
): DurationTier {
  const days = rateType === 'weekly' ? DAYS_PER_WEEK : DAYS_PER_MONTH;
  const totalRate = rate.amount;
  const effectiveDailyRate = totalRate / days;
  const dailyTotal = days * dailyRate.amount;
  const savings = dailyTotal - totalRate;
  const savingsPercent = (savings / dailyTotal) * 100;

  return {
    rateType,
    days,
    totalRate,
    effectiveDailyRate: Math.round(effectiveDailyRate * 100) / 100,
    savings: Math.round(savings * 100) / 100,
    savingsPercent: Math.round(savingsPercent * 10) / 10,
  };
}

/**
 * Get all available duration tiers for a vehicle
 */
export function getAvailableDurationTiers(
  rates: VehicleRates
): DurationTier[] {
  const tiers: DurationTier[] = [];

  if (rates.weekly && rates.daily) {
    tiers.push(calculateDurationTier('weekly', rates.weekly, rates.daily));
  }

  if (rates.monthly && rates.daily) {
    tiers.push(calculateDurationTier('monthly', rates.monthly, rates.daily));
  }

  return tiers;
}

// ============================================================================
// OPTIMAL PRICING CALCULATION
// ============================================================================

/**
 * Calculate the optimal pricing for a specific duration
 * Uses the most cost-effective combination of rates
 */
export function calculateOptimalDurationPricing(
  durationDays: number,
  rates: VehicleRates
): OptimalDurationPricing {
  // Calculate all possible pricing options
  const options: Array<{
    rateType: RateType;
    total: number;
    effectiveDailyRate: number;
  }> = [];

  // Daily rate (always available as baseline)
  const dailyTotal = durationDays * rates.daily.amount;
  options.push({
    rateType: 'daily',
    total: dailyTotal,
    effectiveDailyRate: rates.daily.amount,
  });

  // Weekly rate calculation
  if (rates.weekly && durationDays >= DURATION_THRESHOLDS.weeklyMinDays) {
    const weeklyPrice = calculateWeeklyBasedPricing(durationDays, rates);
    if (weeklyPrice) {
      options.push(weeklyPrice);
    }
  }

  // Monthly rate calculation
  if (rates.monthly && durationDays >= DURATION_THRESHOLDS.monthlyMinDays) {
    const monthlyPrice = calculateMonthlyBasedPricing(durationDays, rates);
    if (monthlyPrice) {
      options.push(monthlyPrice);
    }
  }

  // Find the best option (lowest total price)
  options.sort((a, b) => a.total - b.total);
  const best = options[0];

  // Build alternatives (excluding the best option)
  const alternatives = getAvailableDurationTiers(rates);

  return {
    requestedDays: durationDays,
    bestRateType: best.rateType,
    total: Math.round(best.total * 100) / 100,
    effectiveDailyRate: Math.round(best.effectiveDailyRate * 100) / 100,
    alternatives,
  };
}

/**
 * Calculate pricing using weekly rates
 * Handles partial weeks with daily rate overflow
 */
function calculateWeeklyBasedPricing(
  durationDays: number,
  rates: VehicleRates
): { rateType: RateType; total: number; effectiveDailyRate: number } | null {
  if (!rates.weekly) return null;

  const fullWeeks = Math.floor(durationDays / DAYS_PER_WEEK);
  const remainingDays = durationDays % DAYS_PER_WEEK;

  // Option 1: Full weeks + remaining days at daily rate
  const option1Total =
    fullWeeks * rates.weekly.amount + remainingDays * rates.daily.amount;

  // Option 2: Round up to next full week (if remaining days > 0)
  // This can be cheaper if daily rate is high
  let option2Total = Infinity;
  if (remainingDays > 0) {
    option2Total = (fullWeeks + 1) * rates.weekly.amount;
  }

  const bestTotal = Math.min(option1Total, option2Total);
  const effectiveDailyRate = bestTotal / durationDays;

  return {
    rateType: 'weekly',
    total: bestTotal,
    effectiveDailyRate,
  };
}

/**
 * Calculate pricing using monthly rates
 * Handles partial months with weekly/daily rate overflow
 */
function calculateMonthlyBasedPricing(
  durationDays: number,
  rates: VehicleRates
): { rateType: RateType; total: number; effectiveDailyRate: number } | null {
  if (!rates.monthly) return null;

  const fullMonths = Math.floor(durationDays / DAYS_PER_MONTH);
  const remainingDays = durationDays % DAYS_PER_MONTH;

  // Calculate remaining days cost using weekly + daily if available
  let remainingCost = remainingDays * rates.daily.amount;
  if (rates.weekly && remainingDays >= DURATION_THRESHOLDS.weeklyMinDays) {
    const fullWeeks = Math.floor(remainingDays / DAYS_PER_WEEK);
    const daysAfterWeeks = remainingDays % DAYS_PER_WEEK;
    const weeklyRemaining =
      fullWeeks * rates.weekly.amount + daysAfterWeeks * rates.daily.amount;
    remainingCost = Math.min(remainingCost, weeklyRemaining);
  }

  // Option 1: Full months + remaining at best rate
  const option1Total = fullMonths * rates.monthly.amount + remainingCost;

  // Option 2: Round up to next full month
  let option2Total = Infinity;
  if (remainingDays > 0) {
    option2Total = (fullMonths + 1) * rates.monthly.amount;
  }

  const bestTotal = Math.min(option1Total, option2Total);
  const effectiveDailyRate = bestTotal / durationDays;

  return {
    rateType: 'monthly',
    total: bestTotal,
    effectiveDailyRate,
  };
}

// ============================================================================
// DURATION DISCOUNTS
// ============================================================================

/**
 * Default duration discount tiers
 */
export const DEFAULT_DURATION_DISCOUNTS: DurationDiscount[] = [
  {
    minDays: 3,
    maxDays: 6,
    discountType: 'percentage',
    value: 5,
    label: '3-6 days: 5% off',
  },
  {
    minDays: 7,
    maxDays: 13,
    discountType: 'percentage',
    value: 10,
    label: '1-2 weeks: 10% off',
  },
  {
    minDays: 14,
    maxDays: 29,
    discountType: 'percentage',
    value: 15,
    label: '2-4 weeks: 15% off',
  },
  {
    minDays: 30,
    discountType: 'percentage',
    value: 20,
    label: '1+ month: 20% off',
  },
];

/**
 * Get applicable duration discount for a rental
 */
export function getDurationDiscount(
  durationDays: number,
  discounts: DurationDiscount[] = DEFAULT_DURATION_DISCOUNTS
): DurationDiscount | null {
  // Sort by minDays descending to get the highest applicable discount
  const sorted = [...discounts].sort((a, b) => b.minDays - a.minDays);

  for (const discount of sorted) {
    if (durationDays >= discount.minDays) {
      if (discount.maxDays === undefined || durationDays <= discount.maxDays) {
        return discount;
      }
    }
  }

  return null;
}

/**
 * Apply duration discount to a price
 */
export function applyDurationDiscount(
  basePrice: number,
  discount: DurationDiscount
): { finalPrice: number; discountAmount: number } {
  let discountAmount: number;

  if (discount.discountType === 'percentage') {
    discountAmount = (basePrice * discount.value) / 100;
  } else {
    // flat_rate means the value is the new daily rate
    // Not applicable here, but handled for completeness
    discountAmount = 0;
  }

  discountAmount = Math.round(discountAmount * 100) / 100;
  const finalPrice = Math.round((basePrice - discountAmount) * 100) / 100;

  return { finalPrice, discountAmount };
}

// ============================================================================
// PRICE COMPARISON UTILITIES
// ============================================================================

/**
 * Compare pricing across different duration options
 * Useful for showing customers potential savings
 */
export function comparePricingOptions(
  baseDays: number,
  rates: VehicleRates
): {
  requested: { days: number; total: number; dailyRate: number };
  suggestions: Array<{
    days: number;
    total: number;
    dailyRate: number;
    label: string;
    savingsPercent: number;
  }>;
} {
  const requestedPricing = calculateOptimalDurationPricing(baseDays, rates);

  const suggestions: Array<{
    days: number;
    total: number;
    dailyRate: number;
    label: string;
    savingsPercent: number;
  }> = [];

  // Suggest upgrading to a full week if close
  if (rates.weekly && baseDays >= 5 && baseDays < 7) {
    const weeklyPricing = calculateOptimalDurationPricing(7, rates);
    const dailyPricingFor7Days = 7 * rates.daily.amount;
    const savingsPercent =
      ((dailyPricingFor7Days - weeklyPricing.total) / dailyPricingFor7Days) *
      100;

    suggestions.push({
      days: 7,
      total: weeklyPricing.total,
      dailyRate: weeklyPricing.effectiveDailyRate,
      label: 'Full week',
      savingsPercent: Math.round(savingsPercent * 10) / 10,
    });
  }

  // Suggest upgrading to 2 weeks if close
  if (rates.weekly && baseDays >= 10 && baseDays < 14) {
    const twoWeekPricing = calculateOptimalDurationPricing(14, rates);
    const dailyPricingFor14Days = 14 * rates.daily.amount;
    const savingsPercent =
      ((dailyPricingFor14Days - twoWeekPricing.total) / dailyPricingFor14Days) *
      100;

    suggestions.push({
      days: 14,
      total: twoWeekPricing.total,
      dailyRate: twoWeekPricing.effectiveDailyRate,
      label: 'Two weeks',
      savingsPercent: Math.round(savingsPercent * 10) / 10,
    });
  }

  // Suggest upgrading to a full month if close
  if (rates.monthly && baseDays >= 25 && baseDays < 30) {
    const monthlyPricing = calculateOptimalDurationPricing(30, rates);
    const dailyPricingFor30Days = 30 * rates.daily.amount;
    const savingsPercent =
      ((dailyPricingFor30Days - monthlyPricing.total) / dailyPricingFor30Days) *
      100;

    suggestions.push({
      days: 30,
      total: monthlyPricing.total,
      dailyRate: monthlyPricing.effectiveDailyRate,
      label: 'Full month',
      savingsPercent: Math.round(savingsPercent * 10) / 10,
    });
  }

  return {
    requested: {
      days: baseDays,
      total: requestedPricing.total,
      dailyRate: requestedPricing.effectiveDailyRate,
    },
    suggestions: suggestions.filter((s) => s.savingsPercent > 0),
  };
}

/**
 * Format duration for display
 */
export function formatDuration(days: number): string {
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days === 7) return '1 week';
  if (days < 14) return `${days} days`;
  if (days === 14) return '2 weeks';
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    if (remainingDays === 0) return `${weeks} weeks`;
    return `${weeks} weeks, ${remainingDays} days`;
  }
  if (days === 30) return '1 month';
  const months = Math.floor(days / 30);
  const remainingDays = days % 30;
  if (remainingDays === 0) {
    return months === 1 ? '1 month' : `${months} months`;
  }
  return `${months} month${months > 1 ? 's' : ''}, ${remainingDays} days`;
}

/**
 * Calculate rental duration from dates
 */
export function getRentalDuration(
  pickupAt: string | Date,
  returnAt: string | Date
): {
  days: number;
  hours: number;
  formatted: string;
} {
  const pickup =
    typeof pickupAt === 'string' ? pickupAt : pickupAt.toISOString();
  const returnDate =
    typeof returnAt === 'string' ? returnAt : returnAt.toISOString();

  const days = calculateDurationDays(pickup, returnDate);
  const hours = calculateDurationHours(pickup, returnDate);

  return {
    days,
    hours,
    formatted: formatDuration(days),
  };
}

// ============================================================================
// EXTENDED RATE CALCULATION
// ============================================================================

/**
 * Calculate total price for a rental with full breakdown
 */
export function calculateRentalPrice(
  pickupAt: string | Date,
  returnAt: string | Date,
  rates: VehicleRates,
  options: {
    applyDurationDiscounts?: boolean;
    customDiscounts?: DurationDiscount[];
  } = {}
): {
  duration: { days: number; hours: number; formatted: string };
  baseTotal: number;
  rateUsed: RateType;
  effectiveDailyRate: number;
  durationDiscount?: {
    discount: DurationDiscount;
    amount: number;
  };
  finalTotal: number;
  currency: string;
  alternatives: DurationTier[];
} {
  const duration = getRentalDuration(pickupAt, returnAt);
  const optimal = calculateOptimalDurationPricing(duration.days, rates);

  let finalTotal = optimal.total;
  let durationDiscountInfo:
    | { discount: DurationDiscount; amount: number }
    | undefined;

  // Apply duration discounts if enabled and we're using daily rates
  if (options.applyDurationDiscounts && optimal.bestRateType === 'daily') {
    const discount = getDurationDiscount(
      duration.days,
      options.customDiscounts
    );
    if (discount) {
      const { finalPrice, discountAmount } = applyDurationDiscount(
        optimal.total,
        discount
      );
      finalTotal = finalPrice;
      durationDiscountInfo = { discount, amount: discountAmount };
    }
  }

  return {
    duration,
    baseTotal: optimal.total,
    rateUsed: optimal.bestRateType,
    effectiveDailyRate: optimal.effectiveDailyRate,
    durationDiscount: durationDiscountInfo,
    finalTotal,
    currency: rates.currency,
    alternatives: optimal.alternatives,
  };
}

/**
 * Check if upgrading duration would save money
 */
export function checkDurationUpgrade(
  currentDays: number,
  rates: VehicleRates
): {
  shouldUpgrade: boolean;
  upgradeToDays?: number;
  currentTotal: number;
  upgradeTotal?: number;
  savings?: number;
  savingsPercent?: number;
} {
  const currentPricing = calculateOptimalDurationPricing(currentDays, rates);

  // Check upgrade to full week
  if (rates.weekly && currentDays >= 5 && currentDays < 7) {
    const weekPricing = calculateOptimalDurationPricing(7, rates);
    // Only suggest if paying for extra days is worth it
    const extraDays = 7 - currentDays;
    const extraCostAtDaily = extraDays * rates.daily.amount;
    const upgradeTotal = weekPricing.total;
    const currentTotal = currentPricing.total;

    // Upgrade if the total for 7 days is less than current + extra days at daily
    if (upgradeTotal < currentTotal + extraCostAtDaily * 0.5) {
      return {
        shouldUpgrade: true,
        upgradeToDays: 7,
        currentTotal,
        upgradeTotal,
        savings: currentTotal + extraCostAtDaily - upgradeTotal,
        savingsPercent:
          ((currentTotal + extraCostAtDaily - upgradeTotal) /
            (currentTotal + extraCostAtDaily)) *
          100,
      };
    }
  }

  // Check upgrade to full month
  if (rates.monthly && currentDays >= 25 && currentDays < 30) {
    const monthPricing = calculateOptimalDurationPricing(30, rates);
    const extraDays = 30 - currentDays;
    const extraCostAtDaily = extraDays * rates.daily.amount;
    const upgradeTotal = monthPricing.total;
    const currentTotal = currentPricing.total;

    if (upgradeTotal < currentTotal + extraCostAtDaily * 0.5) {
      return {
        shouldUpgrade: true,
        upgradeToDays: 30,
        currentTotal,
        upgradeTotal,
        savings: currentTotal + extraCostAtDaily - upgradeTotal,
        savingsPercent:
          ((currentTotal + extraCostAtDaily - upgradeTotal) /
            (currentTotal + extraCostAtDaily)) *
          100,
      };
    }
  }

  return {
    shouldUpgrade: false,
    currentTotal: currentPricing.total,
  };
}
