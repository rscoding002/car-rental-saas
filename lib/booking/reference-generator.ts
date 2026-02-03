/**
 * Booking Reference Number Generator
 *
 * Generates human-readable, unique booking reference numbers.
 * Supports multiple formats and collision detection.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Reference number format options
 */
export interface ReferenceConfig {
  /** Prefix (e.g., 'BK', 'RES', 'CAR') - max 4 chars */
  prefix: string;
  /** Length of the random portion (4-12) */
  length: number;
  /** Include date component (YYMMDD) */
  includeDate: boolean;
  /** Character set to use */
  charset: 'alphanumeric' | 'numeric' | 'alpha';
  /** Use uppercase only */
  uppercase: boolean;
  /** Separator between parts */
  separator: string;
}

/**
 * Default reference configuration
 */
export const DEFAULT_REFERENCE_CONFIG: ReferenceConfig = {
  prefix: 'BK',
  length: 8,
  includeDate: false,
  charset: 'alphanumeric',
  uppercase: true,
  separator: '-',
};

// ============================================================================
// CHARACTER SETS
// ============================================================================

/**
 * Alphanumeric characters excluding confusing ones (0/O, 1/I/L, 5/S)
 */
const ALPHANUMERIC_CHARS = 'ABCDEFGHJKMNPQRTUVWXYZ2346789';

/**
 * Numeric only characters (excluding 0 and 1 for readability)
 */
const NUMERIC_CHARS = '23456789';

/**
 * Alpha only characters (excluding confusing ones)
 */
const ALPHA_CHARS = 'ABCDEFGHJKMNPQRTUVWXYZ';

/**
 * Get character set based on config
 */
function getCharset(charset: ReferenceConfig['charset']): string {
  switch (charset) {
    case 'numeric':
      return NUMERIC_CHARS;
    case 'alpha':
      return ALPHA_CHARS;
    case 'alphanumeric':
    default:
      return ALPHANUMERIC_CHARS;
  }
}

// ============================================================================
// GENERATOR FUNCTIONS
// ============================================================================

/**
 * Generate a random string of specified length using given character set
 */
function generateRandomString(length: number, chars: string): string {
  let result = '';
  const charsLength = chars.length;

  // Use crypto.getRandomValues for better randomness if available
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % charsLength];
    }
  } else {
    // Fallback to Math.random
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * charsLength));
    }
  }

  return result;
}

/**
 * Get date component in YYMMDD format
 */
