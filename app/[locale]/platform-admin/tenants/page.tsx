'use client';

import { useState, useEffect, useTransition, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Building2,
  Users,
  Car,
  Eye,
  Settings,
  RefreshCw,
  AlertCircle,
  Plus,
  Globe,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DataTable,
  type ColumnDef,
  type SortState,
  type PaginationState,
  ActionCell,
  PrimaryCell,
} from '@/components/admin/data-table';

// Get subdomain display from slug
function getSubdomainDisplay(slug: string): string {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
  return `${slug}.${baseDomain}`;
}

// ============================================================================
// TYPES
// ============================================================================

interface TenantWithStats {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  status: 'active' | 'suspended' | 'pending';
  subscription_tier: string;
  created_at: string;
  updated_at: string;
  users_count: number;
  vehicles_count: number;
  bookings_count: number;
}

interface TenantsResponse {
  tenants: TenantWithStats[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    total: number;
    active: number;
    suspended: number;
    pending: number;
    trial: number;
  };
}

// Status variants for badges
const statusVariants: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  active: 'success',
  suspended: 'warning',
  pending: 'secondary',
};

const statusIcons: Record<string, React.ElementType> = {
  active: CheckCircle,
  suspended: XCircle,
  pending: Clock,
};

// Tier colors
const tierColors: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  trial: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  starter: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  professional: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  enterprise: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

// ============================================================================
// TENANT STATS COMPONENT
// ============================================================================

function TenantStats({
  stats,
  isLoading,
}: {
  stats: TenantsResponse['stats'] | null;
  isLoading?: boolean;
}) {
  const t = useTranslations('platformAdmin');

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card rounded-lg border border-border p-3 animate-pulse">
            <div className="h-4 w-16 bg-muted rounded mb-2" />
            <div className="h-8 w-12 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="bg-card rounded-lg border border-border p-3">
        <p className="text-sm text-muted-foreground">{t('totalTenants')}</p>
        <p className="text-2xl font-bold">{stats?.total || 0}</p>
      </div>
      <div className="bg-card rounded-lg border border-border p-3">
        <p className="text-sm text-muted-foreground">{t('activeTenants')}</p>
        <p className="text-2xl font-bold text-green-600">{stats?.active || 0}</p>
      </div>
      <div className="bg-card rounded-lg border border-border p-3">
        <p className="text-sm text-muted-foreground">{t('suspendedTenants')}</p>
        <p className="text-2xl font-bold text-yellow-600">{stats?.suspended || 0}</p>
      </div>
      <div className="bg-card rounded-lg border border-border p-3">
        <p className="text-sm text-muted-foreground">{t('tenantStatus.trial')}</p>
        <p className="text-2xl font-bold text-cyan-600">{stats?.trial || 0}</p>
      </div>
    </div>
  );
}

// ============================================================================
// STATUS FILTER CHIPS
// ============================================================================

