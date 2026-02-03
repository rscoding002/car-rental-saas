import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Package,
  Edit,
  ArrowLeft,
  Calendar,
  Receipt,
  Zap,
} from 'lucide-react';
import { listAddons, getAddonStats, getLocalizedAddonName } from '@/lib/pricing/addon-queries';
import type { AddonData, RuleStatus, PriceType } from '@/lib/pricing/types';

interface AddonsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    status?: string;
    priceType?: string;
  }>;
}

// Status badge variants
const statusVariants: Record<RuleStatus, 'success' | 'secondary'> = {
  active: 'success',
  inactive: 'secondary',
};

const statusLabels: Record<string, Record<RuleStatus, string>> = {
  en: { active: 'Active', inactive: 'Inactive' },
  lt: { active: 'Aktyvus', inactive: 'Neaktyvus' },
  ru: { active: 'Активный', inactive: 'Неактивный' },
};

// Price type labels
const priceTypeLabels: Record<PriceType, string> = {
  per_day: 'Per Day',
  per_rental: 'Per Rental',
  one_time: 'One-Time',
};

const priceTypeIcons: Record<PriceType, typeof Calendar> = {
  per_day: Calendar,
  per_rental: Receipt,
  one_time: Zap,
};

// Format price
function formatPrice(price: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

// Stats component
async function AddonStats({ tenantId }: { tenantId: string }) {
  const supabase = await createClient();
  const stats = await getAddonStats(supabase, tenantId);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{stats.totalAddons}</p>
            <p className="text-sm text-muted-foreground">Total Add-ons</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Package className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{stats.activeAddons}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{stats.byPriceType.per_day}</p>
            <p className="text-sm text-muted-foreground">Per-Day</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 rounded-lg">
            <Receipt className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-semibold">
              {formatPrice(stats.averagePrice)}
            </p>
            <p className="text-sm text-muted-foreground">Avg Price</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stats skeleton
function AddonStatsSkeleton() {
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

// Addons table component
async function AddonsTable({
  locale,
  tenantId,
  statusFilter,
  priceTypeFilter,
}: {
  locale: string;
  tenantId: string;
  statusFilter?: string;
  priceTypeFilter?: string;
}) {
  const supabase = await createClient();

  const { data: addons } = await listAddons(supabase, tenantId, {
    filters: {
      status: statusFilter as RuleStatus | undefined,
      priceType: priceTypeFilter as PriceType | undefined,
    },
    sort: { field: 'sort_order', direction: 'asc' },
  });

  const labels = statusLabels[locale] || statusLabels.en;

  if (!addons || addons.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">
          {statusFilter || priceTypeFilter
            ? 'No add-ons match your filter.'
            : 'No add-ons yet. Add your first rental extra.'}
        </p>
        <Link href={`/${locale}/admin/pricing/addons/new`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Add-on
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Table Header - Desktop */}
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
        <div className="col-span-4">Add-on</div>
        <div className="col-span-2">Price</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-1">Max Qty</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border">
        {addons.map((addon) => {
          const PriceIcon = priceTypeIcons[addon.priceType];

          return (
            <div
              key={addon.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 md:px-6 py-4 hover:bg-muted/30 transition-colors"
            >
              {/* Mobile & Desktop: Name */}
              <div className="md:col-span-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  {addon.imageUrl ? (
                    <img
                      src={addon.imageUrl}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <Package className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/${locale}/admin/pricing/addons/${addon.id}/edit`}
                    className="font-medium text-foreground hover:text-primary transition-colors block truncate"
                  >
                    {getLocalizedAddonName(addon, locale)}
                  </Link>
                  <p className="text-sm text-muted-foreground md:hidden">
                    {formatPrice(addon.price)} {priceTypeLabels[addon.priceType].toLowerCase()}
                  </p>
                </div>
              </div>

              {/* Price - Desktop */}
              <div className="hidden md:flex md:col-span-2 md:items-center">
                <span className="font-medium">{formatPrice(addon.price)}</span>
              </div>

              {/* Price Type - Desktop */}
              <div className="hidden md:flex md:col-span-2 md:items-center gap-2">
                <PriceIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{priceTypeLabels[addon.priceType]}</span>
              </div>

              {/* Max Quantity - Desktop */}
              <div className="hidden md:flex md:col-span-1 md:items-center">
                <span className="text-sm text-muted-foreground">{addon.maxQuantity}</span>
              </div>

              {/* Status - Desktop */}
              <div className="hidden md:flex md:col-span-1 md:items-center">
                <Badge variant={statusVariants[addon.status]}>
                  {labels[addon.status]}
                </Badge>
              </div>

              {/* Mobile: Additional Info */}
              <div className="md:hidden flex items-center gap-3 text-sm text-muted-foreground">
                <Badge variant={statusVariants[addon.status]}>
                  {labels[addon.status]}
                </Badge>
                <span className="flex items-center gap-1">
                  <PriceIcon className="w-3 h-3" />
                  {priceTypeLabels[addon.priceType]}
                </span>
                <span>Max: {addon.maxQuantity}</span>
              </div>

              {/* Actions */}
              <div className="md:col-span-2 flex items-center md:justify-end gap-1 mt-2 md:mt-0">
                <Link href={`/${locale}/admin/pricing/addons/${addon.id}/edit`} className="flex-1 md:flex-initial">
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
function AddonsTableSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border">
        <Skeleton className="h-4 w-16 col-span-4" />
        <Skeleton className="h-4 w-12 col-span-2" />
        <Skeleton className="h-4 w-16 col-span-2" />
        <Skeleton className="h-4 w-12 col-span-1" />
        <Skeleton className="h-4 w-12 col-span-1" />
        <Skeleton className="h-4 w-16 col-span-2 ml-auto" />
      </div>
      <div className="divide-y divide-border">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="px-4 md:px-6 py-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24 md:hidden" />
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
function AddonFilters({
  locale,
  currentStatus,
  currentPriceType,
}: {
  locale: string;
  currentStatus?: string;
  currentPriceType?: string;
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

      {/* Price type filter */}
      <select
        name="priceType"
        defaultValue={currentPriceType || ''}
        className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        onChange={(e) => {
          const form = e.target.form;
          if (form) form.submit();
        }}
      >
        <option value="">All price types</option>
        <option value="per_day">Per Day</option>
        <option value="per_rental">Per Rental</option>
        <option value="one_time">One-Time</option>
      </select>
    </form>
  );
}

export default async function AddonsPage({ params, searchParams }: AddonsPageProps) {
  const { locale } = await params;
  const { status, priceType } = await searchParams;

  const supabase = await createClient();

  // Get current user's tenant
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <p className="text-muted-foreground">Please sign in to access add-ons management.</p>
      </div>
    );
  }

  const { data: profile } = (await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_id', user.id)
    .single()) as { data: { tenant_id: string } | null };

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
            <h1 className="text-2xl font-semibold text-foreground">Add-ons</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage rental extras like GPS, child seats, and insurance
            </p>
          </div>
        </div>
        <Link href={`/${locale}/admin/pricing/addons/new`}>
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Add-on
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <Suspense fallback={<AddonStatsSkeleton />}>
        <AddonStats tenantId={profile.tenant_id} />
      </Suspense>

      {/* Filters */}
      <div className="mb-6">
        <AddonFilters
          locale={locale}
          currentStatus={status}
          currentPriceType={priceType}
        />
      </div>

      {/* Addons Table */}
      <Suspense fallback={<AddonsTableSkeleton />}>
        <AddonsTable
          locale={locale}
          tenantId={profile.tenant_id}
          statusFilter={status}
          priceTypeFilter={priceType}
        />
      </Suspense>

      {/* Help text */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex gap-3">
          <Package className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Per Day:</strong> Price is multiplied by the number of rental days.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Per Rental / One-Time:</strong> Flat fee regardless of rental duration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
