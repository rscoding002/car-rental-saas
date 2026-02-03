import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { createServerClient } from '@/lib/supabase/server';
import { SearchResults } from './search-results';
import { SearchWidget } from '@/components/booking/search-widget';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePageMetadata } from '@/lib/seo/metadata';
import type { Locale } from '@/lib/utils/constants';

interface BookingPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Generate metadata
export async function generateMetadata({
  params,
}: BookingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  return generatePageMetadata({
    title: t('bookingTitle') || 'Book a Vehicle',
    description: t('bookingDescription') || 'Find and book your perfect rental vehicle',
    locale: locale as Locale,
    pathname: '/booking',
    keywords: ['car rental booking', 'rent a car', 'vehicle reservation'],
  });
}

// Fetch branches and pricing data
async function getBookingData() {
  const supabase = await createServerClient();

  try {
    // Fetch active branches
    const { data: branches } = await supabase
      .from('branches')
      .select('id, name, city, address, phone, operating_hours, status')
      .eq('status', 'active')
      .order('city')
      .order('name');

    // Fetch active categories
    const { data: categories } = await supabase
      .from('vehicle_categories')
      .select('id, name, description, icon, image_url')
      .eq('status', 'active')
      .order('sort_order');

    // Fetch daily pricing rules
    const { data: pricingRules } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('rate_type', 'daily')
      .eq('status', 'active');

    // Fetch active addons
    const { data: addons } = await supabase
      .from('addons')
      .select('*')
      .eq('status', 'active')
      .order('sort_order');

    return {
      branches: branches || [],
      categories: categories || [],
      pricingRules: pricingRules || [],
      addons: addons || [],
    };
  } catch (error) {
    console.error('Failed to fetch booking data:', error);
    return {
      branches: [],
      categories: [],
      pricingRules: [],
      addons: [],
    };
  }
}

// Fetch available vehicles for the search criteria
async function getAvailableVehicles(
  pickupBranchId: string,
  pickupAt: string,
  returnAt: string
) {
  const supabase = await createServerClient();

  try {
    // Get vehicles at the pickup branch
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select(`
        *,
        category:vehicle_categories(id, name, description, icon)
      `)
      .eq('branch_id', pickupBranchId)
      .eq('status', 'available')
      .order('make')
      .order('model');

    if (!vehicles || vehicles.length === 0) {
      return [];
    }

    const vehicleIds = vehicles.map((v) => v.id);

    // Get bookings that might conflict
    const { data: conflictingBookings } = await supabase
      .from('bookings')
      .select('vehicle_id')
      .in('vehicle_id', vehicleIds)
      .in('status', ['pending', 'confirmed', 'active'])
      .lte('pickup_at', returnAt)
      .gte('return_at', pickupAt);

    const bookedVehicleIds = new Set(
      conflictingBookings?.map((b) => b.vehicle_id) || []
    );

    // Filter out booked vehicles
    return vehicles.filter((v) => !bookedVehicleIds.has(v.id));
  } catch (error) {
    console.error('Failed to fetch available vehicles:', error);
    return [];
  }
}

/**
 * Booking Search Results Page
 *
 * Displays available vehicles based on search criteria.
 * Mobile-first responsive design with filters and sorting.
 */
