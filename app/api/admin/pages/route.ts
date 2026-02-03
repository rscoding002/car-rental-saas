import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { LocalizedString, Page } from '@/lib/supabase/types';

interface PageCreateData {
  title: LocalizedString;
  slug: string;
}

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

// GET - List pages for tenant
export async function GET(request: NextRequest) {
  try {
    const access = await verifyAdminAccess();

    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('pages')
      .select('*')
      .eq('tenant_id', access.tenantId)
      .order('updated_at', { ascending: false });

    if (status && ['draft', 'published', 'archived'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: pages, error } = await query;

    if (error) {
      console.error('Error fetching pages:', error);
      return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 });
    }

    return NextResponse.json({ pages });
  } catch (error) {
    console.error('Error in GET /api/admin/pages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new page
export async function POST(request: NextRequest) {
  try {
    const access = await verifyAdminAccess();

    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body: PageCreateData = await request.json();
    const { title, slug } = body;

    // Validate inputs
    if (!title || Object.keys(title).length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!slug || slug.trim().length === 0) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    // Sanitize slug
    const sanitizedSlug = slug
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (sanitizedSlug.length === 0) {
      return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check slug uniqueness
    const { data: existingPage } = await supabase
      .from('pages')
      .select('id')
      .eq('tenant_id', access.tenantId)
      .eq('slug', sanitizedSlug)
      .single() as { data: { id: string } | null; error: unknown };

    if (existingPage) {
      return NextResponse.json({ error: 'A page with this slug already exists' }, { status: 400 });
    }

    // Create page (using any to bypass Supabase type inference issues)
    const { data: newPage, error: createError } = await (supabase as any)
      .from('pages')
      .insert({
        tenant_id: access.tenantId,
        title,
        slug: sanitizedSlug,
        status: 'draft',
        meta: {},
        is_system: false,
      })
      .select()
      .single() as { data: Page | null; error: unknown };

    if (createError || !newPage) {
      console.error('Error creating page:', createError);
      return NextResponse.json({ error: 'Failed to create page' }, { status: 500 });
    }

    return NextResponse.json({ id: newPage.id, page: newPage }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/pages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
