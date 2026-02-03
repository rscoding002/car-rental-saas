import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Car,
  Mail,
  Phone,
  CreditCard,
  FileText,
  Tag,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Hourglass,
  PlayCircle,
  Printer,
  Copy,
} from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils/format';
import { getBookingWithRelations } from '@/lib/booking/queries';
import { calculateDurationDays } from '@/lib/booking/types';
import type { BookingStatus } from '@/lib/supabase/types';
import { BookingStatusActions } from './booking-status-actions';

interface BookingDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

// Status configuration
const statusConfig: Record<
  BookingStatus,
  {
    label: string;
    variant: 'success' | 'warning' | 'secondary' | 'destructive' | 'default';
    icon: typeof CheckCircle;
    description: string;
  }
> = {
  pending: {
    label: 'Pending',
    variant: 'warning',
    icon: Hourglass,
    description: 'Awaiting payment confirmation',
  },
  confirmed: {
    label: 'Confirmed',
    variant: 'default',
    icon: CheckCircle,
    description: 'Payment received, ready for pickup',
  },
  active: {
    label: 'Active',
    variant: 'success',
    icon: PlayCircle,
    description: 'Vehicle picked up, rental in progress',
  },
  completed: {
    label: 'Completed',
    variant: 'secondary',
    icon: CheckCircle,
    description: 'Vehicle returned, rental finished',
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'destructive',
    icon: XCircle,
    description: 'Booking was cancelled',
  },
};

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
  const { locale, id } = await params;
  const supabase = await createClient();

  // Fetch booking with all relations
  const booking = await getBookingWithRelations(supabase, id);

  if (!booking) {
    notFound();
  }

  const status = statusConfig[booking.status];
  const StatusIcon = status.icon;
  const isOneWay = booking.pickupBranchId !== booking.returnBranchId;
  const durationDays = calculateDurationDays(booking.pickupAt, booking.returnAt);

  // Format dates
  const pickupDateStr = formatDate(booking.pickupAt, locale);
  const pickupTimeStr = formatTime(booking.pickupAt, locale);
  const returnDateStr = formatDate(booking.returnAt, locale);
  const returnTimeStr = formatTime(booking.returnAt, locale);
  const createdAtStr = formatDate(booking.createdAt, locale);

  // Vehicle info
  const vehicleName = booking.vehicle
    ? `${booking.vehicle.make} ${booking.vehicle.model} (${booking.vehicle.year})`
    : 'Unknown Vehicle';
  const vehiclePhoto = booking.vehicle?.photoUrl;

  // Customer info
  const customerName = booking.customer
    ? `${booking.customer.firstName || ''} ${booking.customer.lastName || ''}`.trim() || 'Unknown'
    : 'Unknown Customer';

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <Link href={`/${locale}/admin/bookings`}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold font-mono text-foreground">
              {booking.reference}
            </h1>
            <Badge variant={status.variant} className="gap-1">
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Created {createdAtStr} &bull; {durationDays} day{durationDays !== 1 ? 's' : ''} rental
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </Button>
        </div>
      </div>

      {/* Status Actions */}
      <BookingStatusActions
        bookingId={booking.id}
        currentStatus={booking.status}
        locale={locale}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    status.variant === 'success'
                      ? 'bg-green-100 text-green-700'
                      : status.variant === 'warning'
                      ? 'bg-yellow-100 text-yellow-700'
                      : status.variant === 'destructive'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  <StatusIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">{status.label}</p>
                  <p className="text-xs text-muted-foreground">{status.description}</p>
                </div>
              </div>
              {booking.cancelledAt && (
                <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-sm">
                  <p className="font-medium text-red-800 dark:text-red-200">Cancelled</p>
                  <p className="text-red-600 dark:text-red-300 text-xs mt-1">
                    {formatDate(booking.cancelledAt, locale)}
                  </p>
                  {booking.cancellationReason && (
                    <p className="text-red-600 dark:text-red-300 text-xs mt-1">
                      Reason: {booking.cancellationReason}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{customerName}</p>
                  {booking.customer?.email && (
                    <p className="text-xs text-muted-foreground">{booking.customer.email}</p>
                  )}
                </div>
              </div>
              {booking.customer?.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{booking.customer.phone}</span>
                </div>
              )}
              {booking.customer?.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate">{booking.customer.email}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-semibold">
                    {formatCurrency(booking.pricing.total, booking.pricing.currency, locale)}
                  </span>
                </div>
                {booking.stripePaymentIntentId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment ID</span>
                    <span className="font-mono text-xs truncate max-w-[120px]">
                      {booking.stripePaymentIntentId.slice(0, 12)}...
                    </span>
                  </div>
                )}
                {booking.coupon && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon ({booking.coupon.code})</span>
                    <span>
                      -{booking.coupon.discountType === 'percentage'
                        ? `${booking.coupon.discountValue}%`
                        : formatCurrency(booking.coupon.discountValue, booking.pricing.currency, locale)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rental Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Rental Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Pickup */}
                <div className="p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                    <span className="font-medium">Pick-up</span>
                  </div>
                  <p className="font-semibold">{booking.pickupBranch?.name || '-'}</p>
                  <p className="text-sm text-muted-foreground">
                    {booking.pickupBranch?.address}, {booking.pickupBranch?.city}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{pickupDateStr}</span>
                    <Clock className="w-4 h-4 text-muted-foreground ml-2" />
                    <span className="font-medium">{pickupTimeStr}</span>
                  </div>
                </div>

                {/* Return */}
                <div className="p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                      <ArrowLeft className="w-4 h-4" />
                    </div>
                    <span className="font-medium">Return</span>
                  </div>
                  <p className="font-semibold">{booking.returnBranch?.name || '-'}</p>
                  <p className="text-sm text-muted-foreground">
                    {booking.returnBranch?.address}, {booking.returnBranch?.city}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{returnDateStr}</span>
                    <Clock className="w-4 h-4 text-muted-foreground ml-2" />
                    <span className="font-medium">{returnTimeStr}</span>
                  </div>
                </div>
              </div>

              {isOneWay && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                    <span className="text-amber-800 dark:text-amber-200 font-medium">
                      One-way rental - Different return location
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="w-4 h-4" />
                Vehicle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Vehicle Photo */}
                {vehiclePhoto ? (
                  <div className="relative w-full sm:w-40 aspect-[4/3] rounded-lg overflow-hidden bg-muted shrink-0">
                    <Image
                      src={vehiclePhoto}
                      alt={vehicleName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 160px"
                    />
                  </div>
                ) : (
                  <div className="w-full sm:w-40 aspect-[4/3] rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Car className="w-10 h-10 text-muted-foreground/50" />
                  </div>
                )}

                {/* Vehicle Details */}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{vehicleName}</h3>
                  {booking.vehicle?.category?.name && (
                    <Badge variant="outline" className="mt-1">
                      {(booking.vehicle.category.name as Record<string, string>)[locale] ||
                        (booking.vehicle.category.name as Record<string, string>).en ||
                        'Category'}
                    </Badge>
                  )}

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                    {booking.vehicle?.transmission && (
                      <span>
                        {booking.vehicle.transmission === 'automatic' ? 'Automatic' : 'Manual'}
                      </span>
                    )}
                    {booking.vehicle?.seats && <span>{booking.vehicle.seats} seats</span>}
                    {booking.vehicle?.fuelType && (
                      <span className="capitalize">{booking.vehicle.fuelType}</span>
                    )}
                    {booking.vehicle?.licensePlate && (
                      <span className="font-mono">{booking.vehicle.licensePlate}</span>
                    )}
                  </div>

                  <Link
                    href={`/${locale}/admin/fleet/${booking.vehicleId}`}
                    className="inline-flex items-center gap-1 mt-3 text-sm text-primary hover:underline"
                  >
                    View vehicle details
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Driver Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Driver Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Full Name</dt>
                  <dd className="font-medium">
                    {booking.driverInfo.firstName} {booking.driverInfo.lastName}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="font-medium">{booking.driverInfo.email}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="font-medium">{booking.driverInfo.phone}</dd>
                </div>
                {booking.driverInfo.dateOfBirth && (
                  <div>
                    <dt className="text-muted-foreground">Date of Birth</dt>
                    <dd className="font-medium">{booking.driverInfo.dateOfBirth}</dd>
                  </div>
                )}
                {booking.driverInfo.driverLicense?.number && (
                  <div>
                    <dt className="text-muted-foreground">License Number</dt>
                    <dd className="font-medium font-mono">
                      {booking.driverInfo.driverLicense.number}
                    </dd>
                  </div>
                )}
                {booking.driverInfo.driverLicense?.expiryDate && (
                  <div>
                    <dt className="text-muted-foreground">License Expiry</dt>
                    <dd className="font-medium">{booking.driverInfo.driverLicense.expiryDate}</dd>
                  </div>
                )}
                {booking.driverInfo.driverLicense?.country && (
                  <div>
                    <dt className="text-muted-foreground">License Country</dt>
                    <dd className="font-medium">{booking.driverInfo.driverLicense.country}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Pricing Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Price Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {/* Base Rate */}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Base rate ({booking.pricing.duration}{' '}
                    {booking.pricing.rateType === 'daily' ? 'days' : booking.pricing.rateType} @{' '}
                    {formatCurrency(booking.pricing.baseRate, booking.pricing.currency, locale)}/
                    {booking.pricing.rateType === 'daily' ? 'day' : booking.pricing.rateType})
                  </span>
                  <span>
                    {formatCurrency(booking.pricing.subtotal, booking.pricing.currency, locale)}
                  </span>
                </div>

                {/* Seasonal Multiplier */}
                {booking.pricing.seasonalMultiplier && booking.pricing.seasonalMultiplier !== 1 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Seasonal adjustment ({booking.pricing.seasonalMultiplier}x)</span>
                    <span>Included</span>
                  </div>
                )}

                {/* Addons */}
                {booking.pricing.addonsTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Add-ons</span>
                    <span>
                      {formatCurrency(booking.pricing.addonsTotal, booking.pricing.currency, locale)}
                    </span>
                  </div>
                )}

                {/* Show addon details if available */}
                {booking.addons && booking.addons.length > 0 && (
                  <div className="pl-4 space-y-1 border-l-2 border-muted ml-2">
                    {booking.addons.map((addon) => (
                      <div key={addon.id} className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {(addon.addon?.name as Record<string, string> | undefined)?.[locale] ||
                            (addon.addon?.name as Record<string, string> | undefined)?.en ||
                            'Add-on'}{' '}
                          x{addon.quantity}
                        </span>
                        <span>
                          {formatCurrency(addon.totalPrice, booking.pricing.currency, locale)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* One-way Fee */}
                {booking.pricing.oneWayFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">One-way fee</span>
                    <span>
                      {formatCurrency(booking.pricing.oneWayFee, booking.pricing.currency, locale)}
                    </span>
                  </div>
                )}

                {/* Discount */}
                {booking.pricing.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>
                      Discount
                      {booking.pricing.discountPercent
                        ? ` (${booking.pricing.discountPercent}%)`
                        : ''}
                    </span>
                    <span>
                      -
                      {formatCurrency(
                        booking.pricing.discountAmount,
                        booking.pricing.currency,
                        locale
                      )}
                    </span>
                  </div>
                )}

                {/* Divider */}
                <div className="my-3 border-t border-border" />

                {/* Total */}
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>
                    {formatCurrency(booking.pricing.total, booking.pricing.currency, locale)}
                  </span>
                </div>
              </div>
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
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{booking.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span>
                  Created:{' '}
                  {new Date(booking.createdAt).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span>
                  Updated:{' '}
                  {new Date(booking.updatedAt).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="font-mono">ID: {booking.id.slice(0, 8)}...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
