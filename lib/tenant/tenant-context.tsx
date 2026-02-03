'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { Tenant, TenantSettings, TenantLanguages, TenantBranding } from '@/lib/supabase/types';
import type { Locale } from '@/lib/utils/constants';
import { LOCALES, DEFAULT_LOCALE } from '@/lib/utils/constants';
import { DEFAULT_LANGUAGE_SETTINGS, DEFAULT_TENANT_SETTINGS } from './types';

/**
 * Tenant Context
 *
 * Provides tenant data throughout the application.
 * Used for language settings, branding, and other tenant-specific configuration.
 */

export interface TenantContextValue {
  /** Current tenant data (null if on main domain or not resolved) */
  tenant: Tenant | null;
  /** Whether tenant is loading */
  isLoading: boolean;
  /** Tenant ID if available */
  tenantId: string | null;
  /** Tenant settings with defaults */
  settings: TenantSettings;
  /** Language settings */
  languages: TenantLanguages;
  /** Branding settings */
  branding: TenantBranding;
  /** Enabled locales for this tenant */
  enabledLocales: Locale[];
  /** Default locale for this tenant */
  defaultLocale: Locale;
  /** Check if a locale is enabled */
  isLocaleEnabled: (locale: Locale) => boolean;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export interface TenantProviderProps {
  children: ReactNode;
  /** Tenant data from server */
  tenant: Tenant | null;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * Tenant Provider Component
 *
 * Wraps the application to provide tenant context.
 * Should be placed at the root of the app or layout.
 *
 * Usage:
 * ```tsx
 * // In layout.tsx (server component)
 * const tenant = await resolveTenantFromHostname(supabase, hostname);
 *
 * // Pass to client
 * <TenantProvider tenant={tenant}>
 *   {children}
 * </TenantProvider>
 * ```
 */
export function TenantProvider({
  children,
  tenant,
  isLoading = false,
}: TenantProviderProps) {
  const value = useMemo<TenantContextValue>(() => {
    // Merge settings with defaults
    const settings: TenantSettings = {
      ...DEFAULT_TENANT_SETTINGS,
      ...tenant?.settings,
      branding: {
        ...DEFAULT_TENANT_SETTINGS.branding,
        ...tenant?.settings?.branding,
      },
      languages: {
        ...DEFAULT_LANGUAGE_SETTINGS,
        ...tenant?.settings?.languages,
      },
    };

    const languages = settings.languages || DEFAULT_LANGUAGE_SETTINGS;
    const branding = settings.branding || DEFAULT_TENANT_SETTINGS.branding!;

    // Get enabled locales (filter to valid locales only)
    const enabledLocales = (languages.enabled || LOCALES).filter(
      (locale): locale is Locale => LOCALES.includes(locale as Locale)
    );

    // Get default locale (must be in enabled list)
    let defaultLocale: Locale = (languages.default as Locale) || DEFAULT_LOCALE;
    if (!enabledLocales.includes(defaultLocale)) {
      defaultLocale = enabledLocales[0] || DEFAULT_LOCALE;
    }

    return {
      tenant,
      isLoading,
      tenantId: tenant?.id || null,
      settings,
      languages,
      branding,
      enabledLocales,
      defaultLocale,
      isLocaleEnabled: (locale: Locale) => enabledLocales.includes(locale),
    };
  }, [tenant, isLoading]);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook to access tenant context
 *
 * @throws Error if used outside of TenantProvider
 *
 * Usage:
 * ```tsx
 * const { tenant, enabledLocales, defaultLocale } = useTenantContext();
 * ```
 */
export function useTenantContext(): TenantContextValue {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error('useTenantContext must be used within a TenantProvider');
  }

  return context;
}

/**
 * Hook to safely access tenant context
 *
 * Returns null if not within a TenantProvider.
 * Useful for components that may be used outside tenant context.
 */
export function useTenantContextSafe(): TenantContextValue | null {
  return useContext(TenantContext);
}
