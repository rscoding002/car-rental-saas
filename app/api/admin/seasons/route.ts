/**
 * Seasons API
 *
 * Handles listing and creating seasonal pricing rules.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listSeasons, createSeason, type SeasonFilters } from '@/lib/pricing/season-queries';
import { createSeasonSchema } from '@/lib/pricing/types';

/**
 * GET /api/admin/seasons
 *
 * List all seasons for the current tenant.
 * Supports filtering by status and date ranges.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_id', user.id)
      .single() as { data: { tenant_id: string; role: string } | null };

    if (!profile?.tenant_id) {
      return NextResponse.json(
        { error: 'No tenant found' },
        { status: 403 }
      );
    }

    // Check role
    const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager'];
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters: SeasonFilters = {};

    const status = searchParams.get('status');
    if (status === 'active' || status === 'inactive') {
      filters.status = status;
    }

    const activeOn = searchParams.get('activeOn');
    if (activeOn) {
      filters.activeOn = activeOn;
    }

    const startAfter = searchParams.get('startAfter');
    if (startAfter) {
      filters.startAfter = startAfter;
    }

    const endBefore = searchParams.get('endBefore');
    if (endBefore) {
      filters.endBefore = endBefore;
    }

    // Parse pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch seasons
    const { data, count } = await listSeasons(supabase, profile.tenant_id, {
      filters,
      limit,
      offset,
    });

    return NextResponse.json({
      data,
      count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching seasons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seasons' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/seasons
 *
 * Create a new season.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_id', user.id)
      .single() as { data: { tenant_id: string; role: string } | null };

    if (!profile?.tenant_id) {
      return NextResponse.json(
        { error: 'No tenant found' },
        { status: 403 }
      );
    }

    // Check role
    const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager'];
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createSeasonSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Create the season
    const { data, error } = await createSeason(
      supabase,
      profile.tenant_id,
      validationResult.data
    );

    if (error) {
      return NextResponse.json(
        { error },
        { status: 400 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Error creating season:', error);
    return NextResponse.json(
      { error: 'Failed to create season' },
      { status: 500 }
    );
  }
}
