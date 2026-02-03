/**
 * Pricing Rules API
 *
 * Handles listing and creating pricing rules.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listPricingRules, createPricingRule, type PricingRuleFilters } from '@/lib/pricing/queries';
import { createPricingRuleSchema } from '@/lib/pricing/types';
import type { RateType } from '@/lib/supabase/types';

/**
 * GET /api/admin/pricing
 *
 * List all pricing rules for the current tenant.
 * Supports filtering by status, rate type, and scope.
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
    const filters: PricingRuleFilters = {};

    const status = searchParams.get('status');
    if (status === 'active' || status === 'inactive') {
      filters.status = status;
    }

    const rateType = searchParams.get('rateType');
    if (['hourly', 'daily', 'weekly', 'monthly'].includes(rateType || '')) {
      filters.rateType = rateType as RateType;
    }

    const scope = searchParams.get('scope');
    if (scope === 'category' || scope === 'vehicle') {
      filters.scope = scope;
    }

    const categoryId = searchParams.get('categoryId');
    if (categoryId) {
      filters.categoryId = categoryId;
    }

    const vehicleId = searchParams.get('vehicleId');
    if (vehicleId) {
      filters.vehicleId = vehicleId;
    }

    // Parse pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch pricing rules
    const { data, count } = await listPricingRules(supabase, profile.tenant_id, {
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
    console.error('Error fetching pricing rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing rules' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/pricing
 *
 * Create a new pricing rule.
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
    const validationResult = createPricingRuleSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Create the pricing rule
    const { data, error } = await createPricingRule(
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
    console.error('Error creating pricing rule:', error);
    return NextResponse.json(
      { error: 'Failed to create pricing rule' },
      { status: 500 }
    );
  }
}
