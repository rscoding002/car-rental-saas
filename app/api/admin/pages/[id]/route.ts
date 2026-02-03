import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { LocalizedString, PageStatus, BlockType, BlockSettings, Json, Page, PageBlock, PageMeta } from '@/lib/supabase/types';

interface PageUpdateData {
  title: LocalizedString;
  slug: string;
  status: PageStatus;
  meta?: PageMeta;
  blocks: Array<{
    id: string;
    block_type: BlockType;
    content: Json;
    settings: BlockSettings;
    sort_order: number;
  }>;
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

// GET - Fetch page with blocks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await verifyAdminAccess();

    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const supabase = await createClient();

    // Fetch page
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', access.tenantId)
      .single() as { data: Page | null; error: unknown };

    if (pageError || !page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Fetch blocks
    const { data: blocks, error: blocksError } = await supabase
      .from('page_blocks')
      .select('*')
      .eq('page_id', id)
      .order('sort_order', { ascending: true }) as { data: PageBlock[] | null; error: unknown };

    if (blocksError) {
      console.error('Error fetching blocks:', blocksError);
    }

    return NextResponse.json({ page, blocks: blocks || [] });
  } catch (error) {
    console.error('Error fetching page:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update page and blocks
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

    const body: PageUpdateData = await request.json();
    const { title, slug, status, meta, blocks } = body;

    const supabase = await createClient();

    // Verify page belongs to tenant
    const { data: existingPage, error: pageCheckError } = await supabase
      .from('pages')
      .select('id, tenant_id')
      .eq('id', id)
      .eq('tenant_id', access.tenantId)
      .single() as { data: { id: string; tenant_id: string } | null; error: unknown };

    if (pageCheckError || !existingPage) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Check slug uniqueness (excluding current page)
    const { data: slugCheck } = await supabase
      .from('pages')
      .select('id')
      .eq('tenant_id', access.tenantId)
      .eq('slug', slug)
      .neq('id', id)
      .single() as { data: { id: string } | null; error: unknown };

    if (slugCheck) {
      return NextResponse.json({ error: 'A page with this slug already exists' }, { status: 400 });
    }

    // Update page (using any to bypass Supabase type inference issues)
    const { error: updateError } = await (supabase as any)
      .from('pages')
      .update({
        title,
        slug,
        status,
        meta: meta || {},
        updated_at: new Date().toISOString(),
        published_at: status === 'published' ? new Date().toISOString() : null,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating page:', updateError);
      return NextResponse.json({ error: 'Failed to update page' }, { status: 500 });
    }

    // Handle blocks update
    if (blocks && Array.isArray(blocks)) {
      // Get existing block IDs
      const { data: existingBlocks } = await supabase
        .from('page_blocks')
        .select('id')
        .eq('page_id', id) as { data: { id: string }[] | null };

      const existingBlockIds = new Set((existingBlocks || []).map((b) => b.id));
      const newBlockIds = new Set(blocks.map((b) => b.id));

      // Delete removed blocks
      const blocksToDelete = [...existingBlockIds].filter((blockId) => !newBlockIds.has(blockId));
      if (blocksToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('page_blocks')
          .delete()
          .in('id', blocksToDelete);

        if (deleteError) {
          console.error('Error deleting blocks:', deleteError);
        }
      }

      // Update or insert blocks
      for (const block of blocks) {
        if (existingBlockIds.has(block.id)) {
          // Update existing block
          const { error: blockUpdateError } = await (supabase as any)
            .from('page_blocks')
            .update({
              content: block.content,
              settings: block.settings,
              sort_order: block.sort_order,
              updated_at: new Date().toISOString(),
            })
            .eq('id', block.id);

          if (blockUpdateError) {
            console.error('Error updating block:', blockUpdateError);
          }
        } else {
          // Insert new block
          const { error: blockInsertError } = await (supabase as any)
            .from('page_blocks')
            .insert({
              id: block.id,
              page_id: id,
              block_type: block.block_type,
              content: block.content,
              settings: block.settings || {},
              sort_order: block.sort_order,
            });

          if (blockInsertError) {
            console.error('Error inserting block:', blockInsertError);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating page:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete page and its blocks
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await verifyAdminAccess();

    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const supabase = await createClient();

    // Verify page belongs to tenant and is not a system page
    const { data: pageToDelete, error: pageCheckError } = await supabase
      .from('pages')
      .select('id, is_system')
      .eq('id', id)
      .eq('tenant_id', access.tenantId)
      .single() as { data: { id: string; is_system: boolean } | null; error: unknown };

    if (pageCheckError || !pageToDelete) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    if (pageToDelete.is_system) {
      return NextResponse.json({ error: 'Cannot delete system pages' }, { status: 400 });
    }

    // Delete blocks first (cascade should handle this, but being explicit)
    const { error: blocksDeleteError } = await supabase
      .from('page_blocks')
      .delete()
      .eq('page_id', id);

    if (blocksDeleteError) {
      console.error('Error deleting blocks:', blocksDeleteError);
    }

    // Delete page
    const { error: deleteError } = await supabase
      .from('pages')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting page:', deleteError);
      return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting page:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
