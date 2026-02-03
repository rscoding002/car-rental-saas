/**
 * Formatting Utilities
 *
 * Locale-aware formatting for dates, times, currency, and numbers.
 * Uses Intl APIs for proper localization.
 */

import type { Locale } from './constants';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Date format presets
 */
export type DateFormatPreset = 'short' | 'medium' | 'long' | 'full';

/**
 * Time format presets
 */
export type TimeFormatPreset = 'short' | 'medium' | 'long';

/**
 * Date/time input type
 */
export type DateInput = Date | string | number;

// ============================================================================
// DATE FORMAT OPTIONS
// ============================================================================

/**
 * Predefined date format options
 */
const dateFormatOptions: Record<DateFormatPreset, Intl.DateTimeFormatOptions> = {
  short: {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  },
  medium: {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  },
  long: {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  },
  full: {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  },
};

/**
 * Predefined time format options
 */
const timeFormatOptions: Record<TimeFormatPreset, Intl.DateTimeFormatOptions> = {
  short: {
    hour: '2-digit',
    minute: '2-digit',
  },
  medium: {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  },
  long: {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse date input to Date object
 */
function parseDate(date: DateInput): Date {
  if (date instanceof Date) return date;
  if (typeof date === 'number') return new Date(date);
  return new Date(date);
}

/**
 * Get locale string for Intl APIs
 * Maps our locale codes to proper BCP 47 locale tags
 */
function getIntlLocale(locale: Locale | string): string {
  const localeMap: Record<string, string> = {
    en: 'en-US',
    lt: 'lt-LT',
    ru: 'ru-RU',
  };
  return localeMap[locale] || locale;
}

/**
 * Check if a date is valid
 */
export function isValidDate(date: DateInput): boolean {
  const d = parseDate(date);
  return !isNaN(d.getTime());
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Format a date for display
 *
 * @param date - Date to format
 * @param locale - Locale code (en, lt, ru)
 * @param preset - Format preset or custom options
 * @param timezone - Optional timezone (e.g., 'Europe/Vilnius')
 *
 * @example
 * formatDate(new Date(), 'en', 'short') // "1/31/2026"
 * formatDate(new Date(), 'lt', 'long')  // "2026 m. sausio 31 d."
 * formatDate(new Date(), 'en', 'full')  // "Friday, January 31, 2026"
 */
export function formatDate(
  date: DateInput,
  locale: Locale | string = 'en',
  preset: DateFormatPreset | Intl.DateTimeFormatOptions = 'medium',
  timezone?: string
): string {
  const d = parseDate(date);
  if (!isValidDate(d)) return '';

  const options: Intl.DateTimeFormatOptions =
    typeof preset === 'string' ? { ...dateFormatOptions[preset] } : { ...preset };

  if (timezone) {
    options.timeZone = timezone;
  }

  return d.toLocaleDateString(getIntlLocale(locale), options);
}

/**
 * Format a time for display
 *
 * @param date - Date/time to format
 * @param locale - Locale code
 * @param preset - Format preset or custom options
 * @param timezone - Optional timezone
 *
 * @example
 * formatTime(new Date(), 'en', 'short') // "2:30 PM"
 * formatTime(new Date(), 'lt', 'short') // "14:30"
 */
export function formatTime(
  date: DateInput,
  locale: Locale | string = 'en',
  preset: TimeFormatPreset | Intl.DateTimeFormatOptions = 'short',
  timezone?: string
): string {
  const d = parseDate(date);
  if (!isValidDate(d)) return '';

  const options: Intl.DateTimeFormatOptions =
    typeof preset === 'string' ? { ...timeFormatOptions[preset] } : { ...preset };

  if (timezone) {
    options.timeZone = timezone;
  }

  return d.toLocaleTimeString(getIntlLocale(locale), options);
}

/**
 * Format a date and time for display
 *
 * @param date - Date/time to format
 * @param locale - Locale code
 * @param datePreset - Date format preset
 * @param timePreset - Time format preset
 * @param timezone - Optional timezone
 *
 * @example
 * formatDateTime(new Date(), 'en') // "Jan 31, 2026, 2:30 PM"
 */
export function formatDateTime(
  date: DateInput,
  locale: Locale | string = 'en',
  datePreset: DateFormatPreset = 'medium',
  timePreset: TimeFormatPreset = 'short',
  timezone?: string
): string {
  const d = parseDate(date);
  if (!isValidDate(d)) return '';

  const options: Intl.DateTimeFormatOptions = {
    ...dateFormatOptions[datePreset],
    ...timeFormatOptions[timePreset],
  };

  if (timezone) {
    options.timeZone = timezone;
  }

  return d.toLocaleString(getIntlLocale(locale), options);
}

/**
 * Format date with custom pattern using Intl
 *
 * @param date - Date to format
 * @param locale - Locale code
 * @param options - Custom Intl.DateTimeFormatOptions
 * @param timezone - Optional timezone
 */
export function formatDateCustom(
  date: DateInput,
  locale: Locale | string,
  options: Intl.DateTimeFormatOptions,
  timezone?: string
): string {
  const d = parseDate(date);
  if (!isValidDate(d)) return '';

  const finalOptions = timezone ? { ...options, timeZone: timezone } : options;
  return d.toLocaleString(getIntlLocale(locale), finalOptions);
}

// ============================================================================
// RELATIVE TIME FORMATTING
// ============================================================================

/**
 * Format a relative time (e.g., "2 days ago", "in 3 hours")
 *
 * @param date - Date to compare against now
 * @param locale - Locale code
 * @param options - RelativeTimeFormat options
 *
 * @example
 * formatRelativeTime(yesterday, 'en') // "yesterday"
 * formatRelativeTime(twoDaysAgo, 'lt') // "prieš 2 dienas"
 */
export function formatRelativeTime(
  date: DateInput,
  locale: Locale | string = 'en',
  options?: Intl.RelativeTimeFormatOptions
): string {
  const d = parseDate(date);
  if (!isValidDate(d)) return '';

  const now = new Date();
  const diffInSeconds = Math.floor((d.getTime() - now.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(getIntlLocale(locale), {
    numeric: 'auto',
    ...options,
  });

  const divisions: { amount: number; name: Intl.RelativeTimeFormatUnit }[] = [
    { amount: 60, name: 'seconds' },
    { amount: 60, name: 'minutes' },
    { amount: 24, name: 'hours' },
    { amount: 7, name: 'days' },
    { amount: 4.34524, name: 'weeks' },
    { amount: 12, name: 'months' },
    { amount: Number.POSITIVE_INFINITY, name: 'years' },
  ];

  let duration = diffInSeconds;

  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.name);
    }
    duration /= division.amount;
  }

  return rtf.format(Math.round(duration), 'years');
}

/**
 * Format time until/since a date
 * More precise than formatRelativeTime for short durations
 *
 * @example
 * formatTimeDistance(inTwoHours, 'en') // "in 2 hours"
 */
export function formatTimeDistance(
  date: DateInput,
  locale: Locale | string = 'en'
): string {
  const d = parseDate(date);
  if (!isValidDate(d)) return '';

  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const absDiffMs = Math.abs(diffMs);
  const isFuture = diffMs > 0;

  const rtf = new Intl.RelativeTimeFormat(getIntlLocale(locale), {
    numeric: 'always',
  });

  // Less than 1 minute
  if (absDiffMs < 60 * 1000) {
    const seconds = Math.round(absDiffMs / 1000);
    return rtf.format(isFuture ? seconds : -seconds, 'seconds');
  }

  // Less than 1 hour
  if (absDiffMs < 60 * 60 * 1000) {
    const minutes = Math.round(absDiffMs / (60 * 1000));
    return rtf.format(isFuture ? minutes : -minutes, 'minutes');
  }

  // Less than 1 day
  if (absDiffMs < 24 * 60 * 60 * 1000) {
    const hours = Math.round(absDiffMs / (60 * 60 * 1000));
    return rtf.format(isFuture ? hours : -hours, 'hours');
  }

  // Less than 30 days
  if (absDiffMs < 30 * 24 * 60 * 60 * 1000) {
    const days = Math.round(absDiffMs / (24 * 60 * 60 * 1000));
    return rtf.format(isFuture ? days : -days, 'days');
  }

  // Use months
  const months = Math.round(absDiffMs / (30 * 24 * 60 * 60 * 1000));
  return rtf.format(isFuture ? months : -months, 'months');
}

// ============================================================================
// DURATION FORMATTING
// ============================================================================

/**
 * Format a duration in days/hours
 * Useful for rental periods
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @param locale - Locale code
 *
 * @example
 * formatDuration(pickup, return, 'en') // "3 days, 2 hours"
 */
export function formatDuration(
  startDate: DateInput,
  endDate: DateInput,
  locale: Locale | string = 'en'
): string {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!isValidDate(start) || !isValidDate(end)) return '';

  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return '';

  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  // Use Intl.NumberFormat for proper pluralization
  const parts: string[] = [];

  if (days > 0) {
    const dayLabel = new Intl.PluralRules(getIntlLocale(locale)).select(days);
    const dayLabels: Record<string, Record<Intl.LDMLPluralRule, string>> = {
      'en-US': { zero: 'days', one: 'day', two: 'days', few: 'days', many: 'days', other: 'days' },
      'lt-LT': { zero: 'dienų', one: 'diena', two: 'dienos', few: 'dienos', many: 'dienų', other: 'dienų' },
      'ru-RU': { zero: 'дней', one: 'день', two: 'дня', few: 'дня', many: 'дней', other: 'дней' },
    };
    const intlLocale = getIntlLocale(locale);
    const labels = dayLabels[intlLocale] || dayLabels['en-US'];
    parts.push(`${days} ${labels[dayLabel]}`);
  }

  if (hours > 0) {
    const hourLabel = new Intl.PluralRules(getIntlLocale(locale)).select(hours);
    const hourLabels: Record<string, Record<Intl.LDMLPluralRule, string>> = {
      'en-US': { zero: 'hours', one: 'hour', two: 'hours', few: 'hours', many: 'hours', other: 'hours' },
      'lt-LT': { zero: 'valandų', one: 'valanda', two: 'valandos', few: 'valandos', many: 'valandų', other: 'valandų' },
      'ru-RU': { zero: 'часов', one: 'час', two: 'часа', few: 'часа', many: 'часов', other: 'часов' },
    };
    const intlLocale = getIntlLocale(locale);
    const labels = hourLabels[intlLocale] || hourLabels['en-US'];
    parts.push(`${hours} ${labels[hourLabel]}`);
  }

  if (parts.length === 0) {
    return locale === 'lt' ? 'mažiau nei valanda' : locale === 'ru' ? 'менее часа' : 'less than an hour';
  }

  // Join with locale-appropriate separator
  const separator = locale === 'en' ? ', ' : ', ';
  return parts.join(separator);
}

/**
 * Format duration in days only (rounds up)
 * Used for pricing calculations
 *
 * @example
 * formatDurationDays(pickup, return, 'en') // "3 days"
 */
export function formatDurationDays(
  startDate: DateInput,
  endDate: DateInput,
  locale: Locale | string = 'en'
): string {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!isValidDate(start) || !isValidDate(end)) return '';

  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return '';

  // Round up to nearest day
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  const dayLabel = new Intl.PluralRules(getIntlLocale(locale)).select(days);
  const dayLabels: Record<string, Record<Intl.LDMLPluralRule, string>> = {
    'en-US': { zero: 'days', one: 'day', two: 'days', few: 'days', many: 'days', other: 'days' },
    'lt-LT': { zero: 'dienų', one: 'diena', two: 'dienos', few: 'dienos', many: 'dienų', other: 'dienų' },
    'ru-RU': { zero: 'дней', one: 'день', two: 'дня', few: 'дня', many: 'дней', other: 'дней' },
  };
  const intlLocale = getIntlLocale(locale);
  const labels = dayLabels[intlLocale] || dayLabels['en-US'];

  return `${days} ${labels[dayLabel]}`;
}

