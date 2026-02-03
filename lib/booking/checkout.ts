'use client';

/**
 * Booking Checkout Utilities
 *
 * Functions for initiating Stripe checkout from the booking flow.
 */

import { useState, useCallback } from 'react';
import { generateBookingReference } from './reference-generator';
import type { BookingState } from '@/components/booking/booking-context';
import type { PricingBreakdown } from '@/lib/pricing/types';

// ============================================================================
// TYPES
// ============================================================================

export interface CheckoutInput {
  /** Booking state from context */
  state: BookingState;
  /** Locale for Stripe checkout page */
  locale: string;
}

export interface CheckoutResult {
  success: boolean;
  sessionId?: string;
  url?: string;
  error?: string;
}

export interface UseCheckoutReturn {
  /** Initiate checkout */
  initiateCheckout: (input: CheckoutInput) => Promise<CheckoutResult>;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Clear error */
  clearError: () => void;
}

// ============================================================================
// CHECKOUT API CALL
// ============================================================================

/**
 * Call the checkout API to create a Stripe session
 */
export async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const { state, locale } = input;
  const {
    vehicle,
    pickupBranch,
    returnBranch,
    pricing,
    step1Data,
    step2Data,
    step3Data,
    step4Data,
    availableAddons,
    rentalDays,
  } = state;

  // Validate required data
  if (!vehicle || !pickupBranch || !returnBranch || !step1Data || !step3Data) {
    return {
      success: false,
      error: 'Missing required booking information',
    };
  }

  if (!pricing) {
    return {
      success: false,
      error: 'Pricing information is not available',
    };
  }

  // Generate booking reference
  const bookingReference = generateBookingReference();

  // Build vehicle name
  const vehicleName = `${vehicle.make} ${vehicle.model} (${vehicle.year})`;

  // Get primary photo
  const vehiclePhoto = vehicle.photoUrl;

  // Build addons with IDs for the booking record
  const addonsWithIds = step2Data?.addons
    ?.map((selection) => {
      const addon = availableAddons.find((a) => a.id === selection.addonId);
      if (!addon) return null;

      const name =
        (addon.name as Record<string, string>)[locale] ||
        (addon.name as Record<string, string>).en ||
        'Add-on';

      // Calculate addon price based on type
      let unitPrice = addon.price;
      let totalPrice = addon.price * selection.quantity;

      if (addon.price_type === 'per_day') {
        totalPrice = addon.price * selection.quantity * rentalDays;
      }

      return {
        addonId: addon.id,
        name,
        quantity: selection.quantity,
        unitPrice,
        totalPrice,
        priceType: addon.price_type || 'per_rental',
      };
    })
    .filter(Boolean) as Array<{
    addonId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    priceType: string;
  }> | undefined;

  // Build checkout request with full booking data
  const checkoutRequest = {
    bookingReference,
    vehicleId: vehicle.id,
    pickupBranchId: pickupBranch.id,
    returnBranchId: returnBranch.id,
    customerEmail: step3Data.driverInfo.email,
    customerName: `${step3Data.driverInfo.firstName} ${step3Data.driverInfo.lastName}`,
    driverInfo: step3Data.driverInfo,
    pricing: {
      baseRate: pricing.baseRate,
      rateType: pricing.rateType,
      duration: pricing.duration,
      subtotal: pricing.subtotal,
      addonsTotal: pricing.addonsTotal || 0,
      oneWayFee: pricing.oneWayFee || 0,
      discountAmount: pricing.discountAmount || 0,
      discountPercent: pricing.discountPercent || 0,
      seasonalMultiplier: pricing.seasonalMultiplier || 1,
      total: pricing.total,
      currency: pricing.currency.toLowerCase(),
    },
    vehicleName,
    vehiclePhoto,
    pickupAt: step1Data.pickupAt,
    returnAt: step1Data.returnAt,
    addons: addonsWithIds,
    couponId: step4Data?.couponCode ? null : null, // TODO: Resolve coupon code to ID
    notes: step4Data?.notes,
    locale,
  };

  try {
    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutRequest),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to create checkout session',
      };
    }

    return {
      success: true,
      sessionId: data.sessionId,
      url: data.url,
    };
  } catch (error) {
    console.error('Checkout error:', error);
    return {
      success: false,
      error: 'Network error. Please try again.',
    };
  }
}

/**
 * Redirect to Stripe Checkout
 */
export function redirectToStripeCheckout(url: string): void {
  window.location.href = url;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing checkout flow
 */
export function useCheckout(): UseCheckoutReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const initiateCheckout = useCallback(
    async (input: CheckoutInput): Promise<CheckoutResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await createCheckout(input);

        if (!result.success) {
          setError(result.error || 'Checkout failed');
          return result;
        }

        // Redirect to Stripe Checkout
        if (result.url) {
          redirectToStripeCheckout(result.url);
        } else {
          setError('No checkout URL received');
          return { success: false, error: 'No checkout URL received' };
        }

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Checkout failed';
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    initiateCheckout,
    isLoading,
    error,
    clearError,
  };
}

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

const BOOKING_STORAGE_KEY = 'pending_booking';

/**
 * Save booking data to session storage before redirect
 * This allows recovery if the user navigates back
 */
export function saveBookingToStorage(data: {
  reference: string;
  vehicleId: string;
  pickupAt: string;
  returnAt: string;
  total: number;
  currency: string;
}): void {
  try {
    sessionStorage.setItem(
      BOOKING_STORAGE_KEY,
      JSON.stringify({
        ...data,
        savedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Session storage not available
  }
}

/**
 * Get pending booking from storage
 */
export function getPendingBookingFromStorage(): {
  reference: string;
  vehicleId: string;
  pickupAt: string;
  returnAt: string;
  total: number;
  currency: string;
  savedAt: string;
} | null {
  try {
    const data = sessionStorage.getItem(BOOKING_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // Session storage not available or invalid data
  }
  return null;
}

/**
 * Clear pending booking from storage
 */
export function clearPendingBookingFromStorage(): void {
  try {
    sessionStorage.removeItem(BOOKING_STORAGE_KEY);
  } catch {
    // Session storage not available
  }
}
