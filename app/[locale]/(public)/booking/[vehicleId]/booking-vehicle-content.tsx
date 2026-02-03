'use client';

import { useState } from 'react';
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import type {
  Vehicle,
  VehicleCategory,
  Branch,
  Addon,
  LocalizedString,
} from '@/lib/supabase/types';
import type { PricingResult } from '@/lib/pricing/types';

interface BookingVehicleContentProps {
  vehicle: Vehicle & { category: VehicleCategory | null };
  pickupBranch: Branch;
  returnBranch: Branch;
  pickupAt: string;
  returnAt: string;
  rentalDays: number;
  isOneWay: boolean;
  pricing: PricingResult | null;
  addons: Addon[];
  locale: string;
}

/**
 * Booking Vehicle Content
 *
 * Client component displaying vehicle details, booking summary, and pricing.
 * Mobile-first design with responsive layout.
 */
export function BookingVehicleContent({
  vehicle,
  pickupBranch,
  returnBranch,
  pickupAt,
  returnAt,
  rentalDays,
  isOneWay,
  pricing,
  addons,
  locale,
}: BookingVehicleContentProps) {
  const t = useTranslations('booking');
  const tVehicle = useTranslations('vehicle');
  const tCommon = useTranslations('common');

  const [showAllFeatures, setShowAllFeatures] = useState(false);

  // Photo
  const primaryPhoto = vehicle.photos?.find((p) => p.isPrimary) || vehicle.photos?.[0];
  const photoUrl = primaryPhoto?.url || '/images/vehicle-placeholder.jpg';

  // Category name
  const categoryName =
    vehicle.category?.name?.[locale as keyof LocalizedString] ||
    vehicle.category?.name?.en ||
    '';

  // Features to display
  const features = vehicle.features || [];
  const visibleFeatures = showAllFeatures ? features : features.slice(0, 6);

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

  // Format currency
  const formatPrice = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Build continue URL with all booking parameters
  const continueUrl = `/booking/${vehicle.id}/extras?pickupAt=${encodeURIComponent(pickupAt)}&returnAt=${encodeURIComponent(returnAt)}&pickupBranch=${pickupBranch.id}&returnBranch=${returnBranch.id}`;

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
      value: getFuelLabel(vehicle.fuel_type, tVehicle),
    },
    ...(vehicle.luggage_capacity
      ? [{
          icon: Briefcase,
          label: tVehicle('luggage'),
          value: `${vehicle.luggage_capacity}`,
        }]
      : []),
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left Column - Vehicle Details */}
      <div className="space-y-6 lg:col-span-2">
        {/* Vehicle Card */}
        <Card>
          {/* Vehicle Image */}
          <div className="relative aspect-[16/9] overflow-hidden rounded-t-xl sm:aspect-[21/9]">
            <Image
              src={photoUrl}
              alt={`${vehicle.make} ${vehicle.model}`}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 66vw"
            />
            {categoryName && (
              <Badge className="absolute left-4 top-4" variant="secondary">
                {categoryName}
              </Badge>
            )}
          </div>

          <CardContent className="p-4 sm:p-6">
            {/* Vehicle Title */}
            <div className="mb-4">
              <h2 className="text-2xl font-bold sm:text-3xl">
                {vehicle.make} {vehicle.model}
              </h2>
              <p className="text-muted-foreground">{vehicle.year}</p>
            </div>

            {/* Specs Grid */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {specs.map((spec, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center rounded-lg bg-muted/50 p-3 text-center"
                >
                  <spec.icon className="mb-1 h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{spec.label}</span>
                  <span className="font-medium">{spec.value}</span>
                </div>
              ))}
            </div>

            {/* Features */}
            {features.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="mb-3 font-semibold">{tVehicle('features')}</h3>
                <div className="flex flex-wrap gap-2">
                  {visibleFeatures.map((feature, idx) => (
                    <Badge key={idx} variant="outline" className="gap-1.5">
                      <Check className="h-3 w-3 text-green-500" />
                      {feature}
                    </Badge>
                  ))}
                </div>
                {features.length > 6 && (
                  <button
                    onClick={() => setShowAllFeatures(!showAllFeatures)}
                    className="mt-2 flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {showAllFeatures ? (
                      <>
                        {tCommon('showLess')}
                        <ChevronUp className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        {tCommon('showMore')} ({features.length - 6})
                        <ChevronDown className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rental Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('rentalDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pickup */}
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {t('pickupLocation')}
                </p>
                <p className="font-semibold">{pickupBranch.name}</p>
                <p className="text-sm text-muted-foreground">{pickupBranch.address}</p>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(pickupAt)}</span>
                  <Clock className="ml-2 h-4 w-4 text-muted-foreground" />
                  <span>{formatTime(pickupAt)}</span>
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
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {t('returnLocation')}
                </p>
                <p className="font-semibold">{returnBranch.name}</p>
                <p className="text-sm text-muted-foreground">{returnBranch.address}</p>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(returnAt)}</span>
                  <Clock className="ml-2 h-4 w-4 text-muted-foreground" />
                  <span>{formatTime(returnAt)}</span>
                </div>
              </div>
            </div>

            {/* One-way notice */}
            {isOneWay && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p className="text-sm">
                  {t('differentLocation')} - {t('oneWayFee')} {t('applies')}.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Pricing & Action */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>{t('priceBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pricing?.breakdown ? (
              <>
                {/* Base Rate */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('baseRate')} ({pricing.breakdown.duration}{' '}
                    {pricing.breakdown.durationUnit === 'days'
                      ? tCommon('days')
                      : pricing.breakdown.durationUnit === 'weeks'
                      ? tCommon('perWeek')
                      : pricing.breakdown.durationUnit === 'months'
                      ? tCommon('perMonth')
                      : tCommon('hours')})
                  </span>
                  <span>{formatPrice(pricing.breakdown.subtotal, pricing.currency)}</span>
                </div>

                {/* Seasonal Adjustment */}
                {pricing.breakdown.season && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t('seasonalAdjustment')}
                    </span>
                    <span
                      className={cn(
                        pricing.breakdown.season.amount > 0
                          ? 'text-amber-600'
                          : 'text-green-600'
                      )}
                    >
                      {pricing.breakdown.season.amount > 0 ? '+' : ''}
                      {formatPrice(pricing.breakdown.season.amount, pricing.currency)}
                    </span>
                  </div>
                )}

                {/* One-way Fee */}
                {pricing.breakdown.isOneWay && pricing.breakdown.oneWayFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('oneWayFee')}</span>
                    <span>{formatPrice(pricing.breakdown.oneWayFee, pricing.currency)}</span>
                  </div>
                )}

                {/* Divider */}
                <div className="border-t" />

                {/* Total */}
                <div className="flex justify-between">
                  <span className="font-semibold">{tCommon('total')}</span>
                  <span className="text-2xl font-bold">
                    {formatPrice(pricing.total, pricing.currency)}
                  </span>
                </div>

                {/* Daily Rate Info */}
                <p className="text-right text-sm text-muted-foreground">
                  {formatPrice(pricing.dailyRate, pricing.currency)}/{tCommon('perDay')}{' '}
                  {tCommon('average')}
                </p>

                {/* Addons note */}
                {addons.length > 0 && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                    <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {t('addons')} {t('availableInNextStep')}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Fallback when pricing fails */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('rentalDays')}</span>
                  <span>{rentalDays}</span>
                </div>
                <div className="border-t" />
                <p className="text-sm text-muted-foreground">
                  {t('priceCalculatedAtCheckout')}
                </p>
              </>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-3 pt-0">
            <Button asChild size="lg" className="w-full">
              <Link href={continueUrl}>
                {t('continueBooking')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href={`/${locale}/booking`}>{t('searchVehicles')}</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* What's Included */}
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('whatsIncluded')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper function to get fuel type label
function getFuelLabel(
  fuelType: string,
  t: (key: string) => string
): string {
  const labels: Record<string, string> = {
    petrol: t('petrol'),
    diesel: t('diesel'),
    electric: t('electric'),
    hybrid: t('hybrid'),
    plugin_hybrid: t('pluginHybrid'),
  };
  return labels[fuelType] || fuelType;
}
