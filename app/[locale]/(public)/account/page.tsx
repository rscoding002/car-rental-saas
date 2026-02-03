import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import {
  CalendarDays,
  Car,
  CreditCard,
  ChevronRight,
  Clock,
  MapPin,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { getCustomerBookings } from '@/lib/booking/queries';
import type { BookingSummary } from '@/lib/booking/types';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';

interface AccountPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Account Overview Page
 *
 * Customer account dashboard showing:
 * - Welcome message
 * - Quick stats (total bookings, total spent)
 * - Upcoming bookings preview
 * - Quick action links
 */
export default async function AccountPage({ params }: AccountPageProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const t = await getTranslations('account');
  const tBooking = await getTranslations('booking');
  const tCommon = await getTranslations('common');

  // Get authenticated user
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect(`/${locale}/login`);
  }

  // Get user profile
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authUser.id)
    .single();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Get customer's bookings
  const { data: allBookings, count: totalBookings } = await getCustomerBookings(
    supabase,
    user.id,
    { limit: 100 }
  );

  // Split into upcoming and past
  const now = new Date();
  const upcomingBookings = allBookings.filter(
    (b) => new Date(b.pickupAt) > now && !['cancelled', 'completed'].includes(b.status)
  );
  const activeBookings = allBookings.filter((b) => b.status === 'active');

  // Calculate total spent from completed bookings
  const completedBookings = allBookings.filter((b) => b.status === 'completed');
  const totalSpent = completedBookings.reduce((sum, b) => sum + (b.total || 0), 0);

  // Get display name
  const displayName = user.first_name || authUser.email?.split('@')[0] || 'User';

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t('welcomeBack')}, {displayName}!
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('title')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Bookings */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalBookings}</p>
              <p className="text-sm text-muted-foreground">{t('totalBookings')}</p>
            </div>
          </div>
        </div>

        {/* Total Spent */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <CreditCard className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(totalSpent, locale)}
              </p>
              <p className="text-sm text-muted-foreground">{t('totalSpent')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Rentals */}
      {activeBookings.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Active Rental
            </h2>
          </div>
          <div className="space-y-3">
            {activeBookings.slice(0, 1).map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                locale={locale}
                isActive
              />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Bookings */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t('upcomingBookings')}
          </h2>
          {upcomingBookings.length > 0 && (
            <Link
              href={`/${locale}/account/bookings`}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              {tCommon('viewAll')}
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {upcomingBookings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <Car className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">{t('noUpcomingBookings')}</p>
            <Link
              href={`/${locale}/fleet`}
              className="inline-flex items-center gap-2 mt-4 text-sm text-primary hover:underline"
            >
              Browse our fleet
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingBookings.slice(0, 3).map((booking) => (
              <BookingCard key={booking.id} booking={booking} locale={locale} />
            ))}
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href={`/${locale}/fleet`}
            className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
          >
            <Car className="h-5 w-5 text-primary" />
            <span className="font-medium">Browse Vehicles</span>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
          </Link>
          <Link
            href={`/${locale}/account/bookings`}
            className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
          >
            <CalendarDays className="h-5 w-5 text-primary" />
            <span className="font-medium">{t('bookings')}</span>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
          </Link>
        </div>
      </section>
    </div>
  );
}

// Booking Card Component (inline for simplicity)
function BookingCard({
  booking,
  locale,
  isActive = false,
}: {
  booking: BookingSummary;
  locale: string;
  isActive?: boolean;
}) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <Link
      href={`/${locale}/account/bookings/${booking.id}`}
      className={`block rounded-lg border p-4 hover:bg-accent/50 transition-colors ${
        isActive ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10' : 'border-border bg-card'
      }`}
    >
      <div className="flex gap-4">
        {/* Vehicle Photo */}
        <div className="flex-shrink-0">
          {booking.vehiclePhoto ? (
            <img
              src={booking.vehiclePhoto}
              alt={booking.vehicleName}
              className="w-20 h-14 object-cover rounded-md"
            />
          ) : (
            <div className="w-20 h-14 rounded-md bg-muted flex items-center justify-center">
              <Car className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Booking Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-foreground truncate">
                {booking.vehicleName}
              </p>
              <p className="text-xs text-muted-foreground">
                {booking.reference}
              </p>
            </div>
            <Badge className={statusColors[booking.status] || ''}>
              {booking.status}
            </Badge>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(booking.pickupAt, locale)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {booking.pickupBranch}
            </span>
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 self-center" />
      </div>
    </Link>
  );
}
