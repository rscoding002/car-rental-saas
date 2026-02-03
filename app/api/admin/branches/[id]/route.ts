import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBranchById, updateBranch, deleteBranch } from '@/lib/branches';
import { updateBranchSchema } from '@/lib/branches/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/branches/[id]
 * Get a single branch by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Get current user
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
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Check role
    const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager', 'tenant_staff'];
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch branch
    const branch = await getBranchById(supabase, id);

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    // Verify branch belongs to user's tenant
    if (branch.tenant_id !== profile.tenant_id && profile.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(branch);
  } catch (error) {
    console.error('Error getting branch:', error);
    return NextResponse.json(
      { error: 'Failed to get branch' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/branches/[id]
 * Update a branch
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Get current user
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
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Check role - only admins and managers can update branches
    const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager'];
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify branch belongs to user's tenant
    const existingBranch = await getBranchById(supabase, id);
    if (!existingBranch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    if (existingBranch.tenant_id !== profile.tenant_id && profile.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateBranchSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    // Update branch
    const { data, error } = await updateBranch(supabase, id, validation.data);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating branch:', error);
    return NextResponse.json(
      { error: 'Failed to update branch' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/branches/[id]
 * Delete a branch (soft delete by default)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Get current user
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
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Check role - only admins can delete branches
    const allowedRoles = ['platform_admin', 'tenant_admin'];
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify branch belongs to user's tenant
    const existingBranch = await getBranchById(supabase, id);
    if (!existingBranch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    if (existingBranch.tenant_id !== profile.tenant_id && profile.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if hard delete is requested
    const searchParams = request.nextUrl.searchParams;
    const hardDelete = searchParams.get('hard') === 'true';

    // Delete branch
    const { success, error } = await deleteBranch(supabase, id, { hardDelete });

    if (!success) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting branch:', error);
    return NextResponse.json(
      { error: 'Failed to delete branch' },
      { status: 500 }
    );
  }
}
