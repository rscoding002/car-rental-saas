import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getDailyAvailabilityCounts,
  getVehicleBlocks,
  getBlocksForCalendar,
} from '@/lib/availability';

/**
 * GET /api/admin/availability
 * Get availability calendar data for a date range
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile and tenant
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
    }

    const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager', 'tenant_staff'];
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const vehicleId = searchParams.get('vehicleId');
    const branchId = searchParams.get('branchId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // If vehicle specific, get detailed calendar
    if (vehicleId) {
      // Get vehicle details
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('id, make, model, year, license_plate, branch_id, status')
        .eq('id', vehicleId)
        .eq('tenant_id', profile.tenant_id)
        .single();

      if (!vehicle) {
        return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
      }

      // Get bookings for this vehicle in date range
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id,
          reference,
          pickup_at,
          return_at,
          status,
          customer:users(first_name, last_name)
        `)
        .eq('vehicle_id', vehicleId)
        .in('status', ['pending', 'confirmed', 'active', 'completed'])
        .lte('pickup_at', `${endDate}T23:59:59Z`)
        .gte('return_at', `${startDate}T00:00:00Z`);

      // Get blocks for this vehicle
      const blocks = await getBlocksForCalendar(supabase, vehicleId, startDate, endDate);

      // Build day-by-day calendar
      const days = buildCalendarDays(startDate, endDate, bookings || [], blocks);

      return NextResponse.json({
        vehicle: {
          id: vehicle.id,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          licensePlate: vehicle.license_plate,
          status: vehicle.status,
        },
        dateRange: { startDate, endDate },
        days,
        bookings: (bookings || []).map((b: any) => ({
          id: b.id,
          reference: b.reference,
          pickupAt: b.pickup_at,
          returnAt: b.return_at,
          status: b.status,
          customerName: b.customer
            ? `${b.customer.first_name || ''} ${b.customer.last_name || ''}`.trim()
            : undefined,
        })),
        blocks,
      });
    }

    // Fleet-wide availability summary
    const effectiveBranchId = branchId || null;

    // Get all vehicles for the tenant (optionally filtered by branch)
    let vehiclesQuery = supabase
      .from('vehicles')
      .select('id, make, model, year, license_plate, branch_id, status, category_id')
      .eq('tenant_id', profile.tenant_id)
      .neq('status', 'retired');

    if (effectiveBranchId) {
      vehiclesQuery = vehiclesQuery.eq('branch_id', effectiveBranchId);
    }

    const { data: vehicles } = await vehiclesQuery;

    if (!vehicles || vehicles.length === 0) {
      return NextResponse.json({
        dateRange: { startDate, endDate },
        vehicles: [],
        summary: {
          totalVehicles: 0,
          availableDays: 0,
          bookedDays: 0,
          blockedDays: 0,
        },
      });
    }

    // Get all bookings in date range for these vehicles
    const vehicleIds = vehicles.map((v) => v.id);

    const { data: allBookings } = await supabase
      .from('bookings')
      .select('id, vehicle_id, pickup_at, return_at, status')
      .in('vehicle_id', vehicleIds)
      .in('status', ['pending', 'confirmed', 'active'])
      .lte('pickup_at', `${endDate}T23:59:59Z`)
      .gte('return_at', `${startDate}T00:00:00Z`);

    // Get all blocks in date range
    const { data: allBlocks } = await supabase
      .from('availability_blocks')
      .select('id, vehicle_id, start_at, end_at, block_type, is_active')
      .in('vehicle_id', vehicleIds)
      .eq('is_active', true)
      .lte('start_at', `${endDate}T23:59:59Z`)
      .gte('end_at', `${startDate}T00:00:00Z`);

    // Build summary by vehicle
    const vehicleSummaries = vehicles.map((vehicle) => {
      const vehicleBookings = (allBookings || []).filter(
        (b) => b.vehicle_id === vehicle.id
      );
      const vehicleBlocks = (allBlocks || []).filter(
        (b) => b.vehicle_id === vehicle.id
      );

      return {
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        licensePlate: vehicle.license_plate,
        branchId: vehicle.branch_id,
        status: vehicle.status,
        bookingCount: vehicleBookings.length,
        blockCount: vehicleBlocks.length,
      };
    });

    return NextResponse.json({
      dateRange: { startDate, endDate },
      vehicles: vehicleSummaries,
      summary: {
        totalVehicles: vehicles.length,
        vehiclesWithBookings: vehicleSummaries.filter((v) => v.bookingCount > 0).length,
        vehiclesWithBlocks: vehicleSummaries.filter((v) => v.blockCount > 0).length,
        totalBookings: allBookings?.length || 0,
        totalBlocks: allBlocks?.length || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability data' },
      { status: 500 }
    );
  }
}

/**
 * Build calendar days from bookings and blocks
 */
function buildCalendarDays(
  startDate: string,
  endDate: string,
  bookings: any[],
  blocks: any[]
): any[] {
  const days: any[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const dayStart = new Date(`${dateStr}T00:00:00Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59Z`);

    // Find bookings on this day
    const dayBookings = bookings.filter((booking) => {
      const pickupAt = new Date(booking.pickup_at);
      const returnAt = new Date(booking.return_at);
      return pickupAt <= dayEnd && returnAt >= dayStart;
    });

    // Find blocks on this day
    const dayBlocks = blocks.filter((block) => {
      const blockStart = new Date(block.startAt);
      const blockEnd = new Date(block.endAt);
      return blockStart <= dayEnd && blockEnd >= dayStart;
    });

    const hasBookings = dayBookings.length > 0;
    const hasBlocks = dayBlocks.length > 0;

    days.push({
      date: dateStr,
      dayOfWeek: current.getDay(),
      isAvailable: !hasBookings && !hasBlocks,
      isPartiallyAvailable: false, // Could be calculated based on hours
      bookings: dayBookings.map((b) => ({
        id: b.id,
        reference: b.reference,
        status: b.status,
        isPickup: new Date(b.pickup_at).toISOString().split('T')[0] === dateStr,
        isReturn: new Date(b.return_at).toISOString().split('T')[0] === dateStr,
      })),
      blocks: dayBlocks.map((b) => ({
        id: b.id,
        type: b.type,
        reason: b.reason,
      })),
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
}
