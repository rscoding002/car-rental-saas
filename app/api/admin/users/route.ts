import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import type { UserRole, UserStatus } from '@/lib/supabase/types';

// Schema for creating/inviting a user
const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  role: z.enum(['tenant_admin', 'tenant_manager', 'tenant_staff']),
  phone: z.string().optional(),
  sendInvite: z.boolean().default(true),
});

/**
 * GET /api/admin/users
 * List staff users for the current tenant
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

    // Check role - only admins can manage users
    const allowedRoles: UserRole[] = ['platform_admin', 'tenant_admin'];
    if (!allowedRoles.includes(profile.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') as UserRole | null;
    const status = searchParams.get('status') as UserStatus | null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? true : false;

    // Build query - only get staff users (not customers)
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('tenant_id', profile.tenant_id)
      .in('role', ['tenant_admin', 'tenant_manager', 'tenant_staff']);

    // Apply filters
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    if (role) {
      query = query.eq('role', role);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: users, count, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get stats
    const { data: statsData } = await supabase
      .from('users')
      .select('role, status')
      .eq('tenant_id', profile.tenant_id)
      .in('role', ['tenant_admin', 'tenant_manager', 'tenant_staff']);

    const stats = {
      total: statsData?.length || 0,
      byRole: {
        tenant_admin: statsData?.filter((u) => u.role === 'tenant_admin').length || 0,
        tenant_manager: statsData?.filter((u) => u.role === 'tenant_manager').length || 0,
        tenant_staff: statsData?.filter((u) => u.role === 'tenant_staff').length || 0,
      },
      byStatus: {
        active: statsData?.filter((u) => u.status === 'active').length || 0,
        inactive: statsData?.filter((u) => u.status === 'inactive').length || 0,
        suspended: statsData?.filter((u) => u.status === 'suspended').length || 0,
      },
    };

    return NextResponse.json({
      users: users || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      stats,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Invite/create a new staff user
 */
export async function POST(request: NextRequest) {
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

    // Check role - only admins can create users
    const allowedRoles: UserRole[] = ['platform_admin', 'tenant_admin'];
    if (!allowedRoles.includes(profile.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createUserSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, firstName, lastName, role, phone, sendInvite } = validationResult.data;

    // Check if user with this email already exists in the tenant
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists in your organization' },
        { status: 409 }
      );
    }

    // Use admin client to create the user
    const adminClient = createAdminClient();

    // Check if auth user exists with this email
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const existingAuthUser = authUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let authId: string;

    if (existingAuthUser) {
      // User exists in auth, just add to this tenant
      authId = existingAuthUser.id;
    } else {
      // Create new auth user with invite
      if (sendInvite) {
        const { data: inviteData, error: inviteError } =
          await adminClient.auth.admin.inviteUserByEmail(email, {
            data: {
              first_name: firstName,
              last_name: lastName,
            },
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
          });

        if (inviteError) {
          console.error('Error inviting user:', inviteError);
          return NextResponse.json(
            { error: inviteError.message },
            { status: 500 }
          );
        }

        authId = inviteData.user.id;
      } else {
        // Create user without sending invite (they'll need password reset)
        const tempPassword = crypto.randomUUID();
        const { data: createData, error: createError } =
          await adminClient.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: false,
            user_metadata: {
              first_name: firstName,
              last_name: lastName,
            },
          });

        if (createError) {
          console.error('Error creating user:', createError);
          return NextResponse.json(
            { error: createError.message },
            { status: 500 }
          );
        }

        authId = createData.user.id;
      }
    }

    // Create user profile in public.users table
    const { data: newUser, error: insertError } = await adminClient
      .from('users')
      .insert({
        auth_id: authId,
        tenant_id: profile.tenant_id,
        email: email.toLowerCase(),
        first_name: firstName,
        last_name: lastName,
        role: role as UserRole,
        phone: phone || null,
        status: 'active',
        profile: {},
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating user profile:', insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: newUser,
      inviteSent: sendInvite && !existingAuthUser,
    });
  } catch (error) {
    console.error('Error in POST /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
