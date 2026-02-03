import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PageStatus } from '@/lib/supabase/types';

// Get current user's tenant ID and verify admin role
async function verifyAdminAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_id', user.id)
    .single() as { data: { tenant_id: string; role: string } | null };

  if (!profile?.tenant_id) {
    return { error: 'No tenant found', status: 403 };
  }

  const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager'];
  if (!allowedRoles.includes(profile.role)) {
    return { error: 'Insufficient permissions', status: 403 };
  }

  return { tenantId: profile.tenant_id, userId: user.id };
}

// PATCH - Update page status only
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await verifyAdminAccess();

    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const { status } = body as { status: PageStatus };

    // Validate status
    if (!status || !['draft', 'published', 'archived'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be draft, published, or archived.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify page belongs to tenant
    const { data: existingPage, error: pageCheckError } = await supabase
      .from('pages')
      .select('id, tenant_id, status')
      .eq('id', id)
      .eq('tenant_id', access.tenantId)
      .single() as { data: { id: string; tenant_id: string; status: string } | null; error: unknown };

    if (pageCheckError || !existingPage) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Build update data
    const updateData: {
      status: PageStatus;
      updated_at: string;
      published_at?: string | null;
    } = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Set published_at when publishing, clear it when unpublishing
    if (status === 'published') {
      updateData.published_at = new Date().toISOString();
    } else if (existingPage.status === 'published') {
      // Only clear published_at if the page was previously published
      updateData.published_at = null;
    }

    // Update page status
    const { error: updateError } = await (supabase as any)
      .from('pages')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating page status:', updateError);
      return NextResponse.json({ error: 'Failed to update page status' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status,
      published_at: updateData.published_at,
    });
  } catch (error) {
    console.error('Error updating page status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
