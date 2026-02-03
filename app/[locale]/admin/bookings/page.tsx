'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  Plus,
  Calendar,
  MapPin,
  User,
  Car,
  Eye,
  ArrowRight,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DataTable,
  type ColumnDef,
  type SortState,
  ActionCell,
} from '@/components/admin/data-table';
import type { BookingStatus } from '@/lib/supabase/types';
import type { BookingSummary, BookingListResult } from '@/lib/booking/types';
import { BOOKING_STATUS_OPTIONS } from '@/lib/booking/types';

// Status badge variants mapping
const statusVariants: Record<BookingStatus, 'success' | 'warning' | 'destructive' | 'secondary' | 'default'> = {
  pending: 'warning',
  confirmed: 'default',
  active: 'success',
  completed: 'secondary',
  cancelled: 'destructive',
};

interface Branch {
  id: string;
  name: string;
  city: string;
}

// ============================================================================
// BOOKING STATS COMPONENT
// ============================================================================

function BookingStats({
  total,
  pending,
  confirmed,
  active,
  completed,
}: {
  total: number;
  pending: number;
  confirmed: number;
  active: number;
  completed: number;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      <div className="bg-card rounded-lg border border-border p-3">
        <p className="text-sm text-muted-foreground">Total</p>
        <p className="text-2xl font-bold">{total}</p>
      </div>
      <div className="bg-card rounded-lg border border-border p-3">
        <p className="text-sm text-muted-foreground">Pending</p>
        <p className="text-2xl font-bold text-yellow-600">{pending}</p>
      </div>
      <div className="bg-card rounded-lg border border-border p-3">
        <p className="text-sm text-muted-foreground">Confirmed</p>
        <p className="text-2xl font-bold text-blue-600">{confirmed}</p>
      </div>
      <div className="bg-card rounded-lg border border-border p-3">
        <p className="text-sm text-muted-foreground">Active</p>
        <p className="text-2xl font-bold text-green-600">{active}</p>
      </div>
      <div className="bg-card rounded-lg border border-border p-3 col-span-2 sm:col-span-1 lg:col-span-1">
        <p className="text-sm text-muted-foreground">Completed</p>
        <p className="text-2xl font-bold text-gray-600">{completed}</p>
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
    { value: '', label: 'All' },
    ...BOOKING_STATUS_OPTIONS.map((s) => ({
      value: s.value,
      label: s.label,
    })),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none mb-4">
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
  branches,
  currentBranch,
  currentDateFrom,
  currentDateTo,
  onFilterChange,
}: {
  branches: Branch[];
  currentBranch: string;
  currentDateFrom: string;
  currentDateTo: string;
  onFilterChange: (key: string, value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* Date From */}
      <div>
        <label className="text-sm font-medium text-muted-foreground mb-2 block">
          Pickup From
        </label>
        <Input
          type="date"
          value={currentDateFrom}
          onChange={(e) => onFilterChange('dateFrom', e.target.value)}
        />
      </div>

      {/* Date To */}
      <div>
        <label className="text-sm font-medium text-muted-foreground mb-2 block">
          Pickup To
        </label>
        <Input
          type="date"
          value={currentDateTo}
          onChange={(e) => onFilterChange('dateTo', e.target.value)}
        />
      </div>
    </div>
  );
}

// ============================================================================
// MOBILE BOOKING ROW
// ============================================================================

