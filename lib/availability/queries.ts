/**
 * Availability Database Queries
 *
 * Server-side queries for checking vehicle availability.
 * Handles booking conflicts, buffer time, manual blocks, and one-way rentals.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, BookingStatus, VehicleStatus, TenantSettings } from '@/lib/supabase/types';
import type {
  AvailabilityQueryInput,
  AvailabilitySearchInput,
  AvailabilityResult,
  ConflictingBooking,
  AvailableVehicle,
  UnavailabilityReason,
  BufferTimeSettings,
  EffectiveBufferTime,
} from './types';
import {
  dateRangesOverlap,
  addBufferTime,
  subtractBufferTime,
  getEffectiveBufferTime,
  isOneWayRental,
  BLOCKING_BOOKING_STATUSES,
  AVAILABLE_VEHICLE_STATUSES,
  DEFAULT_BUFFER_MINUTES,
} from './types';

// ============================================================================
// SINGLE VEHICLE AVAILABILITY
// ============================================================================

/**
 * Check availability for a single vehicle
 */
export async function checkVehicleAvailability(
  supabase: SupabaseClient<Database>,
  input: AvailabilityQueryInput
): Promise<AvailabilityResult> {
  const {
    vehicleId,
    pickupAt,
    returnAt,
    pickupBranchId,
    returnBranchId,
    excludeBookingId,
  } = input;

  const unavailabilityReasons: UnavailabilityReason[] = [];
  const conflictingBookings: ConflictingBooking[] = [];

  // 1. Get vehicle details
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('id, tenant_id, branch_id, category_id, status')
    .eq('id', vehicleId)
    .single();

  if (vehicleError || !vehicle) {
    return {
      isAvailable: false,
      vehicleId,
      pickupAt,
      returnAt,
      unavailabilityReasons: ['vehicle_status'],
    };
  }

  // 2. Check vehicle status
  if (!AVAILABLE_VEHICLE_STATUSES.includes(vehicle.status as VehicleStatus)) {
    unavailabilityReasons.push('vehicle_status');
  }

  // 3. Get tenant settings for buffer time
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', vehicle.tenant_id)
    .single();

  const bufferMinutes = tenant?.settings?.bufferTime ?? DEFAULT_BUFFER_MINUTES;
  const bufferSettings: BufferTimeSettings = {
    globalBufferMinutes: bufferMinutes,
    categoryOverrides: [],
    vehicleOverrides: [],
  };

  // Get effective buffer time for this vehicle
  const effectiveBuffer = getEffectiveBufferTime(
    vehicleId,
    vehicle.category_id,
    bufferSettings
  );

  // 4. Calculate buffered time range
  const bufferedPickupAt = subtractBufferTime(pickupAt, effectiveBuffer.bufferMinutes);
  const bufferedReturnAt = addBufferTime(returnAt, effectiveBuffer.bufferMinutes);

  // 5. Check for conflicting bookings
  let bookingsQuery = supabase
    .from('bookings')
    .select('id, reference, pickup_at, return_at, status, customer_id')
    .eq('vehicle_id', vehicleId)
    .in('status', BLOCKING_BOOKING_STATUSES as unknown as BookingStatus[]);

  if (excludeBookingId) {
    bookingsQuery = bookingsQuery.neq('id', excludeBookingId);
  }

  const { data: bookings } = await bookingsQuery;

  if (bookings && bookings.length > 0) {
    for (const booking of bookings) {
      // Check if booking overlaps with buffered time range
      if (
        dateRangesOverlap(
          bufferedPickupAt.toISOString(),
          bufferedReturnAt.toISOString(),
          booking.pickup_at,
          booking.return_at
        )
      ) {
        // Determine if it's a buffer conflict or direct booking conflict
        const isDirectConflict = dateRangesOverlap(
          pickupAt,
          returnAt,
          booking.pickup_at,
          booking.return_at
        );

        if (isDirectConflict) {
          if (!unavailabilityReasons.includes('booking_conflict')) {
            unavailabilityReasons.push('booking_conflict');
          }
        } else {
          if (!unavailabilityReasons.includes('buffer_time')) {
            unavailabilityReasons.push('buffer_time');
          }
        }

        conflictingBookings.push({
          bookingId: booking.id,
          reference: booking.reference,
          pickupAt: booking.pickup_at,
          returnAt: booking.return_at,
          status: booking.status,
        });
      }
    }
  }

  // 6. Check for manual availability blocks
  // Note: This will be expanded when availability_blocks table is created
  // For now, we check if vehicle status indicates maintenance
  if (vehicle.status === 'maintenance') {
    if (!unavailabilityReasons.includes('maintenance')) {
      unavailabilityReasons.push('maintenance');
    }
  }

  // 7. Check one-way rental availability
  const isOneWay = isOneWayRental(
    pickupBranchId || vehicle.branch_id,
    returnBranchId
  );

  let pickupBranchAvailable = true;
  let returnBranchAvailable = true;

  if (isOneWay && returnBranchId) {
    // Check if vehicle's home branch matches pickup branch
    if (pickupBranchId && vehicle.branch_id !== pickupBranchId) {
      pickupBranchAvailable = false;
      if (!unavailabilityReasons.includes('one_way_conflict')) {
        unavailabilityReasons.push('one_way_conflict');
      }
    }

    // Check return branch is active
    const { data: returnBranch } = await supabase
      .from('branches')
      .select('id, status')
      .eq('id', returnBranchId)
      .single();

    if (!returnBranch || returnBranch.status !== 'active') {
      returnBranchAvailable = false;
      if (!unavailabilityReasons.includes('branch_closed')) {
        unavailabilityReasons.push('branch_closed');
      }
    }
  }

  // 8. Check branch operating hours
  const effectivePickupBranchId = pickupBranchId || vehicle.branch_id;
  const { data: pickupBranch } = await supabase
    .from('branches')
    .select('id, status, operating_hours')
    .eq('id', effectivePickupBranchId)
    .single();

  if (!pickupBranch || pickupBranch.status !== 'active') {
    pickupBranchAvailable = false;
    if (!unavailabilityReasons.includes('branch_closed')) {
      unavailabilityReasons.push('branch_closed');
    }
  } else {
    // Check if branch is open at pickup time
    const pickupDate = new Date(pickupAt);
    const isPickupBranchOpen = isBranchOpenAt(pickupBranch.operating_hours, pickupDate);
    if (!isPickupBranchOpen) {
      pickupBranchAvailable = false;
      if (!unavailabilityReasons.includes('branch_closed')) {
        unavailabilityReasons.push('branch_closed');
      }
    }
  }

  // Check return branch operating hours
  const effectiveReturnBranchId = returnBranchId || effectivePickupBranchId;
  if (effectiveReturnBranchId !== effectivePickupBranchId) {
    const { data: returnBranch } = await supabase
      .from('branches')
      .select('id, status, operating_hours')
      .eq('id', effectiveReturnBranchId)
      .single();

    if (returnBranch) {
      const returnDate = new Date(returnAt);
      const isReturnBranchOpen = isBranchOpenAt(returnBranch.operating_hours, returnDate);
      if (!isReturnBranchOpen) {
        returnBranchAvailable = false;
        if (!unavailabilityReasons.includes('branch_closed')) {
          unavailabilityReasons.push('branch_closed');
        }
      }
    }
  } else if (pickupBranch) {
    // Same branch for pickup and return
    const returnDate = new Date(returnAt);
    const isReturnBranchOpen = isBranchOpenAt(pickupBranch.operating_hours, returnDate);
    if (!isReturnBranchOpen) {
      returnBranchAvailable = false;
      if (!unavailabilityReasons.includes('branch_closed')) {
        unavailabilityReasons.push('branch_closed');
      }
    }
  }

  const isAvailable = unavailabilityReasons.length === 0;

  return {
    isAvailable,
    vehicleId,
    pickupAt,
    returnAt,
    unavailabilityReasons: isAvailable ? undefined : unavailabilityReasons,
    conflictingBookings: conflictingBookings.length > 0 ? conflictingBookings : undefined,
    bufferTimeApplied: effectiveBuffer.bufferMinutes,
    isOneWay,
    pickupBranchAvailable,
    returnBranchAvailable,
  };
}

