'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Car,
  Calendar,
  MapPin,
  ArrowRight,
  ChevronRight,
  Clock,
  CreditCard,
} from 'lucide-react';

import type { BookingSummary, BookingStatus } from '@/lib/booking/types';
import { formatDate, formatCurrency, formatDateTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { Badge } from '@/components/ui/badge';

/**
 * Booking Card Component Variants
 */
export type BookingCardVariant = 'default' | 'compact' | 'minimal';

/**
 * Booking Card Props
 */
export interface BookingCardProps {
  /** Booking data */
  booking: BookingSummary;
  /** Current locale for formatting */
  locale: string;
  /** Card variant for different display contexts */
  variant?: BookingCardVariant;
  /** Whether to show the total price */
  showPrice?: boolean;
  /** Whether to show the action arrow */
  showArrow?: boolean;
  /** Whether to show customer info (admin view) */
  showCustomer?: boolean;
  /** Custom link href (defaults to booking detail page) */
  href?: string;
  /** Click handler (alternative to link) */
  onClick?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Status color configuration
 */
const statusConfig: Record<
  BookingStatus,
  { bgClass: string; textClass: string; darkBgClass: string; darkTextClass: string }
> = {
  pending: {
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-800',
    darkBgClass: 'dark:bg-yellow-900/30',
    darkTextClass: 'dark:text-yellow-400',
  },
  confirmed: {
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-800',
    darkBgClass: 'dark:bg-blue-900/30',
    darkTextClass: 'dark:text-blue-400',
  },
  active: {
    bgClass: 'bg-green-100',
    textClass: 'text-green-800',
    darkBgClass: 'dark:bg-green-900/30',
    darkTextClass: 'dark:text-green-400',
  },
  completed: {
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-800',
    darkBgClass: 'dark:bg-gray-800',
    darkTextClass: 'dark:text-gray-400',
  },
  cancelled: {
    bgClass: 'bg-red-100',
    textClass: 'text-red-800',
    darkBgClass: 'dark:bg-red-900/30',
    darkTextClass: 'dark:text-red-400',
  },
};

/**
 * Get status color classes
 */
function getStatusClasses(status: BookingStatus): string {
  const config = statusConfig[status] || statusConfig.pending;
  return cn(config.bgClass, config.textClass, config.darkBgClass, config.darkTextClass);
}

/**
 * Booking Card Component
 *
 * Displays a booking summary card for customer account portal.
 * Mobile-first responsive design with multiple variants.
 *
 * @example
 * // Default variant
 * <BookingCard booking={booking} locale="en" />
 *
 * @example
 * // Compact variant for sidebars
 * <BookingCard booking={booking} locale="en" variant="compact" />
 *
 * @example
 * // With price and customer info (admin view)
 * <BookingCard booking={booking} locale="en" showPrice showCustomer />
 */
export function BookingCard({
  booking,
  locale,
  variant = 'default',
  showPrice = false,
  showArrow = true,
  showCustomer = false,
  href,
  onClick,
  className,
}: BookingCardProps) {
  const t = useTranslations('booking');

  const isActive = booking.status === 'active';
  const linkHref = href || `/${locale}/account/bookings/${booking.id}`;

  const statusClasses = getStatusClasses(booking.status);
  const statusLabel = t(`status.${booking.status}`);

  // Wrapper component - either Link or div with onClick
  const Wrapper = onClick ? 'div' : Link;
  const wrapperProps = onClick
    ? { onClick, role: 'button', tabIndex: 0 }
    : { href: linkHref };

  if (variant === 'minimal') {
    return (
      <Wrapper
        {...(wrapperProps as any)}
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
          'hover:bg-accent/50',
          isActive
            ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10'
            : 'border-border bg-card',
          className
        )}
      >
        {/* Vehicle Icon/Photo */}
        <div className="flex-shrink-0 w-10 h-10 rounded-md bg-muted flex items-center justify-center">
          {booking.vehiclePhoto ? (
            <img
              src={booking.vehiclePhoto}
              alt={booking.vehicleName}
              className="w-full h-full object-cover rounded-md"
            />
          ) : (
            <Car className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm truncate">
            {booking.vehicleName}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(booking.pickupAt, locale, 'short')}
          </p>
        </div>

        {/* Status Badge */}
        <Badge size="sm" className={statusClasses}>
          {statusLabel}
        </Badge>
      </Wrapper>
    );
  }

  if (variant === 'compact') {
    return (
      <Wrapper
        {...(wrapperProps as any)}
        className={cn(
          'block rounded-lg border p-3 transition-colors cursor-pointer',
          'hover:bg-accent/50',
          isActive
            ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10'
            : 'border-border bg-card',
          className
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm truncate">
              {booking.vehicleName}
            </p>
            <p className="text-xs text-muted-foreground">{booking.reference}</p>
          </div>
          <Badge size="sm" className={statusClasses}>
            {statusLabel}
          </Badge>
        </div>

        {/* Dates - Single Line */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{formatDate(booking.pickupAt, locale, 'short')}</span>
          <ArrowRight className="h-3 w-3" />
          <span>{formatDate(booking.returnAt, locale, 'short')}</span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">
            {booking.pickupBranch}
            {booking.isOneWay && ` → ${booking.returnBranch}`}
          </span>
        </div>

        {/* Price (optional) */}
        {showPrice && (
          <div className="flex items-center gap-1.5 text-xs mt-2 pt-2 border-t border-border">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium text-foreground">
              {formatCurrency(booking.total, booking.currency, locale)}
            </span>
          </div>
        )}
      </Wrapper>
    );
  }

  // Default variant
  return (
    <Wrapper
      {...(wrapperProps as any)}
      className={cn(
        'block rounded-lg border p-4 transition-colors cursor-pointer',
        'hover:bg-accent/50',
        isActive
          ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10'
          : 'border-border bg-card',
        className
      )}
    >
      <div className="flex gap-4">
        {/* Vehicle Photo */}
        <div className="flex-shrink-0 hidden sm:block">
          {booking.vehiclePhoto ? (
            <img
              src={booking.vehiclePhoto}
              alt={booking.vehicleName}
              className="w-24 h-16 object-cover rounded-md"
            />
          ) : (
            <div className="w-24 h-16 rounded-md bg-muted flex items-center justify-center">
              <Car className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Booking Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="font-semibold text-foreground">{booking.vehicleName}</p>
              <p className="text-xs text-muted-foreground">{booking.reference}</p>
            </div>
            <Badge className={statusClasses}>{statusLabel}</Badge>
          </div>

          {/* Customer Info (admin view) */}
          {showCustomer && booking.customerName && (
            <p className="text-sm text-foreground mb-2">
              {booking.customerName}
              {booking.customerEmail && (
                <span className="text-muted-foreground ml-1">
                  ({booking.customerEmail})
                </span>
              )}
            </p>
          )}

          {/* Dates */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-foreground">
                {formatDate(booking.pickupAt, locale)}
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <span className="text-foreground sm:ml-0 ml-6">
              {formatDate(booking.returnAt, locale)}
            </span>
          </div>

          {/* Locations & Duration */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {booking.pickupBranch}
              {booking.isOneWay && (
                <>
                  <ArrowRight className="h-3 w-3 mx-1" />
                  {booking.returnBranch}
                </>
              )}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {booking.durationDays} {booking.durationDays === 1 ? 'day' : 'days'}
            </span>
          </div>

          {/* Price (optional) */}
          {showPrice && (
            <div className="mt-2 pt-2 border-t border-border">
              <span className="font-semibold text-foreground">
                {formatCurrency(booking.total, booking.currency, locale)}
              </span>
            </div>
          )}
        </div>

        {/* Arrow */}
        {showArrow && (
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 self-center" />
        )}
      </div>
    </Wrapper>
  );
}

/**
 * Booking Card Skeleton
 *
 * Loading placeholder for booking card.
 */
export function BookingCardSkeleton({
  variant = 'default',
}: {
  variant?: BookingCardVariant;
}) {
  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card animate-pulse">
        <div className="w-10 h-10 rounded-md bg-muted" />
        <div className="flex-1">
          <div className="h-4 bg-muted rounded w-24 mb-1" />
          <div className="h-3 bg-muted rounded w-16" />
        </div>
        <div className="h-5 bg-muted rounded-full w-16" />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="rounded-lg border border-border bg-card p-3 animate-pulse">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="h-4 bg-muted rounded w-28 mb-1" />
            <div className="h-3 bg-muted rounded w-20" />
          </div>
          <div className="h-5 bg-muted rounded-full w-16" />
        </div>
        <div className="h-3 bg-muted rounded w-32 mb-1" />
        <div className="h-3 bg-muted rounded w-24" />
      </div>
    );
  }

  // Default variant
  return (
    <div className="rounded-lg border border-border bg-card p-4 animate-pulse">
      <div className="flex gap-4">
        <div className="hidden sm:block w-24 h-16 rounded-md bg-muted" />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="h-5 bg-muted rounded w-36 mb-1" />
              <div className="h-3 bg-muted rounded w-24" />
            </div>
            <div className="h-6 bg-muted rounded-full w-20" />
          </div>
          <div className="h-4 bg-muted rounded w-48 mb-2" />
          <div className="h-4 bg-muted rounded w-32" />
        </div>
        <div className="w-5 h-5 bg-muted rounded self-center" />
      </div>
    </div>
  );
}

export default BookingCard;
