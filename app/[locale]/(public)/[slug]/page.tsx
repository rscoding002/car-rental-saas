import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { createServerClient } from '@/lib/supabase/server';
import { BlockListRenderer, type BlockData } from '@/components/page-builder/block-renderer';
import { Skeleton } from '@/components/ui/skeleton';
import { generateCmsPageMetadata } from '@/lib/seo/metadata';
import type { Locale } from '@/lib/utils/constants';
import type { Page, PageBlock, Vehicle, VehicleCategory, PricingRule, Branch } from '@/lib/supabase/types';

interface DynamicPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// Reserved slugs that have dedicated pages
const RESERVED_SLUGS = ['fleet', 'about', 'contact', 'booking', 'account', 'admin'];

// Generate metadata
export async function generateMetadata({
  params,
}: DynamicPageProps): Promise<Metadata> {
  const { locale, slug } = await params;

  // Skip reserved slugs
  if (RESERVED_SLUGS.includes(slug)) {
    return {};
  }

  const supabase = await createServerClient();

  const { data } = await supabase
    .from('pages')
    .select('title, meta, status')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  const page = data as { title: Record<string, string> | null; meta: Record<string, { description?: string; keywords?: string[]; ogImage?: string }> | null; status: string } | null;

  if (!page) {
    return {
      title: 'Page Not Found',
    };
  }

  // Get localized title and meta
  const title = page.title?.[locale as Locale] || page.title?.en || slug;
  const meta = page.meta?.[locale as Locale] || page.meta?.en || {};

  return generateCmsPageMetadata({
    page: {
      title,
      description: meta.description,
      keywords: meta.keywords,
      ogImage: meta.ogImage,
    },
    locale: locale as Locale,
    pathname: `/${slug}`,
  });
}

// Generate static params for known pages
export async function generateStaticParams() {
  const supabase = await createServerClient();

  const { data: pages } = await supabase
    .from('pages')
    .select('slug')
    .eq('status', 'published')
    .not('slug', 'in', `(${RESERVED_SLUGS.join(',')})`);

  if (!pages) {
    return [];
  }

  // Generate for all locales
  const locales = ['en', 'lt', 'ru'];
  return pages.flatMap((page) =>
    locales.map((locale) => ({
      locale,
      slug: page.slug,
    }))
  );
}

// Fetch page data
async function getPageData(slug: string) {
  const supabase = await createServerClient();

  // Fetch page
  const { data: page, error } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !page) {
    return null;
  }

  // Fetch page blocks
  const { data: blocks } = await supabase
    .from('page_blocks')
    .select('*')
    .eq('page_id', page.id)
    .order('sort_order', { ascending: true });

  // Check what data blocks need
  const blockTypes = (blocks || []).map((b) => b.block_type);
  const needsVehicles = blockTypes.includes('fleet_gallery');
  const needsBranches = blockTypes.includes('location_map');
  const needsPricing = blockTypes.includes('pricing_table');

  let vehicles: Vehicle[] = [];
  let categories: VehicleCategory[] = [];
  let pricingRules: PricingRule[] = [];
  let branches: Branch[] = [];

  // Fetch additional data based on block requirements
  if (needsVehicles || needsPricing) {
    const { data: vehicleData } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'available')
      .limit(12);

    vehicles = vehicleData || [];

    const { data: categoryData } = await supabase
      .from('vehicle_categories')
      .select('*')
      .eq('status', 'active');

    categories = categoryData || [];
  }

  if (needsPricing || needsVehicles) {
    const { data: pricingData } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('rate_type', 'daily')
      .eq('status', 'active');

    pricingRules = pricingData || [];
  }

  if (needsBranches) {
    const { data: branchData } = await supabase
      .from('branches')
      .select('*')
      .eq('status', 'active')
      .order('sort_order', { ascending: true });

    branches = branchData || [];
  }

  return {
    page,
    blocks: blocks || [],
    vehicles,
    categories,
    pricingRules,
    branches,
  };
}

/**
 * Dynamic CMS Page
 *
 * Renders any CMS-managed page by slug.
 * Fetches page content and blocks from database.
 */
export default async function DynamicPage({ params }: DynamicPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // Skip reserved slugs (they have their own routes)
  if (RESERVED_SLUGS.includes(slug)) {
    notFound();
  }

  const data = await getPageData(slug);

  if (!data) {
    notFound();
  }

  const { page, blocks, vehicles, categories, pricingRules, branches } = data;

  // Calculate vehicle prices
  const vehiclePrices: Record<string, number> = {};
  for (const vehicle of vehicles) {
    const vehicleRule = pricingRules.find((r) => r.vehicle_id === vehicle.id);
    const categoryRule = pricingRules.find(
      (r) => r.category_id === vehicle.category_id && !r.vehicle_id
    );
    const price = vehicleRule?.amount || categoryRule?.amount;
    if (price) {
      vehiclePrices[vehicle.id] = price;
    }
  }

  // Block data for dynamic blocks
  const blockData: BlockData = {
    vehicles,
    vehiclePrices,
    categories,
    pricingRules,
    branches,
    currency: 'EUR',
  };

  // Get localized title
  const title = page.title?.[locale] || page.title?.en || slug;

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header (if no hero block) */}
      {!blocks.some((b) => b.block_type === 'hero') && (
        <section className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-12 sm:py-16">
            <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          </div>
        </section>
      )}

      {/* Page Blocks */}
      <Suspense fallback={<PageBlocksSkeleton />}>
        {blocks.length > 0 ? (
          <BlockListRenderer
            blocks={blocks}
            locale={locale}
            data={blockData}
          />
        ) : (
          <div className="container mx-auto px-4 py-12">
            <p className="text-muted-foreground">
              This page has no content yet.
            </p>
          </div>
        )}
      </Suspense>
    </div>
  );
}

// Loading skeleton
function PageBlocksSkeleton() {
  return (
    <div className="space-y-12 py-12">
      {/* Hero-like skeleton */}
      <div className="bg-muted/30">
        <div className="container mx-auto px-4 py-16">
          <Skeleton className="mx-auto h-12 w-64 mb-4" />
          <Skeleton className="mx-auto h-6 w-96 mb-8" />
          <Skeleton className="mx-auto h-10 w-32" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="container mx-auto px-4">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Text skeleton */}
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-5/6" />
          <Skeleton className="h-6 w-4/6" />
        </div>
      </div>
    </div>
  );
}
