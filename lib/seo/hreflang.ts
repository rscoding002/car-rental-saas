/**
 * Hreflang Link Generation Utilities
 *
 * Generates hreflang link tags for SEO to help search engines
 * understand language/region variants of pages.
 */

import type { Locale } from '@/lib/utils/constants';
import { LOCALES, DEFAULT_LOCALE } from '@/lib/utils/constants';
import type { Metadata } from 'next';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Hreflang link object
 */
export interface HreflangLink {
  /** Language code (e.g., 'en', 'lt', 'ru') */
  hreflang: string;
  /** Full URL for this language variant */
  href: string;
}

/**
 * Language alternate object for Next.js metadata
 */
export interface LanguageAlternate {
  /** Full URL */
  url: string;
  /** Language code */
  hrefLang: string;
}

/**
 * Options for hreflang generation
 */
export interface HreflangOptions {
  /** Base URL (e.g., 'https://example.com') */
  baseUrl: string;
  /** Current pathname (e.g., '/about' or '/en/about') */
  pathname: string;
  /** List of enabled locales (defaults to all) */
  enabledLocales?: Locale[];
  /** Default locale for x-default (defaults to 'en') */
  defaultLocale?: Locale;
  /** Include x-default tag */
  includeXDefault?: boolean;
}

// ============================================================================
// LOCALE MAPPING
// ============================================================================

/**
 * Map our locale codes to BCP 47 language tags
 * Used for proper hreflang values
 */
const localeToHreflang: Record<Locale, string> = {
  en: 'en',
  lt: 'lt',
  ru: 'ru',
};

/**
 * Map our locale codes to region-specific BCP 47 tags
 * Use these if you need region-specific targeting
 */
