'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  Calendar,
  Clock,
  MapPin,
  Car,
  Phone,
  User,
  FileText,
  Tag,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Hourglass,
  PlayCircle,
  Printer,
  CalendarPlus,
  Copy,
  Check,
  Edit,
  Ban,
} from 'lucide-react';

import type { BookingWithRelations } from '@/lib/booking/types';
import type { BookingStatus } from '@/lib/supabase/types';
import { calculateDurationDays, isBookingCancellable, isBookingModifiable } from '@/lib/booking/types';
import { formatCurrency, formatDate, formatTime, formatDateTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BookingDetailContentProps {
  booking: BookingWithRelations;
  locale: string;
}

// Status configuration
const statusConfig: Record<
  BookingStatus,
  {
    label: string;
    variant: 'success' | 'warning' | 'secondary' | 'destructive' | 'default';
    icon: typeof CheckCircle;
    bgClass: string;
    textClass: string;
  }
> = {
  pending: {
    label: 'Pending',
    variant: 'warning',
    icon: Hourglass,
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    textClass: 'text-yellow-800 dark:text-yellow-400',
  },
  confirmed: {
    label: 'Confirmed',
    variant: 'default',
    icon: CheckCircle,
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-800 dark:text-blue-400',
  },
  active: {
    label: 'Active',
    variant: 'success',
    icon: PlayCircle,
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-800 dark:text-green-400',
  },
  completed: {
    label: 'Completed',
    variant: 'secondary',
    icon: CheckCircle,
    bgClass: 'bg-gray-100 dark:bg-gray-800',
    textClass: 'text-gray-800 dark:text-gray-400',
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'destructive',
    icon: XCircle,
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-800 dark:text-red-400',
  },
};

/**
 * Booking Detail Content Component
 *
 * Client component showing full booking details with actions.
 */
export function BookingDetailContent({
  booking,
  locale,
}: BookingDetailContentProps) {
  const t = useTranslations('booking');
  const tAccount = useTranslations('account');
  const tCommon = useTranslations('common');
  const [copiedRef, setCopiedRef] = useState(false);

  const status = statusConfig[booking.status];
  const StatusIcon = status.icon;
  const isOneWay = booking.pickupBranchId !== booking.returnBranchId;
  const durationDays = calculateDurationDays(booking.pickupAt, booking.returnAt);
  const canCancel = isBookingCancellable(booking.status);
  const canModify = isBookingModifiable(booking.status);

  // Vehicle info
  const vehicleName = booking.vehicle
    ? `${booking.vehicle.make} ${booking.vehicle.model}`
    : 'Unknown Vehicle';
  const vehicleYear = booking.vehicle?.year;
  const vehiclePhoto = booking.vehicle?.photoUrl;

  // Copy reference to clipboard
  const handleCopyReference = async () => {
    try {
      await navigator.clipboard.writeText(booking.reference);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      console.error('Failed to copy:', err);
    }
  };

  // Generate calendar event URL (Google Calendar)
  const handleAddToCalendar = () => {
    const startDate = new Date(booking.pickupAt);
    const endDate = new Date(booking.returnAt);

    const formatCalendarDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const title = encodeURIComponent(`Car Rental: ${vehicleName}`);
    const details = encodeURIComponent(
      `Booking Reference: ${booking.reference}\n` +
        `Vehicle: ${vehicleName}\n` +
        `Pick-up: ${booking.pickupBranch?.name || ''}, ${booking.pickupBranch?.address || ''}\n` +
        `Return: ${booking.returnBranch?.name || ''}, ${booking.returnBranch?.address || ''}`
    );
    const location = encodeURIComponent(
      booking.pickupBranch?.address
        ? `${booking.pickupBranch.address}, ${booking.pickupBranch.city}`
        : ''
    );

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatCalendarDate(startDate)}/${formatCalendarDate(endDate)}&details=${details}&location=${location}`;

    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <Card className={cn('border-l-4', {
        'border-l-yellow-500': booking.status === 'pending',
        'border-l-blue-500': booking.status === 'confirmed',
        'border-l-green-500': booking.status === 'active',
        'border-l-gray-500': booking.status === 'completed',
        'border-l-red-500': booking.status === 'cancelled',
      })}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', status.bgClass, status.textClass)}>
                <StatusIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold font-mono text-lg">{booking.reference}</h2>
                  <button
                    onClick={handleCopyReference}
                    className="p-1 rounded hover:bg-muted transition-colors"
                    title="Copy reference"
                  >
                    {copiedRef ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <Badge className={cn(status.bgClass, status.textClass, 'mt-1')}>
                  {t(`status.${booking.status}`)}
                </Badge>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleAddToCalendar}
              >
                <CalendarPlus className="w-4 h-4" />
                <span className="hidden sm:inline">{t('addToCalendar')}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
          </div>

          {/* Cancellation info */}
          {booking.cancelledAt && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-sm">
              <p className="font-medium text-red-800 dark:text-red-200">
                {t('status.cancelled')}
              </p>
              <p className="text-red-600 dark:text-red-300 text-xs mt-1">
                {formatDate(booking.cancelledAt, locale)}
              </p>
              {booking.cancellationReason && (
                <p className="text-red-600 dark:text-red-300 text-xs mt-1">
                  {booking.cancellationReason}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Vehicle & Dates */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="w-4 h-4" />
                {t('vehicleDetails')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Vehicle Photo */}
                {vehiclePhoto ? (
                  <div className="relative w-full sm:w-48 aspect-[4/3] rounded-lg overflow-hidden bg-muted shrink-0">
                    <Image
                      src={vehiclePhoto}
                      alt={vehicleName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 192px"
                    />
                  </div>
                ) : (
                  <div className="w-full sm:w-48 aspect-[4/3] rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Car className="w-12 h-12 text-muted-foreground/50" />
                  </div>
                )}

                {/* Vehicle Details */}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{vehicleName}</h3>
                  {vehicleYear && (
                    <p className="text-sm text-muted-foreground">{vehicleYear}</p>
                  )}
                  {booking.vehicle?.category?.name && (
                    <Badge variant="outline" className="mt-2">
                      {(booking.vehicle.category.name as Record<string, string>)[locale] ||
                        (booking.vehicle.category.name as Record<string, string>).en ||
                        'Category'}
                    </Badge>
                  )}

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                    {booking.vehicle?.transmission && (
                      <span className="capitalize">{booking.vehicle.transmission}</span>
                    )}
                    {booking.vehicle?.seats && <span>{booking.vehicle.seats} seats</span>}
                    {booking.vehicle?.fuelType && (
                      <span className="capitalize">{booking.vehicle.fuelType}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rental Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t('rentalDetails')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Pickup */}
                <div className="p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center justify-center">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                    <span className="font-medium">{t('pickupLocation')}</span>
                  </div>
                  <p className="font-semibold">{booking.pickupBranch?.name || '-'}</p>
                  {booking.pickupBranch?.address && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {booking.pickupBranch.address}
                      {booking.pickupBranch.city && `, ${booking.pickupBranch.city}`}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{formatDate(booking.pickupAt, locale)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{formatTime(booking.pickupAt, locale)}</span>
                    </div>
                  </div>
                  {booking.pickupBranch?.phone && (
                    <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{booking.pickupBranch.phone}</span>
                    </div>
                  )}
                </div>

                {/* Return */}
                <div className="p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span className="font-medium">{t('returnLocation')}</span>
                  </div>
                  <p className="font-semibold">{booking.returnBranch?.name || '-'}</p>
                  {booking.returnBranch?.address && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {booking.returnBranch.address}
                      {booking.returnBranch.city && `, ${booking.returnBranch.city}`}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{formatDate(booking.returnAt, locale)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{formatTime(booking.returnAt, locale)}</span>
                    </div>
                  </div>
                  {booking.returnBranch?.phone && (
                    <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{booking.returnBranch.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Duration & One-way info */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Badge variant="secondary">
                  {durationDays} {durationDays === 1 ? 'day' : 'days'}
                </Badge>
                {isOneWay && (
                  <Badge variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                    <MapPin className="w-3 h-3 mr-1" />
                    One-way rental
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Driver Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                {tAccount('driverInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="font-medium">
                    {booking.driverInfo.firstName} {booking.driverInfo.lastName}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{tCommon('email')}</dt>
                  <dd className="font-medium">{booking.driverInfo.email}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{tCommon('phone')}</dt>
                  <dd className="font-medium">{booking.driverInfo.phone}</dd>
                </div>
                {booking.driverInfo.dateOfBirth && (
                  <div>
                    <dt className="text-muted-foreground">{tAccount('dateOfBirth')}</dt>
                    <dd className="font-medium">{booking.driverInfo.dateOfBirth}</dd>
                  </div>
                )}
                {booking.driverInfo.driverLicense?.number && (
                  <div>
                    <dt className="text-muted-foreground">{tAccount('licenseNumber')}</dt>
                    <dd className="font-medium font-mono">
                      {booking.driverInfo.driverLicense.number}
                    </dd>
                  </div>
                )}
                {booking.driverInfo.driverLicense?.expiryDate && (
                  <div>
                    <dt className="text-muted-foreground">{tAccount('licenseExpiry')}</dt>
                    <dd className="font-medium">
                      {booking.driverInfo.driverLicense.expiryDate}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Notes */}
          {booking.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {booking.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Pricing & Actions */}
        <div className="space-y-6">
          {/* Price Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="w-4 h-4" />
                {t('priceBreakdown')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {/* Base Rate */}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('baseRate')} ({booking.pricing.duration}{' '}
                  {booking.pricing.rateType === 'daily' ? 'days' : booking.pricing.rateType})
                </span>
                <span>
                  {formatCurrency(booking.pricing.subtotal, booking.pricing.currency, locale)}
                </span>
              </div>

              {/* Seasonal */}
              {booking.pricing.seasonalMultiplier && booking.pricing.seasonalMultiplier !== 1 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>{t('seasonalAdjustment')}</span>
                  <span>{booking.pricing.seasonalMultiplier}x</span>
                </div>
              )}

              {/* Add-ons */}
              {booking.pricing.addonsTotal > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('addonsTotal')}</span>
                    <span>
                      {formatCurrency(booking.pricing.addonsTotal, booking.pricing.currency, locale)}
                    </span>
                  </div>
                  {/* Addon details */}
                  {booking.addons && booking.addons.length > 0 && (
                    <div className="ml-3 space-y-1 border-l-2 border-muted pl-3">
                      {booking.addons.map((addon) => (
                        <div
                          key={addon.id}
                          className="flex justify-between text-xs text-muted-foreground"
                        >
                          <span>
                            {(addon.addon?.name as Record<string, string> | undefined)?.[locale] ||
                              (addon.addon?.name as Record<string, string> | undefined)?.en ||
                              'Add-on'}{' '}
                            {addon.quantity > 1 && `x${addon.quantity}`}
                          </span>
                          <span>
                            {formatCurrency(addon.totalPrice, booking.pricing.currency, locale)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* One-way Fee */}
              {booking.pricing.oneWayFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('oneWayFee')}</span>
                  <span>
                    {formatCurrency(booking.pricing.oneWayFee, booking.pricing.currency, locale)}
                  </span>
                </div>
              )}

              {/* Discount */}
              {booking.pricing.discountAmount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>
                    {t('discount')}
                    {booking.coupon && ` (${booking.coupon.code})`}
                  </span>
                  <span>
                    -{formatCurrency(booking.pricing.discountAmount, booking.pricing.currency, locale)}
                  </span>
                </div>
              )}

              {/* Divider */}
              <div className="border-t pt-3" />

              {/* Total */}
              <div className="flex justify-between font-semibold text-base">
                <span>{tCommon('total')}</span>
                <span className="text-primary">
                  {formatCurrency(booking.pricing.total, booking.pricing.currency, locale)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions Card */}
          {(canModify || canCancel) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {tCommon('actions')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {canModify && (
                  <Link href={`/${locale}/account/bookings/${booking.id}/modify`}>
                    <Button variant="outline" className="w-full gap-2">
                      <Edit className="w-4 h-4" />
                      {t('modify')}
                    </Button>
                  </Link>
                )}
                {canCancel && (
                  <Link href={`/${locale}/account/bookings/${booking.id}/cancel`}>
                    <Button variant="destructive" className="w-full gap-2">
                      <Ban className="w-4 h-4" />
                      {t('cancel')}
                    </Button>
                  </Link>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('cancellationPolicy')}: Changes may affect pricing.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Booking Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Created</span>
                  <span>{formatDateTime(booking.createdAt, locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Updated</span>
                  <span>{formatDateTime(booking.updatedAt, locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Booking ID</span>
                  <span className="font-mono">{booking.id.slice(0, 8)}...</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
