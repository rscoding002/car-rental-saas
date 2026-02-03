/**
 * Subdomain Provisioning Utilities
 *
 * Functions for generating, validating, and managing tenant subdomains.
 */

/**
 * Reserved slugs that cannot be used as tenant subdomains
 */
export const RESERVED_SLUGS = [
  'www',
  'api',
  'app',
  'admin',
  'platform',
  'auth',
  'login',
  'register',
  'signup',
  'account',
  'dashboard',
  'help',
  'support',
  'blog',
  'docs',
  'status',
  'mail',
  'email',
  'ftp',
  'ssh',
  'cdn',
  'assets',
  'static',
  'media',
  'images',
  'files',
  'download',
  'downloads',
  'billing',
  'pay',
  'payment',
  'payments',
  'checkout',
  'demo',
  'test',
  'staging',
  'dev',
  'development',
  'prod',
  'production',
  'preview',
  'sandbox',
  'internal',
  'private',
  'public',
  'secure',
  'ssl',
  'vpn',
  'proxy',
] as const;

export type ReservedSlug = (typeof RESERVED_SLUGS)[number];

/**
 * Get the base domain from environment variable or default
 */
export function getBaseDomain(): string {
  return process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
}

/**
 * Get the protocol based on the environment
 */
export function getProtocol(): 'https' | 'http' {
  const baseDomain = getBaseDomain();
  // Use http for localhost, https for production
  if (baseDomain.includes('localhost') || baseDomain.includes('127.0.0.1')) {
    return 'http';
  }
  return 'https';
}

/**
 * Generate the full subdomain URL for a tenant
 */
export function getSubdomainUrl(slug: string): string {
  const baseDomain = getBaseDomain();
  const protocol = getProtocol();
  return `${protocol}://${slug}.${baseDomain}`;
}

/**
 * Generate the display subdomain (without protocol)
 */
export function getSubdomainDisplay(slug: string): string {
  const baseDomain = getBaseDomain();
  return `${slug}.${baseDomain}`;
}

/**
 * Validate a slug format
 * Returns null if valid, or an error message if invalid
 */
export function validateSlugFormat(slug: string): string | null {
  if (!slug) {
    return 'Slug is required';
  }

  if (slug.length < 3) {
    return 'Slug must be at least 3 characters';
  }

  if (slug.length > 63) {
    return 'Slug must be 63 characters or less';
  }

  // Must start with a letter or number
  if (!/^[a-z0-9]/.test(slug)) {
    return 'Slug must start with a letter or number';
  }

  // Must end with a letter or number
  if (!/[a-z0-9]$/.test(slug)) {
    return 'Slug must end with a letter or number';
  }

  // Can only contain lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return 'Slug can only contain lowercase letters, numbers, and hyphens';
  }

  // Cannot have consecutive hyphens
  if (/--/.test(slug)) {
    return 'Slug cannot contain consecutive hyphens';
  }

  // Check reserved slugs
  if (RESERVED_SLUGS.includes(slug as ReservedSlug)) {
    return 'This slug is reserved and cannot be used';
  }

  return null;
}

/**
 * Check if a slug is reserved
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase() as ReservedSlug);
}

/**
 * Generate a slug from a company name
 */
export function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Replace accented characters with ASCII equivalents
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove any characters that aren't alphanumeric or hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Remove consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-|-$/g, '')
    // Limit length
    .slice(0, 63);
}

/**
 * Generate a unique slug by appending a number if necessary
 */
export function generateUniqueSlug(
  baseSlug: string,
  existingSlugs: string[]
): string {
  let slug = baseSlug;
  let counter = 1;

  while (existingSlugs.includes(slug) || isReservedSlug(slug)) {
    // Ensure we don't exceed 63 characters
    const suffix = `-${counter}`;
    const maxBaseLength = 63 - suffix.length;
    slug = baseSlug.slice(0, maxBaseLength) + suffix;
    counter++;

    // Safety check to prevent infinite loops
    if (counter > 1000) {
      throw new Error('Unable to generate unique slug');
    }
  }

  return slug;
}

/**
 * Get subdomain configuration info for display
 */
export interface SubdomainConfig {
  slug: string;
  subdomainUrl: string;
  subdomainDisplay: string;
  baseDomain: string;
  protocol: 'https' | 'http';
  isProduction: boolean;
}

export function getSubdomainConfig(slug: string): SubdomainConfig {
  const baseDomain = getBaseDomain();
  const protocol = getProtocol();
  const isProduction = !baseDomain.includes('localhost');

  return {
    slug,
    subdomainUrl: getSubdomainUrl(slug),
    subdomainDisplay: getSubdomainDisplay(slug),
    baseDomain,
    protocol,
    isProduction,
  };
}

/**
 * DNS configuration instructions for custom domains
 */
export interface DnsConfigInstructions {
  cname: {
    host: string;
    value: string;
  };
  txt?: {
    host: string;
    value: string;
  };
}

export function getDnsInstructions(
  tenantSlug: string,
  customDomain: string
): DnsConfigInstructions {
  const baseDomain = getBaseDomain();

  return {
    cname: {
      host: customDomain.split('.')[0] || '@',
      value: `${tenantSlug}.${baseDomain}`,
    },
    txt: {
      host: `_verification.${customDomain.split('.').slice(1).join('.')}`,
      value: `car-rental-verify=${tenantSlug}`,
    },
  };
}
