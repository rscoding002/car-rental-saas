'use client';

/**
 * Duration Pricing Display Component
 *
 * Shows weekly/monthly rate options and savings to customers.
 * Mobile-first responsive design with clear pricing comparison.
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Check, TrendingDown, Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { VehicleRates, DurationTier, RateType } from '@/lib/pricing/types';
import {
  getAvailableDurationTiers,
  calculateOptimalDurationPricing,
  comparePricingOptions,
  formatDuration,
} from '@/lib/pricing/duration-calculator';

// ============================================================================
// TYPES
// ============================================================================

export interface DurationPricingProps {
  /** Vehicle rates with weekly/monthly options */
  rates: VehicleRates;
  /** Selected rental duration in days */
  selectedDays: number;
  /** Currency code for formatting */
  currency?: string;
  /** Locale for number formatting */
  locale?: string;
  /** Callback when user selects a different duration */
  onDurationChange?: (days: number) => void;
  /** Show compact version */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

export interface DurationTierCardProps {
  tier: DurationTier;
  isSelected: boolean;
  isBestValue: boolean;
  currency: string;
  locale: string;
  onSelect?: () => void;
}

export interface PricingSuggestionProps {
  suggestion: {
    days: number;
    total: number;
    dailyRate: number;
    label: string;
    savingsPercent: number;
  };
  currency: string;
  locale: string;
  onSelect?: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatPrice(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getRateTypeLabel(rateType: RateType): string {
  const labels: Record<RateType, string> = {
    hourly: 'Hourly',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
  };
  return labels[rateType];
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Individual duration tier card
 */
function DurationTierCard({
  tier,
  isSelected,
  isBestValue,
  currency,
  locale,
  onSelect,
}: DurationTierCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative flex flex-col p-4 rounded-lg border-2 transition-all text-left w-full',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      )}
    >
      {/* Best value badge */}
      {isBestValue && (
        <Badge
          variant="default"
          className="absolute -top-2 right-2 text-xs"
        >
          Best Value
        </Badge>
      )}

      {/* Rate type header */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-foreground">
          {getRateTypeLabel(tier.rateType)}
        </span>
        {isSelected && (
          <Check className="w-5 h-5 text-primary" />
        )}
      </div>

      {/* Duration */}
      <p className="text-sm text-muted-foreground mb-3">
        {tier.days} days
      </p>

      {/* Price */}
      <div className="mt-auto">
        <p className="text-2xl font-bold text-foreground">
          {formatPrice(tier.totalRate, currency, locale)}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatPrice(tier.effectiveDailyRate, currency, locale)}/day
        </p>
      </div>

      {/* Savings */}
      {tier.savings > 0 && (
        <div className="flex items-center gap-1 mt-3 text-green-600">
          <TrendingDown className="w-4 h-4" />
          <span className="text-sm font-medium">
            Save {tier.savingsPercent}%
          </span>
        </div>
      )}
    </button>
  );
}

/**
 * Pricing suggestion card for upgrade prompts
 */
function PricingSuggestion({
  suggestion,
  currency,
  locale,
  onSelect,
}: PricingSuggestionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex items-center justify-between w-full p-3 rounded-lg',
        'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800',
        'hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
          <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
        </div>
        <div className="text-left">
          <p className="font-medium text-green-800 dark:text-green-200">
            Upgrade to {suggestion.label}
          </p>
          <p className="text-sm text-green-600 dark:text-green-400">
            {formatPrice(suggestion.total, currency, locale)} total
          </p>
        </div>
      </div>
      <Badge variant="outline" className="bg-green-100 border-green-300 text-green-700">
        Save {suggestion.savingsPercent}%
      </Badge>
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Duration Pricing Display
 *
 * Shows available pricing tiers (daily, weekly, monthly) with savings calculations.
 * Provides upgrade suggestions when customer is close to a tier threshold.
 */
export function DurationPricingDisplay({
  rates,
  selectedDays,
  currency = 'EUR',
  locale = 'en',
  onDurationChange,
  compact = false,
  className,
}: DurationPricingProps) {
  // Calculate pricing information
  const pricingInfo = useMemo(() => {
    const optimal = calculateOptimalDurationPricing(selectedDays, rates);
    const tiers = getAvailableDurationTiers(rates);
    const comparison = comparePricingOptions(selectedDays, rates);

    // Add daily tier for comparison
    const dailyTier: DurationTier = {
      rateType: 'daily',
      days: 1,
      totalRate: rates.daily.amount,
      effectiveDailyRate: rates.daily.amount,
      savings: 0,
      savingsPercent: 0,
    };

    return {
      optimal,
      tiers: [dailyTier, ...tiers],
      suggestions: comparison.suggestions,
    };
  }, [rates, selectedDays]);

  // Find best value tier
  const bestValueTier = useMemo(() => {
    if (pricingInfo.tiers.length <= 1) return null;
    const tiersWithSavings = pricingInfo.tiers.filter((t) => t.savingsPercent > 0);
    if (tiersWithSavings.length === 0) return null;
    return tiersWithSavings.reduce((best, tier) =>
      tier.savingsPercent > best.savingsPercent ? tier : best
    );
  }, [pricingInfo.tiers]);

  // Compact version - just show current pricing summary
  if (compact) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {formatDuration(selectedDays)}
          </span>
          <span className="font-semibold">
            {formatPrice(pricingInfo.optimal.total, currency, locale)}
          </span>
        </div>
        {pricingInfo.optimal.bestRateType !== 'daily' && (
          <div className="flex items-center gap-1 text-green-600 text-sm">
            <TrendingDown className="w-3 h-3" />
            <span>
              {getRateTypeLabel(pricingInfo.optimal.bestRateType)} rate applied
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Current selection summary */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
        <Calendar className="w-5 h-5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">
            {formatDuration(selectedDays)}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatPrice(pricingInfo.optimal.effectiveDailyRate, currency, locale)}/day effective rate
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-foreground">
            {formatPrice(pricingInfo.optimal.total, currency, locale)}
          </p>
          <p className="text-xs text-muted-foreground">
            {getRateTypeLabel(pricingInfo.optimal.bestRateType)} rate
          </p>
        </div>
      </div>

      {/* Upgrade suggestions */}
      {pricingInfo.suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Save more with longer rentals
          </p>
          {pricingInfo.suggestions.map((suggestion) => (
            <PricingSuggestion
              key={suggestion.days}
              suggestion={suggestion}
              currency={currency}
              locale={locale}
              onSelect={() => onDurationChange?.(suggestion.days)}
            />
          ))}
        </div>
      )}

      {/* Available rate tiers */}
      {pricingInfo.tiers.length > 1 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Available rate options
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {pricingInfo.tiers.map((tier) => (
              <DurationTierCard
                key={tier.rateType}
                tier={tier}
                isSelected={pricingInfo.optimal.bestRateType === tier.rateType}
                isBestValue={bestValueTier?.rateType === tier.rateType}
                currency={currency}
                locale={locale}
                onSelect={() => onDurationChange?.(tier.days)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Rate info note */}
      <p className="text-xs text-muted-foreground">
        <Clock className="w-3 h-3 inline mr-1" />
        Weekly rates apply for 7+ days. Monthly rates apply for 30+ days.
        The best rate is automatically selected.
      </p>
    </div>
  );
}

/**
 * Inline duration pricing summary
 * For use in vehicle cards and lists
 */
export function DurationPricingSummary({
  rates,
  className,
  locale = 'en',
}: {
  rates: VehicleRates;
  className?: string;
  locale?: string;
}) {
  const tiers = useMemo(() => getAvailableDurationTiers(rates), [rates]);

  if (tiers.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {tiers.map((tier) => (
        <Badge
          key={tier.rateType}
          variant="secondary"
          className="text-xs"
        >
          {tier.rateType === 'weekly' ? '7 days' : '30 days'}:{' '}
          {formatPrice(tier.totalRate, rates.currency, locale)}
          {tier.savingsPercent > 0 && (
            <span className="ml-1 text-green-600">
              (-{tier.savingsPercent}%)
            </span>
          )}
        </Badge>
      ))}
    </div>
  );
}

export default DurationPricingDisplay;
