import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getCategoryById,
  updateCategory,
  deleteCategory,
  getCategoryStats,
} from '@/lib/fleet/category-queries';
import { updateCategorySchema } from '@/lib/fleet/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/categories/[id]
 * Get a single category by ID
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

    // Fetch category
    const category = await getCategoryById(supabase, id);

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Verify tenant ownership
    if (category.tenant_id !== profile.tenant_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get stats
    const stats = await getCategoryStats(supabase, id);

    return NextResponse.json({ ...category, stats });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/categories/[id]
 * Update an existing category
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

    // Check role - only admins and managers can update categories
    const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager'];
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify category exists and belongs to tenant
    const existingCategory = await getCategoryById(supabase, id);
    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    if (existingCategory.tenant_id !== profile.tenant_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateCategorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    // Update category
    const { data, error } = await updateCategory(supabase, id, validation.data);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/categories/[id]
 * Delete a category (soft delete)
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

    // Check role - only admins can delete categories
    const allowedRoles = ['platform_admin', 'tenant_admin'];
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify category exists and belongs to tenant
    const existingCategory = await getCategoryById(supabase, id);
    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    if (existingCategory.tenant_id !== profile.tenant_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if hard delete requested
    const searchParams = request.nextUrl.searchParams;
    const hardDelete = searchParams.get('hard') === 'true';

    // Delete category
    const { success, error } = await deleteCategory(supabase, id, { hardDelete });

    if (!success) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
