'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import {
  ArrowLeft,
  Folder,
  FileText,
  Hash,
  Save,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Smile,
} from 'lucide-react';
import type { VehicleCategory } from '@/lib/fleet/types';

interface CategoryFormProps {
  locale: string;
  category?: VehicleCategory;
  mode: 'create' | 'edit';
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

// Common category icons (emoji)
const COMMON_ICONS = [
  { icon: '🚗', label: 'Car' },
  { icon: '🚙', label: 'SUV' },
  { icon: '🏎️', label: 'Sports' },
  { icon: '🚐', label: 'Van' },
  { icon: '🚕', label: 'Taxi' },
  { icon: '🚘', label: 'Sedan' },
  { icon: '🛻', label: 'Truck' },
  { icon: '🚎', label: 'Bus' },
  { icon: '⚡', label: 'Electric' },
  { icon: '💎', label: 'Luxury' },
  { icon: '💰', label: 'Economy' },
  { icon: '👨‍👩‍👧‍👦', label: 'Family' },
];

export function CategoryForm({ locale, category, mode }: CategoryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state - Names (localized)
  const [nameEn, setNameEn] = useState(category?.name?.en || '');
  const [nameLt, setNameLt] = useState(category?.name?.lt || '');
  const [nameRu, setNameRu] = useState(category?.name?.ru || '');
  const [activeNameTab, setActiveNameTab] = useState<'en' | 'lt' | 'ru'>('en');

  // Form state - Descriptions (localized)
  const [descriptionEn, setDescriptionEn] = useState(category?.description?.en || '');
  const [descriptionLt, setDescriptionLt] = useState(category?.description?.lt || '');
  const [descriptionRu, setDescriptionRu] = useState(category?.description?.ru || '');
  const [activeDescTab, setActiveDescTab] = useState<'en' | 'lt' | 'ru'>('en');

  // Form state - Other fields
  const [icon, setIcon] = useState(category?.icon || '');
  const [imageUrl, setImageUrl] = useState(category?.image_url || '');
  const [sortOrder, setSortOrder] = useState(category?.sort_order?.toString() || '0');
  const [status, setStatus] = useState<'active' | 'inactive'>(category?.status || 'active');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation - at least one name is required
    if (!nameEn.trim() && !nameLt.trim() && !nameRu.trim()) {
      setError('At least one category name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      name: {
        en: nameEn.trim(),
        lt: nameLt.trim(),
        ru: nameRu.trim(),
      },
      description: {
        en: descriptionEn.trim(),
        lt: descriptionLt.trim(),
        ru: descriptionRu.trim(),
      },
      icon: icon.trim() || null,
      image_url: imageUrl.trim() || null,
      sort_order: parseInt(sortOrder, 10) || 0,
      status,
    };

    try {
      const url = mode === 'create'
        ? '/api/admin/categories'
        : `/api/admin/categories/${category!.id}`;

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${mode} category`);
      }

      startTransition(() => {
        router.push(`/${locale}/admin/categories`);
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${mode} category`);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!category) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete category');
      }

      startTransition(() => {
        router.push(`/${locale}/admin/categories`);
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const isLoading = isSubmitting || isPending;

  return (
    <form onSubmit={handleSubmit} className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/${locale}/admin/categories`}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">
            {mode === 'create' ? 'Add New Category' : 'Edit Category'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'create'
              ? 'Create a new vehicle category'
              : `Editing: ${category?.name?.en || category?.name?.lt || 'Unnamed'}`}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="space-y-6">
        {/* Category Name (Localized) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Folder className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Category Name</CardTitle>
                <CardDescription>Name in multiple languages</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Language tabs */}
            <div className="flex gap-1 border-b border-border">
              {(['en', 'lt', 'ru'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveNameTab(lang)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeNameTab === lang
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {lang === 'en' ? 'English' : lang === 'lt' ? 'Lietuvių' : 'Русский'}
                </button>
              ))}
            </div>

            {/* Name inputs */}
            {activeNameTab === 'en' && (
              <Input
                label="Name (English)"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g., Economy"
                autoFocus={mode === 'create'}
              />
            )}
            {activeNameTab === 'lt' && (
              <Input
                label="Pavadinimas (Lietuvių)"
                value={nameLt}
                onChange={(e) => setNameLt(e.target.value)}
                placeholder="pvz., Ekonominė"
              />
            )}
            {activeNameTab === 'ru' && (
              <Input
                label="Название (Русский)"
                value={nameRu}
                onChange={(e) => setNameRu(e.target.value)}
                placeholder="напр., Эконом"
              />
            )}

            <p className="text-xs text-muted-foreground">
              At least one language is required. English is recommended as the fallback.
            </p>
          </CardContent>
        </Card>

        {/* Description (Localized) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Description</CardTitle>
                <CardDescription>Optional description in multiple languages</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Language tabs */}
            <div className="flex gap-1 border-b border-border">
              {(['en', 'lt', 'ru'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveDescTab(lang)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeDescTab === lang
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {lang === 'en' ? 'English' : lang === 'lt' ? 'Lietuvių' : 'Русский'}
                </button>
              ))}
            </div>

            {/* Description textareas */}
            {activeDescTab === 'en' && (
              <Textarea
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                placeholder="Description in English..."
                rows={3}
              />
            )}
            {activeDescTab === 'lt' && (
              <Textarea
                value={descriptionLt}
                onChange={(e) => setDescriptionLt(e.target.value)}
                placeholder="Aprašymas lietuviškai..."
                rows={3}
              />
            )}
            {activeDescTab === 'ru' && (
              <Textarea
                value={descriptionRu}
                onChange={(e) => setDescriptionRu(e.target.value)}
                placeholder="Описание на русском..."
                rows={3}
              />
            )}
          </CardContent>
        </Card>

        {/* Icon & Image */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Smile className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Icon & Image</CardTitle>
                <CardDescription>Visual representation of the category</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Icon input with preview */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Icon (emoji)</label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-2xl border border-border">
                  {icon || <Folder className="w-5 h-5 text-muted-foreground" />}
                </div>
                <Input
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="Paste an emoji..."
                  className="flex-1 max-w-[200px]"
                  maxLength={4}
                />
              </div>
              {/* Quick icon selection */}
              <div className="flex flex-wrap gap-2 mt-2">
                {COMMON_ICONS.map((item) => (
                  <button
                    key={item.icon}
                    type="button"
                    onClick={() => setIcon(item.icon)}
                    className={`w-10 h-10 rounded-lg border text-xl flex items-center justify-center transition-colors ${
                      icon === item.icon
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted'
                    }`}
                    title={item.label}
                  >
                    {item.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Image URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Image URL (optional)</label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/category-image.jpg"
                leftIcon={<ImageIcon className="w-4 h-4" />}
              />
              {imageUrl && (
                <div className="mt-2 relative w-32 h-24 rounded-lg overflow-hidden bg-muted border border-border">
                  <Image
                    src={imageUrl}
                    alt="Category preview"
                    fill
                    className="object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sort Order & Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Hash className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Order & Status</CardTitle>
                <CardDescription>Display order and visibility</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Sort Order"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                min="0"
                hint="Lower numbers appear first"
              />
              <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                options={STATUS_OPTIONS}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-4">
          {mode === 'edit' && (
            <div>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Delete this category?</span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Yes, Delete'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Category
                </Button>
              )}
            </div>
          )}

          <div className="flex gap-3 sm:ml-auto">
            <Link href={`/${locale}/admin/categories`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading} isLoading={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {mode === 'create' ? 'Create Category' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