function getDateComponent(date: Date = new Date()): string {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Generate a booking reference number
 *
 * Format examples:
 * - BK-ABCD1234 (default)
 * - BK-260201-ABCD (with date)
 * - CAR-12345678 (numeric)
 * - RES-ABCDEFGH (alpha only)
 */
export function generateReference(config: Partial<ReferenceConfig> = {}): string {
  const {
    prefix = DEFAULT_REFERENCE_CONFIG.prefix,
    length = DEFAULT_REFERENCE_CONFIG.length,
    includeDate = DEFAULT_REFERENCE_CONFIG.includeDate,
    charset = DEFAULT_REFERENCE_CONFIG.charset,
    uppercase = DEFAULT_REFERENCE_CONFIG.uppercase,
    separator = DEFAULT_REFERENCE_CONFIG.separator,
  } = config;

  // Validate config
  const validPrefix = prefix.slice(0, 4).replace(/[^A-Za-z0-9]/g, '');
  const validLength = Math.max(4, Math.min(12, length));

  const chars = getCharset(charset);
  const parts: string[] = [];

  // Add prefix
  if (validPrefix) {
    parts.push(uppercase ? validPrefix.toUpperCase() : validPrefix);
  }

  // Add date component
  if (includeDate) {
    parts.push(getDateComponent());
  }

  // Add random portion
  const randomPart = generateRandomString(validLength, chars);
  parts.push(uppercase ? randomPart.toUpperCase() : randomPart);

  return parts.join(separator);
}

/**
 * Generate a booking reference with uniqueness check
 *
 * Retries up to maxAttempts times if a collision is detected
 */
export async function generateUniqueReference(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  config: Partial<ReferenceConfig> = {},
  maxAttempts: number = 5
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const reference = generateReference(config);

    // Check if reference exists
    const { count } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('reference', reference);

    if (count === 0) {
      return reference;
    }

    // If collision, wait a tiny bit before retry to ensure different random values
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  // If all attempts failed, generate a longer reference to reduce collision chance
  return generateReference({
    ...config,
    length: (config.length || DEFAULT_REFERENCE_CONFIG.length) + 4,
    includeDate: true,
  });
}

/**
 * Generate a short reference for display purposes
 * (first 4 chars of random portion)
 */
export function getShortReference(reference: string): string {
  const parts = reference.split('-');
  if (parts.length === 1) {
    return reference.slice(0, 8);
  }

  // Get prefix and first 4 chars of last part
  const prefix = parts[0];
  const lastPart = parts[parts.length - 1];
  return `${prefix}-${lastPart.slice(0, 4)}`;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate reference format
 */
export function isValidReference(reference: string): boolean {
  if (!reference || typeof reference !== 'string') {
    return false;
  }

  // Must be at least 4 characters
  if (reference.length < 4) {
    return false;
  }

  // Must only contain alphanumeric and separators
  const validPattern = /^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$/;
  return validPattern.test(reference);
}

/**
 * Parse a reference into its components
 */
export function parseReference(reference: string): {
  prefix: string | null;
  date: string | null;
  code: string;
  isValid: boolean;
} {
  if (!isValidReference(reference)) {
    return { prefix: null, date: null, code: reference, isValid: false };
  }

  const parts = reference.split('-');

  if (parts.length === 1) {
    return { prefix: null, date: null, code: parts[0], isValid: true };
  }

  if (parts.length === 2) {
    // Could be PREFIX-CODE or DATE-CODE
    const firstPart = parts[0];
    if (/^\d{6}$/.test(firstPart)) {
      // It's a date
      return { prefix: null, date: firstPart, code: parts[1], isValid: true };
    }
    // It's a prefix
    return { prefix: firstPart, date: null, code: parts[1], isValid: true };
  }

  if (parts.length === 3) {
    // PREFIX-DATE-CODE
    return { prefix: parts[0], date: parts[1], code: parts[2], isValid: true };
  }

  // More than 3 parts - just return the whole thing as code
  return { prefix: parts[0], date: null, code: parts.slice(1).join('-'), isValid: true };
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format reference for display (adds spacing for readability)
 */
export function formatReferenceForDisplay(reference: string): string {
  if (!reference) return '';

  // Already has separators, return as-is
  if (reference.includes('-')) {
    return reference.toUpperCase();
  }

  // Add separator every 4 characters
  return reference
    .toUpperCase()
    .replace(/(.{4})(?=.)/g, '$1-');
}

/**
 * Normalize reference for database lookup
 */
export function normalizeReference(reference: string): string {
  return reference
    .toUpperCase()
    .replace(/\s+/g, '') // Remove spaces
    .trim();
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

/**
 * Standard booking reference (BK-XXXXXXXX)
 */
export const BOOKING_REFERENCE_CONFIG: ReferenceConfig = {
  prefix: 'BK',
  length: 8,
  includeDate: false,
  charset: 'alphanumeric',
  uppercase: true,
  separator: '-',
};

/**
 * Short booking reference with date (BK-YYMMDD-XXXX)
 */
export const DATED_REFERENCE_CONFIG: ReferenceConfig = {
  prefix: 'BK',
  length: 4,
  includeDate: true,
  charset: 'alphanumeric',
  uppercase: true,
  separator: '-',
};

/**
 * Numeric only reference (for phone bookings)
 */
export const NUMERIC_REFERENCE_CONFIG: ReferenceConfig = {
  prefix: '',
  length: 10,
  includeDate: false,
  charset: 'numeric',
  uppercase: true,
  separator: '',
};

/**
 * Short reference for quick lookups
 */
export const SHORT_REFERENCE_CONFIG: ReferenceConfig = {
  prefix: 'BK',
  length: 6,
  includeDate: false,
  charset: 'alphanumeric',
  uppercase: true,
  separator: '-',
};

// ============================================================================
// EXPORT CONVENIENCE FUNCTION
// ============================================================================

/**
 * Quick generate booking reference (uses default config)
 * This is the main function to use for generating booking references
 */
export function generateBookingReference(): string {
  return generateReference(BOOKING_REFERENCE_CONFIG);
}

/**
 * Generate dated booking reference
 */
export function generateDatedReference(): string {
  return generateReference(DATED_REFERENCE_CONFIG);
}

/**
 * Generate numeric reference (for phone/walk-in bookings)
 */
export function generateNumericReference(): string {
  return generateReference(NUMERIC_REFERENCE_CONFIG);
}
