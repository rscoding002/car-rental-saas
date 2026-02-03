/**
 * Booking Modification Logic
 *
 * Handles booking modifications including:
 * - Date/time changes
 * - Branch changes (pickup/return)
 * - Add-on changes
 * - Pricing recalculation
 * - Additional payments and refunds
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, BookingPricing } from '@/lib/supabase/types';
import {
  getBookingById,
  getBookingWithRelations,
  updateBooking,
  replaceBookingAddons,
  updateBookingRefundDetails,
} from './queries';
import {
  isBookingModifiable,
  validateBookingDates,
  type ModificationInput,
  type ModificationPricing,
  type ModificationResult,
  type BookingData,
  type BookingWithRelations,
} from './types';
import { checkVehicleAvailability } from '@/lib/availability/queries';
import { calculatePricing } from '@/lib/pricing/calculator';
import type { PricingResult } from '@/lib/pricing/types';
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

export interface ModificationPreview {
  canModify: boolean;
  reason?: string;
  booking: {
    id: string;
    reference: string;
    status: string;
    pickupAt: string;
    returnAt: string;
  };
  originalPricing: BookingPricing;
  newPricing?: BookingPricing;
  priceDifference: number;
  requiresPayment: boolean;
  requiresRefund: boolean;
  currency: string;
  changes: {
    datesChanged: boolean;
    pickupBranchChanged: boolean;
    returnBranchChanged: boolean;
    addonsChanged: boolean;
  };
}

export interface ExecuteModificationInput extends ModificationInput {
  /** Skip actual payment/refund processing (for staff bookings) */
  skipPaymentProcessing?: boolean;
  /** User ID performing the modification */
  modifiedByUserId?: string;
}

export interface ExecuteModificationResult {
  success: boolean;
  error?: string;
  booking?: {
    id: string;
    reference: string;
    status: string;
    pickupAt: string;
    returnAt: string;
  };
  pricing?: ModificationPricing;
  refund?: {
    refundId: string;
    status: string;
    amount: number;
    currency: string;
  };
  refundError?: string;
  /** URL for additional payment (if required) */
  checkoutUrl?: string;
}

// ============================================================================
// PREVIEW MODIFICATION
// ============================================================================

/**
 * Preview a booking modification without executing it
 * Returns pricing differences and validation results
 */
