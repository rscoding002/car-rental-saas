/**
 * Stripe module exports
 *
 * This module provides utilities for Stripe integration:
 * - Client-side: Stripe.js for checkout redirect
 * - Server-side: Stripe SDK for creating sessions, refunds, webhooks
 *
 * Usage:
 *
 * Client-side (components):
 * ```tsx
 * import { getStripe, redirectToCheckout } from '@/lib/stripe/client';
 * ```
 *
 * Server-side (API routes, server actions):
 * ```ts
 * import { createCheckoutSession, constructWebhookEvent } from '@/lib/stripe/server';
 * ```
 */

// Types
export * from './types';

// Server utilities (only import on server)
// Note: Do not re-export server utilities here to avoid client-side imports
// Import directly from '@/lib/stripe/server' in server code

// Client utilities are re-exported for convenience
// They will tree-shake on server builds
export {
  getStripe,
  redirectToCheckout,
  redirectToCheckoutUrl,
  formatStripeAmount,
  isStripeConfigured,
  getElementsAppearance,
} from './client';
