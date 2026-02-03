'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  Users,
  Fuel,
  Settings2,
  DoorOpen,
  Briefcase,
  Calendar,
  MapPin,
  ArrowRight,
  Clock,
  Check,
  Info,
  AlertCircle,
  Pencil,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/utils/cn';
import { BookingStepWrapper } from './booking-form';
import { useBooking, type VehicleInfo, type BranchInfo } from './booking-context';
import type { PricingBreakdown } from '@/lib/pricing/types';

// ============================================================================
// TYPES
// ============================================================================

interface BookingStepVehicleProps {
  /** Callback when dates are edited (opens date picker modal) */
  onEditDates?: () => void;

  /** Callback when location is edited (opens location picker modal) */
  onEditLocation?: () => void;

  /** Locale for date/time formatting */
  locale: string;

  /** Custom class name */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Booking Step 1: Vehicle Confirmation and Dates
 *
 * Displays the selected vehicle details, rental dates, locations,
 * and pricing breakdown. Allows users to confirm or edit their selection.
 *
 * Mobile-first design with responsive layout.
 */
export function BookingStepVehicle({
  onEditDates,
  onEditLocation,
  locale,
  className,
}: BookingStepVehicleProps) {
  const t = useTranslations('booking');
  const tVehicle = useTranslations('vehicle');
  const tCommon = useTranslations('common');

  const { state, setStep1Data } = useBooking();
  const { vehicle, pickupBranch, returnBranch, pricing, rentalDays, isOneWay, step1Data } = state;

  // Validation function for the step
  const validateStep = useCallback(async (): Promise<boolean> => {
    // Ensure we have all required data
    if (!vehicle || !pickupBranch || !returnBranch || !step1Data) {
      return false;
    }

    // Validate dates
    const pickupDate = new Date(step1Data.pickupAt);
    const returnDate = new Date(step1Data.returnAt);
    const now = new Date();

    // Pickup must be in the future
    if (pickupDate <= now) {
      return false;
    }

    // Return must be after pickup
    if (returnDate <= pickupDate) {
      return false;
    }

    return true;
  }, [vehicle, pickupBranch, returnBranch, step1Data]);

  // Show error if missing required data
  if (!vehicle || !pickupBranch || !returnBranch || !step1Data) {
    return (
      <BookingStepWrapper
        step={1}
        title={t('steps.vehicle')}
        description={t('vehicleDetails')}
        hideNext
        className={className}
      >
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="ml-2">{t('noVehiclesFound')}</span>
        </Alert>
      </BookingStepWrapper>
    );
  }

  return (
    <BookingStepWrapper
      step={1}
      title={t('steps.vehicle')}
      description={t('reviewAndConfirm')}
      onNext={validateStep}
      nextButtonText={tCommon('next')}
      hideBack
      className={className}
    >
      <div className="space-y-6">
        {/* Vehicle Card */}
        <VehicleCard vehicle={vehicle} locale={locale} />

        {/* Rental Details */}
        <RentalDetailsCard
          pickupBranch={pickupBranch}
          returnBranch={returnBranch}
          pickupAt={step1Data.pickupAt}
          returnAt={step1Data.returnAt}
          isOneWay={isOneWay}
          locale={locale}
          onEditDates={onEditDates}
          onEditLocation={onEditLocation}
        />

        {/* Pricing Summary */}
        <PricingSummaryCard
          pricing={pricing}
          rentalDays={rentalDays}
          isOneWay={isOneWay}
          locale={locale}
        />
      </div>
    </BookingStepWrapper>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface VehicleCardProps {
  vehicle: VehicleInfo;
  locale: string;
}

function VehicleCard({ vehicle, locale }: VehicleCardProps) {
  const tVehicle = useTranslations('vehicle');

  // Category name
  const categoryName = vehicle.category?.name?.[locale] || vehicle.category?.name?.en || '';

  // Specs data
  const specs = [
    {
      icon: Users,
      label: tVehicle('seats'),
      value: vehicle.seats,
    },
    {
      icon: DoorOpen,
      label: tVehicle('doors'),
      value: vehicle.doors,
    },
    {
      icon: Settings2,
      label: tVehicle('transmission'),
      value: vehicle.transmission === 'automatic' ? tVehicle('automatic') : tVehicle('manual'),
    },
    {
      icon: Fuel,
      label: tVehicle('fuel'),
      value: getFuelLabel(vehicle.fuelType, tVehicle),
    },
  ];

  return (
    <Card>
      <div className="flex flex-col sm:flex-row">
        {/* Vehicle Image */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-lg sm:aspect-[4/3] sm:w-48 sm:rounded-l-lg sm:rounded-tr-none md:w-56 lg:w-64">
          <Image
            src={vehicle.photoUrl || '/images/vehicle-placeholder.jpg'}
            alt={`${vehicle.make} ${vehicle.model}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 256px"
          />
          {categoryName && (
            <Badge className="absolute left-3 top-3" variant="secondary">
              {categoryName}
            </Badge>
          )}
        </div>

        {/* Vehicle Info */}
        <CardContent className="flex-1 p-4 sm:p-5">
          <div className="mb-4">
            <h3 className="text-xl font-bold sm:text-2xl">
              {vehicle.make} {vehicle.model}
            </h3>
            <p className="text-muted-foreground">{vehicle.year}</p>
          </div>

          {/* Specs Grid - Mobile: 2 cols, Desktop: 4 cols */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {specs.map((spec, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50">
                  <spec.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground">{spec.label}</p>
                  <p className="truncate text-sm font-medium">{spec.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

interface RentalDetailsCardProps {
  pickupBranch: BranchInfo;
  returnBranch: BranchInfo;
  pickupAt: string;
  returnAt: string;
  isOneWay: boolean;
  locale: string;
  onEditDates?: () => void;
  onEditLocation?: () => void;
}

function RentalDetailsCard({
  pickupBranch,
  returnBranch,
  pickupAt,
  returnAt,
  isOneWay,
  locale,
  onEditDates,
  onEditLocation,
}: RentalDetailsCardProps) {
  const t = useTranslations('booking');

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(locale, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Format time for display
  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">{t('rentalDetails')}</CardTitle>
        {(onEditDates || onEditLocation) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditDates || onEditLocation}
            className="h-8 gap-1.5 text-xs"
          >
            <Pencil className="h-3 w-3" />
            {t('modify')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pickup */}
        <div className="flex gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground">
              {t('pickupLocation')}
            </p>
            <p className="truncate font-semibold">{pickupBranch.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {pickupBranch.address}, {pickupBranch.city}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {formatDate(pickupAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {formatTime(pickupAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Arrow / Separator */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-dashed" />
          </div>
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <ArrowRight className="h-4 w-4 rotate-90 text-muted-foreground" />
          </div>
        </div>

        {/* Return */}
        <div className="flex gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground">
              {t('returnLocation')}
            </p>
            <p className="truncate font-semibold">{returnBranch.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {returnBranch.address}, {returnBranch.city}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {formatDate(returnAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {formatTime(returnAt)}
              </span>
            </div>
          </div>
        </div>

        {/* One-way notice */}
        {isOneWay && (
          <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p className="text-sm">
              {t('differentLocation')} - {t('oneWayFee')} {t('applies')}.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PricingSummaryCardProps {
  pricing: PricingBreakdown | null;
  rentalDays: number;
  isOneWay: boolean;
  locale: string;
}

function PricingSummaryCard({
  pricing,
  rentalDays,
  isOneWay,
  locale,
}: PricingSummaryCardProps) {
  const t = useTranslations('booking');
  const tCommon = useTranslations('common');

  // Format currency
  const formatPrice = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{t('priceBreakdown')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pricing ? (
          <>
            {/* Base Rate */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t('baseRate')} ({rentalDays} {tCommon('days')})
              </span>
              <span>{formatPrice(pricing.subtotal || 0, pricing.currency)}</span>
            </div>

            {/* Seasonal Adjustment */}
            {pricing.season && pricing.season.amount !== 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('seasonalAdjustment')}</span>
                <span
                  className={cn(
                    pricing.season.amount > 0 ? 'text-amber-600' : 'text-green-600'
                  )}
                >
                  {pricing.season.amount > 0 ? '+' : ''}
                  {formatPrice(pricing.season.amount, pricing.currency)}
                </span>
              </div>
            )}

            {/* One-way Fee */}
            {isOneWay && pricing.oneWayFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('oneWayFee')}</span>
                <span>{formatPrice(pricing.oneWayFee, pricing.currency)}</span>
              </div>
            )}

            {/* Divider */}
            <div className="border-t pt-2" />

            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="font-semibold">{tCommon('total')}</span>
              <span className="text-2xl font-bold">
                {formatPrice(pricing.total, pricing.currency)}
              </span>
            </div>

            {/* Daily Rate Info */}
            {rentalDays > 0 && (
              <p className="text-right text-sm text-muted-foreground">
                {formatPrice(pricing.total / rentalDays, pricing.currency)}/{tCommon('perDay')}{' '}
                {tCommon('average')}
              </p>
            )}

            {/* Addons note */}
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <p className="text-muted-foreground">
                {t('addons')} {t('availableInNextStep')}
              </p>
            </div>

            {/* What's Included */}
            <WhatsIncluded />
          </>
        ) : (
          <>
            {/* Fallback when pricing fails */}
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
            <p className="text-sm text-muted-foreground">
              {t('priceCalculatedAtCheckout')}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * What's Included section component
 */
function WhatsIncluded() {
  const t = useTranslations('booking');
  const tVehicle = useTranslations('vehicle');

  return (
    <div className="mt-4 border-t pt-4">
      <p className="mb-2 text-sm font-medium">{t('whatsIncluded')}</p>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span>{tVehicle('unlimitedMileage')}</span>
        </li>
        <li className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span>{t('basicInsurance')}</span>
        </li>
        <li className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span>{t('taxes')}</span>
        </li>
        <li className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span>{t('24hSupport')}</span>
        </li>
      </ul>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getFuelLabel(fuelType: string, t: (key: string) => string): string {
  const labels: Record<string, string> = {
    petrol: t('petrol'),
    diesel: t('diesel'),
    electric: t('electric'),
    hybrid: t('hybrid'),
    plugin_hybrid: t('pluginHybrid'),
  };
  return labels[fuelType] || fuelType;
}