export async function previewModification(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  input: ModificationInput,
  locale: string = 'en'
): Promise<ModificationPreview> {
  const { bookingId, pickupAt, returnAt, pickupBranchId, returnBranchId, addons } = input;

  // Get booking with relations
  const booking = await getBookingWithRelations(supabase, bookingId);

  if (!booking) {
    return createErrorPreview('Booking not found');
  }

  // Check tenant ownership
  if (booking.tenantId !== tenantId) {
    return createErrorPreview('Booking not found');
  }

  // Check if booking can be modified
  if (!isBookingModifiable(booking.status)) {
    return createErrorPreview(`Bookings with status "${booking.status}" cannot be modified`);
  }

  // Determine what's being changed
  const newPickupAt = pickupAt || booking.pickupAt;
  const newReturnAt = returnAt || booking.returnAt;
  const newPickupBranchId = pickupBranchId || booking.pickupBranchId;
  const newReturnBranchId = returnBranchId || booking.returnBranchId;

  const changes = {
    datesChanged: newPickupAt !== booking.pickupAt || newReturnAt !== booking.returnAt,
    pickupBranchChanged: newPickupBranchId !== booking.pickupBranchId,
    returnBranchChanged: newReturnBranchId !== booking.returnBranchId,
    addonsChanged: addons !== undefined,
  };

  // Validate dates if changed
  if (changes.datesChanged) {
    const dateValidation = validateBookingDates(newPickupAt, newReturnAt);
    if (!dateValidation.valid) {
      return createErrorPreview(dateValidation.error || 'Invalid dates');
    }

    // Check availability (excluding this booking)
    const availability = await checkVehicleAvailability(supabase, {
      vehicleId: booking.vehicleId,
      pickupAt: newPickupAt,
      returnAt: newReturnAt,
      pickupBranchId: newPickupBranchId,
      returnBranchId: newReturnBranchId,
      excludeBookingId: bookingId,
    });

    if (!availability.isAvailable) {
      const reasons = availability.unavailabilityReasons?.join(', ') || 'unavailable';
      return createErrorPreview(`Vehicle is not available for the new dates: ${reasons}`);
    }
  }

  // Get vehicle category for pricing
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('category_id')
    .eq('id', booking.vehicleId)
    .single();

  if (!vehicle) {
    return createErrorPreview('Vehicle not found');
  }

  // Calculate new pricing
  const newAddons = addons !== undefined ? addons :
    booking.addons?.map(a => ({ addonId: a.addonId, quantity: a.quantity })) || [];

  const pricingResult = await calculatePricing(supabase, {
    tenantId,
    vehicleId: booking.vehicleId,
    categoryId: vehicle.category_id,
    pickupAt: newPickupAt,
    returnAt: newReturnAt,
    pickupBranchId: newPickupBranchId,
    returnBranchId: newReturnBranchId,
    addons: newAddons,
    couponCode: booking.coupon?.code,
    customerId: booking.customerId,
  }, { locale, includeBreakdown: true });

  // Check for pricing warnings that indicate failure
  if (pricingResult.warnings?.some(w => w.code === 'no_rates')) {
    return createErrorPreview('Failed to calculate new pricing - no rates found');
  }

  if (!pricingResult.breakdown) {
    return createErrorPreview('Failed to calculate pricing breakdown');
  }

  const breakdown = pricingResult.breakdown;

  // Build new pricing object
  const newPricing: BookingPricing = {
    baseRate: breakdown.baseRate,
    rateType: breakdown.rateType,
    duration: breakdown.duration,
    durationUnit: breakdown.durationUnit,
    subtotal: breakdown.subtotal,
    seasonId: breakdown.season?.id,
    seasonName: breakdown.season?.name,
    seasonMultiplier: breakdown.season?.multiplier,
    seasonAmount: breakdown.season?.amount,
    addonsTotal: breakdown.addonsTotal,
    oneWayFee: breakdown.oneWayFee,
    discountType: breakdown.coupon?.discountType,
    discountValue: breakdown.coupon?.discountValue,
    discountAmount: breakdown.discountAmount,
    couponCode: breakdown.coupon?.code,
    total: breakdown.total,
    currency: breakdown.currency,
  };

  const priceDifference = newPricing.total - booking.pricing.total;

  return {
    canModify: true,
    booking: {
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
      pickupAt: booking.pickupAt,
      returnAt: booking.returnAt,
    },
    originalPricing: booking.pricing,
    newPricing,
    priceDifference,
    requiresPayment: priceDifference > 0,
    requiresRefund: priceDifference < 0,
    currency: booking.pricing.currency,
    changes,
  };
}

// ============================================================================
// EXECUTE MODIFICATION
// ============================================================================

/**
 * Execute a booking modification
 * Applies changes and handles payment/refund as needed
 */
