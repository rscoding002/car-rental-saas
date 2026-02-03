import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCategory, listCategories } from '@/lib/fleet/category-queries';
import { createCategorySchema } from '@/lib/fleet/types';

/**
 * GET /api/admin/categories
 * List all categories for the current tenant
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

    // Fetch categories
    const { data, count } = await listCategories(supabase, profile.tenant_id, {
      filters: {
        status: status || undefined,
        search: search || undefined,
      },
    });

    return NextResponse.json({ data, count });
  } catch (error) {
    console.error('Error listing categories:', error);
    return NextResponse.json(
      { error: 'Failed to list categories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/categories
 * Create a new category
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

    // Check role - only admins and managers can create categories
    const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager'];
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = createCategorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    // Create category
    const { data, error } = await createCategory(supabase, {
      ...validation.data,
      tenant_id: profile.tenant_id,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
