/**
 * Booking Database Queries
 *
 * Server-side queries for fetching and managing booking data.
 * All operations are tenant-scoped through RLS policies.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  Database,
  Booking as DbBooking,
  BookingInsert as DbBookingInsert,
  BookingUpdate as DbBookingUpdate,
  BookingAddon as DbBookingAddon,
  BookingAddonInsert as DbBookingAddonInsert,
  BookingStatus,
  BookingPricing,
  DriverInfo,
  PriceType,
} from '@/lib/supabase/types';
import type {
  BookingData,
  BookingWithRelations,
  BookingAddonData,
  BookingSummary,
  BookingListFilters,
  BookingListResult,
  BookingSortField,
  CreateBookingInput,
  UpdateBookingInput,
  BookingSource,
  CancellationReasonType,
} from './types';
import {
  BLOCKING_STATUSES,
  calculateDurationDays,
  isOneWayRental,
} from './types';
import { generateBookingReference } from './reference-generator';

// ============================================================================
// TYPE CONVERTERS
// ============================================================================

/**
 * Convert database booking to application booking
 */
function dbBookingToBooking(dbBooking: DbBooking): BookingData {
  return {
    id: dbBooking.id,
    tenantId: dbBooking.tenant_id,
    reference: dbBooking.reference,
    customerId: dbBooking.customer_id,
    vehicleId: dbBooking.vehicle_id,
    pickupBranchId: dbBooking.pickup_branch_id,
    returnBranchId: dbBooking.return_branch_id,
    pickupAt: dbBooking.pickup_at,
    returnAt: dbBooking.return_at,
    status: dbBooking.status,
    pricing: dbBooking.pricing,
    couponId: dbBooking.coupon_id,
    driverInfo: dbBooking.driver_info,
    notes: dbBooking.notes,
    cancelledAt: dbBooking.cancelled_at,
    cancellationReason: dbBooking.cancellation_reason,
    stripePaymentIntentId: dbBooking.stripe_payment_intent_id,
    stripeCheckoutSessionId: dbBooking.stripe_checkout_session_id,
    stripeRefundId: dbBooking.stripe_refund_id,
    refundAmount: dbBooking.refund_amount,
    refundStatus: dbBooking.refund_status,
    refundedAt: dbBooking.refunded_at,
    createdAt: dbBooking.created_at,
    updatedAt: dbBooking.updated_at,
  };
}

/**
 * Convert database booking addon to application addon
 */
function dbAddonToBookingAddon(dbAddon: DbBookingAddon): BookingAddonData {
  return {
    id: dbAddon.id,
    bookingId: dbAddon.booking_id,
    addonId: dbAddon.addon_id,
    quantity: dbAddon.quantity,
    unitPrice: dbAddon.unit_price,
    priceType: dbAddon.price_type,
    totalPrice: dbAddon.total_price,
    createdAt: dbAddon.created_at,
  };
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get a single booking by ID
 */
export async function getBookingById(
  supabase: SupabaseClient<Database>,
  bookingId: string
): Promise<BookingData | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (error || !data) {
    return null;
  }

  return dbBookingToBooking(data);
}

/**
 * Get a booking by reference number
 */
export async function getBookingByReference(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  reference: string
): Promise<BookingData | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('reference', reference.toUpperCase())
    .single();

  if (error || !data) {
    return null;
  }

  return dbBookingToBooking(data);
}

/**
 * Get a booking with all relations (vehicle, customer, branches, addons)
 */
