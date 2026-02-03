'use client';

import { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Minus,
  Check,
  Info,
  Package,
  ShieldCheck,
  Baby,
  Navigation,
  Wifi,
  Snowflake,
  Bike,
  Luggage,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import { BookingStepWrapper } from './booking-form';
import { useBooking } from './booking-context';
import type { Addon } from '@/lib/supabase/types';
import type { AddonData, PriceType } from '@/lib/pricing/types';
import { calculateAddonPrice } from '@/lib/pricing/addon-calculator';

// ============================================================================
// TYPES
// ============================================================================

interface BookingStepAddonsProps {
  /** Locale for translations and formatting */
  locale: string;

  /** Custom class name */
  className?: string;
}

interface AddonSelection {
  addonId: string;
  quantity: number;
}

// ============================================================================
// ICON MAPPING
// ============================================================================

const ADDON_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  insurance: ShieldCheck,
  child_seat: Baby,
  gps: Navigation,
  wifi: Wifi,
  snow_chains: Snowflake,
  bike_rack: Bike,
  luggage: Luggage,
  default: Package,
};

function getAddonIcon(addonName: string): React.ComponentType<{ className?: string }> {
  const lowerName = addonName.toLowerCase();

  if (lowerName.includes('insurance') || lowerName.includes('protection')) {
    return ADDON_ICONS.insurance;
  }
  if (lowerName.includes('child') || lowerName.includes('baby') || lowerName.includes('seat')) {
    return ADDON_ICONS.child_seat;
  }
  if (lowerName.includes('gps') || lowerName.includes('navigation')) {
    return ADDON_ICONS.gps;
  }
  if (lowerName.includes('wifi') || lowerName.includes('internet') || lowerName.includes('hotspot')) {
    return ADDON_ICONS.wifi;
  }
  if (lowerName.includes('snow') || lowerName.includes('chain') || lowerName.includes('winter')) {
    return ADDON_ICONS.snow_chains;
  }
  if (lowerName.includes('bike') || lowerName.includes('rack')) {
    return ADDON_ICONS.bike_rack;
  }
  if (lowerName.includes('luggage') || lowerName.includes('bag')) {
    return ADDON_ICONS.luggage;
  }

  return ADDON_ICONS.default;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Booking Step 2: Add-ons Selection
 *
 * Displays available add-ons with pricing and allows customers
 * to select extras for their rental.
 *
 * Mobile-first design with grid layout.
 */
export function BookingStepAddons({
  locale,
  className,
}: BookingStepAddonsProps) {
  const t = useTranslations('booking');
  const tCommon = useTranslations('common');

  const { state, setStep2Data } = useBooking();
  const { availableAddons, rentalDays, pricing, step2Data } = state;

  // Local state for selections (initialized from context)
  const [selections, setSelections] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    if (step2Data?.addons) {
      step2Data.addons.forEach((addon) => {
        map.set(addon.addonId, addon.quantity);
      });
    }
    return map;
  });

  // Convert Addon to AddonData for calculations
  const addonDataList: AddonData[] = useMemo(() => {
    return availableAddons
      .filter((addon) => addon.status === 'active')
      .map((addon) => ({
        id: addon.id,
        tenantId: addon.tenant_id,
        name: addon.name as Record<string, string>,
        description: addon.description as Record<string, string>,
        price: addon.price,
        priceType: addon.price_type as PriceType,
        maxQuantity: addon.max_quantity,
        imageUrl: addon.image_url,
        sortOrder: addon.sort_order,
        status: addon.status as 'active' | 'inactive',
        createdAt: addon.created_at,
        updatedAt: addon.updated_at,
      }));
  }, [availableAddons]);

  // Calculate totals
  const { selectedAddons, addonsTotal } = useMemo(() => {
    const selected: Array<{ addon: AddonData; quantity: number; total: number }> = [];
    let total = 0;

    selections.forEach((quantity, addonId) => {
      if (quantity > 0) {
        const addon = addonDataList.find((a) => a.id === addonId);
        if (addon) {
          const addonTotal = calculateAddonPrice(addon, quantity, rentalDays);
          selected.push({ addon, quantity, total: addonTotal });
          total += addonTotal;
        }
      }
    });

    return { selectedAddons: selected, addonsTotal: total };
  }, [selections, addonDataList, rentalDays]);

  // Currency from pricing or default
  const currency = pricing?.currency || 'EUR';

  // Format price
  const formatPrice = useCallback(
    (amount: number) => {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    },
    [locale, currency]
  );

  // Get localized addon name
  const getAddonName = useCallback(
    (addon: AddonData): string => {
      return addon.name[locale] || addon.name.en || Object.values(addon.name)[0] || '';
    },
    [locale]
  );

  // Get localized addon description
  const getAddonDescription = useCallback(
    (addon: AddonData): string => {
      return addon.description?.[locale] || addon.description?.en || '';
    },
    [locale]
  );

  // Format price type label
  const formatPriceType = useCallback(
    (priceType: PriceType): string => {
      switch (priceType) {
        case 'per_day':
          return `/${tCommon('perDay').replace('per ', '')}`;
        case 'per_rental':
          return '/rental';
        case 'one_time':
          return '';
        default:
          return '';
      }
    },
    [tCommon]
  );

  // Handle quantity change
  const handleQuantityChange = useCallback((addonId: string, delta: number, maxQuantity: number) => {
    setSelections((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(addonId) || 0;
      const newQuantity = Math.max(0, Math.min(current + delta, maxQuantity));

      if (newQuantity === 0) {
        newMap.delete(addonId);
      } else {
        newMap.set(addonId, newQuantity);
      }

      return newMap;
    });
  }, []);

  // Handle toggle (for addons with max quantity of 1)
  const handleToggle = useCallback((addonId: string) => {
    setSelections((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(addonId)) {
        newMap.delete(addonId);
      } else {
        newMap.set(addonId, 1);
      }
      return newMap;
    });
  }, []);

  // Validation function for the step
  const validateStep = useCallback(async (): Promise<boolean> => {
    // Convert selections to array format
    const addonsArray: AddonSelection[] = [];
    selections.forEach((quantity, addonId) => {
      if (quantity > 0) {
        addonsArray.push({ addonId, quantity });
      }
    });

    // Save to context
    setStep2Data({ addons: addonsArray });
    return true;
  }, [selections, setStep2Data]);

  // No addons available
  if (addonDataList.length === 0) {
    return (
      <BookingStepWrapper
        step={2}
        title={t('steps.extras')}
        description={t('selectAddons')}
        onNext={validateStep}
        className={className}
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">{t('noAddonsSelected')}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('continueBooking')}
            </p>
          </CardContent>
        </Card>
      </BookingStepWrapper>
    );
  }

  return (
    <BookingStepWrapper
      step={2}
      title={t('steps.extras')}
      description={t('selectAddons')}
      onNext={validateStep}
      className={className}
    >
      <div className="space-y-6">
        {/* Add-ons Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {addonDataList.map((addon) => {
            const quantity = selections.get(addon.id) || 0;
            const isSelected = quantity > 0;
            const addonName = getAddonName(addon);
            const addonDescription = getAddonDescription(addon);
            const Icon = getAddonIcon(addonName);
            const totalPrice = calculateAddonPrice(addon, quantity || 1, rentalDays);

            return (
              <Card
                key={addon.id}
                className={cn(
                  'relative overflow-hidden transition-all',
                  isSelected && 'ring-2 ring-primary'
                )}
              >
                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-4 w-4" />
                  </div>
                )}

                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Icon or Image */}
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                      {addon.imageUrl ? (
                        <Image
                          src={addon.imageUrl}
                          alt={addonName}
                          width={40}
                          height={40}
                          className="rounded object-cover"
                        />
                      ) : (
                        <Icon className="h-7 w-7 text-muted-foreground" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{addonName}</h3>
                      {addonDescription && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                          {addonDescription}
                        </p>
                      )}

                      {/* Price */}
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-lg font-bold">
                          {formatPrice(addon.price)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {formatPriceType(addon.priceType)}
                        </span>
                      </div>

                      {/* Show total for per-day addons */}
                      {addon.priceType === 'per_day' && rentalDays > 1 && (
                        <p className="text-xs text-muted-foreground">
                          {formatPrice(totalPrice)} {tCommon('total')} ({rentalDays} {tCommon('days')})
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="mt-4 flex items-center justify-between border-t pt-4">
                    {addon.maxQuantity === 1 ? (
                      // Toggle button for single quantity items
                      <Button
                        variant={isSelected ? 'primary' : 'outline'}
                        size="sm"
                        className="w-full"
                        onClick={() => handleToggle(addon.id)}
                      >
                        {isSelected ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Added
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            {tCommon('add')}
                          </>
                        )}
                      </Button>
                    ) : (
                      // Quantity selector for multi-quantity items
                      <div className="flex w-full items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {tCommon('quantity')}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(addon.id, -1, addon.maxQuantity)}
                            disabled={quantity === 0}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center font-medium">{quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(addon.id, 1, addon.maxQuantity)}
                            disabled={quantity >= addon.maxQuantity}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Selected Add-ons Summary */}
        <AddonsSummaryCard
          selectedAddons={selectedAddons}
          addonsTotal={addonsTotal}
          baseTotal={pricing?.total || 0}
          currency={currency}
          locale={locale}
          rentalDays={rentalDays}
        />
      </div>
    </BookingStepWrapper>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface AddonsSummaryCardProps {
  selectedAddons: Array<{ addon: AddonData; quantity: number; total: number }>;
  addonsTotal: number;
  baseTotal: number;
  currency: string;
  locale: string;
  rentalDays: number;
}

function AddonsSummaryCard({
  selectedAddons,
  addonsTotal,
  baseTotal,
  currency,
  locale,
  rentalDays,
}: AddonsSummaryCardProps) {
  const t = useTranslations('booking');
  const tCommon = useTranslations('common');

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getAddonName = (addon: AddonData): string => {
    return addon.name[locale] || addon.name.en || '';
  };

  const grandTotal = baseTotal + addonsTotal;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{t('bookingSummary')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Base rental */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('baseRate')}</span>
          <span>{formatPrice(baseTotal)}</span>
        </div>

        {/* Selected add-ons */}
        {selectedAddons.length > 0 ? (
          <>
            <div className="border-t pt-3">
              <p className="mb-2 text-sm font-medium">{t('addons')}</p>
              <div className="space-y-2">
                {selectedAddons.map(({ addon, quantity, total }) => (
                  <div key={addon.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {getAddonName(addon)}
                      {quantity > 1 && ` x${quantity}`}
                    </span>
                    <span>{formatPrice(total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Add-ons subtotal */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('addonsTotal')}</span>
              <span className="font-medium text-primary">+{formatPrice(addonsTotal)}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('noAddonsSelected')}</span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t pt-2" />

        {/* Grand total */}
        <div className="flex items-center justify-between">
          <span className="font-semibold">{tCommon('total')}</span>
          <span className="text-2xl font-bold">{formatPrice(grandTotal)}</span>
        </div>

        {/* Daily rate info */}
        {rentalDays > 0 && (
          <p className="text-right text-sm text-muted-foreground">
            {formatPrice(grandTotal / rentalDays)}/{tCommon('perDay')} {tCommon('average')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
