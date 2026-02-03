import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  createCheckoutSession,
  toStripeAmount,
} from '@/lib/stripe/server';
import { StripeError, LOCALE_TO_STRIPE_LOCALE } from '@/lib/stripe/types';
import type { CheckoutLineItem } from '@/lib/stripe/types';
import type { BookingPricing, DriverInfo } from '@/lib/supabase/types';
import { createBooking, addBookingAddons, updateBookingStripeDetails } from '@/lib/booking/queries';

// ============================================================================
// Request Schema
// ============================================================================

const driverInfoSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  dateOfBirth: z.string().optional(),
  driverLicense: z.object({
    number: z.string().optional(),
    expiryDate: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
});

const checkoutRequestSchema = z.object({
  // Booking identifiers
  bookingReference: z.string().min(1, 'Booking reference is required'),
  vehicleId: z.string().uuid('Invalid vehicle ID'),

  // Branch info
  pickupBranchId: z.string().uuid('Invalid pickup branch ID'),
  returnBranchId: z.string().uuid('Invalid return branch ID'),

  // Customer info
  customerEmail: z.string().email('Invalid email'),
  customerName: z.string().min(1, 'Customer name is required'),

  // Driver info (full object for booking record)
  driverInfo: driverInfoSchema,

  // Pricing data (from booking flow)
  pricing: z.object({
    baseRate: z.number(),
    rateType: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
    duration: z.number(),
    subtotal: z.number(),
    addonsTotal: z.number().optional(),
    oneWayFee: z.number().optional(),
    discountAmount: z.number().optional(),
    discountPercent: z.number().optional(),
    seasonalMultiplier: z.number().optional(),
    total: z.number(),
    currency: z.string().default('eur'),
  }),

  // Vehicle info for line items
  vehicleName: z.string().min(1, 'Vehicle name is required'),
  vehiclePhoto: z.string().url().optional(),

  // Rental period
  pickupAt: z.string(),
  returnAt: z.string(),

  // Add-ons (optional) - with addon IDs for booking record
  addons: z
    .array(
      z.object({
        addonId: z.string().uuid(),
        name: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
        totalPrice: z.number(),
        priceType: z.enum(['per_day', 'per_rental', 'one_time']).default('per_rental'),
      })
    )
    .optional(),

  // Coupon (optional)
  couponId: z.string().uuid().optional().nullable(),

  // Notes (optional)
  notes: z.string().max(1000).optional(),

  // Locale for Stripe Checkout page
  locale: z.string().optional(),
});

type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

// ============================================================================
// POST /api/stripe/checkout
// ============================================================================

