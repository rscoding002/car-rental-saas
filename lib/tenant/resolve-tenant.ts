import type { Tenant } from '@/lib/supabase/types';

/**
 * Tenant Resolution
 *
 * Resolves tenant from hostname (subdomain or custom domain).
 * Used in middleware and server components.
 */

/**
 * Extract tenant identifier from hostname
 *
 * Supports:
 * 1. Custom domains (e.g., rent.company.com) -> matches domain field
 * 2. Subdomains (e.g., acme.rentcars.app) -> matches slug field
 * 3. Localhost with subdomain (e.g., acme.localhost:3000)
 *
 * @param hostname - Full hostname from request
 * @returns Tenant identifier info or null
 */
export function extractTenantFromHostname(hostname: string): {
  type: 'domain' | 'subdomain';
  value: string;
} | null {
  // Remove port if present
  const hostWithoutPort = hostname.split(':')[0];

  // List of main app domains (not tenant domains)
  const mainDomains = [
    'localhost',
    'rentcars.app',
    'www.rentcars.app',
    // Add staging/production domains as needed
    process.env.NEXT_PUBLIC_APP_DOMAIN,
  ].filter(Boolean);

  // Check if this is a custom domain (not a subdomain of our main domains)
  const isMainDomain = mainDomains.some(
    (domain) => hostWithoutPort === domain || hostWithoutPort.endsWith(`.${domain}`)
  );

  if (!isMainDomain) {
    // This is a custom domain
    return { type: 'domain', value: hostWithoutPort };
  }

  // Check for subdomain on main domains
  for (const domain of mainDomains) {
    if (!domain) continue;

    // Check if hostname is a subdomain of this main domain
    if (hostWithoutPort.endsWith(`.${domain}`)) {
      const subdomain = hostWithoutPort.replace(`.${domain}`, '');

      // Skip www subdomain
      if (subdomain === 'www') continue;

      // Skip if there are multiple subdomain levels
      if (subdomain.includes('.')) continue;

      return { type: 'subdomain', value: subdomain };
    }
  }

  // No tenant identifier found (main domain without subdomain)
  return null;
}

/**
 * Build Supabase query for tenant resolution
 *
 * @param identifier - Result from extractTenantFromHostname
 * @returns Query filter object for Supabase
 */
export function getTenantQueryFilter(identifier: {
  type: 'domain' | 'subdomain';
  value: string;
}): { column: 'domain' | 'slug'; value: string } {
  return {
    column: identifier.type === 'domain' ? 'domain' : 'slug',
    value: identifier.value,
  };
}

/**
 * Tenant resolution result
 */
export interface TenantResolutionResult {
  tenant: Tenant | null;
  error?: string;
  isMainDomain: boolean;
}

/**
 * Tenant resolution options for different contexts
 */
export interface TenantResolutionOptions {
  /** Allow requests to main domain without tenant */
  allowMainDomain?: boolean;
  /** Cache tenant data */
  useCache?: boolean;
  /** Cache TTL in seconds */
  cacheTtl?: number;
}

/**
 * Simple in-memory cache for tenant data
 * Note: In production, consider using Redis or similar
 */
const tenantCache = new Map<string, { tenant: Tenant; expiresAt: number }>();

/**
 * Get cached tenant if available and not expired
 */
export function getCachedTenant(identifier: string): Tenant | null {
  const cached = tenantCache.get(identifier);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tenant;
  }
  // Clean up expired cache
  if (cached) {
    tenantCache.delete(identifier);
  }
  return null;
}

/**
 * Cache tenant data
 */
export function cacheTenant(identifier: string, tenant: Tenant, ttlSeconds: number = 300): void {
  tenantCache.set(identifier, {
    tenant,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Clear tenant from cache
 */
export function clearTenantCache(identifier?: string): void {
  if (identifier) {
    tenantCache.delete(identifier);
  } else {
    tenantCache.clear();
  }
}

/**
 * Get cache key for tenant
 */
export function getTenantCacheKey(identifier: { type: string; value: string }): string {
  return `${identifier.type}:${identifier.value}`;
}