function StatusFilterChips({
  currentStatus,
  onStatusChange,
}: {
  currentStatus: string;
  onStatusChange: (status: string) => void;
}) {
  const t = useTranslations('platformAdmin');

  const statusFilters = [
    { value: '', label: 'All' },
    { value: 'active', label: t('tenantStatus.active') },
    { value: 'suspended', label: t('tenantStatus.suspended') },
    { value: 'pending', label: t('tenantStatus.pending') },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 mb-4">
      {statusFilters.map((filter) => (
        <Button
          key={filter.value}
          variant={currentStatus === filter.value ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onStatusChange(filter.value)}
          className="shrink-0"
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}

// ============================================================================
// TIER FILTER CHIPS
// ============================================================================

function TierFilterChips({
  currentTier,
  onTierChange,
}: {
  currentTier: string;
  onTierChange: (tier: string) => void;
}) {
  const t = useTranslations('platformAdmin');

  const tierFilters = [
    { value: '', label: 'All Tiers' },
    { value: 'free', label: t('subscriptionTier.free') },
    { value: 'trial', label: t('tenantStatus.trial') },
    { value: 'starter', label: t('subscriptionTier.starter') },
    { value: 'professional', label: t('subscriptionTier.professional') },
    { value: 'enterprise', label: t('subscriptionTier.enterprise') },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 mb-4">
      {tierFilters.map((filter) => (
        <Button
          key={filter.value}
          variant={currentTier === filter.value ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onTierChange(filter.value)}
          className="shrink-0"
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}

// ============================================================================
// MOBILE TENANT ROW
// ============================================================================

function MobileTenantRow({ row: tenant, locale }: { row: TenantWithStats; locale: string }) {
  const t = useTranslations('platformAdmin');

  const createdDate = new Date(tenant.created_at).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const StatusIcon = statusIcons[tenant.status] || Clock;

  return (
    <div className="space-y-3">
      {/* Header: Name & Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-foreground">{tenant.name}</p>
            <p className="text-sm text-muted-foreground">{tenant.slug}</p>
          </div>
        </div>
        <Badge variant={statusVariants[tenant.status]}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {t(`tenantStatus.${tenant.status}` as any)}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="w-4 h-4 shrink-0" />
          <span>{tenant.users_count} users</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Car className="w-4 h-4 shrink-0" />
          <span>{tenant.vehicles_count} vehicles</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4 shrink-0" />
          <span>{createdDate}</span>
        </div>
      </div>

      {/* Tier & URL */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className={tierColors[tenant.subscription_tier] || tierColors.free}>
            {t(`subscriptionTier.${tenant.subscription_tier}` as any) || tenant.subscription_tier}
          </Badge>
          {tenant.domain && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Globe className="w-3 h-3" />
              {tenant.domain}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {getSubdomainDisplay(tenant.slug)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Link href={`/${locale}/platform-admin/tenants/${tenant.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            <Eye className="w-4 h-4 mr-2" />
            {t('viewTenant')}
          </Button>
        </Link>
        <Link href={`/${locale}/platform-admin/tenants/${tenant.id}/settings`}>
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function PlatformAdminTenantsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('platformAdmin');

  const locale = params.locale as string;
  const [data, setData] = useState<TenantsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get filter values from URL
  const statusFilter = searchParams.get('status') || '';
  const tierFilter = searchParams.get('tier') || '';
  const searchQuery = searchParams.get('search') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  // Fetch tenants from API
  const fetchTenants = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter) params.set('status', statusFilter);
      if (tierFilter) params.set('tier', tierFilter);
      params.set('page', pageParam.toString());
      params.set('limit', '20');
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const response = await fetch(`/api/platform-admin/tenants?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch tenants');
      }

      const result = await response.json();

      // Transform API response to expected format
      const tenantsWithStats: TenantWithStats[] = (result.tenants || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        domain: t.domain,
        status: t.status || 'active',
        subscription_tier: t.subscription_tier || 'free',
        created_at: t.created_at,
        updated_at: t.updated_at,
        users_count: t.users_count || 0,
        vehicles_count: t.vehicles_count || 0,
        bookings_count: t.bookings_count || 0,
      }));

      setData({
        tenants: tenantsWithStats,
        total: tenantsWithStats.length,
        page: pageParam,
        limit: 20,
        totalPages: Math.ceil(tenantsWithStats.length / 20),
        stats: result.stats || {
          total: tenantsWithStats.length,
          active: tenantsWithStats.filter((t: TenantWithStats) => t.status === 'active').length,
          suspended: tenantsWithStats.filter((t: TenantWithStats) => t.status === 'suspended').length,
          pending: tenantsWithStats.filter((t: TenantWithStats) => t.status === 'pending').length,
          trial: tenantsWithStats.filter((t: TenantWithStats) => t.subscription_tier === 'trial').length,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, tierFilter, pageParam, sortBy, sortOrder]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Define columns for DataTable
  const columns: ColumnDef<TenantWithStats>[] = useMemo(() => [
    {
      id: 'tenant',
      header: 'Tenant',
      colSpan: 3,
      sortable: true,
      sortKey: 'name',
      cell: ({ row }) => (
        <PrimaryCell
          primary={
            <Link
              href={`/${locale}/platform-admin/tenants/${row.id}`}
              className="hover:text-primary transition-colors"
            >
              {row.name}
            </Link>
          }
          secondary={row.slug}
          imageFallback={<Building2 className="w-5 h-5 text-purple-600" />}
          imageClassName="bg-purple-100 dark:bg-purple-900/30"
        />
      ),
    },
    {
      id: 'domain',
      header: 'URL',
      colSpan: 2,
      hideOnMobile: true,
      cell: ({ row }) => (
        <div className="text-sm">
          {row.domain ? (
            <span className="flex items-center gap-1 text-foreground">
              <Globe className="w-3 h-3 text-green-600" />
              <span className="font-medium">{row.domain}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground font-mono text-xs">
              {getSubdomainDisplay(row.slug)}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'tier',
      header: 'Tier',
      colSpan: 2,
      sortable: true,
      sortKey: 'subscription_tier',
      hideOnMobile: true,
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          className={tierColors[row.subscription_tier] || tierColors.free}
        >
          {t(`subscriptionTier.${row.subscription_tier}` as any) || row.subscription_tier}
        </Badge>
      ),
    },
    {
      id: 'users',
      header: 'Users',
      colSpan: 1,
      sortable: true,
      sortKey: 'users_count',
      align: 'center',
      hideOnMobile: true,
      cell: ({ row }) => (
        <span className="font-medium">{row.users_count}</span>
      ),
    },
    {
      id: 'vehicles',
      header: 'Vehicles',
      colSpan: 1,
      sortable: true,
      sortKey: 'vehicles_count',
      align: 'center',
      hideOnMobile: true,
      cell: ({ row }) => (
        <span className="font-medium">{row.vehicles_count}</span>
      ),
    },
    {
      id: 'created',
      header: 'Created',
      colSpan: 2,
      sortable: true,
      sortKey: 'created_at',
      hideOnMobile: true,
      cell: ({ row }) => {
        const date = new Date(row.created_at).toLocaleDateString(locale, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        return <span className="text-sm text-muted-foreground">{date}</span>;
      },
    },
    {
      id: 'status',
      header: 'Status',
      colSpan: 1,
      sortable: true,
      sortKey: 'status',
      hideOnMobile: true,
      cell: ({ row }) => {
        const StatusIcon = statusIcons[row.status] || Clock;
        return (
          <Badge variant={statusVariants[row.status]}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {t(`tenantStatus.${row.status}` as any)}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      colSpan: 1,
      align: 'right',
      hideOnMobile: true,
      cell: ({ row }) => (
        <ActionCell>
          <Link href={`/${locale}/platform-admin/tenants/${row.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8" title={t('viewTenant')}>
              <Eye className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={`/${locale}/platform-admin/tenants/${row.id}/settings`}>
            <Button variant="ghost" size="icon" className="h-8 w-8" title={t('tenantSettings')}>
              <Settings className="w-4 h-4" />
            </Button>
          </Link>
        </ActionCell>
      ),
    },
  ], [locale, t]);

  // Sort state
  const sortState: SortState = {
    column: sortBy,
    direction: sortOrder,
  };

  // Pagination state
  const pagination: PaginationState = {
    page: data?.page || 1,
    pageSize: data?.limit || 20,
    total: data?.total || 0,
    totalPages: data?.totalPages || 0,
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete('page');
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchChange = (value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set('search', value);
      } else {
        params.delete('search');
      }
      params.delete('page');
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handlePageChange = (newPage: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', newPage.toString());
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSortChange = (newSortState: SortState) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (newSortState.column && newSortState.direction) {
        params.set('sortBy', newSortState.column);
        params.set('sortOrder', newSortState.direction);
      } else {
        params.delete('sortBy');
        params.delete('sortOrder');
      }
      params.delete('page');
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleClearFilters = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters = statusFilter || tierFilter || searchQuery;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('tenants')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all rental company tenants on the platform
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTenants}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Link href={`/${locale}/platform-admin/tenants/new`}>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 gap-2">
              <Plus className="w-4 h-4" />
              {t('createTenant')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchTenants}
            className="ml-auto"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Stats */}
      <TenantStats
        stats={data?.stats || null}
        isLoading={isLoading && !data}
      />

      {/* Status Filter Chips */}
      <StatusFilterChips
        currentStatus={statusFilter}
        onStatusChange={(status) => handleFilterChange('status', status)}
      />

      {/* Tier Filter Chips */}
      <TierFilterChips
        currentTier={tierFilter}
        onTierChange={(tier) => handleFilterChange('tier', tier)}
      />

      {/* Data Table with integrated search and pagination */}
      <DataTable
        columns={columns}
        data={data?.tenants || []}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        sortState={sortState}
        onSortChange={handleSortChange}
        pagination={pagination}
        onPageChange={handlePageChange}
        searchProps={{
          value: searchQuery,
          onChange: handleSearchChange,
          placeholder: 'Search by name, slug, or domain...',
        }}
        hasActiveFilters={!!hasActiveFilters}
        onClearFilters={handleClearFilters}
        mobileRowRender={({ row }) => (
          <MobileTenantRow row={row} locale={locale} />
        )}
        emptyIcon={<Building2 className="w-6 h-6 text-muted-foreground" />}
        emptyTitle="No tenants found"
        emptyDescription={
          hasActiveFilters
            ? 'No tenants match your current filters. Try adjusting your search.'
            : 'Tenants will appear here once they are created.'
        }
      />
    </div>
  );
}
