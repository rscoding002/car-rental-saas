import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { createServerClient } from '@/lib/supabase/server';
import { FleetPageContent } from './fleet-content';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePageMetadata } from '@/lib/seo/metadata';
import type { Locale } from '@/lib/utils/constants';
import type { Vehicle, VehicleCategory, PricingRule } from '@/lib/supabase/types';

interface FleetPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Generate metadata
export async function generateMetadata({
  params,
}: FleetPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  return generatePageMetadata({
    title: t('fleetTitle'),
    description: t('fleetDescription'),
    locale: locale as Locale,
    pathname: '/fleet',
    keywords: ['car rental fleet', 'rental cars', 'vehicle selection', 'rent a car'],
  });
}

// Fetch fleet data
async function getFleetData() {
  const supabase = await createServerClient();

  let vehicles: Vehicle[] = [];
  let categories: VehicleCategory[] = [];
  let pricingRules: PricingRule[] = [];

  try {
    // Fetch available vehicles
    const { data: vehicleData } = await supabase
      .from('vehicles')
      .select('*')
      .in('status', ['available', 'rented'])
      .order('created_at', { ascending: false });

    vehicles = vehicleData || [];

    // Fetch active categories
    const { data: categoryData } = await supabase
      .from('vehicle_categories')
      .select('*')
      .eq('status', 'active')
      .order('sort_order', { ascending: true });

    categories = categoryData || [];

    // Fetch daily pricing rules
    const { data: pricingData } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('rate_type', 'daily')
      .eq('status', 'active');

    pricingRules = pricingData || [];
  } catch (error) {
    console.error('Failed to fetch fleet data:', error);
  }

  return { vehicles, categories, pricingRules };
}

/**
 * Fleet Page
 *
 * Displays all available vehicles with filtering options.
 * Mobile-first responsive design with sidebar filters on desktop.
 */
export default async function FleetPage({ params, searchParams }: FleetPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { vehicles, categories, pricingRules } = await getFleetData();

  // Calculate vehicle prices
  const prices: Record<string, number> = {};
  for (const vehicle of vehicles) {
    const vehicleRule = pricingRules.find((r) => r.vehicle_id === vehicle.id);
    const categoryRule = pricingRules.find(
      (r) => r.category_id === vehicle.category_id && !r.vehicle_id
    );
    const price = vehicleRule?.amount || categoryRule?.amount;
    if (price) {
      prices[vehicle.id] = price;
    }
  }

  // Attach categories to vehicles
  const vehiclesWithCategories = vehicles.map((vehicle) => ({
    ...vehicle,
    category: categories.find((c) => c.id === vehicle.category_id),
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <FleetHeader locale={locale} vehicleCount={vehicles.length} />

      {/* Main Content */}
      <Suspense fallback={<FleetSkeleton />}>
        <FleetPageContent
          vehicles={vehiclesWithCategories}
          categories={categories}
          prices={prices}
          locale={locale}
        />
      </Suspense>
    </div>
  );
}

// Fleet Page Header
async function FleetHeader({
  locale,
  vehicleCount,
}: {
  locale: string;
  vehicleCount: number;
}) {
  const t = await getTranslations('fleet');
  const tVehicle = await getTranslations('vehicle');

  return (
    <section className="border-b bg-muted/30">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <h1 className="mb-2 text-2xl font-bold sm:text-3xl lg:text-4xl">
          {t('title')}
        </h1>
        <p className="text-muted-foreground">
          {t('subtitle')} &middot; {vehicleCount} {tVehicle('vehicles').toLowerCase()}
        </p>
      </div>
    </section>
  );
}

// Loading skeleton
function FleetSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Filters skeleton (desktop) */}
        <div className="hidden w-64 flex-shrink-0 lg:block">
          <Skeleton className="h-8 w-24 mb-4" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-24 w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="flex-1">
          <div className="mb-6 flex items-center justify-between">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-20" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl border bg-card overflow-hidden">
                <Skeleton className="aspect-[16/10] w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/4" />
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                  </div>
                  <div className="flex justify-between pt-4 border-t">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
