import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Car, Shield, Clock, CreditCard, MapPin, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';

import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchWidget } from '@/components/booking/search-widget';
import { BlockListRenderer } from '@/components/page-builder/block-renderer';
import { createServerClient } from '@/lib/supabase/server';
import { generatePageMetadata } from '@/lib/seo/metadata';
import type { Locale } from '@/lib/utils/constants';
import type { PageBlock, Branch, Vehicle, VehicleCategory, PricingRule } from '@/lib/supabase/types';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

// Generate metadata
export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  return generatePageMetadata({
    title: t('homeTitle'),
    description: t('homeDescription'),
    locale: locale as Locale,
    pathname: '/',
    keywords: ['car rental', 'rent a car', 'vehicle rental', 'auto rental'],
  });
}

// Fetch homepage data
async function getHomePageData(tenantId?: string) {
  const supabase = await createServerClient();

  // Fetch homepage blocks (if exists)
  let blocks: PageBlock[] = [];
  let branches: Branch[] = [];
  let vehicles: Vehicle[] = [];
  let categories: VehicleCategory[] = [];
  let pricingRules: PricingRule[] = [];

  try {
    // Get homepage by slug
    const { data: page } = await supabase
      .from('pages')
      .select('id, status')
      .eq('slug', 'home')
      .eq('status', 'published')
      .maybeSingle();

    if (page) {
      // Get blocks for homepage
      const { data: pageBlocks } = await supabase
        .from('page_blocks')
        .select('*')
        .eq('page_id', page.id)
        .order('sort_order', { ascending: true });

      blocks = pageBlocks || [];
    }

    // Fetch branches for search widget
    const { data: branchData } = await supabase
      .from('branches')
      .select('id, name, city, slug')
      .eq('status', 'active')
      .order('sort_order', { ascending: true });

    branches = branchData || [];

    // If there are fleet_gallery blocks, fetch vehicles
    const hasFleetBlock = blocks.some((b) => b.block_type === 'fleet_gallery');
    if (hasFleetBlock) {
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('*')
        .eq('status', 'available')
        .limit(8);

      vehicles = vehicleData || [];

      // Fetch categories
      const { data: categoryData } = await supabase
        .from('vehicle_categories')
        .select('*')
        .eq('status', 'active');

      categories = categoryData || [];

      // Fetch pricing rules
      const { data: pricingData } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('rate_type', 'daily')
        .eq('status', 'active');

      pricingRules = pricingData || [];
    }
  } catch {
    // If database queries fail, continue with empty data
    console.error('Failed to fetch homepage data');
  }

  return { blocks, branches, vehicles, categories, pricingRules };
}

/**
 * Homepage
 *
 * Landing page with:
 * - Hero section with booking search widget
 * - CMS blocks (if configured)
 * - Fallback hardcoded sections (features, stats, CTA)
 *
 * Mobile-first responsive design.
 */
export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { blocks, branches, vehicles, categories, pricingRules } =
    await getHomePageData();

  // Calculate vehicle prices from pricing rules
  const vehiclePrices: Record<string, number> = {};
  for (const vehicle of vehicles) {
    // Find vehicle-specific price first, then category price
    const vehicleRule = pricingRules.find((r) => r.vehicle_id === vehicle.id);
    const categoryRule = pricingRules.find(
      (r) => r.category_id === vehicle.category_id && !r.vehicle_id
    );
    const price = vehicleRule?.amount || categoryRule?.amount;
    if (price) {
      vehiclePrices[vehicle.id] = price;
    }
  }

  // Block data for CMS blocks
  const blockData = {
    vehicles,
    vehiclePrices,
    categories,
    pricingRules,
    branches,
    currency: 'EUR',
  };

  // Format branches for search widget
  const searchBranches = branches.map((b) => ({
    id: b.id,
    name: b.name,
    city: b.city,
  }));

  const hasCmsBlocks = blocks.length > 0;

  return (
    <>
      {/* Hero Section with Booking Widget */}
      <HeroSection branches={searchBranches} locale={locale} />

      {/* CMS Blocks (if configured) */}
      {hasCmsBlocks && (
        <Suspense fallback={<BlocksSkeleton />}>
          <BlockListRenderer
            blocks={blocks}
            locale={locale}
            data={blockData}
          />
        </Suspense>
      )}

      {/* Fallback sections (if no CMS blocks) */}
      {!hasCmsBlocks && (
        <>
          <FeaturesSection locale={locale} />
          <StatsSection locale={locale} />
          <CtaSection locale={locale} />
        </>
      )}
    </>
  );
}

