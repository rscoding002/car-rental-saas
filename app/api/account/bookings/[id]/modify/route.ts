/**
 * Customer Booking Modification API
 *
 * GET: Preview modification with pricing recalculation (customer)
 * POST: Execute modification (customer)
 *
 * Unlike admin API, this validates that the customer owns the booking.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  previewModification,
  executeModification,
  formatModificationSummary,
} from '@/lib/booking/modification';
import { getBookingById, getBookingWithRelations } from '@/lib/booking/queries';
import { sendBookingModification } from '@/lib/email/booking-emails';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Schemas
// ============================================================================

const modifyBookingSchema = z.object({
  pickupAt: z.string().datetime().optional(),
  returnAt: z.string().datetime().optional(),
  pickupBranchId: z.string().uuid().optional(),
  returnBranchId: z.string().uuid().optional(),
  addons: z.array(z.object({
    addonId: z.string().uuid(),
    quantity: z.number().int().min(1),
  })).optional(),
}).refine(
  (data) => {
    // At least one field must be provided
    return data.pickupAt || data.returnAt || data.pickupBranchId ||
           data.returnBranchId || data.addons !== undefined;
  },
  { message: 'At least one modification field is required' }
);

// ============================================================================
// Helper: Verify customer owns booking
// ============================================================================

async function verifyBookingOwnership(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  bookingId: string,
  userId: string
): Promise<{ owned: boolean; tenantId?: string; error?: string }> {
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
    return { owned: false, error: 'You do not have permission to modify this booking' };
  }

  // Verify same tenant
  if (booking.tenantId !== profile.tenant_id) {
    return { owned: false, error: 'Booking not found' };
  }

  return { owned: true, tenantId: profile.tenant_id };
}

// ============================================================================
// GET - Preview modification
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

    // Parse query parameters for preview
    const { searchParams } = new URL(request.url);
    const pickupAt = searchParams.get('pickupAt') || undefined;
    const returnAt = searchParams.get('returnAt') || undefined;
    const pickupBranchId = searchParams.get('pickupBranchId') || undefined;
    const returnBranchId = searchParams.get('returnBranchId') || undefined;
    const addonsParam = searchParams.get('addons');

    // Parse addons if provided
    let addons: { addonId: string; quantity: number }[] | undefined;
    if (addonsParam) {
      try {
        addons = JSON.parse(addonsParam);
      } catch {
        return NextResponse.json(
          { error: 'Invalid addons format. Expected JSON array.' },
          { status: 400 }
        );
      }
    }

    // If no modification params, just check if booking can be modified
    if (!pickupAt && !returnAt && !pickupBranchId && !returnBranchId && !addons) {
      const preview = await previewModification(supabase, ownership.tenantId!, {
        bookingId,
      });

      return NextResponse.json({
        canModify: preview.canModify,
        reason: preview.reason,
        booking: preview.booking,
        originalPricing: preview.originalPricing,
        currency: preview.currency,
      });
    }

    // Preview the modification
    const preview = await previewModification(
      supabase,
      ownership.tenantId!,
      {
        bookingId,
        pickupAt,
        returnAt,
        pickupBranchId,
        returnBranchId,
        addons,
      },
      searchParams.get('locale') || 'en'
    );

    return NextResponse.json({
      ...preview,
      summary: formatModificationSummary(preview),
    });
  } catch (error) {
    console.error('Error previewing modification:', error);
    return NextResponse.json(
      { error: 'Failed to preview modification' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Execute modification
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
    const parseResult = modifyBookingSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { pickupAt, returnAt, pickupBranchId, returnBranchId, addons } = parseResult.data;

    // Fetch original booking before modification (for email changes comparison)
    const originalBooking = await getBookingWithRelations(supabase, bookingId);
    if (!originalBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Execute the modification
    // For customers, we don't skip payment processing but we also don't handle
    // additional payments automatically - they need to be done via new checkout
    const result = await executeModification(supabase, ownership.tenantId!, {
      bookingId,
      pickupAt,
      returnAt,
      pickupBranchId,
      returnBranchId,
      addons,
      skipPaymentProcessing: false,
      modifiedByUserId: user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to modify booking' },
        { status: 400 }
      );
    }

    // Send modification email (non-blocking)
    const locale = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0] || 'en';

    // Build changes object for email
    const emailChanges: {
      dates?: { oldPickup: string; newPickup: string; oldReturn: string; newReturn: string };
      pickupLocation?: { oldBranch: string; newBranch: string; newAddress: string; newCity: string };
      returnLocation?: { oldBranch: string; newBranch: string; newAddress: string; newCity: string };
      addons?: { added: { name: string; quantity: number; price: number }[]; removed: { name: string }[] };
    } = {};

    if (pickupAt || returnAt) {
      emailChanges.dates = {
        oldPickup: originalBooking.pickupAt,
        newPickup: pickupAt || originalBooking.pickupAt,
        oldReturn: originalBooking.returnAt,
        newReturn: returnAt || originalBooking.returnAt,
      };
    }

    if (pickupBranchId && pickupBranchId !== originalBooking.pickupBranchId) {
      // Fetch the new branch details
      const { data: newBranch } = await supabase
        .from('branches')
        .select('name, address, city')
        .eq('id', pickupBranchId)
        .single();

      emailChanges.pickupLocation = {
        oldBranch: originalBooking.pickupBranch?.name || '',
        newBranch: newBranch?.name || '',
        newAddress: newBranch?.address || '',
        newCity: newBranch?.city || '',
      };
    }

    if (returnBranchId && returnBranchId !== originalBooking.returnBranchId) {
      // Fetch the new branch details
      const { data: newBranch } = await supabase
        .from('branches')
        .select('name, address, city')
        .eq('id', returnBranchId)
        .single();

      emailChanges.returnLocation = {
        oldBranch: originalBooking.returnBranch?.name || '',
        newBranch: newBranch?.name || '',
        newAddress: newBranch?.address || '',
        newCity: newBranch?.city || '',
      };
    }

    // Handle addon changes
    if (addons !== undefined) {
      const oldAddonIds = new Set(originalBooking.addons?.map(a => a.addonId) || []);
      const newAddonIds = new Set(addons.map(a => a.addonId));

      // Get addon details for new addons
      const addedAddonIds = addons.filter(a => !oldAddonIds.has(a.addonId));
      const removedAddonIds = (originalBooking.addons || []).filter(a => !newAddonIds.has(a.addonId));

      if (addedAddonIds.length > 0 || removedAddonIds.length > 0) {
        const { data: addonDetails } = await supabase
          .from('addons')
          .select('id, name, price')
          .in('id', addedAddonIds.map(a => a.addonId));

        const getLocalizedName = (name: unknown): string => {
          if (typeof name === 'string') return name;
          if (name && typeof name === 'object') {
            const obj = name as Record<string, string | undefined>;
            return obj[locale] || obj['en'] || Object.values(obj).find(v => typeof v === 'string') || 'Add-on';
          }
          return 'Add-on';
        };

        emailChanges.addons = {
          added: addedAddonIds.map(a => {
            const detail = addonDetails?.find(d => d.id === a.addonId);
            return {
              name: detail ? getLocalizedName(detail.name) : 'Add-on',
              quantity: a.quantity,
              price: (detail?.price || 0) * a.quantity,
            };
          }),
          removed: removedAddonIds.map(a => ({
            name: a.addon ? getLocalizedName(a.addon.name) : 'Add-on',
          })),
        };
      }
    }

    // Send email asynchronously (don't block response)
    if (result.pricing) {
      sendBookingModification(
        supabase,
        bookingId,
        {
          modifiedBy: 'customer',
          changes: emailChanges,
          originalPricing: result.pricing.originalPricing,
          newPricing: result.pricing.newPricing,
          priceDifference: result.pricing.priceDifference,
          requiresPayment: result.pricing.requiresPayment,
          requiresRefund: result.pricing.requiresRefund,
          paymentStatus: result.refund?.status === 'succeeded' ? 'completed' : result.pricing.requiresRefund ? 'processing' : undefined,
        },
        locale
      ).catch(err => {
        console.error('[API] Failed to send modification email:', err);
      });
    }

    // Build response message
    let message = 'Booking modified successfully.';
    if (result.pricing?.requiresPayment) {
      message += ` Additional payment of ${result.pricing.priceDifference.toFixed(2)} ${result.pricing.currency} may be required. Please contact us for payment arrangements.`;
    } else if (result.refund) {
      message += ` A refund of ${result.refund.amount.toFixed(2)} ${result.refund.currency} has been processed.`;
    } else if (result.refundError) {
      message += ` ${result.refundError}`;
    }

    return NextResponse.json({
      success: true,
      booking: result.booking,
      pricing: result.pricing,
      refund: result.refund,
      refundError: result.refundError,
      message,
    });
  } catch (error) {
    console.error('Error modifying booking:', error);
    return NextResponse.json(
      { error: 'Failed to modify booking' },
      { status: 500 }
    );
  }
}
