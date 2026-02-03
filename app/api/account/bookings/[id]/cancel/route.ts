/**
 * Customer Booking Cancellation API
 *
 * GET: Preview cancellation with refund calculation (customer)
 * POST: Execute cancellation (customer)
 *
 * Unlike admin API, this validates that the customer owns the booking
 * and uses 'customer_request' as the reason type.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  previewCancellation,
  executeCancellation,
  formatRefundMessage,
  getPolicyTierDescription,
} from '@/lib/booking/cancellation';
import { getBookingById } from '@/lib/booking/queries';
import { sendBookingCancellation } from '@/lib/email/booking-emails';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Schemas
// ============================================================================

const cancelBookingSchema = z.object({
  reason: z.string().min(1, 'Please provide a reason for cancellation').max(500),
});

// ============================================================================
// Helper: Verify customer owns booking
// ============================================================================

async function verifyBookingOwnership(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  bookingId: string,
  userId: string
): Promise<{ owned: boolean; tenantId?: string; customerId?: string; error?: string }> {
  // Get the booking
  const booking = await getBookingById(supabase, bookingId);

  if (!booking) {
    return { owned: false, error: 'Booking not found' };
  }

  // Get user profile to check customer ID
  const { data: profile } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('auth_id', userId)
    .single();

  if (!profile) {
    return { owned: false, error: 'User not found' };
  }

  // Verify the booking belongs to this customer
  if (booking.customerId !== profile.id) {
    return { owned: false, error: 'You do not have permission to cancel this booking' };
  }

  // Verify same tenant
  if (booking.tenantId !== profile.tenant_id) {
    return { owned: false, error: 'Booking not found' };
  }

  return { owned: true, tenantId: profile.tenant_id, customerId: profile.id };
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

    // Verify booking ownership
    const ownership = await verifyBookingOwnership(supabase, bookingId, user.id);
    if (!ownership.owned) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.error === 'Booking not found' ? 404 : 403 }
      );
    }

    // Get cancellation preview
    const preview = await previewCancellation(supabase, bookingId, ownership.tenantId!);

    // Add formatted messages for display
    const refundMessage = formatRefundMessage(preview.refund);
    const policyTierDescription = getPolicyTierDescription(
      preview.refund.policyTier,
      preview.policy
    );

    return NextResponse.json({
      ...preview,
      refundMessage,
      policyTierDescription,
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

    // Verify booking ownership
    const ownership = await verifyBookingOwnership(supabase, bookingId, user.id);
    if (!ownership.owned) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.error === 'Booking not found' ? 404 : 403 }
      );
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

    const { reason } = parseResult.data;

    // Check cancellation preview first to ensure it's allowed
    const preview = await previewCancellation(supabase, bookingId, ownership.tenantId!);

    if (!preview.canCancel) {
      return NextResponse.json(
        { error: preview.reason || 'Booking cannot be cancelled' },
        { status: 400 }
      );
    }

    // Check if customer cancellation is allowed by policy
    if (!preview.policy.allowCancellation) {
      return NextResponse.json(
        { error: 'Online cancellation is not available. Please contact us to cancel your booking.' },
        { status: 400 }
      );
    }

    // Execute the cancellation
    const result = await executeCancellation(
      supabase,
      ownership.tenantId!,
      {
        bookingId,
        reason,
        reasonType: 'customer_request',
        processRefund: true,
      },
      user.id
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to cancel booking' },
        { status: 400 }
      );
    }

    // Send cancellation email (non-blocking)
    const locale = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0] || 'en';

    // Determine refund status for email
    let refundStatus: 'pending' | 'processing' | 'completed' | 'failed' = 'pending';
    if (result.stripeRefund) {
      refundStatus = result.stripeRefund.status === 'succeeded' ? 'completed' : 'processing';
    } else if (result.refundError) {
      refundStatus = 'failed';
    } else if (result.refund && result.refund.refundAmount === 0) {
      refundStatus = 'completed'; // No refund needed
    }

    if (result.booking && result.refund) {
      sendBookingCancellation(
        supabase,
        bookingId,
        {
          cancelledBy: 'customer',
          reason,
          reasonType: 'customer_request',
          cancelledAt: result.booking.cancelledAt || new Date().toISOString(),
        },
        {
          originalAmount: result.refund.originalAmount,
          refundAmount: result.stripeRefund ? result.stripeRefund.amount : result.refund.refundAmount,
          cancellationFee: result.refund.cancellationFee,
          refundPercent: result.refund.refundPercent,
          policyTier: result.refund.policyTier,
          status: refundStatus,
        },
        locale
      ).catch(err => {
        console.error('[API] Failed to send cancellation email:', err);
      });
    }

    // Build response message
    let message = 'Your booking has been cancelled.';
    if (result.stripeRefund) {
      message += ` A refund of ${result.stripeRefund.amount.toFixed(2)} ${result.stripeRefund.currency.toUpperCase()} has been processed.`;
    } else if (result.refund && result.refund.refundAmount > 0) {
      if (result.refundError) {
        message += ` ${result.refundError}`;
      } else {
        message += ` A refund of ${result.refund.refundAmount.toFixed(2)} ${result.refund.currency} will be processed.`;
      }
    } else if (result.refund?.policyTier === 'none') {
      message += ' No refund is applicable based on the cancellation policy.';
    }

    return NextResponse.json({
      success: true,
      booking: result.booking,
      refund: result.refund,
      stripeRefund: result.stripeRefund,
      refundError: result.refundError,
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
