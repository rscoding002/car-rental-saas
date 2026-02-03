import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import type { UserRole, UserStatus } from '@/lib/supabase/types';

// Schema for updating a user
const updateUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100).optional(),
  lastName: z.string().min(1, 'Last name is required').max(100).optional(),
  phone: z.string().max(50).optional().nullable(),
  role: z.enum(['tenant_admin', 'tenant_manager', 'tenant_staff']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/users/[id]
 * Get a single user by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    // Check role - only admins can view user details
    const allowedRoles: UserRole[] = ['platform_admin', 'tenant_admin'];
    if (!allowedRoles.includes(profile.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the target user
    const { data: targetUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (error || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get booking stats for this user (if staff)
    let bookingStats = null;
    if (['tenant_admin', 'tenant_manager', 'tenant_staff'].includes(targetUser.role)) {
      // For staff, we might track bookings they created - not implemented yet
      bookingStats = {
        createdBookings: 0,
      };
    }

    return NextResponse.json({
      user: targetUser,
      bookingStats,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/users/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users/[id]
 * Update a user
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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
      .select('tenant_id, role, id')
      .eq('auth_id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    // Check role - only admins can update users
    const allowedRoles: UserRole[] = ['platform_admin', 'tenant_admin'];
    if (!allowedRoles.includes(profile.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the target user to ensure they belong to the same tenant
    const { data: targetUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent modifying own role
    if (id === profile.id) {
      const body = await request.clone().json();
      if (body.role && body.role !== targetUser.role) {
        return NextResponse.json(
          { error: 'You cannot change your own role' },
          { status: 400 }
        );
      }
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateUserSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { firstName, lastName, phone, role, status } = validationResult.data;

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (firstName !== undefined) updateData.first_name = firstName;
    if (lastName !== undefined) updateData.last_name = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;

    // Update the user
    const adminClient = createAdminClient();
    const { data: updatedUser, error: updateError } = await adminClient
      .from('users')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/users/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Deactivate a user (soft delete by setting status to 'inactive')
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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
      .select('tenant_id, role, id')
      .eq('auth_id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    // Check role - only admins can deactivate users
    const allowedRoles: UserRole[] = ['platform_admin', 'tenant_admin'];
    if (!allowedRoles.includes(profile.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent self-deactivation
    if (id === profile.id) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account' },
        { status: 400 }
      );
    }

    // Get the target user to ensure they belong to the same tenant
    const { data: targetUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Soft delete by setting status to inactive
    const adminClient = createAdminClient();
    const { data: updatedUser, error: updateError } = await adminClient
      .from('users')
      .update({
        status: 'inactive' as UserStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error deactivating user:', updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/users/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
