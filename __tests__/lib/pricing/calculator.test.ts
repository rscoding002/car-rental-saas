/**
 * Pricing Calculator Unit Tests
 *
 * Tests for the pure utility functions in the pricing module.
 * These tests don't require database connections.
 */

import {
  calculateDurationDays,
  calculateDurationHours,
  getBestRateType,
  calculatePriceForDuration,
  applySeasonalMultiplier,
  calculateDiscount,
  formatRateType,
  formatPriceType,
  formatDiscountType,
  isCouponDateValid,
  hasCouponUsesRemaining,
  DEFAULT_CURRENCY,
  DAYS_PER_WEEK,
  DAYS_PER_MONTH,
  createPricingRuleSchema,
  createSeasonSchema,
  createCouponSchema,
  pricingCalculationInputSchema,
} from '@/lib/pricing/types';
import type { VehicleRates, EffectiveRate, CouponData, RateType, DiscountType, PriceType } from '@/lib/pricing/types';
import {
  calculateDurationTier,
  getAvailableDurationTiers,
  calculateOptimalDurationPricing,
  getDurationDiscount,
  applyDurationDiscount,
  formatDuration,
  getRentalDuration,
  comparePricingOptions,
  checkDurationUpgrade,
  DEFAULT_DURATION_DISCOUNTS,
  DURATION_THRESHOLDS,
} from '@/lib/pricing/duration-calculator';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createEffectiveRate = (
  amount: number,
  rateType: RateType,
  source: 'vehicle' | 'category' | 'default' = 'category'
): EffectiveRate => ({
  amount,
  rateType,
  currency: 'EUR',
  source,
});

const createVehicleRates = (
  daily: number,
  weekly?: number,
  monthly?: number,
  hourly?: number
): VehicleRates => ({
  vehicleId: 'vehicle-123',
  categoryId: 'category-456',
  daily: createEffectiveRate(daily, 'daily'),
  weekly: weekly ? createEffectiveRate(weekly, 'weekly') : undefined,
  monthly: monthly ? createEffectiveRate(monthly, 'monthly') : undefined,
  hourly: hourly ? createEffectiveRate(hourly, 'hourly') : undefined,
  currency: 'EUR',
});

