'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Page, PageBlock, PageStatus, LocalizedString, BlockType, BlockSettings, PageMeta } from '@/lib/supabase/types';
import { blockMetadata, defaultBlockSettings } from '@/lib/cms/block-registry';
import { getDefaultBlockContent } from '@/lib/cms/block-types';
import { locales, localeNames, type Locale } from '@/i18n/config';
import { BlockPicker } from './block-picker';
import { BlockEditor } from './block-editor';
import { ImageField } from './media-picker';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import {
  ArrowLeft,
  Save,
  Eye,
  Plus,
  GripVertical,
  Trash2,
  ChevronUp,
  ChevronDown,
  Settings,
  FileText,
  LayoutTemplate,
  Grid3X3,
  Car,
  Quote,
  HelpCircle,
  Megaphone,
  LayoutPanelLeft,
  Mail,
  Map,
  Table,
  Type,
  Image as ImageIcon,
  Video,
  Minus,
  Space,
  Code,
  Globe,
  Search,
  Send,
  Archive,
  FileX,
  Calendar,
} from 'lucide-react';

// Icon map for block types
const blockIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'layout-template': LayoutTemplate,
  'grid-3x3': Grid3X3,
  car: Car,
  quote: Quote,
  'help-circle': HelpCircle,
  megaphone: Megaphone,
  'layout-sidebar': LayoutPanelLeft,
  mail: Mail,
  map: Map,
  table: Table,
  type: Type,
  image: ImageIcon,
  video: Video,
  minus: Minus,
  space: Space,
  code: Code,
};

interface PageEditorProps {
  page: Page;
  blocks: PageBlock[];
  locale: string;
  tenantId: string;
}

interface PageFormData {
  title: LocalizedString;
  slug: string;
  status: PageStatus;
  meta: PageMeta;
}

// Get localized title
function getLocalizedTitle(title: LocalizedString, locale: string): string {
  return title[locale] || title.en || Object.values(title).find((v) => v) || 'Untitled';
}

// Locale tab labels for display
const localeLabels: Record<Locale, string> = {
  en: 'EN',
  lt: 'LT',
  ru: 'RU',
};

