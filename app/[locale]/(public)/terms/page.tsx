import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { createServerClient } from '@/lib/supabase/server';
import { BlockListRenderer } from '@/components/page-builder/block-renderer';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePageMetadata } from '@/lib/seo/metadata';
import type { Locale } from '@/lib/utils/constants';
import type { PageBlock } from '@/lib/supabase/types';

interface TermsPageProps {
  params: Promise<{ locale: string }>;
}

// Generate metadata
export async function generateMetadata({
  params,
}: TermsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  return generatePageMetadata({
    title: t('termsTitle'),
    description: t('termsDescription'),
    locale: locale as Locale,
    pathname: '/terms',
    keywords: ['terms of service', 'rental conditions', 'car rental terms', 'rental agreement'],
  });
}

// Fetch terms page data
async function getTermsPageData() {
  const supabase = await createServerClient();

  let blocks: PageBlock[] = [];

  try {
    const { data: page } = await supabase
      .from('pages')
      .select('id, status')
      .eq('slug', 'terms')
      .eq('status', 'published')
      .maybeSingle();

    if (page) {
      const { data: pageBlocks } = await supabase
        .from('page_blocks')
        .select('*')
        .eq('page_id', page.id)
        .order('sort_order', { ascending: true });

      blocks = pageBlocks || [];
    }
  } catch (error) {
    console.error('Failed to fetch terms page data:', error);
  }

  return { blocks };
}

/**
 * Terms of Service Page
 *
 * Displays terms and conditions for the car rental service.
 * CMS-driven with fallback static content.
 */
export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { blocks } = await getTermsPageData();
  const hasCmsBlocks = blocks.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-12 sm:py-16">
          <h1 className="text-3xl font-bold sm:text-4xl">Terms of Service</h1>
          <p className="mt-2 text-muted-foreground">
            Last updated: January 2024
          </p>
        </div>
      </section>

      {/* Content */}
      {hasCmsBlocks ? (
        <Suspense fallback={<LegalSkeleton />}>
          <BlockListRenderer blocks={blocks} locale={locale} />
        </Suspense>
      ) : (
        <TermsContent />
      )}
    </div>
  );
}

// Static Terms Content
function TermsContent() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <div className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using our car rental services, you accept and agree to be bound by
          the terms and provisions of this agreement. If you do not agree to these terms,
          please do not use our services.
        </p>

        <h2>2. Rental Requirements</h2>
        <p>To rent a vehicle from us, you must:</p>
        <ul>
          <li>Be at least 21 years of age (25 for certain vehicle categories)</li>
          <li>Hold a valid driver&apos;s license for at least 2 years</li>
          <li>Present a valid credit card in your name</li>
          <li>Provide valid identification (passport or national ID)</li>
        </ul>

        <h2>3. Reservation and Payment</h2>
        <p>
          Reservations can be made online, by phone, or in person. A valid credit card is
          required to guarantee your reservation. Full payment is due at the time of vehicle
          pickup unless otherwise arranged.
        </p>

        <h2>4. Vehicle Use</h2>
        <p>The rented vehicle may only be driven by authorized drivers listed in the rental agreement. The vehicle must not be used:</p>
        <ul>
          <li>For any illegal purpose</li>
          <li>To transport passengers for hire</li>
          <li>To push or tow any vehicle</li>
          <li>In races, competitions, or driving tests</li>
          <li>While under the influence of alcohol or drugs</li>
          <li>Outside the agreed geographic boundaries</li>
        </ul>

        <h2>5. Insurance and Liability</h2>
        <p>
          Basic insurance is included in all rentals. Additional coverage options are available
          for purchase. The renter is responsible for any damage not covered by insurance,
          including the deductible amount.
        </p>

        <h2>6. Fuel Policy</h2>
        <p>
          Vehicles are provided with a full tank of fuel and must be returned with a full tank.
          If the vehicle is returned with less fuel, a refueling charge will apply.
        </p>

        <h2>7. Mileage</h2>
        <p>
          Unless otherwise stated, rentals include unlimited mileage. Some special rates or
          promotions may have mileage restrictions, which will be clearly stated at the time
          of booking.
        </p>

        <h2>8. Cancellation Policy</h2>
        <p>
          Free cancellation is available up to 24 hours before the scheduled pickup time.
          Cancellations made within 24 hours may be subject to a cancellation fee.
          No-shows will be charged the full rental amount.
        </p>

        <h2>9. Vehicle Return</h2>
        <p>
          The vehicle must be returned to the agreed location at the specified date and time.
          Late returns will incur additional charges. Early returns may not qualify for refunds
          unless specified in your booking.
        </p>

        <h2>10. Damage and Accidents</h2>
        <p>
          In the event of an accident or damage, immediately contact local authorities if
          required and notify our office. A police report may be required for insurance claims.
          Do not admit fault or liability at the scene.
        </p>

        <h2>11. Privacy</h2>
        <p>
          Your personal information is handled in accordance with our Privacy Policy.
          By using our services, you consent to the collection and use of your information
          as described in that policy.
        </p>

        <h2>12. Modifications</h2>
        <p>
          We reserve the right to modify these terms at any time. Changes will be effective
          immediately upon posting. Continued use of our services after changes constitutes
          acceptance of the modified terms.
        </p>

        <h2>13. Contact</h2>
        <p>
          For questions about these terms, please contact us at{' '}
          <a href="mailto:legal@carrental.lt">legal@carrental.lt</a> or visit our
          Contact page.
        </p>
      </div>
    </div>
  );
}

// Loading skeleton
function LegalSkeleton() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
