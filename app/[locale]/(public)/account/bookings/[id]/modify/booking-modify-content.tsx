'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  Calendar,
  Clock,
  MapPin,
  Car,
  ArrowLeft,
  ArrowRight,
  Package,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Minus,
  Plus,
  Info,
} from 'lucide-react';

import type { BookingWithRelations } from '@/lib/booking/types';
import type { Branch } from '@/lib/supabase/types';
import type { AddonData } from '@/lib/pricing/types';
import { calculateDurationDays } from '@/lib/booking/types';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

interface BookingModifyContentProps {
  booking: BookingWithRelations;
  branches: Branch[];
  addons: AddonData[];
  locale: string;
}

interface ModificationPreview {
  canModify: boolean;
  reason?: string;
  originalPricing: {
    total: number;
    currency: string;
  };
  newPricing?: {
    total: number;
    currency: string;
  };
  priceDifference: number;
  requiresPayment: boolean;
  requiresRefund: boolean;
  currency: string;
  summary?: string;
}

type SelectedAddon = { addonId: string; quantity: number };

/**
 * Booking Modification Content Component
 *
 * Client component for modifying booking dates, locations, and add-ons.
 */
export function BookingModifyContent({
  booking,
  branches,
  addons,
  locale,
}: BookingModifyContentProps) {
  const t = useTranslations('booking');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [pickupDate, setPickupDate] = useState(
    new Date(booking.pickupAt).toISOString().split('T')[0]
  );
  const [pickupTime, setPickupTime] = useState(
    new Date(booking.pickupAt).toTimeString().slice(0, 5)
  );
  const [returnDate, setReturnDate] = useState(
    new Date(booking.returnAt).toISOString().split('T')[0]
  );
  const [returnTime, setReturnTime] = useState(
    new Date(booking.returnAt).toTimeString().slice(0, 5)
  );
  const [pickupBranchId, setPickupBranchId] = useState(booking.pickupBranchId);
  const [returnBranchId, setReturnBranchId] = useState(booking.returnBranchId);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>(
    booking.addons?.map((a) => ({ addonId: a.addonId, quantity: a.quantity })) || []
  );

  // Preview state
  const [preview, setPreview] = useState<ModificationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Submit state
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Vehicle info
  const vehicleName = booking.vehicle
    ? `${booking.vehicle.make} ${booking.vehicle.model}`
    : 'Unknown Vehicle';
  const vehiclePhoto = booking.vehicle?.photoUrl;

  // Check if form has changes
  const hasChanges = useCallback(() => {
    const originalPickupAt = new Date(booking.pickupAt).toISOString();
    const originalReturnAt = new Date(booking.returnAt).toISOString();
    const newPickupAt = new Date(`${pickupDate}T${pickupTime}:00`).toISOString();
    const newReturnAt = new Date(`${returnDate}T${returnTime}:00`).toISOString();

    const datesChanged = originalPickupAt !== newPickupAt || originalReturnAt !== newReturnAt;
    const pickupBranchChanged = pickupBranchId !== booking.pickupBranchId;
    const returnBranchChanged = returnBranchId !== booking.returnBranchId;

    const originalAddons = booking.addons?.map((a) => `${a.addonId}:${a.quantity}`).sort() || [];
    const newAddons = selectedAddons.map((a) => `${a.addonId}:${a.quantity}`).sort();
    const addonsChanged = JSON.stringify(originalAddons) !== JSON.stringify(newAddons);

    return datesChanged || pickupBranchChanged || returnBranchChanged || addonsChanged;
  }, [
    booking,
    pickupDate,
    pickupTime,
    returnDate,
    returnTime,
    pickupBranchId,
    returnBranchId,
    selectedAddons,
  ]);

  // Fetch preview when form changes
  useEffect(() => {
    if (!hasChanges()) {
      setPreview(null);
      return;
    }

    const fetchPreview = async () => {
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const pickupAt = new Date(`${pickupDate}T${pickupTime}:00`).toISOString();
        const returnAt = new Date(`${returnDate}T${returnTime}:00`).toISOString();

        const params = new URLSearchParams({
          pickupAt,
          returnAt,
          pickupBranchId,
          returnBranchId,
          locale,
        });

        if (selectedAddons.length > 0) {
          params.set('addons', JSON.stringify(selectedAddons));
        }

        const response = await fetch(
          `/api/account/bookings/${booking.id}/modify?${params.toString()}`
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to preview modification');
        }

        const data = await response.json();
        setPreview(data);
      } catch (error) {
        console.error('Error fetching preview:', error);
        setPreviewError(error instanceof Error ? error.message : 'Failed to preview changes');
      } finally {
        setPreviewLoading(false);
      }
    };

    // Debounce the preview fetch
    const timer = setTimeout(fetchPreview, 500);
    return () => clearTimeout(timer);
  }, [
    booking.id,
    pickupDate,
    pickupTime,
    returnDate,
    returnTime,
    pickupBranchId,
    returnBranchId,
    selectedAddons,
    locale,
    hasChanges,
  ]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!hasChanges() || !preview?.canModify) return;

    setSubmitError(null);

    startTransition(async () => {
      try {
        const pickupAt = new Date(`${pickupDate}T${pickupTime}:00`).toISOString();
        const returnAt = new Date(`${returnDate}T${returnTime}:00`).toISOString();

        const response = await fetch(`/api/account/bookings/${booking.id}/modify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pickupAt,
            returnAt,
            pickupBranchId,
            returnBranchId,
            addons: selectedAddons.length > 0 ? selectedAddons : undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to modify booking');
        }

        setSubmitSuccess(true);

        // Redirect after a short delay
        setTimeout(() => {
          router.push(`/${locale}/account/bookings/${booking.id}`);
          router.refresh();
        }, 2000);
      } catch (error) {
        console.error('Error modifying booking:', error);
        setSubmitError(error instanceof Error ? error.message : 'Failed to modify booking');
      }
    });
  };

  // Handle addon quantity change
  const handleAddonQuantityChange = (addonId: string, delta: number) => {
    setSelectedAddons((prev) => {
      const existing = prev.find((a) => a.addonId === addonId);
      const addon = addons.find((a) => a.id === addonId);
      const maxQty = addon?.maxQuantity || 1;

      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) {
          return prev.filter((a) => a.addonId !== addonId);
        }
        return prev.map((a) =>
          a.addonId === addonId ? { ...a, quantity: Math.min(newQty, maxQty) } : a
        );
      } else if (delta > 0) {
        return [...prev, { addonId, quantity: 1 }];
      }
      return prev;
    });
  };

  // Generate time options
  const timeOptions = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      timeOptions.push({ value: `${hour}:${minute}`, label: `${hour}:${minute}` });
    }
  }

  // Duration calculation
  const newPickupAt = new Date(`${pickupDate}T${pickupTime}:00`);
  const newReturnAt = new Date(`${returnDate}T${returnTime}:00`);
  const durationDays = calculateDurationDays(newPickupAt.toISOString(), newReturnAt.toISOString());
  const originalDays = calculateDurationDays(booking.pickupAt, booking.returnAt);

  if (submitSuccess) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{t('modifySuccess')}</h2>
        <p className="text-muted-foreground mb-4">
          {t('modifySuccessMessage')}
        </p>
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/account/bookings/${booking.id}`}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{t('modifyTitle')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('bookingReference')}: <span className="font-mono">{booking.reference}</span>
          </p>
        </div>
      </div>

      {/* Vehicle Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            {vehiclePhoto ? (
              <div className="relative w-24 h-18 sm:w-32 sm:h-24 rounded-lg overflow-hidden bg-muted shrink-0">
                <Image
                  src={vehiclePhoto}
                  alt={vehicleName}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 96px, 128px"
                />
              </div>
            ) : (
              <div className="w-24 h-18 sm:w-32 sm:h-24 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Car className="w-8 h-8 text-muted-foreground/50" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{vehicleName}</h3>
              {booking.vehicle?.year && (
                <p className="text-sm text-muted-foreground">{booking.vehicle.year}</p>
              )}
              <Badge variant="secondary" className="mt-1">
                {originalDays} {originalDays === 1 ? 'day' : 'days'} (current)
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dates Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t('modifyDatesAndTimes')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pickup */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  {t('pickupDate')}
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <Select
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    options={timeOptions}
                  />
                </div>
              </div>

              {/* Return */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  {t('returnDate')}
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    min={pickupDate}
                  />
                  <Select
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                    options={timeOptions}
                  />
                </div>
              </div>

              {/* Duration indicator */}
              {durationDays !== originalDays && (
                <div className="flex items-center gap-2 text-sm">
                  <Info className="w-4 h-4 text-blue-500" />
                  <span>
                    Duration will change from {originalDays} to{' '}
                    <strong>{durationDays}</strong> {durationDays === 1 ? 'day' : 'days'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Locations Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {t('modifyLocations')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pickup Branch */}
              <div className="space-y-3">
                <Label>{t('pickupLocation')}</Label>
                <Select
                  value={pickupBranchId}
                  onChange={(e) => setPickupBranchId(e.target.value)}
                  options={branches.map((b) => ({
                    value: b.id,
                    label: `${b.name} - ${b.city}`,
                  }))}
                />
              </div>

              {/* Return Branch */}
              <div className="space-y-3">
                <Label>{t('returnLocation')}</Label>
                <Select
                  value={returnBranchId}
                  onChange={(e) => setReturnBranchId(e.target.value)}
                  options={branches.map((b) => ({
                    value: b.id,
                    label: `${b.name} - ${b.city}`,
                  }))}
                />
              </div>

              {/* One-way indicator */}
              {pickupBranchId !== returnBranchId && (
                <Alert>
                  <MapPin className="w-4 h-4" />
                  <AlertDescription>
                    {t('modifyOneWayNotice')}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Add-ons Section */}
          {addons.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {t('addons')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {addons.map((addon) => {
                    const selected = selectedAddons.find((a) => a.addonId === addon.id);
                    const quantity = selected?.quantity || 0;
                    const localizedName =
                      (addon.name as Record<string, string>)[locale] ||
                      (addon.name as Record<string, string>).en ||
                      'Add-on';
                    const localizedDesc =
                      (addon.description as Record<string, string>)[locale] ||
                      (addon.description as Record<string, string>).en ||
                      '';

                    return (
                      <div
                        key={addon.id}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg border transition-colors',
                          quantity > 0
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border hover:border-primary/30'
                        )}
                      >
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{localizedName}</span>
                            <Badge variant="secondary" className="text-xs">
                              {formatCurrency(addon.price, 'EUR', locale)}
                              {addon.priceType === 'per_day' && '/day'}
                            </Badge>
                          </div>
                          {localizedDesc && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {localizedDesc}
                            </p>
                          )}
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAddonQuantityChange(addon.id, -1)}
                            disabled={quantity <= 0}
                            className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                              quantity > 0
                                ? 'bg-muted hover:bg-muted/80'
                                : 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                            )}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-6 text-center font-medium">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleAddonQuantityChange(addon.id, 1)}
                            disabled={quantity >= addon.maxQuantity}
                            className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                              quantity < addon.maxQuantity
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                : 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                            )}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Price Summary */}
        <div className="space-y-6">
          {/* Preview Card */}
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className={cn('w-4 h-4', previewLoading && 'animate-spin')} />
                {t('modifyPriceSummary')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {previewError && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{previewError}</AlertDescription>
                </Alert>
              )}

              {!hasChanges() ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('modifyNoChanges')}
                </p>
              ) : previewLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Spinner />
                </div>
              ) : preview ? (
                <>
                  {!preview.canModify ? (
                    <Alert variant="destructive">
                      <AlertCircle className="w-4 h-4" />
                      <AlertTitle>{t('modifyCannotModify')}</AlertTitle>
                      <AlertDescription>{preview.reason}</AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      {/* Original Price */}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('modifyOriginalTotal')}</span>
                        <span>
                          {formatCurrency(
                            preview.originalPricing.total,
                            preview.currency,
                            locale
                          )}
                        </span>
                      </div>

                      {/* New Price */}
                      {preview.newPricing && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t('modifyNewTotal')}</span>
                          <span className="font-semibold">
                            {formatCurrency(
                              preview.newPricing.total,
                              preview.currency,
                              locale
                            )}
                          </span>
                        </div>
                      )}

                      {/* Price Difference */}
                      <div className="border-t pt-3">
                        <div className="flex justify-between">
                          <span className="font-medium">{t('modifyDifference')}</span>
                          <span
                            className={cn(
                              'font-semibold',
                              preview.priceDifference > 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : preview.priceDifference < 0
                                ? 'text-green-600 dark:text-green-400'
                                : ''
                            )}
                          >
                            {preview.priceDifference > 0 ? '+' : ''}
                            {formatCurrency(preview.priceDifference, preview.currency, locale)}
                          </span>
                        </div>
                      </div>

                      {/* Payment/Refund notice */}
                      {preview.requiresPayment && (
                        <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          <AlertDescription className="text-amber-800 dark:text-amber-200">
                            Additional payment of{' '}
                            {formatCurrency(preview.priceDifference, preview.currency, locale)}{' '}
                            will be required. We will contact you for payment arrangements.
                          </AlertDescription>
                        </Alert>
                      )}

                      {preview.requiresRefund && (
                        <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <AlertDescription className="text-green-800 dark:text-green-200">
                            A refund of{' '}
                            {formatCurrency(
                              Math.abs(preview.priceDifference),
                              preview.currency,
                              locale
                            )}{' '}
                            will be processed.
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  )}
                </>
              ) : null}

              {/* Submit Error */}
              {submitError && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={
                    !hasChanges() ||
                    !preview?.canModify ||
                    previewLoading ||
                    isPending
                  }
                  className="w-full gap-2"
                >
                  {isPending ? (
                    <>
                      <Spinner className="w-4 h-4" />
                      {t('modifySaving')}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      {t('modifyConfirmChanges')}
                    </>
                  )}
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href={`/${locale}/account/bookings/${booking.id}`}>
                    {tCommon('cancel')}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Help Text */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-sm mb-2">{t('modifyNeedHelp')}</h4>
              <p className="text-xs text-muted-foreground">
                {t('modifyHelpText')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
