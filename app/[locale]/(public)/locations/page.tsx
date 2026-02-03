import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { createClient } from '@/lib/supabase/server';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePageMetadata } from '@/lib/seo/metadata';
import {
  generateBranchesLocalBusinessSchemas,
  renderJsonLd,
} from '@/lib/seo/schema';
import type { Locale } from '@/lib/utils/constants';
import type { Branch, Tenant } from '@/lib/supabase/types';
import { LocationsContent } from './locations-content';

interface LocationsPageProps {
  params: Promise<{ locale: string }>;
}

// Generate metadata
export async function generateMetadata({
  params,
}: LocationsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  return generatePageMetadata({
    title: t('locationsTitle'),
    description: t('locationsDescription'),
    locale: locale as Locale,
    pathname: '/locations',
    keywords: ['car rental locations', 'pickup locations', 'rental branches', 'car hire near me'],
  });
}

// Fetch locations data
async function getLocationsData(): Promise<{
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
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    branches = (branchData as Branch[]) || [];

    // Fetch tenant for branding info
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('*')
      .single();

    tenant = tenantData as Tenant | null;
  } catch (error) {
    console.error('Failed to fetch locations data:', error);
  }

  return { branches, tenant };
}

/**
 * Locations Page
 *
 * Displays all rental locations/branches with details,
 * operating hours, and directions.
 */
export default async function LocationsPage({ params }: LocationsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { branches, tenant } = await getLocationsData();

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
      <LocationsHeader locale={locale} branchCount={branches.length} />

      {/* Main Content */}
      <Suspense fallback={<LocationsSkeleton />}>
        <LocationsContent branches={branches} locale={locale} />
      </Suspense>
    </div>
  );
}

// Locations Page Header
async function LocationsHeader({ locale, branchCount }: { locale: string; branchCount: number }) {
  const t = await getTranslations('branches');

  return (
    <section className="border-b bg-muted/30">
      <div className="container mx-auto px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-4 text-3xl font-bold sm:text-4xl">
            {t('ourLocations')}
          </h1>
          <p className="text-muted-foreground">
            {branchCount > 0
              ? `${branchCount} convenient pickup and return locations to serve you`
              : 'Find our rental locations near you'}
          </p>
        </div>
      </div>
    </section>
  );
}

// Loading skeleton
function LocationsSkeleton() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="mt-4 pt-4 border-t">
              <Skeleton className="h-4 w-24 mb-2" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
