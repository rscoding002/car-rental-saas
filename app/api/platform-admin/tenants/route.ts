import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { checkPlatformAdminApi } from '@/lib/auth/middleware';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_TENANT_SETTINGS } from '@/lib/tenant/types';

// Schema for creating a new tenant
const createTenantSchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters').max(255),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(63)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  adminEmail: z.string().email('Invalid admin email address'),
  adminFirstName: z.string().min(1, 'Admin first name is required').max(100),
  adminLastName: z.string().min(1, 'Admin last name is required').max(100),
  subscriptionTier: z.enum(['trial', 'free', 'starter', 'professional', 'enterprise']).default('trial'),
  domain: z
    .string()
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/,
      'Invalid domain format'
    )
    .nullable()
    .optional(),
});

/**
 * GET /api/platform-admin/tenants
 * List all tenants with search, filters, and stats (platform admin only)
 */
export async function GET(request: NextRequest) {
  // Check platform admin auth
  const { authorized, error } = await checkPlatformAdminApi();
  if (!authorized) {
    return NextResponse.json({ error: error?.message }, { status: error?.status });
  }

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Parse query params
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const tier = searchParams.get('tier') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') === 'asc';

    // Build query
    let query = supabase
      .from('tenants')
      .select('*', { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,slug.ilike.%${search}%,domain.ilike.%${search}%`
      );
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Apply tier filter
    if (tier) {
      query = query.eq('subscription_tier', tier);
    }

    // Apply sorting
    const validSortColumns = ['name', 'slug', 'created_at', 'status', 'subscription_tier'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    query = query.order(sortColumn, { ascending: sortOrder });

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: tenants, error: fetchError, count } = await query;

    if (fetchError) {
      console.error('Error fetching tenants:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch tenants' },
        { status: 500 }
      );
    }

    // Get stats for all tenants (unfiltered)
    const { data: allTenants } = await supabase
      .from('tenants')
      .select('id, status, subscription_tier');

    const stats = {
      total: allTenants?.length || 0,
      active: allTenants?.filter(t => t.status === 'active').length || 0,
      suspended: allTenants?.filter(t => t.status === 'suspended').length || 0,
      pending: allTenants?.filter(t => t.status === 'pending').length || 0,
      trial: allTenants?.filter(t => t.subscription_tier === 'trial').length || 0,
    };

    // Get user and vehicle counts per tenant
    const tenantIds = (tenants || []).map(t => t.id);

    // Get user counts
    const { data: userCounts } = await supabase
      .from('users')
      .select('tenant_id')
      .in('tenant_id', tenantIds);

    // Get vehicle counts
    const { data: vehicleCounts } = await supabase
      .from('vehicles')
      .select('tenant_id')
      .in('tenant_id', tenantIds);

    // Get booking counts
    const { data: bookingCounts } = await supabase
      .from('bookings')
      .select('tenant_id')
      .in('tenant_id', tenantIds);

    // Create count maps
    const userCountMap: Record<string, number> = {};
    const vehicleCountMap: Record<string, number> = {};
    const bookingCountMap: Record<string, number> = {};

    (userCounts || []).forEach(u => {
      userCountMap[u.tenant_id] = (userCountMap[u.tenant_id] || 0) + 1;
    });

    (vehicleCounts || []).forEach(v => {
      vehicleCountMap[v.tenant_id] = (vehicleCountMap[v.tenant_id] || 0) + 1;
    });

    (bookingCounts || []).forEach(b => {
      bookingCountMap[b.tenant_id] = (bookingCountMap[b.tenant_id] || 0) + 1;
    });

    // Enrich tenants with counts
    const enrichedTenants = (tenants || []).map(tenant => ({
      ...tenant,
      users_count: userCountMap[tenant.id] || 0,
      vehicles_count: vehicleCountMap[tenant.id] || 0,
      bookings_count: bookingCountMap[tenant.id] || 0,
    }));

    return NextResponse.json({
      tenants: enrichedTenants,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      stats,
    });
  } catch (err) {
    console.error('Error in GET /api/platform-admin/tenants:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/platform-admin/tenants
 * Create a new tenant with initial admin user (platform admin only)
 */
export async function POST(request: NextRequest) {
  // Check platform admin auth
  const { authorized, error } = await checkPlatformAdminApi();
  if (!authorized) {
    return NextResponse.json({ error: error?.message }, { status: error?.status });
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = createTenantSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      name,
      slug,
      adminEmail,
      adminFirstName,
      adminLastName,
      subscriptionTier,
      domain,
    } = validationResult.data;

    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Check if slug is already taken
    const { data: existingSlug } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingSlug) {
      return NextResponse.json(
        { error: 'This slug is already in use. Please choose a different one.' },
        { status: 409 }
      );
    }

    // Check if domain is already taken (if provided)
    if (domain) {
      const { data: existingDomain } = await supabase
        .from('tenants')
        .select('id')
        .eq('domain', domain.toLowerCase())
        .single();

      if (existingDomain) {
        return NextResponse.json(
          { error: 'This domain is already in use by another tenant.' },
          { status: 409 }
        );
      }
    }

    // Create the tenant
    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .insert({
        name,
        slug,
        domain: domain?.toLowerCase() || null,
        settings: DEFAULT_TENANT_SETTINGS,
        subscription_tier: subscriptionTier as 'starter' | 'pro' | 'business' | 'enterprise',
        status: 'active',
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Error creating tenant:', tenantError);
      return NextResponse.json(
        { error: `Failed to create tenant: ${tenantError.message}` },
        { status: 500 }
      );
    }

    // Check if an auth user with this email already exists
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const existingAuthUser = authUsers?.users?.find(
      (u) => u.email?.toLowerCase() === adminEmail.toLowerCase()
    );

    let authId: string;
    let inviteSent = false;

    if (existingAuthUser) {
      // User already exists in auth system
      authId = existingAuthUser.id;

      // Check if they already have a profile in another tenant
      const { data: existingProfile } = await adminClient
        .from('users')
        .select('id, tenant_id')
        .eq('auth_id', existingAuthUser.id)
        .single();

      if (existingProfile) {
        // User already has a profile - we'll create a new one for this tenant
        // This allows the same user to be admin of multiple tenants
        console.warn(
          `User ${adminEmail} already has profile in tenant ${existingProfile.tenant_id}, creating new profile for tenant ${tenant.id}`
        );
      }
    } else {
      // Create new auth user and send invitation
      const { data: inviteData, error: inviteError } =
        await adminClient.auth.admin.inviteUserByEmail(adminEmail.toLowerCase(), {
          data: {
            first_name: adminFirstName,
            last_name: adminLastName,
          },
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        });

      if (inviteError) {
        console.error('Error inviting admin user:', inviteError);
        // Rollback: delete the tenant we just created
        await adminClient.from('tenants').delete().eq('id', tenant.id);
        return NextResponse.json(
          { error: `Failed to invite admin user: ${inviteError.message}` },
          { status: 500 }
        );
      }

      authId = inviteData.user.id;
      inviteSent = true;
    }

    // Create the admin user profile
    const { data: adminUser, error: userError } = await adminClient
      .from('users')
      .insert({
        auth_id: authId,
        tenant_id: tenant.id,
        email: adminEmail.toLowerCase(),
        first_name: adminFirstName,
        last_name: adminLastName,
        role: 'tenant_admin',
        status: 'active',
        profile: {},
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating admin user profile:', userError);
      // Rollback: delete the tenant
      await adminClient.from('tenants').delete().eq('id', tenant.id);
      // If we created a new auth user, we might want to delete them too
      // but that's tricky if they might be used elsewhere, so we skip it
      return NextResponse.json(
        { error: `Failed to create admin user profile: ${userError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tenant,
      adminUser: {
        id: adminUser.id,
        email: adminUser.email,
        firstName: adminUser.first_name,
        lastName: adminUser.last_name,
        role: adminUser.role,
      },
      inviteSent,
      message: inviteSent
        ? `Tenant created successfully. An invitation email has been sent to ${adminEmail}.`
        : `Tenant created successfully. The admin user ${adminEmail} already exists and can now access this tenant.`,
    });
  } catch (err) {
    console.error('Error in POST /api/platform-admin/tenants:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
