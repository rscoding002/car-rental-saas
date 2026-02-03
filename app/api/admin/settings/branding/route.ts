import { revalidatePath } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { tenantBrandingSchema } from '@/lib/tenant/types';

/**
 * GET /api/admin/settings/branding
 * Get current branding settings
 */
export async function GET() {
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

    // Check role
    const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager'];
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get tenant settings
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('logo_url, settings')
      .eq('id', profile.tenant_id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings = tenant?.settings as Record<string, unknown> | null;

    return NextResponse.json({
      logoUrl: tenant?.logo_url || null,
      branding: settings?.branding || null,
    });
  } catch (error) {
    console.error('Error fetching branding settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/settings/branding
 * Update branding settings
 */
export async function PUT(request: NextRequest) {
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

    // Check role
    const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager'];
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { logoUrl, branding } = body;

    // Validate branding data
    if (branding) {
      const result = tenantBrandingSchema.safeParse(branding);
      if (!result.success) {
        return NextResponse.json(
          { error: 'Invalid branding data', details: result.error.errors },
          { status: 400 }
        );
      }
    }

    // Get current tenant settings
    const { data: tenant } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', profile.tenant_id)
      .single();

    const currentSettings = (tenant?.settings as Record<string, unknown>) || {};

    // Merge branding into settings
    // If branding is explicitly null, remove it; otherwise use the new value or keep existing
    const updatedSettings = {
      ...currentSettings,
      branding: branding === null ? undefined : (branding || currentSettings.branding),
    };

    // Clean up undefined values
    if (updatedSettings.branding === undefined) {
      delete updatedSettings.branding;
    }

    // Update tenant
    const { error } = await supabase
      .from('tenants')
      .update({
        logo_url: logoUrl,
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.tenant_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Revalidate all paths to apply branding changes immediately
    revalidatePath('/', 'layout');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating branding settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
