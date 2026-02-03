import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { EmailSettingsForm } from '@/components/admin/email-settings-form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_EMAIL_SETTINGS, type TenantEmailSettings } from '@/lib/tenant/types';

interface EmailSettingsPageProps {
  params: Promise<{ locale: string }>;
}

// Loading skeleton
function EmailSettingsFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="bg-card rounded-lg border border-border p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Data fetcher component
async function EmailSettingsData({ locale }: { locale: string }) {
  const supabase = await createClient();

  // Get current user's tenant
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirect=/admin/settings/email`);
  }

  const { data: profile } = (await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_id', user.id)
    .single()) as { data: { tenant_id: string; role: string } | null };

  if (!profile?.tenant_id) {
    redirect(`/${locale}/admin`);
  }

  // Check role - only tenant_admin and platform_admin can manage email settings
  const allowedRoles = ['platform_admin', 'tenant_admin'];
  if (!allowedRoles.includes(profile.role)) {
    redirect(`/${locale}/admin/settings`);
  }

  // Get tenant data
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, settings')
    .eq('id', profile.tenant_id)
    .single();

  if (!tenant) {
    redirect(`/${locale}/admin`);
  }

  const settings = tenant.settings as Record<string, unknown> | null;
  const emailSettings = (settings?.email as TenantEmailSettings) || DEFAULT_EMAIL_SETTINGS;

  return (
    <EmailSettingsForm
      locale={locale}
      tenantName={tenant.name || ''}
      initialData={emailSettings}
    />
  );
}

export default async function EmailSettingsPage({ params }: EmailSettingsPageProps) {
  const { locale } = await params;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/${locale}/admin/settings`}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Email Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure email notifications and sender information
          </p>
        </div>
      </div>

      {/* Info box */}
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
              About Email Settings
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-500 mt-1">
              Customize how emails are sent to your customers. You can set a custom sender
              name and reply-to address, and control which notification emails are enabled.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <Suspense fallback={<EmailSettingsFormSkeleton />}>
        <EmailSettingsData locale={locale} />
      </Suspense>
    </div>
  );
}
