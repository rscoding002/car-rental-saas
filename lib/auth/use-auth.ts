'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { useAuthContext } from './auth-context';
import { authConfig, authRoutes } from './config';

import type { UserRole } from '@/lib/supabase/types';

/**
 * useAuth Hook
 *
 * A convenient hook for accessing authentication state and methods
 * in client components. Provides additional navigation helpers.
 *
 * Usage:
 * ```tsx
 * 'use client'
 * import { useAuth } from '@/lib/auth/use-auth'
 *
 * export function MyComponent() {
 *   const { user, isAuthenticated, signIn, signOut } = useAuth()
 *
 *   if (isLoading) return <Spinner />
 *   if (!isAuthenticated) return <LoginPrompt />
 *
 *   return <UserDashboard user={user} />
 * }
 * ```
 */
export function useAuth() {
  const router = useRouter();
  const {
    authUser,
    session,
    user,
    isLoading,
    isAuthenticated,
    error,
    signInWithEmail,
    signUpWithEmail,
    signOut: contextSignOut,
    resetPassword,
    updatePassword,
    refreshUser,
    hasRole,
    hasAnyRole,
  } = useAuthContext();

  /**
   * Sign in and optionally redirect after success
   */
  const signIn = useCallback(
    async (
      email: string,
      password: string,
      options?: { redirectTo?: string }
    ) => {
      const result = await signInWithEmail(email, password);

      if (!result.error && options?.redirectTo) {
        router.push(options.redirectTo);
      }

      return result;
    },
    [signInWithEmail, router]
  );

  /**
   * Sign up and optionally redirect after success
   */
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      options?: {
        firstName?: string;
        lastName?: string;
        redirectTo?: string;
      }
    ) => {
      const result = await signUpWithEmail(email, password, {
        firstName: options?.firstName,
        lastName: options?.lastName,
      });

      if (!result.error && options?.redirectTo) {
        router.push(options.redirectTo);
      }

      return result;
    },
    [signUpWithEmail, router]
  );

  /**
   * Sign out and redirect to login or specified page
   */
  const signOut = useCallback(
    async (options?: { redirectTo?: string }) => {
      const result = await contextSignOut();

      if (!result.error) {
        router.push(options?.redirectTo ?? authRoutes.login);
      }

      return result;
    },
    [contextSignOut, router]
  );

  /**
   * Send password reset email
   */
  const forgotPassword = useCallback(
    async (email: string) => {
      return await resetPassword(email);
    },
    [resetPassword]
  );

  /**
   * Navigate to login page with optional redirect destination
   */
  const redirectToLogin = useCallback(
    (redirectAfterLogin?: string) => {
      const loginUrl = redirectAfterLogin
        ? `${authRoutes.login}?redirect_to=${encodeURIComponent(redirectAfterLogin)}`
        : authRoutes.login;
      router.push(loginUrl);
    },
    [router]
  );

  /**
   * Navigate to registration page
   */
  const redirectToRegister = useCallback(() => {
    router.push(authRoutes.register);
  }, [router]);

  /**
   * Check if user is a tenant admin or higher
   */
  const isAdmin = useMemo(() => {
    return hasAnyRole(['tenant_admin', 'platform_admin']);
  }, [hasAnyRole]);

  /**
   * Check if user is a tenant staff member or higher
   */
  const isStaff = useMemo(() => {
    return hasAnyRole(['tenant_staff', 'tenant_manager', 'tenant_admin', 'platform_admin']);
  }, [hasAnyRole]);

  /**
   * Check if user is a platform admin
   */
  const isPlatformAdmin = useMemo(() => {
    return hasRole('platform_admin');
  }, [hasRole]);

  /**
   * Check if user is a customer
   */
  const isCustomer = useMemo(() => {
    return hasRole('customer');
  }, [hasRole]);

  /**
   * Get user's display name
   */
  const displayName = useMemo(() => {
    if (!user) return null;
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user.first_name) return user.first_name;
    return user.email;
  }, [user]);

  /**
   * Get user's initials for avatar
   */
  const initials = useMemo(() => {
    if (!user) return null;
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user.first_name) return user.first_name[0].toUpperCase();
    if (user.email) return user.email[0].toUpperCase();
    return '?';
  }, [user]);

  /**
   * Check if current path requires authentication
   */
  const requiresAuth = useCallback(
    (path: string): boolean => {
      return authConfig.protectedPaths.some(
        (protectedPath) =>
          path === protectedPath || path.startsWith(`${protectedPath}/`)
      );
    },
    []
  );

  /**
   * Check if user can access a specific role-protected resource
   */
  const canAccess = useCallback(
    (requiredRoles: UserRole[]): boolean => {
      if (!isAuthenticated || !user) return false;
      return hasAnyRole(requiredRoles);
    },
    [isAuthenticated, user, hasAnyRole]
  );

  return {
    // State
    authUser,
    session,
    user,
    isLoading,
    isAuthenticated,
    error,

    // Computed
    displayName,
    initials,
    isAdmin,
    isStaff,
    isPlatformAdmin,
    isCustomer,

    // Auth methods
    signIn,
    signUp,
    signOut,
    forgotPassword,
    updatePassword,
    refreshUser,

    // Role checks
    hasRole,
    hasAnyRole,
    canAccess,

    // Navigation
    redirectToLogin,
    redirectToRegister,
    requiresAuth,
  };
}

/**
 * Type for the useAuth hook return value
 */
export type UseAuthReturn = ReturnType<typeof useAuth>;
