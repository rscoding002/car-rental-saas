/**
 * Booking Cancellation Logic
 *
 * Handles cancellation eligibility checks, refund calculations,
 * Stripe refund processing, and integration with tenant cancellation policies.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { getBookingById, cancelBooking as dbCancelBooking, updateBookingRefundDetails } from './queries';
import {
  calculateRefund,
  isBookingCancellable,
  getHoursUntilPickup,
  DEFAULT_CANCELLATION_POLICY,
  type CancellationPolicy,
  type RefundCalculation,
  type CancellationReasonType,
  type BookingData,
} from './types';
import {
  createRefund,
  toStripeAmount,
  fromStripeAmount,
  isStripeServerConfigured,
} from '@/lib/stripe/server';
import { StripeError } from '@/lib/stripe/types';

// ============================================================================
// TYPES
// ============================================================================

export interface CancellationPreview {
  canCancel: boolean;
  reason?: string;
  booking: {
    id: string;
    reference: string;
    status: string;
    pickupAt: string;
    total: number;
    currency: string;
  };
  policy: CancellationPolicy;
  refund: RefundCalculation;
  hoursUntilPickup: number;
}

export interface CancellationResult {
  success: boolean;
  error?: string;
  booking?: {
    id: string;
    reference: string;
    status: string;
    cancelledAt: string | null;
  };
  refund?: RefundCalculation;
  stripeRefund?: {
    refundId: string;
    status: string;
    amount: number;
    currency: string;
  };
  refundError?: string;
}

export interface CancellationInput {
  bookingId: string;
  reason: string;
  reasonType: CancellationReasonType;
  processRefund?: boolean;
}

// ============================================================================
// POLICY RETRIEVAL
// ============================================================================

/**
 * Get tenant's cancellation policy from settings
 */
