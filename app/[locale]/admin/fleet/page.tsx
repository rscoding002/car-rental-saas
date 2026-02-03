'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  Plus,
  Car,
  Edit,
  Users,
  Settings2,
  Fuel,
  MapPin,
  Eye,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DataTable,
  type ColumnDef,
  type SortState,
  ActionCell,
  PrimaryCell,
} from '@/components/admin/data-table';
import type { VehicleStatus, Transmission, FuelType } from '@/lib/supabase/types';
import type { VehicleWithRelations } from '@/lib/fleet/types';

// Status badge variants
const statusVariants: Record<VehicleStatus, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  available: 'success',
  rented: 'warning',
  maintenance: 'destructive',
  retired: 'secondary',
};

const statusLabels: Record<VehicleStatus, string> = {
  available: 'Available',
  rented: 'Rented',
  maintenance: 'Maintenance',
  retired: 'Retired',
};

const transmissionLabels: Record<Transmission, string> = {
  automatic: 'Auto',
  manual: 'Manual',
};

const fuelLabels: Record<FuelType, string> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  electric: 'Electric',
  hybrid: 'Hybrid',
  plugin_hybrid: 'Plug-in Hybrid',
};

interface Category {
  id: string;
  name: { en?: string; lt?: string; ru?: string };
  status: string;
}

interface Branch {
  id: string;
  name: string;
  city: string;
  status: string;
}

// ============================================================================
// FLEET STATS COMPONENT
// ============================================================================

