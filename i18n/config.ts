import { LOCALES, DEFAULT_LOCALE, type Locale } from '@/lib/utils/constants';

/**
 * i18n Configuration
 *
 * Central configuration for internationalization using next-intl.
 * Supports English (en), Lithuanian (lt), and Russian (ru).
 */

// Re-export locales from constants for consistency
export const locales = LOCALES;
export const defaultLocale = DEFAULT_LOCALE;
export type { Locale };

/**
 * Locale display names in their native language
 */
export const localeNames: Record<Locale, string> = {
  en: 'English',
  lt: 'Lietuvių',
  ru: 'Русский',
};

/**
 * Locale flags (emoji) for display
 */
export const localeFlags: Record<Locale, string> = {
  en: '🇬🇧',
  lt: '🇱🇹',
  ru: '🇷🇺',
};

/**
 * Locale metadata for SEO
 */
export const localeMetadata: Record<Locale, { lang: string; dir: 'ltr' | 'rtl' }> = {
  en: { lang: 'en', dir: 'ltr' },
  lt: { lang: 'lt', dir: 'ltr' },
  ru: { lang: 'ru', dir: 'ltr' },
};

/**
 * Check if a string is a valid locale
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Get locale from pathname
 * Extracts the locale segment from a URL path
 */
export function getLocaleFromPathname(pathname: string): Locale | null {
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && isValidLocale(firstSegment)) {
    return firstSegment;
  }

  return null;
}

/**
 * Remove locale prefix from pathname
 */
export function removeLocaleFromPathname(pathname: string): string {
  const locale = getLocaleFromPathname(pathname);

  if (locale) {
    const segments = pathname.split('/').filter(Boolean);
    segments.shift(); // Remove locale segment
    return '/' + segments.join('/');
  }

  return pathname;
}

/**
 * Add locale prefix to pathname
 */
export function addLocaleToPathname(pathname: string, locale: Locale): string {
  const cleanPath = removeLocaleFromPathname(pathname);
  return `/${locale}${cleanPath === '/' ? '' : cleanPath}`;
}

/**
 * Get alternate language URLs for SEO hreflang tags
 */
export function getAlternateLanguages(
  pathname: string,
  baseUrl: string
): { locale: Locale; url: string }[] {
  const cleanPath = removeLocaleFromPathname(pathname);

  return locales.map((locale) => ({
    locale,
    url: `${baseUrl}/${locale}${cleanPath === '/' ? '' : cleanPath}`,
  }));
}

/**
 * Date-fns locale imports mapping
 * Used for locale-aware date formatting with date-fns library
 * Returns date-fns Locale objects (different from our i18n Locale type)
 */
export const dateFnsLocales = {
  en: async () => (await import('date-fns/locale/en-US')).enUS,
  lt: async () => (await import('date-fns/locale/lt')).lt,
  ru: async () => (await import('date-fns/locale/ru')).ru,
} as const;

/**
 * Get date-fns locale object for a given locale code
 * @param locale - Our app locale code
 * @returns date-fns Locale object
 */
export async function getDateFnsLocale(locale: Locale) {
  const localeLoader = dateFnsLocales[locale] || dateFnsLocales.en;
  return localeLoader();
}

/**
 * Number formatting options per locale
 */
export const numberFormatOptions: Record<Locale, Intl.NumberFormatOptions> = {
  en: {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  },
  lt: {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  },
  ru: {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  },
};

/**
 * Currency formatting options per locale
 * Default currency is EUR
 */
export const currencyFormatOptions: Record<Locale, Intl.NumberFormatOptions> = {
  en: {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
  lt: {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
  ru: {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
};
