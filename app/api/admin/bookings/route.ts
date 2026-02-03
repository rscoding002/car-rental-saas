import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createBooking, addBookingAddons, listBookings } from '@/lib/booking/queries';
import { calculatePricing } from '@/lib/pricing/calculator';
import type { BookingPricing, DriverInfo, BookingStatus } from '@/lib/supabase/types';

// ============================================================================
// Schemas
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

const createBookingSchema = z.object({
  // Customer - either existing ID or email to find/create
  customerId: z.string().uuid().optional(),
  customerEmail: z.string().email().optional(),

  // Booking details
  vehicleId: z.string().uuid(),
  pickupBranchId: z.string().uuid(),
  returnBranchId: z.string().uuid(),
  pickupAt: z.string(),
  returnAt: z.string(),

  // Driver info
  driverInfo: driverInfoSchema,

  // Optional
  addons: z.array(z.object({
    addonId: z.string().uuid(),
    quantity: z.number().min(1),
    unitPrice: z.number(),
    priceType: z.enum(['per_day', 'per_rental', 'one_time']),
    totalPrice: z.number(),
  })).optional(),
  couponId: z.string().uuid().optional().nullable(),
  notes: z.string().max(1000).optional(),

  // Staff-specific options
  source: z.enum(['admin', 'phone', 'walkin']).default('admin'),
  skipPayment: z.boolean().default(false),
  status: z.enum(['pending', 'confirmed']).default('confirmed'),
});

const listBookingsSchema = z.object({
  status: z.string().optional(),
  customerId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
});

// ============================================================================
// GET /api/admin/bookings - List bookings
// ============================================================================

export async function GET(request: NextRequest) {
  try {
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

    // Parse query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = listBookingsSchema.safeParse(searchParams);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const filters = parseResult.data;

    // Parse status if comma-separated
    const statusFilter = filters.status?.includes(',')
      ? filters.status.split(',') as BookingStatus[]
      : filters.status as BookingStatus | undefined;

    // Fetch bookings
    const result = await listBookings(supabase, profile.tenant_id, {
      ...filters,
      status: statusFilter,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/admin/bookings - Create staff booking
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant and check staff role
    const { data: profile } = await supabase
      .from('users')
      .select('id, tenant_id, role')
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
    const parseResult = createBookingSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Find or determine customer ID
    let customerId = data.customerId;

    if (!customerId && data.customerEmail) {
      // Try to find existing customer by email
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .eq('email', data.customerEmail)
        .single();

      if (existingUser) {
        customerId = existingUser.id;
      } else {
        // Create a new customer record
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            tenant_id: profile.tenant_id,
            email: data.customerEmail,
            first_name: data.driverInfo.firstName,
            last_name: data.driverInfo.lastName,
            phone: data.driverInfo.phone,
            role: 'customer',
          })
          .select('id')
          .single();

        if (createError || !newUser) {
          console.error('Failed to create customer:', createError);
          return NextResponse.json(
            { error: 'Failed to create customer record' },
            { status: 500 }
          );
        }

        customerId = newUser.id;
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID or email is required' },
        { status: 400 }
      );
    }

    // Get vehicle info for pricing calculation
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('id, category_id')
      .eq('id', data.vehicleId)
      .single();

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Calculate pricing
    const pricingResult = await calculatePricing(supabase, {
      tenantId: profile.tenant_id,
      vehicleId: data.vehicleId,
      categoryId: vehicle.category_id,
      pickupAt: data.pickupAt,
      returnAt: data.returnAt,
      pickupBranchId: data.pickupBranchId,
      returnBranchId: data.returnBranchId,
      couponId: data.couponId || undefined,
    }, {
      includeBreakdown: true,
    });

    // Build booking pricing object
    const bookingPricing: BookingPricing = {
      baseRate: pricingResult.baseRate,
      rateType: pricingResult.rateType,
      duration: pricingResult.duration,
      subtotal: pricingResult.subtotal,
      addonsTotal: data.addons?.reduce((sum, a) => sum + a.totalPrice, 0) || 0,
      oneWayFee: pricingResult.oneWayFee || 0,
      discountAmount: pricingResult.discountAmount || 0,
      discountPercent: pricingResult.discountPercent || 0,
      seasonalMultiplier: pricingResult.seasonalMultiplier || 1,
      total: pricingResult.total + (data.addons?.reduce((sum, a) => sum + a.totalPrice, 0) || 0),
      currency: pricingResult.currency,
    };

    // Create the booking
    const { data: booking, error: bookingError } = await createBooking(
      supabase,
      profile.tenant_id,
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
      console.error('Failed to create booking:', bookingError);
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      );
    }

    // Add booking addons if present
    if (data.addons && data.addons.length > 0) {
      const { error: addonError } = await addBookingAddons(
        supabase,
        booking.id,
        data.addons
      );

      if (addonError) {
        console.error('Failed to add booking addons:', addonError);
        // Continue - booking is created
      }
    }

    // If skipPayment is true or status is confirmed, update booking status
    if (data.skipPayment || data.status === 'confirmed') {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', booking.id);

      if (updateError) {
        console.error('Failed to confirm booking:', updateError);
      }
    }

    // Return created booking
    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        reference: booking.reference,
        status: data.skipPayment ? 'confirmed' : booking.status,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating staff booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
