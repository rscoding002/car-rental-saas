import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Plus,
  DollarSign,
  Edit,
  Search,
  Tag,
  Car,
  Clock,
  Calendar,
  CalendarDays,
  CalendarRange,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import type { RateType, LocalizedString } from '@/lib/supabase/types';
import { listPricingRules, getPricingStats, getCategoriesWithoutPricing } from '@/lib/pricing/queries';

interface PricingPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    status?: string;
    rateType?: string;
    scope?: string;
    search?: string;
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

// Rate type icons
const rateTypeIcons: Record<RateType, React.ComponentType<{ className?: string }>> = {
  hourly: Clock,
  daily: Calendar,
  weekly: CalendarDays,
  monthly: CalendarRange,
};

// Rate type labels
const rateTypeLabels: Record<RateType, string> = {
  hourly: 'Hourly',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

// Stats component
async function PricingStats({ tenantId }: { tenantId: string }) {
  const supabase = await createClient();
  const stats = await getPricingStats(supabase, tenantId);
  const categoriesWithoutPricing = await getCategoriesWithoutPricing(supabase, tenantId);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{stats.totalRules}</p>
            <p className="text-sm text-muted-foreground">Total Rules</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{stats.activeRules}</p>
            <p className="text-sm text-muted-foreground">Active Rules</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Tag className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{stats.categoryRules}</p>
            <p className="text-sm text-muted-foreground">Category Rules</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 rounded-lg">
            <Car className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{stats.vehicleRules}</p>
            <p className="text-sm text-muted-foreground">Vehicle Rules</p>
          </div>
        </div>
      </div>

      {categoriesWithoutPricing.length > 0 && (
        <div className="col-span-2 lg:col-span-4 bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {categoriesWithoutPricing.length} {categoriesWithoutPricing.length === 1 ? 'category' : 'categories'} without pricing
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                Set up pricing rules for:{' '}
                {categoriesWithoutPricing.map((c, i) => (
                  <span key={c.id}>
                    {c.name.en || Object.values(c.name)[0]}
                    {i < categoriesWithoutPricing.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stats skeleton
function PricingStatsSkeleton() {
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

// Pricing rules table component
async function PricingRulesTable({
  locale,
  tenantId,
  statusFilter,
  rateTypeFilter,
  scopeFilter,
}: {
  locale: string;
  tenantId: string;
  statusFilter?: string;
  rateTypeFilter?: string;
  scopeFilter?: string;
}) {
  const supabase = await createClient();

  const { data: rules } = await listPricingRules(supabase, tenantId, {
    filters: {
      status: statusFilter as 'active' | 'inactive' | undefined,
      rateType: rateTypeFilter as RateType | undefined,
      scope: scopeFilter as 'category' | 'vehicle' | undefined,
    },
    sort: { field: 'rate_type', direction: 'asc' },
  });

  const labels = statusLabels[locale] || statusLabels.en;

  if (!rules || rules.length === 0) {
    return (
      <div className="text-center py-12">
        <DollarSign className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">
          {statusFilter || rateTypeFilter || scopeFilter
            ? 'No pricing rules match your filters.'
            : 'No pricing rules yet. Add your first pricing rule to set vehicle rates.'}
        </p>
        <Link href={`/${locale}/admin/pricing/new`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Pricing Rule
          </Button>
        </Link>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Table Header - Desktop */}
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
        <div className="col-span-3">Applied To</div>
        <div className="col-span-2">Rate Type</div>
        <div className="col-span-2">Amount</div>
        <div className="col-span-2">Duration</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border">
        {rules.map((rule) => {
          const Icon = rateTypeIcons[rule.rateType];
          const isCategory = !!rule.categoryId;
          const name = isCategory
            ? rule.category?.name[locale as keyof LocalizedString] || rule.category?.name.en || 'Unknown Category'
            : rule.vehicle
              ? `${rule.vehicle.make} ${rule.vehicle.model} (${rule.vehicle.year})`
              : 'Unknown Vehicle';

          return (
            <div
              key={rule.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 md:px-6 py-4 hover:bg-muted/30 transition-colors"
            >
              {/* Mobile: Primary Info */}
              <div className="md:col-span-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  {isCategory ? (
                    <Tag className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Car className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/${locale}/admin/pricing/${rule.id}/edit`}
                    className="font-medium text-foreground hover:text-primary transition-colors block truncate"
                  >
                    {name}
                  </Link>
                  <p className="text-sm text-muted-foreground md:hidden">
                    {rateTypeLabels[rule.rateType]} • {formatCurrency(rule.amount, rule.currency)}
                  </p>
                </div>
              </div>

              {/* Rate Type - Desktop */}
              <div className="hidden md:flex md:col-span-2 md:items-center gap-2">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{rateTypeLabels[rule.rateType]}</span>
              </div>

              {/* Amount - Desktop */}
              <div className="hidden md:flex md:col-span-2 md:items-center">
                <span className="text-sm font-medium">
                  {formatCurrency(rule.amount, rule.currency)}
                </span>
              </div>

              {/* Duration - Desktop */}
              <div className="hidden md:flex md:col-span-2 md:items-center">
                <span className="text-sm text-muted-foreground">
                  {rule.minDuration || rule.maxDuration
                    ? `${rule.minDuration || '1'}–${rule.maxDuration || '∞'} ${rule.rateType === 'hourly' ? 'hrs' : 'days'}`
                    : 'Any duration'}
                </span>
              </div>

              {/* Status - Desktop */}
              <div className="hidden md:flex md:col-span-1 md:items-center">
                <Badge variant={statusVariants[rule.status]}>
                  {labels[rule.status]}
                </Badge>
              </div>

              {/* Mobile: Additional Info & Status */}
              <div className="md:hidden flex items-center gap-4 text-sm text-muted-foreground">
                <Badge variant={isCategory ? 'outline' : 'secondary'}>
                  {isCategory ? 'Category' : 'Vehicle'}
                </Badge>
                <Badge variant={statusVariants[rule.status]} className="ml-auto">
                  {labels[rule.status]}
                </Badge>
              </div>

              {/* Actions */}
              <div className="md:col-span-2 flex items-center md:justify-end gap-1 mt-2 md:mt-0">
                <Link href={`/${locale}/admin/pricing/${rule.id}/edit`} className="flex-1 md:flex-initial">
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
function PricingRulesTableSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border">
        <Skeleton className="h-4 w-24 col-span-3" />
        <Skeleton className="h-4 w-20 col-span-2" />
        <Skeleton className="h-4 w-16 col-span-2" />
        <Skeleton className="h-4 w-20 col-span-2" />
        <Skeleton className="h-4 w-16 col-span-1" />
        <Skeleton className="h-4 w-20 col-span-2 ml-auto" />
      </div>
      <div className="divide-y divide-border">
        {[1, 2, 3, 4, 5].map((i) => (
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
function PricingFilters({
  locale,
  currentStatus,
  currentRateType,
  currentScope,
}: {
  locale: string;
  currentStatus?: string;
  currentRateType?: string;
  currentScope?: string;
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

      {/* Rate type filter */}
      <select
        name="rateType"
        defaultValue={currentRateType || ''}
        className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        onChange={(e) => {
          const form = e.target.form;
          if (form) form.submit();
        }}
      >
        <option value="">All rate types</option>
        <option value="hourly">Hourly</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>

      {/* Scope filter */}
      <select
        name="scope"
        defaultValue={currentScope || ''}
        className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        onChange={(e) => {
          const form = e.target.form;
          if (form) form.submit();
        }}
      >
        <option value="">All scopes</option>
        <option value="category">Category rules</option>
        <option value="vehicle">Vehicle rules</option>
      </select>

      {/* Submit button (for mobile) */}
      <Button type="submit" variant="secondary" size="md" className="sm:hidden">
        <Search className="w-4 h-4 mr-2" />
        Apply Filters
      </Button>
    </form>
  );
}

export default async function PricingPage({ params, searchParams }: PricingPageProps) {
  const { locale } = await params;
  const { status, rateType, scope } = await searchParams;

  const supabase = await createClient();

  // Get current user's tenant
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <p className="text-muted-foreground">Please sign in to access pricing management.</p>
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
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Pricing Rules
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage base rates for categories and vehicles
          </p>
        </div>
        <Link href={`/${locale}/admin/pricing/new`}>
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Pricing Rule
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <Suspense fallback={<PricingStatsSkeleton />}>
        <PricingStats tenantId={profile.tenant_id} />
      </Suspense>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Link href={`/${locale}/admin/pricing/seasons`}>
          <Button variant="outline" className="w-full justify-start">
            <CalendarRange className="w-4 h-4 mr-2" />
            <span className="truncate">Seasons</span>
          </Button>
        </Link>
        <Link href={`/${locale}/admin/pricing/addons`}>
          <Button variant="outline" className="w-full justify-start">
            <Plus className="w-4 h-4 mr-2" />
            <span className="truncate">Add-ons</span>
          </Button>
        </Link>
        <Link href={`/${locale}/admin/pricing/coupons`}>
          <Button variant="outline" className="w-full justify-start">
            <Tag className="w-4 h-4 mr-2" />
            <span className="truncate">Coupons</span>
          </Button>
        </Link>
        <Link href={`/${locale}/admin/categories`}>
          <Button variant="outline" className="w-full justify-start">
            <Tag className="w-4 h-4 mr-2" />
            <span className="truncate">Categories</span>
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <PricingFilters
          locale={locale}
          currentStatus={status}
          currentRateType={rateType}
          currentScope={scope}
        />
      </div>

      {/* Pricing Rules Table */}
      <Suspense fallback={<PricingRulesTableSkeleton />}>
        <PricingRulesTable
          locale={locale}
          tenantId={profile.tenant_id}
          statusFilter={status}
          rateTypeFilter={rateType}
          scopeFilter={scope}
        />
      </Suspense>

      {/* Help text */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex gap-3">
          <DollarSign className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Pricing rules determine the base rates for your vehicles.
              You can set rates at the category level (applies to all vehicles in that category)
              or at the vehicle level (overrides category rates for specific vehicles).
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Priority:</strong> Vehicle-specific rates take priority over category rates.
              Use seasonal pricing to adjust rates during peak periods.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
