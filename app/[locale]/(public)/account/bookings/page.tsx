import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { getCustomerBookings } from '@/lib/booking/queries';
import { BookingsListContent } from './bookings-list-content';

interface BookingsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string }>;
}

/**
 * Customer Bookings List Page
 *
 * Shows all customer bookings with filtering options:
 * - All bookings
 * - Upcoming (pending, confirmed)
 * - Active (currently rented)
 * - Past (completed, cancelled)
 */
export default async function BookingsPage({
  params,
  searchParams,
}: BookingsPageProps) {
  const { locale } = await params;
  const { filter = 'all' } = await searchParams;
  const supabase = await createClient();
  const t = await getTranslations('account');

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
    .select('id')
    .eq('auth_id', authUser.id)
    .single();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Get all customer bookings
  const { data: allBookings } = await getCustomerBookings(supabase, user.id, {
    limit: 100,
  });

  // Categorize bookings
  const now = new Date();

  const categorizedBookings = {
    all: allBookings,
    upcoming: allBookings.filter(
      (b) =>
        new Date(b.pickupAt) > now &&
        ['pending', 'confirmed'].includes(b.status)
    ),
    active: allBookings.filter((b) => b.status === 'active'),
    past: allBookings.filter((b) =>
      ['completed', 'cancelled'].includes(b.status)
    ),
  };

  // Get bookings based on filter
  const filteredBookings = categorizedBookings[filter as keyof typeof categorizedBookings] || allBookings;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('bookings')}</h1>
      </div>

      {/* Content with filters and list */}
      <BookingsListContent
        locale={locale}
        bookings={filteredBookings}
        counts={{
          all: categorizedBookings.all.length,
          upcoming: categorizedBookings.upcoming.length,
          active: categorizedBookings.active.length,
          past: categorizedBookings.past.length,
        }}
        currentFilter={filter}
      />
    </div>
  );
}
