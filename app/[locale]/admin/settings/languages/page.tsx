import { ArrowLeft, Languages } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { LanguagesForm } from '@/components/admin/languages-form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/server';

import type { TenantLanguages } from '@/lib/supabase/types';

interface LanguagesPageProps {
  params: Promise<{ locale: string }>;
}

// Loading skeleton
function LanguagesFormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Languages cards skeleton */}
      <div className="bg-card rounded-lg border border-border p-6">
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-64 mb-6" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="w-8 h-8 rounded" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-10" />
                </div>
              </div>
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      </div>
      {/* Summary skeleton */}
      <div className="bg-card rounded-lg border border-border p-6">
        <Skeleton className="h-6 w-24 mb-4" />
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between py-2 border-b">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex justify-between py-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Data fetcher component
async function LanguagesData({ locale }: { locale: string }) {
  const supabase = await createClient();

  // Get current user's tenant
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirect=/admin/settings/languages`);
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
    .select('id, settings')
    .eq('id', profile.tenant_id)
    .single();

  if (!tenant) {
    redirect(`/${locale}/admin`);
  }

  const settings = tenant.settings as Record<string, unknown> | null;
  const languageSettings: TenantLanguages = (settings?.languages as TenantLanguages) || {
    enabled: ['en', 'lt', 'ru'],
    default: 'en',
  };

  return (
    <LanguagesForm
      locale={locale}
      initialData={languageSettings}
    />
  );
}

export default async function LanguagesPage({ params }: LanguagesPageProps) {
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
          <h1 className="text-2xl font-semibold text-foreground">Languages</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage supported languages and default locale for your website
          </p>
        </div>
      </div>

      {/* Info box */}
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <Languages className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
              About Language Settings
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-500 mt-1">
              Control which languages are available on your website. Visitors can switch between
              enabled languages using the language switcher. The default language is shown to
              new visitors.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <Suspense fallback={<LanguagesFormSkeleton />}>
        <LanguagesData locale={locale} />
      </Suspense>
    </div>
  );
}
