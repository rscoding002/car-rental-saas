'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils/format';
import { getStatusColorClass, formatBookingStatus } from '@/lib/booking/types';
import type { BookingWithRelations } from '@/lib/booking/types';

interface ConfirmationContentProps {
  booking: BookingWithRelations;
  locale: string;
}

export function ConfirmationContent({ booking, locale }: ConfirmationContentProps) {
  const t = useTranslations('booking');
  const tCommon = useTranslations('common');

  // Get vehicle photo
  const vehiclePhoto = booking.vehicle?.photoUrl;
  const vehicleName = booking.vehicle
    ? `${booking.vehicle.make} ${booking.vehicle.model} (${booking.vehicle.year})`
    : 'Vehicle';

  // Format dates
  const pickupDate = formatDate(booking.pickupAt, locale);
  const pickupTime = formatTime(booking.pickupAt, locale);
  const returnDate = formatDate(booking.returnAt, locale);
  const returnTime = formatTime(booking.returnAt, locale);

  // Check if one-way rental
  const isOneWay = booking.pickupBranchId !== booking.returnBranchId;

  // Print confirmation
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Add to calendar (generates ICS file)
  const handleAddToCalendar = useCallback(() => {
    const startDate = new Date(booking.pickupAt);
    const endDate = new Date(booking.returnAt);

    // Format dates for ICS
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const pickupLocation = booking.pickupBranch
      ? `${booking.pickupBranch.name}, ${booking.pickupBranch.address}, ${booking.pickupBranch.city}`
      : '';

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Car Rental//Booking//EN
BEGIN:VEVENT
UID:${booking.id}@carrental
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:Car Rental - ${vehicleName}
DESCRIPTION:Booking Reference: ${booking.reference}\\nVehicle: ${vehicleName}\\nPick-up: ${pickupDate} at ${pickupTime}\\nReturn: ${returnDate} at ${returnTime}
LOCATION:${pickupLocation}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `booking-${booking.reference}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [booking, vehicleName, pickupDate, pickupTime, returnDate, returnTime]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Rental Details Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('rentalDetails')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Pick-up */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {t('pickupLocation')}
              </p>
              <p className="font-semibold">{booking.pickupBranch?.name || '-'}</p>
              <p className="text-sm text-muted-foreground">
                {booking.pickupBranch?.address}, {booking.pickupBranch?.city}
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="font-medium">{pickupDate}</span>
                <span className="text-muted-foreground">at</span>
                <span className="font-medium">{pickupTime}</span>
              </div>
            </div>

            {/* Return */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {t('returnLocation')}
              </p>
              <p className="font-semibold">{booking.returnBranch?.name || '-'}</p>
              <p className="text-sm text-muted-foreground">
                {booking.returnBranch?.address}, {booking.returnBranch?.city}
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="font-medium">{returnDate}</span>
                <span className="text-muted-foreground">at</span>
                <span className="font-medium">{returnTime}</span>
              </div>
            </div>
          </div>

          {isOneWay && (
            <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 px-3 py-2">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <span className="font-medium">{t('oneWayFee')}:</span> Different return location
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Card */}
      <Card className="overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          {/* Vehicle Image */}
          {vehiclePhoto ? (
            <div className="relative aspect-[16/9] sm:aspect-[4/3] sm:w-48 lg:w-56 flex-shrink-0">
              <Image
                src={vehiclePhoto}
                alt={vehicleName}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 224px"
              />
            </div>
          ) : (
            <div className="flex aspect-[16/9] sm:aspect-[4/3] sm:w-48 lg:w-56 flex-shrink-0 items-center justify-center bg-muted">
              <svg
                className="h-12 w-12 text-muted-foreground/50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7h8m-8 4h8m-4 4h4M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z"
                />
              </svg>
            </div>
          )}

          {/* Vehicle Info */}
          <div className="flex-1 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-lg">{vehicleName}</h3>
                {booking.vehicle?.category?.name && (
                  <p className="text-sm text-muted-foreground">
                    {(booking.vehicle.category.name as Record<string, string>)[locale] ||
                      (booking.vehicle.category.name as Record<string, string>).en ||
                      'Category'}
                  </p>
                )}
              </div>
              <Badge className={getStatusColorClass(booking.status)}>
                {formatBookingStatus(booking.status)}
              </Badge>
            </div>

            {/* Vehicle Specs */}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {booking.vehicle?.transmission && (
                <span className="flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  {booking.vehicle.transmission === 'automatic' ? 'Automatic' : 'Manual'}
                </span>
              )}
              {booking.vehicle?.seats && (
                <span className="flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {booking.vehicle.seats} seats
                </span>
              )}
              {booking.vehicle?.fuelType && (
                <span className="flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {booking.vehicle.fuelType}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Price Summary Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('priceBreakdown')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Base Rate */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t('baseRate')} ({booking.pricing.duration} {booking.pricing.rateType === 'daily' ? tCommon('days') : booking.pricing.rateType})
              </span>
              <span>{formatCurrency(booking.pricing.subtotal, booking.pricing.currency, locale)}</span>
            </div>

            {/* Addons */}
            {booking.pricing.addonsTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('addonsTotal')}</span>
                <span>{formatCurrency(booking.pricing.addonsTotal, booking.pricing.currency, locale)}</span>
              </div>
            )}

            {/* One-way Fee */}
            {booking.pricing.oneWayFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('oneWayFee')}</span>
                <span>{formatCurrency(booking.pricing.oneWayFee, booking.pricing.currency, locale)}</span>
              </div>
            )}

            {/* Discount */}
            {booking.pricing.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>{t('discount')}</span>
                <span>-{formatCurrency(booking.pricing.discountAmount, booking.pricing.currency, locale)}</span>
              </div>
            )}

            {/* Divider */}
            <div className="my-3 border-t" />

            {/* Total */}
            <div className="flex justify-between font-semibold text-lg">
              <span>{tCommon('total')}</span>
              <span>{formatCurrency(booking.pricing.total, booking.pricing.currency, locale)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Driver Info Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('driverDetails')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">{tCommon('name')}</p>
              <p className="font-medium">
                {booking.driverInfo.firstName} {booking.driverInfo.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tCommon('email')}</p>
              <p className="font-medium">{booking.driverInfo.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tCommon('phone')}</p>
              <p className="font-medium">{booking.driverInfo.phone}</p>
            </div>
            {booking.driverInfo.driverLicense?.number && (
              <div>
                <p className="text-sm text-muted-foreground">License Number</p>
                <p className="font-medium">{booking.driverInfo.driverLicense.number}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* What's Next Card */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('whatNext')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                1
              </span>
              <span>
                Check your email for the booking confirmation with all details
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                2
              </span>
              <span>
                Bring your driver's license and the credit card used for booking
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                3
              </span>
              <span>
                Arrive at {booking.pickupBranch?.name || 'the pick-up location'} on {pickupDate} at {pickupTime}
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 print:hidden">
        <Button variant="outline" onClick={handlePrint} className="gap-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          {t('printConfirmation')}
        </Button>

        <Button variant="outline" onClick={handleAddToCalendar} className="gap-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {t('addToCalendar')}
        </Button>

        <Link href={`/${locale}/account/bookings`}>
          <Button className="gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            View My Bookings
          </Button>
        </Link>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          header, footer, nav {
            display: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
