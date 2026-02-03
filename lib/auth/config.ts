/**
 * Supabase Auth Configuration
 *
 * This file contains the configuration for Supabase Authentication.
 * It provides utilities for generating correct redirect URLs for various
 * auth flows (sign in, sign up, password reset, OAuth).
 *
 * IMPORTANT: The following settings must be configured in Supabase Dashboard:
 *
 * 1. Authentication > Providers > Email:
 *    - Enable email provider
 *    - Enable "Confirm email" for production (optional for development)
 *    - Configure email templates as needed
 *
 * 2. Authentication > URL Configuration:
 *    - Site URL: Set to your production URL (e.g., https://yourdomain.com)
 *    - Redirect URLs: Add all valid callback URLs:
 *      - http://localhost:3000/api/auth/callback (development)
 *      - https://yourdomain.com/api/auth/callback (production)
 *      - https://*.yourdomain.com/api/auth/callback (multi-tenant wildcard)
 *
 * 3. Authentication > Email Templates (optional):
 *    - Customize confirmation, recovery, and magic link emails
 *    - Use {{ .ConfirmationURL }} placeholder for the callback URL
 */

/**
 * Get the base URL for the application.
 * Handles different environments (development, preview, production).
 */
export function getBaseUrl(): string {
  // Server-side: Use environment variable
  if (typeof window === 'undefined') {
    // Vercel deployment
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    // Custom app URL
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL;
    }
    // Default to localhost
    return 'http://localhost:3000';
  }

  // Client-side: Use window.location.origin
  return window.location.origin;
}

/**
 * Get the auth callback URL for redirects after authentication.
 * This URL must be added to Supabase's allowed redirect URLs.
 */
export function getAuthCallbackUrl(): string {
  const baseUrl = getBaseUrl();
  const callbackPath = process.env.NEXT_PUBLIC_AUTH_CALLBACK_URL || '/api/auth/callback';
  return `${baseUrl}${callbackPath}`;
}

/**
 * Generate redirect URL for sign-in with a specific destination.
 * @param redirectTo - The path to redirect to after successful sign-in
 */
export function getSignInRedirectUrl(redirectTo?: string): string {
  const callbackUrl = getAuthCallbackUrl();
  if (redirectTo) {
    return `${callbackUrl}?redirect_to=${encodeURIComponent(redirectTo)}`;
  }
  return callbackUrl;
}

/**
 * Auth configuration object with all settings
 */
export const authConfig = {
  /**
   * Paths that require authentication
   */
  protectedPaths: ['/account', '/admin', '/platform-admin'],

  /**
   * Paths that should redirect authenticated users away
   */
  authPaths: ['/login', '/register', '/forgot-password'],

  /**
   * Default redirect after sign-in (if no redirect_to specified)
   */
  defaultRedirect: '/',

  /**
   * Default redirect for admin users after sign-in
   */
  adminRedirect: '/admin',

  /**
   * Session cookie name (used by Supabase)
   */
  sessionCookieName: 'sb-access-token',

  /**
   * Email provider settings reference
   * (Actual settings configured in Supabase Dashboard)
   */
  emailProvider: {
    enabled: true,
    confirmEmail: process.env.NODE_ENV === 'production',
    doubleConfirmChanges: true,
    securePasswordChange: true,
  },

  /**
   * Password requirements
   */
  passwordRequirements: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  },
} as const;

/**
 * Auth route paths
 */
export const authRoutes = {
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  callback: '/api/auth/callback',
  signOut: '/api/auth/sign-out',
} as const;

export type AuthRoute = keyof typeof authRoutes;
