import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createVehicleSchema } from '@/lib/fleet/types';

/**
 * GET /api/admin/fleet
 * List all vehicles for the current tenant
 */
export async function GET(request: NextRequest) {
  try {
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
    const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager', 'tenant_staff'];
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const categoryId = searchParams.get('category');
    const branchId = searchParams.get('branch');
    const search = searchParams.get('search');

    // Build query
    let query = supabase
      .from('vehicles')
      .select(`
        *,
        category:vehicle_categories(id, name),
        branch:branches(id, name, city)
      `)
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    if (branchId) {
      query = query.eq('branch_id', branchId);
    }
    if (search) {
      query = query.or(
        `make.ilike.%${search}%,model.ilike.%${search}%,license_plate.ilike.%${search}%`
      );
    }

    const { data: vehicles, error } = await query;

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ vehicles });
  } catch (error) {
    console.error('Fleet API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/fleet
 * Create a new vehicle
 */
export async function POST(request: NextRequest) {
  try {
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

    // Check role (only admin/manager can create)
    const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager'];
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createVehicleSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const vehicleData = validationResult.data;

    // Check for duplicate license plate
    const { data: existingPlate } = await supabase
      .from('vehicles')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .ilike('license_plate', vehicleData.license_plate)
      .single();

    if (existingPlate) {
      return NextResponse.json(
        { error: 'A vehicle with this license plate already exists' },
        { status: 400 }
      );
    }

    // Check for duplicate VIN if provided
    if (vehicleData.vin) {
      const { data: existingVin } = await supabase
        .from('vehicles')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .eq('vin', vehicleData.vin)
        .single();

      if (existingVin) {
        return NextResponse.json(
          { error: 'A vehicle with this VIN already exists' },
          { status: 400 }
        );
      }
    }

    // Create vehicle
    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .insert({
        tenant_id: profile.tenant_id,
        ...vehicleData,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating vehicle:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    console.error('Fleet API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