// ============================================================================
// DATE RANGE FORMATTING
// ============================================================================

/**
 * Format a date range
 * Intelligently handles same-day, same-month, same-year ranges
 *
 * @param startDate - Range start
 * @param endDate - Range end
 * @param locale - Locale code
 * @param preset - Date format preset
 *
 * @example
 * formatDateRange(jan1, jan5, 'en') // "Jan 1 - 5, 2026"
 * formatDateRange(jan1, feb5, 'en') // "Jan 1 - Feb 5, 2026"
 */
export function formatDateRange(
  startDate: DateInput,
  endDate: DateInput,
  locale: Locale | string = 'en',
  preset: DateFormatPreset = 'medium'
): string {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!isValidDate(start) || !isValidDate(end)) return '';

  const intlLocale = getIntlLocale(locale);

  // Same day
  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()
  ) {
    return formatDate(start, locale, preset);
  }

  // Use Intl.DateTimeFormat.formatRange if available
  try {
    const formatter = new Intl.DateTimeFormat(intlLocale, dateFormatOptions[preset]);
    if ('formatRange' in formatter) {
      return formatter.formatRange(start, end);
    }
  } catch {
    // Fall back to manual formatting
  }

  // Manual fallback
  const separator = locale === 'lt' ? ' – ' : locale === 'ru' ? ' – ' : ' - ';
  return `${formatDate(start, locale, preset)}${separator}${formatDate(end, locale, preset)}`;
}

