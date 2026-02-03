/**
 * Individual Season API
 *
 * Handles get, update, and delete operations for a single season.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getSeasonById,
  updateSeason,
  deleteSeason,
} from '@/lib/pricing/season-queries';
import { updateSeasonSchema } from '@/lib/pricing/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/seasons/[id]
 *
 * Get a single season by ID.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    // Fetch the season
    const season = await getSeasonById(supabase, id);

    if (!season) {
      return NextResponse.json(
        { error: 'Season not found' },
        { status: 404 }
      );
    }

    // Verify the season belongs to the user's tenant
    if (season.tenantId !== profile.tenant_id) {
      return NextResponse.json(
        { error: 'Season not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: season });
  } catch (error) {
    console.error('Error fetching season:', error);
    return NextResponse.json(
      { error: 'Failed to fetch season' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/seasons/[id]
 *
 * Update a season.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    // Verify the season exists and belongs to the tenant
    const existingSeason = await getSeasonById(supabase, id);
    if (!existingSeason || existingSeason.tenantId !== profile.tenant_id) {
      return NextResponse.json(
        { error: 'Season not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateSeasonSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Update the season
    const { data, error } = await updateSeason(supabase, id, validationResult.data);

    if (error) {
      return NextResponse.json(
        { error },
        { status: 400 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating season:', error);
    return NextResponse.json(
      { error: 'Failed to update season' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/seasons/[id]
 *
 * Delete a season.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    // Verify the season exists and belongs to the tenant
    const existingSeason = await getSeasonById(supabase, id);
    if (!existingSeason || existingSeason.tenantId !== profile.tenant_id) {
      return NextResponse.json(
        { error: 'Season not found' },
        { status: 404 }
      );
    }

    // Delete the season
    const { success, error } = await deleteSeason(supabase, id);

    if (!success) {
      return NextResponse.json(
        { error: error || 'Failed to delete season' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting season:', error);
    return NextResponse.json(
      { error: 'Failed to delete season' },
      { status: 500 }
    );
  }
}
