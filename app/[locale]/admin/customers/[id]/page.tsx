'use client';

import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Clock,
  ShoppingBag,
  CreditCard,
  AlertCircle,
  RefreshCw,
  UserCircle,
  TrendingUp,
  CheckCircle,
  XCircle,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Car,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, useTransition } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import type { UserStatus, BookingStatus } from '@/lib/supabase/types';

interface Customer {
  id: string;
  tenant_id: string | null;
  auth_id: string;
  email: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: UserStatus;
  profile: Record<string, unknown>;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

interface BookingSummary {
  id: string;
  reference: string;
  vehicleName: string;
  vehiclePhoto?: string;
  pickupBranch: string;
  returnBranch: string;
  pickupAt: string;
  returnAt: string;
  status: BookingStatus;
  total: number;
  currency: string;
  durationDays: number;
  isOneWay: boolean;
  createdAt: string;
}

interface BookingStats {
  total: number;
  completed: number;
  cancelled: number;
  upcoming: number;
  active: number;
  totalSpent: number;
}

interface CustomerResponse {
  customer: Customer;
  bookings: BookingSummary[];
  bookingsTotal: number;
  bookingsPage: number;
  bookingsLimit: number;
  bookingsTotalPages: number;
  bookingStats: BookingStats;
}

// Status configurations
const customerStatusColors: Record<UserStatus, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const bookingStatusConfig: Record<BookingStatus, { color: string; label: string }> = {
  pending: {
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    label: 'Pending',
  },
  confirmed: {
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    label: 'Confirmed',
  },
  active: {
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    label: 'Active',
  },
  completed: {
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    label: 'Completed',
  },
  cancelled: {
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    label: 'Cancelled',
  },
};

// Info row component
function InfoRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-3 py-3', className)}>
      <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground mt-0.5">{value || '—'}</p>
      </div>
    </div>
  );
}

