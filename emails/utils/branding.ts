/**
 * Email Branding Utilities
 *
 * Converts tenant data to email branding props.
 */

import type { Tenant } from '@/lib/supabase/types';
import type { TenantBrandingProps } from '../components/base-layout';

/**
 * Default branding values when tenant data is incomplete
 */
export const DEFAULT_EMAIL_BRANDING: TenantBrandingProps = {
  name: 'Car Rental',
  primaryColor: '#3B82F6',
  secondaryColor: '#1E40AF',
  accentColor: '#F59E0B',
};

/**
 * Convert tenant data to email branding props
 *
 * @param tenant - Tenant data from database
 * @returns Branding props for email templates
 */
export function getTenantEmailBranding(tenant: Tenant | null): TenantBrandingProps {
  if (!tenant) {
    return DEFAULT_EMAIL_BRANDING;
  }

  const settings = tenant.settings;
  const branding = settings?.branding;
  const contact = settings?.contact;

  return {
    name: tenant.name || DEFAULT_EMAIL_BRANDING.name,
    logoUrl: tenant.logo_url,
    primaryColor: branding?.primaryColor || DEFAULT_EMAIL_BRANDING.primaryColor,
    secondaryColor: branding?.secondaryColor || DEFAULT_EMAIL_BRANDING.secondaryColor,
    accentColor: branding?.accentColor || DEFAULT_EMAIL_BRANDING.accentColor,
    contactEmail: contact?.email,
    contactPhone: contact?.phone,
    address: contact?.address,
    websiteUrl: tenant.domain
      ? `https://${tenant.domain}`
      : tenant.slug
        ? `https://${tenant.slug}.carrental.app`
        : undefined,
  };
}

/**
 * Get branding with overrides (for testing or custom emails)
 */
export function getBrandingWithOverrides(
  tenant: Tenant | null,
  overrides?: Partial<TenantBrandingProps>
): TenantBrandingProps {
  const baseBranding = getTenantEmailBranding(tenant);
  return {
    ...baseBranding,
    ...overrides,
  };
}
