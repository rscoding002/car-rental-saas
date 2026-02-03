import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  CalendarRange,
  Edit,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Calendar,
  Sun,
  Snowflake,
  Leaf,
  AlertCircle,
} from 'lucide-react';
import { listSeasons, getSeasonStats, formatMultiplier, getSeasonStatus } from '@/lib/pricing/season-queries';
import type { SeasonData, RuleStatus } from '@/lib/pricing/types';

interface SeasonsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    status?: string;
  }>;
}

// Status badge variant mapping
const statusVariants: Record<'active' | 'inactive', 'success' | 'secondary'> = {
  active: 'success',
  inactive: 'secondary',
};

const statusLabels: Record<string, Record<'active' | 'inactive', string>> = {
  en: { active: 'Active', inactive: 'Inactive' },
  lt: { active: 'Aktyvus', inactive: 'Neaktyvus' },
  ru: { active: 'Активный', inactive: 'Неактивный' },
};

// Season timing badge variants
const timingVariants: Record<'upcoming' | 'active' | 'past', 'default' | 'success' | 'secondary'> = {
  upcoming: 'default',
  active: 'success',
  past: 'secondary',
};

const timingLabels: Record<'upcoming' | 'active' | 'past', string> = {
  upcoming: 'Upcoming',
  active: 'Currently Active',
  past: 'Past',
};

// Get season icon based on dates (simple heuristic)
function getSeasonIcon(startDate: string) {
  const month = new Date(startDate).getMonth();
  if (month >= 5 && month <= 7) return Sun; // Summer (June-August)
  if (month >= 11 || month <= 1) return Snowflake; // Winter (December-February)
  return Leaf; // Spring/Autumn
}

