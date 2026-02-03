import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateVehicleSchema } from '@/lib/fleet/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/fleet/[id]
 * Get a single vehicle
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 });
    }

    // Fetch vehicle with relations
    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .select(`
        *,
        category:vehicle_categories(id, name, description, icon, image_url),
        branch:branches(id, name, city, address)
      `)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (error || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    return NextResponse.json({ vehicle });
  } catch (error) {
    console.error('Fleet API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/fleet/[id]
 * Update a vehicle
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 });
    }

    // Check role
    const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager'];
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if vehicle exists and belongs to tenant
    const { data: existingVehicle } = await supabase
      .from('vehicles')
      .select('id, tenant_id, license_plate, vin')
      .eq('id', id)
      .single();

    if (!existingVehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    if (existingVehicle.tenant_id !== profile.tenant_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateVehicleSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const updates = validationResult.data;

    // Check for duplicate license plate if changing
    if (updates.license_plate && updates.license_plate !== existingVehicle.license_plate) {
      const { data: duplicatePlate } = await supabase
        .from('vehicles')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .ilike('license_plate', updates.license_plate)
        .neq('id', id)
        .single();

      if (duplicatePlate) {
        return NextResponse.json(
          { error: 'A vehicle with this license plate already exists' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate VIN if changing
    if (updates.vin && updates.vin !== existingVehicle.vin) {
      const { data: duplicateVin } = await supabase
        .from('vehicles')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .eq('vin', updates.vin)
        .neq('id', id)
        .single();

      if (duplicateVin) {
        return NextResponse.json(
          { error: 'A vehicle with this VIN already exists' },
          { status: 400 }
        );
      }
    }

    // Update vehicle
    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating vehicle:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ vehicle });
  } catch (error) {
    console.error('Fleet API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/fleet/[id]
 * Delete a vehicle (soft delete - set status to retired)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 });
    }

    // Check role (only admin can delete)
    const allowedRoles = ['platform_admin', 'tenant_admin'];
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if vehicle exists and belongs to tenant
    const { data: existingVehicle } = await supabase
      .from('vehicles')
      .select('id, tenant_id')
      .eq('id', id)
      .single();

    if (!existingVehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    if (existingVehicle.tenant_id !== profile.tenant_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check for active bookings
    const { count: activeBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('vehicle_id', id)
      .in('status', ['pending', 'confirmed', 'active']);

    if (activeBookings && activeBookings > 0) {
      return NextResponse.json(
        { error: `Cannot delete vehicle with ${activeBookings} active booking(s)` },
        { status: 400 }
      );
    }

    // Check query param for hard delete
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    if (hardDelete) {
      // Permanent delete
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting vehicle:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      // Soft delete - set status to retired
      const { error } = await supabase
        .from('vehicles')
        .update({ status: 'retired' })
        .eq('id', id);

      if (error) {
        console.error('Error retiring vehicle:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fleet API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
