/**
 * Tenant Components
 *
 * Components for multi-tenant features including branding and theming.
 */

export {
  TenantBranding,
  TenantBrandingStyle,
  useBrandingClasses,
} from './tenant-branding';

// Re-export theme context for convenience
export {
  TenantThemeProvider,
  useTenantTheme,
  useTenantThemeSafe,
  useBrandColors,
  useTenantBrand,
} from '@/lib/tenant/theme-context';
