/**
 * Cancellation Policy Settings API
 *
 * GET: Retrieve current cancellation policy configuration
 * PUT: Update cancellation policy configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_CANCELLATION_POLICY } from '@/lib/booking/types';

// Full cancellation policy schema
const cancellationPolicySchema = z.object({
  allowCancellation: z.boolean().default(true),
  freeCancellationHours: z.number().min(0).default(48),
  partialRefundHours: z.number().min(0).default(24),
  partialRefundPercent: z.number().min(0).max(100).default(50),
});

export type CancellationPolicyConfig = z.infer<typeof cancellationPolicySchema>;

// ============================================================================
// GET - Retrieve cancellation policy settings
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

    // Extract cancellation policy from settings or use defaults
    const settings = tenant?.settings as Record<string, unknown> | null;
    const cancellationPolicy = settings?.cancellationPolicy || DEFAULT_CANCELLATION_POLICY;

    return NextResponse.json({
      cancellationPolicy,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/settings/cancellation-policy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// PUT - Update cancellation policy settings
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
    const validationResult = cancellationPolicySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const cancellationPolicy = validationResult.data;

    // Get current tenant settings
    const { data: tenant } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', profile.tenant_id)
      .single();

    const currentSettings = (tenant?.settings || {}) as Record<string, unknown>;

    // Merge with new cancellation policy
    const updatedSettings = {
      ...currentSettings,
      cancellationPolicy,
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
      cancellationPolicy,
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/settings/cancellation-policy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
