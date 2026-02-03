import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { constructWebhookEvent } from '@/lib/stripe/server';
import { StripeError } from '@/lib/stripe/types';
import type { WebhookEventResult, PaymentSuccessData } from '@/lib/stripe/types';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getBookingByReference,
  confirmBooking,
  updateBookingStripeDetails,
  cancelBooking,
} from '@/lib/booking/queries';
import { sendBookingConfirmation } from '@/lib/email';

// ============================================================================
// Webhook Event Types
// ============================================================================

/**
 * Stripe events we handle in this webhook
 */
const HANDLED_EVENTS = [
  'checkout.session.completed',
  'checkout.session.expired',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.refunded',
  'charge.refund.updated',
] as const;

type HandledEventType = (typeof HANDLED_EVENTS)[number];

// ============================================================================
// POST /api/stripe/webhook
// ============================================================================

/**
 * Stripe webhook endpoint
 *
 * This route handles incoming Stripe webhook events for:
 * - checkout.session.completed: Payment successful, create booking
 * - checkout.session.expired: Session timed out, cleanup
 * - payment_intent.payment_failed: Payment failed, notify customer
 * - charge.refunded: Refund processed, update booking
 *
 * IMPORTANT: This endpoint must receive the raw body for signature verification.
 * Next.js App Router provides the raw body via request.text().
 */
export async function POST(request: NextRequest): Promise<NextResponse<WebhookEventResult>> {
  let event: Stripe.Event;

  try {
    // Get raw body for signature verification
    const payload = await request.text();

    // Get Stripe signature from headers
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[Stripe Webhook] Missing stripe-signature header');
      return NextResponse.json(
        {
          success: false,
          eventType: 'unknown',
          error: 'Missing stripe-signature header',
        },
        { status: 400 }
      );
    }

    // Verify webhook signature and construct event
    event = constructWebhookEvent(payload, signature);
  } catch (error) {
    console.error('[Stripe Webhook] Signature verification failed:', error);

    if (error instanceof StripeError) {
      return NextResponse.json(
        {
          success: false,
          eventType: 'unknown',
          error: error.message,
        },
        { status: error.statusCode || 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        eventType: 'unknown',
        error: 'Webhook signature verification failed',
      },
      { status: 400 }
    );
  }

  // Log event received
  console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

  // Check if we handle this event type
  if (!HANDLED_EVENTS.includes(event.type as HandledEventType)) {
    console.log(`[Stripe Webhook] Ignoring unhandled event type: ${event.type}`);
    return NextResponse.json({
      success: true,
      eventType: event.type,
      data: { message: 'Event type not handled' },
    });
  }

  try {
    // Route to appropriate handler
    const result = await handleWebhookEvent(event);
    return NextResponse.json(result);
  } catch (error) {
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, error);

    // Return 200 to prevent Stripe retries for non-recoverable errors
    // Log the error for investigation
    return NextResponse.json({
      success: false,
      eventType: event.type,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Route webhook events to appropriate handlers
 */
async function handleWebhookEvent(event: Stripe.Event): Promise<WebhookEventResult> {
  switch (event.type) {
    case 'checkout.session.completed':
      return handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);

    case 'checkout.session.expired':
      return handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);

    case 'payment_intent.succeeded':
      return handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);

    case 'payment_intent.payment_failed':
      return handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);

    case 'charge.refunded':
      return handleChargeRefunded(event.data.object as Stripe.Charge);

    case 'charge.refund.updated':
      return handleRefundUpdated(event.data.object as Stripe.Refund);

    default:
      return {
        success: true,
        eventType: event.type,
        data: { message: 'Event acknowledged but not processed' },
      };
  }
}

