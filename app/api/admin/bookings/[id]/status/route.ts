import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { updateBookingStatus, cancelBooking, getBookingById } from '@/lib/booking/queries';
import type { BookingStatus } from '@/lib/supabase/types';

// ============================================================================
// Schema
// ============================================================================

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'active', 'completed', 'cancelled']),
  cancellationReason: z.string().optional(),
});

// Valid status transitions
const validTransitions: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['active', 'cancelled'],
  active: ['completed'],
  completed: [],
  cancelled: [],
};

// ============================================================================
// PATCH /api/admin/bookings/[id]/status - Update booking status
// ============================================================================

export async function PATCH(
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

    // Get user's tenant and check staff role
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 });
    }

    const staffRoles = ['platform_admin', 'tenant_admin', 'tenant_manager', 'tenant_staff'];
    if (!staffRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = updateStatusSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status: newStatus, cancellationReason } = parseResult.data;

    // Get current booking
    const booking = await getBookingById(supabase, bookingId);

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check booking belongs to tenant
    if (booking.tenantId !== profile.tenant_id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if transition is valid
    const allowedTransitions = validTransitions[booking.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from "${booking.status}" to "${newStatus}"`,
          allowedTransitions,
        },
        { status: 400 }
      );
    }

    // Handle cancellation
    if (newStatus === 'cancelled') {
      const { data, error } = await cancelBooking(
        supabase,
        bookingId,
        cancellationReason || 'Cancelled by staff',
        'customer_request'
      );

      if (error) {
        return NextResponse.json({ error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        booking: {
          id: data?.id,
          status: data?.status,
          reference: data?.reference,
        },
      });
    }

    // Handle other status updates
    const { data, error } = await updateBookingStatus(supabase, bookingId, newStatus);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    // If moving to active, update vehicle status to rented
    if (newStatus === 'active' && booking.vehicleId) {
      await supabase
        .from('vehicles')
        .update({ status: 'rented' })
        .eq('id', booking.vehicleId);
    }

    // If moving to completed, update vehicle status to available
    if (newStatus === 'completed' && booking.vehicleId) {
      await supabase
        .from('vehicles')
        .update({ status: 'available' })
        .eq('id', booking.vehicleId);
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: data?.id,
        status: data?.status,
        reference: data?.reference,
      },
    });

  } catch (error) {
    console.error('Error updating booking status:', error);
    return NextResponse.json(
      { error: 'Failed to update booking status' },
      { status: 500 }
    );
  }
}