// Locale tabs component for page settings
function PageLocaleTabs({
  activeLocale,
  onLocaleChange,
  title,
}: {
  activeLocale: Locale;
  onLocaleChange: (locale: Locale) => void;
  title: LocalizedString;
}) {
  // Check which locales have content
  const hasContent = (locale: Locale): boolean => {
    const localeTitle = title[locale];
    return localeTitle !== undefined && localeTitle !== null && localeTitle !== '';
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg mb-3">
      {locales.map((locale) => {
        const isActive = locale === activeLocale;
        const filled = hasContent(locale);
        return (
          <button
            key={locale}
            type="button"
            onClick={() => onLocaleChange(locale)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{localeLabels[locale]}</span>
            {filled && !isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" title={`${localeNames[locale]} has content`} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// Locale tabs component for SEO settings
function SEOLocaleTabs({
  activeLocale,
  onLocaleChange,
  meta,
}: {
  activeLocale: Locale;
  onLocaleChange: (locale: Locale) => void;
  meta: PageMeta;
}) {
  // Check which locales have SEO content
  const hasContent = (locale: Locale): boolean => {
    const localeMeta = meta[locale];
    if (!localeMeta) return false;
    return !!(localeMeta.description || localeMeta.keywords || localeMeta.ogImage);
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg mb-4">
      {locales.map((locale) => {
        const isActive = locale === activeLocale;
        const filled = hasContent(locale);
        return (
          <button
            key={locale}
            type="button"
            onClick={() => onLocaleChange(locale)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{localeLabels[locale]}</span>
            {filled && !isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" title={`${localeNames[locale]} has SEO content`} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// Block item component
function BlockItem({
  block,
  index,
  totalBlocks,
  isSelected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  block: PageBlock;
  index: number;
  totalBlocks: number;
  isSelected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const meta = blockMetadata[block.block_type];
  const IconComponent = blockIcons[meta?.icon || 'layout-template'] || FileText;

  return (
    <div
      className={cn(
        'group relative bg-card rounded-lg border transition-all',
        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-muted-foreground/50'
      )}
    >
      <div className="flex items-center gap-3 p-3 sm:p-4">
        {/* Drag handle */}
        <div className="flex-shrink-0 cursor-grab text-muted-foreground hover:text-foreground">
          <GripVertical className="w-5 h-5" />
        </div>

        {/* Block icon */}
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
            isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          )}
        >
          <IconComponent className="w-5 h-5" />
        </div>

        {/* Block info */}
        <button
          type="button"
          onClick={onSelect}
          className="flex-1 text-left min-w-0"
        >
          <p className="font-medium text-foreground truncate">{meta?.name || block.block_type}</p>
          <p className="text-sm text-muted-foreground truncate">{meta?.description || 'Block'}</p>
        </button>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onMoveUp}
            disabled={index === 0}
            title="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onMoveDown}
            disabled={index === totalBlocks - 1}
            title="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Delete block"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Empty blocks state
function EmptyBlocksState({ onAddBlock }: { onAddBlock: () => void }) {
  return (
    <div className="py-12 border-2 border-dashed border-border rounded-lg text-center">
      <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
      <p className="text-muted-foreground mb-4">
        No blocks yet. Add your first block to start building the page.
      </p>
      <Button onClick={onAddBlock}>
        <Plus className="w-4 h-4 mr-2" />
        Add Block
      </Button>
    </div>
  );
}

export function PageEditor({ page, blocks: initialBlocks, locale, tenantId }: PageEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [formData, setFormData] = useState<PageFormData>({
    title: page.title,
    slug: page.slug,
    status: page.status,
    meta: page.meta || {},
  });

  // Blocks state
  const [blocks, setBlocks] = useState<PageBlock[]>(initialBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Locale state for editing page title in different languages
  const [titleEditingLocale, setTitleEditingLocale] = useState<Locale>(locale as Locale);

  // Locale state for editing SEO in different languages
  const [seoEditingLocale, setSeoEditingLocale] = useState<Locale>(locale as Locale);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isBlockPickerOpen, setIsBlockPickerOpen] = useState(false);

  // Status options
  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
  ];

  // Handle form changes
  const handleTitleChange = (newTitle: string, editLocale: Locale = titleEditingLocale) => {
    setFormData((prev) => ({
      ...prev,
      title: { ...prev.title, [editLocale]: newTitle },
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSlugChange = (newSlug: string) => {
    // Sanitize slug: lowercase, replace spaces with dashes, remove special chars
    const sanitized = newSlug
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    setFormData((prev) => ({ ...prev, slug: sanitized }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleStatusChange = (newStatus: string) => {
    setFormData((prev) => ({ ...prev, status: newStatus as PageStatus }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  // Handle SEO meta changes
  const handleMetaChange = (field: keyof PageMeta[string], value: string) => {
    setFormData((prev) => ({
      ...prev,
      meta: {
        ...prev.meta,
        [seoEditingLocale]: {
          ...(prev.meta[seoEditingLocale] || {}),
          [field]: value,
        },
      },
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  // Get meta value for current editing locale
  const getMetaValue = (field: keyof PageMeta[string]): string => {
    return formData.meta[seoEditingLocale]?.[field] || '';
  };

  // Block management
  const handleSelectBlock = (blockId: string) => {
    setSelectedBlockId(blockId === selectedBlockId ? null : blockId);
  };

  const handleMoveBlockUp = (index: number) => {
    if (index === 0) return;
    const newBlocks = [...blocks];
    [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    // Update sort_order
    newBlocks.forEach((block, i) => {
      block.sort_order = i;
    });
    setBlocks(newBlocks);
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleMoveBlockDown = (index: number) => {
    if (index === blocks.length - 1) return;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    // Update sort_order
    newBlocks.forEach((block, i) => {
      block.sort_order = i;
    });
    setBlocks(newBlocks);
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleDeleteBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleAddBlock = () => {
    setIsBlockPickerOpen(true);
  };

  const handleBlockSelected = (blockType: BlockType) => {
    // Generate a unique ID for the new block
    const newBlockId = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get default content for the block type
    const defaultContent = getDefaultBlockContent(blockType);

    // Create the new block
    const newBlock: PageBlock = {
      id: newBlockId,
      page_id: page.id,
      block_type: blockType,
      content: defaultContent as any,
      settings: defaultBlockSettings,
      sort_order: blocks.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add the new block to the list
    setBlocks((prev) => [...prev, newBlock]);
    setHasChanges(true);
    setSaveSuccess(false);

    // Select the new block
    setSelectedBlockId(newBlockId);
  };

  const handleBlockContentUpdate = (blockId: string, newContent: any, newSettings?: BlockSettings) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? {
              ...block,
              content: newContent,
              settings: newSettings || block.settings,
              updated_at: new Date().toISOString(),
            }
          : block
      )
    );
    setHasChanges(true);
    setSaveSuccess(false);
  };

  // Publishing state
  const [isPublishing, setIsPublishing] = useState(false);

  // Save handler
  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch(`/api/admin/pages/${page.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          slug: formData.slug,
          status: formData.status,
          meta: formData.meta,
          blocks: blocks.map((block, index) => ({
            id: block.id,
            block_type: block.block_type,
            content: block.content,
            settings: block.settings,
            sort_order: index,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save page');
      }

      setSaveSuccess(true);
      setHasChanges(false);

      // Refresh the page data
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save page');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick publish/unpublish handler
  const handlePublishToggle = async () => {
    const newStatus: PageStatus = formData.status === 'published' ? 'draft' : 'published';

    setIsPublishing(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch(`/api/admin/pages/${page.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          slug: formData.slug,
          status: newStatus,
          meta: formData.meta,
          blocks: blocks.map((block, index) => ({
            id: block.id,
            block_type: block.block_type,
            content: block.content,
            settings: block.settings,
            sort_order: index,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${newStatus === 'published' ? 'publish' : 'unpublish'} page`);
      }

      // Update local state
      setFormData((prev) => ({ ...prev, status: newStatus }));
      setSaveSuccess(true);
      setHasChanges(false);

      // Refresh the page data
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to update page status');
    } finally {
      setIsPublishing(false);
    }
  };

  // Archive handler
  const handleArchive = async () => {
    setIsPublishing(true);
    setSaveError(null);

    try {
      const response = await fetch(`/api/admin/pages/${page.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          slug: formData.slug,
          status: 'archived',
          meta: formData.meta,
          blocks: blocks.map((block, index) => ({
            id: block.id,
            block_type: block.block_type,
            content: block.content,
            settings: block.settings,
            sort_order: index,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to archive page');
      }

      // Update local state
      setFormData((prev) => ({ ...prev, status: 'archived' }));
      setSaveSuccess(true);
      setHasChanges(false);

      // Refresh the page data
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to archive page');
    } finally {
      setIsPublishing(false);
    }
  };

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="p-4 md:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Back and title */}
            <div className="flex items-center gap-4">
              <Link href={`/${locale}/admin/pages`}>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  {getLocalizedTitle(formData.title, locale) || 'Untitled Page'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  /{formData.slug}
                  {hasChanges && (
                    <span className="ml-2 text-warning">
                      (unsaved changes)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Status badge for mobile */}
              <Badge
                variant={
                  formData.status === 'published'
                    ? 'success'
                    : formData.status === 'archived'
                    ? 'default'
                    : 'secondary'
                }
                className="sm:hidden"
              >
                {formData.status === 'published' ? 'Published' : formData.status === 'archived' ? 'Archived' : 'Draft'}
              </Badge>

              <Link href={`/${locale}/admin/pages/${page.id}/preview`} target="_blank">
                <Button variant="outline" size="icon" className="sm:hidden">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="outline" className="hidden sm:inline-flex">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </Link>

              {/* Publish/Unpublish button */}
              {formData.status === 'published' ? (
                <Button
                  variant="outline"
                  onClick={handlePublishToggle}
                  disabled={isPublishing}
                  isLoading={isPublishing}
                  className="hidden sm:inline-flex"
                >
                  <FileX className="w-4 h-4 mr-2" />
                  Unpublish
                </Button>
              ) : formData.status === 'archived' ? (
                <Button
                  variant="outline"
                  onClick={handlePublishToggle}
                  disabled={isPublishing}
                  isLoading={isPublishing}
                  className="hidden sm:inline-flex"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Publish
                </Button>
              ) : (
                <Button
                  variant="default"
                  onClick={handlePublishToggle}
                  disabled={isPublishing}
                  isLoading={isPublishing}
                  className="bg-green-600 hover:bg-green-700 hidden sm:inline-flex"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Publish
                </Button>
              )}

              {/* Mobile publish button */}
              {formData.status !== 'published' ? (
                <Button
                  size="icon"
                  onClick={handlePublishToggle}
                  disabled={isPublishing}
                  isLoading={isPublishing}
                  className="bg-green-600 hover:bg-green-700 sm:hidden"
                >
                  <Send className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePublishToggle}
                  disabled={isPublishing}
                  isLoading={isPublishing}
                  className="sm:hidden"
                >
                  <FileX className="w-4 h-4" />
                </Button>
              )}

              <Button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                isLoading={isSaving}
              >
                <Save className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Save</span>
              </Button>
            </div>
          </div>

          {/* Save feedback */}
          {saveError && (
            <Alert variant="destructive" className="mt-4">
              {saveError}
            </Alert>
          )}
          {saveSuccess && (
            <Alert variant="success" className="mt-4">
              Page saved successfully!
            </Alert>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Blocks list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Blocks</h2>
              <Button onClick={handleAddBlock} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Block
              </Button>
            </div>

            {blocks.length === 0 ? (
              <EmptyBlocksState onAddBlock={handleAddBlock} />
            ) : (
              <div className="space-y-2">
                {blocks.map((block, index) => (
                  <BlockItem
                    key={block.id}
                    block={block}
                    index={index}
                    totalBlocks={blocks.length}
                    isSelected={block.id === selectedBlockId}
                    onSelect={() => handleSelectBlock(block.id)}
                    onMoveUp={() => handleMoveBlockUp(index)}
                    onMoveDown={() => handleMoveBlockDown(index)}
                    onDelete={() => handleDeleteBlock(block.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Page settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Page Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Locale tabs for title editing */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Title
                  </label>
                  <PageLocaleTabs
                    activeLocale={titleEditingLocale}
                    onLocaleChange={setTitleEditingLocale}
                    title={formData.title}
                  />
                  <Input
                    value={formData.title[titleEditingLocale] || ''}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder={`Enter page title in ${localeNames[titleEditingLocale]}`}
                  />
                </div>
                <Input
                  label="Slug"
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="page-url-slug"
                  hint="The URL path for this page"
                />
                <Select
                  label="Status"
                  value={formData.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  options={statusOptions}
                />
              </CardContent>
            </Card>

            {/* SEO Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  SEO Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SEOLocaleTabs
                  activeLocale={seoEditingLocale}
                  onLocaleChange={setSeoEditingLocale}
                  meta={formData.meta}
                />

                <Textarea
                  label="Meta Description"
                  value={getMetaValue('description')}
                  onChange={(e) => handleMetaChange('description', e.target.value)}
                  placeholder={`Page description in ${localeNames[seoEditingLocale]} (150-160 characters recommended)`}
                  rows={3}
                  hint={`${getMetaValue('description').length}/160 characters`}
                />

                <Input
                  label="Keywords"
                  value={getMetaValue('keywords')}
                  onChange={(e) => handleMetaChange('keywords', e.target.value)}
                  placeholder="keyword1, keyword2, keyword3"
                  hint="Comma-separated keywords (optional)"
                />

                <ImageField
                  label="Open Graph Image"
                  value={getMetaValue('ogImage')}
                  onChange={(url) => handleMetaChange('ogImage', url)}
                  placeholder="Image URL for social sharing"
                  hint="Recommended size: 1200x630 pixels"
                />

                <Input
                  label="Canonical URL"
                  value={getMetaValue('canonical')}
                  onChange={(e) => handleMetaChange('canonical', e.target.value)}
                  placeholder="https://..."
                  hint="Leave empty to use default page URL"
                />
              </CardContent>
            </Card>

            {/* Block Editor */}
            {selectedBlock && (
              <BlockEditor
                block={selectedBlock}
                locale={locale}
                onUpdate={(content, settings) =>
                  handleBlockContentUpdate(selectedBlock.id, content, settings)
                }
                onClose={() => setSelectedBlockId(null)}
              />
            )}

            {/* Page info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Page Info</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd>
                      <Badge
                        variant={
                          formData.status === 'published'
                            ? 'success'
                            : formData.status === 'archived'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {formData.status === 'published' ? 'Published' : formData.status === 'archived' ? 'Archived' : 'Draft'}
                      </Badge>
                    </dd>
                  </div>
                  {page.published_at && (
                    <div className="flex justify-between items-center">
                      <dt className="text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Published
                      </dt>
                      <dd className="text-foreground">
                        {new Date(page.published_at).toLocaleDateString(locale, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Created</dt>
                    <dd className="text-foreground">
                      {new Date(page.created_at).toLocaleDateString(locale)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Updated</dt>
                    <dd className="text-foreground">
                      {new Date(page.updated_at).toLocaleDateString(locale)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Blocks</dt>
                    <dd className="text-foreground">{blocks.length}</dd>
                  </div>
                  {page.is_system && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Type</dt>
                      <dd>
                        <Badge variant="outline">System Page</Badge>
                      </dd>
                    </div>
                  )}
                </dl>

                {/* Quick actions for archiving */}
                {formData.status !== 'archived' && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleArchive}
                      disabled={isPublishing}
                      className="w-full text-muted-foreground hover:text-foreground"
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Archive Page
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Block Picker Modal */}
      <BlockPicker
        isOpen={isBlockPickerOpen}
        onClose={() => setIsBlockPickerOpen(false)}
        onSelectBlock={handleBlockSelected}
      />
    </div>
  );
}
