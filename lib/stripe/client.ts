'use client';

/**
 * Client-side Stripe.js utilities
 * For use in browser components to redirect to Stripe Checkout
 */

import { loadStripe, type Stripe } from '@stripe/stripe-js';

// ============================================================================
// Stripe.js Instance (Singleton)
// ============================================================================

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Get or create the Stripe.js instance
 * Uses singleton pattern to avoid loading Stripe multiple times
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      console.error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
      return Promise.resolve(null);
    }

    stripePromise = loadStripe(publishableKey);
  }

  return stripePromise;
}

// ============================================================================
// Checkout Redirect
// ============================================================================

/**
 * Redirect to Stripe Checkout using the checkout URL
 * @param checkoutUrl - The Stripe Checkout session URL
 */
export function redirectToCheckoutUrl(checkoutUrl: string): void {
  window.location.href = checkoutUrl;
}

/**
 * Redirect to Stripe Checkout using session ID
 * Uses the modern approach with stripe.js embedded checkout or URL redirect
 * @param sessionId - The Stripe Checkout session ID
 * @param checkoutUrl - The checkout URL (preferred, if available)
 * @returns Promise that resolves when redirect completes (or rejects on error)
 */
export async function redirectToCheckout(
  sessionId: string,
  checkoutUrl?: string
): Promise<{ error?: { message: string } }> {
  // If checkout URL is provided, use direct redirect (recommended)
  if (checkoutUrl) {
    window.location.href = checkoutUrl;
    return {};
  }

  // Fallback: construct URL from session ID
  // Note: This requires the session to be created with a valid success/cancel URL
  const stripe = await getStripe();

  if (!stripe) {
    return {
      error: { message: 'Failed to load Stripe. Please try again.' },
    };
  }

  // Use initEmbeddedCheckout for newer Stripe.js versions
  try {
    const checkout = await stripe.initEmbeddedCheckout({
      clientSecret: sessionId,
    });
    checkout.mount('#checkout');
    return {};
  } catch {
    return {
      error: {
        message:
          'Unable to initialize checkout. Please use the checkout URL instead.',
      },
    };
  }
}

// ============================================================================
// Stripe Elements Support (for embedded forms)
// ============================================================================

/**
 * Get Stripe Elements appearance configuration
 * Matches the site's design system
 */
export function getElementsAppearance(): {
  theme: 'stripe';
  variables: Record<string, string>;
} {
  return {
    theme: 'stripe',
    variables: {
      colorPrimary: 'var(--color-primary, #2563eb)',
      colorBackground: 'var(--color-background, #ffffff)',
      colorText: 'var(--color-text, #1f2937)',
      colorDanger: 'var(--color-error, #dc2626)',
      fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      borderRadius: '8px',
      spacingUnit: '4px',
    },
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format amount for display
 * @param amount - Amount in cents
 * @param currency - Currency code
 * @param locale - Locale for formatting
 */
export function formatStripeAmount(
  amount: number,
  currency: string = 'eur',
  locale: string = 'en'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}
