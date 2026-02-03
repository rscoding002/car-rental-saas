import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BlockRenderer } from '@/components/page-builder/block-renderer';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, ExternalLink, X } from 'lucide-react';
import type { Page, PageBlock, PageStatus } from '@/lib/supabase/types';

interface PreviewPageProps {
  params: Promise<{ locale: string; id: string }>;
}

// Status badge variants
const statusVariants: Record<PageStatus, 'default' | 'success' | 'secondary'> = {
  draft: 'secondary',
  published: 'success',
  archived: 'default',
};

const statusLabels: Record<PageStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

// Get localized title
function getLocalizedTitle(title: Page['title'], locale: string): string {
  return title[locale] || title.en || Object.values(title).find((v) => v) || 'Untitled';
}

export default async function AdminPagePreview({ params }: PreviewPageProps) {
  const { locale, id } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirect=/admin/pages/${id}/preview`);
  }

  // Check user role (must be admin/manager/staff)
  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_id', user.id)
    .single() as { data: { tenant_id: string; role: string } | null };

  const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager', 'tenant_staff'];
  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect(`/${locale}`);
  }

  // Fetch page
  const { data: page, error: pageError } = await supabase
    .from('pages')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .single() as { data: Page | null; error: unknown };

  if (pageError || !page) {
    notFound();
  }

  // Fetch blocks
  const { data: blocks } = await supabase
    .from('page_blocks')
    .select('*')
    .eq('page_id', id)
    .order('sort_order', { ascending: true }) as { data: PageBlock[] | null };

  const pageBlocks = blocks || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Preview Header Bar */}
      <div className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Back and title */}
            <div className="flex items-center gap-3 min-w-0">
              <Link href={`/${locale}/admin/pages/${id}/edit`}>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Preview:</span>
                  <h1 className="text-sm font-semibold text-foreground truncate">
                    {getLocalizedTitle(page.title, locale)}
                  </h1>
                  <Badge variant={statusVariants[page.status]} className="flex-shrink-0">
                    {statusLabels[page.status]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">/{page.slug}</p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {page.status === 'published' && (
                <Link href={`/${locale}/${page.slug}`} target="_blank">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">View Live</span>
                  </Button>
                </Link>
              )}
              <Link href={`/${locale}/admin/pages/${id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </Link>
              <Link href={`/${locale}/admin/pages`}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Notice */}
      {page.status !== 'published' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
              This is a preview. The page is currently <strong>{statusLabels[page.status].toLowerCase()}</strong> and not visible to the public.
            </p>
          </div>
        </div>
      )}

      {/* Page Content */}
      <main>
        {pageBlocks.length === 0 ? (
          <div className="max-w-7xl mx-auto px-4 py-24 text-center">
            <p className="text-muted-foreground mb-4">
              This page has no content blocks yet.
            </p>
            <Link href={`/${locale}/admin/pages/${id}/edit`}>
              <Button>
                <Edit className="w-4 h-4 mr-2" />
                Add Content
              </Button>
            </Link>
          </div>
        ) : (
          <div>
            {pageBlocks.map((block) => (
              <BlockRenderer
                key={block.id}
                block={block}
                locale={locale}
              />
            ))}
          </div>
        )}
      </main>

      {/* Preview Footer */}
      <div className="bg-muted/50 border-t border-border py-8 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            End of page preview
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Link href={`/${locale}/admin/pages/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Continue Editing
              </Button>
            </Link>
            <Link href={`/${locale}/admin/pages`}>
              <Button variant="ghost" size="sm">
                Back to Pages
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