export async function getBookingWithRelations(
  supabase: SupabaseClient<Database>,
  bookingId: string
): Promise<BookingWithRelations | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      vehicle:vehicles(
        id, make, model, year, license_plate, transmission, fuel_type, seats, photos,
        category:vehicle_categories(id, name)
      ),
      customer:users!bookings_customer_id_fkey(id, email, first_name, last_name, phone),
      pickup_branch:branches!bookings_pickup_branch_id_fkey(id, name, address, city, phone),
      return_branch:branches!bookings_return_branch_id_fkey(id, name, address, city, phone),
      coupon:coupons(id, code, discount_type, discount_value)
    `)
    .eq('id', bookingId)
    .single();

  if (error || !data) {
    console.error('Error fetching booking with relations:', error);
    return null;
  }

  // Get booking addons separately
  const { data: addons } = await supabase
    .from('booking_addons')
    .select(`
      *,
      addon:addons(id, name, description, image_url)
    `)
    .eq('booking_id', bookingId);

  const booking = dbBookingToBooking(data);
  const vehicleData = data.vehicle as any;
  const customerData = data.customer as any;
  const pickupBranchData = data.pickup_branch as any;
  const returnBranchData = data.return_branch as any;
  const couponData = data.coupon as any;

  return {
    ...booking,
    vehicle: vehicleData ? {
      id: vehicleData.id,
      make: vehicleData.make,
      model: vehicleData.model,
      year: vehicleData.year,
      licensePlate: vehicleData.license_plate,
      transmission: vehicleData.transmission,
      fuelType: vehicleData.fuel_type,
      seats: vehicleData.seats,
      photoUrl: getPhotoUrl(vehicleData.photos),
      category: vehicleData.category ? {
        id: vehicleData.category.id,
        name: vehicleData.category.name,
      } : undefined,
    } : undefined,
    customer: customerData ? {
      id: customerData.id,
      email: customerData.email,
      firstName: customerData.first_name,
      lastName: customerData.last_name,
      phone: customerData.phone,
    } : undefined,
    pickupBranch: pickupBranchData ? {
      id: pickupBranchData.id,
      name: pickupBranchData.name,
      address: pickupBranchData.address,
      city: pickupBranchData.city,
      phone: pickupBranchData.phone,
    } : undefined,
    returnBranch: returnBranchData ? {
      id: returnBranchData.id,
      name: returnBranchData.name,
      address: returnBranchData.address,
      city: returnBranchData.city,
      phone: returnBranchData.phone,
    } : undefined,
    addons: addons?.map((a) => {
      const addonData = a.addon as any;
      return {
        ...dbAddonToBookingAddon(a),
        addon: addonData ? {
          id: addonData.id,
          name: addonData.name,
          description: addonData.description,
          imageUrl: addonData.image_url,
        } : undefined,
      };
    }),
    coupon: couponData ? {
      id: couponData.id,
      code: couponData.code,
      discountType: couponData.discount_type,
      discountValue: couponData.discount_value,
    } : undefined,
  };
}

/**
 * List bookings with filters and pagination
 */
export async function listBookings(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  filters: BookingListFilters = {}
): Promise<BookingListResult> {
  const {
    status,
    customerId,
    vehicleId,
    branchId,
    dateFrom,
    dateTo,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc',
    page = 1,
    pageSize = 20,
  } = filters;

  let query = supabase
    .from('bookings')
    .select(`
      *,
      vehicle:vehicles(id, make, model, photos),
      customer:users!bookings_customer_id_fkey(id, email, first_name, last_name),
      pickup_branch:branches!bookings_pickup_branch_id_fkey(id, name),
      return_branch:branches!bookings_return_branch_id_fkey(id, name)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Apply status filter
  if (status) {
    if (Array.isArray(status)) {
      query = query.in('status', status);
    } else {
      query = query.eq('status', status);
    }
  }

  // Apply customer filter
  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  // Apply vehicle filter
  if (vehicleId) {
    query = query.eq('vehicle_id', vehicleId);
  }

  // Apply branch filter (pickup or return)
  if (branchId) {
    query = query.or(`pickup_branch_id.eq.${branchId},return_branch_id.eq.${branchId}`);
  }

  // Apply date range filters
  if (dateFrom) {
    query = query.gte('pickup_at', dateFrom);
  }

  if (dateTo) {
    query = query.lte('pickup_at', dateTo);
  }

  // Apply search filter
  if (search) {
    query = query.ilike('reference', `%${search}%`);
  }

  // Apply sorting
  const sortColumn = getSortColumn(sortBy);
  query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

  // Apply pagination
  const offset = (page - 1) * pageSize;
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error listing bookings:', error);
    return {
      bookings: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      hasMore: false,
    };
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  const bookings: BookingSummary[] = (data || []).map((booking) => {
    const vehicleData = booking.vehicle as any;
    const customerData = booking.customer as any;
    const pickupBranchData = booking.pickup_branch as any;
    const returnBranchData = booking.return_branch as any;

    return {
      id: booking.id,
      reference: booking.reference,
      vehicleName: vehicleData ? `${vehicleData.make} ${vehicleData.model}` : 'Unknown',
      vehiclePhoto: getPhotoUrl(vehicleData?.photos),
      pickupBranch: pickupBranchData?.name || 'Unknown',
      returnBranch: returnBranchData?.name || 'Unknown',
      pickupAt: booking.pickup_at,
      returnAt: booking.return_at,
      status: booking.status,
      total: booking.pricing.total,
      currency: booking.pricing.currency,
      customerName: formatCustomerName(customerData),
      customerEmail: customerData?.email,
      isOneWay: booking.pickup_branch_id !== booking.return_branch_id,
      durationDays: calculateDurationDays(booking.pickup_at, booking.return_at),
    };
  });

  return {
    bookings,
    total,
    page,
    pageSize,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Get customer's bookings
 */
export async function getCustomerBookings(
  supabase: SupabaseClient<Database>,
  customerId: string,
  options: {
    status?: BookingStatus | BookingStatus[];
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: BookingSummary[]; count: number }> {
  const { status, limit = 50, offset = 0 } = options;

  let query = supabase
    .from('bookings')
    .select(`
      *,
      vehicle:vehicles(id, make, model, photos),
      pickup_branch:branches!bookings_pickup_branch_id_fkey(id, name),
      return_branch:branches!bookings_return_branch_id_fkey(id, name)
    `, { count: 'exact' })
    .eq('customer_id', customerId);

  if (status) {
    if (Array.isArray(status)) {
      query = query.in('status', status);
    } else {
      query = query.eq('status', status);
    }
  }

  query = query
    .order('pickup_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching customer bookings:', error);
    return { data: [], count: 0 };
  }

  const bookings: BookingSummary[] = (data || []).map((booking) => {
    const vehicleData = booking.vehicle as any;
    const pickupBranchData = booking.pickup_branch as any;
    const returnBranchData = booking.return_branch as any;

    return {
      id: booking.id,
      reference: booking.reference,
      vehicleName: vehicleData ? `${vehicleData.make} ${vehicleData.model}` : 'Unknown',
      vehiclePhoto: getPhotoUrl(vehicleData?.photos),
      pickupBranch: pickupBranchData?.name || 'Unknown',
      returnBranch: returnBranchData?.name || 'Unknown',
      pickupAt: booking.pickup_at,
      returnAt: booking.return_at,
      status: booking.status,
      total: booking.pricing.total,
      currency: booking.pricing.currency,
      isOneWay: booking.pickup_branch_id !== booking.return_branch_id,
      durationDays: calculateDurationDays(booking.pickup_at, booking.return_at),
    };
  });

  return { data: bookings, count: count || 0 };
}

/**
 * Get today's pickups for a branch
 */
export async function getTodaysPickups(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  branchId?: string
): Promise<BookingSummary[]> {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  let query = supabase
    .from('bookings')
    .select(`
      *,
      vehicle:vehicles(id, make, model, photos),
      customer:users!bookings_customer_id_fkey(id, email, first_name, last_name),
      pickup_branch:branches!bookings_pickup_branch_id_fkey(id, name),
      return_branch:branches!bookings_return_branch_id_fkey(id, name)
    `)
    .eq('tenant_id', tenantId)
    .gte('pickup_at', startOfDay)
    .lte('pickup_at', endOfDay)
    .in('status', ['pending', 'confirmed'])
    .order('pickup_at', { ascending: true });

  if (branchId) {
    query = query.eq('pickup_branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching today\'s pickups:', error);
    return [];
  }

  return (data || []).map((booking) => {
    const vehicleData = booking.vehicle as any;
    const customerData = booking.customer as any;
    const pickupBranchData = booking.pickup_branch as any;
    const returnBranchData = booking.return_branch as any;

    return {
      id: booking.id,
      reference: booking.reference,
      vehicleName: vehicleData ? `${vehicleData.make} ${vehicleData.model}` : 'Unknown',
      vehiclePhoto: getPhotoUrl(vehicleData?.photos),
      pickupBranch: pickupBranchData?.name || 'Unknown',
      returnBranch: returnBranchData?.name || 'Unknown',
      pickupAt: booking.pickup_at,
      returnAt: booking.return_at,
      status: booking.status,
      total: booking.pricing.total,
      currency: booking.pricing.currency,
      customerName: formatCustomerName(customerData),
      customerEmail: customerData?.email,
      isOneWay: booking.pickup_branch_id !== booking.return_branch_id,
      durationDays: calculateDurationDays(booking.pickup_at, booking.return_at),
    };
  });
}

/**
 * Get today's returns for a branch
 */
export async function getTodaysReturns(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  branchId?: string
): Promise<BookingSummary[]> {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  let query = supabase
    .from('bookings')
    .select(`
      *,
      vehicle:vehicles(id, make, model, photos),
      customer:users!bookings_customer_id_fkey(id, email, first_name, last_name),
      pickup_branch:branches!bookings_pickup_branch_id_fkey(id, name),
      return_branch:branches!bookings_return_branch_id_fkey(id, name)
    `)
    .eq('tenant_id', tenantId)
    .gte('return_at', startOfDay)
    .lte('return_at', endOfDay)
    .eq('status', 'active')
    .order('return_at', { ascending: true });

  if (branchId) {
    query = query.eq('return_branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching today\'s returns:', error);
    return [];
  }

  return (data || []).map((booking) => {
    const vehicleData = booking.vehicle as any;
    const customerData = booking.customer as any;
    const pickupBranchData = booking.pickup_branch as any;
    const returnBranchData = booking.return_branch as any;

    return {
      id: booking.id,
      reference: booking.reference,
      vehicleName: vehicleData ? `${vehicleData.make} ${vehicleData.model}` : 'Unknown',
      vehiclePhoto: getPhotoUrl(vehicleData?.photos),
      pickupBranch: pickupBranchData?.name || 'Unknown',
      returnBranch: returnBranchData?.name || 'Unknown',
      pickupAt: booking.pickup_at,
      returnAt: booking.return_at,
      status: booking.status,
      total: booking.pricing.total,
      currency: booking.pricing.currency,
      customerName: formatCustomerName(customerData),
      customerEmail: customerData?.email,
      isOneWay: booking.pickup_branch_id !== booking.return_branch_id,
      durationDays: calculateDurationDays(booking.pickup_at, booking.return_at),
    };
  });
}

/**
 * Get upcoming bookings (next N days)
 */
export async function getUpcomingBookings(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  days: number = 7,
  options: { branchId?: string; limit?: number } = {}
): Promise<BookingSummary[]> {
  const { branchId, limit = 50 } = options;

  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  let query = supabase
    .from('bookings')
    .select(`
      *,
      vehicle:vehicles(id, make, model, photos),
      customer:users!bookings_customer_id_fkey(id, email, first_name, last_name),
      pickup_branch:branches!bookings_pickup_branch_id_fkey(id, name),
      return_branch:branches!bookings_return_branch_id_fkey(id, name)
    `)
    .eq('tenant_id', tenantId)
    .gte('pickup_at', now.toISOString())
    .lte('pickup_at', futureDate.toISOString())
    .in('status', ['pending', 'confirmed'])
    .order('pickup_at', { ascending: true })
    .limit(limit);

  if (branchId) {
    query = query.eq('pickup_branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching upcoming bookings:', error);
    return [];
  }

  return (data || []).map((booking) => {
    const vehicleData = booking.vehicle as any;
    const customerData = booking.customer as any;
    const pickupBranchData = booking.pickup_branch as any;
    const returnBranchData = booking.return_branch as any;

    return {
      id: booking.id,
      reference: booking.reference,
      vehicleName: vehicleData ? `${vehicleData.make} ${vehicleData.model}` : 'Unknown',
      vehiclePhoto: getPhotoUrl(vehicleData?.photos),
      pickupBranch: pickupBranchData?.name || 'Unknown',
      returnBranch: returnBranchData?.name || 'Unknown',
      pickupAt: booking.pickup_at,
      returnAt: booking.return_at,
      status: booking.status,
      total: booking.pricing.total,
      currency: booking.pricing.currency,
      customerName: formatCustomerName(customerData),
      customerEmail: customerData?.email,
      isOneWay: booking.pickup_branch_id !== booking.return_branch_id,
      durationDays: calculateDurationDays(booking.pickup_at, booking.return_at),
    };
  });
}

/**
 * Get active rentals (currently in progress)
 */
export async function getActiveRentals(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  branchId?: string
): Promise<BookingSummary[]> {
  let query = supabase
    .from('bookings')
    .select(`
      *,
      vehicle:vehicles(id, make, model, photos),
      customer:users!bookings_customer_id_fkey(id, email, first_name, last_name),
      pickup_branch:branches!bookings_pickup_branch_id_fkey(id, name),
      return_branch:branches!bookings_return_branch_id_fkey(id, name)
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('return_at', { ascending: true });

  if (branchId) {
    query = query.or(`pickup_branch_id.eq.${branchId},return_branch_id.eq.${branchId}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching active rentals:', error);
    return [];
  }

  return (data || []).map((booking) => {
    const vehicleData = booking.vehicle as any;
    const customerData = booking.customer as any;
    const pickupBranchData = booking.pickup_branch as any;
    const returnBranchData = booking.return_branch as any;

    return {
      id: booking.id,
      reference: booking.reference,
      vehicleName: vehicleData ? `${vehicleData.make} ${vehicleData.model}` : 'Unknown',
      vehiclePhoto: getPhotoUrl(vehicleData?.photos),
      pickupBranch: pickupBranchData?.name || 'Unknown',
      returnBranch: returnBranchData?.name || 'Unknown',
      pickupAt: booking.pickup_at,
      returnAt: booking.return_at,
      status: booking.status,
      total: booking.pricing.total,
      currency: booking.pricing.currency,
      customerName: formatCustomerName(customerData),
      customerEmail: customerData?.email,
      isOneWay: booking.pickup_branch_id !== booking.return_branch_id,
      durationDays: calculateDurationDays(booking.pickup_at, booking.return_at),
    };
  });
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Create a new booking
 */
export async function createBooking(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  customerId: string,
  input: {
    vehicleId: string;
    pickupBranchId: string;
    returnBranchId: string;
    pickupAt: string;
    returnAt: string;
    pricing: BookingPricing;
    driverInfo: DriverInfo;
    couponId?: string;
    notes?: string;
  }
): Promise<{ data: BookingData | null; error: string | null }> {
  const reference = generateBookingReference();

  const bookingInsert: DbBookingInsert = {
    tenant_id: tenantId,
    reference,
    customer_id: customerId,
    vehicle_id: input.vehicleId,
    pickup_branch_id: input.pickupBranchId,
    return_branch_id: input.returnBranchId,
    pickup_at: input.pickupAt,
    return_at: input.returnAt,
    status: 'pending',
    pricing: input.pricing,
    driver_info: input.driverInfo,
    coupon_id: input.couponId || null,
    notes: input.notes || null,
  };

  const { data, error } = await supabase
    .from('bookings')
    .insert(bookingInsert)
    .select('*')
    .single();

  if (error) {
    console.error('Error creating booking:', error);
    return { data: null, error: error.message };
  }

  return { data: dbBookingToBooking(data), error: null };
}

/**
 * Update an existing booking
 */
export async function updateBooking(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  updates: {
    pickupAt?: string;
    returnAt?: string;
    pickupBranchId?: string;
    returnBranchId?: string;
    pricing?: BookingPricing;
    driverInfo?: DriverInfo;
    notes?: string;
    status?: BookingStatus;
  }
): Promise<{ data: BookingData | null; error: string | null }> {
  const dbUpdates: DbBookingUpdate = {};

  if (updates.pickupAt) dbUpdates.pickup_at = updates.pickupAt;
  if (updates.returnAt) dbUpdates.return_at = updates.returnAt;
  if (updates.pickupBranchId) dbUpdates.pickup_branch_id = updates.pickupBranchId;
  if (updates.returnBranchId) dbUpdates.return_branch_id = updates.returnBranchId;
  if (updates.pricing) dbUpdates.pricing = updates.pricing;
  if (updates.driverInfo) dbUpdates.driver_info = updates.driverInfo;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.status) dbUpdates.status = updates.status;

  const { data, error } = await supabase
    .from('bookings')
    .update(dbUpdates)
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating booking:', error);
    return { data: null, error: error.message };
  }

  return { data: dbBookingToBooking(data), error: null };
}

