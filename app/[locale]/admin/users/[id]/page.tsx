'use client';

import {
  ArrowLeft,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  UserCog,
  Calendar,
  Clock,
  Edit,
  UserX,
  UserCheck,
  RefreshCw,
  AlertCircle,
  MoreHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useTransition } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
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

interface UserResponse {
  user: User;
  bookingStats: {
    createdBookings: number;
  } | null;
}

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

// Loading skeleton
function UserDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-4 h-4" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const userId = params.id as string;

  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch user
  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch user');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Fetch on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Handle status change
  const handleStatusChange = async (newStatus: UserStatus) => {
    setActionError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update status');
        }

        // Refresh user data
        fetchUser();
        setShowDeactivateModal(false);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'An error occurred');
      }
    });
  };

  // Handle deactivate
  const handleDeactivate = async () => {
    setActionError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to deactivate user');
        }

        // Refresh user data
        fetchUser();
        setShowDeactivateModal(false);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'An error occurred');
      }
    });
  };

  const user = data?.user;
  const fullName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unnamed User'
    : '';
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

  const RoleIcon = user ? (roleIcons[user.role] || Shield) : Shield;

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
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground truncate">
            User Details
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage user information
          </p>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchUser}
            className="ml-auto"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading */}
      {isLoading && <UserDetailSkeleton />}

      {/* User content */}
      {!isLoading && user && (
        <div className="space-y-6">
          {/* User header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar
              src={user.avatar_url || undefined}
              fallback={initials}
              size="lg"
              className="w-16 h-16"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-semibold text-foreground">
                  {fullName}
                </h2>
                <Badge className={cn('text-xs', statusColors[user.status])}>
                  {user.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <RoleIcon className="w-4 h-4 text-muted-foreground" />
                <Badge className={cn('text-xs', getRoleBadgeColor(user.role))}>
                  {getRoleDisplayName(user.role)}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2 sm:shrink-0">
              <Link href={`/${locale}/admin/users/${userId}/edit`}>
                <Button variant="outline" className="gap-2">
                  <Edit className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </Link>
              {user.status === 'active' ? (
                <Button
                  variant="outline"
                  className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                  onClick={() => setShowDeactivateModal(true)}
                >
                  <UserX className="w-4 h-4" />
                  <span className="hidden sm:inline">Deactivate</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/20"
                  onClick={() => handleStatusChange('active')}
                  disabled={isPending}
                >
                  {isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Reactivate</span>
                </Button>
              )}
            </div>
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
                value={user.email}
              />
              <InfoRow
                icon={Phone}
                label="Phone Number"
                value={user.phone}
              />
            </CardContent>
          </Card>

          {/* Account information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <InfoRow
                icon={Shield}
                label="Role"
                value={
                  <div className="flex items-center gap-2">
                    <RoleIcon className="w-4 h-4" />
                    {getRoleDisplayName(user.role)}
                  </div>
                }
              />
              <InfoRow
                icon={Calendar}
                label="Member Since"
                value={new Date(user.created_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              />
              <InfoRow
                icon={Clock}
                label="Last Login"
                value={
                  user.last_login_at
                    ? new Date(user.last_login_at).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Never'
                }
              />
              <InfoRow
                icon={MoreHorizontal}
                label="Last Updated"
                value={new Date(user.updated_at).toLocaleString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              />
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link href={`/${locale}/admin/users/${userId}/edit`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </Button>
              </Link>
              {user.status === 'suspended' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleStatusChange('active')}
                  disabled={isPending}
                >
                  <UserCheck className="w-4 h-4" />
                  Remove Suspension
                </Button>
              )}
              {user.status === 'active' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/20"
                  onClick={() => handleStatusChange('suspended')}
                  disabled={isPending}
                >
                  <UserX className="w-4 h-4" />
                  Suspend User
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Deactivate confirmation modal */}
      <Modal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        title="Deactivate User"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to deactivate <strong>{fullName}</strong>? They will no longer be able to access the system.
          </p>
          <p className="text-sm text-muted-foreground">
            You can reactivate this user at any time.
          </p>

          {actionError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-sm">
              {actionError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeactivateModal(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Deactivating...
                </>
              ) : (
                'Deactivate User'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
