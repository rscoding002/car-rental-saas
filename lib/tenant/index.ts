/**
 * Tenant Module
 *
 * Provides multi-tenant functionality including:
 * - Tenant resolution from domain/subdomain
 * - Tenant context and hooks for client components
 * - Tenant settings including language configuration
 */

// Types
export * from './types';

// Tenant resolution
export {
  extractTenantFromHostname,
  getTenantQueryFilter,
  getCachedTenant,
  cacheTenant,
  clearTenantCache,
  getTenantCacheKey,
  type TenantResolutionResult,
  type TenantResolutionOptions,
} from './resolve-tenant';

// Database queries
export {
  getTenantById,
  getTenantBySlug,
  getTenantByDomain,
  resolveTenantFromHostname,
  updateTenantSettings,
  updateTenantLanguageSettings,
  getAllTenants,
} from './queries';

// Context and hooks (client-side)
export {
  TenantProvider,
  useTenantContext,
  useTenantContextSafe,
  type TenantContextValue,
  type TenantProviderProps,
} from './tenant-context';

export {
  useTenant,
  useTenantSafe,
  useTenantLanguages,
  useTenantBranding,
  useTenantSettings,
  useHasTenant,
  useTenantId,
} from './use-tenant';

// Theme utilities
export {
  generateBrandingCssVariables,
  generateBrandingStyle,
  generateColorPalette,
  generatePaletteVariables,
  getContrastColor,
  cssVariablesToString,
  DEFAULT_BRANDING,
  AVAILABLE_FONTS,
  PRESET_PALETTES,
} from './theme';

// Theme context and hooks
export {
  TenantThemeProvider,
  useTenantTheme,
  useTenantThemeSafe,
  useBrandColors,
  useTenantBrand,
  type TenantThemeContextValue,
  type TenantThemeProviderProps,
  type ColorPalette,
} from './theme-context';

// Subdomain provisioning utilities
export {
  RESERVED_SLUGS,
  getBaseDomain,
  getProtocol,
  getSubdomainUrl,
  getSubdomainDisplay,
  validateSlugFormat,
  isReservedSlug,
  generateSlugFromName,
  generateUniqueSlug,
  getSubdomainConfig,
  getDnsInstructions,
  type ReservedSlug,
  type SubdomainConfig,
  type DnsConfigInstructions,
} from './subdomain';
