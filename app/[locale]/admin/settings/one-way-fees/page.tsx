import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, MapPin } from 'lucide-react';
import { OneWayFeesForm } from '@/components/admin/one-way-fees-form';
import { DEFAULT_ONE_WAY_FEES, type OneWayFeesConfig } from '@/lib/tenant/types';

interface OneWayFeesPageProps {
  params: Promise<{ locale: string }>;
}

// Loading skeleton
function OneWayFeesFormSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

// Data fetcher component
async function OneWayFeesData({ locale }: { locale: string }) {
  const supabase = await createClient();

  // Get current user's tenant
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirect=/admin/settings/one-way-fees`);
  }

  const { data: profile } = (await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_id', user.id)
    .single()) as { data: { tenant_id: string; role: string } | null };

  if (!profile?.tenant_id) {
    redirect(`/${locale}/admin`);
  }

  // Check role
  const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager'];
  if (!allowedRoles.includes(profile.role)) {
    redirect(`/${locale}/admin`);
  }

  // Get tenant settings
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', profile.tenant_id)
    .single();

  // Get branches for zone fee configuration
  const { data: branches } = await supabase
    .from('branches')
    .select('id, name, city, status')
    .eq('tenant_id', profile.tenant_id)
    .eq('status', 'active')
    .order('sort_order')
    .order('name');

  const settings = tenant?.settings as Record<string, unknown> | null;
  const oneWayFees = (settings?.oneWayFees as OneWayFeesConfig) || DEFAULT_ONE_WAY_FEES;
  const currency = (settings?.currency as string) || 'EUR';

  return (
    <OneWayFeesForm
      locale={locale}
      initialData={oneWayFees}
      currency={currency}
      branches={(branches || []) as Array<{ id: string; name: string; city: string; status: string }>}
    />
  );
}

export default async function OneWayFeesPage({ params }: OneWayFeesPageProps) {
  const { locale } = await params;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/${locale}/admin/settings`}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            One-Way Rental Fees
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure fees for one-way rentals between branches
          </p>
        </div>
      </div>

      {/* Info box */}
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
              About One-Way Rentals
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-500 mt-1">
              One-way rentals allow customers to pick up at one branch and return at another.
              You can configure a flat fee, distance-based fee, or custom fees for specific routes.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-card rounded-lg border border-border p-4 md:p-6">
        <Suspense fallback={<OneWayFeesFormSkeleton />}>
          <OneWayFeesData locale={locale} />
        </Suspense>
      </div>
    </div>
  );
}
