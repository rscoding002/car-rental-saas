'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Info,
  Tag,
  Check,
  ChevronDown,
  ChevronUp,
  Percent,
  Calendar,
  Package,
  MapPin,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import type { PricingBreakdown, SelectedAddon, AppliedCoupon } from '@/lib/pricing/types';

// ============================================================================
// TYPES
// ============================================================================

export interface PriceBreakdownProps {
  /** Pricing breakdown data */
  pricing: PricingBreakdown | null;

  /** Number of rental days */
  rentalDays: number;

  /** Is one-way rental */
  isOneWay?: boolean;

  /** Locale for formatting */
  locale: string;

  /** Show detailed breakdown or compact view */
  variant?: 'full' | 'compact' | 'minimal';

  /** Show "What's Included" section */
  showInclusions?: boolean;

  /** Show add-on details */
  showAddonDetails?: boolean;

  /** Custom title */
  title?: string;

  /** Custom class name */
  className?: string;

  /** Expandable on mobile */
  collapsible?: boolean;

  /** Default expanded state */
  defaultExpanded?: boolean;
}

export interface PriceLineProps {
  label: string;
  amount: number;
  currency: string;
  locale: string;
  variant?: 'default' | 'discount' | 'fee' | 'subtotal' | 'total';
  info?: string;
  prefix?: string;
}

export interface PriceSummaryProps {
  total: number;
  currency: string;
  locale: string;
  dailyRate?: number;
  rentalDays?: number;
  showDailyAverage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// PRICE LINE COMPONENT
// ============================================================================

/**
 * Single line item in the price breakdown
 */
export function PriceLine({
  label,
  amount,
  currency,
  locale,
  variant = 'default',
  info,
  prefix,
}: PriceLineProps) {
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const variantStyles = {
    default: 'text-foreground',
    discount: 'text-green-600 dark:text-green-400',
    fee: 'text-amber-600 dark:text-amber-400',
    subtotal: 'font-medium text-foreground',
    total: 'font-bold text-foreground',
  };

  const displayAmount = prefix
    ? `${prefix}${formatPrice(Math.abs(amount))}`
    : formatPrice(amount);

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {label}
        {info && (
          <span className="text-xs text-muted-foreground/70">({info})</span>
        )}
      </span>
      <span className={cn(variantStyles[variant])}>{displayAmount}</span>
    </div>
  );
}

// ============================================================================
// PRICE SUMMARY COMPONENT
// ============================================================================

/**
 * Total price summary with optional daily average
 */
