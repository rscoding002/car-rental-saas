'use client';

import {
  Users,
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCog,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, useTransition } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { getRoleDisplayName, getRoleBadgeColor } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';

import type { UserRole, UserStatus } from '@/lib/supabase/types';

interface User {
  id: string;
  tenant_id: string | null;
  auth_id: string;
  email: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: UserStatus;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    total: number;
    byRole: {
      tenant_admin: number;
      tenant_manager: number;
      tenant_staff: number;
    };
    byStatus: {
      active: number;
      inactive: number;
      suspended: number;
    };
  };
}

// Stats card component
function StatsCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
}: {
  title: string;
  value: number;
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
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', variantStyles[variant])}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-xs text-muted-foreground">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// User row component
function UserRow({ user, locale }: { user: User; locale: string }) {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unnamed User';
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const statusColors: Record<UserStatus, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const roleIcons: Record<string, React.ElementType> = {
    tenant_admin: ShieldCheck,
    tenant_manager: Shield,
    tenant_staff: UserCog,
  };

  const RoleIcon = roleIcons[user.role] || Shield;

  return (
    <div className="flex items-center gap-4 p-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      {/* Avatar */}
      <Avatar
        src={user.avatar_url || undefined}
        fallback={initials}
        size="md"
      />

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground truncate">{fullName}</p>
          <Badge className={cn('text-xs', statusColors[user.status])}>
            {user.status}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1 truncate">
            <Mail className="w-3 h-3 shrink-0" />
            {user.email}
          </span>
          {user.phone && (
            <span className="hidden sm:flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {user.phone}
            </span>
          )}
        </div>
      </div>

      {/* Role badge */}
      <div className="hidden md:flex items-center gap-2">
        <RoleIcon className="w-4 h-4 text-muted-foreground" />
        <Badge className={cn('text-xs', getRoleBadgeColor(user.role))}>
          {getRoleDisplayName(user.role)}
        </Badge>
      </div>

      {/* Last login */}
      <div className="hidden lg:block text-sm text-muted-foreground w-32">
        {user.last_login_at ? (
          <span>
            {new Date(user.last_login_at).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-muted-foreground/50">Never</span>
        )}
      </div>

      {/* Actions */}
      <Link href={`/${locale}/admin/users/${user.id}`}>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </Link>
    </div>
  );
}

// Loading skeleton
function UsersListSkeleton() {
  return (
    <div className="space-y-0">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-border">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="hidden md:block h-6 w-20" />
          <Skeleton className="hidden lg:block h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      ))}
    </div>
  );
}

// Empty state
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="text-center py-12">
      <Users className="w-12 h-12 mx-auto text-muted-foreground/50" />
      <h3 className="mt-4 text-lg font-medium">No users found</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {hasFilters
          ? 'Try adjusting your search or filters'
          : 'Get started by inviting your first team member'}
      </p>
    </div>
  );
}

export default function UsersPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = params.locale as string;

  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<UsersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', page.toString());
      params.set('limit', '20');

      const response = await fetch(`/api/admin/users?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter, statusFilter, page]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (page > 1) params.set('page', page.toString());

    const queryString = params.toString();
    const newUrl = queryString
      ? `/${locale}/admin/users?${queryString}`
      : `/${locale}/admin/users`;

    startTransition(() => {
      router.replace(newUrl, { scroll: false });
    });
  }, [search, roleFilter, statusFilter, page, locale, router]);

  // Handle search
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // Check if any filters are active
  const hasFilters = !!(search || roleFilter || statusFilter);

  // Clear filters
  const clearFilters = () => {
    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
    setPage(1);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Team Members</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage staff users and their permissions
          </p>
        </div>
        <Link href={`/${locale}/admin/users/new`}>
          <Button className="w-full sm:w-auto gap-2">
            <Plus className="w-4 h-4" />
            Invite User
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
          <StatsCard
            title="Total Staff"
            value={data.stats.total}
            icon={Users}
          />
          <StatsCard
            title="Administrators"
            value={data.stats.byRole.tenant_admin}
            icon={ShieldCheck}
            variant="success"
          />
          <StatsCard
            title="Managers"
            value={data.stats.byRole.tenant_manager}
            icon={Shield}
            variant="warning"
          />
          <StatsCard
            title="Staff"
            value={data.stats.byRole.tenant_staff}
            icon={UserCog}
          />
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Role filter */}
            <Select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Roles' },
                { value: 'tenant_admin', label: 'Administrator' },
                { value: 'tenant_manager', label: 'Manager' },
                { value: 'tenant_staff', label: 'Staff' },
              ]}
              className="w-full sm:w-40"
            />

            {/* Status filter */}
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'suspended', label: 'Suspended' },
              ]}
              className="w-full sm:w-36"
            />

            {/* Clear filters */}
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                Clear
              </Button>
            )}

            {/* Refresh */}
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchUsers}
              disabled={isLoading}
              className="shrink-0"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Users list */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {data ? `${data.total} team member${data.total !== 1 ? 's' : ''}` : 'Users'}
            </CardTitle>
            {data && data.totalPages > 1 && (
              <span className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          {isLoading ? (
            <UsersListSkeleton />
          ) : data?.users.length === 0 ? (
            <EmptyState hasFilters={hasFilters} />
          ) : (
            <>
              {/* Mobile role badge row */}
              <div className="md:hidden px-4 pb-2 text-xs text-muted-foreground">
                Tap a user to view details
              </div>

              {data?.users.map((user) => (
                <UserRow key={user.id} user={user} locale={locale} />
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
              let pageNum: number;
              if (data.totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= data.totalPages - 2) {
                pageNum = data.totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  disabled={isLoading}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages || isLoading}
            className="gap-1"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
