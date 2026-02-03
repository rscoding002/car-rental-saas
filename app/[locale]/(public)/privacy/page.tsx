import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { createServerClient } from '@/lib/supabase/server';
import { BlockListRenderer } from '@/components/page-builder/block-renderer';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePageMetadata } from '@/lib/seo/metadata';
import type { Locale } from '@/lib/utils/constants';
import type { PageBlock } from '@/lib/supabase/types';

interface PrivacyPageProps {
  params: Promise<{ locale: string }>;
}

// Generate metadata
export async function generateMetadata({
  params,
}: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  return generatePageMetadata({
    title: t('privacyTitle'),
    description: t('privacyDescription'),
    locale: locale as Locale,
    pathname: '/privacy',
    keywords: ['privacy policy', 'data protection', 'personal information', 'GDPR'],
  });
}

// Fetch privacy page data
async function getPrivacyPageData() {
  const supabase = await createServerClient();

  let blocks: PageBlock[] = [];

  try {
    const { data: page } = await supabase
      .from('pages')
      .select('id, status')
      .eq('slug', 'privacy')
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
    console.error('Failed to fetch privacy page data:', error);
  }

  return { blocks };
}

/**
 * Privacy Policy Page
 *
 * Displays privacy policy and data handling practices.
 * CMS-driven with fallback static content.
 */
export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { blocks } = await getPrivacyPageData();
  const hasCmsBlocks = blocks.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-12 sm:py-16">
          <h1 className="text-3xl font-bold sm:text-4xl">Privacy Policy</h1>
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
        <PrivacyContent />
      )}
    </div>
  );
}

// Static Privacy Content
function PrivacyContent() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <div className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl">
        <h2>1. Introduction</h2>
        <p>
          We respect your privacy and are committed to protecting your personal data.
          This privacy policy explains how we collect, use, and safeguard your information
          when you use our car rental services.
        </p>

        <h2>2. Information We Collect</h2>
        <p>We collect information that you provide directly to us, including:</p>
        <ul>
          <li><strong>Personal identification:</strong> Name, date of birth, nationality</li>
          <li><strong>Contact information:</strong> Email address, phone number, address</li>
          <li><strong>Driver&apos;s license:</strong> License number, expiry date, issuing country</li>
          <li><strong>Payment information:</strong> Credit card details, billing address</li>
          <li><strong>Booking details:</strong> Rental dates, locations, vehicle preferences</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Process and manage your vehicle rentals</li>
          <li>Communicate with you about your bookings</li>
          <li>Send important updates and notifications</li>
          <li>Process payments and prevent fraud</li>
          <li>Improve our services and customer experience</li>
          <li>Comply with legal obligations</li>
          <li>Send marketing communications (with your consent)</li>
        </ul>

        <h2>4. Information Sharing</h2>
        <p>We may share your information with:</p>
        <ul>
          <li><strong>Service providers:</strong> Payment processors, insurance companies, IT service providers</li>
          <li><strong>Legal authorities:</strong> When required by law or to protect our rights</li>
          <li><strong>Business partners:</strong> For joint promotions (with your consent)</li>
        </ul>
        <p>We do not sell your personal information to third parties.</p>

        <h2>5. Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your
          personal data against unauthorized access, alteration, disclosure, or destruction.
          This includes encryption, secure servers, and access controls.
        </p>

        <h2>6. Data Retention</h2>
        <p>
          We retain your personal data for as long as necessary to fulfill the purposes
          for which it was collected, including legal, accounting, or reporting requirements.
          Typically, rental records are kept for 7 years.
        </p>

        <h2>7. Your Rights</h2>
        <p>Under applicable data protection laws, you have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Object to processing of your data</li>
          <li>Request data portability</li>
          <li>Withdraw consent at any time</li>
        </ul>

        <h2>8. Cookies</h2>
        <p>
          Our website uses cookies to enhance your browsing experience. Cookies are small
          text files stored on your device. You can control cookie settings through your
          browser. Essential cookies are required for the website to function properly.
        </p>

        <h2>9. Third-Party Links</h2>
        <p>
          Our website may contain links to third-party websites. We are not responsible
          for the privacy practices of these external sites. We encourage you to read
          their privacy policies.
        </p>

        <h2>10. Children&apos;s Privacy</h2>
        <p>
          Our services are not intended for individuals under 18 years of age.
          We do not knowingly collect personal information from children.
        </p>

        <h2>11. International Transfers</h2>
        <p>
          Your information may be transferred to and processed in countries other than
          your own. We ensure appropriate safeguards are in place for such transfers
          in compliance with applicable data protection laws.
        </p>

        <h2>12. Changes to This Policy</h2>
        <p>
          We may update this privacy policy from time to time. We will notify you of
          significant changes by posting the new policy on our website and updating
          the &quot;Last updated&quot; date.
        </p>

        <h2>13. Contact Us</h2>
        <p>
          If you have questions about this privacy policy or our data practices,
          please contact our Data Protection Officer at:
        </p>
        <ul>
          <li>Email: <a href="mailto:privacy@carrental.lt">privacy@carrental.lt</a></li>
          <li>Address: 123 Main Street, Vilnius, Lithuania</li>
        </ul>
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
