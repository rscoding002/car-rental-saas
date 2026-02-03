/**
 * Booking Cancellation API
 *
 * GET: Preview cancellation with refund calculation
 * POST: Execute cancellation with optional Stripe refund
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getBookingById, cancelBooking, updateBookingRefundDetails } from '@/lib/booking/queries';
import {
  calculateRefund,
  isBookingCancellable,
  DEFAULT_CANCELLATION_POLICY,
  type CancellationPolicy,
  type RefundCalculation,
} from '@/lib/booking/types';
import { sendBookingCancellation } from '@/lib/email/booking-emails';
import { createRefund, toStripeAmount, fromStripeAmount, isStripeServerConfigured } from '@/lib/stripe/server';
import { StripeError } from '@/lib/stripe/types';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Schemas
// ============================================================================

const cancelBookingSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(500),
  reasonType: z.enum([
    'customer_request',
    'vehicle_unavailable',
    'payment_failed',
    'no_show',
    'force_majeure',
    'other',
  ]).default('customer_request'),
  processRefund: z.boolean().default(true),
});

// ============================================================================
// Helper: Get tenant's cancellation policy
// ============================================================================

async function getTenantCancellationPolicy(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  tenantId: string
): Promise<CancellationPolicy> {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings = tenant?.settings as Record<string, unknown> | null;
  const policy = settings?.cancellationPolicy as CancellationPolicy | undefined;

  return {
    allowCancellation: policy?.allowCancellation ?? DEFAULT_CANCELLATION_POLICY.allowCancellation,
    freeCancellationHours: policy?.freeCancellationHours ?? DEFAULT_CANCELLATION_POLICY.freeCancellationHours,
    partialRefundHours: policy?.partialRefundHours ?? DEFAULT_CANCELLATION_POLICY.partialRefundHours,
    partialRefundPercent: policy?.partialRefundPercent ?? DEFAULT_CANCELLATION_POLICY.partialRefundPercent,
  };
}

// ============================================================================
// GET - Preview cancellation with refund calculation
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant and role
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 });
    }

    // Get booking
    const booking = await getBookingById(supabase, bookingId);

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check booking belongs to tenant
    if (booking.tenantId !== profile.tenant_id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if booking can be cancelled
    if (!isBookingCancellable(booking.status)) {
      return NextResponse.json(
        {
          error: 'Booking cannot be cancelled',
          reason: `Booking with status "${booking.status}" cannot be cancelled`,
        },
        { status: 400 }
      );
    }

    // Get tenant's cancellation policy
    const policy = await getTenantCancellationPolicy(supabase, profile.tenant_id);

    // Calculate refund
    const refundCalculation = calculateRefund(
      { pickupAt: booking.pickupAt, pricing: booking.pricing },
      policy
    );

    return NextResponse.json({
      booking: {
        id: booking.id,
        reference: booking.reference,
        status: booking.status,
        pickupAt: booking.pickupAt,
        total: booking.pricing.total,
        currency: booking.pricing.currency,
      },
      policy,
      refund: refundCalculation,
      canCancel: true,
    });
  } catch (error) {
    console.error('Error previewing cancellation:', error);
    return NextResponse.json(
      { error: 'Failed to preview cancellation' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Execute cancellation
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant and role
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 });
    }

    // Check staff role
    const staffRoles = ['platform_admin', 'tenant_admin', 'tenant_manager', 'tenant_staff'];
    if (!staffRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = cancelBookingSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { reason, reasonType, processRefund } = parseResult.data;

    // Get booking
    const booking = await getBookingById(supabase, bookingId);

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check booking belongs to tenant
    if (booking.tenantId !== profile.tenant_id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if booking can be cancelled
    if (!isBookingCancellable(booking.status)) {
      return NextResponse.json(
        {
          error: 'Booking cannot be cancelled',
          reason: `Booking with status "${booking.status}" cannot be cancelled`,
        },
        { status: 400 }
      );
    }

    // Get tenant's cancellation policy
    const policy = await getTenantCancellationPolicy(supabase, profile.tenant_id);

    // Calculate refund
    const refundCalculation = calculateRefund(
      { pickupAt: booking.pickupAt, pricing: booking.pricing },
      policy
    );

    // Cancel the booking
    const { data: cancelledBooking, error: cancelError } = await cancelBooking(
      supabase,
      bookingId,
      reason,
      reasonType
    );

    if (cancelError || !cancelledBooking) {
      return NextResponse.json(
        { error: cancelError || 'Failed to cancel booking' },
        { status: 500 }
      );
    }

    // Update vehicle status back to available if it was rented
    if (booking.vehicleId) {
      await supabase
        .from('vehicles')
        .update({ status: 'available' })
        .eq('id', booking.vehicleId)
        .eq('status', 'rented');
    }

    // Process Stripe refund if applicable
    let stripeRefundResult: {
      refundId: string;
      status: string;
      amount: number;
      currency: string;
    } | null = null;
    let refundError: string | null = null;

    if (processRefund && refundCalculation.refundAmount > 0 && booking.stripePaymentIntentId) {
      // Check if Stripe is configured
      if (!isStripeServerConfigured()) {
        console.warn('Stripe not configured - skipping refund processing');
        refundError = 'Payment provider not configured. Manual refund required.';
      } else {
        try {
          // Convert refund amount to cents for Stripe
          const refundAmountCents = toStripeAmount(refundCalculation.refundAmount);

          // Process the refund via Stripe
          stripeRefundResult = await createRefund({
            paymentIntentId: booking.stripePaymentIntentId,
            amount: refundAmountCents,
            reason: 'requested_by_customer',
            metadata: {
              bookingId: bookingId,
              bookingReference: booking.reference,
              reasonType: reasonType,
              cancelledBy: user.id,
            },
          });

          // Update booking with refund details
          await updateBookingRefundDetails(supabase, bookingId, {
            refundId: stripeRefundResult.refundId,
            refundAmount: fromStripeAmount(stripeRefundResult.amount),
            refundStatus: stripeRefundResult.status,
          });

          console.log(`Refund processed for booking ${bookingId}: ${stripeRefundResult.refundId}`);
        } catch (error) {
          console.error('Error processing Stripe refund:', error);
          if (error instanceof StripeError) {
            refundError = `Refund failed: ${error.message}`;
          } else {
            refundError = 'Refund processing failed. Manual refund may be required.';
          }
        }
      }
    }

    // Send cancellation email (non-blocking)
    const locale = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0] || 'en';

    // Determine refund status for email
    let refundStatus: 'pending' | 'processing' | 'completed' | 'failed' = 'pending';
    if (stripeRefundResult) {
      refundStatus = stripeRefundResult.status === 'succeeded' ? 'completed' : 'processing';
    } else if (refundError) {
      refundStatus = 'failed';
    } else if (refundCalculation.refundAmount === 0) {
      refundStatus = 'completed'; // No refund needed
    }

    sendBookingCancellation(
      supabase,
      bookingId,
      {
        cancelledBy: 'staff',
        reason,
        reasonType,
        cancelledAt: cancelledBooking.cancelledAt || new Date().toISOString(),
      },
      {
        originalAmount: refundCalculation.originalAmount,
        refundAmount: stripeRefundResult ? fromStripeAmount(stripeRefundResult.amount) : refundCalculation.refundAmount,
        cancellationFee: refundCalculation.cancellationFee,
        refundPercent: refundCalculation.refundPercent,
        policyTier: refundCalculation.policyTier,
        status: refundStatus,
      },
      locale
    ).catch(err => {
      console.error('[API] Failed to send cancellation email:', err);
    });

    // Build response message
    let message: string;
    if (stripeRefundResult) {
      const refundedAmount = fromStripeAmount(stripeRefundResult.amount);
      message = `Booking cancelled. Refund of ${refundedAmount.toFixed(2)} ${refundCalculation.currency.toUpperCase()} has been processed.`;
    } else if (refundError) {
      message = `Booking cancelled. ${refundError}`;
    } else if (refundCalculation.refundAmount > 0 && !booking.stripePaymentIntentId) {
      message = 'Booking cancelled. No payment record found - manual refund may be required if payment was made.';
    } else {
      message = 'Booking cancelled. No refund applicable.';
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: cancelledBooking.id,
        reference: cancelledBooking.reference,
        status: cancelledBooking.status,
        cancelledAt: cancelledBooking.cancelledAt,
      },
      refund: processRefund ? refundCalculation : null,
      stripeRefund: stripeRefundResult ? {
        refundId: stripeRefundResult.refundId,
        status: stripeRefundResult.status,
        amount: fromStripeAmount(stripeRefundResult.amount),
        currency: stripeRefundResult.currency,
      } : null,
      refundError,
      message,
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}
