'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Building2,
  Users,
  Car,
  Calendar,
  Globe,
  Mail,
  Clock,
  RefreshCw,
  AlertCircle,
  Settings,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  Trash2,
  ExternalLink,
  CreditCard,
  MapPin,
  DollarSign,
  TrendingUp,
  Edit,
  Link as LinkIcon,
  Copy,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import { CustomDomainForm } from '@/components/platform-admin';

// Get subdomain URL from slug
function getSubdomainUrl(slug: string): string {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
  const protocol = baseDomain.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${slug}.${baseDomain}`;
}

function getSubdomainDisplay(slug: string): string {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
  return `${slug}.${baseDomain}`;
}

// ============================================================================
// TYPES
// ============================================================================

interface TenantSettings {
  branding?: {
    primaryColor?: string;
    logoUrl?: string;
    companyName?: string;
  };
  languages?: {
    enabled?: string[];
    default?: string;
  };
  [key: string]: any;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  status: 'active' | 'suspended' | 'pending';
  subscription_tier: string;
  settings: TenantSettings | null;
  created_at: string;
  updated_at: string;
}

interface TenantStats {
  users: {
    total: number;
    admins: number;
    managers: number;
    staff: number;
    customers: number;
    active: number;
  };
  vehicles: {
    total: number;
    available: number;
    rented: number;
    maintenance: number;
    retired: number;
  };
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    active: number;
    completed: number;
    cancelled: number;
    totalRevenue: number;
  };
  branches: {
    total: number;
    active: number;
  };
}

interface TenantResponse {
  tenant: Tenant;
  stats: TenantStats;
}

// Status configurations
const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  active: {
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle,
    label: 'Active',
  },
  suspended: {
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: Pause,
    label: 'Suspended',
  },
  pending: {
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Clock,
    label: 'Pending',
  },
};

// Tier colors
const tierColors: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  trial: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  starter: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  professional: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  enterprise: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

// Subscription tier options
const SUBSCRIPTION_TIERS = [
  { value: 'trial', label: 'Trial', description: '14-day free trial', color: 'border-cyan-500 bg-cyan-500/10' },
  { value: 'free', label: 'Free', description: 'Basic features', color: 'border-gray-500 bg-gray-500/10' },
  { value: 'starter', label: 'Starter', description: 'Small businesses', color: 'border-blue-500 bg-blue-500/10' },
  { value: 'professional', label: 'Professional', description: 'Growing companies', color: 'border-purple-500 bg-purple-500/10' },
  { value: 'enterprise', label: 'Enterprise', description: 'Unlimited features', color: 'border-amber-500 bg-amber-500/10' },
];

// Status options for management
const STATUS_OPTIONS = [
  {
    value: 'active',
    label: 'Active',
    description: 'Tenant is fully operational',
    color: 'border-green-500 bg-green-500/10',
    icon: CheckCircle,
  },
  {
    value: 'suspended',
    label: 'Suspended',
    description: 'Access temporarily disabled',
    color: 'border-yellow-500 bg-yellow-500/10',
    icon: Pause,
  },
  {
    value: 'pending',
    label: 'Pending',
    description: 'Awaiting activation',
    color: 'border-blue-500 bg-blue-500/10',
    icon: Clock,
  },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function InfoRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-3 py-3', className)}>
      <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground mt-0.5">{value || '—'}</p>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'purple';
}) {
  const variantStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger: 'bg-red-500/10 text-red-600 dark:text-red-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="bg-card rounded-lg border border-border p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={cn('p-1.5 rounded-md', variantStyles[variant])}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs text-muted-foreground">{title}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('platformAdmin');

  const locale = params.locale as string;
  const tenantId = params.id as string;

  const [data, setData] = useState<TenantResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingTier, setIsChangingTier] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // Fetch tenant data
  const fetchTenant = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/platform-admin/tenants/${tenantId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch tenant');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  // Handle status change
  const handleStatusChange = async (newStatus: 'active' | 'suspended' | 'pending') => {
    setIsChangingStatus(true);
    try {
      const response = await fetch(`/api/platform-admin/tenants/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update tenant status');
      }

      await fetchTenant();
      setShowSuspendModal(false);
      setShowStatusModal(false);
      setSelectedStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsChangingStatus(false);
    }
  };

  // Handle tier change
  const handleTierChange = async (newTier: string) => {
    setIsChangingTier(true);
    try {
      const response = await fetch(`/api/platform-admin/tenants/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_tier: newTier }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update subscription tier');
      }

      await fetchTenant();
      setShowTierModal(false);
      setSelectedTier(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsChangingTier(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/platform-admin/tenants/${tenantId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete tenant');
      }

      router.push(`/${locale}/platform-admin/tenants`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsUpdating(false);
      setShowDeleteModal(false);
    }
  };

  const tenant = data?.tenant;
  const stats = data?.stats;
  const status = tenant ? statusConfig[tenant.status] : null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-foreground truncate">
            {t('tenantDetails')}
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage tenant information
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTenant}
          disabled={isLoading}
          className="shrink-0 gap-2"
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchTenant}
            className="ml-auto"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading */}
      {isLoading && !data && <LoadingSkeleton />}

      {/* Content */}
      {data && tenant && stats && (
        <div className="space-y-6">
          {/* Tenant header */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="w-16 h-16 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
              <Building2 className="w-8 h-8 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-xl font-semibold text-foreground">
                  {tenant.name}
                </h2>
                {status && (
                  <Badge className={cn('text-xs', status.color)}>
                    <status.icon className="w-3 h-3 mr-1" />
                    {t(`tenantStatus.${tenant.status}` as any)}
                  </Badge>
                )}
                <Badge
                  variant="secondary"
                  className={tierColors[tenant.subscription_tier] || tierColors.free}
                >
                  {t(`subscriptionTier.${tenant.subscription_tier}` as any) || tenant.subscription_tier}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {tenant.slug}
                {tenant.domain && (
                  <span className="ml-2">
                    • <Globe className="w-3 h-3 inline" /> {tenant.domain}
                  </span>
                )}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 shrink-0">
              {tenant.status === 'active' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSuspendModal(true)}
                  className="gap-2 text-yellow-600 hover:text-yellow-700"
                >
                  <Pause className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('suspendTenant')}</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('active')}
                  disabled={isUpdating}
                  className="gap-2 text-green-600 hover:text-green-700"
                >
                  <Play className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('reactivateTenant')}</span>
                </Button>
              )}
              <Link href={`/${locale}/platform-admin/tenants/${tenant.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Edit className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Subdomain URL Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-1">
                    <LinkIcon className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Provisioned Subdomain</span>
                  </div>
                  <a
                    href={getSubdomainUrl(tenant.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-base sm:text-lg text-blue-800 dark:text-blue-200 hover:underline flex items-center gap-2 truncate"
                  >
                    {getSubdomainDisplay(tenant.slug)}
                    <ExternalLink className="w-4 h-4 shrink-0" />
                  </a>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    This subdomain is automatically provisioned and active
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-white/50 dark:bg-gray-900/50 border-blue-300 dark:border-blue-700 hover:bg-white dark:hover:bg-gray-900"
                    onClick={() => {
                      navigator.clipboard.writeText(getSubdomainUrl(tenant.slug));
                    }}
                  >
                    <Copy className="w-4 h-4" />
                    <span className="hidden sm:inline">Copy URL</span>
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                    asChild
                  >
                    <a
                      href={getSubdomainUrl(tenant.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="hidden sm:inline">Visit Site</span>
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Custom Domain Configuration */}
          <CustomDomainForm
            tenantId={tenant.id}
            tenantSlug={tenant.slug}
            currentDomain={tenant.domain}
            onDomainChange={async (domain) => {
              const response = await fetch(`/api/platform-admin/tenants/${tenantId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain }),
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update domain');
              }

              await fetchTenant();
            }}
            isUpdating={isUpdating}
          />

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              title="Total Users"
              value={stats.users.total}
              subtitle={`${stats.users.customers} customers`}
              icon={Users}
              variant="purple"
            />
            <StatCard
              title="Vehicles"
              value={stats.vehicles.total}
              subtitle={`${stats.vehicles.available} available`}
              icon={Car}
              variant="default"
            />
            <StatCard
              title="Bookings"
              value={stats.bookings.total}
              subtitle={`${stats.bookings.active} active`}
              icon={Calendar}
            />
            <StatCard
              title="Revenue"
              value={formatCurrency(stats.bookings.totalRevenue)}
              subtitle={`${stats.bookings.completed} completed`}
              icon={DollarSign}
              variant="success"
            />
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              title="Branches"
              value={stats.branches.total}
              subtitle={`${stats.branches.active} active`}
              icon={MapPin}
            />
            <StatCard
              title="Staff Members"
              value={stats.users.admins + stats.users.managers + stats.users.staff}
              subtitle={`${stats.users.admins} admin, ${stats.users.managers} managers`}
              icon={Users}
            />
            <StatCard
              title="Pending Bookings"
              value={stats.bookings.pending}
              icon={Clock}
              variant="warning"
            />
            <StatCard
              title="Cancelled"
              value={stats.bookings.cancelled}
              icon={XCircle}
              variant="danger"
            />
          </div>

          {/* Tenant information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tenant Information</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <InfoRow
                icon={Building2}
                label="Company Name"
                value={tenant.name}
              />
              <InfoRow
                icon={LinkIcon}
                label="Slug / Subdomain"
                value={
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-sm">{tenant.slug}</span>
                    <a
                      href={getSubdomainUrl(tenant.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      {getSubdomainDisplay(tenant.slug)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                }
              />
              <InfoRow
                icon={Globe}
                label="Custom Domain"
                value={
                  tenant.domain ? (
                    <a
                      href={`https://${tenant.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      {tenant.domain}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
              <InfoRow
                icon={CreditCard}
                label="Subscription Tier"
                value={
                  <Badge
                    variant="secondary"
                    className={tierColors[tenant.subscription_tier] || tierColors.free}
                  >
                    {t(`subscriptionTier.${tenant.subscription_tier}` as any) || tenant.subscription_tier}
                  </Badge>
                }
              />
              <InfoRow
                icon={Calendar}
                label="Created"
                value={formatDate(tenant.created_at)}
              />
              <InfoRow
                icon={Clock}
                label="Last Updated"
                value={formatDate(tenant.updated_at)}
              />
            </CardContent>
          </Card>

          {/* Subscription Tier Management */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-600" />
                Subscription Plan
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedTier(tenant.subscription_tier);
                  setShowTierModal(true);
                }}
                className="gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                Change Plan
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {SUBSCRIPTION_TIERS.map((tier) => {
                  const isCurrentTier = tenant.subscription_tier === tier.value;
                  return (
                    <div
                      key={tier.value}
                      className={cn(
                        'flex-1 min-w-[100px] p-3 rounded-lg border-2 transition-all',
                        isCurrentTier
                          ? `${tier.color} ring-2 ring-offset-2 ring-purple-500`
                          : 'border-border bg-muted/30 opacity-60'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{tier.label}</p>
                        {isCurrentTier && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tier.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Tenant Status Management */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {status && <status.icon className="w-4 h-4" />}
                Tenant Status
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedStatus(tenant.status);
                  setShowStatusModal(true);
                }}
                className="gap-2"
              >
                <Edit className="w-4 h-4" />
                Change Status
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((statusOption) => {
                  const isCurrentStatus = tenant.status === statusOption.value;
                  const StatusIcon = statusOption.icon;
                  return (
                    <div
                      key={statusOption.value}
                      className={cn(
                        'flex-1 min-w-[120px] p-3 rounded-lg border-2 transition-all',
                        isCurrentStatus
                          ? `${statusOption.color} ring-2 ring-offset-2 ring-primary`
                          : 'border-border bg-muted/30 opacity-60'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <StatusIcon className="w-4 h-4" />
                        <p className="font-medium text-sm">{statusOption.label}</p>
                        {isCurrentStatus && (
                          <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {statusOption.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Settings overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t('tenantSettings')}</CardTitle>
              <Link href={`/${locale}/platform-admin/tenants/${tenant.id}/settings`}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  Manage Settings
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Branding */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-md bg-purple-500/10">
                      <Building2 className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="font-medium text-sm">Branding</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tenant.settings?.branding?.primaryColor
                      ? `Primary color: ${tenant.settings.branding.primaryColor}`
                      : 'Default branding'}
                  </p>
                </div>

                {/* Languages */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-md bg-blue-500/10">
                      <Globe className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-medium text-sm">Languages</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tenant.settings?.languages?.enabled
                      ? `${tenant.settings.languages.enabled.length} language(s) enabled`
                      : 'Default languages'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-2">
                <Button variant="outline" className="justify-start gap-2" asChild>
                  <Link href={`/${locale}/platform-admin/tenants/${tenant.id}/users`}>
                    <Users className="w-4 h-4" />
                    View Users ({stats.users.total})
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start gap-2" asChild>
                  <Link href={`/${locale}/platform-admin/tenants/${tenant.id}/vehicles`}>
                    <Car className="w-4 h-4" />
                    View Vehicles ({stats.vehicles.total})
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start gap-2" asChild>
                  <Link href={`/${locale}/platform-admin/tenants/${tenant.id}/bookings`}>
                    <Calendar className="w-4 h-4" />
                    View Bookings ({stats.bookings.total})
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger zone */}
          <Card className="border-red-200 dark:border-red-900/50">
            <CardHeader>
              <CardTitle className="text-base text-red-600">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{t('deleteTenant')}</p>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete this tenant and all associated data. This action cannot be undone.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  className="gap-2 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('deleteTenant')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Suspend Modal */}
      <Modal
        open={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        title={t('suspendTenant')}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to suspend <strong>{tenant?.name}</strong>?
            Users will not be able to access the platform while suspended.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSuspendModal(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleStatusChange('suspended')}
              disabled={isUpdating}
              className="gap-2"
            >
              {isUpdating && <RefreshCw className="w-4 h-4 animate-spin" />}
              {t('suspendTenant')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('deleteTenant')}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-sm">
            <strong>Warning:</strong> This action cannot be undone. All data associated with
            this tenant will be permanently deleted.
          </div>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{tenant?.name}</strong>?
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isUpdating}
              className="gap-2"
            >
              {isUpdating && <RefreshCw className="w-4 h-4 animate-spin" />}
              {t('deleteTenant')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Tier Change Modal */}
      <Modal
        open={showTierModal}
        onClose={() => {
          setShowTierModal(false);
          setSelectedTier(null);
        }}
        title="Change Subscription Plan"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select a new subscription plan for <strong>{tenant?.name}</strong>.
          </p>

          <div className="space-y-2">
            {SUBSCRIPTION_TIERS.map((tier) => {
              const isSelected = selectedTier === tier.value;
              const isCurrent = tenant?.subscription_tier === tier.value;

              return (
                <button
                  key={tier.value}
                  type="button"
                  onClick={() => setSelectedTier(tier.value)}
                  className={cn(
                    'w-full p-3 rounded-lg border-2 text-left transition-all touch-manipulation',
                    isSelected
                      ? `${tier.color} ring-2 ring-offset-2 ring-purple-500`
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{tier.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tier.description}
                      </p>
                    </div>
                    {isCurrent && (
                      <Badge variant="secondary" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowTierModal(false);
                setSelectedTier(null);
              }}
              disabled={isChangingTier}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedTier && handleTierChange(selectedTier)}
              disabled={isChangingTier || !selectedTier || selectedTier === tenant?.subscription_tier}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              {isChangingTier && <RefreshCw className="w-4 h-4 animate-spin" />}
              Update Plan
            </Button>
          </div>
        </div>
      </Modal>

      {/* Status Change Modal */}
      <Modal
        open={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setSelectedStatus(null);
        }}
        title="Change Tenant Status"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select a new status for <strong>{tenant?.name}</strong>.
          </p>

          {selectedStatus === 'suspended' && tenant?.status !== 'suspended' && (
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-300 text-sm">
              <strong>Note:</strong> Suspending a tenant will prevent all users from accessing the platform.
            </div>
          )}

          <div className="space-y-2">
            {STATUS_OPTIONS.map((statusOption) => {
              const isSelected = selectedStatus === statusOption.value;
              const isCurrent = tenant?.status === statusOption.value;
              const StatusIcon = statusOption.icon;

              return (
                <button
                  key={statusOption.value}
                  type="button"
                  onClick={() => setSelectedStatus(statusOption.value)}
                  className={cn(
                    'w-full p-3 rounded-lg border-2 text-left transition-all touch-manipulation',
                    isSelected
                      ? `${statusOption.color} ring-2 ring-offset-2 ring-primary`
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className="w-4 h-4" />
                      <div>
                        <p className="font-medium text-sm">{statusOption.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {statusOption.description}
                        </p>
                      </div>
                    </div>
                    {isCurrent && (
                      <Badge variant="secondary" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowStatusModal(false);
                setSelectedStatus(null);
              }}
              disabled={isChangingStatus}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedStatus && handleStatusChange(selectedStatus as 'active' | 'suspended' | 'pending')}
              disabled={isChangingStatus || !selectedStatus || selectedStatus === tenant?.status}
              className="gap-2"
              variant={selectedStatus === 'suspended' ? 'destructive' : 'default'}
            >
              {isChangingStatus && <RefreshCw className="w-4 h-4 animate-spin" />}
              Update Status
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
