/**
 * Booking Cancellation Page (Customer)
 *
 * Allows customers to cancel their booking with policy preview and refund calculation.
 * Mobile-first responsive design.
 */

import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getBookingWithRelations } from '@/lib/booking/queries';
import { isBookingCancellable } from '@/lib/booking/types';
import { BookingCancelContent } from './booking-cancel-content';

interface PageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'booking' });

  return {
    title: t('cancelBooking'),
    robots: { index: false, follow: false },
  };
}

export default async function BookingCancelPage({ params }: PageProps) {
  const { locale, id: bookingId } = await params;
  const t = await getTranslations({ locale, namespace: 'booking' });

  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirectTo=/${locale}/account/bookings/${bookingId}/cancel`);
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('auth_id', user.id)
    .single();

  if (!profile?.tenant_id) {
    redirect(`/${locale}/login`);
  }

  // Get booking with relations
  const booking = await getBookingWithRelations(supabase, bookingId);

  if (!booking) {
    notFound();
  }

  // Verify ownership
  if (booking.customerId !== profile.id || booking.tenantId !== profile.tenant_id) {
    notFound();
  }

  // Check if booking can be cancelled
  if (!isBookingCancellable(booking.status)) {
    // Redirect to booking detail with error
    redirect(`/${locale}/account/bookings/${bookingId}?error=cannot_cancel`);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <BookingCancelContent
        booking={booking}
        locale={locale}
      />
    </div>
  );
}
