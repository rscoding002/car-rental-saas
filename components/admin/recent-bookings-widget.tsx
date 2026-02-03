'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  Calendar,
  Car,
  Clock,
  ChevronRight,
  DollarSign,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';
import type { BookingStatus } from '@/lib/supabase/types';

// ============================================================================
// TYPES
// ============================================================================

export interface RecentBooking {
  id: string;
  reference: string;
  vehicleName: string;
  vehiclePhoto?: string;
  customerName?: string;
  customerEmail?: string;
  pickupBranch: string;
  returnBranch: string;
  pickupAt: string;
  returnAt: string;
  status: BookingStatus;
  total: number;
  currency: string;
  createdAt?: string;
}

export interface RecentBookingsWidgetProps {
  bookings: RecentBooking[];
  isLoading?: boolean;
  locale: string;
  maxItems?: number;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
  showViewAll?: boolean;
  title?: string;
}

// ============================================================================
// STATUS COLORS
// ============================================================================

const statusColors: Record<BookingStatus, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400',
  confirmed: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  active: 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400',
  completed: 'bg-gray-500/10 text-gray-600 border-gray-500/20 dark:text-gray-400',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
};

// ============================================================================
// BOOKING LIST ITEM - DEFAULT VARIANT
// ============================================================================

interface BookingItemProps {
  booking: RecentBooking;
  locale: string;
  variant?: 'default' | 'compact' | 'detailed';
}