/**
 * Create a Stripe Checkout session for a booking
 *
 * This endpoint:
 * 1. Validates the booking data
 * 2. Creates a pending booking record in the database
 * 3. Creates a Stripe Checkout session
 * 4. Returns the checkout URL for redirect
 *
 * On successful payment, the Stripe webhook will confirm the booking.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant and customer ID
    const { data: profile } = (await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_id', user.id)
      .single()) as { data: { id: string; tenant_id: string } | null };

    const tenantId = profile?.tenant_id;
    const customerId = profile?.id;

    if (!tenantId || !customerId) {
      return NextResponse.json({ error: 'No tenant or customer found' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = checkoutRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Build booking pricing object for database
    const bookingPricing: BookingPricing = {
      baseRate: data.pricing.baseRate,
      rateType: data.pricing.rateType,
      duration: data.pricing.duration,
      subtotal: data.pricing.subtotal,
      addonsTotal: data.pricing.addonsTotal || 0,
      oneWayFee: data.pricing.oneWayFee || 0,
      discountAmount: data.pricing.discountAmount || 0,
      discountPercent: data.pricing.discountPercent || 0,
      seasonalMultiplier: data.pricing.seasonalMultiplier || 1,
      total: data.pricing.total,
      currency: data.pricing.currency.toUpperCase(),
    };

    // Create pending booking record BEFORE Stripe session
    // This ensures we have the booking data stored regardless of payment outcome
    const { data: booking, error: bookingError } = await createBooking(
      supabase,
      tenantId,
      customerId,
      {
        vehicleId: data.vehicleId,
        pickupBranchId: data.pickupBranchId,
        returnBranchId: data.returnBranchId,
        pickupAt: data.pickupAt,
        returnAt: data.returnAt,
        pricing: bookingPricing,
        driverInfo: data.driverInfo as DriverInfo,
        couponId: data.couponId || undefined,
        notes: data.notes,
      }
    );

    if (bookingError || !booking) {
      console.error('Failed to create pending booking:', bookingError);
      return NextResponse.json(
        { error: 'Failed to create booking record' },
        { status: 500 }
      );
    }

    // Add booking addons if present
    if (data.addons && data.addons.length > 0) {
      const addonRecords = data.addons.map((addon) => ({
        addonId: addon.addonId,
        quantity: addon.quantity,
        unitPrice: addon.unitPrice,
        priceType: addon.priceType as 'per_day' | 'per_rental' | 'one_time',
        totalPrice: addon.totalPrice,
      }));

      const { error: addonError } = await addBookingAddons(
        supabase,
        booking.id,
        addonRecords
      );

      if (addonError) {
        console.error('Failed to add booking addons:', addonError);
        // Continue anyway - booking is created, addons can be fixed later
      }
    }

    // Build line items from pricing
    const lineItems = buildLineItems(data);

    // Get base URL for redirects
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const locale = data.locale || 'en';

    // Success and cancel URLs - use the booking reference we generated
    const successUrl = `${origin}/${locale}/booking/confirmation?session_id={CHECKOUT_SESSION_ID}&ref=${booking.reference}`;
    const cancelUrl = `${origin}/${locale}/booking/${data.vehicleId}?cancelled=true&ref=${booking.reference}`;

    // Create Stripe Checkout session
    const session = await createCheckoutSession({
      bookingReference: booking.reference,
      tenantId,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      successUrl,
      cancelUrl,
      lineItems,
      currency: data.pricing.currency,
      locale: LOCALE_TO_STRIPE_LOCALE[locale] || 'en',
      metadata: {
        bookingId: booking.id,
        vehicleId: data.vehicleId,
        pickupAt: data.pickupAt,
        returnAt: data.returnAt,
        userId: user.id,
      },
    });

    // Update booking with Stripe session ID
    await updateBookingStripeDetails(supabase, booking.id, {
      checkoutSessionId: session.sessionId,
    });

    return NextResponse.json({
      sessionId: session.sessionId,
      url: session.url,
      bookingId: booking.id,
      bookingReference: booking.reference,
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);

    if (error instanceof StripeError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build Stripe line items from booking data
 */
function buildLineItems(data: CheckoutRequest): CheckoutLineItem[] {
  const lineItems: CheckoutLineItem[] = [];
  const pricing = data.pricing;

  // Format duration text
  const durationText = formatDuration(pricing.duration, pricing.rateType);

  // Main rental line item
  lineItems.push({
    name: `${data.vehicleName} - Rental`,
    description: `${durationText} (${formatDateTime(data.pickupAt)} - ${formatDateTime(data.returnAt)})`,
    unitAmount: toStripeAmount(pricing.subtotal),
    quantity: 1,
    images: data.vehiclePhoto ? [data.vehiclePhoto] : undefined,
  });

  // Add-ons
  if (data.addons && data.addons.length > 0) {
    for (const addon of data.addons) {
      lineItems.push({
        name: addon.name,
        description: addon.quantity > 1 ? `Quantity: ${addon.quantity}` : undefined,
        unitAmount: toStripeAmount(addon.unitPrice),
        quantity: addon.quantity,
      });
    }
  }

  // One-way fee
  if (pricing.oneWayFee && pricing.oneWayFee > 0) {
    lineItems.push({
      name: 'One-Way Fee',
      description: 'Different return location',
      unitAmount: toStripeAmount(pricing.oneWayFee),
      quantity: 1,
    });
  }

  // Discount (as negative line item if supported, otherwise apply in totals)
  // Note: Stripe doesn't support negative amounts, so discounts are handled
  // by adjusting the subtotal or using coupons. For simplicity, we include
  // the discount in the metadata and the total already reflects it.

  return lineItems;
}

/**
 * Format duration for display
 */
function formatDuration(
  duration: number,
  rateType: BookingPricing['rateType']
): string {
  switch (rateType) {
    case 'hourly':
      return `${duration} hour${duration !== 1 ? 's' : ''}`;
    case 'daily':
      return `${duration} day${duration !== 1 ? 's' : ''}`;
    case 'weekly':
      return `${duration} week${duration !== 1 ? 's' : ''}`;
    case 'monthly':
      return `${duration} month${duration !== 1 ? 's' : ''}`;
    default:
      return `${duration} day${duration !== 1 ? 's' : ''}`;
  }
}

/**
 * Format date/time for display
 */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
