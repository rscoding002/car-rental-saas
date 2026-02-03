/**
 * Email Sending Functions with Template Selection
 *
 * High-level email sending functions that select appropriate templates
 * based on the email type and automatically generate subject lines.
 *
 * @example
 * // Send booking confirmation email
 * await sendTemplateEmail('booking-confirmation', {
 *   to: 'customer@example.com',
 *   data: { ... booking confirmation props ... },
 *   locale: 'en',
 * });
 */

import * as React from 'react';
import { sendEmail, type SendEmailResult, type SendEmailOptions } from './client';

/**
 * Check if email sending is enabled (Resend API key is configured)
 */
export function isEmailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}
import {
  BookingConfirmationEmail,
  BookingModificationEmail,
  BookingCancellationEmail,
  BookingReminderEmail,
  WelcomeEmail,
  type BookingConfirmationEmailProps,
  type BookingModificationEmailProps,
  type BookingCancellationEmailProps,
  type BookingReminderEmailProps,
  type WelcomeEmailProps,
} from '@/emails';

// ============================================================================
// TYPES
// ============================================================================

/**
 * All available email template types
 */
export type EmailTemplateType =
  | 'booking-confirmation'
  | 'booking-modification'
  | 'booking-cancellation'
  | 'booking-reminder'
  | 'welcome';

/**
 * Map template types to their props
 */
export interface EmailTemplatePropsMap {
  'booking-confirmation': BookingConfirmationEmailProps;
  'booking-modification': BookingModificationEmailProps;
  'booking-cancellation': BookingCancellationEmailProps;
  'booking-reminder': BookingReminderEmailProps;
  'welcome': WelcomeEmailProps;
}

/**
 * Options for sending a template email
 */
export interface SendTemplateEmailOptions<T extends EmailTemplateType> {
  /** Recipient email address(es) */
  to: string | string[];

  /** Template-specific data/props */
  data: EmailTemplatePropsMap[T];

  /** Language/locale code (e.g., 'en', 'lt', 'ru') */
  locale?: string;

  /** Optional subject line override (auto-generated if not provided) */
  subject?: string;

  /** Optional from email override */
  from?: string;

  /** Optional from name override */
  fromName?: string;

  /** Optional reply-to email */
  replyTo?: string;

  /** Optional CC recipients */
  cc?: string | string[];

  /** Optional BCC recipients */
  bcc?: string | string[];

  /** Optional tags for categorization */
  tags?: Array<{ name: string; value: string }>;
}

/**
 * Result of sending a template email
 */
export interface SendTemplateEmailResult extends SendEmailResult {
  /** The template type that was used */
  template: EmailTemplateType;
  /** The generated subject line */
  subject: string;
}

// ============================================================================
// SUBJECT LINE GENERATION
// ============================================================================

/**
 * Generate email subject line based on template type and data
 */
function generateSubject<T extends EmailTemplateType>(
  template: T,
  data: EmailTemplatePropsMap[T],
  locale: string = 'en'
): string {
  const companyName = data.branding?.name || 'Car Rental';

  switch (template) {
    case 'booking-confirmation': {
      const props = data as BookingConfirmationEmailProps;
      return `Booking Confirmed: ${props.reference} - ${props.vehicle.make} ${props.vehicle.model} | ${companyName}`;
    }

    case 'booking-modification': {
      const props = data as BookingModificationEmailProps;
      return `Booking Modified: ${props.reference} | ${companyName}`;
    }

    case 'booking-cancellation': {
      const props = data as BookingCancellationEmailProps;
      const hasRefund = props.refund.refundAmount > 0;
      return hasRefund
        ? `Booking Cancelled: ${props.reference} - Refund Processing | ${companyName}`
        : `Booking Cancelled: ${props.reference} | ${companyName}`;
    }

    case 'booking-reminder': {
      const props = data as BookingReminderEmailProps;
      const timeText = props.timeUntilPickup.days === 0 ? 'Tomorrow' : `In ${props.timeUntilPickup.days} days`;
      return `Reminder: Your Rental Pickup is ${timeText} - ${props.reference} | ${companyName}`;
    }

    case 'welcome': {
      const props = data as WelcomeEmailProps;
      return props.requiresVerification
        ? `Welcome to ${companyName} - Please Verify Your Email`
        : `Welcome to ${companyName}!`;
    }

    default:
      return `Message from ${companyName}`;
  }
}

// ============================================================================
// TEMPLATE RENDERING
// ============================================================================

/**
 * Get the React email component for a template type
 */
function getEmailComponent<T extends EmailTemplateType>(
  template: T,
  data: EmailTemplatePropsMap[T]
): React.ReactElement {
  switch (template) {
    case 'booking-confirmation':
      return React.createElement(BookingConfirmationEmail, data as BookingConfirmationEmailProps);

    case 'booking-modification':
      return React.createElement(BookingModificationEmail, data as BookingModificationEmailProps);

    case 'booking-cancellation':
      return React.createElement(BookingCancellationEmail, data as BookingCancellationEmailProps);

    case 'booking-reminder':
      return React.createElement(BookingReminderEmail, data as BookingReminderEmailProps);

    case 'welcome':
      return React.createElement(WelcomeEmail, data as WelcomeEmailProps);

    default:
      throw new Error(`Unknown email template: ${template}`);
  }
}

