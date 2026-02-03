'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  Calendar,
  Car,
  Clock,
  TrendingUp,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
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

export interface ActivityBooking {
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
}

export interface TodaysActivityWidgetProps {
  pickups: ActivityBooking[];
  returns: ActivityBooking[];
  isLoading?: boolean;
  locale: string;
  maxItems?: number;
  className?: string;
  variant?: 'default' | 'compact';
}

// ============================================================================
// BOOKING ITEM COMPONENT
// ============================================================================

interface BookingItemProps {
  booking: ActivityBooking;
  locale: string;
  type: 'pickup' | 'return';
  variant?: 'default' | 'compact';
}

function BookingItem({ booking, locale, type, variant = 'default' }: BookingItemProps) {
  const t = useTranslations('booking');

  const statusColors: Record<BookingStatus, string> = {
    pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400',
    confirmed: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
    active: 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400',
    completed: 'bg-gray-500/10 text-gray-600 border-gray-500/20 dark:text-gray-400',
    cancelled: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
  };

  const time = type === 'pickup'
    ? new Date(booking.pickupAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : new Date(booking.returnAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  const branch = type === 'pickup' ? booking.pickupBranch : booking.returnBranch;

  if (variant === 'compact') {
    return (
      <Link
        href={`/${locale}/admin/bookings/${booking.id}`}
        className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 transition-colors group"
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
          <p className="text-sm font-medium truncate">{booking.vehicleName}</p>
          <p className="text-xs text-muted-foreground truncate">{branch}</p>
        </div>
        <div className="flex items-center gap-1 text-xs font-medium shrink-0">
          <Clock className="w-3 h-3 text-muted-foreground" />
          {time}
        </div>
      </Link>
    );
  }

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
          <span className="shrink-0 truncate">{branch}</span>
        </div>
      </div>

      {/* Time */}
      <div className="text-right shrink-0">
        <div className="flex items-center gap-1 text-sm font-medium">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          {time}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto mt-1" />
      </div>
    </Link>
  );
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

interface EmptyStateProps {
  type: 'pickup' | 'return';
  icon: React.ElementType;
}

function EmptyState({ type, icon: Icon }: EmptyStateProps) {
  const t = useTranslations('admin.widgets');

  return (
    <div className="text-center py-6 sm:py-8 text-muted-foreground">
      <Icon className="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p className="text-sm">
        {type === 'pickup' ? t('noPickupsToday') : t('noReturnsToday')}
      </p>
    </div>
  );
}

// ============================================================================
// LOADING STATE COMPONENT
// ============================================================================

interface LoadingStateProps {
  count?: number;
  variant?: 'default' | 'compact';
}

function LoadingState({ count = 3, variant = 'default' }: LoadingStateProps) {
  const height = variant === 'compact' ? 'h-12' : 'h-16';

  return (
    <div className="space-y-2 sm:space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn('w-full', height)} />
      ))}
    </div>
  );
}

// ============================================================================
// ACTIVITY CARD COMPONENT
// ============================================================================

interface ActivityCardProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  count: number;
  bookings: ActivityBooking[];
  type: 'pickup' | 'return';
  locale: string;
  isLoading?: boolean;
  maxItems?: number;
  variant?: 'default' | 'compact';
  viewAllHref?: string;
}

function ActivityCard({
  title,
  icon: Icon,
  iconColor,
  count,
  bookings,
  type,
  locale,
  isLoading,
  maxItems = 5,
  variant = 'default',
  viewAllHref,
}: ActivityCardProps) {
  const t = useTranslations('common');
  const displayBookings = bookings.slice(0, maxItems);
  const hasMore = bookings.length > maxItems;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Icon className={cn('w-4 h-4', iconColor)} />
            <span className="truncate">{title}</span>
          </CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="text-xs">
              {count}
            </Badge>
            {viewAllHref && count > 0 && (
              <Link href={viewAllHref} className="hidden sm:block">
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                  {t('viewAll')}
                  <ChevronRight className="w-3 h-3 ml-0.5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <LoadingState count={Math.min(3, maxItems)} variant={variant} />
        ) : displayBookings.length === 0 ? (
          <EmptyState
            type={type}
            icon={type === 'pickup' ? Calendar : MapPin}
          />
        ) : (
          <div className="space-y-1">
            {displayBookings.map((booking) => (
              <BookingItem
                key={booking.id}
                booking={booking}
                locale={locale}
                type={type}
                variant={variant}
              />
            ))}
            {hasMore && viewAllHref && (
              <Link
                href={viewAllHref}
                className="flex items-center justify-center gap-1 p-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('showMore')} (+{bookings.length - maxItems})
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        )}
        {/* Mobile view all button */}
        {viewAllHref && count > 0 && !isLoading && (
          <Link href={viewAllHref} className="sm:hidden block mt-3">
            <Button variant="outline" size="sm" className="w-full text-xs">
              {t('viewAll')}
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN WIDGET COMPONENT
// ============================================================================

export function TodaysActivityWidget({
  pickups,
  returns,
  isLoading = false,
  locale,
  maxItems = 5,
  className,
  variant = 'default',
}: TodaysActivityWidgetProps) {
  const t = useTranslations('admin.widgets');

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-4', className)}>
      {/* Today's Pickups */}
      <ActivityCard
        title={t('todaysPickups')}
        icon={ArrowUpRight}
        iconColor="text-green-500"
        count={pickups.length}
        bookings={pickups}
        type="pickup"
        locale={locale}
        isLoading={isLoading}
        maxItems={maxItems}
        variant={variant}
        viewAllHref={`/${locale}/admin/bookings?pickup_date=today`}
      />

      {/* Today's Returns */}
      <ActivityCard
        title={t('todaysReturns')}
        icon={ArrowDownRight}
        iconColor="text-blue-500"
        count={returns.length}
        bookings={returns}
        type="return"
        locale={locale}
        isLoading={isLoading}
        maxItems={maxItems}
        variant={variant}
        viewAllHref={`/${locale}/admin/bookings?return_date=today`}
      />
    </div>
  );
}

// ============================================================================
// SINGLE COLUMN VARIANT (for sidebar or narrow spaces)
// ============================================================================

export function TodaysActivityWidgetCompact({
  pickups,
  returns,
  isLoading = false,
  locale,
  maxItems = 3,
  className,
}: Omit<TodaysActivityWidgetProps, 'variant'>) {
  const t = useTranslations('admin.widgets');

  const allActivity = [
    ...pickups.map(b => ({ ...b, activityType: 'pickup' as const })),
    ...returns.map(b => ({ ...b, activityType: 'return' as const })),
  ].sort((a, b) => {
    const timeA = a.activityType === 'pickup' ? new Date(a.pickupAt) : new Date(a.returnAt);
    const timeB = b.activityType === 'pickup' ? new Date(b.pickupAt) : new Date(b.returnAt);
    return timeA.getTime() - timeB.getTime();
  }).slice(0, maxItems);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {t('todaysActivity')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <LoadingState count={maxItems} variant="compact" />
        ) : allActivity.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('noActivityToday')}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {allActivity.map((item) => (
              <div key={`${item.activityType}-${item.id}`} className="flex items-center gap-2">
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  item.activityType === 'pickup' ? 'bg-green-500' : 'bg-blue-500'
                )} />
                <BookingItem
                  booking={item}
                  locale={locale}
                  type={item.activityType}
                  variant="compact"
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TodaysActivityWidget;
