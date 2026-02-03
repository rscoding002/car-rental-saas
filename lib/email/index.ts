/**
 * Email Module
 *
 * Exports email client, configuration, sending utilities, and template components.
 *
 * @example
 * import { sendTemplateEmail, isEmailEnabled } from '@/lib/email';
 *
 * if (isEmailEnabled()) {
 *   await sendTemplateEmail('booking-confirmation', {
 *     to: 'customer@example.com',
 *     data: { ... },
 *     locale: 'en',
 *   });
 * }
 *
 * @example
 * // Convenience functions
 * import { sendBookingConfirmationEmail, sendWelcomeEmail } from '@/lib/email';
 *
 * await sendBookingConfirmationEmail('customer@example.com', confirmationData);
 * await sendWelcomeEmail('user@example.com', welcomeData);
 */

// Client and low-level sending
export {
  sendEmail,
  sendEmailBatch,
  getEmailClient,
  isEmailEnabled,
  getDefaultSender,
  emailConfig,
} from './client';

// Types from client
export type {
  SendEmailOptions,
  SendEmailResult,
  EmailRecipient,
  EmailAttachment,
} from './client';

// Template-based email sending
export {
  sendTemplateEmail,
  sendTemplateEmailBatch,
  sendBookingConfirmationEmail,
  sendBookingModificationEmail,
  sendBookingCancellationEmail,
  sendBookingReminderEmail,
  sendWelcomeEmail,
} from './send';

// Types from send
export type {
  EmailTemplateType,
  EmailTemplatePropsMap,
  SendTemplateEmailOptions,
  SendTemplateEmailResult,
} from './send';

// Booking-specific email helpers
export {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendBookingReminder,
  sendBookingModification,
  buildConfirmationEmailProps,
  buildCancellationEmailProps,
  buildReminderEmailProps,
  buildModificationEmailProps,
} from './booking-emails';

// Types from booking-emails
export type {
  SendBookingEmailResult,
  BookingEmailContext,
} from './booking-emails';

// User-specific email helpers
export {
  sendWelcome,
  sendWelcomeByEmail,
  buildWelcomeEmailProps,
} from './user-emails';

// Types from user-emails
export type {
  SendUserEmailResult,
  UserEmailContext,
} from './user-emails';

// Re-export email template components and utilities
export {
  // Components
  BaseLayout,
  EmailButton,
  EmailHeading,
  EmailText,
  EmailCard,
  EmailDetailRow,
  EmailDivider,
  EmailAlert,
  // Utilities
  getTenantEmailBranding,
  getBrandingWithOverrides,
  DEFAULT_EMAIL_BRANDING,
} from '@/emails';

// Re-export component types
export type {
  TenantBrandingProps,
  BaseLayoutProps,
  EmailButtonProps,
  EmailHeadingProps,
  EmailTextProps,
  EmailCardProps,
  EmailDetailRowProps,
  EmailDividerProps,
  EmailAlertProps,
} from '@/emails';
