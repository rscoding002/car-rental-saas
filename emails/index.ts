/**
 * Email Templates Module
 *
 * Exports email components, utilities, templates, and translations.
 *
 * Components:
 * - BaseLayout: Main email layout with header, footer, branding
 * - EmailButton: Styled CTA buttons
 * - EmailHeading: Heading components (h1, h2, h3)
 * - EmailText: Styled text paragraphs
 * - EmailCard: Content containers
 * - EmailDetailRow: Key-value pair rows
 * - EmailDivider: Horizontal separators
 * - EmailAlert: Alert/notice boxes
 *
 * Templates:
 * - BookingConfirmationEmail: Sent after successful booking
 * - BookingModificationEmail: Sent when booking is modified
 * - BookingCancellationEmail: Sent when booking is cancelled
 * - BookingReminderEmail: Sent before rental pickup
 * - WelcomeEmail: Sent after registration
 *
 * Translations:
 * - getEmailTranslations(locale): Get all translations for a locale
 * - translate(locale, section, key, params): Get a specific translation
 * - createScopedTranslator(locale, section): Create a scoped translator
 *
 * @example
 * import {
 *   BaseLayout,
 *   EmailButton,
 *   BookingConfirmationEmail,
 *   getTenantEmailBranding,
 *   getEmailTranslations,
 * } from '@/emails';
 *
 * const t = getEmailTranslations('lt');
 * console.log(t.bookingConfirmation.alertTitle); // "Rezervacija patvirtinta!"
 */

// Components
export * from './components';

// Utilities (includes branding and translations)
export * from './utils';

// Templates
export { BookingConfirmationEmail } from './booking-confirmation';
export type { BookingConfirmationEmailProps } from './booking-confirmation';

export { BookingModificationEmail } from './booking-modification';
export type { BookingModificationEmailProps } from './booking-modification';

export { BookingCancellationEmail } from './booking-cancellation';
export type { BookingCancellationEmailProps } from './booking-cancellation';

export { BookingReminderEmail } from './booking-reminder';
export type { BookingReminderEmailProps } from './booking-reminder';

export { WelcomeEmail } from './welcome';
export type { WelcomeEmailProps } from './welcome';

// Re-export types
export type { TenantBrandingProps, BaseLayoutProps } from './components';