function MobileBookingRow({ row: booking, locale }: { row: BookingSummary; locale: string }) {
  const pickupDate = new Date(booking.pickupAt);
  const returnDate = new Date(booking.returnAt);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-3">
      {/* Header: Reference & Status */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={`/${locale}/admin/bookings/${booking.id}`}
            className="font-mono font-medium text-foreground hover:text-primary transition-colors"
          >
            {booking.reference}
          </Link>
          {booking.customerName && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <User className="w-3.5 h-3.5" />
              {booking.customerName}
            </p>
          )}
        </div>
        <Badge variant={statusVariants[booking.status]}>
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </Badge>
      </div>

      {/* Vehicle */}
      <div className="flex items-center gap-2 text-sm">
        <Car className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="truncate">{booking.vehicleName}</span>
      </div>

      {/* Dates & Location */}
      <div className="grid grid-cols-1 gap-2 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          <span>
            {formatDate(pickupDate)} {formatTime(pickupDate)} - {formatDate(returnDate)} {formatTime(returnDate)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="truncate">
            {booking.pickupBranch}
            {booking.isOneWay && (
              <>
                <ArrowRight className="w-3 h-3 inline mx-1" />
                {booking.returnBranch}
              </>
            )}
          </span>
        </div>
      </div>

      {/* Footer: Price & Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="font-semibold">
          {formatCurrency(booking.total, booking.currency)}
        </span>
        <Link href={`/${locale}/admin/bookings/${booking.id}`}>
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function AdminBookingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [locale, setLocale] = useState('en');
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    active: 0,
    completed: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalPages: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Get filter values from URL
  const statusFilter = searchParams.get('status') || '';
  const branchFilter = searchParams.get('branch') || '';
  const dateFromFilter = searchParams.get('dateFrom') || '';
  const dateToFilter = searchParams.get('dateTo') || '';
  const searchQuery = searchParams.get('search') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = searchParams.get('sortBy') || 'pickup_at';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  // Resolve params
  useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  // Define columns for DataTable
  const columns: ColumnDef<BookingSummary>[] = useMemo(() => [
    {
      id: 'reference',
      header: 'Reference',
      colSpan: 2,
      sortable: true,
      sortKey: 'reference',
      cell: ({ row }) => (
        <Link
          href={`/${locale}/admin/bookings/${row.id}`}
          className="font-mono font-medium text-foreground hover:text-primary transition-colors"
        >
          {row.reference}
        </Link>
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      colSpan: 2,
      hideOnMobile: true,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {row.customerName || '-'}
          </p>
          {row.customerEmail && (
            <p className="truncate text-xs text-muted-foreground">
              {row.customerEmail}
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'vehicle',
      header: 'Vehicle',
      colSpan: 2,
      hideOnMobile: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.vehiclePhoto ? (
            <div className="relative w-12 h-8 rounded overflow-hidden bg-muted shrink-0">
              <Image
                src={row.vehiclePhoto}
                alt={row.vehicleName}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
          ) : (
            <div className="w-12 h-8 rounded bg-muted flex items-center justify-center shrink-0">
              <Car className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <span className="text-sm truncate">{row.vehicleName}</span>
        </div>
      ),
    },
    {
      id: 'dates',
      header: 'Dates',
      colSpan: 2,
      sortable: true,
      sortKey: 'pickup_at',
      hideOnMobile: true,
      cell: ({ row }) => {
        const pickupDate = new Date(row.pickupAt);
        const returnDate = new Date(row.returnAt);
        const formatDate = (date: Date) => date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
        const formatTime = (date: Date) => date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
        return (
          <div className="text-sm">
            <div className="flex items-center gap-1.5">
              <span className="font-medium">{formatDate(pickupDate)}</span>
              <span className="text-muted-foreground">{formatTime(pickupDate)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>{formatDate(returnDate)}</span>
              <span>{formatTime(returnDate)}</span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'total',
      header: 'Total',
      colSpan: 1,
      sortable: true,
      sortKey: 'total_amount',
      hideOnMobile: true,
      cell: ({ row }) => {
        const formatted = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: row.currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(row.total);
        return <span className="font-medium">{formatted}</span>;
      },
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
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
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
          <Link href={`/${locale}/admin/bookings/${row.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="View">
              <Eye className="w-4 h-4" />
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

      // Fetch branches for filters
      const { data: branchesData } = await supabase
        .from('branches')
        .select('id, name, city')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('name');

      setBranches(branchesData || []);

      // Build query params for bookings API
      const queryParams = new URLSearchParams();
      if (statusFilter) queryParams.set('status', statusFilter);
      if (branchFilter) queryParams.set('branchId', branchFilter);
      if (dateFromFilter) queryParams.set('dateFrom', `${dateFromFilter}T00:00:00.000Z`);
      if (dateToFilter) queryParams.set('dateTo', `${dateToFilter}T23:59:59.999Z`);
      if (searchQuery) queryParams.set('search', searchQuery);
      queryParams.set('sortBy', sortBy);
      queryParams.set('sortOrder', sortOrder);
      queryParams.set('page', pageParam.toString());
      queryParams.set('pageSize', '20');

      // Fetch bookings via API
      const response = await fetch(`/api/admin/bookings?${queryParams.toString()}`);
      if (response.ok) {
        const data: BookingListResult = await response.json();
        setBookings(data.bookings);
        setPagination({
          page: data.page,
          pageSize: data.pageSize,
          totalPages: data.totalPages,
          total: data.total,
        });
      }

      // Fetch stats (all bookings, not filtered)
      const { data: allBookings } = await supabase
        .from('bookings')
        .select('status')
        .eq('tenant_id', tenantId);

      if (allBookings) {
        const bookingsList = allBookings as { status: string }[];
        setStats({
          total: bookingsList.length,
          pending: bookingsList.filter((b) => b.status === 'pending').length,
          confirmed: bookingsList.filter((b) => b.status === 'confirmed').length,
          active: bookingsList.filter((b) => b.status === 'active').length,
          completed: bookingsList.filter((b) => b.status === 'completed').length,
        });
      }

      setIsLoading(false);
    }

    fetchData();
  }, [statusFilter, branchFilter, dateFromFilter, dateToFilter, searchQuery, pageParam, sortBy, sortOrder]);

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

  const hasActiveFilters = statusFilter || branchFilter || dateFromFilter || dateToFilter || searchQuery;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage customer reservations
          </p>
        </div>
        <Link href={`/${locale}/admin/bookings/new`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Create Booking</span>
            <span className="sm:hidden">New</span>
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <BookingStats {...stats} />

      {/* Status Filter Chips */}
      <StatusFilterChips
        currentStatus={statusFilter}
        onStatusChange={(status) => handleFilterChange('status', status)}
      />

      {/* Data Table with integrated search, filters, and pagination */}
      <DataTable
        columns={columns}
        data={bookings}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        sortState={sortState}
        onSortChange={handleSortChange}
        pagination={pagination}
        onPageChange={handlePageChange}
        searchProps={{
          value: searchQuery,
          onChange: handleSearchChange,
          placeholder: 'Search by reference...',
        }}
        showFilterToggle
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        hasActiveFilters={!!hasActiveFilters}
        onClearFilters={handleClearFilters}
        filterSection={
          <ExpandedFilters
            branches={branches}
            currentBranch={branchFilter}
            currentDateFrom={dateFromFilter}
            currentDateTo={dateToFilter}
            onFilterChange={handleFilterChange}
          />
        }
        mobileRowRender={({ row }) => (
          <MobileBookingRow row={row} locale={locale} />
        )}
        emptyIcon={<Calendar className="w-6 h-6 text-muted-foreground" />}
        emptyTitle="No bookings found"
        emptyDescription="No bookings match your current filters."
        emptyAction={
          <Link href={`/${locale}/admin/bookings/new`}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Booking
            </Button>
          </Link>
        }
      />
    </div>
  );
}