export async function executeModification(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  input: ExecuteModificationInput
): Promise<ExecuteModificationResult> {
  const {
    bookingId,
    pickupAt,
    returnAt,
    pickupBranchId,
    returnBranchId,
    addons,
    skipPaymentProcessing = false,
    modifiedByUserId,
  } = input;

  // First, preview the modification to validate
  const preview = await previewModification(supabase, tenantId, input);

  if (!preview.canModify) {
    return {
      success: false,
      error: preview.reason || 'Modification not allowed',
    };
  }

  // Get the booking
  const booking = await getBookingById(supabase, bookingId);
  if (!booking) {
    return { success: false, error: 'Booking not found' };
  }

  // Prepare updates
  const updates: Parameters<typeof updateBooking>[2] = {};

  if (pickupAt) updates.pickupAt = pickupAt;
  if (returnAt) updates.returnAt = returnAt;
  if (pickupBranchId) updates.pickupBranchId = pickupBranchId;
  if (returnBranchId) updates.returnBranchId = returnBranchId;

  // Update pricing if changed
  if (preview.newPricing && preview.priceDifference !== 0) {
    updates.pricing = preview.newPricing;
  }

  // Apply booking updates
  const { data: updatedBooking, error: updateError } = await updateBooking(
    supabase,
    bookingId,
    updates
  );

  if (updateError || !updatedBooking) {
    return {
      success: false,
      error: updateError || 'Failed to update booking',
    };
  }

  // Update addons if changed
  if (addons !== undefined) {
    // Get addon details for pricing
    const addonIds = addons.map(a => a.addonId);
    const { data: addonData } = await supabase
      .from('addons')
      .select('id, price, price_type')
      .in('id', addonIds);

    if (addonData) {
      const addonInserts = addons.map(addon => {
        const addonInfo = addonData.find(a => a.id === addon.addonId);
        const unitPrice = addonInfo?.price || 0;
        const priceType = addonInfo?.price_type || 'per_rental';
        const duration = preview.newPricing?.duration || booking.pricing.duration;

        let totalPrice = unitPrice * addon.quantity;
        if (priceType === 'per_day') {
          totalPrice = unitPrice * addon.quantity * duration;
        }

        return {
          addonId: addon.addonId,
          quantity: addon.quantity,
          unitPrice,
          priceType,
          totalPrice,
        };
      });

      await replaceBookingAddons(supabase, bookingId, addonInserts);
    }
  }

  // Handle payment/refund
  let refundResult: ExecuteModificationResult['refund'];
  let refundError: string | undefined;

  if (!skipPaymentProcessing && preview.requiresRefund && preview.priceDifference < 0) {
    // Process refund for price decrease
    const refundAmount = Math.abs(preview.priceDifference);

    if (booking.stripePaymentIntentId && isStripeServerConfigured()) {
      try {
        const result = await createRefund({
          paymentIntentId: booking.stripePaymentIntentId,
          amount: toStripeAmount(refundAmount),
          reason: 'requested_by_customer',
          metadata: {
            bookingId,
            bookingReference: booking.reference,
            modificationType: 'price_decrease',
            ...(modifiedByUserId && { modifiedBy: modifiedByUserId }),
          },
        });

        refundResult = {
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
      } catch (error) {
        console.error('Error processing modification refund:', error);
        if (error instanceof StripeError) {
          refundError = `Refund failed: ${error.message}`;
        } else {
          refundError = 'Refund processing failed. Manual refund may be required.';
        }
      }
    } else if (!booking.stripePaymentIntentId) {
      // No payment on file - just note that a refund may be due
      refundError = 'No payment on file. Manual refund may be required if payment was made separately.';
    }
  }

  // For price increases, we would need to create a new checkout session
  // This is more complex and typically handled via a separate payment flow
  // For now, we'll flag it in the response
  let checkoutUrl: string | undefined;
  if (!skipPaymentProcessing && preview.requiresPayment && preview.priceDifference > 0) {
    // TODO: Create additional payment checkout session
    // For MVP, additional payment is handled manually
    checkoutUrl = undefined; // Would be set if implementing automatic additional payment
  }

  return {
    success: true,
    booking: {
      id: updatedBooking.id,
      reference: updatedBooking.reference,
      status: updatedBooking.status,
      pickupAt: updatedBooking.pickupAt,
      returnAt: updatedBooking.returnAt,
    },
    pricing: {
      originalPricing: booking.pricing,
      newPricing: preview.newPricing!,
      priceDifference: preview.priceDifference,
      requiresPayment: preview.requiresPayment,
      requiresRefund: preview.requiresRefund,
      currency: preview.currency,
    },
    refund: refundResult,
    refundError,
    checkoutUrl,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an error preview response
 */
function createErrorPreview(reason: string): ModificationPreview {
  return {
    canModify: false,
    reason,
    booking: { id: '', reference: '', status: '', pickupAt: '', returnAt: '' },
    originalPricing: {
      baseRate: 0,
      rateType: 'daily',
      duration: 0,
      subtotal: 0,
      total: 0,
      currency: 'EUR',
    },
    priceDifference: 0,
    requiresPayment: false,
    requiresRefund: false,
    currency: 'EUR',
    changes: {
      datesChanged: false,
      pickupBranchChanged: false,
      returnBranchChanged: false,
      addonsChanged: false,
    },
  };
}

/**
 * Check if modification requires additional payment
 */
export function requiresAdditionalPayment(preview: ModificationPreview): boolean {
  return preview.canModify && preview.priceDifference > 0;
}

/**
 * Check if modification results in a refund
 */
export function resultsInRefund(preview: ModificationPreview): boolean {
  return preview.canModify && preview.priceDifference < 0;
}

/**
 * Format modification summary message
 */
export function formatModificationSummary(preview: ModificationPreview): string {
  if (!preview.canModify) {
    return preview.reason || 'Modification not allowed';
  }

  const changesDesc: string[] = [];
  if (preview.changes.datesChanged) changesDesc.push('dates');
  if (preview.changes.pickupBranchChanged) changesDesc.push('pickup location');
  if (preview.changes.returnBranchChanged) changesDesc.push('return location');
  if (preview.changes.addonsChanged) changesDesc.push('add-ons');

  let message = `Modifying ${changesDesc.join(', ')}.`;

  if (preview.priceDifference > 0) {
    message += ` Additional payment of ${preview.priceDifference.toFixed(2)} ${preview.currency} required.`;
  } else if (preview.priceDifference < 0) {
    message += ` Refund of ${Math.abs(preview.priceDifference).toFixed(2)} ${preview.currency} will be processed.`;
  } else {
    message += ' No price change.';
  }

  return message;
}
