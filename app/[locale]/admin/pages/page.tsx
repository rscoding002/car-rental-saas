import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, FileText, Edit, Eye, Calendar } from 'lucide-react';
import { PageStatusToggle } from '@/components/admin/page-status-toggle';
import type { Page, PageStatus } from '@/lib/supabase/types';

interface PagesPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}

// Status badge variant mapping
const statusVariants: Record<PageStatus, 'default' | 'success' | 'secondary'> = {
  draft: 'secondary',
  published: 'success',
  archived: 'default',
};

const statusLabels: Record<string, Record<PageStatus, string>> = {
  en: { draft: 'Draft', published: 'Published', archived: 'Archived' },
  lt: { draft: 'Juodraštis', published: 'Paskelbta', archived: 'Archyvuota' },
  ru: { draft: 'Черновик', published: 'Опубликовано', archived: 'В архиве' },
};

// Get localized title
function getLocalizedTitle(title: Page['title'], locale: string): string {
  return title[locale] || title.en || Object.values(title).find(v => v) || 'Untitled';
}

// Format date
function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat(locale === 'lt' ? 'lt-LT' : locale === 'ru' ? 'ru-RU' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Pages table component
async function PagesTable({ locale, statusFilter }: { locale: string; statusFilter?: string }) {
  const supabase = await createClient();

  // Get current user's tenant
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_id', user.id)
    .single() as { data: { tenant_id: string } | null };

  if (!profile?.tenant_id) return null;

  // Fetch pages
  let query = supabase
    .from('pages')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .order('updated_at', { ascending: false });

  if (statusFilter && ['draft', 'published', 'archived'].includes(statusFilter)) {
    query = query.eq('status', statusFilter);
  }

  const { data: pages, error } = await query;

  if (error) {
    console.error('Error fetching pages:', error);
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load pages. Please try again.
      </div>
    );
  }

  const labels = statusLabels[locale] || statusLabels.en;

  if (!pages || pages.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">
          {statusFilter
            ? `No ${labels[statusFilter as PageStatus] || statusFilter} pages found.`
            : 'No pages yet. Create your first page to get started.'}
        </p>
        <Link href={`/${locale}/admin/pages/new`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Page
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Table Header */}
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
        <div className="col-span-4">Title</div>
        <div className="col-span-2">Slug</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Updated</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border">
        {pages.map((page: Page) => (
          <div
            key={page.id}
            className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 md:px-6 py-4 hover:bg-muted/30 transition-colors"
          >
            {/* Title */}
            <div className="md:col-span-4">
              <Link
                href={`/${locale}/admin/pages/${page.id}/edit`}
                className="font-medium text-foreground hover:text-primary transition-colors"
              >
                {getLocalizedTitle(page.title, locale)}
              </Link>
              {page.is_system && (
                <Badge variant="outline" className="ml-2 text-xs">
                  System
                </Badge>
              )}
              {/* Mobile: Show slug and status */}
              <div className="md:hidden mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>/{page.slug}</span>
                <Badge variant={statusVariants[page.status]}>
                  {labels[page.status]}
                </Badge>
                {page.published_at && page.status === 'published' && (
                  <span className="flex items-center gap-1 text-xs">
                    <Calendar className="w-3 h-3" />
                    {formatDate(page.published_at, locale)}
                  </span>
                )}
              </div>
              {/* Mobile: Quick actions */}
              <div className="md:hidden mt-2 flex items-center gap-2">
                <PageStatusToggle
                  pageId={page.id}
                  currentStatus={page.status}
                  locale={locale}
                />
              </div>
            </div>

            {/* Slug - Desktop */}
            <div className="hidden md:block md:col-span-2 text-sm text-muted-foreground">
              /{page.slug}
            </div>

            {/* Status - Desktop */}
            <div className="hidden md:flex md:col-span-2 md:items-center md:gap-2">
              <Badge variant={statusVariants[page.status]}>
                {labels[page.status]}
              </Badge>
              {page.published_at && page.status === 'published' && (
                <span className="text-xs text-muted-foreground flex items-center gap-1" title="Published date">
                  <Calendar className="w-3 h-3" />
                </span>
              )}
            </div>

            {/* Updated - Desktop */}
            <div className="hidden md:block md:col-span-2 text-sm text-muted-foreground">
              {formatDate(page.updated_at, locale)}
            </div>

            {/* Actions - Desktop */}
            <div className="hidden md:flex md:col-span-2 md:items-center md:justify-end gap-1">
              <PageStatusToggle
                pageId={page.id}
                currentStatus={page.status}
                locale={locale}
              />
              <Link href={`/${locale}/${page.slug}`} target="_blank">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Eye className="w-4 h-4" />
                  <span className="sr-only">View</span>
                </Button>
              </Link>
              <Link href={`/${locale}/admin/pages/${page.id}/edit`}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Edit className="w-4 h-4" />
                  <span className="sr-only">Edit</span>
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Loading skeleton
function PagesTableSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border">
        <div className="col-span-5"><Skeleton className="h-4 w-16" /></div>
        <div className="col-span-2"><Skeleton className="h-4 w-12" /></div>
        <div className="col-span-2"><Skeleton className="h-4 w-14" /></div>
        <div className="col-span-2"><Skeleton className="h-4 w-16" /></div>
        <div className="col-span-1"></div>
      </div>
      <div className="divide-y divide-border">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4">
            <div className="col-span-5"><Skeleton className="h-5 w-48" /></div>
            <div className="col-span-2"><Skeleton className="h-4 w-20" /></div>
            <div className="col-span-2"><Skeleton className="h-6 w-16 rounded-full" /></div>
            <div className="col-span-2"><Skeleton className="h-4 w-24" /></div>
            <div className="col-span-1 flex justify-end gap-1">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function AdminPagesPage({ params, searchParams }: PagesPageProps) {
  const { locale } = await params;
  const { status } = await searchParams;
  const t = await getTranslations('admin');

  const filters = [
    { value: '', label: 'All' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'archived', label: 'Archived' },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pages</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your website pages and content
          </p>
        </div>
        <Link href={`/${locale}/admin/pages/new`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Page
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {filters.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value ? `/${locale}/admin/pages?status=${filter.value}` : `/${locale}/admin/pages`}
          >
            <Button
              variant={status === filter.value || (!status && !filter.value) ? 'secondary' : 'ghost'}
              size="sm"
            >
              {filter.label}
            </Button>
          </Link>
        ))}
      </div>

      {/* Pages Table */}
      <Suspense fallback={<PagesTableSkeleton />}>
        <PagesTable locale={locale} statusFilter={status} />
      </Suspense>
    </div>
  );
}