function FleetStats({
  total,
  available,
  rented,
  maintenance,
}: {
  total: number;
  available: number;
  rented: number;
  maintenance: number;
}) {
  const utilizationRate = total > 0 ? Math.round((rented / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="bg-card rounded-lg border border-border p-3">
        <p className="text-sm text-muted-foreground">Total</p>
        <p className="text-2xl font-bold">{total}</p>
      </div>
      <div className="bg-card rounded-lg border border-border p-3">
        <p className="text-sm text-muted-foreground">Available</p>
        <p className="text-2xl font-bold text-green-600">{available}</p>
      </div>
      <div className="bg-card rounded-lg border border-border p-3">
        <p className="text-sm text-muted-foreground">Rented</p>
        <p className="text-2xl font-bold text-yellow-600">{rented}</p>
      </div>
      <div className="bg-card rounded-lg border border-border p-3">
        <p className="text-sm text-muted-foreground">Utilization</p>
        <p className="text-2xl font-bold">{utilizationRate}%</p>
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
  const statusFilters = [
    { value: '', label: 'All Status' },
    { value: 'available', label: 'Available' },
    { value: 'rented', label: 'Rented' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'retired', label: 'Retired' },
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
// EXPANDED FILTERS COMPONENT
// ============================================================================

function ExpandedFilters({
  categories,
  branches,
  currentCategory,
  currentBranch,
  onFilterChange,
  locale,
}: {
  categories: Category[];
  branches: Branch[];
  currentCategory: string;
  currentBranch: string;
  onFilterChange: (key: string, value: string) => void;
  locale: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Category Filter */}
      <div>
        <label className="text-sm font-medium text-muted-foreground mb-2 block">
          Category
        </label>
        <select
          value={currentCategory}
          onChange={(e) => onFilterChange('category', e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name[locale as keyof typeof cat.name] || cat.name.en || 'Unnamed'}
            </option>
          ))}
        </select>
      </div>

      {/* Branch Filter */}
      <div>
        <label className="text-sm font-medium text-muted-foreground mb-2 block">
          Branch
        </label>
        <select
          value={currentBranch}
          onChange={(e) => onFilterChange('branch', e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="">All Branches</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name} - {branch.city}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ============================================================================
// MOBILE VEHICLE ROW
// ============================================================================

function MobileVehicleRow({ row: vehicle, locale }: { row: VehicleWithRelations; locale: string }) {
  const primaryPhoto = vehicle.photos?.find((p) => p.isPrimary) || vehicle.photos?.[0];
  const photoUrl = primaryPhoto?.url;
  const categoryName = vehicle.category?.name?.[locale as 'en' | 'lt' | 'ru'] || vehicle.category?.name?.en || '';
  const branchName = vehicle.branch?.name || '';
  const branchCity = vehicle.branch?.city || '';

  return (
    <div className="flex items-start gap-3">
      {/* Photo */}
      <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={`${vehicle.make} ${vehicle.model}`}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Car className="w-6 h-6 text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <Link
          href={`/${locale}/admin/fleet/${vehicle.id}`}
          className="font-medium text-foreground hover:text-primary transition-colors block truncate"
        >
          {vehicle.year} {vehicle.make} {vehicle.model}
        </Link>
        <p className="text-sm text-muted-foreground truncate">
          {vehicle.license_plate}
        </p>

        <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
          {categoryName && (
            <Badge variant="outline" className="text-xs">
              {categoryName}
            </Badge>
          )}
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{branchName}, {branchCity}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {vehicle.seats}
            </span>
            <span className="flex items-center gap-1">
              <Settings2 className="w-3.5 h-3.5" />
              {transmissionLabels[vehicle.transmission]}
            </span>
            <span className="flex items-center gap-1">
              <Fuel className="w-3.5 h-3.5" />
              {fuelLabels[vehicle.fuel_type]}
            </span>
          </div>
          <div className="pt-1">
            <Badge variant={statusVariants[vehicle.status]}>
              {statusLabels[vehicle.status]}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center gap-2">
          <Link href={`/${locale}/admin/fleet/${vehicle.id}`}>
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              View
            </Button>
          </Link>
          <Link href={`/${locale}/admin/fleet/${vehicle.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function AdminFleetPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [locale, setLocale] = useState('en');
  const [vehicles, setVehicles] = useState<VehicleWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stats, setStats] = useState({ total: 0, available: 0, rented: 0, maintenance: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Get filter values from URL
  const statusFilter = searchParams.get('status') || '';
  const categoryFilter = searchParams.get('category') || '';
  const branchFilter = searchParams.get('branch') || '';
  const searchQuery = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  // Resolve params
  useEffect(() => {
    params.then(p => setLocale(p.locale));
  }, [params]);

  // Define columns for DataTable
  const columns: ColumnDef<VehicleWithRelations>[] = useMemo(() => [
    {
      id: 'vehicle',
      header: 'Vehicle',
      colSpan: 3,
      sortable: true,
      sortKey: 'make',
      cell: ({ row }) => {
        const primaryPhoto = row.photos?.find((p) => p.isPrimary) || row.photos?.[0];
        return (
          <PrimaryCell
            primary={
              <Link
                href={`/${locale}/admin/fleet/${row.id}`}
                className="hover:text-primary transition-colors"
              >
                {row.year} {row.make} {row.model}
              </Link>
            }
            secondary={row.license_plate}
            image={primaryPhoto?.url}
            imageAlt={`${row.make} ${row.model}`}
            imageFallback={<Car className="w-6 h-6 text-muted-foreground/50" />}
          />
        );
      },
    },
    {
      id: 'category',
      header: 'Category',
      colSpan: 2,
      hideOnMobile: true,
      cell: ({ row }) => {
        const categoryName = row.category?.name?.[locale as 'en' | 'lt' | 'ru'] || row.category?.name?.en || '';
        return categoryName ? (
          <Badge variant="outline">{categoryName}</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        );
      },
    },
    {
      id: 'branch',
      header: 'Branch',
      colSpan: 2,
      hideOnMobile: true,
      cell: ({ row }) => {
        const branchName = row.branch?.name || '';
        const branchCity = row.branch?.city || '';
        return (
          <div className="text-sm truncate">
            <span className="font-medium">{branchName}</span>
            {branchCity && (
              <span className="text-muted-foreground ml-1">({branchCity})</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'specs',
      header: 'Specs',
      colSpan: 2,
      hideOnMobile: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1" title="Seats">
            <Users className="w-3.5 h-3.5" />
            {row.seats}
          </span>
          <span className="flex items-center gap-1" title="Transmission">
            <Settings2 className="w-3.5 h-3.5" />
            {row.transmission === 'automatic' ? 'A' : 'M'}
          </span>
          <span className="flex items-center gap-1" title="Fuel">
            <Fuel className="w-3.5 h-3.5" />
            {row.fuel_type.slice(0, 1).toUpperCase()}
          </span>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      colSpan: 1,
      sortable: true,
      sortKey: 'status',
      hideOnMobile: true,
      cell: ({ row }) => (
        <Badge variant={statusVariants[row.status]}>
          {statusLabels[row.status]}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      colSpan: 2,
      align: 'right',
      hideOnMobile: true,
      cell: ({ row }) => (
        <ActionCell>
          <Link href={`/${locale}/admin/fleet/${row.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="View">
              <Eye className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={`/${locale}/admin/fleet/${row.id}/edit`}>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit">
              <Edit className="w-4 h-4" />
            </Button>
          </Link>
        </ActionCell>
      ),
    },
  ], [locale]);

  // Sort state
  const sortState: SortState = {
    column: sortBy,
    direction: sortOrder,
  };

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const supabase = createClient();

      // Get current user's tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_id', user.id)
        .single();

      const tenantId = (profile as { tenant_id: string } | null)?.tenant_id;
      if (!tenantId) return;

      // Fetch categories and branches for filters
      const [categoriesResult, branchesResult] = await Promise.all([
        supabase
          .from('vehicle_categories')
          .select('id, name, status')
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
          .order('sort_order'),
        supabase
          .from('branches')
          .select('id, name, city, status')
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
          .order('name'),
      ]);

      setCategories(categoriesResult.data || []);
      setBranches(branchesResult.data || []);

      // Build vehicle query
      let query = supabase
        .from('vehicles')
        .select(`
          *,
          category:vehicle_categories(id, name, description, icon, image_url),
          branch:branches(id, name, city)
        `)
        .eq('tenant_id', tenantId)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply filters
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      if (categoryFilter) {
        query = query.eq('category_id', categoryFilter);
      }

      if (branchFilter) {
        query = query.eq('branch_id', branchFilter);
      }

      if (searchQuery) {
        query = query.or(
          `make.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%,license_plate.ilike.%${searchQuery}%`
        );
      }

      const { data: vehiclesData } = await query;
      setVehicles((vehiclesData as unknown as VehicleWithRelations[]) || []);

      // Calculate stats (from all vehicles, not filtered)
      const { data: allVehicles } = await supabase
        .from('vehicles')
        .select('status')
        .eq('tenant_id', tenantId)
        .neq('status', 'retired');

      if (allVehicles) {
        const vehiclesList = allVehicles as { status: string }[];
        setStats({
          total: vehiclesList.length,
          available: vehiclesList.filter(v => v.status === 'available').length,
          rented: vehiclesList.filter(v => v.status === 'rented').length,
          maintenance: vehiclesList.filter(v => v.status === 'maintenance').length,
        });
      }

      setIsLoading(false);
    }

    fetchData();
  }, [statusFilter, categoryFilter, branchFilter, searchQuery, sortBy, sortOrder]);

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
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
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleClearFilters = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters = statusFilter || categoryFilter || branchFilter || searchQuery;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fleet</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your vehicle inventory
          </p>
        </div>
        <Link href={`/${locale}/admin/fleet/new`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Vehicle
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <FleetStats {...stats} />

      {/* Status Filter Chips */}
      <StatusFilterChips
        currentStatus={statusFilter}
        onStatusChange={(status) => handleFilterChange('status', status)}
      />

      {/* Data Table with integrated search, filters */}
      <DataTable
        columns={columns}
        data={vehicles}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        sortState={sortState}
        onSortChange={handleSortChange}
        searchProps={{
          value: searchQuery,
          onChange: handleSearchChange,
          placeholder: 'Search vehicles...',
        }}
        showFilterToggle
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        hasActiveFilters={!!hasActiveFilters}
        onClearFilters={handleClearFilters}
        filterSection={
          <ExpandedFilters
            categories={categories}
            branches={branches}
            currentCategory={categoryFilter}
            currentBranch={branchFilter}
            onFilterChange={handleFilterChange}
            locale={locale}
          />
        }
        mobileRowRender={({ row }) => (
          <MobileVehicleRow row={row} locale={locale} />
        )}
        emptyIcon={<Car className="w-6 h-6 text-muted-foreground" />}
        emptyTitle="No vehicles found"
        emptyDescription="No vehicles match your current filters."
        emptyAction={
          <Link href={`/${locale}/admin/fleet/new`}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Vehicle
            </Button>
          </Link>
        }
      />

      {/* Results count */}
      {!isLoading && vehicles.length > 0 && (
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Showing {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
