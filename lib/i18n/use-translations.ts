'use client';

import { useTranslations as useNextIntlTranslations, useLocale } from 'next-intl';
import { useCallback, useMemo } from 'react';

import type { Locale } from '@/lib/utils/constants';
import {
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDuration,
  formatPricePerDay,
  type DateFormatPreset,
  type TimeFormatPreset,
} from '@/lib/utils/format';

/**
 * Translation Namespaces
 *
 * Define all available translation namespaces here.
 * This provides type safety when using translations.
 */
export type TranslationNamespace =
  | 'common'
  | 'home'
  | 'auth'
  | 'language'
  | 'errors'
  | 'validation'
  | 'booking'
  | 'fleet'
  | 'account'
  | 'admin'
  | 'navigation'
  | 'footer';

/**
 * Translation function type from next-intl
 */
type TranslationFunction = ReturnType<typeof useNextIntlTranslations>;

/**
 * Enhanced translation hook return type
 */
export interface UseTranslationsReturn {
  /** Translation function for the specified namespace */
  t: TranslationFunction;
  /** Translation function for common namespace (always available) */
  tCommon: TranslationFunction;
  /** Current locale code */
  locale: Locale;
  /** Check if current locale matches */
  isLocale: (checkLocale: Locale) => boolean;

  // Formatting helpers bound to current locale
  /** Format a date with current locale */
  formatDate: (date: Date | string, preset?: DateFormatPreset) => string;
  /** Format a time with current locale */
  formatTime: (date: Date | string, preset?: TimeFormatPreset) => string;
  /** Format date and time with current locale */
  formatDateTime: (date: Date | string) => string;
  /** Format relative time with current locale */
  formatRelativeTime: (date: Date | string) => string;
  /** Format currency with current locale */
  formatCurrency: (amount: number, currency?: string) => string;
  /** Format number with current locale */
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  /** Format percent with current locale */
  formatPercent: (value: number, decimals?: number) => string;
  /** Format duration between two dates */
  formatDuration: (startDate: Date | string, endDate: Date | string) => string;
  /** Format price per day */
  formatPricePerDay: (amount: number, currency?: string) => string;
}

/**
 * Enhanced useTranslations hook
 *
 * Wraps next-intl's useTranslations with additional functionality:
 * - Always includes common namespace
 * - Provides locale-aware formatting helpers
 * - Type-safe namespace access
 *
 * @param namespace - Primary translation namespace
 * @returns Enhanced translation utilities
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { t, tCommon, formatCurrency, locale } = useTranslations('booking');
 *
 *   return (
 *     <div>
 *       <h1>{t('title')}</h1>
 *       <p>{formatCurrency(99.99)}</p>
 *       <button>{tCommon('submit')}</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTranslations(namespace: TranslationNamespace): UseTranslationsReturn {
  const locale = useLocale() as Locale;
  const t = useNextIntlTranslations(namespace);
  const tCommon = useNextIntlTranslations('common');

  // Memoize formatting functions bound to current locale
  const formatters = useMemo(() => ({
    formatDate: (date: Date | string, preset: DateFormatPreset = 'medium') =>
      formatDate(date, locale, preset),
    formatTime: (date: Date | string, preset: TimeFormatPreset = 'short') =>
      formatTime(date, locale, preset),
    formatDateTime: (date: Date | string) =>
      formatDateTime(date, locale),
    formatRelativeTime: (date: Date | string) =>
      formatRelativeTime(date, locale),
    formatCurrency: (amount: number, currency = 'EUR') =>
      formatCurrency(amount, currency, locale),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumber(value, locale, options),
    formatPercent: (value: number, decimals = 0) =>
      formatPercent(value, locale, decimals),
    formatDuration: (startDate: Date | string, endDate: Date | string) =>
      formatDuration(startDate, endDate, locale),
    formatPricePerDay: (amount: number, currency = 'EUR') =>
      formatPricePerDay(amount, currency, locale),
  }), [locale]);

  const isLocale = useCallback((checkLocale: Locale) => locale === checkLocale, [locale]);

  return {
    t,
    tCommon,
    locale,
    isLocale,
    ...formatters,
  };
}

/**
 * Hook to get only common translations
 *
 * Useful for utility components that only need common strings.
 *
 * @example
 * ```tsx
 * function LoadingSpinner() {
 *   const { t } = useCommonTranslations();
 *   return <span>{t('loading')}</span>;
 * }
 * ```
 */
export function useCommonTranslations() {
  const locale = useLocale() as Locale;
  const t = useNextIntlTranslations('common');

  return { t, locale };
}

/**
 * Hook to get translations for two namespaces
 *
 * Useful when a component needs both a specific namespace and common.
 *
 * @param namespace - Primary namespace
 * @returns Translation functions for both namespaces
 *
 * @example
 * ```tsx
 * function BookingForm() {
 *   const { t, tCommon, locale } = useDualTranslations('booking');
 *   return (
 *     <div>
 *       <h1>{t('title')}</h1>
 *       <button>{tCommon('submit')}</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useDualTranslations(namespace: TranslationNamespace) {
  const locale = useLocale() as Locale;
  const t = useNextIntlTranslations(namespace);
  const tCommon = useNextIntlTranslations('common');

  return { t, tCommon, locale };
}

/**
 * Hook to get current locale with utilities
 *
 * Minimal hook when you only need locale info, not translations.
 *
 * @example
 * ```tsx
 * function LocaleDisplay() {
 *   const { locale, isEnglish, isLithuanian } = useCurrentLocale();
 *   return <span>{locale}</span>;
 * }
 * ```
 */
export function useCurrentLocale() {
  const locale = useLocale() as Locale;

  return {
    locale,
    isEnglish: locale === 'en',
    isLithuanian: locale === 'lt',
    isRussian: locale === 'ru',
    isLocale: (checkLocale: Locale) => locale === checkLocale,
  };
}

/**
 * Hook for error translations
 *
 * Provides easy access to error messages with fallbacks.
 *
 * @example
 * ```tsx
 * const { getError } = useErrorTranslations();
 * return <Alert>{getError('network_error')}</Alert>;
 * ```
 */
export function useErrorTranslations() {
  const locale = useLocale() as Locale;
  const t = useNextIntlTranslations('errors');
  const tCommon = useNextIntlTranslations('common');

  const getError = useCallback(
    (key: string, fallback?: string) => {
      try {
        return t(key);
      } catch {
        return fallback || tCommon('error');
      }
    },
    [t, tCommon]
  );

  return { t, getError, locale };
}

/**
 * Hook for validation message translations
 *
 * Provides access to form validation messages.
 *
 * @example
 * ```tsx
 * const { getValidation } = useValidationTranslations();
 * return <span>{getValidation('required', { field: 'Email' })}</span>;
 * ```
 */
export function useValidationTranslations() {
  const locale = useLocale() as Locale;
  const t = useNextIntlTranslations('validation');

  const getValidation = useCallback(
    (key: string, values?: Record<string, string | number>) => {
      try {
        return t(key, values);
      } catch {
        return key;
      }
    },
    [t]
  );

  return { t, getValidation, locale };
}