/**
 * Check availability for multiple vehicles at once
 */
export async function checkMultipleVehiclesAvailability(
  supabase: SupabaseClient<Database>,
  vehicleIds: string[],
  pickupAt: string,
  returnAt: string,
  options: {
    pickupBranchId?: string;
    returnBranchId?: string;
    excludeBookingId?: string;
  } = {}
): Promise<Map<string, AvailabilityResult>> {
  const results = new Map<string, AvailabilityResult>();

  // Process in parallel for better performance
  const promises = vehicleIds.map((vehicleId) =>
    checkVehicleAvailability(supabase, {
      vehicleId,
      pickupAt,
      returnAt,
      ...options,
    })
  );

  const availabilityResults = await Promise.all(promises);

  vehicleIds.forEach((vehicleId, index) => {
    results.set(vehicleId, availabilityResults[index]);
  });

  return results;
}

// ============================================================================
// AVAILABLE VEHICLES SEARCH
// ============================================================================

/**
 * Search for available vehicles matching criteria
 */
export async function searchAvailableVehicles(
  supabase: SupabaseClient<Database>,
  input: AvailabilitySearchInput
): Promise<{ data: AvailableVehicle[]; count: number }> {
  const {
    tenantId,
    pickupAt,
    returnAt,
    pickupBranchId,
    returnBranchId,
    categoryId,
    transmission,
    fuelType,
    minSeats,
    minDoors,
    features,
  } = input;

  // 1. Get tenant buffer time setting
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const bufferMinutes = tenant?.settings?.bufferTime ?? DEFAULT_BUFFER_MINUTES;

  // 2. Build base vehicle query
  let query = supabase
    .from('vehicles')
    .select(
      `
      id, make, model, year, transmission, fuel_type, seats, doors,
      luggage_capacity, features, photos, category_id, branch_id,
      category:vehicle_categories(id, name),
      branch:branches(id, name)
    `,
      { count: 'exact' }
    )
    .eq('tenant_id', tenantId)
    .eq('status', 'available')
    .eq('branch_id', pickupBranchId);

  // Apply filters
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (transmission) {
    query = query.eq('transmission', transmission);
  }

  if (fuelType) {
    query = query.eq('fuel_type', fuelType);
  }

  if (minSeats) {
    query = query.gte('seats', minSeats);
  }

  if (minDoors) {
    query = query.gte('doors', minDoors);
  }

  if (features && features.length > 0) {
    query = query.contains('features', features);
  }

  // Order by make/model
  query = query.order('make').order('model');

  const { data: vehicles, error, count } = await query;

  if (error || !vehicles) {
    console.error('Error searching vehicles:', error);
    return { data: [], count: 0 };
  }

  // 3. Calculate buffered time range
  const bufferedPickupAt = subtractBufferTime(pickupAt, bufferMinutes);
  const bufferedReturnAt = addBufferTime(returnAt, bufferMinutes);

  // 4. Get all bookings that might conflict (batch query for efficiency)
  const vehicleIds = vehicles.map((v) => v.id);

  if (vehicleIds.length === 0) {
    return { data: [], count: 0 };
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select('vehicle_id, pickup_at, return_at')
    .in('vehicle_id', vehicleIds)
    .in('status', BLOCKING_BOOKING_STATUSES as unknown as BookingStatus[])
    .or(
      `and(pickup_at.lte.${bufferedReturnAt.toISOString()},return_at.gte.${bufferedPickupAt.toISOString()})`
    );

  // Create a set of vehicle IDs with conflicts
  const vehiclesWithConflicts = new Set<string>();

  if (bookings) {
    for (const booking of bookings) {
      if (
        dateRangesOverlap(
          bufferedPickupAt.toISOString(),
          bufferedReturnAt.toISOString(),
          booking.pickup_at,
          booking.return_at
        )
      ) {
        vehiclesWithConflicts.add(booking.vehicle_id);
      }
    }
  }

  // 5. Filter out vehicles with conflicts
  const availableVehicles: AvailableVehicle[] = vehicles
    .filter((v) => !vehiclesWithConflicts.has(v.id))
    .map((v) => ({
      id: v.id,
      make: v.make,
      model: v.model,
      year: v.year,
      categoryId: v.category_id,
      categoryName: (v.category as any)?.name,
      branchId: v.branch_id,
      branchName: (v.branch as any)?.name,
      transmission: v.transmission as 'manual' | 'automatic',
      fuelType: v.fuel_type,
      seats: v.seats,
      doors: v.doors,
      luggageCapacity: v.luggage_capacity ?? undefined,
      features: v.features || [],
      photoUrl: getPhotoUrl(v.photos),
      photos: v.photos?.map((p: any) => ({ url: p.url, isPrimary: p.isPrimary })),
      isAvailable: true as const,
    }));

  return {
    data: availableVehicles,
    count: availableVehicles.length,
  };
}

/**
 * Get available vehicle count for a date range (quick check)
 */
export async function getAvailableVehicleCount(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  pickupAt: string,
  returnAt: string,
  branchId: string
): Promise<number> {
  // Get all available vehicles at the branch
  const { count: totalVehicles } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('branch_id', branchId)
    .eq('status', 'available');

  if (!totalVehicles) {
    return 0;
  }

  // Get tenant buffer time
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const bufferMinutes = tenant?.settings?.bufferTime ?? DEFAULT_BUFFER_MINUTES;

  // Calculate buffered range
  const bufferedPickupAt = subtractBufferTime(pickupAt, bufferMinutes);
  const bufferedReturnAt = addBufferTime(returnAt, bufferMinutes);

  // Count conflicting bookings
  const { data: conflictingVehicleIds } = await supabase
    .from('bookings')
    .select('vehicle_id')
    .eq('tenant_id', tenantId)
    .in('status', BLOCKING_BOOKING_STATUSES as unknown as BookingStatus[])
    .lte('pickup_at', bufferedReturnAt.toISOString())
    .gte('return_at', bufferedPickupAt.toISOString());

  const uniqueConflictingVehicles = new Set(
    conflictingVehicleIds?.map((b) => b.vehicle_id) || []
  );

  return totalVehicles - uniqueConflictingVehicles.size;
}

// ============================================================================
// BOOKING CONFLICT QUERIES
// ============================================================================

/**
 * Get all bookings that conflict with a given time range for a vehicle
 */
export async function getConflictingBookings(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  pickupAt: string,
  returnAt: string,
  excludeBookingId?: string
): Promise<ConflictingBooking[]> {
  let query = supabase
    .from('bookings')
    .select(
      `
      id, reference, pickup_at, return_at, status,
      customer:users(first_name, last_name)
    `
    )
    .eq('vehicle_id', vehicleId)
    .in('status', BLOCKING_BOOKING_STATUSES as unknown as BookingStatus[])
    .lte('pickup_at', returnAt)
    .gte('return_at', pickupAt);

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId);
  }

  const { data: bookings } = await query;

  if (!bookings) {
    return [];
  }

  return bookings.map((booking) => ({
    bookingId: booking.id,
    reference: booking.reference,
    pickupAt: booking.pickup_at,
    returnAt: booking.return_at,
    status: booking.status,
    customerName: formatCustomerName(booking.customer as any),
  }));
}

