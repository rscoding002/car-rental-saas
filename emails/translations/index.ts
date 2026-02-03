/**
 * Email Translations
 *
 * Server-side translation system for email templates.
 * Since emails are rendered server-side without React context,
 * we use a simple key-value translation system.
 *
 * @example
 * const t = getEmailTranslations('lt');
 * t.bookingConfirmation.alertTitle // "Rezervacija patvirtinta!"
 */

import type { Locale } from '@/lib/utils/constants';
import { en } from './en';
import { lt } from './lt';
import { ru } from './ru';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Structure of email translation sections
 */
export interface EmailTranslationSection {
  [key: string]: string;
}

/**
 * Email translation dictionary type - uses structural typing
 * to allow different string values across locales while maintaining
 * the same key structure
 */
export interface EmailTranslations {
  common: EmailTranslationSection;
  bookingConfirmation: EmailTranslationSection;
  bookingModification: EmailTranslationSection;
  bookingCancellation: EmailTranslationSection;
  bookingReminder: EmailTranslationSection;
  welcome: EmailTranslationSection;
}

/**
 * Nested key paths in translation object
 */
export type TranslationSectionKey = keyof EmailTranslations;

// ============================================================================
// TRANSLATION MAP
// ============================================================================

const translations: Record<Locale, EmailTranslations> = {
  en: en as EmailTranslations,
  lt: lt as EmailTranslations,
  ru: ru as EmailTranslations,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get email translations for a specific locale
 *
 * @param locale - The locale code (en, lt, ru)
 * @returns Translation object with all email strings
 *
 * @example
 * const t = getEmailTranslations('lt');
 * console.log(t.booking.confirmed); // "Rezervacija patvirtinta!"
 */
export function getEmailTranslations(locale: string = 'en'): EmailTranslations {
  const validLocale = (locale in translations ? locale : 'en') as Locale;
  return translations[validLocale];
}

/**
 * Get a specific translation with interpolation
 *
 * @param locale - The locale code
 * @param section - The section of translations (e.g., 'booking', 'common')
 * @param key - The key within the section
 * @param params - Optional interpolation parameters
 *
 * @example
 * translate('en', 'booking', 'hello', { name: 'John' }); // "Hello John!"
 */
export function translate(
  locale: string = 'en',
  section: keyof EmailTranslations,
  key: string,
  params?: Record<string, string | number>
): string {
  const t = getEmailTranslations(locale);
  const sectionData = t[section];

  if (!sectionData || typeof sectionData !== 'object') {
    return key;
  }

  let text = (sectionData as Record<string, string>)[key] || key;

  // Simple interpolation: replace {param} with value
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
    });
  }

  return text;
}

/**
 * Create a scoped translator for a specific section
 *
 * @example
 * const t = createScopedTranslator('lt', 'booking');
 * t('confirmed'); // "Rezervacija patvirtinta!"
 * t('hello', { name: 'Jonas' }); // "Sveiki, Jonas!"
 */
export function createScopedTranslator(
  locale: string,
  section: keyof EmailTranslations
) {
  return (key: string, params?: Record<string, string | number>): string => {
    return translate(locale, section, key, params);
  };
}

// Re-export translation objects for direct access
export { en, lt, ru };
