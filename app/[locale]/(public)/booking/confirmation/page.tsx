import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { createServerClient } from '@/lib/supabase/server';
import { getBookingByReference, getBookingWithRelations } from '@/lib/booking/queries';
import { generatePageMetadata } from '@/lib/seo/metadata';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmationContent } from './confirmation-content';
import type { Locale } from '@/lib/utils/constants';

interface ConfirmationPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Generate metadata
export async function generateMetadata({
  params,
}: ConfirmationPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'booking' });

  return generatePageMetadata({
    title: t('bookingConfirmed'),
    description: t('thankYou'),
    locale: locale as Locale,
    pathname: '/booking/confirmation',
    noIndex: true, // Don't index confirmation pages
  });
}

/**
 * Booking Confirmation Page
 *
 * Displayed after successful payment via Stripe.
 * Shows booking details, confirmation number, and next steps.
 *
 * URL params:
 * - session_id: Stripe checkout session ID
 * - ref: Booking reference number
 */
export default async function ConfirmationPage({
  params,
  searchParams,
}: ConfirmationPageProps) {
  const { locale } = await params;
  const search = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations('booking');

  // Extract booking reference from URL
  const bookingReference = typeof search.ref === 'string' ? search.ref : '';
  const sessionId = typeof search.session_id === 'string' ? search.session_id : '';

  // Require at least a booking reference
  if (!bookingReference) {
    redirect(`/${locale}/booking`);
  }

  // Get current user and their booking
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to login with return URL
    redirect(`/${locale}/login?returnTo=/booking/confirmation?ref=${bookingReference}`);
  }

  // Get user's tenant
  const { data: profile } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('auth_id', user.id)
    .single();

  if (!profile?.tenant_id) {
    redirect(`/${locale}/booking`);
  }

  // Fetch the booking
  const booking = await getBookingByReference(supabase, profile.tenant_id, bookingReference);

  if (!booking) {
    notFound();
  }

  // Verify the booking belongs to this user
  if (booking.customerId !== profile.id) {
    // Unauthorized - redirect to booking page
    redirect(`/${locale}/booking`);
  }

  // Fetch full booking with relations
  const bookingWithRelations = await getBookingWithRelations(supabase, booking.id);

  if (!bookingWithRelations) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Success Banner */}
      <section className="border-b bg-green-50 dark:bg-green-950/20">
        <div className="container mx-auto px-4 py-8 sm:py-12 text-center">
          {/* Success Icon */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50 sm:h-20 sm:w-20">
            <svg
              className="h-8 w-8 text-green-600 dark:text-green-400 sm:h-10 sm:w-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-green-800 dark:text-green-200 sm:text-3xl">
            {t('bookingConfirmed')}
          </h1>
          <p className="mt-2 text-green-700 dark:text-green-300">
            {t('thankYou')}
          </p>

          {/* Booking Reference */}
          <div className="mt-6 inline-block rounded-lg bg-white/80 dark:bg-gray-800/80 px-6 py-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{t('bookingReference')}</p>
            <p className="mt-1 text-2xl font-mono font-bold tracking-wider">
              {booking.reference}
            </p>
          </div>

          <p className="mt-4 text-sm text-green-600 dark:text-green-400">
            {t('confirmationEmailSent')}
          </p>
        </div>
      </section>

      {/* Booking Details */}
      <section className="container mx-auto px-4 py-6 sm:py-8">
        <Suspense fallback={<ConfirmationSkeleton />}>
          <ConfirmationContent
            booking={bookingWithRelations}
            locale={locale}
          />
        </Suspense>
      </section>
    </div>
  );
}

// Loading skeleton
function ConfirmationSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Booking Summary Card */}
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <Skeleton className="h-6 w-1/3 mb-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-5 w-3/4" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        </div>
      </div>

      {/* Vehicle Card */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          <Skeleton className="aspect-[16/9] sm:aspect-[4/3] sm:w-48" />
          <div className="flex-1 p-4 space-y-2">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <div className="flex gap-4 mt-4">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  );
}
