/**
 * One-Way Fee Settings API
 *
 * GET: Retrieve current one-way fee configuration
 * PUT: Update one-way fee configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { oneWayFeesSchema, DEFAULT_ONE_WAY_FEES } from '@/lib/tenant/types';

// ============================================================================
// GET - Retrieve one-way fee settings
// ============================================================================

export async function GET() {
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

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    // Check role
    const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager'];
    if (!allowedRoles.includes((profile as { role: string }).role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get tenant settings
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', profile.tenant_id)
      .single();

    if (error) {
      console.error('Error fetching tenant:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    // Extract one-way fees from settings or use defaults
    const settings = tenant?.settings as Record<string, unknown> | null;
    const oneWayFees = settings?.oneWayFees || DEFAULT_ONE_WAY_FEES;

    return NextResponse.json({
      oneWayFees,
      currency: settings?.currency || 'EUR',
    });
  } catch (error) {
    console.error('Error in GET /api/admin/settings/one-way-fees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// PUT - Update one-way fee settings
// ============================================================================

export async function PUT(request: NextRequest) {
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

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    // Check role - only admin and manager can update
    const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager'];
    if (!allowedRoles.includes((profile as { role: string }).role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = oneWayFeesSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const oneWayFees = validationResult.data;

    // Get current tenant settings
    const { data: tenant } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', profile.tenant_id)
      .single();

    const currentSettings = (tenant?.settings || {}) as Record<string, unknown>;

    // Merge with new one-way fees
    const updatedSettings = {
      ...currentSettings,
      oneWayFees,
    };

    // Update tenant settings
    const { error: updateError } = await supabase
      .from('tenants')
      .update({ settings: updatedSettings })
      .eq('id', profile.tenant_id);

    if (updateError) {
      console.error('Error updating tenant settings:', updateError);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      oneWayFees,
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/settings/one-way-fees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