function BookingItemDefault({ booking, locale }: BookingItemProps) {
  const t = useTranslations('booking');

  const date = new Date(booking.pickupAt).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link
      href={`/${locale}/admin/bookings/${booking.id}`}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors group"
    >
      {/* Vehicle Photo */}
      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
        {booking.vehiclePhoto ? (
          <Image
            src={booking.vehiclePhoto}
            alt={booking.vehicleName}
            width={48}
            height={48}
            className="w-full h-full object-cover"
          />
        ) : (
          <Car className="w-5 h-5 text-muted-foreground" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{booking.vehicleName}</span>
          <Badge variant="outline" className={cn('shrink-0 text-xs', statusColors[booking.status])}>
            {t(`status.${booking.status}`)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span className="truncate">{booking.customerName || booking.reference}</span>
          <span className="shrink-0">-</span>
          <span className="shrink-0 truncate">{booking.pickupBranch}</span>
        </div>
      </div>

      {/* Date */}
      <div className="text-right shrink-0">
        <div className="flex items-center gap-1 text-sm font-medium">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          {date}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto mt-1" />
      </div>
    </Link>
  );
}

// ============================================================================
// BOOKING LIST ITEM - COMPACT VARIANT
// ============================================================================

function BookingItemCompact({ booking, locale }: BookingItemProps) {
  const t = useTranslations('booking');

  const date = new Date(booking.pickupAt).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link
      href={`/${locale}/admin/bookings/${booking.id}`}
      className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 transition-colors"
    >
      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
        {booking.vehiclePhoto ? (
          <Image
            src={booking.vehiclePhoto}
            alt={booking.vehicleName}
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        ) : (
          <Car className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{booking.reference}</p>
        <p className="text-xs text-muted-foreground truncate">{booking.vehicleName}</p>
      </div>
      <Badge variant="outline" className={cn('shrink-0 text-xs', statusColors[booking.status])}>
        {t(`status.${booking.status}`)}
      </Badge>
    </Link>
  );
}

// ============================================================================
// BOOKING LIST ITEM - DETAILED VARIANT
// ============================================================================

function BookingItemDetailed({ booking, locale }: BookingItemProps) {
  const t = useTranslations('booking');

  const pickupDate = new Date(booking.pickupAt).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });
  const returnDate = new Date(booking.returnAt).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Link
      href={`/${locale}/admin/bookings/${booking.id}`}
      className="block p-3 sm:p-4 rounded-lg border hover:bg-accent/50 hover:border-accent transition-colors group"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Vehicle Photo */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
          {booking.vehiclePhoto ? (
            <Image
              src={booking.vehiclePhoto}
              alt={booking.vehicleName}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          ) : (
            <Car className="w-6 h-6 text-muted-foreground" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold truncate">{booking.vehicleName}</span>
                <Badge variant="outline" className={cn('shrink-0 text-xs', statusColors[booking.status])}>
                  {t(`status.${booking.status}`)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {booking.reference}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-semibold">{formatCurrency(booking.total, booking.currency)}</p>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{pickupDate} - {returnDate}</span>
            </div>
            {booking.customerName && (
              <div className="flex items-center gap-1">
                <span className="truncate">{booking.customerName}</span>
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{booking.pickupBranch}</span>
            {booking.pickupBranch !== booking.returnBranch && (
              <>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">{booking.returnBranch}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// BOOKING ITEM WRAPPER
// ============================================================================

function BookingItem({ booking, locale, variant = 'default' }: BookingItemProps) {
  switch (variant) {
    case 'compact':
      return <BookingItemCompact booking={booking} locale={locale} />;
    case 'detailed':
      return <BookingItemDetailed booking={booking} locale={locale} />;
    default:
      return <BookingItemDefault booking={booking} locale={locale} />;
  }
}

// ============================================================================
// LOADING STATE
// ============================================================================

interface LoadingStateProps {
  count?: number;
  variant?: 'default' | 'compact' | 'detailed';
}

function LoadingState({ count = 5, variant = 'default' }: LoadingStateProps) {
  const heights = {
    default: 'h-16',
    compact: 'h-12',
    detailed: 'h-28',
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn('w-full', heights[variant])} />
      ))}
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState() {
  const t = useTranslations('admin.widgets');

  return (
    <div className="text-center py-6 sm:py-8 text-muted-foreground">
      <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p className="text-sm">{t('noRecentBookings')}</p>
    </div>
  );
}

// ============================================================================
// MAIN WIDGET COMPONENT
// ============================================================================

export function RecentBookingsWidget({
  bookings,
  isLoading = false,
  locale,
  maxItems = 5,
  className,
  variant = 'default',
  showViewAll = true,
  title,
}: RecentBookingsWidgetProps) {
  const t = useTranslations('admin.widgets');
  const tCommon = useTranslations('common');

  const displayBookings = bookings.slice(0, maxItems);
  const hasMore = bookings.length > maxItems;

  return (
    <Card className={className}>
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="truncate">{title || t('recentBookings')}</span>
          </CardTitle>
          {showViewAll && bookings.length > 0 && !isLoading && (
            <Link href={`/${locale}/admin/bookings`} className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                {tCommon('viewAll')}
                <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <LoadingState count={Math.min(3, maxItems)} variant={variant} />
        ) : displayBookings.length === 0 ? (
          <EmptyState />
        ) : (
          <div className={cn(
            'space-y-1',
            variant === 'detailed' && 'space-y-3'
          )}>
            {displayBookings.map((booking) => (
              <BookingItem
                key={booking.id}
                booking={booking}
                locale={locale}
                variant={variant}
              />
            ))}
            {hasMore && showViewAll && (
              <Link
                href={`/${locale}/admin/bookings`}
                className="flex items-center justify-center gap-1 p-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {tCommon('showMore')} (+{bookings.length - maxItems})
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        )}
        {/* Mobile view all button */}
        {showViewAll && bookings.length > 0 && !isLoading && (
          <Link href={`/${locale}/admin/bookings`} className="sm:hidden block mt-3">
            <Button variant="outline" size="sm" className="w-full text-xs">
              {tCommon('viewAll')}
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MINI VARIANT FOR SIDEBAR
// ============================================================================

export function RecentBookingsWidgetMini({
  bookings,
  isLoading = false,
  locale,
  maxItems = 3,
  className,
}: Omit<RecentBookingsWidgetProps, 'variant' | 'showViewAll' | 'title'>) {
  const t = useTranslations('admin.widgets');

  const displayBookings = bookings.slice(0, maxItems);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {t('recentBookings')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <LoadingState count={maxItems} variant="compact" />
        ) : displayBookings.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-1">
            {displayBookings.map((booking) => (
              <BookingItem
                key={booking.id}
                booking={booking}
                locale={locale}
                variant="compact"
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RecentBookingsWidget;
