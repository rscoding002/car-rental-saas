'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Building2,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  ArrowRight,
  CreditCard,
  Activity,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

// ============================================================================
// TYPES
// ============================================================================

interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  trialTenants: number;
  totalUsers: number;
  totalBookings: number;
}

interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'pending';
  subscription_tier: string;
  created_at: string;
  userCount?: number;
  vehicleCount?: number;
}

interface SubscriptionBreakdown {
  tier: string;
  count: number;
  percentage: number;
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'purple';
  href?: string;
  isLoading?: boolean;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  href,
  isLoading,
}: StatCardProps) {
  const variantStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
    warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    destructive: 'bg-red-500/10 text-red-600 dark:text-red-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  };

  const content = (
    <Card className={cn('relative overflow-hidden', href && 'hover:shadow-md transition-shadow cursor-pointer')}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl sm:text-3xl font-bold">{value}</p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn('p-2.5 rounded-lg', variantStyles[variant])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

// ============================================================================
// RECENT TENANTS WIDGET
// ============================================================================

interface RecentTenantsWidgetProps {
  tenants: TenantSummary[];
  isLoading: boolean;
  locale: string;
}

function RecentTenantsWidget({ tenants, isLoading, locale }: RecentTenantsWidgetProps) {
  const t = useTranslations('platformAdmin');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200">{t('tenantStatus.active')}</Badge>;
      case 'suspended':
        return <Badge variant="default" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">{t('tenantStatus.suspended')}</Badge>;
      case 'pending':
        return <Badge variant="default" className="bg-blue-500/10 text-blue-600 border-blue-200">{t('tenantStatus.pending')}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      free: 'bg-gray-100 text-gray-600',
      starter: 'bg-blue-100 text-blue-600',
      professional: 'bg-purple-100 text-purple-600',
      enterprise: 'bg-amber-100 text-amber-600',
      trial: 'bg-cyan-100 text-cyan-600',
    };
    return (
      <Badge variant="secondary" className={colors[tier] || colors.free}>
        {t(`subscriptionTier.${tier}` as any) || tier}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{t('recentTenants')}</CardTitle>
          <Link href={`/${locale}/platform-admin/tenants`}>
            <Button variant="ghost" size="sm" className="text-xs">
              View All
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tenants yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tenants.map((tenant) => (
              <Link
                key={tenant.id}
                href={`/${locale}/platform-admin/tenants/${tenant.id}`}
                className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{tenant.name}</p>
                    {getStatusBadge(tenant.status)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{tenant.slug}</span>
                    <span>•</span>
                    {getTierBadge(tenant.subscription_tier)}
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground hidden sm:block">
                  {new Date(tenant.created_at).toLocaleDateString(locale, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUBSCRIPTION BREAKDOWN WIDGET
// ============================================================================

interface SubscriptionWidgetProps {
  breakdown: SubscriptionBreakdown[];
  isLoading: boolean;
}

function SubscriptionWidget({ breakdown, isLoading }: SubscriptionWidgetProps) {
  const t = useTranslations('platformAdmin');

  const tierColors: Record<string, string> = {
    free: 'bg-gray-500',
    starter: 'bg-blue-500',
    professional: 'bg-purple-500',
    enterprise: 'bg-amber-500',
    trial: 'bg-cyan-500',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Subscription Tiers
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : breakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No subscription data</p>
        ) : (
          <div className="space-y-3">
            {breakdown.map((item) => (
              <div key={item.tier}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="capitalize">{t(`subscriptionTier.${item.tier}` as any) || item.tier}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', tierColors[item.tier] || 'bg-gray-500')}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SYSTEM STATUS WIDGET
// ============================================================================

interface SystemStatusWidgetProps {
  isLoading: boolean;
}

function SystemStatusWidget({ isLoading }: SystemStatusWidgetProps) {
  const services = [
    { name: 'Database', status: 'operational' },
    { name: 'Authentication', status: 'operational' },
    { name: 'Storage', status: 'operational' },
    { name: 'Email Service', status: 'operational' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4" />
          System Status
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {services.map((service) => (
              <div key={service.name} className="flex items-center justify-between py-1">
                <span className="text-sm">{service.name}</span>
                <div className="flex items-center gap-1.5 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">Operational</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN DASHBOARD PAGE
// ============================================================================

export default function PlatformAdminDashboardPage() {
  const t = useTranslations('platformAdmin');

  const [isLoading, setIsLoading] = useState(true);
  const [locale, setLocale] = useState('en');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [recentTenants, setRecentTenants] = useState<TenantSummary[]>([]);
  const [subscriptionBreakdown, setSubscriptionBreakdown] = useState<SubscriptionBreakdown[]>([]);

  useEffect(() => {
    // Extract locale from URL
    const pathLocale = window.location.pathname.split('/')[1];
    if (['en', 'lt', 'ru'].includes(pathLocale)) {
      setLocale(pathLocale);
    }

    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setIsLoading(true);
    const supabase = createClient();

    try {
      // Fetch all tenants
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantsError) {
        console.error('Error fetching tenants:', tenantsError);
        return;
      }

      const allTenants = tenants || [];

      // Calculate stats
      const statsData: PlatformStats = {
        totalTenants: allTenants.length,
        activeTenants: allTenants.filter(t => t.status === 'active').length,
        suspendedTenants: allTenants.filter(t => t.status === 'suspended').length,
        trialTenants: allTenants.filter(t => t.subscription_tier === 'trial').length,
        totalUsers: 0,
        totalBookings: 0,
      };

      // Get total users count
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      statsData.totalUsers = usersCount || 0;

      // Get total bookings count
      const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });
      statsData.totalBookings = bookingsCount || 0;

      setStats(statsData);

      // Recent tenants (top 5)
      setRecentTenants(allTenants.slice(0, 5).map(t => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        status: t.status as 'active' | 'suspended' | 'pending',
        subscription_tier: t.subscription_tier || 'free',
        created_at: t.created_at,
      })));

      // Subscription breakdown
      const tierCounts: Record<string, number> = {};
      allTenants.forEach(t => {
        const tier = t.subscription_tier || 'free';
        tierCounts[tier] = (tierCounts[tier] || 0) + 1;
      });

      const breakdown: SubscriptionBreakdown[] = Object.entries(tierCounts).map(([tier, count]) => ({
        tier,
        count,
        percentage: allTenants.length > 0 ? (count / allTenants.length) * 100 : 0,
      }));

      // Sort by count descending
      breakdown.sort((a, b) => b.count - a.count);
      setSubscriptionBreakdown(breakdown);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('overview')} • {new Date().toLocaleDateString(locale, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${locale}/platform-admin/tenants/new`}>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              {t('createTenant')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('totalTenants')}
          value={stats?.totalTenants ?? 0}
          icon={Building2}
          variant="purple"
          href={`/${locale}/platform-admin/tenants`}
          isLoading={isLoading}
        />
        <StatCard
          title={t('activeTenants')}
          value={stats?.activeTenants ?? 0}
          icon={CheckCircle}
          variant="success"
          href={`/${locale}/platform-admin/tenants?status=active`}
          isLoading={isLoading}
        />
        <StatCard
          title={t('suspendedTenants')}
          value={stats?.suspendedTenants ?? 0}
          icon={AlertCircle}
          variant="warning"
          href={`/${locale}/platform-admin/tenants?status=suspended`}
          isLoading={isLoading}
        />
        <StatCard
          title={t('tenantStatus.trial')}
          value={stats?.trialTenants ?? 0}
          subtitle="Active trials"
          icon={Clock}
          variant="default"
          isLoading={isLoading}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Total Platform Users"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          variant="default"
          isLoading={isLoading}
        />
        <StatCard
          title="Total Bookings"
          value={stats?.totalBookings ?? 0}
          icon={TrendingUp}
          variant="success"
          isLoading={isLoading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Tenants - Takes 2 columns */}
        <div className="lg:col-span-2">
          <RecentTenantsWidget
            tenants={recentTenants}
            isLoading={isLoading}
            locale={locale}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <SubscriptionWidget
            breakdown={subscriptionBreakdown}
            isLoading={isLoading}
          />
          <SystemStatusWidget isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