/**
 * Format a date and time range
 * Used for booking displays
 *
 * @example
 * formatDateTimeRange(pickup, return, 'en') // "Jan 1, 2:00 PM - Jan 5, 10:00 AM"
 */
export function formatDateTimeRange(
  startDate: DateInput,
  endDate: DateInput,
  locale: Locale | string = 'en',
  timezone?: string
): string {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!isValidDate(start) || !isValidDate(end)) return '';

  const startStr = formatDateTime(start, locale, 'medium', 'short', timezone);
  const endStr = formatDateTime(end, locale, 'medium', 'short', timezone);

  const separator = locale === 'lt' ? ' – ' : locale === 'ru' ? ' – ' : ' - ';
  return `${startStr}${separator}${endStr}`;
}

// ============================================================================
// SPECIAL DATE FORMATS
// ============================================================================

/**
 * Format date for booking reference display
 * Compact format for IDs and references
 *
 * @example
 * formatBookingDate(new Date()) // "260131" (YYMMDD)
 */
export function formatBookingDate(date: DateInput): string {
  const d = parseDate(date);
  if (!isValidDate(d)) return '';

  const year = d.getFullYear().toString().slice(-2);
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');

  return `${year}${month}${day}`;
}

/**
 * Format date for ISO string (YYYY-MM-DD)
 * Used for form inputs and API calls
 */