// Stats component
async function SeasonStats({ tenantId }: { tenantId: string }) {
  const supabase = await createClient();
  const stats = await getSeasonStats(supabase, tenantId);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <CalendarRange className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{stats.totalSeasons}</p>
            <p className="text-sm text-muted-foreground">Total Seasons</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Sun className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{stats.currentlyActive}</p>
            <p className="text-sm text-muted-foreground">Currently Active</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{stats.upcomingSeasons}</p>
            <p className="text-sm text-muted-foreground">Upcoming</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${stats.averageMultiplier >= 1 ? 'bg-orange-500/10' : 'bg-green-500/10'}`}>
            {stats.averageMultiplier >= 1 ? (
              <TrendingUp className="w-5 h-5 text-orange-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-green-500" />
            )}
          </div>
          <div>
            <p className="text-2xl font-semibold">{formatMultiplier(stats.averageMultiplier)}</p>
            <p className="text-sm text-muted-foreground">Avg Adjustment</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stats skeleton
function SeasonStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Seasons table component
async function SeasonsTable({
  locale,
  tenantId,
  statusFilter,
}: {
  locale: string;
  tenantId: string;
  statusFilter?: string;
}) {
  const supabase = await createClient();

  const { data: seasons } = await listSeasons(supabase, tenantId, {
    filters: {
      status: statusFilter as RuleStatus | undefined,
    },
    sort: { field: 'start_date', direction: 'asc' },
  });

  const labels = statusLabels[locale] || statusLabels.en;

  if (!seasons || seasons.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarRange className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">
          {statusFilter
            ? 'No seasons match your filter.'
            : 'No seasons yet. Add your first seasonal pricing rule.'}
        </p>
        <Link href={`/${locale}/admin/pricing/seasons/new`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Season
          </Button>
        </Link>
      </div>
    );
  }

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Table Header - Desktop */}
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
        <div className="col-span-3">Season</div>
        <div className="col-span-3">Date Range</div>
        <div className="col-span-2">Multiplier</div>
        <div className="col-span-1">Priority</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border">
        {seasons.map((season) => {
          const SeasonIcon = getSeasonIcon(season.startDate);
          const timing = getSeasonStatus(season.startDate, season.endDate);
          const isIncrease = season.multiplier >= 1;

          return (
            <div
              key={season.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 md:px-6 py-4 hover:bg-muted/30 transition-colors"
            >
              {/* Mobile: Primary Info */}
              <div className="md:col-span-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <SeasonIcon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/${locale}/admin/pricing/seasons/${season.id}/edit`}
                    className="font-medium text-foreground hover:text-primary transition-colors block truncate"
                  >
                    {season.name}
                  </Link>
                  <p className="text-sm text-muted-foreground md:hidden">
                    {formatDate(season.startDate)} - {formatDate(season.endDate)}
                  </p>
                </div>
              </div>

              {/* Date Range - Desktop */}
              <div className="hidden md:flex md:col-span-3 md:items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {formatDate(season.startDate)} - {formatDate(season.endDate)}
                </span>
              </div>

              {/* Multiplier - Desktop */}
              <div className="hidden md:flex md:col-span-2 md:items-center gap-2">
                {isIncrease ? (
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-green-500" />
                )}
                <span className={`text-sm font-medium ${isIncrease ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatMultiplier(season.multiplier)}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({season.multiplier}x)
                </span>
              </div>

              {/* Priority - Desktop */}
              <div className="hidden md:flex md:col-span-1 md:items-center">
                <span className="text-sm text-muted-foreground">{season.priority}</span>
              </div>

              {/* Status - Desktop */}
              <div className="hidden md:flex md:col-span-1 md:items-center">
                <Badge variant={statusVariants[season.status]}>
                  {labels[season.status]}
                </Badge>
              </div>

              {/* Mobile: Additional Info */}
              <div className="md:hidden flex items-center gap-3 text-sm text-muted-foreground">
                <Badge variant={timingVariants[timing]}>
                  {timingLabels[timing]}
                </Badge>
                <span className={`font-medium ${isIncrease ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatMultiplier(season.multiplier)}
                </span>
                <Badge variant={statusVariants[season.status]} className="ml-auto">
                  {labels[season.status]}
                </Badge>
              </div>

              {/* Actions */}
              <div className="md:col-span-2 flex items-center md:justify-end gap-1 mt-2 md:mt-0">
                <Link href={`/${locale}/admin/pricing/seasons/${season.id}/edit`} className="flex-1 md:flex-initial">
                  <Button variant="outline" size="sm" className="w-full md:w-auto">
                    <Edit className="w-4 h-4 md:mr-0 mr-2" />
                    <span className="md:hidden">Edit</span>
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Loading skeleton
function SeasonsTableSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border">
        <Skeleton className="h-4 w-20 col-span-3" />
        <Skeleton className="h-4 w-32 col-span-3" />
        <Skeleton className="h-4 w-16 col-span-2" />
        <Skeleton className="h-4 w-12 col-span-1" />
        <Skeleton className="h-4 w-16 col-span-1" />
        <Skeleton className="h-4 w-20 col-span-2 ml-auto" />
      </div>
      <div className="divide-y divide-border">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="px-4 md:px-6 py-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48 md:hidden" />
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Filter component
function SeasonFilters({
  locale,
  currentStatus,
}: {
  locale: string;
  currentStatus?: string;
}) {
  return (
    <form className="flex flex-col sm:flex-row gap-3">
      {/* Status filter */}
      <select
        name="status"
        defaultValue={currentStatus || ''}
        className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        onChange={(e) => {
          const form = e.target.form;
          if (form) form.submit();
        }}
      >
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </form>
  );
}

export default async function SeasonsPage({ params, searchParams }: SeasonsPageProps) {
  const { locale } = await params;
  const { status } = await searchParams;

  const supabase = await createClient();

  // Get current user's tenant
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <p className="text-muted-foreground">Please sign in to access seasons management.</p>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_id', user.id)
    .single() as { data: { tenant_id: string } | null };

  if (!profile?.tenant_id) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <p className="text-muted-foreground">No tenant found for your account.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/admin/pricing`}>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Seasonal Pricing
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage price adjustments for different seasons
            </p>
          </div>
        </div>
        <Link href={`/${locale}/admin/pricing/seasons/new`}>
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Season
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <Suspense fallback={<SeasonStatsSkeleton />}>
        <SeasonStats tenantId={profile.tenant_id} />
      </Suspense>

      {/* Info box */}
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
              How Seasonal Pricing Works
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-500 mt-1">
              Seasons apply a multiplier to base rates during specific date ranges. A multiplier of 1.5 means prices are 50% higher.
              When seasons overlap, the one with the highest priority is used.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <SeasonFilters
          locale={locale}
          currentStatus={status}
        />
      </div>

      {/* Seasons Table */}
      <Suspense fallback={<SeasonsTableSkeleton />}>
        <SeasonsTable
          locale={locale}
          tenantId={profile.tenant_id}
          statusFilter={status}
        />
      </Suspense>

      {/* Help text */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex gap-3">
          <CalendarRange className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Create seasons for peak periods (summer holidays, Christmas) with higher multipliers,
              and off-peak periods with lower multipliers to optimize revenue and vehicle utilization.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Priority:</strong> When multiple seasons overlap, the season with the highest priority number takes precedence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
