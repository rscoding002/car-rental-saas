'use client';

import { useState, useEffect, useTransition, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname, useParams } from 'next/navigation';
import {
  Users,
  Phone,
  Calendar,
  Eye,
  UserCircle,
  ShoppingBag,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  DataTable,
  type ColumnDef,
  type SortState,
  type PaginationState,
  ActionCell,
  PrimaryCell,
} from '@/components/admin/data-table';
import type { UserStatus } from '@/lib/supabase/types';

// Customer type with booking stats
interface CustomerWithStats {
  id: string;
  auth_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: UserStatus;
  created_at: string;
  bookings_count: number;
  total_spent: number;
  last_booking_at: string | null;
}

interface CustomersResponse {
  customers: CustomerWithStats[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    total: number;
    active: number;
    inactive: number;
    newThisMonth: number;
  };
}

// Status badge variants
const statusVariants: Record<UserStatus, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  active: 'success',
  inactive: 'secondary',
  suspended: 'destructive',
};

const statusLabels: Record<UserStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
};

// ============================================================================
// CUSTOMER STATS COMPONENT
// ============================================================================

function CustomerStats({
  total,
  active,
  inactive,
  newThisMonth,
  isLoading,
}: {
  total: number;
  active: number;
  inactive: number;
  newThisMonth: number;
  isLoading?: boolean;
}) {
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
        <p className="text-sm text-muted-foreground">Total</p>
        <p className="text-2xl font-bold">{total}</p>
      </div>
      <div className="bg-card rounded-lg border border-border p-3">
        <p className="text-sm text-muted-foreground">Active</p>
        <p className="text-2xl font-bold text-green-600">{active}</p>
      </div>
      <div className="bg-card rounded-lg border border-border p-3">
        <p className="text-sm text-muted-foreground">Inactive</p>
        <p className="text-2xl font-bold text-gray-600">{inactive}</p>
      </div>
      <div className="bg-card rounded-lg border border-border p-3">
        <p className="text-sm text-muted-foreground">New This Month</p>
        <p className="text-2xl font-bold text-blue-600">{newThisMonth}</p>
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
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'suspended', label: 'Suspended' },
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
// MOBILE CUSTOMER ROW
// ============================================================================

function MobileCustomerRow({ row: customer, locale }: { row: CustomerWithStats; locale: string }) {
  const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'No name';
  const joinedDate = new Date(customer.created_at).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-3">
      {/* Header: Name & Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            {customer.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={customer.avatar_url} alt={fullName} className="object-cover" />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <UserCircle className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{fullName}</p>
            <p className="text-sm text-muted-foreground">{customer.email}</p>
          </div>
        </div>
        <Badge variant={statusVariants[customer.status]}>
          {statusLabels[customer.status]}
        </Badge>
      </div>

      {/* Contact & Stats */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {customer.phone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-4 h-4 shrink-0" />
            <span className="truncate">{customer.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4 shrink-0" />
          <span>Joined {joinedDate}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <ShoppingBag className="w-4 h-4 shrink-0" />
          <span>{customer.bookings_count} booking{customer.bookings_count !== 1 ? 's' : ''}</span>
        </div>
        <div className="font-medium">
          {formatCurrency(customer.total_spent)} spent
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Link href={`/${locale}/admin/customers/${customer.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function AdminCustomersPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const locale = params.locale as string;
  const [data, setData] = useState<CustomersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get filter values from URL
  const statusFilter = searchParams.get('status') || '';
  const searchQuery = searchParams.get('search') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  // Fetch customers from API
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', pageParam.toString());
      params.set('limit', '20');
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const response = await fetch(`/api/admin/customers?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch customers');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, pageParam, sortBy, sortOrder]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Define columns for DataTable
  const columns: ColumnDef<CustomerWithStats>[] = useMemo(() => [
    {
      id: 'customer',
      header: 'Customer',
      colSpan: 3,
      sortable: true,
      sortKey: 'first_name',
      cell: ({ row }) => {
        const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ') || 'No name';
        return (
          <PrimaryCell
            primary={
              <Link
                href={`/${locale}/admin/customers/${row.id}`}
                className="hover:text-primary transition-colors"
              >
                {fullName}
              </Link>
            }
            secondary={row.email}
            image={row.avatar_url}
            imageAlt={fullName}
            imageFallback={<UserCircle className="w-6 h-6 text-muted-foreground" />}
          />
        );
      },
    },
    {
      id: 'phone',
      header: 'Phone',
      colSpan: 2,
      hideOnMobile: true,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.phone || '—'}
        </span>
      ),
    },
    {
      id: 'bookings',
      header: 'Bookings',
      colSpan: 1,
      sortable: true,
      sortKey: 'bookings_count',
      align: 'center',
      hideOnMobile: true,
      cell: ({ row }) => (
        <span className="font-medium">{row.bookings_count}</span>
      ),
    },
    {
      id: 'total_spent',
      header: 'Total Spent',
      colSpan: 2,
      sortable: true,
      sortKey: 'total_spent',
      hideOnMobile: true,
      cell: ({ row }) => {
        const formatted = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(row.total_spent);
        return <span className="font-medium">{formatted}</span>;
      },
    },
    {
      id: 'joined',
      header: 'Joined',
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
      cell: ({ row }) => (
        <Badge variant={statusVariants[row.status]}>
          {statusLabels[row.status]}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      colSpan: 1,
      align: 'right',
      hideOnMobile: true,
      cell: ({ row }) => (
        <ActionCell>
          <Link href={`/${locale}/admin/customers/${row.id}`}>
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

  const hasActiveFilters = statusFilter || searchQuery;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage customer accounts
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchCustomers}
          disabled={isLoading}
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
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
            onClick={fetchCustomers}
            className="ml-auto"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Stats */}
      <CustomerStats
        total={data?.stats.total || 0}
        active={data?.stats.active || 0}
        inactive={data?.stats.inactive || 0}
        newThisMonth={data?.stats.newThisMonth || 0}
        isLoading={isLoading && !data}
      />

      {/* Status Filter Chips */}
      <StatusFilterChips
        currentStatus={statusFilter}
        onStatusChange={(status) => handleFilterChange('status', status)}
      />

      {/* Data Table with integrated search and pagination */}
      <DataTable
        columns={columns}
        data={data?.customers || []}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        sortState={sortState}
        onSortChange={handleSortChange}
        pagination={pagination}
        onPageChange={handlePageChange}
        searchProps={{
          value: searchQuery,
          onChange: handleSearchChange,
          placeholder: 'Search by name, email, or phone...',
        }}
        hasActiveFilters={!!hasActiveFilters}
        onClearFilters={handleClearFilters}
        mobileRowRender={({ row }) => (
          <MobileCustomerRow row={row} locale={locale} />
        )}
        emptyIcon={<Users className="w-6 h-6 text-muted-foreground" />}
        emptyTitle="No customers found"
        emptyDescription={
          hasActiveFilters
            ? 'No customers match your current filters. Try adjusting your search.'
            : 'Customers will appear here once they create accounts.'
        }
      />
    </div>
  );
}