export async function getTenantCancellationPolicy(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<CancellationPolicy> {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings = tenant?.settings as Record<string, unknown> | null;
  const policy = settings?.cancellationPolicy as Partial<CancellationPolicy> | undefined;

  return {
    allowCancellation: policy?.allowCancellation ?? DEFAULT_CANCELLATION_POLICY.allowCancellation,
    freeCancellationHours: policy?.freeCancellationHours ?? DEFAULT_CANCELLATION_POLICY.freeCancellationHours,
    partialRefundHours: policy?.partialRefundHours ?? DEFAULT_CANCELLATION_POLICY.partialRefundHours,
    partialRefundPercent: policy?.partialRefundPercent ?? DEFAULT_CANCELLATION_POLICY.partialRefundPercent,
  };
}

// ============================================================================
// CANCELLATION PREVIEW
// ============================================================================

/**
 * Preview a booking cancellation without executing it
 * Returns refund calculation and eligibility information
 */
export async function previewCancellation(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  tenantId: string
): Promise<CancellationPreview> {
  // Get booking
  const booking = await getBookingById(supabase, bookingId);

  if (!booking) {
    return {
      canCancel: false,
      reason: 'Booking not found',
      booking: { id: '', reference: '', status: '', pickupAt: '', total: 0, currency: 'EUR' },
      policy: DEFAULT_CANCELLATION_POLICY,
      refund: {
        originalAmount: 0,
        refundAmount: 0,
        refundPercent: 0,
        retainedAmount: 0,
        cancellationFee: 0,
        isEligible: false,
        policyTier: 'none',
        hoursUntilPickup: 0,
        currency: 'EUR',
      },
      hoursUntilPickup: 0,
    };
  }

  // Check tenant ownership
  if (booking.tenantId !== tenantId) {
    return {
      canCancel: false,
      reason: 'Booking not found',
      booking: { id: '', reference: '', status: '', pickupAt: '', total: 0, currency: 'EUR' },
      policy: DEFAULT_CANCELLATION_POLICY,
      refund: {
        originalAmount: 0,
        refundAmount: 0,
        refundPercent: 0,
        retainedAmount: 0,
        cancellationFee: 0,
        isEligible: false,
        policyTier: 'none',
        hoursUntilPickup: 0,
        currency: 'EUR',
      },
      hoursUntilPickup: 0,
    };
  }

  // Get policy
  const policy = await getTenantCancellationPolicy(supabase, tenantId);

  // Check if booking can be cancelled based on status
  const canCancelByStatus = isBookingCancellable(booking.status);

  // Calculate refund
  const refund = calculateRefund(
    { pickupAt: booking.pickupAt, pricing: booking.pricing },
    policy
  );

  const hoursUntilPickup = getHoursUntilPickup(booking.pickupAt);

  // Determine if cancellation is allowed
  let canCancel = canCancelByStatus;
  let reason: string | undefined;

  if (!canCancelByStatus) {
    canCancel = false;
    reason = `Bookings with status "${booking.status}" cannot be cancelled`;
  } else if (!policy.allowCancellation) {
    // Staff can still cancel even if customer cancellation is disabled
    // This is just informational for the preview
    reason = 'Customer cancellations are disabled. Staff can still cancel.';
  }

  return {
    canCancel,
    reason,
    booking: {
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
      pickupAt: booking.pickupAt,
      total: booking.pricing.total,
      currency: booking.pricing.currency,
    },
    policy,
    refund,
    hoursUntilPickup,
  };
}

// ============================================================================
// EXECUTE CANCELLATION
// ============================================================================

/**
 * Execute a booking cancellation with optional Stripe refund
 * Returns the cancelled booking and refund information
 */
export async function executeCancellation(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  input: CancellationInput,
  cancelledByUserId?: string
): Promise<CancellationResult> {
  const { bookingId, reason, reasonType, processRefund = true } = input;

  // Get booking
  const booking = await getBookingById(supabase, bookingId);

  if (!booking) {
    return { success: false, error: 'Booking not found' };
  }

  // Check tenant ownership
  if (booking.tenantId !== tenantId) {
    return { success: false, error: 'Booking not found' };
  }

  // Check if booking can be cancelled
  if (!isBookingCancellable(booking.status)) {
    return {
      success: false,
      error: `Bookings with status "${booking.status}" cannot be cancelled`,
    };
  }

  // Get policy and calculate refund
  const policy = await getTenantCancellationPolicy(supabase, tenantId);
  const refund = calculateRefund(
    { pickupAt: booking.pickupAt, pricing: booking.pricing },
    policy
  );

  // Execute cancellation
  const { data: cancelledBooking, error: cancelError } = await dbCancelBooking(
    supabase,
    bookingId,
    reason,
    reasonType
  );

  if (cancelError || !cancelledBooking) {
    return { success: false, error: cancelError || 'Failed to cancel booking' };
  }

  // Update vehicle status back to available
  if (booking.vehicleId) {
    await supabase
      .from('vehicles')
      .update({ status: 'available' })
      .eq('id', booking.vehicleId)
      .eq('status', 'rented');
  }

  // Process Stripe refund if applicable
  let stripeRefund: CancellationResult['stripeRefund'];
  let refundError: string | undefined;

  if (processRefund && refund.refundAmount > 0 && booking.stripePaymentIntentId) {
    if (!isStripeServerConfigured()) {
      console.warn('Stripe not configured - skipping refund processing');
      refundError = 'Payment provider not configured. Manual refund required.';
    } else {
      try {
        const refundAmountCents = toStripeAmount(refund.refundAmount);

        const result = await createRefund({
          paymentIntentId: booking.stripePaymentIntentId,
          amount: refundAmountCents,
          reason: 'requested_by_customer',
          metadata: {
            bookingId: bookingId,
            bookingReference: booking.reference,
            reasonType: reasonType,
            ...(cancelledByUserId && { cancelledBy: cancelledByUserId }),
          },
        });

        stripeRefund = {
          refundId: result.refundId,
          status: result.status,
          amount: fromStripeAmount(result.amount),
          currency: result.currency,
        };

        // Update booking with refund details
        await updateBookingRefundDetails(supabase, bookingId, {
          refundId: result.refundId,
          refundAmount: fromStripeAmount(result.amount),
          refundStatus: result.status,
        });

        console.log(`Refund processed for booking ${bookingId}: ${result.refundId}`);
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

  return {
    success: true,
    booking: {
      id: cancelledBooking.id,
      reference: cancelledBooking.reference,
      status: cancelledBooking.status,
      cancelledAt: cancelledBooking.cancelledAt,
    },
    refund: processRefund ? refund : undefined,
    stripeRefund,
    refundError,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a booking is eligible for free cancellation
 */
export async function isFreeCancellationEligible(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  tenantId: string
): Promise<boolean> {
  const preview = await previewCancellation(supabase, bookingId, tenantId);
  return preview.canCancel && preview.refund.policyTier === 'full';
}

/**
 * Get cancellation deadline (datetime for free cancellation cutoff)
 */
export function getCancellationDeadline(
  pickupAt: string,
  policy: CancellationPolicy
): { freeDeadline: Date; partialDeadline: Date } {
  const pickup = new Date(pickupAt);

  const freeDeadline = new Date(pickup);
  freeDeadline.setHours(freeDeadline.getHours() - policy.freeCancellationHours);

  const partialDeadline = new Date(pickup);
  partialDeadline.setHours(partialDeadline.getHours() - policy.partialRefundHours);

  return { freeDeadline, partialDeadline };
}

/**
 * Format refund message for display
 */
export function formatRefundMessage(refund: RefundCalculation): string {
  switch (refund.policyTier) {
    case 'full':
      return `Full refund of ${refund.refundAmount} ${refund.currency} will be processed.`;
    case 'partial':
      return `Partial refund of ${refund.refundAmount} ${refund.currency} (${refund.refundPercent}%) will be processed. ${refund.cancellationFee} ${refund.currency} cancellation fee applies.`;
    case 'none':
      return refund.hoursUntilPickup > 0
        ? `No refund available. Cancellation is within ${refund.hoursUntilPickup} hours of pickup.`
        : 'No refund available for this cancellation.';
    default:
      return 'Refund calculation unavailable.';
  }
}

/**
 * Get policy tier description
 */
export function getPolicyTierDescription(
  tier: 'full' | 'partial' | 'none',
  policy: CancellationPolicy
): string {
  switch (tier) {
    case 'full':
      return `Cancelled more than ${policy.freeCancellationHours} hours before pickup`;
    case 'partial':
      return `Cancelled ${policy.partialRefundHours}-${policy.freeCancellationHours} hours before pickup`;
    case 'none':
      return `Cancelled less than ${policy.partialRefundHours} hours before pickup`;
    default:
      return '';
  }
}
