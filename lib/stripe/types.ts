/**
 * Stripe-related TypeScript types
 */

import type Stripe from 'stripe';

// ============================================================================
// Checkout Session Types
// ============================================================================

export interface CreateCheckoutSessionInput {
  /** Booking reference number */
  bookingReference: string;
  /** Tenant ID for multi-tenant isolation */
  tenantId: string;
  /** Customer email for Stripe receipt */
  customerEmail: string;
  /** Customer name */
  customerName: string;
  /** URL to redirect after successful payment */
  successUrl: string;
  /** URL to redirect if payment is cancelled */
  cancelUrl: string;
  /** Line items for the checkout */
  lineItems: CheckoutLineItem[];
  /** Optional metadata to attach to the session */
  metadata?: Record<string, string>;
  /** Currency code (default: EUR) */
  currency?: string;
  /** Locale for the Stripe checkout page */
  locale?: Stripe.Checkout.SessionCreateParams.Locale;
}

export interface CheckoutLineItem {
  /** Item name (e.g., "Vehicle Rental - Toyota Corolla") */
  name: string;
  /** Item description */
  description?: string;
  /** Unit amount in cents */
  unitAmount: number;
  /** Quantity */
  quantity: number;
  /** Optional image URLs */
  images?: string[];
}

export interface CheckoutSessionResult {
  /** Stripe session ID */
  sessionId: string;
  /** Stripe checkout URL for redirect */
  url: string | null;
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface WebhookEventResult {
  /** Whether the webhook was processed successfully */
  success: boolean;
  /** Event type that was processed */
  eventType: string;
  /** Any error message */
  error?: string;
  /** Additional data from processing */
  data?: Record<string, unknown>;
}

export interface PaymentSuccessData {
  /** Stripe session ID */
  sessionId: string;
  /** Payment intent ID */
  paymentIntentId: string | null;
  /** Booking reference from metadata */
  bookingReference: string;
  /** Tenant ID from metadata */
  tenantId: string;
  /** Amount paid in cents */
  amountTotal: number;
  /** Currency */
  currency: string;
  /** Customer email */
  customerEmail: string | null;
  /** Customer name */
  customerName: string | null;
  /** Payment status */
  paymentStatus: string;
}

export interface RefundData {
  /** Stripe refund ID */
  refundId: string;
  /** Original payment intent ID */
  paymentIntentId: string;
  /** Refund amount in cents */
  amount: number;
  /** Currency */
  currency: string;
  /** Refund status */
  status: string;
  /** Reason for refund */
  reason?: string;
}

// ============================================================================
// Refund Types
// ============================================================================

export interface CreateRefundInput {
  /** Stripe payment intent ID */
  paymentIntentId: string;
  /** Amount to refund in cents (if not provided, full refund) */
  amount?: number;
  /** Reason for the refund */
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  /** Metadata to attach to the refund */
  metadata?: Record<string, string>;
}

export interface RefundResult {
  /** Stripe refund ID */
  refundId: string;
  /** Refund status */
  status: string;
  /** Amount refunded in cents */
  amount: number;
  /** Currency */
  currency: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class StripeError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'StripeError';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/** Supported currencies for the platform */
export type SupportedCurrency = 'eur' | 'usd' | 'gbp';

/** Stripe checkout locale mapping */
export const LOCALE_TO_STRIPE_LOCALE: Record<
  string,
  Stripe.Checkout.SessionCreateParams.Locale
> = {
  en: 'en',
  lt: 'lt',
  ru: 'ru',
} as const;

/** Default currency for the platform */
export const DEFAULT_CURRENCY: SupportedCurrency = 'eur';

/** Minimum amount in cents for Stripe */
export const MINIMUM_CHARGE_AMOUNT = 50; // 0.50 EUR/USD minimum
