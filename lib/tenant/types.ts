import { z } from 'zod';

import type { Tenant, TenantSettings, TenantLanguages, TenantBranding } from '@/lib/supabase/types';
import { LOCALES, type Locale } from '@/lib/utils/constants';

/**
 * Tenant Types and Zod Schemas
 *
 * Defines validation schemas and types for tenant data,
 * especially language settings.
 */

// Re-export types from Supabase types for convenience
export type { Tenant, TenantSettings, TenantLanguages, TenantBranding };

/**
 * Language settings schema
 * Validates tenant language configuration
 */
export const tenantLanguagesSchema = z.object({
  enabled: z
    .array(z.enum(LOCALES as unknown as [string, ...string[]]))
    .min(1, 'At least one language must be enabled')
    .default(['en']),
  default: z.enum(LOCALES as unknown as [string, ...string[]]).default('en'),
}).refine(
  (data) => data.enabled.includes(data.default),
  {
    message: 'Default language must be one of the enabled languages',
    path: ['default'],
  }
);

/**
 * Branding settings schema
 */
export const tenantBrandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  fontFamily: z.string().optional(),
});

/**
 * Cancellation policy schema
 */
export const cancellationPolicySchema = z.object({
  freeCancellationHours: z.number().min(0).optional(),
  partialRefundHours: z.number().min(0).optional(),
  partialRefundPercent: z.number().min(0).max(100).optional(),
});

/**
 * Contact schema
 */
export const tenantContactSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

/**
 * Email settings schema
 * Configures tenant-specific email sending behavior
 */
export const tenantEmailSettingsSchema = z.object({
  /** Custom "from" name for emails (e.g., "Acme Car Rentals") */
  fromName: z.string().max(100).optional(),
  /** Custom reply-to email address */
  replyToEmail: z.string().email().optional(),
  /** Whether to send booking confirmation emails */
  sendBookingConfirmation: z.boolean().default(true),
  /** Whether to send booking modification emails */
  sendBookingModification: z.boolean().default(true),
  /** Whether to send booking cancellation emails */
  sendBookingCancellation: z.boolean().default(true),
  /** Whether to send reminder emails before pickup */
  sendBookingReminder: z.boolean().default(true),
  /** Hours before pickup to send reminder (default 24) */
  reminderHoursBefore: z.number().min(1).max(168).default(24),
});

export type TenantEmailSettings = z.infer<typeof tenantEmailSettingsSchema>;

/**
 * Default email settings
 */
export const DEFAULT_EMAIL_SETTINGS: TenantEmailSettings = {
  sendBookingConfirmation: true,
  sendBookingModification: true,
  sendBookingCancellation: true,
  sendBookingReminder: true,
  reminderHoursBefore: 24,
};

/**
 * One-way zone fee schema
 */
export const oneWayZoneFeeSchema = z.object({
  fromBranchId: z.string().uuid().optional(),
  fromZone: z.string().optional(),
  toBranchId: z.string().uuid().optional(),
  toZone: z.string().optional(),
  fee: z.number().min(0),
});

/**
 * One-way fee configuration schema
 */
export const oneWayFeesSchema = z.object({
  enabled: z.boolean().default(true),
  type: z.enum(['flat', 'distance', 'zone']).default('flat'),
  flatFee: z.number().min(0).optional(),
  perKmFee: z.number().min(0).optional(),
  minFee: z.number().min(0).optional(),
  maxFee: z.number().min(0).optional(),
  defaultFee: z.number().min(0).optional(),
  zoneFees: z.array(oneWayZoneFeeSchema).optional(),
});

export type OneWayFeesConfig = z.infer<typeof oneWayFeesSchema>;

/**
 * Full tenant settings schema
 */
export const tenantSettingsSchema = z.object({
  branding: tenantBrandingSchema.optional(),
  languages: tenantLanguagesSchema.optional(),
  currency: z.string().length(3).default('EUR'),
  timezone: z.string().default('Europe/Vilnius'),
  bufferTime: z.number().min(0).default(60),
  cancellationPolicy: cancellationPolicySchema.optional(),
  contact: tenantContactSchema.optional(),
  oneWayFees: oneWayFeesSchema.optional(),
  email: tenantEmailSettingsSchema.optional(),
});

/**
 * Default one-way fee settings
 */
export const DEFAULT_ONE_WAY_FEES: OneWayFeesConfig = {
  enabled: true,
  type: 'flat',
  flatFee: 25,
  perKmFee: 0.50,
  minFee: 15,
  maxFee: 200,
  defaultFee: 50,
  zoneFees: [],
};

/**
 * Default tenant settings
 */
export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  branding: {
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    accentColor: '#F59E0B',
    fontFamily: 'Inter',
  },
  languages: {
    enabled: ['en', 'lt', 'ru'],
    default: 'en',
  },
  currency: 'EUR',
  timezone: 'Europe/Vilnius',
  bufferTime: 60,
  cancellationPolicy: {
    freeCancellationHours: 48,
    partialRefundHours: 24,
    partialRefundPercent: 50,
  },
  oneWayFees: DEFAULT_ONE_WAY_FEES,
  email: DEFAULT_EMAIL_SETTINGS,
};

/**
 * Default language settings when tenant doesn't have any configured
 */
export const DEFAULT_LANGUAGE_SETTINGS: TenantLanguages = {
  enabled: ['en', 'lt', 'ru'],
  default: 'en',
};

/**
 * Get enabled locales for a tenant
 * Falls back to all locales if not configured
 */
export function getTenantEnabledLocales(tenant: Tenant | null): Locale[] {
  if (!tenant?.settings?.languages?.enabled) {
    return [...LOCALES];
  }
  return tenant.settings.languages.enabled as Locale[];
}

/**
 * Get default locale for a tenant
 * Falls back to 'en' if not configured
 */
export function getTenantDefaultLocale(tenant: Tenant | null): Locale {
  if (!tenant?.settings?.languages?.default) {
    return 'en';
  }
  return tenant.settings.languages.default as Locale;
}

/**
 * Check if a locale is enabled for a tenant
 */
export function isLocaleEnabled(tenant: Tenant | null, locale: Locale): boolean {
  const enabledLocales = getTenantEnabledLocales(tenant);
  return enabledLocales.includes(locale);
}

/**
 * Tenant data with computed properties
 */
export interface TenantWithSettings extends Tenant {
  enabledLocales: Locale[];
  defaultLocale: Locale;
}

/**
 * Add computed locale properties to tenant
 */
export function enrichTenantWithSettings(tenant: Tenant): TenantWithSettings {
  return {
    ...tenant,
    enabledLocales: getTenantEnabledLocales(tenant),
    defaultLocale: getTenantDefaultLocale(tenant),
  };
}
