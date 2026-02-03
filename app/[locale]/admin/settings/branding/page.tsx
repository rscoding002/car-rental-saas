import { ArrowLeft, Palette } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { BrandingForm } from '@/components/admin/branding-form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/server';


import type { TenantBranding } from '@/lib/supabase/types';

interface BrandingPageProps {
  params: Promise<{ locale: string }>;
}

// Loading skeleton
function BrandingFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="bg-card rounded-lg border border-border p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
      <div className="bg-card rounded-lg border border-border p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

// Data fetcher component
async function BrandingData({ locale }: { locale: string }) {
  const supabase = await createClient();

  // Get current user's tenant
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirect=/admin/settings/branding`);
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

  // Get tenant data
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, logo_url, settings')
    .eq('id', profile.tenant_id)
    .single();

  if (!tenant) {
    redirect(`/${locale}/admin`);
  }

  const settings = tenant.settings as Record<string, unknown> | null;

  return (
    <BrandingForm
      locale={locale}
      tenantId={tenant.id}
      initialData={{
        logoUrl: tenant.logo_url || null,
        branding: (settings?.branding as TenantBranding) || null,
      }}
    />
  );
}

export default async function BrandingPage({ params }: BrandingPageProps) {
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
          <h1 className="text-2xl font-semibold text-foreground">Branding</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customize your logo, colors, and brand appearance
          </p>
        </div>
      </div>

      {/* Info box */}
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <Palette className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
              About Branding
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-500 mt-1">
              Your branding settings are applied across your entire website including
              the header, buttons, and accent elements. Changes take effect immediately
              after saving.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <Suspense fallback={<BrandingFormSkeleton />}>
        <BrandingData locale={locale} />
      </Suspense>
    </div>
  );
}
