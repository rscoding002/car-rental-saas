/**
 * Email Utilities
 *
 * Utility functions for email templates.
 */

export {
  getTenantEmailBranding,
  getBrandingWithOverrides,
  DEFAULT_EMAIL_BRANDING,
} from './branding';

// Re-export translations from parent folder
export {
  getEmailTranslations,
  translate,
  createScopedTranslator,
  en as emailTranslationsEn,
  lt as emailTranslationsLt,
  ru as emailTranslationsRu,
} from '../translations';

export type { EmailTranslations } from '../translations';
