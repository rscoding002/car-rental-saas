import { type NextRequest, NextResponse } from 'next/server';

import { checkPlatformAdminApi } from '@/lib/auth/middleware';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/platform-admin/tenants/[id]
 * Get a single tenant with full details (platform admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check platform admin auth
  const { authorized, error } = await checkPlatformAdminApi();
  if (!authorized) {
    return NextResponse.json({ error: error?.message }, { status: error?.status });
  }

  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch tenant
    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get stats
    const [usersResult, vehiclesResult, bookingsResult, branchesResult] = await Promise.all([
      // User count and breakdown
      supabase
        .from('users')
        .select('role, status')
        .eq('tenant_id', id),

      // Vehicle count and status breakdown
      supabase
        .from('vehicles')
        .select('status')
        .eq('tenant_id', id),

      // Booking count and stats
      supabase
        .from('bookings')
        .select('status, pricing')
        .eq('tenant_id', id),

      // Branch count
      supabase
        .from('branches')
        .select('id, status')
        .eq('tenant_id', id),
    ]);

    const users = usersResult.data || [];
    const vehicles = vehiclesResult.data || [];
    const bookings = bookingsResult.data || [];
    const branches = branchesResult.data || [];

    // Calculate user stats
    const userStats = {
      total: users.length,
      admins: users.filter(u => u.role === 'tenant_admin').length,
      managers: users.filter(u => u.role === 'tenant_manager').length,
      staff: users.filter(u => u.role === 'tenant_staff').length,
      customers: users.filter(u => u.role === 'customer').length,
      active: users.filter(u => u.status === 'active').length,
    };

    // Calculate vehicle stats
    const vehicleStats = {
      total: vehicles.length,
      available: vehicles.filter(v => v.status === 'available').length,
      rented: vehicles.filter(v => v.status === 'rented').length,
      maintenance: vehicles.filter(v => v.status === 'maintenance').length,
      retired: vehicles.filter(v => v.status === 'retired').length,
    };

    // Calculate booking stats
    const bookingStats = {
      total: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      active: bookings.filter(b => b.status === 'active').length,
      completed: bookings.filter(b => b.status === 'completed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
      totalRevenue: bookings
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + ((b.pricing as any)?.total || 0), 0),
    };

    // Branch stats
    const branchStats = {
      total: branches.length,
      active: branches.filter(b => b.status === 'active').length,
    };

    return NextResponse.json({
      tenant,
      stats: {
        users: userStats,
        vehicles: vehicleStats,
        bookings: bookingStats,
        branches: branchStats,
      },
    });
  } catch (err) {
    console.error('Error in GET /api/platform-admin/tenants/[id]:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/platform-admin/tenants/[id]
 * Update a tenant (platform admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check platform admin auth
  const { authorized, error } = await checkPlatformAdminApi();
  if (!authorized) {
    return NextResponse.json({ error: error?.message }, { status: error?.status });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await createClient();

    // Validate tenant exists
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingTenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Build update object with allowed fields
    const allowedFields = ['name', 'slug', 'domain', 'status', 'subscription_tier', 'settings'];
    const updateData: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update tenant
    const { data: updatedTenant, error: updateError } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating tenant:', updateError);
      return NextResponse.json(
        { error: 'Failed to update tenant' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tenant: updatedTenant });
  } catch (err) {
    console.error('Error in PUT /api/platform-admin/tenants/[id]:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/platform-admin/tenants/[id]
 * Delete a tenant (platform admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check platform admin auth
  const { authorized, error } = await checkPlatformAdminApi();
  if (!authorized) {
    return NextResponse.json({ error: error?.message }, { status: error?.status });
  }

  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check if tenant has data
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', id);

    if ((usersCount || 0) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete tenant with existing users. Please remove all users first.' },
        { status: 400 }
      );
    }

    // Delete tenant
    const { error: deleteError } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting tenant:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete tenant' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/platform-admin/tenants/[id]:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