/**
 * Handle checkout.session.completed event
 * This is the main event for successful payments
 *
 * The booking was created in "pending" status before checkout.
 * This handler confirms the booking and stores payment details.
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<WebhookEventResult> {
  console.log(`[Stripe Webhook] Processing checkout.session.completed: ${session.id}`);

  // Extract booking data from session metadata
  const bookingReference = session.metadata?.bookingReference;
  const tenantId = session.metadata?.tenantId;
  const bookingId = session.metadata?.bookingId;

  if (!bookingReference || !tenantId) {
    console.error('[Stripe Webhook] Missing required metadata in session:', {
      sessionId: session.id,
      metadata: session.metadata,
    });
    return {
      success: false,
      eventType: 'checkout.session.completed',
      error: 'Missing booking reference or tenant ID in session metadata',
    };
  }

  // Get payment intent ID
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id || null;

  // Prepare payment data for logging
  const paymentData: PaymentSuccessData = {
    sessionId: session.id,
    paymentIntentId,
    bookingReference,
    tenantId,
    amountTotal: session.amount_total || 0,
    currency: session.currency || 'eur',
    customerEmail: session.customer_email || session.customer_details?.email || null,
    customerName: session.customer_details?.name || session.metadata?.customerName || null,
    paymentStatus: session.payment_status,
  };

  console.log('[Stripe Webhook] Payment successful:', {
    bookingReference,
    tenantId,
    bookingId,
    amount: paymentData.amountTotal / 100,
    currency: paymentData.currency,
  });

  // Use admin client to bypass RLS for webhook operations
  const supabase = createAdminClient();

  try {
    // Find the booking by reference
    const booking = await getBookingByReference(supabase, tenantId, bookingReference);

    if (!booking) {
      console.error('[Stripe Webhook] Booking not found:', {
        bookingReference,
        tenantId,
      });
      return {
        success: false,
        eventType: 'checkout.session.completed',
        error: `Booking not found: ${bookingReference}`,
      };
    }

    // Check if booking is already confirmed (idempotency)
    if (booking.status === 'confirmed') {
      console.log('[Stripe Webhook] Booking already confirmed, skipping:', {
        bookingId: booking.id,
        bookingReference,
      });
      return {
        success: true,
        eventType: 'checkout.session.completed',
        data: {
          bookingId: booking.id,
          bookingReference,
          message: 'Booking already confirmed',
        },
      };
    }

    // Check if booking is in correct status to confirm
    if (booking.status !== 'pending') {
      console.error('[Stripe Webhook] Booking in unexpected status:', {
        bookingId: booking.id,
        bookingReference,
        status: booking.status,
      });
      return {
        success: false,
        eventType: 'checkout.session.completed',
        error: `Booking in unexpected status: ${booking.status}`,
      };
    }

    // Update booking with payment details
    if (paymentIntentId) {
      const { error: stripeError } = await updateBookingStripeDetails(supabase, booking.id, {
        paymentIntentId,
        checkoutSessionId: session.id,
      });

      if (stripeError) {
        console.error('[Stripe Webhook] Failed to update Stripe details:', stripeError);
        // Continue anyway - we still want to confirm the booking
      }
    }

    // Confirm the booking
    const { data: confirmedBooking, error: confirmError } = await confirmBooking(
      supabase,
      booking.id
    );

    if (confirmError || !confirmedBooking) {
      console.error('[Stripe Webhook] Failed to confirm booking:', confirmError);
      return {
        success: false,
        eventType: 'checkout.session.completed',
        error: `Failed to confirm booking: ${confirmError}`,
      };
    }

    console.log('[Stripe Webhook] Booking confirmed successfully:', {
      bookingId: confirmedBooking.id,
      bookingReference: confirmedBooking.reference,
      status: confirmedBooking.status,
    });

    // Send confirmation email to customer (non-blocking)
    // Extract locale from metadata if available, default to 'en'
    const locale = session.metadata?.locale || 'en';

    sendBookingConfirmation(supabase, confirmedBooking.id, locale)
      .then((result) => {
        if (result.success) {
          console.log('[Stripe Webhook] Confirmation email sent:', result.emailId);
        } else {
          console.warn('[Stripe Webhook] Failed to send confirmation email:', result.error);
        }
      })
      .catch((err) => {
        console.error('[Stripe Webhook] Error sending confirmation email:', err);
      });

    return {
      success: true,
      eventType: 'checkout.session.completed',
      data: {
        bookingId: confirmedBooking.id,
        bookingReference: confirmedBooking.reference,
        status: confirmedBooking.status,
        paymentIntentId,
        amountPaid: paymentData.amountTotal / 100,
        currency: paymentData.currency,
      },
    };
  } catch (error) {
    console.error('[Stripe Webhook] Error processing checkout.session.completed:', error);
    return {
      success: false,
      eventType: 'checkout.session.completed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle checkout.session.expired event
 * Session expired before payment was completed
 *
 * Since bookings are created before checkout, we need to cancel them
 * when the session expires without payment.
 */
