/**
 * Add-Ons API
 *
 * GET: List all add-ons for the tenant
 * POST: Create a new add-on
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listAddons, createAddon, getAddonStats } from '@/lib/pricing/addon-queries';
import { createAddonSchema } from '@/lib/pricing/types';
import type { RuleStatus, PriceType } from '@/lib/pricing/types';

// ============================================================================
// GET - List add-ons
// ============================================================================

export async function GET(request: NextRequest) {
  try {
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

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    // Check role
    const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager', 'tenant_staff'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as RuleStatus | null;
    const priceType = searchParams.get('priceType') as PriceType | null;
    const sortField = searchParams.get('sortField') as 'name' | 'price' | 'sort_order' | 'created_at' | null;
    const sortDirection = searchParams.get('sortDirection') as 'asc' | 'desc' | null;
    const includeStats = searchParams.get('includeStats') === 'true';

    // Fetch add-ons
    const { data: addons, count } = await listAddons(supabase, tenantId, {
      filters: {
        status: status || undefined,
        priceType: priceType || undefined,
      },
      sort: sortField
        ? { field: sortField, direction: sortDirection || 'asc' }
        : undefined,
    });

    // Fetch stats if requested
    let stats = null;
    if (includeStats) {
      stats = await getAddonStats(supabase, tenantId);
    }

    return NextResponse.json({
      addons,
      count,
      stats,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/addons:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// POST - Create add-on
// ============================================================================

export async function POST(request: NextRequest) {
  try {
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

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    // Check role - only admin and manager can create
    const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createAddonSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Create the add-on
    const { data: addon, error } = await createAddon(supabase, tenantId, validationResult.data);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ addon }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/addons:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