export default async function BookingPage({
  params,
  searchParams,
}: BookingPageProps) {
  const { locale } = await params;
  const search = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations('booking');

  // Extract search parameters
  const pickupBranchId = typeof search.pickup === 'string' ? search.pickup : '';
  const returnBranchId = typeof search.return === 'string' ? search.return : pickupBranchId;
  const pickupDate = typeof search.pickupDate === 'string' ? search.pickupDate : '';
  const pickupTime = typeof search.pickupTime === 'string' ? search.pickupTime : '10:00';
  const returnDate = typeof search.returnDate === 'string' ? search.returnDate : '';
  const returnTime = typeof search.returnTime === 'string' ? search.returnTime : '10:00';

  // Build ISO datetime strings
  const pickupAt = pickupDate ? `${pickupDate}T${pickupTime}:00` : '';
  const returnAt = returnDate ? `${returnDate}T${returnTime}:00` : '';

  // Check if we have valid search params
  const hasSearchParams = pickupBranchId && pickupDate && returnDate;

  // Fetch data
  const { branches, categories, pricingRules, addons } = await getBookingData();

  // Fetch available vehicles if we have search params
  const vehicles = hasSearchParams
    ? await getAvailableVehicles(pickupBranchId, pickupAt, returnAt)
    : [];

  // Calculate prices for vehicles
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

  // Calculate rental duration
  const rentalDays = pickupDate && returnDate
    ? Math.ceil(
        (new Date(returnAt).getTime() - new Date(pickupAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  // Get branch names for display
  const pickupBranch = branches.find((b) => b.id === pickupBranchId);
  const returnBranch = branches.find((b) => b.id === returnBranchId);
  const isOneWay = pickupBranchId !== returnBranchId;

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <section className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <h1 className="mb-2 text-xl font-bold sm:text-2xl lg:text-3xl">
            {hasSearchParams ? t('availableVehicles') : t('searchTitle')}
          </h1>
          {hasSearchParams ? (
            <p className="text-sm text-muted-foreground sm:text-base">
              {vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'} available
              {rentalDays > 0 && ` for ${rentalDays} ${rentalDays === 1 ? 'day' : 'days'}`}
            </p>
          ) : (
            <p className="text-muted-foreground">{t('searchSubtitle')}</p>
          )}
        </div>
      </section>

      {/* Search Widget (collapsible on mobile when results are shown) */}
      {!hasSearchParams ? (
        <section className="container mx-auto px-4 py-8">
          <SearchWidget
            variant="vertical"
            showTitle={false}
            branches={branches.map((b) => ({ id: b.id, name: b.name, city: b.city }))}
            className="mx-auto max-w-2xl"
          />
        </section>
      ) : (
        <>
          {/* Search Summary Bar */}
          <SearchSummaryBar
            pickupBranch={pickupBranch?.name || 'Unknown'}
            returnBranch={returnBranch?.name || pickupBranch?.name || 'Unknown'}
            pickupDate={pickupDate}
            pickupTime={pickupTime}
            returnDate={returnDate}
            returnTime={returnTime}
            isOneWay={isOneWay}
            locale={locale}
          />

          {/* Main Content */}
          <section className="container mx-auto px-4 py-6 sm:py-8">
            <Suspense fallback={<ResultsSkeleton />}>
              <SearchResults
                vehicles={vehicles}
                categories={categories}
                prices={prices}
                rentalDays={rentalDays}
                pickupAt={pickupAt}
                returnAt={returnAt}
                pickupBranchId={pickupBranchId}
                returnBranchId={returnBranchId}
                locale={locale}
              />
            </Suspense>
          </section>
        </>
      )}
    </div>
  );
}

// Search Summary Bar Component
async function SearchSummaryBar({
  pickupBranch,
  returnBranch,
  pickupDate,
  pickupTime,
  returnDate,
  returnTime,
  isOneWay,
  locale,
}: {
  pickupBranch: string;
  returnBranch: string;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  isOneWay: boolean;
  locale: string;
}) {
  const t = await getTranslations('booking');

  // Format dates for display
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <section className="border-b bg-card">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {/* Pickup */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-muted-foreground">{t('pickupLocation')}:</span>
            <span>{pickupBranch}</span>
            <span className="text-muted-foreground">|</span>
            <span>{formatDate(pickupDate)}</span>
            <span className="text-muted-foreground">{pickupTime}</span>
          </div>

          {/* Arrow separator */}
          <span className="hidden text-muted-foreground sm:inline">→</span>

          {/* Return */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-muted-foreground">{t('returnLocation')}:</span>
            <span>{isOneWay ? returnBranch : 'Same location'}</span>
            <span className="text-muted-foreground">|</span>
            <span>{formatDate(returnDate)}</span>
            <span className="text-muted-foreground">{returnTime}</span>
          </div>

          {/* Modify Search Button */}
          <a
            href={`/${locale}/booking`}
            className="ml-auto text-primary hover:underline"
          >
            {t('searchVehicles')}
          </a>
        </div>
      </div>
    </section>
  );
}

// Results skeleton
function ResultsSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="overflow-hidden rounded-xl border bg-card">
          <Skeleton className="aspect-[16/10] w-full" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
            <div className="flex justify-between border-t pt-4">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
