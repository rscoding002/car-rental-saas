/**
 * Individual Pricing Rule API
 *
 * Handles get, update, and delete operations for a single pricing rule.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getPricingRuleWithRelations,
  updatePricingRule,
  deletePricingRule,
} from '@/lib/pricing/queries';
import { updatePricingRuleSchema } from '@/lib/pricing/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/pricing/[id]
 *
 * Get a single pricing rule by ID.
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

    // Fetch the pricing rule
    const rule = await getPricingRuleWithRelations(supabase, id);

    if (!rule) {
      return NextResponse.json(
        { error: 'Pricing rule not found' },
        { status: 404 }
      );
    }

    // Verify the rule belongs to the user's tenant
    if (rule.tenantId !== profile.tenant_id) {
      return NextResponse.json(
        { error: 'Pricing rule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: rule });
  } catch (error) {
    console.error('Error fetching pricing rule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing rule' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/pricing/[id]
 *
 * Update a pricing rule.
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

    // Verify the rule exists and belongs to the tenant
    const existingRule = await getPricingRuleWithRelations(supabase, id);
    if (!existingRule || existingRule.tenantId !== profile.tenant_id) {
      return NextResponse.json(
        { error: 'Pricing rule not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updatePricingRuleSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Update the pricing rule
    const { data, error } = await updatePricingRule(supabase, id, validationResult.data);

    if (error) {
      return NextResponse.json(
        { error },
        { status: 400 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating pricing rule:', error);
    return NextResponse.json(
      { error: 'Failed to update pricing rule' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/pricing/[id]
 *
 * Delete a pricing rule.
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

    // Verify the rule exists and belongs to the tenant
    const existingRule = await getPricingRuleWithRelations(supabase, id);
    if (!existingRule || existingRule.tenantId !== profile.tenant_id) {
      return NextResponse.json(
        { error: 'Pricing rule not found' },
        { status: 404 }
      );
    }

    // Delete the pricing rule
    const { success, error } = await deletePricingRule(supabase, id);

    if (!success) {
      return NextResponse.json(
        { error: error || 'Failed to delete pricing rule' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pricing rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete pricing rule' },
      { status: 500 }
    );
  }
}