export function PriceSummary({
  total,
  currency,
  locale,
  dailyRate,
  rentalDays,
  showDailyAverage = true,
  size = 'md',
}: PriceSummaryProps) {
  const tCommon = useTranslations('common');

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const sizeStyles = {
    sm: { total: 'text-lg font-bold', label: 'text-sm font-medium', daily: 'text-xs' },
    md: { total: 'text-2xl font-bold', label: 'text-base font-semibold', daily: 'text-sm' },
    lg: { total: 'text-3xl font-bold', label: 'text-lg font-semibold', daily: 'text-sm' },
  };

  const effectiveDailyRate = dailyRate || (rentalDays && rentalDays > 0 ? total / rentalDays : null);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={sizeStyles[size].label}>{tCommon('total')}</span>
        <span className={cn(sizeStyles[size].total, 'text-primary')}>
          {formatPrice(total)}
        </span>
      </div>
      {showDailyAverage && effectiveDailyRate && (
        <p className={cn('text-right text-muted-foreground', sizeStyles[size].daily)}>
          {formatPrice(effectiveDailyRate)}/{tCommon('perDay')} {tCommon('average')}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// MAIN PRICE BREAKDOWN COMPONENT
// ============================================================================

/**
 * Price Breakdown Component
 *
 * Displays itemized pricing breakdown with support for:
 * - Base rate and duration
 * - Seasonal adjustments
 * - Add-ons with details
 * - One-way fees
 * - Coupon discounts
 * - Total with daily average
 *
 * Multiple display variants: full, compact, minimal
 */
export function PriceBreakdown({
  pricing,
  rentalDays,
  isOneWay = false,
  locale,
  variant = 'full',
  showInclusions = false,
  showAddonDetails = true,
  title,
  className,
  collapsible = false,
  defaultExpanded = true,
}: PriceBreakdownProps) {
  const t = useTranslations('booking');
  const tCommon = useTranslations('common');
  const tVehicle = useTranslations('vehicle');

  const [isExpanded, setIsExpanded] = useMemo(() => {
    // This is a workaround since we can't use useState in useMemo
    // For actual collapsible behavior, we'd use useState
    return [defaultExpanded, () => {}] as const;
  }, [defaultExpanded]);

  // Format price helper
  const formatPrice = (amount: number, curr: string = pricing?.currency || 'EUR') => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // No pricing available
  if (!pricing) {
    return (
      <PriceBreakdownEmpty
        rentalDays={rentalDays}
        isOneWay={isOneWay}
        locale={locale}
        title={title}
        className={className}
      />
    );
  }

  const currency = pricing.currency;

  // Render minimal variant
  if (variant === 'minimal') {
    return (
      <div className={cn('space-y-2', className)}>
        <PriceSummary
          total={pricing.total}
          currency={currency}
          locale={locale}
          rentalDays={rentalDays}
          size="sm"
        />
      </div>
    );
  }

  // Render compact variant
  if (variant === 'compact') {
    return (
      <div className={cn('space-y-3', className)}>
        {/* Key items only */}
        <PriceLine
          label={`${t('baseRate')} (${rentalDays} ${tCommon('days')})`}
          amount={pricing.subtotal}
          currency={currency}
          locale={locale}
        />

        {pricing.addonsTotal > 0 && (
          <PriceLine
            label={t('addonsTotal')}
            amount={pricing.addonsTotal}
            currency={currency}
            locale={locale}
          />
        )}

        {pricing.coupon && pricing.discountAmount > 0 && (
          <PriceLine
            label={t('couponDiscount')}
            amount={pricing.discountAmount}
            currency={currency}
            locale={locale}
            variant="discount"
            prefix="-"
          />
        )}

        <div className="border-t pt-2">
          <PriceSummary
            total={pricing.total}
            currency={currency}
            locale={locale}
            rentalDays={rentalDays}
            size="sm"
          />
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title || t('priceBreakdown')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Base Rate */}
        <PriceLine
          label={t('baseRate')}
          amount={pricing.subtotal}
          currency={currency}
          locale={locale}
          info={`${rentalDays} ${tCommon('days')}`}
        />

        {/* Seasonal Adjustment */}
        {pricing.season && pricing.season.amount !== 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {t('seasonalAdjustment')}
              <Badge variant="secondary" className="ml-1 text-xs">
                {pricing.season.name}
              </Badge>
            </span>
            <span
              className={cn(
                pricing.season.amount > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-green-600 dark:text-green-400'
              )}
            >
              {pricing.season.amount > 0 ? '+' : ''}
              {formatPrice(pricing.season.amount)}
            </span>
          </div>
        )}

        {/* Add-ons */}
        {pricing.addonsTotal > 0 && (
          <>
            {showAddonDetails && pricing.addons.length > 0 ? (
              <AddonBreakdown
                addons={pricing.addons}
                total={pricing.addonsTotal}
                currency={currency}
                locale={locale}
              />
            ) : (
              <PriceLine
                label={t('addonsTotal')}
                amount={pricing.addonsTotal}
                currency={currency}
                locale={locale}
              />
            )}
          </>
        )}

        {/* One-way Fee */}
        {isOneWay && pricing.oneWayFee > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {t('oneWayFee')}
            </span>
            <span>{formatPrice(pricing.oneWayFee)}</span>
          </div>
        )}

        {/* Coupon Discount */}
        {pricing.coupon && pricing.discountAmount > 0 && (
          <CouponBreakdown
            coupon={pricing.coupon}
            discountAmount={pricing.discountAmount}
            currency={currency}
            locale={locale}
          />
        )}

        {/* Divider */}
        <div className="border-t pt-2" />

        {/* Total */}
        <PriceSummary
          total={pricing.total}
          currency={currency}
          locale={locale}
          rentalDays={rentalDays}
          size="md"
        />

        {/* What's Included */}
        {showInclusions && <InclusionsList />}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface AddonBreakdownProps {
  addons: SelectedAddon[];
  total: number;
  currency: string;
  locale: string;
}

function AddonBreakdown({ addons, total, currency, locale }: AddonBreakdownProps) {
  const t = useTranslations('booking');

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Package className="h-3.5 w-3.5" />
        {t('addons')}
      </div>
      <div className="ml-5 space-y-1 text-sm">
        {addons.map((addon) => (
          <div key={addon.addonId} className="flex justify-between">
            <span className="text-muted-foreground">
              {addon.name}
              {addon.quantity > 1 && ` x${addon.quantity}`}
            </span>
            <span>{formatPrice(addon.totalPrice)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CouponBreakdownProps {
  coupon: AppliedCoupon;
  discountAmount: number;
  currency: string;
  locale: string;
}

function CouponBreakdown({ coupon, discountAmount, currency, locale }: CouponBreakdownProps) {
  const t = useTranslations('booking');

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const discountLabel =
    coupon.discountType === 'percentage'
      ? `${coupon.discountValue}% off`
      : coupon.discountType === 'free_addon'
      ? 'Free add-on'
      : '';

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
        <Tag className="h-3.5 w-3.5" />
        {t('couponDiscount')}
        <Badge variant="secondary" className="ml-1 text-xs">
          {coupon.code}
        </Badge>
        {discountLabel && (
          <span className="text-xs text-muted-foreground">({discountLabel})</span>
        )}
      </span>
      <span className="text-green-600 dark:text-green-400">
        -{formatPrice(discountAmount)}
      </span>
    </div>
  );
}

function InclusionsList() {
  const t = useTranslations('booking');
  const tVehicle = useTranslations('vehicle');

  const inclusions = [
    { key: 'unlimitedMileage', label: tVehicle('unlimitedMileage') },
    { key: 'basicInsurance', label: t('basicInsurance') },
    { key: 'taxes', label: t('taxes') },
    { key: '24hSupport', label: t('24hSupport') },
  ];

  return (
    <div className="mt-4 border-t pt-4">
      <p className="mb-2 text-sm font-medium">{t('whatsIncluded')}</p>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {inclusions.map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface PriceBreakdownEmptyProps {
  rentalDays: number;
  isOneWay: boolean;
  locale: string;
  title?: string;
  className?: string;
}

function PriceBreakdownEmpty({
  rentalDays,
  isOneWay,
  locale,
  title,
  className,
}: PriceBreakdownEmptyProps) {
  const t = useTranslations('booking');
  const tCommon = useTranslations('common');

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title || t('priceBreakdown')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('rentalDays')}</span>
          <span>{rentalDays}</span>
        </div>
        {isOneWay && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('oneWayFee')}</span>
            <span>{t('applies')}</span>
          </div>
        )}
        <div className="border-t pt-2" />
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {t('priceCalculatedAtCheckout')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// INLINE PRICE DISPLAY
// ============================================================================

export interface InlinePriceProps {
  amount: number;
  currency: string;
  locale: string;
  perUnit?: 'day' | 'hour' | 'week' | 'month' | 'rental';
  originalAmount?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Inline price display with optional per-unit suffix and strikethrough for discounts
 */
export function InlinePrice({
  amount,
  currency,
  locale,
  perUnit,
  originalAmount,
  size = 'md',
  className,
}: InlinePriceProps) {
  const tCommon = useTranslations('common');

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const unitLabels: Record<string, string> = {
    day: tCommon('perDay'),
    hour: tCommon('perHour'),
    week: tCommon('perWeek'),
    month: tCommon('perMonth'),
    rental: '/rental',
  };

  const sizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const hasDiscount = originalAmount && originalAmount > amount;

  return (
    <span className={cn('inline-flex items-baseline gap-1.5', className)}>
      {hasDiscount && (
        <span className={cn('text-muted-foreground line-through', sizeStyles[size])}>
          {formatPrice(originalAmount)}
        </span>
      )}
      <span className={cn('font-bold', sizeStyles[size])}>
        {formatPrice(amount)}
      </span>
      {perUnit && (
        <span className="text-sm text-muted-foreground">
          {unitLabels[perUnit] || `/${perUnit}`}
        </span>
      )}
    </span>
  );
}

// ============================================================================
// SAVINGS BADGE
// ============================================================================

export interface SavingsBadgeProps {
  originalAmount: number;
  discountedAmount: number;
  currency: string;
  locale: string;
  showPercentage?: boolean;
  className?: string;
}

/**
 * Badge showing savings amount or percentage
 */
export function SavingsBadge({
  originalAmount,
  discountedAmount,
  currency,
  locale,
  showPercentage = true,
  className,
}: SavingsBadgeProps) {
  const savings = originalAmount - discountedAmount;
  const savingsPercent = Math.round((savings / originalAmount) * 100);

  if (savings <= 0) return null;

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Badge
      variant="secondary"
      className={cn(
        'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
        className
      )}
    >
      <Percent className="mr-1 h-3 w-3" />
      {showPercentage
        ? `Save ${savingsPercent}%`
        : `Save ${formatPrice(savings)}`}
    </Badge>
  );
}
