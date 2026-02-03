import Stripe from 'stripe';
import {
  type CreateCheckoutSessionInput,
  type CheckoutSessionResult,
  type CreateRefundInput,
  type RefundResult,
  StripeError,
  DEFAULT_CURRENCY,
  LOCALE_TO_STRIPE_LOCALE,
  MINIMUM_CHARGE_AMOUNT,
} from './types';

// ============================================================================
// Stripe Server Instance
// ============================================================================

let stripeInstance: Stripe | null = null;

/**
 * Get the Stripe server instance
 * Should only be called on the server side
 */
export function getStripeServer(): Stripe {
  if (stripeInstance) {
    return stripeInstance;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new StripeError(
      'Missing STRIPE_SECRET_KEY environment variable',
      'config_error',
      500
    );
  }

  stripeInstance = new Stripe(secretKey, {
    typescript: true,
    appInfo: {
      name: 'Car Rental SaaS',
      version: '0.1.0',
    },
  });

  return stripeInstance;
}

// ============================================================================
// Checkout Session
// ============================================================================

/**
 * Create a Stripe Checkout session for a booking
 */
export async function createCheckoutSession(
  input: CreateCheckoutSessionInput
): Promise<CheckoutSessionResult> {
  const stripe = getStripeServer();

  // Validate minimum amount
  const totalAmount = input.lineItems.reduce(
    (sum, item) => sum + item.unitAmount * item.quantity,
    0
  );

  if (totalAmount < MINIMUM_CHARGE_AMOUNT) {
    throw new StripeError(
      `Minimum charge amount is ${MINIMUM_CHARGE_AMOUNT / 100} ${input.currency || DEFAULT_CURRENCY}`,
      'amount_too_small',
      400
    );
  }

  // Map locale to Stripe locale
  const stripeLocale =
    LOCALE_TO_STRIPE_LOCALE[input.locale?.toString() || 'en'] || 'en';

  // Create line items for Stripe
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    input.lineItems.map((item) => ({
      price_data: {
        currency: input.currency || DEFAULT_CURRENCY,
        product_data: {
          name: item.name,
          description: item.description,
          images: item.images?.slice(0, 8), // Stripe allows max 8 images
        },
        unit_amount: item.unitAmount,
      },
      quantity: item.quantity,
    }));

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      customer_email: input.customerEmail,
      locale: stripeLocale,
      metadata: {
        bookingReference: input.bookingReference,
        tenantId: input.tenantId,
        customerName: input.customerName,
        ...input.metadata,
      },
      payment_intent_data: {
        metadata: {
          bookingReference: input.bookingReference,
          tenantId: input.tenantId,
        },
      },
      // Expiration: 30 minutes
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      throw new StripeError(
        error.message,
        error.code,
        error.statusCode || 500
      );
    }
    throw error;
  }
}

/**
 * Retrieve a checkout session by ID
 */
export async function getCheckoutSession(
  sessionId: string
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeServer();

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'line_items'],
    });
    return session;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      throw new StripeError(error.message, error.code, error.statusCode || 500);
    }
    throw error;
  }
}

// ============================================================================
// Refunds
// ============================================================================

/**
 * Create a refund for a payment
 */
export async function createRefund(
  input: CreateRefundInput
): Promise<RefundResult> {
  const stripe = getStripeServer();

  try {
    const refund = await stripe.refunds.create({
      payment_intent: input.paymentIntentId,
      amount: input.amount, // If undefined, full refund
      reason: input.reason,
      metadata: input.metadata,
    });

    return {
      refundId: refund.id,
      status: refund.status || 'pending',
      amount: refund.amount,
      currency: refund.currency,
    };
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      throw new StripeError(error.message, error.code, error.statusCode || 500);
    }
    throw error;
  }
}

/**
 * Get refund by ID
 */
export async function getRefund(refundId: string): Promise<Stripe.Refund> {
  const stripe = getStripeServer();

  try {
    return await stripe.refunds.retrieve(refundId);
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      throw new StripeError(error.message, error.code, error.statusCode || 500);
    }
    throw error;
  }
}

// ============================================================================
// Payment Intents
// ============================================================================

/**
 * Get payment intent by ID
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripeServer();

  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      throw new StripeError(error.message, error.code, error.statusCode || 500);
    }
    throw error;
  }
}

// ============================================================================
// Webhook Utilities
// ============================================================================

/**
 * Verify and construct a Stripe webhook event
 * @param payload - Raw request body as string
 * @param signature - Stripe-Signature header value
 * @returns The verified Stripe event
 */
export function constructWebhookEvent(
  payload: string,
  signature: string
): Stripe.Event {
  const stripe = getStripeServer();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new StripeError(
      'Missing STRIPE_WEBHOOK_SECRET environment variable',
      'config_error',
      500
    );
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      throw new StripeError(
        'Invalid webhook signature',
        'signature_verification_failed',
        400
      );
    }
    throw error;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if Stripe server is properly configured
 */
export function isStripeServerConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Convert amount from decimal to cents
 * @param amount - Amount in decimal (e.g., 99.99)
 * @returns Amount in cents (e.g., 9999)
 */
export function toStripeAmount(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert amount from cents to decimal
 * @param amount - Amount in cents (e.g., 9999)
 * @returns Amount in decimal (e.g., 99.99)
 */
export function fromStripeAmount(amount: number): number {
  return amount / 100;
}