export function formatISODate(date: DateInput): string {
  const d = parseDate(date);
  if (!isValidDate(d)) return '';

  return d.toISOString().split('T')[0];
}

/**
 * Format date and time for ISO string
 * Used for API calls
 */
export function formatISODateTime(date: DateInput): string {
  const d = parseDate(date);
  if (!isValidDate(d)) return '';

  return d.toISOString();
}

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

/**
 * Format currency for display
 *
 * @param amount - Amount to format
 * @param currency - Currency code (default: EUR)
 * @param locale - Locale code
 *
 * @example
 * formatCurrency(99.99, 'EUR', 'en') // "€99.99"
 * formatCurrency(99.99, 'EUR', 'lt') // "99,99 €"
 */
export function formatCurrency(
  amount: number,
  currency: string = 'EUR',
  locale: Locale | string = 'en'
): string {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format currency without decimals for whole amounts
 *
 * @example
 * formatCurrencyCompact(100, 'EUR', 'en') // "€100"
 */
export function formatCurrencyCompact(
  amount: number,
  currency: string = 'EUR',
  locale: Locale | string = 'en'
): string {
  const isWholeNumber = amount % 1 === 0;
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: 'currency',
    currency,
    minimumFractionDigits: isWholeNumber ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get currency symbol for a currency code
 *
 * @example
 * getCurrencySymbol('EUR', 'en') // "€"
 * getCurrencySymbol('USD', 'en') // "$"
 */
export function getCurrencySymbol(
  currency: string = 'EUR',
  locale: Locale | string = 'en'
): string {
  const parts = new Intl.NumberFormat(getIntlLocale(locale), {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
  }).formatToParts(0);

  const symbolPart = parts.find((part) => part.type === 'currency');
  return symbolPart?.value || currency;
}

/**
 * Format price per day (for rental rates)
 *
 * @example
 * formatPricePerDay(50, 'EUR', 'en') // "€50/day"
 * formatPricePerDay(50, 'EUR', 'lt') // "50 €/d."
 */
export function formatPricePerDay(
  amount: number,
  currency: string = 'EUR',
  locale: Locale | string = 'en'
): string {
  const price = formatCurrencyCompact(amount, currency, locale);
  const perDayLabels: Record<string, string> = {
    en: '/day',
    lt: '/d.',
    ru: '/день',
  };
  return `${price}${perDayLabels[locale] || perDayLabels.en}`;
}

/**
 * Format price per hour (for hourly rental rates)
 *
 * @example
 * formatPricePerHour(10, 'EUR', 'en') // "€10/hour"
 */
export function formatPricePerHour(
  amount: number,
  currency: string = 'EUR',
  locale: Locale | string = 'en'
): string {
  const price = formatCurrencyCompact(amount, currency, locale);
  const perHourLabels: Record<string, string> = {
    en: '/hour',
    lt: '/val.',
    ru: '/час',
  };
  return `${price}${perHourLabels[locale] || perHourLabels.en}`;
}

/**
 * Format starting price (with "from" prefix)
 *
 * @example
 * formatPriceFrom(50, 'EUR', 'en') // "from €50"
 * formatPriceFrom(50, 'EUR', 'lt') // "nuo 50 €"
 */
export function formatPriceFrom(
  amount: number,
  currency: string = 'EUR',
  locale: Locale | string = 'en'
): string {
  const price = formatCurrencyCompact(amount, currency, locale);
  const fromLabels: Record<string, string> = {
    en: 'from ',
    lt: 'nuo ',
    ru: 'от ',
  };
  return `${fromLabels[locale] || fromLabels.en}${price}`;
}

/**
 * Format price range
 *
 * @example
 * formatPriceRange(50, 100, 'EUR', 'en') // "€50 - €100"
 */
export function formatPriceRange(
  minAmount: number,
  maxAmount: number,
  currency: string = 'EUR',
  locale: Locale | string = 'en'
): string {
  const minPrice = formatCurrencyCompact(minAmount, currency, locale);
  const maxPrice = formatCurrencyCompact(maxAmount, currency, locale);
  const separator = locale === 'lt' || locale === 'ru' ? ' – ' : ' - ';
  return `${minPrice}${separator}${maxPrice}`;
}

/**
 * Format discount amount
 *
 * @example
 * formatDiscount(15, 'percentage', 'en') // "-15%"
 * formatDiscount(25, 'fixed', 'en', 'EUR') // "-€25"
 */
export function formatDiscount(
  value: number,
  type: 'percentage' | 'fixed',
  locale: Locale | string = 'en',
  currency: string = 'EUR'
): string {
  if (type === 'percentage') {
    return `-${formatPercent(value / 100, locale)}`;
  }
  return `-${formatCurrencyCompact(value, currency, locale)}`;
}

/**
 * Format savings amount (positive display)
 *
 * @example
 * formatSavings(25, 'EUR', 'en') // "Save €25"
 */
export function formatSavings(
  amount: number,
  currency: string = 'EUR',
  locale: Locale | string = 'en'
): string {
  const price = formatCurrencyCompact(amount, currency, locale);
  const saveLabels: Record<string, string> = {
    en: 'Save ',
    lt: 'Sutaupykite ',
    ru: 'Экономия ',
  };
  return `${saveLabels[locale] || saveLabels.en}${price}`;
}

/**
 * Format price with strikethrough original (for discounts)
 * Returns both original and discounted price
 *
 * @example
 * formatPriceWithDiscount(100, 85, 'EUR', 'en')
 * // { original: "€100", discounted: "€85", savings: "€15" }
 */
export function formatPriceWithDiscount(
  originalAmount: number,
  discountedAmount: number,
  currency: string = 'EUR',
  locale: Locale | string = 'en'
): { original: string; discounted: string; savings: string; savingsPercent: string } {
  const original = formatCurrency(originalAmount, currency, locale);
  const discounted = formatCurrency(discountedAmount, currency, locale);
  const savingsAmount = originalAmount - discountedAmount;
  const savings = formatCurrencyCompact(savingsAmount, currency, locale);
  const savingsPercent = formatPercent(savingsAmount / originalAmount, locale);

  return { original, discounted, savings, savingsPercent };
}

/**
 * Format accounting currency (negative in parentheses)
 *
 * @example
 * formatCurrencyAccounting(-50, 'EUR', 'en') // "(€50.00)"
 * formatCurrencyAccounting(50, 'EUR', 'en') // "€50.00"
 */
export function formatCurrencyAccounting(
  amount: number,
  currency: string = 'EUR',
  locale: Locale | string = 'en'
): string {
  const intlLocale = getIntlLocale(locale);

  // Try to use accounting sign display if supported
  try {
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency,
      signDisplay: 'exceptZero',
      currencySign: 'accounting',
    }).format(amount);
  } catch {
    // Fallback for browsers that don't support currencySign: 'accounting'
    if (amount < 0) {
      const formatted = formatCurrency(Math.abs(amount), currency, locale);
      return `(${formatted})`;
    }
    return formatCurrency(amount, currency, locale);
  }
}

