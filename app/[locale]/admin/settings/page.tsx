import {
  Palette,
  Languages,
  ShieldCheck,
  MapPin,
  Settings2,
  Clock,
  ChevronRight,
  Mail,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_TENANT_SETTINGS, type TenantSettings } from '@/lib/tenant/types';
import { cn } from '@/lib/utils';

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

// Loading skeleton for settings cards
function SettingsCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Settings card component
interface SettingsCardProps {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  status?: string;
  statusType?: 'success' | 'warning' | 'info' | 'neutral';
}

function SettingsCard({
  href,
  icon: Icon,
  title,
  description,
  status,
  statusType = 'neutral',
}: SettingsCardProps) {
  const statusColors = {
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-400',
    info: 'text-blue-600 dark:text-blue-400',
    neutral: 'text-muted-foreground',
  };

  return (
    <Link
      href={href}
      className={cn(
        'group bg-card rounded-lg border border-border p-4 transition-all',
        'hover:border-primary/50 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'active:scale-[0.98] touch-manipulation'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
              {title}
            </h3>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {description}
          </p>
          {status && (
            <p className={cn('text-xs mt-2', statusColors[statusType])}>
              {status}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

// Data fetcher component
async function SettingsData({ locale }: { locale: string }) {
  const t = await getTranslations('admin.settingsPage');
  const supabase = await createClient();

  // Get current user's tenant
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirect=/admin/settings`);
  }

  const { data: profile } = (await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_id', user.id)
    .single()) as { data: { tenant_id: string; role: string } | null };

  if (!profile?.tenant_id) {
    redirect(`/${locale}/admin`);
  }

  // Check role - only admins and managers can access settings
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

  const settings = (tenant?.settings as TenantSettings) || DEFAULT_TENANT_SETTINGS;

  // Language display helper
  const languageNames: Record<string, string> = {
    en: 'English',
    lt: 'Lietuvių',
    ru: 'Русский',
  };

  // Format enabled languages count
  const enabledLanguages = settings.languages?.enabled || ['en'];
  const defaultLanguage = settings.languages?.default || 'en';

  // Format cancellation policy
  const freeCancellationHours = settings.cancellationPolicy?.freeCancellationHours ?? 48;
  const partialRefundPercent = settings.cancellationPolicy?.partialRefundPercent ?? 50;

  // Format one-way fees
  const oneWayEnabled = settings.oneWayFees?.enabled ?? true;
  const oneWayType = settings.oneWayFees?.type || 'flat';
  const oneWayTypeDisplay: Record<string, string> = {
    flat: 'Flat fee',
    distance: 'Per km',
    zone: 'By zone',
  };

  // Format buffer time
  const bufferMinutes = settings.bufferTime ?? 60;

  // Format currency and timezone
  const currency = settings.currency || 'EUR';
  const timezone = settings.timezone || 'Europe/Vilnius';

  const settingsCards: SettingsCardProps[] = [
    {
      href: `/${locale}/admin/settings/branding`,
      icon: Palette,
      title: t('branding.title'),
      description: t('branding.description'),
      status: settings.branding?.primaryColor
        ? t('branding.currentLogo')
        : t('branding.noLogo'),
      statusType: settings.branding?.primaryColor ? 'success' : 'warning',
    },
    {
      href: `/${locale}/admin/settings/languages`,
      icon: Languages,
      title: t('languages.title'),
      description: t('languages.description'),
      status: `${t('languages.enabledCount', { count: enabledLanguages.length })} • ${t('languages.defaultLang', { lang: languageNames[defaultLanguage] || defaultLanguage })}`,
      statusType: 'info',
    },
    {
      href: `/${locale}/admin/settings/policies`,
      icon: ShieldCheck,
      title: t('policies.title'),
      description: t('policies.description'),
      status: `${t('policies.freeCancellation', { hours: freeCancellationHours })} • ${t('policies.partialRefund', { percent: partialRefundPercent })}`,
      statusType: 'info',
    },
    {
      href: `/${locale}/admin/settings/one-way-fees`,
      icon: MapPin,
      title: t('oneWayFees.title'),
      description: t('oneWayFees.description'),
      status: oneWayEnabled
        ? `${t('oneWayFees.enabled')} • ${t('oneWayFees.feeType', { type: oneWayTypeDisplay[oneWayType] })}`
        : t('oneWayFees.disabled'),
      statusType: oneWayEnabled ? 'success' : 'neutral',
    },
    {
      href: `/${locale}/admin/settings/general`,
      icon: Settings2,
      title: t('general.title'),
      description: t('general.description'),
      status: `${t('general.currency', { currency })} • ${t('general.timezone', { timezone })}`,
      statusType: 'info',
    },
    {
      href: `/${locale}/admin/settings/buffer-time`,
      icon: Clock,
      title: t('bufferTime.title'),
      description: t('bufferTime.description'),
      status: t('bufferTime.current', { minutes: bufferMinutes }),
      statusType: 'info',
    },
    {
      href: `/${locale}/admin/settings/email`,
      icon: Mail,
      title: t('email.title'),
      description: t('email.description'),
      status: settings.email?.replyToEmail
        ? t('email.configured')
        : t('email.usingDefaults'),
      statusType: settings.email?.replyToEmail ? 'success' : 'info',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {settingsCards.map((card) => (
        <SettingsCard key={card.href} {...card} />
      ))}
    </div>
  );
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;
  const t = await getTranslations('admin.settingsPage');

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Settings Cards Grid */}
      <Suspense fallback={<SettingsCardsSkeleton />}>
        <SettingsData locale={locale} />
      </Suspense>
    </div>
  );
}
