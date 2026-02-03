'use client';

import { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  Car,
  MapPin,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Package,
  Tag,
  Check,
  X,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  CreditCard,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/utils/cn';
import { BookingStepWrapper } from './booking-form';
import { useBooking, type VehicleInfo, type BranchInfo } from './booking-context';
import { useCheckout, saveBookingToStorage } from '@/lib/booking/checkout';
import { Link } from '@/i18n/routing';
import type { PricingBreakdown, AddonData } from '@/lib/pricing/types';

// ============================================================================
// TYPES
// ============================================================================

interface BookingStepReviewProps {
  /** Locale for translations and formatting */
  locale: string;

  /** Callback to apply coupon code */
  onApplyCoupon?: (code: string) => Promise<{
    success: boolean;
    discountAmount?: number;
    error?: string;
  }>;

  /** Callback to remove coupon */
  onRemoveCoupon?: () => void;

  /** Custom class name */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Booking Step 4: Review and Coupon Code
 *
 * Final review of all booking details with coupon code input,
 * terms acceptance, and optional notes.
 *
 * Mobile-first design with collapsible sections.
 */
export function BookingStepReview({
  locale,
  onApplyCoupon,
  onRemoveCoupon,
  className,
}: BookingStepReviewProps) {
  const t = useTranslations('booking');
  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth');

  const { state, setStep4Data } = useBooking();
  const {
    vehicle,
    pickupBranch,
    returnBranch,
    pricing,
    rentalDays,
    isOneWay,
    step1Data,
    step2Data,
    step3Data,
    step4Data,
    availableAddons,
  } = state;

  // Checkout hook
  const { initiateCheckout, isLoading: checkoutLoading, error: checkoutError } = useCheckout();

  // Local state
  const [couponCode, setCouponCode] = useState(step4Data?.couponCode || '');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponApplied, setCouponApplied] = useState(!!pricing?.coupon);
  const [acceptTerms, setAcceptTerms] = useState(step4Data?.acceptTerms || false);
  const [notes, setNotes] = useState(step4Data?.notes || '');
  const [showDetails, setShowDetails] = useState(true);

  // Currency from pricing
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

  // Format date
  const formatDate = useCallback(
    (dateStr: string) => {
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
    },
    [locale]
  );

  // Format time
  const formatTime = useCallback(
    (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        return date.toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return '';
      }
    },
    [locale]
  );

  // Get selected addons with details
  const selectedAddons = useMemo(() => {
    if (!step2Data?.addons || !availableAddons) return [];

    return step2Data.addons
      .map((selection) => {
        const addon = availableAddons.find((a) => a.id === selection.addonId);
        if (!addon) return null;
        return {
          id: addon.id,
          name: (addon.name as Record<string, string>)[locale] ||
                (addon.name as Record<string, string>).en || '',
          quantity: selection.quantity,
          price: addon.price,
          priceType: addon.price_type,
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        name: string;
        quantity: number;
        price: number;
        priceType: string;
      }>;
  }, [step2Data, availableAddons, locale]);

  // Handle coupon apply
  const handleApplyCoupon = useCallback(async () => {
    if (!couponCode.trim() || !onApplyCoupon) return;

    setCouponError(null);
    setCouponLoading(true);

    try {
      const result = await onApplyCoupon(couponCode.trim().toUpperCase());
      if (result.success) {
        setCouponApplied(true);
      } else {
        setCouponError(result.error || t('coupon.invalid'));
      }
    } catch {
      setCouponError(t('coupon.invalid'));
    } finally {
      setCouponLoading(false);
    }
  }, [couponCode, onApplyCoupon, t]);

  // Handle coupon remove
  const handleRemoveCoupon = useCallback(() => {
    setCouponCode('');
    setCouponApplied(false);
    setCouponError(null);
    onRemoveCoupon?.();
  }, [onRemoveCoupon]);

  // Validation and checkout function for step
  const validateStep = useCallback(async (): Promise<boolean> => {
    if (!acceptTerms) {
      return false;
    }

    // Save step data
    setStep4Data({
      couponCode: couponApplied ? couponCode : undefined,
      acceptTerms: true,
      notes: notes.trim() || undefined,
    });

    // Save booking to session storage before redirect
    if (pricing && step1Data && vehicle) {
      saveBookingToStorage({
        reference: '', // Will be generated during checkout
        vehicleId: vehicle.id,
        pickupAt: step1Data.pickupAt,
        returnAt: step1Data.returnAt,
        total: pricing.total,
        currency: pricing.currency,
      });
    }

    // Initiate Stripe checkout
    const result = await initiateCheckout({
      state,
      locale,
    });

    // If checkout fails, stay on the page (error is handled by the hook)
    if (!result.success) {
      return false;
    }

    // Checkout initiated successfully - redirect will happen
    // Return false to prevent step navigation (we're redirecting)
    return false;
  }, [
    acceptTerms,
    couponApplied,
    couponCode,
    notes,
    setStep4Data,
    initiateCheckout,
    state,
    locale,
    pricing,
    step1Data,
    vehicle,
  ]);

  // Check if all required data exists
  if (!vehicle || !pickupBranch || !returnBranch || !step1Data || !step3Data) {
    return (
      <BookingStepWrapper
        step={4}
        title={t('steps.review')}
        hideNext
        className={className}
      >
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="ml-2">Missing booking information. Please go back and complete previous steps.</span>
        </Alert>
      </BookingStepWrapper>
    );
  }

  return (
    <BookingStepWrapper
      step={4}
      title={t('steps.review')}
      description={t('reviewAndConfirm')}
      onNext={validateStep}
      nextButtonText={t('proceedToPayment')}
      nextDisabled={!acceptTerms}
      className={className}
    >
      <div className="space-y-6">
        {/* Booking Summary Header */}
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setShowDetails(!showDetails)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{t('bookingSummary')}</CardTitle>
              <Button variant="ghost" size="sm" type="button">
                {showDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>

          {showDetails && (
            <CardContent className="space-y-6 border-t pt-4">
              {/* Vehicle */}
              <VehicleSummary vehicle={vehicle} locale={locale} />

              {/* Rental Period */}
              <RentalPeriodSummary
                pickupBranch={pickupBranch}
                returnBranch={returnBranch}
                pickupAt={step1Data.pickupAt}
                returnAt={step1Data.returnAt}
                isOneWay={isOneWay}
                rentalDays={rentalDays}
                formatDate={formatDate}
                formatTime={formatTime}
              />

              {/* Add-ons */}
              {selectedAddons.length > 0 && (
                <AddonsSummary
                  addons={selectedAddons}
                  formatPrice={formatPrice}
                />
              )}

              {/* Driver Info */}
              <DriverSummary driverInfo={step3Data.driverInfo} />
            </CardContent>
          )}
        </Card>

        {/* Coupon Code */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Tag className="h-5 w-5" />
              {t('coupon.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {couponApplied ? (
              <div className="flex items-center justify-between rounded-lg bg-green-50 p-3 dark:bg-green-950/30">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-700 dark:text-green-400">
                    {t('coupon.applied')}: {couponCode.toUpperCase()}
                  </span>
                  {pricing?.coupon && (
                    <Badge variant="secondary">
                      -{formatPrice(pricing.coupon.discountAmount)}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveCoupon}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder={t('coupon.placeholder')}
                  className={cn(couponError && 'border-destructive')}
                  disabled={couponLoading}
                />
                <Button
                  onClick={handleApplyCoupon}
                  disabled={!couponCode.trim() || couponLoading || !onApplyCoupon}
                  variant="outline"
                >
                  {couponLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t('coupon.apply')
                  )}
                </Button>
              </div>
            )}
            {couponError && (
              <p className="mt-2 text-sm text-destructive">{couponError}</p>
            )}
          </CardContent>
        </Card>

        {/* Price Breakdown */}
        <PriceBreakdownCard
          pricing={pricing}
          rentalDays={rentalDays}
          isOneWay={isOneWay}
          formatPrice={formatPrice}
        />

        {/* Notes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Additional Notes
              <span className="text-sm font-normal text-muted-foreground">
                ({tCommon('optional')})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests or information for the rental company..."
              rows={3}
              maxLength={1000}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {notes.length}/1000
            </p>
          </CardContent>
        </Card>

        {/* Terms and Conditions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Checkbox
                id="acceptTerms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="acceptTerms" className="cursor-pointer">
                  I agree to the{' '}
                  <Link
                    href="/terms"
                    className="text-primary underline hover:no-underline"
                    target="_blank"
                  >
                    {tAuth('termsOfService')}
                  </Link>{' '}
                  {tAuth('and')}{' '}
                  <Link
                    href="/privacy"
                    className="text-primary underline hover:no-underline"
                    target="_blank"
                  >
                    {tAuth('privacyPolicy')}
                  </Link>
                  , including the cancellation policy.
                  <span className="text-destructive"> *</span>
                </Label>
              </div>
            </div>
            {!acceptTerms && (
              <p className="mt-2 text-sm text-muted-foreground">
                You must accept the terms to proceed with the booking.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Checkout Error */}
        {checkoutError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <div className="ml-2">
              <p className="text-sm font-medium">Payment Error</p>
              <p className="text-sm">{checkoutError}</p>
            </div>
          </Alert>
        )}

        {/* Payment Info */}
        <Alert>
          <CreditCard className="h-4 w-4" />
          <div className="ml-2">
            <p className="text-sm font-medium">{t('securePayment')}</p>
            <p className="text-sm text-muted-foreground">
              You will be redirected to our secure payment provider to complete your booking.
            </p>
          </div>
        </Alert>
      </div>
    </BookingStepWrapper>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface VehicleSummaryProps {
  vehicle: VehicleInfo;
  locale: string;
}

function VehicleSummary({ vehicle, locale }: VehicleSummaryProps) {
  const categoryName = vehicle.category?.name?.[locale] || vehicle.category?.name?.en || '';

  return (
    <div className="flex gap-4">
      <div className="relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
        {vehicle.photoUrl ? (
          <Image
            src={vehicle.photoUrl}
            alt={`${vehicle.make} ${vehicle.model}`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Car className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>
      <div>
        <h3 className="font-semibold">
          {vehicle.make} {vehicle.model}
        </h3>
        <p className="text-sm text-muted-foreground">{vehicle.year}</p>
        {categoryName && (
          <Badge variant="secondary" className="mt-1">
            {categoryName}
          </Badge>
        )}
      </div>
    </div>
  );
}

interface RentalPeriodSummaryProps {
  pickupBranch: BranchInfo;
  returnBranch: BranchInfo;
  pickupAt: string;
  returnAt: string;
  isOneWay: boolean;
  rentalDays: number;
  formatDate: (date: string) => string;
  formatTime: (date: string) => string;
}

function RentalPeriodSummary({
  pickupBranch,
  returnBranch,
  pickupAt,
  returnAt,
  isOneWay,
  rentalDays,
  formatDate,
  formatTime,
}: RentalPeriodSummaryProps) {
  const t = useTranslations('booking');
  const tCommon = useTranslations('common');

  return (
    <div className="space-y-3 rounded-lg bg-muted/50 p-4">
      {/* Pickup */}
      <div className="flex items-start gap-3">
        <MapPin className="mt-0.5 h-4 w-4 text-green-600" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            {t('pickupLocation')}
          </p>
          <p className="font-medium">{pickupBranch.name}</p>
          <p className="text-sm text-muted-foreground">{pickupBranch.address}</p>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(pickupAt)}</span>
            <Clock className="ml-1 h-3.5 w-3.5" />
            <span>{formatTime(pickupAt)}</span>
          </div>
        </div>
      </div>

      {/* Return */}
      <div className="flex items-start gap-3 border-t pt-3">
        <MapPin className="mt-0.5 h-4 w-4 text-blue-600" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            {t('returnLocation')}
          </p>
          <p className="font-medium">{returnBranch.name}</p>
          <p className="text-sm text-muted-foreground">{returnBranch.address}</p>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(returnAt)}</span>
            <Clock className="ml-1 h-3.5 w-3.5" />
            <span>{formatTime(returnAt)}</span>
          </div>
        </div>
      </div>

      {/* Duration */}
      <div className="flex items-center justify-between border-t pt-3 text-sm">
        <span className="text-muted-foreground">{t('rentalDays')}</span>
        <span className="font-medium">
          {rentalDays} {tCommon('days')}
        </span>
      </div>

      {/* One-way notice */}
      {isOneWay && (
        <Badge variant="secondary" className="mt-2">
          {t('differentLocation')}
        </Badge>
      )}
    </div>
  );
}

interface AddonsSummaryProps {
  addons: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    priceType: string;
  }>;
  formatPrice: (amount: number) => string;
}

function AddonsSummary({ addons, formatPrice }: AddonsSummaryProps) {
  const t = useTranslations('booking');

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Package className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{t('addons')}</span>
      </div>
      <div className="space-y-1 rounded-lg bg-muted/50 p-3">
        {addons.map((addon) => (
          <div key={addon.id} className="flex items-center justify-between text-sm">
            <span>
              {addon.name}
              {addon.quantity > 1 && ` x${addon.quantity}`}
            </span>
            <span className="text-muted-foreground">
              {formatPrice(addon.price)}
              {addon.priceType === 'per_day' && '/day'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DriverSummaryProps {
  driverInfo: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
}

function DriverSummary({ driverInfo }: DriverSummaryProps) {
  const t = useTranslations('booking');

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{t('primaryDriver')}</span>
      </div>
      <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
        <p className="font-medium">
          {driverInfo.firstName} {driverInfo.lastName}
        </p>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="h-3.5 w-3.5" />
          <span>{driverInfo.email}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-3.5 w-3.5" />
          <span>{driverInfo.phone}</span>
        </div>
      </div>
    </div>
  );
}

interface PriceBreakdownCardProps {
  pricing: PricingBreakdown | null;
  rentalDays: number;
  isOneWay: boolean;
  formatPrice: (amount: number) => string;
}

function PriceBreakdownCard({
  pricing,
  rentalDays,
  isOneWay,
  formatPrice,
}: PriceBreakdownCardProps) {
  const t = useTranslations('booking');
  const tCommon = useTranslations('common');

  if (!pricing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('priceBreakdown')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('priceCalculatedAtCheckout')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{t('priceBreakdown')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Base Rate */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {t('baseRate')} ({rentalDays} {tCommon('days')})
          </span>
          <span>{formatPrice(pricing.subtotal)}</span>
        </div>

        {/* Seasonal Adjustment */}
        {pricing.season && pricing.season.amount !== 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t('seasonalAdjustment')} ({pricing.season.name})
            </span>
            <span className={pricing.season.amount > 0 ? 'text-amber-600' : 'text-green-600'}>
              {pricing.season.amount > 0 ? '+' : ''}
              {formatPrice(pricing.season.amount)}
            </span>
          </div>
        )}

        {/* Add-ons */}
        {pricing.addonsTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('addonsTotal')}</span>
            <span>{formatPrice(pricing.addonsTotal)}</span>
          </div>
        )}

        {/* One-way Fee */}
        {isOneWay && pricing.oneWayFee > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('oneWayFee')}</span>
            <span>{formatPrice(pricing.oneWayFee)}</span>
          </div>
        )}

        {/* Discount */}
        {pricing.coupon && pricing.discountAmount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>
              {t('couponDiscount')} ({pricing.coupon.code})
            </span>
            <span>-{formatPrice(pricing.discountAmount)}</span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t pt-2" />

        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">{tCommon('total')}</span>
          <span className="text-2xl font-bold text-primary">
            {formatPrice(pricing.total)}
          </span>
        </div>

        {/* Daily Average */}
        {rentalDays > 0 && (
          <p className="text-right text-sm text-muted-foreground">
            {formatPrice(pricing.total / rentalDays)}/{tCommon('perDay')} {tCommon('average')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
