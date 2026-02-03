'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  ArrowLeft,
  Car,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  Info,
  CreditCard,
  Ban,
} from 'lucide-react';

import type { BookingWithRelations } from '@/lib/booking/types';
import { calculateDurationDays } from '@/lib/booking/types';
import { formatCurrency, formatDate, formatTime, formatDateTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

interface BookingCancelContentProps {
  booking: BookingWithRelations;
  locale: string;
}

interface CancellationPreview {
  canCancel: boolean;
  reason?: string;
  booking: {
    id: string;
    reference: string;
    status: string;
    pickupAt: string;
    total: number;
    currency: string;
  };
  policy: {
    allowCancellation: boolean;
    freeCancellationHours: number;
    partialRefundHours: number;
    partialRefundPercent: number;
  };
  refund: {
    originalAmount: number;
    refundAmount: number;
    refundPercent: number;
    retainedAmount: number;
    cancellationFee: number;
    isEligible: boolean;
    policyTier: 'full' | 'partial' | 'none';
    hoursUntilPickup: number;
    currency: string;
  };
  hoursUntilPickup: number;
  refundMessage: string;
  policyTierDescription: string;
}

/**
 * Booking Cancellation Content Component
 *
 * Client component for cancelling a booking with policy preview.
 */
export function BookingCancelContent({
  booking,
  locale,
}: BookingCancelContentProps) {
  const t = useTranslations('booking');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [reason, setReason] = useState('');

  // Preview state
  const [preview, setPreview] = useState<CancellationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Submit state
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [refundInfo, setRefundInfo] = useState<string | null>(null);

  // Vehicle info
  const vehicleName = booking.vehicle
    ? `${booking.vehicle.make} ${booking.vehicle.model}`
    : 'Unknown Vehicle';
  const vehiclePhoto = booking.vehicle?.photoUrl;
  const durationDays = calculateDurationDays(booking.pickupAt, booking.returnAt);

  // Fetch cancellation preview on mount
  useEffect(() => {
    const fetchPreview = async () => {
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const response = await fetch(`/api/account/bookings/${booking.id}/cancel`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to load cancellation details');
        }

        const data = await response.json();
        setPreview(data);
      } catch (error) {
        console.error('Error fetching cancellation preview:', error);
        setPreviewError(error instanceof Error ? error.message : 'Failed to load cancellation details');
      } finally {
        setPreviewLoading(false);
      }
    };

    fetchPreview();
  }, [booking.id]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!reason.trim()) {
      setSubmitError(t('cancelReasonRequired'));
      return;
    }

    setSubmitError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/account/bookings/${booking.id}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reason.trim() }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to cancel booking');
        }

        setSubmitSuccess(true);
        setRefundInfo(data.message);

        // Redirect after a short delay
        setTimeout(() => {
          router.push(`/${locale}/account/bookings/${booking.id}`);
          router.refresh();
        }, 3000);
      } catch (error) {
        console.error('Error cancelling booking:', error);
        setSubmitError(error instanceof Error ? error.message : 'Failed to cancel booking');
      }
    });
  };

  // Refund tier badge color
  const getTierBadgeColor = (tier: 'full' | 'partial' | 'none') => {
    switch (tier) {
      case 'full':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'none':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    }
  };

  if (submitSuccess) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
          <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{t('cancelSuccess')}</h2>
        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
          {refundInfo || t('cancelSuccessMessage')}
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
          <h1 className="text-xl sm:text-2xl font-bold">{t('cancelBooking')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('bookingReference')}: <span className="font-mono">{booking.reference}</span>
          </p>
        </div>
      </div>

      {/* Warning Banner */}
      <Alert variant="destructive" className="border-red-300 bg-red-50 dark:bg-red-950/30">
        <AlertTriangle className="w-4 h-4" />
        <AlertTitle>{t('cancelWarningTitle')}</AlertTitle>
        <AlertDescription>
          {t('cancelWarningMessage')}
        </AlertDescription>
      </Alert>

      {/* Booking Summary */}
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
              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(booking.pickupAt, locale)}
                </span>
                <span>-</span>
                <span>{formatDate(booking.returnAt, locale)}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">
                  {durationDays} {durationDays === 1 ? 'day' : 'days'}
                </Badge>
                <span className="font-semibold text-primary">
                  {formatCurrency(booking.pricing.total, booking.pricing.currency, locale)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancellation Policy & Refund */}
      {previewLoading ? (
        <Card>
          <CardContent className="p-8 flex items-center justify-center">
            <Spinner />
          </CardContent>
        </Card>
      ) : previewError ? (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>{previewError}</AlertDescription>
        </Alert>
      ) : preview && !preview.canCancel ? (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>{t('cancelNotAllowed')}</AlertTitle>
          <AlertDescription>{preview.reason}</AlertDescription>
        </Alert>
      ) : preview && !preview.policy.allowCancellation ? (
        <Alert>
          <Info className="w-4 h-4" />
          <AlertTitle>{t('cancelContactRequired')}</AlertTitle>
          <AlertDescription>
            {t('cancelContactRequiredMessage')}
          </AlertDescription>
        </Alert>
      ) : preview ? (
        <>
          {/* Cancellation Policy Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4" />
                {t('cancellationPolicy')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Policy Rules */}
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  <span>
                    {t('cancelPolicyFull', { hours: preview.policy.freeCancellationHours })}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                  <span>
                    {t('cancelPolicyPartial', {
                      hours: preview.policy.partialRefundHours,
                      percent: preview.policy.partialRefundPercent,
                    })}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <span>
                    {t('cancelPolicyNone', { hours: preview.policy.partialRefundHours })}
                  </span>
                </div>
              </div>

              {/* Time Until Pickup */}
              <div className="p-3 rounded-lg bg-muted text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {t('cancelTimeUntilPickup')}:
                  </span>
                  <span className="font-medium">
                    {Math.floor(preview.hoursUntilPickup)} {t('cancelHours')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Refund Calculation Card */}
          <Card className={cn(
            'border-l-4',
            preview.refund.policyTier === 'full' && 'border-l-green-500',
            preview.refund.policyTier === 'partial' && 'border-l-yellow-500',
            preview.refund.policyTier === 'none' && 'border-l-red-500'
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  {t('refundAmount')}
                </CardTitle>
                <Badge className={getTierBadgeColor(preview.refund.policyTier)}>
                  {preview.refund.policyTier === 'full' && t('fullRefund')}
                  {preview.refund.policyTier === 'partial' && t('partialRefund')}
                  {preview.refund.policyTier === 'none' && t('noRefund')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Refund breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('cancelOriginalAmount')}</span>
                  <span>{formatCurrency(preview.refund.originalAmount, preview.refund.currency, locale)}</span>
                </div>

                {preview.refund.cancellationFee > 0 && (
                  <div className="flex justify-between text-red-600 dark:text-red-400">
                    <span>{t('cancellationFee')}</span>
                    <span>-{formatCurrency(preview.refund.cancellationFee, preview.refund.currency, locale)}</span>
                  </div>
                )}

                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold">
                    <span>{t('cancelRefundYouWillReceive')}</span>
                    <span className={cn(
                      preview.refund.refundAmount > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                    )}>
                      {formatCurrency(preview.refund.refundAmount, preview.refund.currency, locale)}
                    </span>
                  </div>
                  {preview.refund.refundPercent > 0 && preview.refund.refundPercent < 100 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ({preview.refund.refundPercent}% {t('cancelOfOriginal')})
                    </p>
                  )}
                </div>
              </div>

              {/* Refund message */}
              <p className="text-sm text-muted-foreground">
                {preview.policyTierDescription}
              </p>
            </CardContent>
          </Card>

          {/* Cancellation Reason Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('cancelReasonTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">{t('cancelReasonLabel')}</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('cancelReasonPlaceholder')}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Submit Error */}
              {submitError && (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="destructive"
                  onClick={handleSubmit}
                  disabled={isPending || !reason.trim()}
                  className="flex-1 gap-2"
                >
                  {isPending ? (
                    <>
                      <Spinner className="w-4 h-4" />
                      {t('cancelProcessing')}
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4" />
                      {t('confirmCancel')}
                    </>
                  )}
                </Button>
                <Button variant="outline" asChild className="flex-1">
                  <Link href={`/${locale}/account/bookings/${booking.id}`}>
                    {t('cancelKeepBooking')}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
