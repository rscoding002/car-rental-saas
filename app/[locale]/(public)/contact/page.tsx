import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { createClient } from '@/lib/supabase/server';
import { ContactPageContent } from './contact-content';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePageMetadata } from '@/lib/seo/metadata';
import {
  generateBranchesLocalBusinessSchemas,
  renderJsonLd,
} from '@/lib/seo/schema';
import type { Locale } from '@/lib/utils/constants';
import type { Branch, Tenant } from '@/lib/supabase/types';

interface ContactPageProps {
  params: Promise<{ locale: string }>;
}

// Generate metadata
export async function generateMetadata({
  params,
}: ContactPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  return generatePageMetadata({
    title: t('contactTitle'),
    description: t('contactDescription'),
    locale: locale as Locale,
    pathname: '/contact',
    keywords: ['contact us', 'car rental support', 'booking assistance', 'locations'],
  });
}

// Fetch contact page data
async function getContactData(): Promise<{
  branches: Branch[];
  tenant: Tenant | null;
}> {
  const supabase = await createClient();

  let branches: Branch[] = [];
  let tenant: Tenant | null = null;

  try {
    // Fetch active branches
    const { data: branchData } = await supabase
      .from('branches')
      .select('*')
      .eq('status', 'active')
      .order('sort_order', { ascending: true });

    branches = (branchData as Branch[]) || [];

    // Fetch tenant for branding info (for LocalBusiness schema)
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('*')
      .single();

    tenant = tenantData as Tenant | null;
  } catch (error) {
    console.error('Failed to fetch contact data:', error);
  }

  return { branches, tenant };
}

/**
 * Contact Page
 *
 * Displays contact form, company info, and branch locations.
 * Mobile-first responsive design.
 */
export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { branches, tenant } = await getContactData();

  // Generate LocalBusiness JSON-LD for each branch
  const branchSchemas = generateBranchesLocalBusinessSchemas(branches, {
    tenantName: tenant?.name,
    tenantLogo: tenant?.logo_url || undefined,
    priceRange: '$$',
    currenciesAccepted: [tenant?.settings?.currency || 'EUR'],
  });

  return (
    <div className="min-h-screen bg-background">
      {/* LocalBusiness JSON-LD for each branch (SEO) */}
      {branchSchemas.map((schema, index) => (
        <script
          key={`branch-schema-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: renderJsonLd(schema) }}
        />
      ))}

      {/* Header */}
      <ContactHeader locale={locale} />

      {/* Main Content */}
      <Suspense fallback={<ContactSkeleton />}>
        <ContactPageContent branches={branches} locale={locale} />
      </Suspense>
    </div>
  );
}

// Contact Page Header
async function ContactHeader({ locale }: { locale: string }) {
  const t = await getTranslations('contact');

  return (
    <section className="border-b bg-muted/30">
      <div className="container mx-auto px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-4 text-3xl font-bold sm:text-4xl">
            {t('title')}
          </h1>
          <p className="text-muted-foreground">
            {t('contactDescription')}
          </p>
        </div>
      </div>
    </section>
  );
}

// Loading skeleton
function ContactSkeleton() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-12 w-32" />
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
