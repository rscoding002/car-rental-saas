import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { createServerClient } from '@/lib/supabase/server';
import { BookingVehicleContent } from './booking-vehicle-content';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePageMetadata } from '@/lib/seo/metadata';
import { calculatePricing } from '@/lib/pricing/calculator';
import { calculateDurationDays } from '@/lib/pricing/types';
import type { Locale } from '@/lib/utils/constants';
import type { Vehicle, VehicleCategory, Branch, Addon } from '@/lib/supabase/types';

interface BookingVehiclePageProps {
  params: Promise<{ locale: string; vehicleId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Generate metadata
export async function generateMetadata({
  params,
  searchParams,
}: BookingVehiclePageProps): Promise<Metadata> {
  const { locale, vehicleId } = await params;
  const t = await getTranslations({ locale, namespace: 'booking' });

  const supabase = await createServerClient();
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('make, model, year')
    .eq('id', vehicleId)
    .single();

  const title = vehicle
    ? `${t('title')} - ${vehicle.make} ${vehicle.model}`
    : t('title');

  return generatePageMetadata({
    title,
    description: t('searchSubtitle'),
    locale: locale as Locale,
    pathname: `/booking/${vehicleId}`,
  });
}

// Fetch vehicle with category
async function getVehicle(vehicleId: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('vehicles')
    .select(`
      *,
      category:vehicle_categories(id, name, description, icon, image_url)
    `)
    .eq('id', vehicleId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Vehicle & { category: VehicleCategory | null };
}

// Fetch branches
async function getBranches() {
  const supabase = await createServerClient();

  const { data } = await supabase
    .from('branches')
    .select('id, name, city, address, phone, operating_hours, status')
    .eq('status', 'active')
    .order('city')
    .order('name');

  return (data || []) as Branch[];
}

// Fetch available addons
async function getAddons() {
  const supabase = await createServerClient();

  const { data } = await supabase
    .from('addons')
    .select('*')
    .eq('status', 'active')
    .order('sort_order');

  return (data || []) as Addon[];
}

// Calculate pricing for the booking
async function getPricing(
  vehicleId: string,
  categoryId: string,
  pickupAt: string,
  returnAt: string,
  pickupBranchId: string,
  returnBranchId: string,
  tenantId: string
) {
  const supabase = await createServerClient();

  try {
    const result = await calculatePricing(supabase, {
      tenantId,
      vehicleId,
      categoryId,
      pickupAt,
      returnAt,
      pickupBranchId,
      returnBranchId,
    }, {
      includeBreakdown: true,
    });

    return result;
  } catch (error) {
    console.error('Failed to calculate pricing:', error);
    return null;
  }
}

// Check vehicle availability for the dates
async function checkAvailability(
  vehicleId: string,
  pickupAt: string,
  returnAt: string
): Promise<boolean> {
  const supabase = await createServerClient();

  // Check for conflicting bookings
  const { data: conflictingBookings } = await supabase
    .from('bookings')
    .select('id')
    .eq('vehicle_id', vehicleId)
    .in('status', ['pending', 'confirmed', 'active'])
    .lte('pickup_at', returnAt)
    .gte('return_at', pickupAt)
    .limit(1);

  if (conflictingBookings && conflictingBookings.length > 0) {
    return false;
  }

  // Check for manual availability blocks
  const { data: blocks } = await supabase
    .from('availability_blocks')
    .select('id')
    .eq('vehicle_id', vehicleId)
    .eq('is_available', false)
    .lte('start_date', returnAt.split('T')[0])
    .gte('end_date', pickupAt.split('T')[0])
    .limit(1);

  if (blocks && blocks.length > 0) {
    return false;
  }

  return true;
}

/**
 * Vehicle Booking Page
 *
 * Displays selected vehicle details, booking parameters, and pricing.
 * Mobile-first responsive design with continue to booking flow.
 */
export default async function BookingVehiclePage({
  params,
  searchParams,
}: BookingVehiclePageProps) {
  const { locale, vehicleId } = await params;
  const search = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations('booking');

  // Extract search parameters
  const pickupAt = typeof search.pickupAt === 'string' ? search.pickupAt : '';
  const returnAt = typeof search.returnAt === 'string' ? search.returnAt : '';
  const pickupBranchId = typeof search.pickupBranch === 'string' ? search.pickupBranch : '';
  const returnBranchId = typeof search.returnBranch === 'string' ? search.returnBranch : pickupBranchId;

  // Validate required parameters
  if (!pickupAt || !returnAt || !pickupBranchId) {
    redirect(`/${locale}/booking`);
  }

  // Fetch vehicle
  const vehicle = await getVehicle(vehicleId);
  if (!vehicle) {
    notFound();
  }

  // Check if vehicle status allows booking
  if (vehicle.status !== 'available') {
    redirect(`/${locale}/booking?error=vehicle_unavailable`);
  }

  // Check availability for the dates
  const isAvailable = await checkAvailability(vehicleId, pickupAt, returnAt);
  if (!isAvailable) {
    redirect(`/${locale}/booking?error=dates_unavailable`);
  }

  // Fetch branches and addons
  const [branches, addons] = await Promise.all([
    getBranches(),
    getAddons(),
  ]);

  // Get pickup and return branches
  const pickupBranch = branches.find(b => b.id === pickupBranchId);
  const returnBranch = branches.find(b => b.id === returnBranchId);

  if (!pickupBranch) {
    redirect(`/${locale}/booking?error=invalid_branch`);
  }

  // Calculate pricing (use a placeholder tenant ID for now)
  // In production, this would come from the tenant context
  const tenantId = vehicle.tenant_id;
  const pricing = await getPricing(
    vehicleId,
    vehicle.category_id,
    pickupAt,
    returnAt,
    pickupBranchId,
    returnBranchId,
    tenantId
  );

  // Calculate rental days
  const rentalDays = calculateDurationDays(pickupAt, returnAt);
  const isOneWay = pickupBranchId !== returnBranchId;

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <section className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <nav className="mb-4 text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <a href={`/${locale}/booking`} className="hover:text-primary">
                  {t('searchVehicles')}
                </a>
              </li>
              <li>/</li>
              <li className="text-foreground font-medium">
                {vehicle.make} {vehicle.model}
              </li>
            </ol>
          </nav>
          <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">
            {t('bookingSummary')}
          </h1>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4 py-6 sm:py-8">
        <Suspense fallback={<BookingVehicleSkeleton />}>
          <BookingVehicleContent
            vehicle={vehicle}
            pickupBranch={pickupBranch}
            returnBranch={returnBranch || pickupBranch}
            pickupAt={pickupAt}
            returnAt={returnAt}
            rentalDays={rentalDays}
            isOneWay={isOneWay}
            pricing={pricing}
            addons={addons}
            locale={locale}
          />
        </Suspense>
      </section>
    </div>
  );
}

// Loading skeleton
function BookingVehicleSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Vehicle Card Skeleton */}
      <div className="lg:col-span-2">
        <div className="overflow-hidden rounded-xl border bg-card">
          <Skeleton className="aspect-[16/9] w-full" />
          <div className="space-y-4 p-4 sm:p-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        </div>
      </div>

      {/* Price Card Skeleton */}
      <div>
        <div className="rounded-xl border bg-card p-4 sm:p-6">
          <Skeleton className="mb-4 h-6 w-1/2" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="mt-6 h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
