import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Folder,
  Edit,
  Car,
  ArrowUpDown,
  Search,
  Image as ImageIcon,
} from 'lucide-react';
import type { VehicleCategory } from '@/lib/fleet/types';

interface CategoriesPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; search?: string }>;
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

// Categories table component
async function CategoriesTable({
  locale,
  statusFilter,
  searchQuery
}: {
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

  // Fetch categories
  let query = supabase
    .from('vehicle_categories')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (statusFilter && ['active', 'inactive'].includes(statusFilter)) {
    query = query.eq('status', statusFilter);
  }

  if (searchQuery) {
    query = query.or(
      `name->>en.ilike.%${searchQuery}%,name->>lt.ilike.%${searchQuery}%,name->>ru.ilike.%${searchQuery}%`
    );
  }

  const { data: categories, error } = await query;

  if (error) {
    console.error('Error fetching categories:', error);
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load categories. Please try again.
      </div>
    );
  }

  // Get vehicle counts per category
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('category_id')
    .eq('tenant_id', profile.tenant_id)
    .neq('status', 'retired') as { data: { category_id: string }[] | null };

  const countMap: Record<string, number> = {};
  for (const v of vehicles || []) {
    countMap[v.category_id] = (countMap[v.category_id] || 0) + 1;
  }

  const labels = statusLabels[locale] || statusLabels.en;

  if (!categories || categories.length === 0) {
    return (
      <div className="text-center py-12">
        <Folder className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">
          {statusFilter || searchQuery
            ? 'No categories match your filters.'
            : 'No categories yet. Add your first category to organize your fleet.'}
        </p>
        <Link href={`/${locale}/admin/categories/new`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Table Header - Desktop */}
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
        <div className="col-span-1">Order</div>
        <div className="col-span-3">Name</div>
        <div className="col-span-3">Description</div>
        <div className="col-span-2">Vehicles</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border">
        {(categories as VehicleCategory[]).map((category, index) => {
          const name = category.name[locale as keyof typeof category.name] || category.name.en || 'Unnamed';
          const description = category.description?.[locale as keyof typeof category.description] || category.description?.en || '';
          const vehicleCount = countMap[category.id] || 0;

          return (
            <div
              key={category.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 md:px-6 py-4 hover:bg-muted/30 transition-colors"
            >
              {/* Order & Name - Mobile first cell */}
              <div className="md:col-span-1 flex items-center">
                <div className="flex md:hidden items-center gap-3 w-full">
                  {/* Mobile: Image/Icon */}
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt={name}
                        className="w-full h-full object-cover"
                      />
                    ) : category.icon ? (
                      <span className="text-2xl">{category.icon}</span>
                    ) : (
                      <Folder className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/${locale}/admin/categories/${category.id}/edit`}
                      className="font-medium text-foreground hover:text-primary transition-colors block truncate"
                    >
                      {name}
                    </Link>
                    <p className="text-sm text-muted-foreground truncate">
                      {description || 'No description'}
                    </p>
                  </div>
                </div>
                {/* Desktop: Order number */}
                <div className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                  {index + 1}
                </div>
              </div>

              {/* Name - Desktop */}
              <div className="hidden md:flex md:col-span-3 md:items-center gap-3">
                {/* Image/Icon */}
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  ) : category.icon ? (
                    <span className="text-xl">{category.icon}</span>
                  ) : (
                    <Folder className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <Link
                  href={`/${locale}/admin/categories/${category.id}/edit`}
                  className="font-medium text-foreground hover:text-primary transition-colors truncate"
                >
                  {name}
                </Link>
              </div>

              {/* Description - Desktop */}
              <div className="hidden md:flex md:col-span-3 md:items-center">
                <span className="text-sm text-muted-foreground truncate">
                  {description || '-'}
                </span>
              </div>

              {/* Vehicles Count */}
              <div className="hidden md:flex md:col-span-2 md:items-center gap-2">
                <Car className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {vehicleCount} vehicle{vehicleCount !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Status - Desktop */}
              <div className="hidden md:flex md:col-span-1 md:items-center">
                <Badge variant={statusVariants[category.status]}>
                  {labels[category.status]}
                </Badge>
              </div>

              {/* Mobile: Additional Info */}
              <div className="md:hidden flex items-center gap-4 text-sm text-muted-foreground pl-15">
                <div className="flex items-center gap-1.5">
                  <Car className="w-4 h-4" />
                  <span>{vehicleCount} vehicles</span>
                </div>
                <Badge variant={statusVariants[category.status]} className="ml-auto">
                  {labels[category.status]}
                </Badge>
              </div>

              {/* Actions */}
              <div className="md:col-span-2 flex items-center md:justify-end gap-1 mt-2 md:mt-0">
                <Link href={`/${locale}/admin/categories/${category.id}/edit`} className="flex-1 md:flex-initial">
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
function CategoriesTableSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border">
        <Skeleton className="h-4 w-12 col-span-1" />
        <Skeleton className="h-4 w-24 col-span-3" />
        <Skeleton className="h-4 w-32 col-span-3" />
        <Skeleton className="h-4 w-20 col-span-2" />
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
function CategoryFilters({
  locale,
  currentStatus,
  currentSearch
}: {
  locale: string;
  currentStatus?: string;
  currentSearch?: string;
}) {
  return (
    <form className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          name="search"
          placeholder="Search categories..."
          defaultValue={currentSearch}
          className="pl-9"
        />
      </div>

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

      {/* Submit button (for search) */}
      <Button type="submit" variant="secondary" size="md">
        <Search className="w-4 h-4 mr-2" />
        Search
      </Button>
    </form>
  );
}

export default async function CategoriesPage({ params, searchParams }: CategoriesPageProps) {
  const { locale } = await params;
  const { status, search } = await searchParams;
  const t = await getTranslations('admin.categories');

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Vehicle Categories
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize your fleet by creating vehicle categories
          </p>
        </div>
        <Link href={`/${locale}/admin/categories/new`}>
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <CategoryFilters
          locale={locale}
          currentStatus={status}
          currentSearch={search}
        />
      </div>

      {/* Categories Table */}
      <Suspense fallback={<CategoriesTableSkeleton />}>
        <CategoriesTable
          locale={locale}
          statusFilter={status}
          searchQuery={search}
        />
      </Suspense>

      {/* Help text */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex gap-3">
          <ArrowUpDown className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Categories help organize your vehicles by type (e.g., Economy, SUV, Luxury).
              The sort order determines how categories appear in the booking interface.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
