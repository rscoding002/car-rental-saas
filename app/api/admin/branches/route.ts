import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBranch, listBranches } from '@/lib/branches';
import { createBranchSchema } from '@/lib/branches/types';

/**
 * GET /api/admin/branches
 * List all branches for the current tenant
 */
export async function GET(request: NextRequest) {
  try {
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

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as 'active' | 'inactive' | null;
    const search = searchParams.get('search');

    // Fetch branches
    const { data, count } = await listBranches(supabase, profile.tenant_id, {
      filters: {
        status: status || undefined,
        search: search || undefined,
      },
    });

    return NextResponse.json({ data, count });
  } catch (error) {
    console.error('Error listing branches:', error);
    return NextResponse.json(
      { error: 'Failed to list branches' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/branches
 * Create a new branch
 */
export async function POST(request: NextRequest) {
  try {
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

    // Check role - only admins and managers can create branches
    const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager'];
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = createBranchSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    // Create branch
    const { data, error } = await createBranch(supabase, {
      ...validation.data,
      tenant_id: profile.tenant_id,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating branch:', error);
    return NextResponse.json(
      { error: 'Failed to create branch' },
      { status: 500 }
    );
  }
}
