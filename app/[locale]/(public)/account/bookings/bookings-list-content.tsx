'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Car, ChevronRight } from 'lucide-react';

import type { BookingSummary } from '@/lib/booking/types';
import { cn } from '@/lib/utils/cn';
import { BookingCard } from '@/components/account/booking-card';

interface BookingsListContentProps {
  locale: string;
  bookings: BookingSummary[];
  counts: {
    all: number;
    upcoming: number;
    active: number;
    past: number;
  };
  currentFilter: string;
}

type FilterKey = 'all' | 'upcoming' | 'active' | 'past';

/**
 * Bookings List Content Component
 *
 * Client component for bookings list with:
 * - Filter tabs
 * - Booking cards list
 * - Empty states
 */
export function BookingsListContent({
  locale,
  bookings,
  counts,
  currentFilter,
}: BookingsListContentProps) {
  const router = useRouter();
  const t = useTranslations('account');
  const tBooking = useTranslations('booking');

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'upcoming', label: t('upcomingBookings') },
    { key: 'active', label: 'Active' },
    { key: 'past', label: t('pastBookings') },
  ];

  const handleFilterChange = (filter: FilterKey) => {
    const params = new URLSearchParams();
    if (filter !== 'all') {
      params.set('filter', filter);
    }
    router.push(`/${locale}/account/bookings${params.toString() ? `?${params}` : ''}`);
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-2 pb-2">
          {filters.map((filter) => {
            const count = counts[filter.key];
            const isActive = currentFilter === filter.key;

            return (
              <button
                key={filter.key}
                onClick={() => handleFilterChange(filter.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  'min-h-[40px]', // Touch target
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {filter.label}
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-xs',
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-background text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <EmptyState filter={currentFilter as FilterKey} locale={locale} />
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  filter,
  locale,
}: {
  filter: FilterKey;
  locale: string;
}) {
  const t = useTranslations('account');

  const messages: Record<FilterKey, { title: string; description: string }> = {
    all: {
      title: t('noBookings'),
      description: 'You haven\'t made any bookings yet.',
    },
    upcoming: {
      title: t('noUpcomingBookings'),
      description: 'Book your next vehicle to see it here.',
    },
    active: {
      title: 'No active rentals',
      description: 'You don\'t have any active rentals at the moment.',
    },
    past: {
      title: t('noPastBookings'),
      description: 'Your completed bookings will appear here.',
    },
  };

  const message = messages[filter];

  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <Car className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
      <p className="font-medium text-foreground">{message.title}</p>
      <p className="text-sm text-muted-foreground mt-1">{message.description}</p>
      {(filter === 'all' || filter === 'upcoming') && (
        <Link
          href={`/${locale}/fleet`}
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Browse Vehicles
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
