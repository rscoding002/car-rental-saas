/**
 * i18n Utilities
 *
 * Client-side internationalization hooks and utilities.
 * For configuration, see @/i18n/config.ts
 */

// Translation hooks
export {
  useTranslations,
  useCommonTranslations,
  useDualTranslations,
  useCurrentLocale,
  useErrorTranslations,
  useValidationTranslations,
  type TranslationNamespace,
  type UseTranslationsReturn,
} from './use-translations';