const createCoupon = (overrides: Partial<CouponData> = {}): CouponData => ({
  id: 'coupon-123',
  tenantId: 'tenant-456',
  code: 'SAVE10',
  description: 'Test coupon',
  discountType: 'percentage',
  discountValue: 10,
  freeAddonId: null,
  minOrderValue: null,
  validFrom: '2024-01-01T00:00:00Z',
  validUntil: '2024-12-31T23:59:59Z',
  usageLimit: null,
  usagePerCustomer: 1,
  usageCount: 0,
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

// ============================================================================
// DURATION CALCULATION TESTS
// ============================================================================

describe('calculateDurationDays', () => {
  it('should return 1 for same day rental', () => {
    const days = calculateDurationDays(
      '2024-01-10T08:00:00Z',
      '2024-01-10T18:00:00Z'
    );
    expect(days).toBe(1);
  });

  it('should return 1 for exactly 24 hours', () => {
    const days = calculateDurationDays(
      '2024-01-10T10:00:00Z',
      '2024-01-11T10:00:00Z'
    );
    expect(days).toBe(1);
  });

  it('should round up to 2 days for 25 hours', () => {
    const days = calculateDurationDays(
      '2024-01-10T10:00:00Z',
      '2024-01-11T11:00:00Z'
    );
    expect(days).toBe(2);
  });

  it('should calculate 7 days for a week', () => {
    const days = calculateDurationDays(
      '2024-01-10T10:00:00Z',
      '2024-01-17T10:00:00Z'
    );
    expect(days).toBe(7);
  });

  it('should calculate 30 days for a month', () => {
    const days = calculateDurationDays(
      '2024-01-10T10:00:00Z',
      '2024-02-09T10:00:00Z'
    );
    expect(days).toBe(30);
  });
});

describe('calculateDurationHours', () => {
  it('should calculate hours correctly', () => {
    const hours = calculateDurationHours(
      '2024-01-10T08:00:00Z',
      '2024-01-10T18:00:00Z'
    );
    expect(hours).toBe(10);
  });

  it('should calculate 24 hours for a full day', () => {
    const hours = calculateDurationHours(
      '2024-01-10T10:00:00Z',
      '2024-01-11T10:00:00Z'
    );
    expect(hours).toBe(24);
  });

  it('should round up to next hour', () => {
    const hours = calculateDurationHours(
      '2024-01-10T10:00:00Z',
      '2024-01-10T10:30:00Z'
    );
    expect(hours).toBe(1);
  });
});

// ============================================================================
// BEST RATE TYPE TESTS
// ============================================================================

describe('getBestRateType', () => {
  it('should return daily for short rentals', () => {
    const rates = {
      daily: createEffectiveRate(50, 'daily'),
      weekly: createEffectiveRate(300, 'weekly'),
    };

    const result = getBestRateType(3, rates);
    expect(result).toBe('daily');
  });

  it('should return weekly when weekly rate is cheaper for 7+ days', () => {
    const rates = {
      daily: createEffectiveRate(50, 'daily'), // 7 days = 350
      weekly: createEffectiveRate(300, 'weekly'), // Better deal
    };

    const result = getBestRateType(7, rates);
    expect(result).toBe('weekly');
  });

  it('should return daily when weekly rate is not cheaper', () => {
    const rates = {
      daily: createEffectiveRate(40, 'daily'), // 7 days = 280
      weekly: createEffectiveRate(300, 'weekly'), // Worse deal
    };

    const result = getBestRateType(7, rates);
    expect(result).toBe('daily');
  });

  it('should return monthly for long rentals when cheaper', () => {
    const rates = {
      daily: createEffectiveRate(50, 'daily'), // 30 days = 1500
      weekly: createEffectiveRate(300, 'weekly'),
      monthly: createEffectiveRate(1200, 'monthly'), // Better deal
    };

    const result = getBestRateType(30, rates);
    expect(result).toBe('monthly');
  });

  it('should return daily when only daily rate available', () => {
    const rates = {
      daily: createEffectiveRate(50, 'daily'),
    };

    const result = getBestRateType(14, rates);
    expect(result).toBe('daily');
  });

  it('should return hourly for very short rentals', () => {
    const rates = {
      daily: createEffectiveRate(50, 'daily'),
      hourly: createEffectiveRate(10, 'hourly'),
    };

    // Less than 1 day
    const result = getBestRateType(0.5, rates);
    expect(result).toBe('hourly');
  });
});

// ============================================================================
// PRICE FOR DURATION TESTS
// ============================================================================

describe('calculatePriceForDuration', () => {
  it('should calculate daily rate correctly', () => {
    const rates = createVehicleRates(50);
    const result = calculatePriceForDuration(5, rates);

    expect(result.total).toBe(250);
    expect(result.rateType).toBe('daily');
    expect(result.effectiveDailyRate).toBe(50);
  });

  it('should use weekly rate when beneficial', () => {
    const rates = createVehicleRates(50, 280);
    const result = calculatePriceForDuration(7, rates);

    expect(result.rateType).toBe('weekly');
    expect(result.total).toBe(280);
    expect(result.effectiveDailyRate).toBe(40);
  });

  it('should use monthly rate when beneficial', () => {
    const rates = createVehicleRates(50, 300, 1200);
    const result = calculatePriceForDuration(30, rates);

    expect(result.rateType).toBe('monthly');
    expect(result.total).toBe(1200);
    expect(result.effectiveDailyRate).toBe(40);
  });
});

// ============================================================================
// SEASONAL MULTIPLIER TESTS
// ============================================================================

describe('applySeasonalMultiplier', () => {
  it('should apply multiplier correctly', () => {
    const result = applySeasonalMultiplier(100, 1.5);

    expect(result.total).toBe(150);
    expect(result.adjustment).toBe(50);
  });

  it('should handle no change (1.0 multiplier)', () => {
    const result = applySeasonalMultiplier(100, 1.0);

    expect(result.total).toBe(100);
    expect(result.adjustment).toBe(0);
  });

  it('should handle discount multiplier (< 1.0)', () => {
    const result = applySeasonalMultiplier(100, 0.8);

    expect(result.total).toBe(80);
    expect(result.adjustment).toBe(-20);
  });

  it('should round to 2 decimal places', () => {
    const result = applySeasonalMultiplier(33.33, 1.15);

    expect(result.total).toBe(38.33);
    expect(result.adjustment).toBe(5);
  });
});

// ============================================================================
// DISCOUNT CALCULATION TESTS
// ============================================================================

describe('calculateDiscount', () => {
  describe('percentage discount', () => {
    it('should calculate 10% discount correctly', () => {
      const discount = calculateDiscount(100, 'percentage', 10);
      expect(discount).toBe(10);
    });

    it('should calculate 25% discount correctly', () => {
      const discount = calculateDiscount(200, 'percentage', 25);
      expect(discount).toBe(50);
    });

    it('should round to 2 decimal places', () => {
      const discount = calculateDiscount(33.33, 'percentage', 15);
      expect(discount).toBe(5);
    });
  });

  describe('fixed amount discount', () => {
    it('should apply fixed discount when less than subtotal', () => {
      const discount = calculateDiscount(100, 'fixed_amount', 30);
      expect(discount).toBe(30);
    });

    it('should cap discount at subtotal', () => {
      const discount = calculateDiscount(50, 'fixed_amount', 100);
      expect(discount).toBe(50);
    });
  });

  describe('free addon discount', () => {
    it('should return 0 for free addon type', () => {
      const discount = calculateDiscount(100, 'free_addon', 50);
      expect(discount).toBe(0);
    });
  });
});

// ============================================================================
// FORMAT FUNCTIONS TESTS
// ============================================================================

describe('formatRateType', () => {
  it('should format all rate types correctly', () => {
    expect(formatRateType('hourly')).toBe('per hour');
    expect(formatRateType('daily')).toBe('per day');
    expect(formatRateType('weekly')).toBe('per week');
    expect(formatRateType('monthly')).toBe('per month');
  });
});

describe('formatPriceType', () => {
  it('should format all price types correctly', () => {
    expect(formatPriceType('per_day')).toBe('per day');
    expect(formatPriceType('per_rental')).toBe('per rental');
    expect(formatPriceType('one_time')).toBe('one-time');
  });
});

describe('formatDiscountType', () => {
  it('should format percentage discount', () => {
    expect(formatDiscountType('percentage', 15)).toBe('15% off');
  });

  it('should format fixed amount discount', () => {
    expect(formatDiscountType('fixed_amount', 50)).toBe('50 off');
  });

  it('should format free addon discount', () => {
    expect(formatDiscountType('free_addon', 0)).toBe('Free add-on');
  });
});

// ============================================================================
// COUPON HELPER TESTS
// ============================================================================

describe('isCouponDateValid', () => {
  it('should return true for currently valid coupon', () => {
    const coupon = createCoupon({
      validFrom: '2020-01-01T00:00:00Z',
      validUntil: '2030-12-31T23:59:59Z',
    });

    expect(isCouponDateValid(coupon)).toBe(true);
  });

  it('should return false for expired coupon', () => {
    const coupon = createCoupon({
      validFrom: '2020-01-01T00:00:00Z',
      validUntil: '2020-12-31T23:59:59Z',
    });

    expect(isCouponDateValid(coupon)).toBe(false);
  });

  it('should return false for future coupon', () => {
    const coupon = createCoupon({
      validFrom: '2030-01-01T00:00:00Z',
      validUntil: '2030-12-31T23:59:59Z',
    });

    expect(isCouponDateValid(coupon)).toBe(false);
  });
});

describe('hasCouponUsesRemaining', () => {
  it('should return true when no usage limit', () => {
    const coupon = createCoupon({
      usageLimit: null,
      usageCount: 100,
    });

    expect(hasCouponUsesRemaining(coupon)).toBe(true);
  });

  it('should return true when under usage limit', () => {
    const coupon = createCoupon({
      usageLimit: 10,
      usageCount: 5,
    });

    expect(hasCouponUsesRemaining(coupon)).toBe(true);
  });

  it('should return false when at usage limit', () => {
    const coupon = createCoupon({
      usageLimit: 10,
      usageCount: 10,
    });

    expect(hasCouponUsesRemaining(coupon)).toBe(false);
  });

  it('should return false when over usage limit', () => {
    const coupon = createCoupon({
      usageLimit: 10,
      usageCount: 15,
    });

    expect(hasCouponUsesRemaining(coupon)).toBe(false);
  });
});

// ============================================================================
// DURATION CALCULATOR TESTS
// ============================================================================

describe('calculateDurationTier', () => {
  it('should calculate weekly tier correctly', () => {
    const weeklyRate = createEffectiveRate(280, 'weekly');
    const dailyRate = createEffectiveRate(50, 'daily');

    const tier = calculateDurationTier('weekly', weeklyRate, dailyRate);

    expect(tier.rateType).toBe('weekly');
    expect(tier.days).toBe(7);
    expect(tier.totalRate).toBe(280);
    expect(tier.effectiveDailyRate).toBe(40);
    expect(tier.savings).toBe(70); // 350 - 280
    expect(tier.savingsPercent).toBe(20);
  });

  it('should calculate monthly tier correctly', () => {
    const monthlyRate = createEffectiveRate(1200, 'monthly');
    const dailyRate = createEffectiveRate(50, 'daily');

    const tier = calculateDurationTier('monthly', monthlyRate, dailyRate);

    expect(tier.rateType).toBe('monthly');
    expect(tier.days).toBe(30);
    expect(tier.totalRate).toBe(1200);
    expect(tier.effectiveDailyRate).toBe(40);
    expect(tier.savings).toBe(300); // 1500 - 1200
    expect(tier.savingsPercent).toBe(20);
  });
});

describe('getAvailableDurationTiers', () => {
  it('should return empty array when only daily rate', () => {
    const rates = createVehicleRates(50);
    const tiers = getAvailableDurationTiers(rates);

    expect(tiers).toHaveLength(0);
  });

  it('should return weekly tier when weekly rate available', () => {
    const rates = createVehicleRates(50, 280);
    const tiers = getAvailableDurationTiers(rates);

    expect(tiers).toHaveLength(1);
    expect(tiers[0].rateType).toBe('weekly');
  });

  it('should return both tiers when all rates available', () => {
    const rates = createVehicleRates(50, 280, 1200);
    const tiers = getAvailableDurationTiers(rates);

    expect(tiers).toHaveLength(2);
    expect(tiers.map(t => t.rateType)).toContain('weekly');
    expect(tiers.map(t => t.rateType)).toContain('monthly');
  });
});

describe('calculateOptimalDurationPricing', () => {
  it('should use daily rate for short rentals', () => {
    const rates = createVehicleRates(50, 280, 1200);
    const result = calculateOptimalDurationPricing(3, rates);

    expect(result.bestRateType).toBe('daily');
    expect(result.total).toBe(150);
    expect(result.requestedDays).toBe(3);
  });

  it('should use weekly rate when it saves money', () => {
    const rates = createVehicleRates(50, 280, 1200);
    const result = calculateOptimalDurationPricing(7, rates);

    expect(result.bestRateType).toBe('weekly');
    expect(result.total).toBe(280);
  });

  it('should handle partial weeks correctly', () => {
    const rates = createVehicleRates(50, 280, 1200);
    const result = calculateOptimalDurationPricing(10, rates);

    // Should be either 1 week + 3 days or 2 weeks, whichever is cheaper
    // 1 week (280) + 3 days (150) = 430
    // 2 weeks = 560
    expect(result.total).toBe(430);
  });

  it('should provide alternatives', () => {
    const rates = createVehicleRates(50, 280, 1200);
    const result = calculateOptimalDurationPricing(7, rates);

    expect(result.alternatives.length).toBeGreaterThan(0);
  });
});

describe('getDurationDiscount', () => {
  it('should return null for very short rentals', () => {
    const discount = getDurationDiscount(2);
    expect(discount).toBeNull();
  });

  it('should return 5% discount for 3-6 days', () => {
    const discount = getDurationDiscount(4);
    expect(discount).not.toBeNull();
    expect(discount?.value).toBe(5);
  });

  it('should return 10% discount for 7-13 days', () => {
    const discount = getDurationDiscount(10);
    expect(discount).not.toBeNull();
    expect(discount?.value).toBe(10);
  });

  it('should return 15% discount for 14-29 days', () => {
    const discount = getDurationDiscount(20);
    expect(discount).not.toBeNull();
    expect(discount?.value).toBe(15);
  });

  it('should return 20% discount for 30+ days', () => {
    const discount = getDurationDiscount(45);
    expect(discount).not.toBeNull();
    expect(discount?.value).toBe(20);
  });
});

describe('applyDurationDiscount', () => {
  it('should apply percentage discount correctly', () => {
    const discount = {
      minDays: 7,
      discountType: 'percentage' as const,
      value: 10
    };

    const result = applyDurationDiscount(300, discount);

    expect(result.discountAmount).toBe(30);
    expect(result.finalPrice).toBe(270);
  });

  it('should round to 2 decimal places', () => {
    const discount = {
      minDays: 7,
      discountType: 'percentage' as const,
      value: 15
    };

    const result = applyDurationDiscount(333.33, discount);

    expect(result.discountAmount).toBe(50);
    expect(result.finalPrice).toBe(283.33);
  });
});

describe('formatDuration', () => {
  it('should format 1 day', () => {
    expect(formatDuration(1)).toBe('1 day');
  });

  it('should format multiple days', () => {
    expect(formatDuration(5)).toBe('5 days');
  });

  it('should format 1 week', () => {
    expect(formatDuration(7)).toBe('1 week');
  });

  it('should format 2 weeks', () => {
    expect(formatDuration(14)).toBe('2 weeks');
  });

  it('should format 1 month', () => {
    expect(formatDuration(30)).toBe('1 month');
  });

  it('should format weeks and days', () => {
    expect(formatDuration(10)).toBe('10 days');
  });

  it('should format months and days', () => {
    expect(formatDuration(35)).toBe('1 month, 5 days');
  });
});

describe('getRentalDuration', () => {
  it('should calculate duration correctly', () => {
    const result = getRentalDuration(
      '2024-01-10T10:00:00Z',
      '2024-01-17T10:00:00Z'
    );

    expect(result.days).toBe(7);
    expect(result.hours).toBe(168);
    expect(result.formatted).toBe('1 week');
  });

  it('should handle Date objects', () => {
    const result = getRentalDuration(
      new Date('2024-01-10T10:00:00Z'),
      new Date('2024-01-15T10:00:00Z')
    );

    expect(result.days).toBe(5);
  });
});

describe('comparePricingOptions', () => {
  it('should suggest weekly upgrade when close to 7 days', () => {
    const rates = createVehicleRates(50, 280, 1200);
    const result = comparePricingOptions(6, rates);

    expect(result.suggestions.some(s => s.days === 7)).toBe(true);
  });

  it('should suggest monthly upgrade when close to 30 days', () => {
    const rates = createVehicleRates(50, 280, 1200);
    const result = comparePricingOptions(26, rates);

    expect(result.suggestions.some(s => s.days === 30)).toBe(true);
  });

  it('should return requested pricing', () => {
    const rates = createVehicleRates(50, 280);
    const result = comparePricingOptions(5, rates);

    expect(result.requested.days).toBe(5);
    expect(result.requested.total).toBe(250);
  });
});

describe('checkDurationUpgrade', () => {
  it('should suggest week upgrade when close', () => {
    const rates = createVehicleRates(50, 280);
    const result = checkDurationUpgrade(6, rates);

    expect(result.shouldUpgrade).toBe(true);
    expect(result.upgradeToDays).toBe(7);
  });

  it('should not suggest upgrade when not beneficial', () => {
    const rates = createVehicleRates(30, 280); // Weekly more expensive per day
    const result = checkDurationUpgrade(6, rates);

    expect(result.shouldUpgrade).toBe(false);
  });

  it('should not suggest upgrade for short rentals', () => {
    const rates = createVehicleRates(50, 280);
    const result = checkDurationUpgrade(3, rates);

    expect(result.shouldUpgrade).toBe(false);
  });
});

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('Constants', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_CURRENCY).toBe('EUR');
    expect(DAYS_PER_WEEK).toBe(7);
    expect(DAYS_PER_MONTH).toBe(30);
  });

  it('should have duration thresholds defined', () => {
    expect(DURATION_THRESHOLDS.weeklyMinDays).toBe(5);
    expect(DURATION_THRESHOLDS.weeklyFullDays).toBe(7);
    expect(DURATION_THRESHOLDS.monthlyMinDays).toBe(21);
    expect(DURATION_THRESHOLDS.monthlyFullDays).toBe(30);
  });

  it('should have default duration discounts', () => {
    expect(DEFAULT_DURATION_DISCOUNTS.length).toBe(4);
    expect(DEFAULT_DURATION_DISCOUNTS[0].minDays).toBe(3);
  });
});

