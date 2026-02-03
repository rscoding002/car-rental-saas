/**
 * i18n Module Exports
 *
 * Re-exports all i18n utilities for convenient importing.
 */

// Configuration exports
export {
  addLocaleToPathname,
  currencyFormatOptions,
  dateFnsLocales,
  defaultLocale,
  getAlternateLanguages,
  getLocaleFromPathname,
  isValidLocale,
  localeFlags,
  localeMetadata,
  localeNames,
  locales,
  numberFormatOptions,
  removeLocaleFromPathname,
} from './config';
export type { Locale } from './config';

// Re-export next-intl hooks and utilities for convenience
export {
  useTranslations,
  useLocale,
  useMessages,
  useNow,
  useTimeZone,
  useFormatter,
} from 'next-intl';

// Server-side utilities
export { getTranslations, getLocale, getMessages, getNow, getTimeZone, getFormatter } from 'next-intl/server';

// Navigation utilities (will be configured in routing.ts)
export { Link, useRouter, usePathname, redirect, permanentRedirect } from './routing';