// Hero Section Component
async function HeroSection({
  branches,
  locale,
}: {
  branches: Array<{ id: string; name: string; city: string }>;
  locale: string;
}) {
  const t = await getTranslations('home');

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-primary/5 to-background">
      <div className="container mx-auto px-4 py-12 sm:py-16 lg:py-20">
        {/* Hero Content */}
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            <span>Premium Car Rentals</span>
          </div>

          <h1 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl xl:text-6xl">
            {t('title')}
          </h1>

          <p className="mb-8 text-base text-muted-foreground sm:text-lg lg:text-xl">
            {t('subtitle')}
          </p>
        </div>

        {/* Booking Search Widget */}
        <div className="mx-auto max-w-5xl">
          <SearchWidget
            variant="horizontal"
            branches={branches}
            showTitle={false}
            className="border shadow-xl"
          />
        </div>

        {/* Quick Links (Mobile) */}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4 lg:hidden">
          <Button asChild size="lg" className="text-base">
            <Link href="/fleet">{t('browseFleet')}</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-base">
            <Link href="/login">{t('signIn')}</Link>
          </Button>
        </div>
      </div>

      {/* Decorative background elements */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-1/4 -top-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>
    </section>
  );
}

// Features Section Component (Fallback)
async function FeaturesSection({ locale }: { locale: string }) {
  const t = await getTranslations('home');

  const features = [
    {
      icon: Shield,
      titleKey: 'featureInsurance',
      descKey: 'featureInsuranceDesc',
      fallbackTitle: 'Full Insurance',
      fallbackDesc: 'Comprehensive coverage for your peace of mind',
    },
    {
      icon: Clock,
      titleKey: 'featureSupport',
      descKey: 'featureSupportDesc',
      fallbackTitle: '24/7 Support',
      fallbackDesc: 'Round-the-clock customer assistance',
    },
    {
      icon: CreditCard,
      titleKey: 'featurePayment',
      descKey: 'featurePaymentDesc',
      fallbackTitle: 'Easy Payment',
      fallbackDesc: 'Secure and flexible payment options',
    },
    {
      icon: MapPin,
      titleKey: 'featureLocations',
      descKey: 'featureLocationsDesc',
      fallbackTitle: 'Multiple Locations',
      fallbackDesc: 'Convenient pickup and drop-off points',
    },
  ];

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="container mx-auto px-4">
        <div className="mb-10 text-center sm:mb-12">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">
            {t('whyChooseUs')}
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Experience hassle-free car rentals with our premium service and
            dedicated support.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.titleKey}
              className="group rounded-xl border bg-card p-6 text-center transition-shadow hover:shadow-md"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-7 w-7" />
              </div>
              <h3 className="mb-2 font-semibold">{feature.fallbackTitle}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.fallbackDesc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Stats Section Component (Fallback)
async function StatsSection({ locale }: { locale: string }) {
  const tAbout = await getTranslations('about');

  const stats = [
    { value: '10+', labelKey: 'yearsExperience' },
    { value: '5000+', labelKey: 'satisfiedCustomers' },
    { value: '100+', labelKey: 'vehiclesInFleet' },
    { value: '5', labelKey: 'locationsCount' },
  ];

  return (
    <section className="border-y bg-muted/30 py-12 sm:py-16 lg:py-20">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 text-center sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.labelKey}>
              <div className="mb-2 text-3xl font-bold text-primary sm:text-4xl">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground sm:text-base">
                {tAbout(stat.labelKey)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// CTA Section Component (Fallback)
async function CtaSection({ locale }: { locale: string }) {
  const t = await getTranslations('home');

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl rounded-2xl bg-primary p-8 text-center text-primary-foreground sm:p-12">
          <Car className="mx-auto mb-4 h-12 w-12 opacity-90" />
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">
            Ready to hit the road?
          </h2>
          <p className="mb-8 text-primary-foreground/90">
            Browse our fleet of quality vehicles and find the perfect car for
            your journey.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="text-base"
            >
              <Link href="/fleet">{t('browseFleet')}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 text-base"
            >
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// Blocks Loading Skeleton
function BlocksSkeleton() {
  return (
    <div className="space-y-12 py-12">
      <div className="container mx-auto px-4">
        <Skeleton className="mx-auto h-10 w-64 mb-8" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
