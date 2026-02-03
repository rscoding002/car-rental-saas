import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { createClient } from '@/lib/supabase/server';
import { StaffBookingForm } from '@/components/admin/staff-booking-form';
import { Skeleton } from '@/components/ui/skeleton';
import type { Branch, Vehicle, VehicleCategory, Addon } from '@/lib/supabase/types';

interface NewBookingPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: NewBookingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin' });

  return {
    title: `${t('actions.createBooking')} | Admin`,
  };
}

// Fetch active branches
async function getBranches() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('branches')
    .select('id, name, city, address, phone, status')
    .eq('status', 'active')
    .order('city')
    .order('name');

  return (data || []) as Branch[];
}

// Fetch available vehicles with categories
async function getVehicles() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('vehicles')
    .select(`
      id, make, model, year, license_plate, transmission, fuel_type, seats,
      photos, status, category_id,
      category:vehicle_categories(id, name)
    `)
    .eq('status', 'available')
    .order('make')
    .order('model');

  return (data || []) as (Vehicle & { category: VehicleCategory | null })[];
}

// Fetch active addons
async function getAddons() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('addons')
    .select('*')
    .eq('status', 'active')
    .order('sort_order');

  return (data || []) as Addon[];
}

export default async function NewBookingPage({ params }: NewBookingPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin');

  // Fetch required data in parallel
  const [branches, vehicles, addons] = await Promise.all([
    getBranches(),
    getVehicles(),
    getAddons(),
  ]);

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <header className="border-b bg-card">
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-semibold sm:text-2xl">
            {t('actions.createBooking')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a booking for walk-in or phone customers
          </p>
        </div>
      </header>

      {/* Form Content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <Suspense fallback={<FormSkeleton />}>
          <StaffBookingForm
            locale={locale}
            branches={branches}
            vehicles={vehicles}
            addons={addons}
          />
        </Suspense>
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <Skeleton className="h-6 w-1/4 mb-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <Skeleton className="h-6 w-1/4 mb-4" />
        <Skeleton className="h-10 mb-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <Skeleton className="h-6 w-1/4 mb-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      </div>
    </div>
  );
}
