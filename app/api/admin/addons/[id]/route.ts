/**
 * Individual Add-On API
 *
 * GET: Get a single add-on
 * PUT: Update an add-on
 * DELETE: Delete an add-on
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAddonById, updateAddon, deleteAddon } from '@/lib/pricing/addon-queries';
import { updateAddonSchema } from '@/lib/pricing/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================================
// GET - Get single add-on
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { tenant_id: tenantId, role } = profile as { tenant_id: string; role: string };

    // Check role
    const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager', 'tenant_staff'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Fetch the add-on
    const addon = await getAddonById(supabase, id);

    if (!addon) {
      return NextResponse.json({ error: 'Add-on not found' }, { status: 404 });
    }

    // Verify tenant ownership
    if (addon.tenantId !== tenantId && role !== 'platform_admin') {
      return NextResponse.json({ error: 'Add-on not found' }, { status: 404 });
    }

    return NextResponse.json({ addon });
  } catch (error) {
    console.error('Error in GET /api/admin/addons/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// PUT - Update add-on
// ============================================================================

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { tenant_id: tenantId, role } = profile as { tenant_id: string; role: string };

    // Check role - only admin and manager can update
    const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify the add-on exists and belongs to tenant
    const existingAddon = await getAddonById(supabase, id);

    if (!existingAddon) {
      return NextResponse.json({ error: 'Add-on not found' }, { status: 404 });
    }

    if (existingAddon.tenantId !== tenantId && role !== 'platform_admin') {
      return NextResponse.json({ error: 'Add-on not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateAddonSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Update the add-on
    const { data: addon, error } = await updateAddon(supabase, id, validationResult.data);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ addon });
  } catch (error) {
    console.error('Error in PUT /api/admin/addons/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// DELETE - Delete add-on
// ============================================================================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { tenant_id: tenantId, role } = profile as { tenant_id: string; role: string };

    // Check role - only admin can delete
    const allowedRoles = ['platform_admin', 'tenant_admin'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify the add-on exists and belongs to tenant
    const existingAddon = await getAddonById(supabase, id);

    if (!existingAddon) {
      return NextResponse.json({ error: 'Add-on not found' }, { status: 404 });
    }

    if (existingAddon.tenantId !== tenantId && role !== 'platform_admin') {
      return NextResponse.json({ error: 'Add-on not found' }, { status: 404 });
    }

    // Delete the add-on
    const { success, error } = await deleteAddon(supabase, id);

    if (!success) {
      return NextResponse.json({ error: error || 'Failed to delete' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/addons/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
