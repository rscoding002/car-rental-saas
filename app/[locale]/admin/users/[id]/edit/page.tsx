'use client';

import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { UserEditForm } from '@/components/admin/user-edit-form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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

// Loading skeleton
function EditFormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Basic info card skeleton */}
      <div className="border rounded-lg p-6 space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Role card skeleton */}
      <div className="border rounded-lg p-6 space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>

      {/* Status card skeleton */}
      <div className="border rounded-lg p-6 space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>

      {/* Actions skeleton */}
      <div className="flex justify-end gap-3">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

export default function UserEditPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const userId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setUser(result.user);
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

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
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
            Edit User
          </h1>
          <p className="text-sm text-muted-foreground">
            Update user information and permissions
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
      {isLoading && <EditFormSkeleton />}

      {/* Edit form */}
      {!isLoading && user && (
        <UserEditForm user={user} locale={locale} />
      )}
    </div>
  );
}
