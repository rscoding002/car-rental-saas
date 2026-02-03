import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Ticket,
  Edit,
  ArrowLeft,
  Percent,
  DollarSign,
  Gift,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  listCoupons,
  getCouponStats,
  formatCouponDiscount,
  isCouponCurrentlyValid,
  getDaysUntilExpiry,
} from '@/lib/pricing/coupons';
import type { CouponData, CouponStatus, DiscountType } from '@/lib/pricing/types';

interface CouponsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    status?: string;
    discountType?: string;
  }>;
}

// Status badge variants
const statusVariants: Record<CouponStatus, 'success' | 'secondary' | 'destructive'> = {
  active: 'success',
  inactive: 'secondary',
  expired: 'destructive',
};

const statusLabels: Record<string, Record<CouponStatus, string>> = {
  en: { active: 'Active', inactive: 'Inactive', expired: 'Expired' },
  lt: { active: 'Aktyvus', inactive: 'Neaktyvus', expired: 'Pasibaigęs' },
  ru: { active: 'Активный', inactive: 'Неактивный', expired: 'Истёк' },
};

// Discount type labels and icons
const discountTypeLabels: Record<DiscountType, string> = {
  percentage: 'Percentage',
  fixed_amount: 'Fixed Amount',
  free_addon: 'Free Add-on',
};

const discountTypeIcons: Record<DiscountType, typeof Percent> = {
  percentage: Percent,
  fixed_amount: DollarSign,
  free_addon: Gift,
};