/**
 * Check if a specific booking can be modified to a new time range
 */
export async function canModifyBookingDates(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  newPickupAt: string,
  newReturnAt: string
): Promise<{ canModify: boolean; conflicts: ConflictingBooking[] }> {
  // Get the booking to find vehicle ID
  const { data: booking } = await supabase
    .from('bookings')
    .select('vehicle_id')
    .eq('id', bookingId)
    .single();

  if (!booking) {
    return { canModify: false, conflicts: [] };
  }

  // Check for conflicts excluding this booking
  const conflicts = await getConflictingBookings(
    supabase,
    booking.vehicle_id,
    newPickupAt,
    newReturnAt,
    bookingId
  );

  return {
    canModify: conflicts.length === 0,
    conflicts,
  };
}

// ============================================================================
// BUFFER TIME QUERIES
// ============================================================================

/**
 * Get buffer time settings for a tenant
 */
export async function getBufferTimeSettings(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<BufferTimeSettings> {
  // Get tenant global setting
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const globalBufferMinutes = tenant?.settings?.bufferTime ?? DEFAULT_BUFFER_MINUTES;

  // In the future, we could load category and vehicle overrides from a settings table
  // For now, return global setting only
  return {
    globalBufferMinutes,
    categoryOverrides: [],
    vehicleOverrides: [],
  };
}

/**
 * Get effective buffer time for a specific vehicle
 */
export async function getVehicleBufferTime(
  supabase: SupabaseClient<Database>,
  vehicleId: string
): Promise<EffectiveBufferTime> {
  // Get vehicle with tenant and category
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('id, tenant_id, category_id')
    .eq('id', vehicleId)
    .single();

  if (!vehicle) {
    return {
      vehicleId,
      bufferMinutes: DEFAULT_BUFFER_MINUTES,
      source: 'global',
    };
  }

  const bufferSettings = await getBufferTimeSettings(supabase, vehicle.tenant_id);

  return getEffectiveBufferTime(vehicleId, vehicle.category_id, bufferSettings);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a branch is open at a specific date/time
 */
function isBranchOpenAt(
  operatingHours: Record<string, { open: string; close: string } | null> | null,
  date: Date
): boolean {
  if (!operatingHours) {
    return true; // If no hours defined, assume 24/7
  }

  const days = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ] as const;
  const dayName = days[date.getDay()];
  const hours = operatingHours[dayName];

  if (!hours) {
    return false; // Closed on this day
  }

  const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  return timeString >= hours.open && timeString < hours.close;
}

/**
 * Get primary photo URL from photos array
 */
function getPhotoUrl(
  photos: Array<{ url: string; isPrimary?: boolean }> | null
): string | undefined {
  if (!photos || photos.length === 0) {
    return undefined;
  }

  const primary = photos.find((p) => p.isPrimary);
  return primary?.url || photos[0]?.url;
}

/**
 * Format customer name from user data
 */
function formatCustomerName(
  customer: { first_name?: string | null; last_name?: string | null } | null
): string | undefined {
  if (!customer) {
    return undefined;
  }

  const parts = [customer.first_name, customer.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

// ============================================================================
// DATE RANGE UTILITIES
// ============================================================================

/**
 * Get vehicles booked on a specific date
 */
export async function getVehiclesBookedOnDate(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  date: string
): Promise<string[]> {
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  const { data: bookings } = await supabase
    .from('bookings')
    .select('vehicle_id')
    .eq('tenant_id', tenantId)
    .in('status', BLOCKING_BOOKING_STATUSES as unknown as BookingStatus[])
    .lte('pickup_at', endOfDay)
    .gte('return_at', startOfDay);

  if (!bookings) {
    return [];
  }

  return [...new Set(bookings.map((b) => b.vehicle_id))];
}

/**
 * Get daily availability counts for a date range
 */
export async function getDailyAvailabilityCounts(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  branchId: string,
  startDate: string,
  endDate: string
): Promise<Map<string, { total: number; available: number; booked: number }>> {
  const results = new Map<string, { total: number; available: number; booked: number }>();

  // Get total available vehicles at branch
  const { count: totalVehicles } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('branch_id', branchId)
    .eq('status', 'available');

  const total = totalVehicles || 0;

  // Get all bookings in the date range
  const { data: bookings } = await supabase
    .from('bookings')
    .select('vehicle_id, pickup_at, return_at')
    .eq('tenant_id', tenantId)
    .in('status', BLOCKING_BOOKING_STATUSES as unknown as BookingStatus[])
    .lte('pickup_at', `${endDate}T23:59:59.999Z`)
    .gte('return_at', `${startDate}T00:00:00.000Z`);

  // Generate all dates in range
  const currentDate = new Date(startDate);
  const lastDate = new Date(endDate);

  while (currentDate <= lastDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    // Count vehicles booked on this day
    const bookedVehicles = new Set<string>();

    if (bookings) {
      for (const booking of bookings) {
        const bookingStart = new Date(booking.pickup_at);
        const bookingEnd = new Date(booking.return_at);

        if (bookingStart <= endOfDay && bookingEnd >= startOfDay) {
          bookedVehicles.add(booking.vehicle_id);
        }
      }
    }

    const booked = bookedVehicles.size;
    const available = Math.max(0, total - booked);

    results.set(dateStr, { total, available, booked });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return results;
}