// ============================================================================
// MAIN SEND FUNCTION
// ============================================================================

/**
 * Send an email using a specific template
 *
 * This function automatically:
 * - Selects the correct email template component
 * - Generates an appropriate subject line
 * - Adds locale to template props
 * - Sends the email via Resend
 *
 * @example
 * // Send booking confirmation
 * const result = await sendTemplateEmail('booking-confirmation', {
 *   to: 'customer@example.com',
 *   data: {
 *     branding: getTenantEmailBranding(tenant),
 *     reference: 'CAR-20260202-ABC1',
 *     customer: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
 *     vehicle: { make: 'Toyota', model: 'Corolla', year: 2024, ... },
 *     // ... other required props
 *   },
 *   locale: 'en',
 * });
 *
 * @example
 * // Send welcome email with custom subject
 * await sendTemplateEmail('welcome', {
 *   to: user.email,
 *   data: {
 *     branding,
 *     user: { firstName: user.first_name, email: user.email },
 *     urls: { browseFleet: '/fleet', login: '/login' },
 *   },
 *   subject: 'Welcome aboard!',
 * });
 */
export async function sendTemplateEmail<T extends EmailTemplateType>(
  template: T,
  options: SendTemplateEmailOptions<T>
): Promise<SendTemplateEmailResult> {
  const {
    to,
    data,
    locale = 'en',
    subject: customSubject,
    from,
    fromName,
    replyTo,
    cc,
    bcc,
    tags,
  } = options;

  // Add locale to data if supported by the template
  const dataWithLocale = {
    ...data,
    locale,
  };

  // Generate subject line if not provided
  const subject = customSubject || generateSubject(template, data, locale);

  // Get the React email component
  const reactComponent = getEmailComponent(template, dataWithLocale as EmailTemplatePropsMap[T]);

  // Build email options
  const emailOptions: SendEmailOptions = {
    to,
    subject,
    react: reactComponent,
    from,
    fromName,
    replyTo,
    cc,
    bcc,
    tags: [
      { name: 'template', value: template },
      { name: 'locale', value: locale },
      ...(tags || []),
    ],
  };

  // Send the email
  const result = await sendEmail(emailOptions);

  return {
    ...result,
    template,
    subject,
  };
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Send a booking confirmation email
 */
export async function sendBookingConfirmationEmail(
  to: string,
  data: BookingConfirmationEmailProps,
  options?: Partial<Omit<SendTemplateEmailOptions<'booking-confirmation'>, 'to' | 'data'>>
): Promise<SendTemplateEmailResult> {
  return sendTemplateEmail('booking-confirmation', {
    to,
    data,
    ...options,
  });
}

/**
 * Send a booking modification email
 */
export async function sendBookingModificationEmail(
  to: string,
  data: BookingModificationEmailProps,
  options?: Partial<Omit<SendTemplateEmailOptions<'booking-modification'>, 'to' | 'data'>>
): Promise<SendTemplateEmailResult> {
  return sendTemplateEmail('booking-modification', {
    to,
    data,
    ...options,
  });
}

/**
 * Send a booking cancellation email
 */
export async function sendBookingCancellationEmail(
  to: string,
  data: BookingCancellationEmailProps,
  options?: Partial<Omit<SendTemplateEmailOptions<'booking-cancellation'>, 'to' | 'data'>>
): Promise<SendTemplateEmailResult> {
  return sendTemplateEmail('booking-cancellation', {
    to,
    data,
    ...options,
  });
}

/**
 * Send a booking reminder email
 */
export async function sendBookingReminderEmail(
  to: string,
  data: BookingReminderEmailProps,
  options?: Partial<Omit<SendTemplateEmailOptions<'booking-reminder'>, 'to' | 'data'>>
): Promise<SendTemplateEmailResult> {
  return sendTemplateEmail('booking-reminder', {
    to,
    data,
    ...options,
  });
}

/**
 * Send a welcome email
 */
export async function sendWelcomeEmail(
  to: string,
  data: WelcomeEmailProps,
  options?: Partial<Omit<SendTemplateEmailOptions<'welcome'>, 'to' | 'data'>>
): Promise<SendTemplateEmailResult> {
  return sendTemplateEmail('welcome', {
    to,
    data,
    ...options,
  });
}

// ============================================================================
// BATCH SENDING
// ============================================================================

/**
 * Send multiple template emails of the same type
 */
export async function sendTemplateEmailBatch<T extends EmailTemplateType>(
  template: T,
  emails: Array<{
    to: string | string[];
    data: EmailTemplatePropsMap[T];
    locale?: string;
    subject?: string;
  }>
): Promise<SendTemplateEmailResult[]> {
  const results = await Promise.all(
    emails.map((email) =>
      sendTemplateEmail(template, {
        to: email.to,
        data: email.data,
        locale: email.locale,
        subject: email.subject,
      })
    )
  );

  return results;
}
