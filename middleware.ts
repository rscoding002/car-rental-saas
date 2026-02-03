import { createServerClient } from '@supabase/ssr';
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

import { routing } from '@/i18n/routing';
import { defaultLocale } from '@/i18n/config';

/**
 * Create the internationalization middleware using the routing config
 * This handles:
 * - Locale detection from Accept-Language header
 * - Locale detection from cookies
 * - URL locale prefix handling
 * - Locale redirects
 */
const intlMiddleware = createMiddleware(routing);

/**
 * Routes that require authentication
 */
const protectedRoutes = ['/account', '/admin'];

/**
 * Routes that require platform admin role
 */
const platformAdminRoutes = ['/platform-admin'];

/**
 * Routes that require tenant admin/staff roles
 */
const adminRoutes = ['/admin'];

/**
 * Auth routes - redirect authenticated users away
 */
const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

/**
 * Routes accessible even when tenant is suspended
 */
const suspensionExemptRoutes = ['/suspended'];

/**
 * Extract locale from pathname
 * Returns the locale if found, or null
 */
function extractLocale(pathname: string): string | null {
  const match = pathname.match(/^\/([a-z]{2})(?=\/|$)/);
  return match ? match[1] : null;
}

/**
 * Check if a path matches any of the given patterns
 * Handles locale prefix removal for matching
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  // Remove locale prefix for matching
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';

  return routes.some((route) => {
    // Exact match or starts with route followed by /
    return pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`);
  });
}

/**
 * Get the login URL with redirect parameter
 */
function getLoginUrl(request: NextRequest, locale: string): URL {
  const loginUrl = new URL(`/${locale}/login`, request.url);
  const redirectTo = request.nextUrl.pathname + request.nextUrl.search;

  // Only add redirect_to if not going to homepage
  if (redirectTo !== `/${locale}/` && redirectTo !== '/' && redirectTo !== `/${locale}`) {
    loginUrl.searchParams.set('redirect_to', redirectTo);
  }
  return loginUrl;
}

/**
 * Get redirect path based on user role
 */
function getRoleBasedRedirect(userRole: string | null, locale: string): string {
  if (userRole === 'platform_admin') {
    return `/${locale}/platform-admin`;
  }

  if (
    userRole === 'tenant_admin' ||
    userRole === 'tenant_manager' ||
    userRole === 'tenant_staff'
  ) {
    return `/${locale}/admin`;
  }

  // Default for customers and unknown roles
  return `/${locale}/account`;
}

/**
 * Middleware function
 *
 * Handles:
 * 1. Internationalization (locale detection and routing)
 *    - Detects locale from Accept-Language header
 *    - Detects locale from cookie (NEXT_LOCALE)
 *    - Redirects to appropriate locale URL
 * 2. Authentication checks for protected routes
 * 3. Role-based access control
 * 4. Session refresh
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and most API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    (pathname.startsWith('/api') && !pathname.startsWith('/api/auth'))
  ) {
    return NextResponse.next();
  }

  // Run i18n middleware first to handle locale detection and routing
  const intlResponse = intlMiddleware(request);

  // Extract locale from the pathname or use default
  const locale = extractLocale(pathname) || defaultLocale;

  // Create Supabase client for auth checks
  // Uses the response cookies to properly handle session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            intlResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session if it exists (this also validates the session)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Get user role and tenant info if authenticated
  let userRole: string | null = null;
  let tenantId: string | null = null;
  let tenantStatus: string | null = null;

  if (session?.user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role, tenant_id')
      .eq('auth_id', session.user.id)
      .single();

    userRole = userData?.role || null;
    tenantId = userData?.tenant_id || null;

    // Get tenant status if user belongs to a tenant
    if (tenantId) {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('status')
        .eq('id', tenantId)
        .single();

      tenantStatus = tenantData?.status || null;
    }
  }

  const isAuthenticated = !!session;
  const isAuthRoute = matchesRoute(pathname, authRoutes);
  const isProtectedRoute = matchesRoute(pathname, protectedRoutes);
  const isAdminRoute = matchesRoute(pathname, adminRoutes);
  const isPlatformAdminRoute = matchesRoute(pathname, platformAdminRoutes);

  // Redirect authenticated users away from auth pages (login, register, etc.)
  if (isAuthenticated && isAuthRoute) {
    const redirectPath = getRoleBasedRedirect(userRole, locale);
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  // Check authentication for protected routes (/account, /admin)
  if (!isAuthenticated && isProtectedRoute) {
    return NextResponse.redirect(getLoginUrl(request, locale));
  }

  // Check platform admin access (/platform-admin)
  if (isPlatformAdminRoute) {
    if (!isAuthenticated) {
      return NextResponse.redirect(getLoginUrl(request, locale));
    }

    if (userRole !== 'platform_admin') {
      // Redirect non-platform admins to appropriate page
      const redirectPath = getRoleBasedRedirect(userRole, locale);
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
  }

  // Check admin access (/admin) - requires tenant staff roles or higher
  if (isAdminRoute && !isPlatformAdminRoute) {
    if (!isAuthenticated) {
      return NextResponse.redirect(getLoginUrl(request, locale));
    }

    const adminRoles = ['platform_admin', 'tenant_admin', 'tenant_manager', 'tenant_staff'];
    if (!userRole || !adminRoles.includes(userRole)) {
      // Redirect customers to their account page
      return NextResponse.redirect(new URL(`/${locale}/account`, request.url));
    }
  }

  // Check tenant suspension for tenant users accessing protected routes
  // Platform admins are exempt from this check
  // Also exempt: suspension-related routes themselves
  const isSuspensionExempt = matchesRoute(pathname, suspensionExemptRoutes);

  if (
    isAuthenticated &&
    tenantStatus === 'suspended' &&
    userRole !== 'platform_admin' &&
    !isSuspensionExempt &&
    (isAdminRoute || isProtectedRoute)
  ) {
    // Redirect to suspended page
    const suspendedUrl = new URL(`/${locale}/suspended`, request.url);
    return NextResponse.redirect(suspendedUrl);
  }

  return intlResponse;
}

/**
 * Middleware configuration
 *
 * Matches all paths except:
 * - _next/static (static files)
 * - _next/image (image optimization files)
 * - favicon.ico (favicon file)
 * - Static assets (images, fonts, etc.)
 */
export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
};
