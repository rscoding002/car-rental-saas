import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Tenant, TenantSettings } from '@/lib/supabase/types';
import {
  extractTenantFromHostname,
  getTenantQueryFilter,
  getCachedTenant,
  cacheTenant,
  getTenantCacheKey,
} from './resolve-tenant';

/**
 * Tenant Database Queries
 *
 * Server-side queries for fetching and managing tenant data.
 */

/**
 * Get tenant by ID
 */
export async function getTenantById(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Get tenant by slug
 */
export async function getTenantBySlug(
  supabase: SupabaseClient<Database>,
  slug: string
): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Get tenant by custom domain
 */
export async function getTenantByDomain(
  supabase: SupabaseClient<Database>,
  domain: string
): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('domain', domain)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Resolve tenant from hostname
 * Uses caching for performance
 */
export async function resolveTenantFromHostname(
  supabase: SupabaseClient<Database>,
  hostname: string,
  options: { useCache?: boolean; cacheTtl?: number } = {}
): Promise<Tenant | null> {
  const { useCache = true, cacheTtl = 300 } = options;

  // Extract tenant identifier from hostname
  const identifier = extractTenantFromHostname(hostname);

  if (!identifier) {
    // Main domain without subdomain - no tenant context
    return null;
  }

  const cacheKey = getTenantCacheKey(identifier);

  // Check cache first
  if (useCache) {
    const cached = getCachedTenant(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Query database
  const filter = getTenantQueryFilter(identifier);
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq(filter.column, filter.value)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return null;
  }

  // Cache result
  if (useCache) {
    cacheTenant(cacheKey, data, cacheTtl);
  }

  return data;
}

/**
 * Update tenant settings
 */
export async function updateTenantSettings(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  settings: Partial<TenantSettings>
): Promise<{ data: Tenant | null; error: string | null }> {
  // First get current tenant to merge settings
  const currentTenant = await getTenantById(supabase, tenantId);

  if (!currentTenant) {
    return { data: null, error: 'Tenant not found' };
  }

  // Merge settings
  const currentSettings = (currentTenant.settings || {}) as TenantSettings;
  const mergedSettings: TenantSettings = {
    ...currentSettings,
    ...settings,
  };

  // Update tenant settings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('tenants')
    .update({ settings: mergedSettings })
    .eq('id', tenantId)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as Tenant, error: null };
}

/**
 * Update tenant language settings
 */
export async function updateTenantLanguageSettings(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  languageSettings: { enabled: string[]; default: string }
): Promise<{ data: Tenant | null; error: string | null }> {
  // Validate that default is in enabled
  if (!languageSettings.enabled.includes(languageSettings.default)) {
    return {
      data: null,
      error: 'Default language must be one of the enabled languages',
    };
  }

  // Validate at least one language
  if (languageSettings.enabled.length === 0) {
    return {
      data: null,
      error: 'At least one language must be enabled',
    };
  }

  return updateTenantSettings(supabase, tenantId, {
    languages: languageSettings,
  });
}

/**
 * Get all active tenants (platform admin only)
 */
export async function getAllTenants(
  supabase: SupabaseClient<Database>,
  options: { includeInactive?: boolean } = {}
): Promise<Tenant[]> {
  let query = supabase.from('tenants').select('*').order('created_at', { ascending: false });

  if (!options.includeInactive) {
    query = query.eq('status', 'active');
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data;
}