// Format date
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Stats component
async function CouponStats({ tenantId }: { tenantId: string }) {
  const supabase = await createClient();
  const stats = await getCouponStats(supabase, tenantId);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Ticket className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{stats.totalCoupons}</p>
            <p className="text-sm text-muted-foreground">Total Coupons</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Ticket className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{stats.activeCoupons}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{stats.totalUsage}</p>
            <p className="text-sm text-muted-foreground">Total Usage</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 rounded-lg">
            <Percent className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{stats.byDiscountType.percentage}</p>
            <p className="text-sm text-muted-foreground">Percentage</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stats skeleton
function CouponStatsSkeleton() {
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

// Coupons table component
async function CouponsTable({
  locale,
  tenantId,
  statusFilter,
  discountTypeFilter,
}: {
  locale: string;
  tenantId: string;
  statusFilter?: string;
  discountTypeFilter?: string;
}) {
  const supabase = await createClient();

  const { data: coupons } = await listCoupons(supabase, tenantId, {
    filters: {
      status: statusFilter as CouponStatus | undefined,
      discountType: discountTypeFilter as DiscountType | undefined,
    },
    sort: { field: 'created_at', direction: 'desc' },
  });

  const labels = statusLabels[locale] || statusLabels.en;

  if (!coupons || coupons.length === 0) {
    return (
      <div className="text-center py-12">
        <Ticket className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">
          {statusFilter || discountTypeFilter
            ? 'No coupons match your filter.'
            : 'No coupons yet. Create your first discount code.'}
        </p>
        <Link href={`/${locale}/admin/pricing/coupons/new`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Coupon
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Table Header - Desktop */}
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
        <div className="col-span-2">Code</div>
        <div className="col-span-2">Discount</div>
        <div className="col-span-3">Validity</div>
        <div className="col-span-2">Usage</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border">
        {coupons.map((coupon) => {
          const DiscountIcon = discountTypeIcons[coupon.discountType];
          const isValid = isCouponCurrentlyValid(coupon);
          const daysUntilExpiry = getDaysUntilExpiry(coupon);
          const isExpiringSoon = isValid && daysUntilExpiry <= 7 && daysUntilExpiry > 0;

          return (
            <div
              key={coupon.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 md:px-6 py-4 hover:bg-muted/30 transition-colors"
            >
              {/* Code */}
              <div className="md:col-span-2 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Ticket className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/${locale}/admin/pricing/coupons/${coupon.id}/edit`}
                    className="font-mono font-bold text-foreground hover:text-primary transition-colors block truncate"
                  >
                    {coupon.code}
                  </Link>
                  {coupon.description && (
                    <p className="text-sm text-muted-foreground truncate md:hidden">
                      {coupon.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Discount - Desktop */}
              <div className="hidden md:flex md:col-span-2 md:items-center gap-2">
                <DiscountIcon className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{formatCouponDiscount(coupon)}</span>
              </div>

              {/* Validity - Desktop */}
              <div className="hidden md:flex md:col-span-3 md:items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm">
                  {formatDate(coupon.validFrom)} - {formatDate(coupon.validUntil)}
                </span>
                {isExpiringSoon && (
                  <span className="text-xs text-orange-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {daysUntilExpiry}d
                  </span>
                )}
              </div>

              {/* Usage - Desktop */}
              <div className="hidden md:flex md:col-span-2 md:items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {coupon.usageCount}
                  {coupon.usageLimit !== null && ` / ${coupon.usageLimit}`}
                </span>
              </div>

              {/* Status - Desktop */}
              <div className="hidden md:flex md:col-span-1 md:items-center">
                <Badge variant={statusVariants[coupon.status]}>
                  {labels[coupon.status]}
                </Badge>
              </div>

              {/* Mobile: Additional Info */}
              <div className="md:hidden flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant={statusVariants[coupon.status]}>
                  {labels[coupon.status]}
                </Badge>
                <span className="flex items-center gap-1">
                  <DiscountIcon className="w-3 h-3" />
                  {formatCouponDiscount(coupon)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {coupon.usageCount}
                  {coupon.usageLimit !== null && `/${coupon.usageLimit}`}
                </span>
                {isExpiringSoon && (
                  <span className="text-orange-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {daysUntilExpiry}d left
                  </span>
                )}
              </div>

              {/* Mobile: Validity */}
              <div className="md:hidden text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(coupon.validFrom)} - {formatDate(coupon.validUntil)}
              </div>

              {/* Actions */}
              <div className="md:col-span-2 flex items-center md:justify-end gap-1 mt-2 md:mt-0">
                <Link href={`/${locale}/admin/pricing/coupons/${coupon.id}/edit`} className="flex-1 md:flex-initial">
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
function CouponsTableSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border">
        <Skeleton className="h-4 w-12 col-span-2" />
        <Skeleton className="h-4 w-16 col-span-2" />
        <Skeleton className="h-4 w-24 col-span-3" />
        <Skeleton className="h-4 w-12 col-span-2" />
        <Skeleton className="h-4 w-12 col-span-1" />
        <Skeleton className="h-4 w-16 col-span-2 ml-auto" />
      </div>
      <div className="divide-y divide-border">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="px-4 md:px-6 py-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32 md:hidden" />
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
function CouponFilters({
  locale,
  currentStatus,
  currentDiscountType,
}: {
  locale: string;
  currentStatus?: string;
  currentDiscountType?: string;
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
        <option value="expired">Expired</option>
      </select>

      {/* Discount type filter */}
      <select
        name="discountType"
        defaultValue={currentDiscountType || ''}
        className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        onChange={(e) => {
          const form = e.target.form;
          if (form) form.submit();
        }}
      >
        <option value="">All discount types</option>
        <option value="percentage">Percentage</option>
        <option value="fixed_amount">Fixed Amount</option>
        <option value="free_addon">Free Add-on</option>
      </select>
    </form>
  );
}

export default async function CouponsPage({ params, searchParams }: CouponsPageProps) {
  const { locale } = await params;
  const { status, discountType } = await searchParams;

  const supabase = await createClient();

  // Get current user's tenant
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <p className="text-muted-foreground">Please sign in to access coupons management.</p>
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
            <h1 className="text-2xl font-semibold text-foreground">Coupons</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage discount codes and promotional offers
            </p>
          </div>
        </div>
        <Link href={`/${locale}/admin/pricing/coupons/new`}>
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Create Coupon
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <Suspense fallback={<CouponStatsSkeleton />}>
        <CouponStats tenantId={profile.tenant_id} />
      </Suspense>

      {/* Filters */}
      <div className="mb-6">
        <CouponFilters
          locale={locale}
          currentStatus={status}
          currentDiscountType={discountType}
        />
      </div>

      {/* Coupons Table */}
      <Suspense fallback={<CouponsTableSkeleton />}>
        <CouponsTable
          locale={locale}
          tenantId={profile.tenant_id}
          statusFilter={status}
          discountTypeFilter={discountType}
        />
      </Suspense>

      {/* Help text */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Percentage:</strong> Discount a percentage of the order total (e.g., 10% off).
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Fixed Amount:</strong> Discount a fixed amount from the order (e.g., 50 EUR off).
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Free Add-on:</strong> Include a specific add-on for free with the booking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