const localeToRegionalHreflang: Record<Locale, string> = {
  en: 'en-US',
  lt: 'lt-LT',
  ru: 'ru-RU',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Remove locale prefix from pathname
 */
function removeLocalePrefix(pathname: string): string {
  const localePattern = new RegExp(`^/(${LOCALES.join('|')})(?=/|$)`);
  return pathname.replace(localePattern, '') || '/';
}

/**
 * Build URL for a specific locale
 */
function buildLocaleUrl(baseUrl: string, pathname: string, locale: Locale): string {
  const cleanPath = removeLocalePrefix(pathname);
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const pathSuffix = cleanPath === '/' ? '' : cleanPath;
  return `${normalizedBase}/${locale}${pathSuffix}`;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Generate hreflang links for a page
 *
 * @param options - Generation options
 * @returns Array of hreflang link objects
 *
 * @example
 * ```ts
 * const links = generateHreflangLinks({
 *   baseUrl: 'https://example.com',
 *   pathname: '/about',
 *   enabledLocales: ['en', 'lt'],
 * });
 * // Returns:
 * // [
 * //   { hreflang: 'en', href: 'https://example.com/en/about' },
 * //   { hreflang: 'lt', href: 'https://example.com/lt/about' },
 * //   { hreflang: 'x-default', href: 'https://example.com/en/about' },
 * // ]
 * ```
 */
export function generateHreflangLinks(options: HreflangOptions): HreflangLink[] {
  const {
    baseUrl,
    pathname,
    enabledLocales = [...LOCALES],
    defaultLocale = DEFAULT_LOCALE,
    includeXDefault = true,
  } = options;

  const links: HreflangLink[] = [];

  // Generate link for each enabled locale
  for (const locale of enabledLocales) {
    links.push({
      hreflang: localeToHreflang[locale],
      href: buildLocaleUrl(baseUrl, pathname, locale),
    });
  }

  // Add x-default pointing to default locale
  if (includeXDefault && enabledLocales.includes(defaultLocale)) {
    links.push({
      hreflang: 'x-default',
      href: buildLocaleUrl(baseUrl, pathname, defaultLocale),
    });
  }

  return links;
}

/**
 * Generate hreflang links with regional tags (e.g., en-US instead of en)
 *
 * Use this when you need to target specific regions.
 */
export function generateRegionalHreflangLinks(options: HreflangOptions): HreflangLink[] {
  const {
    baseUrl,
    pathname,
    enabledLocales = [...LOCALES],
    defaultLocale = DEFAULT_LOCALE,
    includeXDefault = true,
  } = options;

  const links: HreflangLink[] = [];

  for (const locale of enabledLocales) {
    links.push({
      hreflang: localeToRegionalHreflang[locale],
      href: buildLocaleUrl(baseUrl, pathname, locale),
    });
  }

  if (includeXDefault && enabledLocales.includes(defaultLocale)) {
    links.push({
      hreflang: 'x-default',
      href: buildLocaleUrl(baseUrl, pathname, defaultLocale),
    });
  }

  return links;
}

/**
 * Generate language alternates for Next.js Metadata API
 *
 * @param options - Generation options
 * @returns Object suitable for metadata.alternates.languages
 *
 * @example
 * ```ts
 * // In generateMetadata function:
 * export async function generateMetadata(): Promise<Metadata> {
 *   return {
 *     alternates: {
 *       canonical: '/about',
 *       languages: generateLanguageAlternates({
 *         baseUrl: 'https://example.com',
 *         pathname: '/about',
 *       }),
 *     },
 *   };
 * }
 * ```
 */
export function generateLanguageAlternates(
  options: Omit<HreflangOptions, 'includeXDefault'>
): Record<string, string> {
  const {
    baseUrl,
    pathname,
    enabledLocales = [...LOCALES],
    defaultLocale = DEFAULT_LOCALE,
  } = options;

  const languages: Record<string, string> = {};

  for (const locale of enabledLocales) {
    languages[localeToHreflang[locale]] = buildLocaleUrl(baseUrl, pathname, locale);
  }

  // Add x-default
  if (enabledLocales.includes(defaultLocale)) {
    languages['x-default'] = buildLocaleUrl(baseUrl, pathname, defaultLocale);
  }

  return languages;
}

/**
 * Generate full alternates object for Next.js Metadata API
 *
 * Includes canonical URL and language alternates.
 *
 * @example
 * ```ts
 * export async function generateMetadata({ params }): Promise<Metadata> {
 *   const { locale } = params;
 *   return {
 *     alternates: generateAlternatesMetadata({
 *       baseUrl: 'https://example.com',
 *       pathname: '/about',
 *       currentLocale: locale,
 *     }),
 *   };
 * }
 * ```
 */
export function generateAlternatesMetadata(
  options: HreflangOptions & { currentLocale: Locale }
): NonNullable<Metadata['alternates']> {
  const { baseUrl, pathname, currentLocale, enabledLocales = [...LOCALES] } = options;

  return {
    canonical: buildLocaleUrl(baseUrl, pathname, currentLocale),
    languages: generateLanguageAlternates({
      ...options,
      enabledLocales,
    }),
  };
}

/**
 * Generate HTML link tags string for hreflang
 *
 * Useful for manual injection or non-Next.js contexts.
 *
 * @example
 * ```ts
 * const linkTags = generateHreflangHtml({
 *   baseUrl: 'https://example.com',
 *   pathname: '/about',
 * });
 * // Returns:
 * // '<link rel="alternate" hreflang="en" href="https://example.com/en/about" />\n...'
 * ```
 */
export function generateHreflangHtml(options: HreflangOptions): string {
  const links = generateHreflangLinks(options);

  return links
    .map((link) => `<link rel="alternate" hreflang="${link.hreflang}" href="${link.href}" />`)
    .join('\n');
}

/**
 * Get canonical URL for a specific locale
 */
export function getCanonicalUrl(
  baseUrl: string,
  pathname: string,
  locale: Locale
): string {
  return buildLocaleUrl(baseUrl, pathname, locale);
}

/**
 * Get all alternate URLs for a page
 *
 * Returns an array of objects with locale and URL,
 * useful for rendering alternate links in components.
 */
export function getAlternateUrls(
  baseUrl: string,
  pathname: string,
  enabledLocales: Locale[] = [...LOCALES]
): { locale: Locale; url: string }[] {
  return enabledLocales.map((locale) => ({
    locale,
    url: buildLocaleUrl(baseUrl, pathname, locale),
  }));
}

// ============================================================================
// HELPER FOR SERVER COMPONENTS
// ============================================================================

/**
 * Helper to get base URL from environment
 */
export function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
  );
}

/**
 * Quick helper for generating metadata alternates in page components
 *
 * @example
 * ```ts
 * // app/[locale]/about/page.tsx
 * export async function generateMetadata({ params }) {
 *   const { locale } = await params;
 *   return {
 *     title: 'About Us',
 *     alternates: getPageAlternates('/about', locale),
 *   };
 * }
 * ```
 */
export function getPageAlternates(
  pathname: string,
  currentLocale: Locale,
  enabledLocales?: Locale[]
): NonNullable<Metadata['alternates']> {
  const baseUrl = getBaseUrl();

  return generateAlternatesMetadata({
    baseUrl,
    pathname,
    currentLocale,
    enabledLocales,
    defaultLocale: DEFAULT_LOCALE,
  });
}
