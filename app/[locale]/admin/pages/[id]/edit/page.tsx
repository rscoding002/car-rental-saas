import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { PageEditor } from '@/components/page-builder/page-editor';
import { Skeleton } from '@/components/ui/skeleton';
import type { Page, PageBlock } from '@/lib/supabase/types';

interface PageEditorPageProps {
  params: Promise<{ locale: string; id: string }>;
}

// Loading skeleton for the editor
function EditorSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Two column layout skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <Skeleton className="h-5 w-24 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fetch page data
async function getPageData(pageId: string, tenantId: string) {
  const supabase = await createClient();

  // Fetch page
  const { data: page, error: pageError } = await supabase
    .from('pages')
    .select('*')
    .eq('id', pageId)
    .eq('tenant_id', tenantId)
    .single();

  if (pageError || !page) {
    return { page: null, blocks: [] };
  }

  // Fetch blocks
  const { data: blocks, error: blocksError } = await supabase
    .from('page_blocks')
    .select('*')
    .eq('page_id', pageId)
    .order('sort_order', { ascending: true });

  if (blocksError) {
    console.error('Error fetching blocks:', blocksError);
  }

  return {
    page: page as Page,
    blocks: (blocks || []) as PageBlock[],
  };
}

// Get user's tenant ID
async function getUserTenantId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_id', user.id)
    .single() as { data: { tenant_id: string; role: string } | null };

  if (!profile?.tenant_id) return null;

  // Check if user has permission to edit pages
  const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager'];
  if (!allowedRoles.includes(profile.role)) return null;

  return profile.tenant_id;
}

// Page editor content
async function PageEditorContent({ pageId, locale }: { pageId: string; locale: string }) {
  const tenantId = await getUserTenantId();

  if (!tenantId) {
    redirect(`/${locale}/admin/pages`);
  }

  const { page, blocks } = await getPageData(pageId, tenantId);

  if (!page) {
    notFound();
  }

  return (
    <PageEditor
      page={page}
      blocks={blocks}
      locale={locale}
      tenantId={tenantId}
    />
  );
}

export default async function PageEditorPage({ params }: PageEditorPageProps) {
  const { locale, id } = await params;

  return (
    <Suspense fallback={<EditorSkeleton />}>
      <PageEditorContent pageId={id} locale={locale} />
    </Suspense>
  );
}

// Generate metadata
export async function generateMetadata({ params }: PageEditorPageProps) {
  const { id } = await params;
  const t = await getTranslations('admin');

  return {
    title: `Edit Page - Admin`,
  };
}
