import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import type { UserRole, UserStatus, BookingPricing, VehiclePhoto } from '@/lib/supabase/types';

// Schema for updating a customer
const updateCustomerSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(50).optional().nullable(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/customers/[id]
 * Get customer details with booking history
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with tenant
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    // Check role - staff and above can view customers
    const allowedRoles: UserRole[] = ['platform_admin', 'tenant_admin', 'tenant_manager', 'tenant_staff'];
    if (!allowedRoles.includes(profile.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the customer
    const { data: customer, error: customerError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .eq('role', 'customer')
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Parse query params for bookings pagination
    const { searchParams } = new URL(request.url);
    const bookingsPage = parseInt(searchParams.get('bookingsPage') || '1', 10);
    const bookingsLimit = parseInt(searchParams.get('bookingsLimit') || '10', 10);
    const bookingsStatus = searchParams.get('bookingsStatus') || '';

    // Build bookings query
    let bookingsQuery = supabase
      .from('bookings')
      .select(
        `
        id,
        reference,
        pickup_at,
        return_at,
        status,
        pricing,
        created_at,
        vehicle:vehicles!bookings_vehicle_id_fkey(
          id,
          make,
          model,
          year,
          photos
        ),
        pickup_branch:branches!bookings_pickup_branch_id_fkey(
          id,
          name
        ),
        return_branch:branches!bookings_return_branch_id_fkey(
          id,
          name
        )
      `,
        { count: 'exact' }
      )
      .eq('tenant_id', profile.tenant_id)
      .eq('customer_id', id)
      .order('created_at', { ascending: false });

    // Apply status filter
    if (bookingsStatus) {
      bookingsQuery = bookingsQuery.eq('status', bookingsStatus);
    }

    // Apply pagination
    const from = (bookingsPage - 1) * bookingsLimit;
    const to = from + bookingsLimit - 1;
    bookingsQuery = bookingsQuery.range(from, to);

    const { data: bookingsData, count: bookingsCount, error: bookingsError } = await bookingsQuery;

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
    }

    // Transform bookings to BookingSummary format
    const bookings = (bookingsData || []).map((booking) => {
      const vehicle = booking.vehicle as {
        id: string;
        make: string;
        model: string;
        year: number;
        photos: VehiclePhoto[];
      } | null;
      const pickupBranch = booking.pickup_branch as { id: string; name: string } | null;
      const returnBranch = booking.return_branch as { id: string; name: string } | null;
      const pricing = booking.pricing as BookingPricing;
      const primaryPhoto = vehicle?.photos?.find((p) => p.isPrimary) || vehicle?.photos?.[0];

      // Calculate duration in days
      const pickupDate = new Date(booking.pickup_at);
      const returnDate = new Date(booking.return_at);
      const durationMs = returnDate.getTime() - pickupDate.getTime();
      const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

      return {
        id: booking.id,
        reference: booking.reference,
        vehicleName: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : 'Unknown Vehicle',
        vehiclePhoto: primaryPhoto?.url,
        pickupBranch: pickupBranch?.name || 'Unknown',
        returnBranch: returnBranch?.name || 'Unknown',
        pickupAt: booking.pickup_at,
        returnAt: booking.return_at,
        status: booking.status,
        total: pricing?.total || 0,
        currency: pricing?.currency || 'EUR',
        durationDays,
        isOneWay: pickupBranch?.id !== returnBranch?.id,
        createdAt: booking.created_at,
      };
    });

    // Get booking stats
    const { data: allBookings } = await supabase
      .from('bookings')
      .select('status, pricing')
      .eq('tenant_id', profile.tenant_id)
      .eq('customer_id', id);

    const bookingStats = {
      total: allBookings?.length || 0,
      completed: allBookings?.filter((b) => b.status === 'completed').length || 0,
      cancelled: allBookings?.filter((b) => b.status === 'cancelled').length || 0,
      upcoming: allBookings?.filter((b) => ['pending', 'confirmed'].includes(b.status)).length || 0,
      active: allBookings?.filter((b) => b.status === 'active').length || 0,
      totalSpent: allBookings
        ?.filter((b) => b.status !== 'cancelled')
        .reduce((sum, b) => {
          const pricing = b.pricing as BookingPricing;
          return sum + (pricing?.total || 0);
        }, 0) || 0,
    };

    return NextResponse.json({
      customer,
      bookings,
      bookingsTotal: bookingsCount || 0,
      bookingsPage,
      bookingsLimit,
      bookingsTotalPages: Math.ceil((bookingsCount || 0) / bookingsLimit),
      bookingStats,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/customers/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/customers/[id]
 * Update a customer's profile or status
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with tenant
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    // Check role - managers and above can update customers
    const allowedRoles: UserRole[] = ['platform_admin', 'tenant_admin', 'tenant_manager'];
    if (!allowedRoles.includes(profile.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify customer exists and belongs to tenant
    const { data: existingCustomer } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .eq('role', 'customer')
      .single();

    if (!existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateCustomerSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { firstName, lastName, phone, status } = validationResult.data;

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (firstName !== undefined) updateData.first_name = firstName;
    if (lastName !== undefined) updateData.last_name = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (status !== undefined) updateData.status = status;

    // Update the customer
    const adminClient = createAdminClient();
    const { data: updatedCustomer, error: updateError } = await adminClient
      .from('users')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating customer:', updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/customers/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