/**
 * Update booking status
 */
export async function updateBookingStatus(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  status: BookingStatus
): Promise<{ data: BookingData | null; error: string | null }> {
  return updateBooking(supabase, bookingId, { status });
}

/**
 * Cancel a booking
 */
export async function cancelBooking(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  reason: string,
  reasonType: CancellationReasonType
): Promise<{ data: BookingData | null; error: string | null }> {
  const { data, error } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: `[${reasonType}] ${reason}`,
    })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error) {
    console.error('Error cancelling booking:', error);
    return { data: null, error: error.message };
  }

  return { data: dbBookingToBooking(data), error: null };
}

/**
 * Update Stripe payment details
 */
export async function updateBookingStripeDetails(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  details: {
    paymentIntentId?: string;
    checkoutSessionId?: string;
  }
): Promise<{ success: boolean; error: string | null }> {
  const updates: DbBookingUpdate = {};

  if (details.paymentIntentId) {
    updates.stripe_payment_intent_id = details.paymentIntentId;
  }
  if (details.checkoutSessionId) {
    updates.stripe_checkout_session_id = details.checkoutSessionId;
  }

  const { error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', bookingId);

  if (error) {
    console.error('Error updating Stripe details:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Update Stripe refund details
 */
export async function updateBookingRefundDetails(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  details: {
    refundId: string;
    refundAmount: number;
    refundStatus: string;
  }
): Promise<{ success: boolean; error: string | null }> {
  const updates: DbBookingUpdate = {
    stripe_refund_id: details.refundId,
    refund_amount: details.refundAmount,
    refund_status: details.refundStatus,
    refunded_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', bookingId);

  if (error) {
    console.error('Error updating refund details:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Confirm a booking (after payment)
 */
export async function confirmBooking(
  supabase: SupabaseClient<Database>,
  bookingId: string
): Promise<{ data: BookingData | null; error: string | null }> {
  return updateBookingStatus(supabase, bookingId, 'confirmed');
}

/**
 * Mark booking as active (pickup completed)
 */
export async function activateBooking(
  supabase: SupabaseClient<Database>,
  bookingId: string
): Promise<{ data: BookingData | null; error: string | null }> {
  return updateBookingStatus(supabase, bookingId, 'active');
}

/**
 * Complete a booking (return completed)
 */
export async function completeBooking(
  supabase: SupabaseClient<Database>,
  bookingId: string
): Promise<{ data: BookingData | null; error: string | null }> {
  return updateBookingStatus(supabase, bookingId, 'completed');
}

// ============================================================================
// BOOKING ADDONS OPERATIONS
// ============================================================================

/**
 * Get addons for a booking
 */
export async function getBookingAddons(
  supabase: SupabaseClient<Database>,
  bookingId: string
): Promise<BookingAddonData[]> {
  const { data, error } = await supabase
    .from('booking_addons')
    .select(`
      *,
      addon:addons(id, name, description, image_url)
    `)
    .eq('booking_id', bookingId);

  if (error) {
    console.error('Error fetching booking addons:', error);
    return [];
  }

  return (data || []).map((a) => {
    const addonData = a.addon as any;
    return {
      ...dbAddonToBookingAddon(a),
      addon: addonData ? {
        id: addonData.id,
        name: addonData.name,
        description: addonData.description,
        imageUrl: addonData.image_url,
      } : undefined,
    };
  });
}

/**
 * Add addons to a booking
 */
export async function addBookingAddons(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  addons: Array<{
    addonId: string;
    quantity: number;
    unitPrice: number;
    priceType: PriceType;
    totalPrice: number;
  }>
): Promise<{ success: boolean; error: string | null }> {
  const inserts: DbBookingAddonInsert[] = addons.map((addon) => ({
    booking_id: bookingId,
    addon_id: addon.addonId,
    quantity: addon.quantity,
    unit_price: addon.unitPrice,
    price_type: addon.priceType,
    total_price: addon.totalPrice,
  }));

  const { error } = await supabase
    .from('booking_addons')
    .insert(inserts);

  if (error) {
    console.error('Error adding booking addons:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Remove all addons from a booking
 */
export async function removeBookingAddons(
  supabase: SupabaseClient<Database>,
  bookingId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('booking_addons')
    .delete()
    .eq('booking_id', bookingId);

  if (error) {
    console.error('Error removing booking addons:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Replace booking addons (remove all, then add new)
 */
export async function replaceBookingAddons(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  addons: Array<{
    addonId: string;
    quantity: number;
    unitPrice: number;
    priceType: PriceType;
    totalPrice: number;
  }>
): Promise<{ success: boolean; error: string | null }> {
  // Remove existing addons
  const removeResult = await removeBookingAddons(supabase, bookingId);
  if (!removeResult.success) {
    return removeResult;
  }

  // Add new addons
  if (addons.length > 0) {
    return addBookingAddons(supabase, bookingId, addons);
  }

  return { success: true, error: null };
}

// ============================================================================
// VALIDATION QUERIES
// ============================================================================

/**
 * Check if a reference number is unique
 */
export async function isReferenceUnique(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  reference: string
): Promise<boolean> {
  const { count } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('reference', reference);

  return count === 0;
}

/**
 * Check if a booking can be cancelled
 */
export async function canCancelBooking(
  supabase: SupabaseClient<Database>,
  bookingId: string
): Promise<{ canCancel: boolean; reason?: string }> {
  const booking = await getBookingById(supabase, bookingId);

  if (!booking) {
    return { canCancel: false, reason: 'Booking not found' };
  }

  if (booking.status === 'cancelled') {
    return { canCancel: false, reason: 'Booking is already cancelled' };
  }

  if (booking.status === 'completed') {
    return { canCancel: false, reason: 'Booking is already completed' };
  }

  if (booking.status === 'active') {
    return { canCancel: false, reason: 'Cannot cancel an active rental' };
  }

  return { canCancel: true };
}

/**
 * Check if a booking can be modified
 */
export async function canModifyBooking(
  supabase: SupabaseClient<Database>,
  bookingId: string
): Promise<{ canModify: boolean; reason?: string }> {
  const booking = await getBookingById(supabase, bookingId);

  if (!booking) {
    return { canModify: false, reason: 'Booking not found' };
  }

  if (booking.status === 'cancelled') {
    return { canModify: false, reason: 'Booking is cancelled' };
  }

  if (booking.status === 'completed') {
    return { canModify: false, reason: 'Booking is completed' };
  }

  if (booking.status === 'active') {
    return { canModify: false, reason: 'Cannot modify an active rental' };
  }

  return { canModify: true };
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get booking statistics for a tenant
 */
export async function getBookingStats(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  options: { dateFrom?: string; dateTo?: string; branchId?: string } = {}
): Promise<{
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  averageDuration: number;
}> {
  const { dateFrom, dateTo, branchId } = options;

  let query = supabase
    .from('bookings')
    .select('status, pricing, pickup_at, return_at')
    .eq('tenant_id', tenantId);

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }

  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  if (branchId) {
    query = query.or(`pickup_branch_id.eq.${branchId},return_branch_id.eq.${branchId}`);
  }

  const { data: bookings } = await query;

  if (!bookings || bookings.length === 0) {
    return {
      totalBookings: 0,
      pendingBookings: 0,
      confirmedBookings: 0,
      activeBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      totalRevenue: 0,
      averageBookingValue: 0,
      averageDuration: 0,
    };
  }

  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter((b) => b.status === 'pending').length;
  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed').length;
  const activeBookings = bookings.filter((b) => b.status === 'active').length;
  const completedBookings = bookings.filter((b) => b.status === 'completed').length;
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled').length;

  const completedOnly = bookings.filter((b) => b.status === 'completed');
  const totalRevenue = completedOnly.reduce((sum, b) => sum + (b.pricing?.total || 0), 0);
  const averageBookingValue = completedOnly.length > 0
    ? Math.round(totalRevenue / completedOnly.length * 100) / 100
    : 0;

  const totalDuration = bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + calculateDurationDays(b.pickup_at, b.return_at), 0);
  const nonCancelledCount = bookings.filter((b) => b.status !== 'cancelled').length;
  const averageDuration = nonCancelledCount > 0
    ? Math.round(totalDuration / nonCancelledCount * 10) / 10
    : 0;

  return {
    totalBookings,
    pendingBookings,
    confirmedBookings,
    activeBookings,
    completedBookings,
    cancelledBookings,
    totalRevenue,
    averageBookingValue,
    averageDuration,
  };
}

/**
 * Get daily booking counts for a date range
 */
export async function getDailyBookingCounts(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<Map<string, { pickups: number; returns: number; active: number }>> {
  const results = new Map<string, { pickups: number; returns: number; active: number }>();

  // Get all bookings in range
  const { data: bookings } = await supabase
    .from('bookings')
    .select('pickup_at, return_at, status')
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'confirmed', 'active', 'completed'])
    .lte('pickup_at', `${endDate}T23:59:59.999Z`)
    .gte('return_at', `${startDate}T00:00:00.000Z`);

  // Generate all dates in range
  const currentDate = new Date(startDate);
  const lastDate = new Date(endDate);

  while (currentDate <= lastDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    results.set(dateStr, { pickups: 0, returns: 0, active: 0 });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Count bookings per day
  if (bookings) {
    for (const booking of bookings) {
      const pickupDate = booking.pickup_at.split('T')[0];
      const returnDate = booking.return_at.split('T')[0];

      // Count pickup
      if (results.has(pickupDate)) {
        const stats = results.get(pickupDate)!;
        stats.pickups++;
      }

      // Count return
      if (results.has(returnDate)) {
        const stats = results.get(returnDate)!;
        stats.returns++;
      }

      // Count active days
      const bookingStart = new Date(booking.pickup_at);
      const bookingEnd = new Date(booking.return_at);
      const rangeStart = new Date(startDate);
      const rangeEnd = new Date(endDate);

      const effectiveStart = bookingStart > rangeStart ? bookingStart : rangeStart;
      const effectiveEnd = bookingEnd < rangeEnd ? bookingEnd : rangeEnd;

      const activeDate = new Date(effectiveStart);
      while (activeDate <= effectiveEnd) {
        const activeDateStr = activeDate.toISOString().split('T')[0];
        if (results.has(activeDateStr)) {
          const stats = results.get(activeDateStr)!;
          stats.active++;
        }
        activeDate.setDate(activeDate.getDate() + 1);
      }
    }
  }

  return results;
}

/**
 * Get revenue by period
 */
export async function getRevenueByPeriod(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  period: 'day' | 'week' | 'month',
  startDate: string,
  endDate: string
): Promise<Array<{ period: string; revenue: number; bookingCount: number }>> {
  const { data: bookings } = await supabase
    .from('bookings')
    .select('created_at, pricing')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (!bookings || bookings.length === 0) {
    return [];
  }

  const periodData = new Map<string, { revenue: number; count: number }>();

  for (const booking of bookings) {
    const date = new Date(booking.created_at);
    let periodKey: string;

    switch (period) {
      case 'day':
        periodKey = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        periodKey = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        periodKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        break;
    }

    const current = periodData.get(periodKey) || { revenue: 0, count: 0 };
    current.revenue += booking.pricing?.total || 0;
    current.count++;
    periodData.set(periodKey, current);
  }

  return Array.from(periodData.entries())
    .map(([period, data]) => ({
      period,
      revenue: Math.round(data.revenue * 100) / 100,
      bookingCount: data.count,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get sort column name for database query
 */
function getSortColumn(sortBy: BookingSortField): string {
  const columnMap: Record<BookingSortField, string> = {
    'created_at': 'created_at',
    'pickup_at': 'pickup_at',
    'return_at': 'return_at',
    'reference': 'reference',
    'status': 'status',
    'total': 'pricing->total',
  };
  return columnMap[sortBy] || 'created_at';
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
