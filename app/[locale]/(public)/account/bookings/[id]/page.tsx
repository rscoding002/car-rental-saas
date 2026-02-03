import { redirect, notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { getBookingWithRelations } from '@/lib/booking/queries';
import { Button } from '@/components/ui/button';
import { BookingDetailContent } from './booking-detail-content';

interface BookingDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

/**
 * Customer Booking Detail Page
 *
 * Shows full booking information for the customer's account:
 * - Booking status and reference
 * - Vehicle details
 * - Pickup/return dates and locations
 * - Driver information
 * - Add-ons and pricing breakdown
 * - Actions (modify, cancel, print, add to calendar)
 */
export default async function BookingDetailPage({
  params,
}: BookingDetailPageProps) {
  const { locale, id } = await params;
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

  // Fetch booking with all relations
  const booking = await getBookingWithRelations(supabase, id);

  // Check if booking exists and belongs to this customer
  if (!booking) {
    notFound();
  }

  if (booking.customerId !== user.id) {
    // User doesn't own this booking
    notFound();
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/account/bookings`}>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-foreground">{t('viewBooking')}</h1>
      </div>

      {/* Booking Content */}
      <BookingDetailContent booking={booking} locale={locale} />
    </div>
  );
}
