import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import type { User, UserRole } from '@/lib/supabase/types';

import { ROLE_GROUPS } from './roles';

/**
 * Auth check result
 */
export interface AuthCheckResult {
  authenticated: boolean;
  user: User | null;
  authUser: { id: string; email?: string } | null;
}

/**
 * Get the current authenticated user (server-side)
 *
 * Usage in Server Components:
 * ```tsx
 * import { getCurrentUser } from '@/lib/auth/middleware'
 *
 * export default async function Page() {
 *   const { user, authenticated } = await getCurrentUser()
 *   if (!authenticated) {
 *     redirect('/login')
 *   }
 *   // Use user...
 * }
 * ```
 */
export async function getCurrentUser(): Promise<AuthCheckResult> {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return {
      authenticated: false,
      user: null,
      authUser: null,
    };
  }

  // Get user profile from database
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', session.user.id)
    .single();

  return {
    authenticated: true,
    user: user || null,
    authUser: {
      id: session.user.id,
      email: session.user.email,
    },
  };
}

/**
 * Require authentication - redirects to login if not authenticated
 *
 * Usage in Server Components:
 * ```tsx
 * import { requireAuth } from '@/lib/auth/middleware'
 *
 * export default async function ProtectedPage() {
 *   const user = await requireAuth()
 *   // User is guaranteed to be authenticated
 * }
 * ```
 */
export async function requireAuth(redirectTo?: string): Promise<User> {
  const { authenticated, user } = await getCurrentUser();

  if (!authenticated || !user) {
    const loginPath = redirectTo
      ? `/login?redirect_to=${encodeURIComponent(redirectTo)}`
      : '/login';
    redirect(loginPath);
  }

  return user;
}

/**
 * Require a specific role - redirects if user doesn't have the role
 *
 * Usage:
 * ```tsx
 * import { requireRole } from '@/lib/auth/middleware'
 *
 * export default async function AdminPage() {
 *   const user = await requireRole('tenant_admin')
 *   // User is guaranteed to be a tenant admin
 * }
 * ```
 */
export async function requireRole(
  role: UserRole,
  fallbackPath = '/'
): Promise<User> {
  const user = await requireAuth();

  if (user.role !== role) {
    redirect(fallbackPath);
  }

  return user;
}

/**
 * Require any of the specified roles
 *
 * Usage:
 * ```tsx
 * import { requireAnyRole } from '@/lib/auth/middleware'
 *
 * export default async function ManagerPage() {
 *   const user = await requireAnyRole(['tenant_admin', 'tenant_manager'])
 * }
 * ```
 */
export async function requireAnyRole(
  roles: UserRole[],
  fallbackPath = '/'
): Promise<User> {
  const user = await requireAuth();

  if (!roles.includes(user.role)) {
    redirect(fallbackPath);
  }

  return user;
}

/**
 * Require admin access (any tenant staff role or higher)
 *
 * Usage:
 * ```tsx
 * import { requireAdminAccess } from '@/lib/auth/middleware'
 *
 * export default async function AdminPage() {
 *   const user = await requireAdminAccess()
 * }
 * ```
 */
export async function requireAdminAccess(fallbackPath = '/'): Promise<User> {
  return requireAnyRole(ROLE_GROUPS.ADMIN_ACCESS, fallbackPath);
}

/**
 * Require platform admin access
 *
 * Usage:
 * ```tsx
 * import { requirePlatformAdmin } from '@/lib/auth/middleware'
 *
 * export default async function PlatformAdminPage() {
 *   const user = await requirePlatformAdmin()
 * }
 * ```
 */
export async function requirePlatformAdmin(fallbackPath = '/'): Promise<User> {
  return requireRole('platform_admin', fallbackPath);
}

/**
 * Require tenant settings access (tenant admin or platform admin)
 */
