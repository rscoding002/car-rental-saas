import { type NextRequest, NextResponse } from 'next/server';

import { checkPlatformAdminApi } from '@/lib/auth/middleware';
import { createClient } from '@/lib/supabase/server';
import {
  validateSlugFormat,
  isReservedSlug,
  getSubdomainConfig,
} from '@/lib/tenant/subdomain';

/**
 * GET /api/platform-admin/tenants/check-slug
 * Check if a slug is available and valid
 */
export async function GET(request: NextRequest) {
  // Check platform admin auth
  const { authorized, error } = await checkPlatformAdminApi();
  if (!authorized) {
    return NextResponse.json({ error: error?.message }, { status: error?.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug')?.toLowerCase().trim();
    const excludeTenantId = searchParams.get('excludeTenantId'); // For edit mode

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    // Validate format
    const formatError = validateSlugFormat(slug);
    if (formatError) {
      return NextResponse.json({
        available: false,
        valid: false,
        error: formatError,
        slug,
      });
    }

    // Check if reserved
    if (isReservedSlug(slug)) {
      return NextResponse.json({
        available: false,
        valid: false,
        error: 'This slug is reserved and cannot be used',
        slug,
      });
    }

    // Check database for existing tenant with this slug
    const supabase = await createClient();
    let query = supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('slug', slug);

    // If editing, exclude the current tenant
    if (excludeTenantId) {
      query = query.neq('id', excludeTenantId);
    }

    const { data: existingTenant, error: dbError } = await query.maybeSingle();

    if (dbError) {
      console.error('Error checking slug availability:', dbError);
      return NextResponse.json(
        { error: 'Failed to check slug availability' },
        { status: 500 }
      );
    }

    if (existingTenant) {
      return NextResponse.json({
        available: false,
        valid: true,
        error: 'This slug is already in use by another tenant',
        slug,
        existingTenant: {
          id: existingTenant.id,
          name: existingTenant.name,
        },
      });
    }

    // Slug is available
    const subdomainConfig = getSubdomainConfig(slug);

    return NextResponse.json({
      available: true,
      valid: true,
      slug,
      subdomain: subdomainConfig,
    });
  } catch (err) {
    console.error('Error in GET /api/platform-admin/tenants/check-slug:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
