import { type NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

import type { UserRole, UserStatus, BookingPricing } from '@/lib/supabase/types';

/**
 * GET /api/admin/customers
 * List customers for the current tenant with booking stats
 */
export async function GET(request: NextRequest) {
  try {
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') as UserStatus | null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') === 'asc';

    // Build query - only get customers
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('tenant_id', profile.tenant_id)
      .eq('role', 'customer');

    // Apply filters
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Apply sorting for database columns
    const dbSortable = ['created_at', 'first_name', 'last_name', 'email', 'status'];
    if (dbSortable.includes(sortBy)) {
      query = query.order(sortBy, { ascending: sortOrder });
    } else {
      // Default sort for computed fields - we'll sort in JS later
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: customers, count, error } = await query;

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get customer IDs for booking stats
    const customerIds = (customers || []).map((c) => c.id);

    // Fetch booking stats for customers
    let customersWithStats = (customers || []).map((customer) => ({
      ...customer,
      bookings_count: 0,
      total_spent: 0,
      last_booking_at: null as string | null,
    }));

    if (customerIds.length > 0) {
      // Get bookings for these customers
      const { data: bookings } = await supabase
        .from('bookings')
        .select('customer_id, pricing, created_at, status')
        .eq('tenant_id', profile.tenant_id)
        .in('customer_id', customerIds)
        .neq('status', 'cancelled');

      if (bookings && bookings.length > 0) {
        // Aggregate stats per customer
        const statsMap = new Map<string, { count: number; total: number; lastBooking: string | null }>();

        bookings.forEach((booking) => {
          const existing = statsMap.get(booking.customer_id) || { count: 0, total: 0, lastBooking: null };
          const pricing = booking.pricing as BookingPricing;
          const bookingTotal = pricing?.total || 0;

          statsMap.set(booking.customer_id, {
            count: existing.count + 1,
            total: existing.total + bookingTotal,
            lastBooking:
              !existing.lastBooking || booking.created_at > existing.lastBooking
                ? booking.created_at
                : existing.lastBooking,
          });
        });

        customersWithStats = customersWithStats.map((customer) => ({
          ...customer,
          bookings_count: statsMap.get(customer.id)?.count || 0,
          total_spent: statsMap.get(customer.id)?.total || 0,
          last_booking_at: statsMap.get(customer.id)?.lastBooking || null,
        }));
      }

      // Sort by computed fields if needed
      if (sortBy === 'bookings_count') {
        customersWithStats.sort((a, b) =>
          sortOrder ? a.bookings_count - b.bookings_count : b.bookings_count - a.bookings_count
        );
      } else if (sortBy === 'total_spent') {
        customersWithStats.sort((a, b) =>
          sortOrder ? a.total_spent - b.total_spent : b.total_spent - a.total_spent
        );
      }
    }

    // Get overall stats (unfiltered by search/status)
    const { data: allCustomers } = await supabase
      .from('users')
      .select('status, created_at')
      .eq('tenant_id', profile.tenant_id)
      .eq('role', 'customer');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      total: allCustomers?.length || 0,
      active: allCustomers?.filter((c) => c.status === 'active').length || 0,
      inactive: allCustomers?.filter((c) => c.status === 'inactive' || c.status === 'suspended').length || 0,
      newThisMonth: allCustomers?.filter((c) => new Date(c.created_at) >= startOfMonth).length || 0,
    };

    return NextResponse.json({
      customers: customersWithStats,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      stats,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/customers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