export async function requireTenantSettings(fallbackPath = '/'): Promise<User> {
  return requireAnyRole(ROLE_GROUPS.TENANT_SETTINGS, fallbackPath);
}

/**
 * Check if user is authenticated without redirecting
 */
export async function isAuthenticated(): Promise<boolean> {
  const { authenticated } = await getCurrentUser();
  return authenticated;
}

/**
 * Get user role (returns null if not authenticated)
 */
export async function getUserRole(): Promise<UserRole | null> {
  const { user } = await getCurrentUser();
  return user?.role || null;
}

/**
 * Protect a page layout - use in layout.tsx files
 *
 * Usage:
 * ```tsx
 * // app/admin/layout.tsx
 * import { protectLayout } from '@/lib/auth/middleware'
 *
 * export default async function AdminLayout({ children }) {
 *   await protectLayout({
 *     requireAuth: true,
 *     allowedRoles: ['tenant_admin', 'tenant_manager', 'tenant_staff', 'platform_admin'],
 *     fallbackPath: '/',
 *   })
 *
 *   return <div>{children}</div>
 * }
 * ```
 */
export async function protectLayout(options: {
  requireAuth?: boolean;
  allowedRoles?: UserRole[];
  fallbackPath?: string;
}): Promise<User | null> {
  const {
    requireAuth: authRequired = true,
    allowedRoles,
    fallbackPath = '/',
  } = options;

  if (!authRequired) {
    const { user } = await getCurrentUser();
    return user;
  }

  const { authenticated, user } = await getCurrentUser();

  if (!authenticated || !user) {
    redirect('/login');
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect(fallbackPath);
  }

  return user;
}

/**
 * API route auth check result
 */
export interface ApiAuthResult {
  authorized: boolean;
  user: User | null;
  error?: { message: string; status: number };
}

/**
 * Check platform admin auth for API routes (returns error instead of redirect)
 *
 * Usage in API routes:
 * ```ts
 * import { checkPlatformAdminApi } from '@/lib/auth/middleware'
 * import { NextResponse } from 'next/server'
 *
 * export async function GET() {
 *   const { authorized, user, error } = await checkPlatformAdminApi()
 *   if (!authorized) {
 *     return NextResponse.json({ error: error?.message }, { status: error?.status })
 *   }
 *   // User is guaranteed to be platform admin
 * }
 * ```
 */
export async function checkPlatformAdminApi(): Promise<ApiAuthResult> {
  const { authenticated, user } = await getCurrentUser();

  if (!authenticated || !user) {
    return {
      authorized: false,
      user: null,
      error: { message: 'Unauthorized', status: 401 },
    };
  }

  if (user.role !== 'platform_admin') {
    return {
      authorized: false,
      user: null,
      error: { message: 'Forbidden - Platform admin access required', status: 403 },
    };
  }

  return {
    authorized: true,
    user,
  };
}

/**
 * Check any role auth for API routes (returns error instead of redirect)
 *
 * Usage in API routes:
 * ```ts
 * import { checkRolesApi } from '@/lib/auth/middleware'
 * import { NextResponse } from 'next/server'
 *
 * export async function GET() {
 *   const { authorized, user, error } = await checkRolesApi(['tenant_admin', 'platform_admin'])
 *   if (!authorized) {
 *     return NextResponse.json({ error: error?.message }, { status: error?.status })
 *   }
 *   // User has one of the specified roles
 * }
 * ```
 */
export async function checkRolesApi(allowedRoles: UserRole[]): Promise<ApiAuthResult> {
  const { authenticated, user } = await getCurrentUser();

  if (!authenticated || !user) {
    return {
      authorized: false,
      user: null,
      error: { message: 'Unauthorized', status: 401 },
    };
  }

  if (!allowedRoles.includes(user.role)) {
    return {
      authorized: false,
      user: null,
      error: { message: 'Forbidden - Insufficient permissions', status: 403 },
    };
  }

  return {
    authorized: true,
    user,
  };
}