async function handleCheckoutSessionExpired(
  session: Stripe.Checkout.Session
): Promise<WebhookEventResult> {
  console.log(`[Stripe Webhook] Processing checkout.session.expired: ${session.id}`);

  const bookingReference = session.metadata?.bookingReference;
  const tenantId = session.metadata?.tenantId;

  if (!bookingReference || !tenantId) {
    console.log('[Stripe Webhook] No booking reference in expired session');
    return {
      success: true,
      eventType: 'checkout.session.expired',
      data: {
        sessionId: session.id,
        message: 'No booking to cancel',
      },
    };
  }

  console.log('[Stripe Webhook] Checkout session expired:', {
    bookingReference,
    tenantId,
    sessionId: session.id,
  });

  // Use admin client to bypass RLS
  const supabase = createAdminClient();

  try {
    // Find the pending booking
    const booking = await getBookingByReference(supabase, tenantId, bookingReference);

    if (!booking) {
      console.log('[Stripe Webhook] No booking found to cancel:', bookingReference);
      return {
        success: true,
        eventType: 'checkout.session.expired',
        data: {
          bookingReference,
          message: 'Booking not found',
        },
      };
    }

    // Only cancel if still pending
    if (booking.status === 'pending') {
      const { error } = await cancelBooking(
        supabase,
        booking.id,
        'Payment session expired',
        'payment_failed'
      );

      if (error) {
        console.error('[Stripe Webhook] Failed to cancel expired booking:', error);
        return {
          success: false,
          eventType: 'checkout.session.expired',
          error: `Failed to cancel booking: ${error}`,
        };
      }

      console.log('[Stripe Webhook] Cancelled expired booking:', {
        bookingId: booking.id,
        bookingReference,
      });

      return {
        success: true,
        eventType: 'checkout.session.expired',
        data: {
          bookingId: booking.id,
          bookingReference,
          message: 'Pending booking cancelled due to session expiry',
        },
      };
    }

    return {
      success: true,
      eventType: 'checkout.session.expired',
      data: {
        bookingReference,
        status: booking.status,
        message: `Booking already in status: ${booking.status}`,
      },
    };
  } catch (error) {
    console.error('[Stripe Webhook] Error handling session expired:', error);
    return {
      success: false,
      eventType: 'checkout.session.expired',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle payment_intent.succeeded event
 * This is a backup confirmation that payment was successful
 */
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
): Promise<WebhookEventResult> {
  console.log(`[Stripe Webhook] Processing payment_intent.succeeded: ${paymentIntent.id}`);

  const bookingReference = paymentIntent.metadata?.bookingReference;
  const tenantId = paymentIntent.metadata?.tenantId;

  console.log('[Stripe Webhook] Payment intent succeeded:', {
    paymentIntentId: paymentIntent.id,
    bookingReference,
    tenantId,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
  });

  // The main booking creation happens in checkout.session.completed
  // This event can be used for additional verification or logging

  return {
    success: true,
    eventType: 'payment_intent.succeeded',
    data: {
      paymentIntentId: paymentIntent.id,
      bookingReference,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    },
  };
}

/**
 * Handle payment_intent.payment_failed event
 * Payment attempt failed
 */
async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent
): Promise<WebhookEventResult> {
  console.log(`[Stripe Webhook] Processing payment_intent.payment_failed: ${paymentIntent.id}`);

  const bookingReference = paymentIntent.metadata?.bookingReference;
  const tenantId = paymentIntent.metadata?.tenantId;

  const lastError = paymentIntent.last_payment_error;
  const errorMessage = lastError?.message || 'Payment failed';
  const errorCode = lastError?.code || 'unknown';

  console.error('[Stripe Webhook] Payment failed:', {
    paymentIntentId: paymentIntent.id,
    bookingReference,
    tenantId,
    errorCode,
    errorMessage,
  });

  // TODO: Send notification email to customer about failed payment
  // TODO: Update booking status if booking was pre-created

  return {
    success: true,
    eventType: 'payment_intent.payment_failed',
    data: {
      paymentIntentId: paymentIntent.id,
      bookingReference,
      errorCode,
      errorMessage,
    },
  };
}

/**
 * Handle charge.refunded event
 * A refund was processed
 */
async function handleChargeRefunded(charge: Stripe.Charge): Promise<WebhookEventResult> {
  console.log(`[Stripe Webhook] Processing charge.refunded: ${charge.id}`);

  const paymentIntentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id;

  console.log('[Stripe Webhook] Charge refunded:', {
    chargeId: charge.id,
    paymentIntentId,
    amountRefunded: charge.amount_refunded / 100,
    currency: charge.currency,
    refunded: charge.refunded,
  });

  // TODO: Update booking payment status to reflect refund
  // TODO: Send refund confirmation email to customer

  return {
    success: true,
    eventType: 'charge.refunded',
    data: {
      chargeId: charge.id,
      paymentIntentId,
      amountRefunded: charge.amount_refunded,
      currency: charge.currency,
      fullyRefunded: charge.refunded,
    },
  };
}

/**
 * Handle charge.refund.updated event
 * Refund status was updated (e.g., failed, pending -> succeeded)
 */
async function handleRefundUpdated(refund: Stripe.Refund): Promise<WebhookEventResult> {
  console.log(`[Stripe Webhook] Processing charge.refund.updated: ${refund.id}`);

  const chargeId = typeof refund.charge === 'string'
    ? refund.charge
    : refund.charge?.id;

  console.log('[Stripe Webhook] Refund updated:', {
    refundId: refund.id,
    chargeId,
    status: refund.status,
    amount: refund.amount / 100,
    currency: refund.currency,
  });

  // TODO: Update booking refund status based on refund status
  // Handle cases where refund fails or requires action

  return {
    success: true,
    eventType: 'charge.refund.updated',
    data: {
      refundId: refund.id,
      chargeId,
      status: refund.status,
      amount: refund.amount,
      currency: refund.currency,
    },
  };
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Disable body parsing for this route
 * We need the raw body for Stripe signature verification
 */
export const dynamic = 'force-dynamic';
