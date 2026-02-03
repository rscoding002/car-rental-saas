import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { CancellationPolicyForm } from '@/components/admin/cancellation-policy-form';
import { DEFAULT_CANCELLATION_POLICY, type CancellationPolicy } from '@/lib/booking/types';

interface PoliciesPageProps {
  params: Promise<{ locale: string }>;
}

// Loading skeleton
function PolicyFormSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-10 w-32 ml-auto" />
    </div>
  );
}

// Data fetcher component
async function CancellationPolicyData({ locale }: { locale: string }) {
  const supabase = await createClient();

  // Get current user's tenant
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirect=/admin/settings/policies`);
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

  const settings = tenant?.settings as Record<string, unknown> | null;
  const cancellationPolicy = (settings?.cancellationPolicy as CancellationPolicy) || DEFAULT_CANCELLATION_POLICY;

  return (
    <CancellationPolicyForm
      locale={locale}
      initialData={cancellationPolicy}
    />
  );
}

export default async function PoliciesPage({ params }: PoliciesPageProps) {
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
            Cancellation Policies
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure refund rules for booking cancellations
          </p>
        </div>
      </div>

      {/* Info box */}
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
              About Cancellation Policies
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-500 mt-1">
              These settings determine how refunds are calculated when customers cancel their bookings.
              The policy is based on how many hours before the pickup time the cancellation occurs.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <Suspense fallback={<PolicyFormSkeleton />}>
        <CancellationPolicyData locale={locale} />
      </Suspense>
    </div>
  );
}
