/**
 * Email Client - Resend Integration
 *
 * Provides email sending functionality using Resend API.
 * Supports both production and development environments.
 *
 * @see https://resend.com/docs
 */

import { Resend } from 'resend';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Email configuration from environment variables
 */
export const emailConfig = {
  /** Resend API key */
  apiKey: process.env.RESEND_API_KEY || '',

  /** Default sender email address */
  fromEmail: process.env.EMAIL_FROM || 'noreply@example.com',

  /** Default sender name */
  fromName: process.env.EMAIL_FROM_NAME || 'Car Rental',

  /** Whether email sending is enabled */
  isEnabled: !!process.env.RESEND_API_KEY,

  /** Development mode - logs emails instead of sending */
  isDevelopment: process.env.NODE_ENV === 'development',
} as const;

// ============================================================================
// CLIENT INITIALIZATION
// ============================================================================

/**
 * Resend client instance
 * Initialized lazily to avoid issues when API key is not set
 */
let resendClient: Resend | null = null;

/**
 * Get or create Resend client instance
 */
export function getEmailClient(): Resend {
  if (!resendClient) {
    if (!emailConfig.apiKey) {
      throw new Error(
        'RESEND_API_KEY environment variable is not set. ' +
          'Email sending is disabled. Get your API key from https://resend.com/api-keys'
      );
    }
    resendClient = new Resend(emailConfig.apiKey);
  }
  return resendClient;
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Email recipient
 */
export interface EmailRecipient {
  email: string;
  name?: string;
}

/**
 * Email attachment
 */
export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

/**
 * Email send options
 */
export interface SendEmailOptions {
  /** Recipient email or array of emails */
  to: string | string[] | EmailRecipient | EmailRecipient[];

  /** Email subject */
  subject: string;

  /** HTML content */
  html?: string;

  /** Plain text content (fallback) */
  text?: string;

  /** React component for email body */
  react?: React.ReactElement;

  /** Custom sender email (overrides default) */
  from?: string;

  /** Custom sender name */
  fromName?: string;

  /** Reply-to email address */
  replyTo?: string;

  /** CC recipients */
  cc?: string | string[];

  /** BCC recipients */
  bcc?: string | string[];

  /** Email attachments */
  attachments?: EmailAttachment[];

  /** Custom headers */
  headers?: Record<string, string>;

  /** Tags for categorization */
  tags?: Array<{ name: string; value: string }>;

  /** Schedule send time (ISO 8601) */
  scheduledAt?: string;
}

/**
 * Email send result
 */
export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format email recipient for Resend
 */
function formatRecipient(recipient: string | EmailRecipient): string {
  if (typeof recipient === 'string') {
    return recipient;
  }
  if (recipient.name) {
    return `${recipient.name} <${recipient.email}>`;
  }
  return recipient.email;
}

/**
 * Format recipients array
 */
function formatRecipients(
  recipients: string | string[] | EmailRecipient | EmailRecipient[]
): string[] {
  if (Array.isArray(recipients)) {
    return recipients.map(formatRecipient);
  }
  return [formatRecipient(recipients)];
}

/**
 * Build sender string
 */
function buildFromAddress(fromEmail?: string, fromName?: string): string {
  const email = fromEmail || emailConfig.fromEmail;
  const name = fromName || emailConfig.fromName;

  if (name) {
    return `${name} <${email}>`;
  }
  return email;
}

// ============================================================================
// SEND FUNCTION
// ============================================================================

/**
 * Send an email using Resend
 *
 * @example
 * // Simple text email
 * await sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   text: 'Welcome to our service.',
 * });
 *
 * @example
 * // HTML email with React component
 * await sendEmail({
 *   to: { email: 'user@example.com', name: 'John' },
 *   subject: 'Your booking is confirmed',
 *   react: <BookingConfirmationEmail booking={booking} />,
 * });
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  // Check if email is enabled
  if (!emailConfig.isEnabled) {
    console.warn('[Email] Skipping email send - RESEND_API_KEY not configured');
    return {
      success: false,
      error: 'Email sending is not configured',
    };
  }

  // In development, optionally log instead of sending
  if (emailConfig.isDevelopment && process.env.EMAIL_DEBUG === 'true') {
    console.log('[Email] Development mode - would send:', {
      to: options.to,
      subject: options.subject,
      from: buildFromAddress(options.from, options.fromName),
    });
    return {
      success: true,
      id: `dev-${Date.now()}`,
    };
  }

  try {
    const client = getEmailClient();

    const { data, error } = await client.emails.send({
      from: buildFromAddress(options.from, options.fromName),
      to: formatRecipients(options.to),
      subject: options.subject,
      html: options.html,
      text: options.text,
      react: options.react,
      replyTo: options.replyTo,
      cc: options.cc ? formatRecipients(options.cc) : undefined,
      bcc: options.bcc ? formatRecipients(options.bcc) : undefined,
      attachments: options.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        content_type: att.contentType,
      })),
      headers: options.headers,
      tags: options.tags,
      scheduledAt: options.scheduledAt,
    });

    if (error) {
      console.error('[Email] Send failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('[Email] Sent successfully:', data?.id);
    return {
      success: true,
      id: data?.id,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Email] Send error:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================================================
// BATCH SEND
// ============================================================================

/**
 * Send multiple emails in batch
 */
export async function sendEmailBatch(
  emails: SendEmailOptions[]
): Promise<SendEmailResult[]> {
  const results = await Promise.all(emails.map((email) => sendEmail(email)));
  return results;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if email sending is available
 */
export function isEmailEnabled(): boolean {
  return emailConfig.isEnabled;
}

/**
 * Get the default sender address
 */
export function getDefaultSender(): string {
  return buildFromAddress();
}
