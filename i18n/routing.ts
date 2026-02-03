import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

import { locales, defaultLocale } from './config';

/**
 * Routing Configuration
 *
 * Defines the routing behavior for next-intl including:
 * - Supported locales
 * - Default locale
 * - Locale prefix strategy
 */
export const routing = defineRouting({
  // List of all supported locales
  locales,

  // Default locale when none is detected
  defaultLocale,

  // Always show locale prefix in URL (e.g., /en/about, /lt/about)
  // Options: 'always' | 'as-needed' | 'never'
  localePrefix: 'always',
});

/**
 * Navigation Utilities
 *
 * Locale-aware navigation components and hooks.
 * These automatically handle locale prefixes in URLs.
 *
 * Usage:
 * ```tsx
 * import { Link, useRouter, usePathname } from '@/i18n/routing';
 *
 * // Link automatically adds locale prefix
 * <Link href="/about">About</Link>
 *
 * // Router with locale support
 * const router = useRouter();
 * router.push('/contact');
 *
 * // Get current pathname without locale
 * const pathname = usePathname();
 * ```
 */
export const {
  Link,
  redirect,
  permanentRedirect,
  usePathname,
  useRouter,
} = createNavigation(routing);

/**
 * Type for locale-aware href
 */
export type LocaleHref =
  | string
  | {
      pathname: string;
      query?: Record<string, string | string[]>;
    };
