import { revalidatePath } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { tenantLanguagesSchema } from '@/lib/tenant/types';

/**
 * GET /api/admin/settings/languages
 * Get current language settings
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
      .select('settings')
      .eq('id', profile.tenant_id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings = tenant?.settings as Record<string, unknown> | null;

    return NextResponse.json({
      languages: settings?.languages || {
        enabled: ['en', 'lt', 'ru'],
        default: 'en',
      },
    });
  } catch (error) {
    console.error('Error fetching language settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/settings/languages
 * Update language settings
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
    const { languages } = body;

    // Validate language data
    const result = tenantLanguagesSchema.safeParse(languages);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid language settings', details: result.error.errors },
        { status: 400 }
      );
    }

    // Get current tenant settings
    const { data: tenant } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', profile.tenant_id)
      .single();

    const currentSettings = (tenant?.settings as Record<string, unknown>) || {};

    // Merge language settings
    const updatedSettings = {
      ...currentSettings,
      languages: result.data,
    };

    // Update tenant
    const { error } = await supabase
      .from('tenants')
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.tenant_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Revalidate all paths to apply language changes
    revalidatePath('/', 'layout');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating language settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
