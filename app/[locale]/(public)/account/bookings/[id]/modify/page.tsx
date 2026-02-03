/**
 * Booking Modification Page (Customer)
 *
 * Allows customers to modify their booking dates, locations, and add-ons.
 * Mobile-first responsive design.
 */

import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getBookingWithRelations } from '@/lib/booking/queries';
import { isBookingModifiable } from '@/lib/booking/types';
import { getActiveBranches } from '@/lib/branches/queries';
import { getActiveAddons } from '@/lib/pricing/addon-queries';
import { BookingModifyContent } from './booking-modify-content';

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
    title: t('modify'),
    robots: { index: false, follow: false },
  };
}

export default async function BookingModifyPage({ params }: PageProps) {
  const { locale, id: bookingId } = await params;
  const t = await getTranslations({ locale, namespace: 'booking' });

  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirectTo=/${locale}/account/bookings/${bookingId}/modify`);
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

  // Check if booking can be modified
  if (!isBookingModifiable(booking.status)) {
    // Redirect to booking detail with error
    redirect(`/${locale}/account/bookings/${bookingId}?error=cannot_modify`);
  }

  // Get branches and addons for the form
  const [branches, addons] = await Promise.all([
    getActiveBranches(supabase, profile.tenant_id),
    getActiveAddons(supabase, profile.tenant_id),
  ]);

  return (
    <div className="max-w-4xl mx-auto">
      <BookingModifyContent
        booking={booking}
        branches={branches}
        addons={addons}
        locale={locale}
      />
    </div>
  );
}
