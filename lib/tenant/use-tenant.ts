'use client';

import { useTenantContext, useTenantContextSafe } from './tenant-context';
import type { TenantContextValue } from './tenant-context';
import type { Locale } from '@/lib/utils/constants';

/**
 * Tenant Hooks
 *
 * Custom hooks for accessing tenant data in client components.
 */

/**
 * Main hook to access tenant data
 *
 * Provides full tenant context including settings and language configuration.
 *
 * @throws Error if used outside TenantProvider
 *
 * Usage:
 * ```tsx
 * const { tenant, enabledLocales, isLocaleEnabled } = useTenant();
 * ```
 */
export function useTenant(): TenantContextValue {
  return useTenantContext();
}

/**
 * Safe variant that returns null if not within TenantProvider
 *
 * Useful for shared components that may be used in different contexts.
 */
export function useTenantSafe(): TenantContextValue | null {
  return useTenantContextSafe();
}

/**
 * Hook to access only language-related tenant settings
 *
 * More lightweight than full useTenant for language-only needs.
 */
export function useTenantLanguages(): {
  enabledLocales: Locale[];
  defaultLocale: Locale;
  isLocaleEnabled: (locale: Locale) => boolean;
} {
  const { enabledLocales, defaultLocale, isLocaleEnabled } = useTenantContext();

  return {
    enabledLocales,
    defaultLocale,
    isLocaleEnabled,
  };
}

/**
 * Hook to access tenant branding settings
 */
export function useTenantBranding() {
  const { branding } = useTenantContext();
  return branding;
}

/**
 * Hook to access tenant settings
 */
export function useTenantSettings() {
  const { settings } = useTenantContext();
  return settings;
}

/**
 * Hook to check if current tenant context exists
 */
export function useHasTenant(): boolean {
  const context = useTenantContextSafe();
  return context?.tenant !== null;
}

/**
 * Hook to get tenant ID if available
 */
export function useTenantId(): string | null {
  const { tenantId } = useTenantContext();
  return tenantId;
}