// ============================================================================
// ZOD SCHEMA VALIDATION TESTS
// ============================================================================

describe('createPricingRuleSchema', () => {
  it('should validate correct input with category', () => {
    const input = {
      categoryId: '123e4567-e89b-12d3-a456-426614174000',
      rateType: 'daily',
      amount: 50,
    };

    const result = createPricingRuleSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should validate correct input with vehicle', () => {
    const input = {
      vehicleId: '123e4567-e89b-12d3-a456-426614174000',
      rateType: 'weekly',
      amount: 300,
    };

    const result = createPricingRuleSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject when both category and vehicle provided', () => {
    const input = {
      categoryId: '123e4567-e89b-12d3-a456-426614174000',
      vehicleId: '123e4567-e89b-12d3-a456-426614174001',
      rateType: 'daily',
      amount: 50,
    };

    const result = createPricingRuleSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject when neither category nor vehicle provided', () => {
    const input = {
      rateType: 'daily',
      amount: 50,
    };

    const result = createPricingRuleSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject negative amount', () => {
    const input = {
      categoryId: '123e4567-e89b-12d3-a456-426614174000',
      rateType: 'daily',
      amount: -50,
    };

    const result = createPricingRuleSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should validate duration constraints', () => {
    const input = {
      categoryId: '123e4567-e89b-12d3-a456-426614174000',
      rateType: 'daily',
      amount: 50,
      minDuration: 7,
      maxDuration: 30,
    };

    const result = createPricingRuleSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject when min > max duration', () => {
    const input = {
      categoryId: '123e4567-e89b-12d3-a456-426614174000',
      rateType: 'daily',
      amount: 50,
      minDuration: 30,
      maxDuration: 7,
    };

    const result = createPricingRuleSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('createSeasonSchema', () => {
  it('should validate correct input', () => {
    const input = {
      name: 'Summer Peak',
      startDate: '2024-06-01',
      endDate: '2024-08-31',
      multiplier: 1.5,
    };

    const result = createSeasonSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject end date before start date', () => {
    const input = {
      name: 'Summer Peak',
      startDate: '2024-08-31',
      endDate: '2024-06-01',
      multiplier: 1.5,
    };

    const result = createSeasonSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject multiplier over 10', () => {
    const input = {
      name: 'Extreme Peak',
      startDate: '2024-06-01',
      endDate: '2024-08-31',
      multiplier: 15,
    };

    const result = createSeasonSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject negative multiplier', () => {
    const input = {
      name: 'Discount Season',
      startDate: '2024-01-01',
      endDate: '2024-02-28',
      multiplier: -0.5,
    };

    const result = createSeasonSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('createCouponSchema', () => {
  it('should validate correct percentage coupon', () => {
    const input = {
      code: 'SAVE20',
      discountType: 'percentage',
      discountValue: 20,
      validFrom: '2024-01-01T00:00:00Z',
      validUntil: '2024-12-31T23:59:59Z',
    };

    const result = createCouponSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should transform code to uppercase', () => {
    const input = {
      code: 'save20',
      discountType: 'percentage',
      discountValue: 20,
      validFrom: '2024-01-01T00:00:00Z',
      validUntil: '2024-12-31T23:59:59Z',
    };

    const result = createCouponSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('SAVE20');
    }
  });

  it('should reject percentage over 100', () => {
    const input = {
      code: 'TOOMUCH',
      discountType: 'percentage',
      discountValue: 150,
      validFrom: '2024-01-01T00:00:00Z',
      validUntil: '2024-12-31T23:59:59Z',
    };

    const result = createCouponSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should require addon ID for free_addon type', () => {
    const input = {
      code: 'FREEADDON',
      discountType: 'free_addon',
      discountValue: 1,
      validFrom: '2024-01-01T00:00:00Z',
      validUntil: '2024-12-31T23:59:59Z',
    };

    const result = createCouponSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept free_addon with addon ID', () => {
    const input = {
      code: 'FREEADDON',
      discountType: 'free_addon',
      discountValue: 1,
      freeAddonId: '123e4567-e89b-12d3-a456-426614174000',
      validFrom: '2024-01-01T00:00:00Z',
      validUntil: '2024-12-31T23:59:59Z',
    };

    const result = createCouponSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject valid until before valid from', () => {
    const input = {
      code: 'INVALID',
      discountType: 'percentage',
      discountValue: 10,
      validFrom: '2024-12-31T23:59:59Z',
      validUntil: '2024-01-01T00:00:00Z',
    };

    const result = createCouponSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('pricingCalculationInputSchema', () => {
  it('should validate correct input', () => {
    const input = {
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      vehicleId: '123e4567-e89b-12d3-a456-426614174001',
      categoryId: '123e4567-e89b-12d3-a456-426614174002',
      pickupAt: '2024-01-10T10:00:00Z',
      returnAt: '2024-01-17T10:00:00Z',
      pickupBranchId: '123e4567-e89b-12d3-a456-426614174003',
    };

    const result = pricingCalculationInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject when return is before pickup', () => {
    const input = {
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      vehicleId: '123e4567-e89b-12d3-a456-426614174001',
      categoryId: '123e4567-e89b-12d3-a456-426614174002',
      pickupAt: '2024-01-17T10:00:00Z',
      returnAt: '2024-01-10T10:00:00Z',
      pickupBranchId: '123e4567-e89b-12d3-a456-426614174003',
    };

    const result = pricingCalculationInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept optional addon selections', () => {
    const input = {
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      vehicleId: '123e4567-e89b-12d3-a456-426614174001',
      categoryId: '123e4567-e89b-12d3-a456-426614174002',
      pickupAt: '2024-01-10T10:00:00Z',
      returnAt: '2024-01-17T10:00:00Z',
      pickupBranchId: '123e4567-e89b-12d3-a456-426614174003',
      addons: [
        { addonId: '123e4567-e89b-12d3-a456-426614174004', quantity: 1 },
        { addonId: '123e4567-e89b-12d3-a456-426614174005', quantity: 2 },
      ],
    };

    const result = pricingCalculationInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});