/**
 * Parse currency string to number
 * Handles different locale formats
 *
 * @example
 * parseCurrency("€99.99", 'en') // 99.99
 * parseCurrency("99,99 €", 'lt') // 99.99
 */
export function parseCurrency(value: string, locale: Locale | string = 'en'): number | null {
  if (!value) return null;

  // Remove currency symbols and whitespace
  let cleaned = value.replace(/[€$£¥₽\s]/g, '');

  // Handle locale-specific decimal separators
  const intlLocale = getIntlLocale(locale);
  if (intlLocale === 'lt-LT' || intlLocale === 'ru-RU') {
    // These locales use comma as decimal separator and space/dot as thousands
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // English uses period as decimal, comma as thousands
    cleaned = cleaned.replace(/,/g, '');
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

// ============================================================================
// NUMBER FORMATTING
// ============================================================================

/**
 * Format a number with locale-specific separators
 *
 * @example
 * formatNumber(1234567.89, 'en') // "1,234,567.89"
 * formatNumber(1234567.89, 'lt') // "1 234 567,89"
 */
export function formatNumber(
  value: number,
  locale: Locale | string = 'en',
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(getIntlLocale(locale), options).format(value);
}

/**
 * Format a percentage
 *
 * @example
 * formatPercent(0.15, 'en') // "15%"
 */
export function formatPercent(
  value: number,
  locale: Locale | string = 'en',
  decimals: number = 0
): string {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
