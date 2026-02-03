import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Building2, Edit, MapPin, Phone, Mail, Clock } from 'lucide-react';
import type { Branch, BranchStatus } from '@/lib/supabase/types';

interface BranchesPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; search?: string }>;
}

// Status badge variant mapping
const statusVariants: Record<BranchStatus, 'success' | 'secondary'> = {
  active: 'success',
  inactive: 'secondary',
};

const statusLabels: Record<string, Record<BranchStatus, string>> = {
  en: { active: 'Active', inactive: 'Inactive' },
  lt: { active: 'Aktyvus', inactive: 'Neaktyvus' },
  ru: { active: 'Активный', inactive: 'Неактивный' },
};

// Format operating hours for display
function formatTodayHours(operatingHours: Branch['operating_hours']): string {
  if (!operatingHours) return 'N/A';

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const today = days[new Date().getDay()];
  const todayHours = operatingHours[today];

  if (!todayHours) return 'Closed';
  return `${todayHours.open} - ${todayHours.close}`;
}

// Branches table component
async function BranchesTable({ locale, statusFilter, searchQuery }: {
  locale: string;
  statusFilter?: string;
  searchQuery?: string;
}) {
  const supabase = await createClient();

  // Get current user's tenant
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_id', user.id)
    .single() as { data: { tenant_id: string } | null };

  if (!profile?.tenant_id) return null;

  // Fetch branches
  let query = supabase
    .from('branches')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (statusFilter && ['active', 'inactive'].includes(statusFilter)) {
    query = query.eq('status', statusFilter);
  }

  if (searchQuery) {
    query = query.or(
      `name.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`
    );
  }

  const { data: branches, error } = await query;

  if (error) {
    console.error('Error fetching branches:', error);
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load branches. Please try again.
      </div>
    );
  }

  const labels = statusLabels[locale] || statusLabels.en;

  if (!branches || branches.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">
          {statusFilter || searchQuery
            ? 'No branches match your filters.'
            : 'No branches yet. Add your first branch to get started.'}
        </p>
        <Link href={`/${locale}/admin/branches/new`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Branch
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Table Header - Desktop */}
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
        <div className="col-span-3">Name</div>
        <div className="col-span-2">City</div>
        <div className="col-span-3">Address</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border">
        {branches.map((branch: Branch) => (
          <div
            key={branch.id}
            className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 md:px-6 py-4 hover:bg-muted/30 transition-colors"
          >
            {/* Name & Mobile Info */}
            <div className="md:col-span-3">
              <Link
                href={`/${locale}/admin/branches/${branch.id}/edit`}
                className="font-medium text-foreground hover:text-primary transition-colors"
              >
                {branch.name}
              </Link>

              {/* Mobile: Show all info stacked */}
              <div className="md:hidden mt-2 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>{branch.city}, {branch.address}</span>
                </div>
                {branch.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>{branch.phone}</span>
                  </div>
                )}
                {branch.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span>{branch.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Today: {formatTodayHours(branch.operating_hours)}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant={statusVariants[branch.status]}>
                    {labels[branch.status]}
                  </Badge>
                </div>
              </div>

              {/* Mobile: Actions */}
              <div className="md:hidden mt-3 flex items-center gap-2">
                <Link href={`/${locale}/admin/branches/${branch.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              </div>
            </div>

            {/* City - Desktop */}
            <div className="hidden md:flex md:col-span-2 md:items-center text-sm">
              {branch.city}
            </div>

            {/* Address - Desktop */}
            <div className="hidden md:flex md:col-span-3 md:items-center text-sm text-muted-foreground">
              <span className="truncate" title={branch.address}>
                {branch.address}
              </span>
            </div>

            {/* Status - Desktop */}
            <div className="hidden md:flex md:col-span-2 md:items-center">
              <Badge variant={statusVariants[branch.status]}>
                {labels[branch.status]}
              </Badge>
            </div>

            {/* Actions - Desktop */}
            <div className="hidden md:flex md:col-span-2 md:items-center md:justify-end gap-1">
              <Link href={`/${locale}/admin/branches/${branch.id}/edit`}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Edit className="w-4 h-4" />
                  <span className="sr-only">Edit</span>
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Loading skeleton
function BranchesTableSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Header skeleton - Desktop */}
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border">
        <div className="col-span-3"><Skeleton className="h-4 w-16" /></div>
        <div className="col-span-2"><Skeleton className="h-4 w-12" /></div>
        <div className="col-span-3"><Skeleton className="h-4 w-16" /></div>
        <div className="col-span-2"><Skeleton className="h-4 w-14" /></div>
        <div className="col-span-2"></div>
      </div>

      {/* Rows skeleton */}
      <div className="divide-y divide-border">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 md:px-6 py-4">
            {/* Mobile skeleton */}
            <div className="md:hidden space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>

            {/* Desktop skeleton */}
            <div className="hidden md:grid md:grid-cols-12 gap-4">
              <div className="col-span-3"><Skeleton className="h-5 w-32" /></div>
              <div className="col-span-2"><Skeleton className="h-4 w-20" /></div>
              <div className="col-span-3"><Skeleton className="h-4 w-40" /></div>
              <div className="col-span-2"><Skeleton className="h-6 w-16 rounded-full" /></div>
              <div className="col-span-2 flex justify-end">
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function AdminBranchesPage({ params, searchParams }: BranchesPageProps) {
  const { locale } = await params;
  const { status, search } = await searchParams;
  const t = await getTranslations('admin');

  const filters = [
    { value: '', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Branches</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your rental locations
          </p>
        </div>
        <Link href={`/${locale}/admin/branches/new`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Branch
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {filters.map((filter) => (
          <Link
            key={filter.value}
            href={
              filter.value
                ? `/${locale}/admin/branches?status=${filter.value}${search ? `&search=${search}` : ''}`
                : `/${locale}/admin/branches${search ? `?search=${search}` : ''}`
            }
          >
            <Button
              variant={status === filter.value || (!status && !filter.value) ? 'secondary' : 'ghost'}
              size="sm"
            >
              {filter.label}
            </Button>
          </Link>
        ))}
      </div>

      {/* Branches Table */}
      <Suspense fallback={<BranchesTableSkeleton />}>
        <BranchesTable locale={locale} statusFilter={status} searchQuery={search} />
      </Suspense>
    </div>
  );
}