// Stats card component
function StatCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const variantStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger: 'bg-red-500/10 text-red-600 dark:text-red-400',
  };

  return (
    <div className="bg-card rounded-lg border border-border p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={cn('p-1.5 rounded-md', variantStyles[variant])}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs text-muted-foreground">{title}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

// Booking row component
function BookingRow({
  booking,
  locale,
}: {
  booking: BookingSummary;
  locale: string;
}) {
  const statusConfig = bookingStatusConfig[booking.status];
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: booking.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Link
      href={`/${locale}/admin/bookings/${booking.id}`}
      className="block p-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-start gap-4">
        {/* Vehicle photo */}
        <div className="hidden sm:block w-16 h-12 rounded-md bg-muted overflow-hidden shrink-0">
          {booking.vehiclePhoto ? (
            <img
              src={booking.vehiclePhoto}
              alt={booking.vehicleName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Car className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Booking info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <p className="font-medium text-foreground truncate">
                {booking.vehicleName}
              </p>
              <p className="text-xs text-muted-foreground">{booking.reference}</p>
            </div>
            <Badge className={cn('text-xs shrink-0', statusConfig.color)}>
              {statusConfig.label}
            </Badge>
          </div>

          {/* Dates */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(booking.pickupAt)}</span>
            <ArrowRight className="w-3 h-3" />
            <span>{formatDate(booking.returnAt)}</span>
            <span className="text-xs ml-1">({booking.durationDays}d)</span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">
              {booking.pickupBranch}
              {booking.isOneWay && ` → ${booking.returnBranch}`}
            </span>
          </div>
        </div>

        {/* Price */}
        <div className="text-right shrink-0">
          <p className="font-semibold text-foreground">
            {formatCurrency(booking.total)}
          </p>
        </div>
      </div>
    </Link>
  );
}

// Mobile booking card
function MobileBookingCard({
  booking,
  locale,
}: {
  booking: BookingSummary;
  locale: string;
}) {
  const statusConfig = bookingStatusConfig[booking.status];
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: booking.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Link
      href={`/${locale}/admin/bookings/${booking.id}`}
      className="block p-4 border-b border-border last:border-0"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{booking.vehicleName}</p>
          <p className="text-xs text-muted-foreground">{booking.reference}</p>
        </div>
        <Badge className={cn('text-xs shrink-0', statusConfig.color)}>
          {statusConfig.label}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {formatDate(booking.pickupAt)} - {formatDate(booking.returnAt)}
        </span>
        <span className="font-semibold">{formatCurrency(booking.total)}</span>
      </div>
    </Link>
  );
}

// Loading skeleton
function CustomerDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

// Status filter tabs
function BookingStatusTabs({
  currentStatus,
  onStatusChange,
  stats,
}: {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  stats: BookingStats;
}) {
  const tabs = [
    { value: '', label: 'All', count: stats.total },
    { value: 'confirmed', label: 'Upcoming', count: stats.upcoming },
    { value: 'active', label: 'Active', count: stats.active },
    { value: 'completed', label: 'Completed', count: stats.completed },
    { value: 'cancelled', label: 'Cancelled', count: stats.cancelled },
  ];

  return (
    <div className="flex gap-1 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
      {tabs.map((tab) => (
        <Button
          key={tab.value}
          variant={currentStatus === tab.value ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onStatusChange(tab.value)}
          className="shrink-0 gap-1"
        >
          {tab.label}
          {tab.count > 0 && (
            <span className="text-xs opacity-70">({tab.count})</span>
          )}
        </Button>
      ))}
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const customerId = params.id as string;

  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<CustomerResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bookings filter state
  const bookingsPage = parseInt(searchParams.get('bookingsPage') || '1', 10);
  const bookingsStatus = searchParams.get('bookingsStatus') || '';

  // Fetch customer data
  const fetchCustomer = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('bookingsPage', bookingsPage.toString());
      params.set('bookingsLimit', '10');
      if (bookingsStatus) params.set('bookingsStatus', bookingsStatus);

      const response = await fetch(`/api/admin/customers/${customerId}?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch customer');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [customerId, bookingsPage, bookingsStatus]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  // Handle bookings status filter
  const handleStatusChange = (status: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (status) {
        params.set('bookingsStatus', status);
      } else {
        params.delete('bookingsStatus');
      }
      params.delete('bookingsPage');
      router.push(`?${params.toString()}`);
    });
  };

  // Handle bookings pagination
  const handlePageChange = (newPage: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('bookingsPage', newPage.toString());
      router.push(`?${params.toString()}`);
    });
  };

  const customer = data?.customer;
  const fullName = customer
    ? [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Unnamed Customer'
    : '';
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-foreground truncate">
            Customer Details
          </h1>
          <p className="text-sm text-muted-foreground">
            View customer information and booking history
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchCustomer}
          disabled={isLoading}
          className="shrink-0 gap-2"
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          <span className="hidden sm:inline">Refresh</span>
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
            onClick={fetchCustomer}
            className="ml-auto"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading */}
      {isLoading && !data && <CustomerDetailSkeleton />}

      {/* Customer content */}
      {data && customer && (
        <div className="space-y-6">
          {/* Customer header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar className="w-16 h-16">
              {customer.avatar_url ? (
                <img
                  src={customer.avatar_url}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-lg font-medium text-muted-foreground">
                  {initials || <UserCircle className="w-8 h-8" />}
                </div>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-semibold text-foreground">
                  {fullName}
                </h2>
                <Badge className={cn('text-xs', customerStatusColors[customer.status])}>
                  {customer.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Customer since{' '}
                {new Date(customer.created_at).toLocaleDateString(locale, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              title="Total Bookings"
              value={data.bookingStats.total}
              icon={ShoppingBag}
            />
            <StatCard
              title="Completed"
              value={data.bookingStats.completed}
              icon={CheckCircle}
              variant="success"
            />
            <StatCard
              title="Cancelled"
              value={data.bookingStats.cancelled}
              icon={XCircle}
              variant="danger"
            />
            <StatCard
              title="Total Spent"
              value={formatCurrency(data.bookingStats.totalSpent)}
              icon={CreditCard}
            />
          </div>

          {/* Contact information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <InfoRow
                icon={Mail}
                label="Email Address"
                value={customer.email}
              />
              <InfoRow
                icon={Phone}
                label="Phone Number"
                value={customer.phone}
              />
              <InfoRow
                icon={Calendar}
                label="Member Since"
                value={new Date(customer.created_at).toLocaleDateString(locale, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              />
              <InfoRow
                icon={Clock}
                label="Last Login"
                value={
                  customer.last_login_at
                    ? new Date(customer.last_login_at).toLocaleString(locale, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Never'
                }
              />
            </CardContent>
          </Card>

          {/* Booking history */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Booking History</CardTitle>
                <span className="text-sm text-muted-foreground">
                  {data.bookingsTotal} booking{data.bookingsTotal !== 1 ? 's' : ''}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {/* Status filter tabs */}
              <BookingStatusTabs
                currentStatus={bookingsStatus}
                onStatusChange={handleStatusChange}
                stats={data.bookingStats}
              />

              {/* Bookings list */}
              {data.bookings.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {bookingsStatus
                      ? 'No bookings match this filter'
                      : 'No bookings yet'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop list */}
                  <div className="hidden md:block mt-4 border border-border rounded-lg overflow-hidden">
                    {data.bookings.map((booking) => (
                      <BookingRow
                        key={booking.id}
                        booking={booking}
                        locale={locale}
                      />
                    ))}
                  </div>

                  {/* Mobile list */}
                  <div className="md:hidden mt-4 border border-border rounded-lg overflow-hidden">
                    {data.bookings.map((booking) => (
                      <MobileBookingCard
                        key={booking.id}
                        booking={booking}
                        locale={locale}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {data.bookingsTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(bookingsPage - 1)}
                        disabled={bookingsPage === 1 || isPending}
                        className="gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {data.bookingsPage} of {data.bookingsTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(bookingsPage + 1)}
                        disabled={bookingsPage === data.bookingsTotalPages || isPending}
                        className="gap-1"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
