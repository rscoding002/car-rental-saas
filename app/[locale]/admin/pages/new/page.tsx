'use client';

import { useState, useTransition, use } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { ArrowLeft, FileText, Plus } from 'lucide-react';

function NewPageForm() {
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from title
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    // Auto-generate slug if user hasn't manually edited it
    const autoSlug = newTitle
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(autoSlug);
  };

  const handleSlugChange = (newSlug: string) => {
    const sanitized = newSlug
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    setSlug(sanitized);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Please enter a page title');
      return;
    }
    if (!slug.trim()) {
      setError('Please enter a page slug');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: { [locale]: title, en: locale === 'en' ? title : '' },
          slug,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create page');
      }

      const data = await response.json();

      // Redirect to the edit page
      startTransition(() => {
        router.push(`/${locale}/admin/pages/${data.id}/edit`);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create page');
      setIsCreating(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/${locale}/admin/pages`}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Create New Page</h1>
          <p className="text-sm text-muted-foreground">
            Add a new page to your website
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>Page Details</CardTitle>
              <CardDescription>Enter the basic information for your new page</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              {error}
            </Alert>
          )}

          <Input
            label="Page Title"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Enter page title"
            autoFocus
          />

          <Input
            label="URL Slug"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="page-url-slug"
            hint={`Page will be available at: /${locale}/${slug || 'your-slug'}`}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Link href={`/${locale}/admin/pages`}>
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button
              onClick={handleCreate}
              disabled={isCreating || isPending || !title.trim() || !slug.trim()}
              isLoading={isCreating || isPending}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewPagePage() {
  return <NewPageForm />;
}
