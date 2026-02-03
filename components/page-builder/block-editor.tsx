'use client';

import { useState } from 'react';
import type { PageBlock, BlockType, BlockSettings, Json } from '@/lib/supabase/types';
import { blockMetadata } from '@/lib/cms/block-registry';
import { locales, localeNames, type Locale } from '@/i18n/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import { ImageField } from './media-picker';
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
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

interface BlockEditorProps {
  block: PageBlock;
  locale: string;
  onUpdate: (content: Json, settings?: BlockSettings) => void;
  onClose: () => void;
}

// Locale tab labels for display
const localeLabels: Record<Locale, string> = {
  en: 'EN',
  lt: 'LT',
  ru: 'RU',
};

// Locale tabs component for switching between languages
function LocaleTabs({
  activeLocale,
  onLocaleChange,
  content,
}: {
  activeLocale: Locale;
  onLocaleChange: (locale: Locale) => void;
  content: Record<string, unknown>;
}) {
  // Check which locales have content
  const hasContent = (locale: Locale): boolean => {
    const localeContent = content[locale];
    if (!localeContent || typeof localeContent !== 'object') return false;
    // Check if any non-empty values exist
    return Object.values(localeContent as Record<string, unknown>).some(
      (value) => value !== undefined && value !== null && value !== ''
    );
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
              <span className="w-1.5 h-1.5 rounded-full bg-primary" title={`${localeNames[locale]} has content`} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// Get localized content helper
function getLocaleContent<T>(content: Record<string, unknown>, locale: string): T | undefined {
  return (content[locale] || content.en) as T | undefined;
}

// Update localized content helper
function updateLocaleContent(
  content: Record<string, unknown>,
  locale: string,
  updates: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...content,
    [locale]: {
      ...(content[locale] as Record<string, unknown> || {}),
      ...updates,
    },
  };
}

// ============================================================================
// HERO BLOCK EDITOR
// ============================================================================
function HeroBlockEditor({
  content,
  locale,
  onUpdate,
}: {
  content: Record<string, unknown>;
  locale: string;
  onUpdate: (content: Record<string, unknown>) => void;
}) {
  const localeContent = getLocaleContent<Record<string, string>>(content, locale) || {};

  return (
    <div className="space-y-4">
      <Input
        label="Heading"
        value={localeContent.heading || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { heading: e.target.value }))
        }
        placeholder="Enter heading text"
      />
      <Textarea
        label="Subheading"
        value={localeContent.subheading || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { subheading: e.target.value }))
        }
        placeholder="Enter subheading text"
        rows={2}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="CTA Button Text"
          value={localeContent.ctaText || ''}
          onChange={(e) =>
            onUpdate(updateLocaleContent(content, locale, { ctaText: e.target.value }))
          }
          placeholder="e.g., Get Started"
        />
        <Input
          label="CTA Button Link"
          value={localeContent.ctaLink || ''}
          onChange={(e) =>
            onUpdate(updateLocaleContent(content, locale, { ctaLink: e.target.value }))
          }
          placeholder="e.g., /booking"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Secondary Button Text"
          value={localeContent.secondaryCtaText || ''}
          onChange={(e) =>
            onUpdate(updateLocaleContent(content, locale, { secondaryCtaText: e.target.value }))
          }
          placeholder="e.g., Learn More"
        />
        <Input
          label="Secondary Button Link"
          value={localeContent.secondaryCtaLink || ''}
          onChange={(e) =>
            onUpdate(updateLocaleContent(content, locale, { secondaryCtaLink: e.target.value }))
          }
          placeholder="e.g., /about"
        />
      </div>
      <ImageField
        label="Background Image"
        value={(content.backgroundImage as string) || ''}
        onChange={(url) => onUpdate({ ...content, backgroundImage: url })}
        placeholder="https://... or select from library"
      />
      <Select
        label="Text Alignment"
        value={(content.alignment as string) || 'center'}
        onChange={(e) => onUpdate({ ...content, alignment: e.target.value })}
        options={[
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ]}
      />
    </div>
  );
}

// ============================================================================
// TEXT BLOCK EDITOR
// ============================================================================
function TextBlockEditor({
  content,
  locale,
  onUpdate,
}: {
  content: Record<string, unknown>;
  locale: string;
  onUpdate: (content: Record<string, unknown>) => void;
}) {
  const localeContent = getLocaleContent<Record<string, string>>(content, locale) || {};

  return (
    <div className="space-y-4">
      <Input
        label="Heading (optional)"
        value={localeContent.heading || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { heading: e.target.value }))
        }
        placeholder="Section heading"
      />
      <Textarea
        label="Content"
        value={localeContent.content || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { content: e.target.value }))
        }
        placeholder="Enter your text content here..."
        rows={6}
      />
    </div>
  );
}

// ============================================================================
// CTA BLOCK EDITOR
// ============================================================================
function CTABlockEditor({
  content,
  locale,
  onUpdate,
}: {
  content: Record<string, unknown>;
  locale: string;
  onUpdate: (content: Record<string, unknown>) => void;
}) {
  const localeContent = getLocaleContent<Record<string, string>>(content, locale) || {};

  return (
    <div className="space-y-4">
      <Input
        label="Heading"
        value={localeContent.heading || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { heading: e.target.value }))
        }
        placeholder="Call to action heading"
      />
      <Textarea
        label="Description"
        value={localeContent.description || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { description: e.target.value }))
        }
        placeholder="Supporting text"
        rows={2}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Button Text"
          value={localeContent.buttonText || ''}
          onChange={(e) =>
            onUpdate(updateLocaleContent(content, locale, { buttonText: e.target.value }))
          }
          placeholder="e.g., Get Started"
        />
        <Input
          label="Button Link"
          value={localeContent.buttonLink || ''}
          onChange={(e) =>
            onUpdate(updateLocaleContent(content, locale, { buttonLink: e.target.value }))
          }
          placeholder="e.g., /contact"
        />
      </div>
      <Input
        label="Background Color"
        value={(content.backgroundColor as string) || ''}
        onChange={(e) => onUpdate({ ...content, backgroundColor: e.target.value })}
        placeholder="e.g., #3B82F6 or rgb(59, 130, 246)"
      />
    </div>
  );
}

// ============================================================================
// FAQ BLOCK EDITOR
// ============================================================================
interface FAQItem {
  question: string;
  answer: string;
}

function FAQBlockEditor({
  content,
  locale,
  onUpdate,
}: {
  content: Record<string, unknown>;
  locale: string;
  onUpdate: (content: Record<string, unknown>) => void;
}) {
  const localeContent = getLocaleContent<{ heading?: string; subheading?: string; items?: FAQItem[] }>(content, locale) || {};
  const items = localeContent.items || [];

  const updateItems = (newItems: FAQItem[]) => {
    onUpdate(updateLocaleContent(content, locale, { ...localeContent, items: newItems }));
  };

  const addItem = () => {
    updateItems([...items, { question: '', answer: '' }]);
  };

  const removeItem = (index: number) => {
    updateItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof FAQItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    updateItems(newItems);
  };

  return (
    <div className="space-y-4">
      <Input
        label="Heading"
        value={localeContent.heading || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { ...localeContent, heading: e.target.value }))
        }
        placeholder="Frequently Asked Questions"
      />
      <Input
        label="Subheading"
        value={localeContent.subheading || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { ...localeContent, subheading: e.target.value }))
        }
        placeholder="Find answers to common questions"
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">FAQ Items</label>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="w-4 h-4 mr-1" />
            Add Question
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
            No FAQ items yet. Click &quot;Add Question&quot; to start.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <Input
                      label={`Question ${index + 1}`}
                      value={item.question}
                      onChange={(e) => updateItem(index, 'question', e.target.value)}
                      placeholder="Enter question"
                    />
                    <Textarea
                      label="Answer"
                      value={item.answer}
                      onChange={(e) => updateItem(index, 'answer', e.target.value)}
                      placeholder="Enter answer"
                      rows={2}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive mt-6"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Checkbox
        label="Allow multiple items open at once"
        checked={(content.allowMultipleOpen as boolean) || false}
        onChange={(e) => onUpdate({ ...content, allowMultipleOpen: e.target.checked })}
      />
    </div>
  );
}

// ============================================================================
// FEATURES BLOCK EDITOR
// ============================================================================
interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

const iconOptions = [
  { value: 'shield', label: 'Shield' },
  { value: 'clock', label: 'Clock' },
  { value: 'map-pin', label: 'Map Pin' },
  { value: 'car', label: 'Car' },
  { value: 'star', label: 'Star' },
  { value: 'check', label: 'Check' },
  { value: 'phone', label: 'Phone' },
  { value: 'mail', label: 'Mail' },
  { value: 'credit-card', label: 'Credit Card' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'key', label: 'Key' },
  { value: 'users', label: 'Users' },
  { value: 'award', label: 'Award' },
  { value: 'heart', label: 'Heart' },
  { value: 'thumbs-up', label: 'Thumbs Up' },
  { value: 'zap', label: 'Zap' },
];

function FeaturesBlockEditor({
  content,
  locale,
  onUpdate,
}: {
  content: Record<string, unknown>;
  locale: string;
  onUpdate: (content: Record<string, unknown>) => void;
}) {
  const localeContent = getLocaleContent<{ heading?: string; subheading?: string; features?: FeatureItem[] }>(content, locale) || {};
  const features = localeContent.features || [];

  const updateFeatures = (newFeatures: FeatureItem[]) => {
    onUpdate(updateLocaleContent(content, locale, { ...localeContent, features: newFeatures }));
  };

  const addFeature = () => {
    updateFeatures([...features, { icon: 'star', title: '', description: '' }]);
  };

  const removeFeature = (index: number) => {
    updateFeatures(features.filter((_, i) => i !== index));
  };

  const updateFeature = (index: number, field: keyof FeatureItem, value: string) => {
    const newFeatures = [...features];
    newFeatures[index] = { ...newFeatures[index], [field]: value };
    updateFeatures(newFeatures);
  };

  return (
    <div className="space-y-4">
      <Input
        label="Heading"
        value={localeContent.heading || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { ...localeContent, heading: e.target.value }))
        }
        placeholder="Why Choose Us"
      />
      <Input
        label="Subheading"
        value={localeContent.subheading || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { ...localeContent, subheading: e.target.value }))
        }
        placeholder="Our key features"
      />

      <Select
        label="Columns"
        value={String((content.columns as number) || 3)}
        onChange={(e) => onUpdate({ ...content, columns: parseInt(e.target.value) })}
        options={[
          { value: '2', label: '2 Columns' },
          { value: '3', label: '3 Columns' },
          { value: '4', label: '4 Columns' },
        ]}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Features</label>
          <Button type="button" variant="outline" size="sm" onClick={addFeature}>
            <Plus className="w-4 h-4 mr-1" />
            Add Feature
          </Button>
        </div>

        {features.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
            No features yet. Click &quot;Add Feature&quot; to start.
          </p>
        ) : (
          <div className="space-y-3">
            {features.map((feature, index) => (
              <div key={index} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        label="Icon"
                        value={feature.icon}
                        onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                        options={iconOptions}
                      />
                      <Input
                        label="Title"
                        value={feature.title}
                        onChange={(e) => updateFeature(index, 'title', e.target.value)}
                        placeholder="Feature title"
                      />
                    </div>
                    <Textarea
                      label="Description"
                      value={feature.description}
                      onChange={(e) => updateFeature(index, 'description', e.target.value)}
                      placeholder="Feature description"
                      rows={2}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive mt-6"
                    onClick={() => removeFeature(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TEXT IMAGE BLOCK EDITOR
// ============================================================================
function TextImageBlockEditor({
  content,
  locale,
  onUpdate,
}: {
  content: Record<string, unknown>;
  locale: string;
  onUpdate: (content: Record<string, unknown>) => void;
}) {
  const localeContent = getLocaleContent<Record<string, string>>(content, locale) || {};

  return (
    <div className="space-y-4">
      <Input
        label="Heading"
        value={localeContent.heading || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { heading: e.target.value }))
        }
        placeholder="Section heading"
      />
      <Textarea
        label="Text Content"
        value={localeContent.text || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { text: e.target.value }))
        }
        placeholder="Enter your text content"
        rows={4}
      />
      <ImageField
        label="Image"
        value={(content.image as string) || ''}
        onChange={(url) => onUpdate({ ...content, image: url })}
        placeholder="https://... or select from library"
      />
      <Select
        label="Image Position"
        value={(content.imagePosition as string) || 'right'}
        onChange={(e) => onUpdate({ ...content, imagePosition: e.target.value })}
        options={[
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
        ]}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="CTA Button Text"
          value={localeContent.ctaText || ''}
          onChange={(e) =>
            onUpdate(updateLocaleContent(content, locale, { ctaText: e.target.value }))
          }
          placeholder="Learn More"
        />
        <Input
          label="CTA Button Link"
          value={localeContent.ctaLink || ''}
          onChange={(e) =>
            onUpdate(updateLocaleContent(content, locale, { ctaLink: e.target.value }))
          }
          placeholder="/about"
        />
      </div>
    </div>
  );
}

// ============================================================================
// TESTIMONIALS BLOCK EDITOR
// ============================================================================
interface TestimonialItem {
  name: string;
  text: string;
  rating?: number;
  title?: string;
  company?: string;
}

function TestimonialsBlockEditor({
  content,
  locale,
  onUpdate,
}: {
  content: Record<string, unknown>;
  locale: string;
  onUpdate: (content: Record<string, unknown>) => void;
}) {
  const localeContent = getLocaleContent<{ heading?: string; subheading?: string; testimonials?: TestimonialItem[] }>(content, locale) || {};
  const testimonials = localeContent.testimonials || [];

  const updateTestimonials = (newTestimonials: TestimonialItem[]) => {
    onUpdate(updateLocaleContent(content, locale, { ...localeContent, testimonials: newTestimonials }));
  };

  const addTestimonial = () => {
    updateTestimonials([...testimonials, { name: '', text: '', rating: 5 }]);
  };

  const removeTestimonial = (index: number) => {
    updateTestimonials(testimonials.filter((_, i) => i !== index));
  };

  const updateTestimonial = (index: number, updates: Partial<TestimonialItem>) => {
    const newTestimonials = [...testimonials];
    newTestimonials[index] = { ...newTestimonials[index], ...updates };
    updateTestimonials(newTestimonials);
  };

  return (
    <div className="space-y-4">
      <Input
        label="Heading"
        value={localeContent.heading || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { ...localeContent, heading: e.target.value }))
        }
        placeholder="What Our Customers Say"
      />

      <Select
        label="Layout"
        value={(content.layout as string) || 'grid'}
        onChange={(e) => onUpdate({ ...content, layout: e.target.value })}
        options={[
          { value: 'grid', label: 'Grid' },
          { value: 'carousel', label: 'Carousel' },
        ]}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Testimonials</label>
          <Button type="button" variant="outline" size="sm" onClick={addTestimonial}>
            <Plus className="w-4 h-4 mr-1" />
            Add Testimonial
          </Button>
        </div>

        {testimonials.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
            No testimonials yet. Click &quot;Add Testimonial&quot; to start.
          </p>
        ) : (
          <div className="space-y-3">
            {testimonials.map((item, index) => (
              <div key={index} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <Textarea
                      label="Testimonial Text"
                      value={item.text}
                      onChange={(e) => updateTestimonial(index, { text: e.target.value })}
                      placeholder="Customer review..."
                      rows={2}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="Name"
                        value={item.name}
                        onChange={(e) => updateTestimonial(index, { name: e.target.value })}
                        placeholder="John Doe"
                      />
                      <Select
                        label="Rating"
                        value={String(item.rating || 5)}
                        onChange={(e) => updateTestimonial(index, { rating: parseInt(e.target.value) })}
                        options={[
                          { value: '5', label: '5 Stars' },
                          { value: '4', label: '4 Stars' },
                          { value: '3', label: '3 Stars' },
                          { value: '2', label: '2 Stars' },
                          { value: '1', label: '1 Star' },
                        ]}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="Title (optional)"
                        value={item.title || ''}
                        onChange={(e) => updateTestimonial(index, { title: e.target.value })}
                        placeholder="CEO"
                      />
                      <Input
                        label="Company (optional)"
                        value={item.company || ''}
                        onChange={(e) => updateTestimonial(index, { company: e.target.value })}
                        placeholder="Acme Inc"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive mt-6"
                    onClick={() => removeTestimonial(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DIVIDER BLOCK EDITOR
// ============================================================================
function DividerBlockEditor({
  content,
  onUpdate,
}: {
  content: Record<string, unknown>;
  onUpdate: (content: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <Select
        label="Style"
        value={(content.style as string) || 'solid'}
        onChange={(e) => onUpdate({ ...content, style: e.target.value })}
        options={[
          { value: 'solid', label: 'Solid' },
          { value: 'dashed', label: 'Dashed' },
          { value: 'dotted', label: 'Dotted' },
        ]}
      />
      <Select
        label="Width"
        value={(content.width as string) || 'full'}
        onChange={(e) => onUpdate({ ...content, width: e.target.value })}
        options={[
          { value: 'full', label: 'Full Width' },
          { value: 'medium', label: 'Medium' },
          { value: 'small', label: 'Small' },
        ]}
      />
      <Input
        label="Color"
        value={(content.color as string) || ''}
        onChange={(e) => onUpdate({ ...content, color: e.target.value })}
        placeholder="#E5E7EB or leave empty for default"
      />
    </div>
  );
}

// ============================================================================
// SPACER BLOCK EDITOR
// ============================================================================
function SpacerBlockEditor({
  content,
  onUpdate,
}: {
  content: Record<string, unknown>;
  onUpdate: (content: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <Select
        label="Height"
        value={(content.height as string) || 'md'}
        onChange={(e) => onUpdate({ ...content, height: e.target.value })}
        options={[
          { value: 'sm', label: 'Small (16px)' },
          { value: 'md', label: 'Medium (32px)' },
          { value: 'lg', label: 'Large (48px)' },
          { value: 'xl', label: 'Extra Large (64px)' },
        ]}
      />
      <Select
        label="Mobile Height"
        value={(content.mobileHeight as string) || ''}
        onChange={(e) => onUpdate({ ...content, mobileHeight: e.target.value || undefined })}
        options={[
          { value: '', label: 'Same as desktop' },
          { value: 'sm', label: 'Small (16px)' },
          { value: 'md', label: 'Medium (32px)' },
          { value: 'lg', label: 'Large (48px)' },
          { value: 'xl', label: 'Extra Large (64px)' },
        ]}
      />
    </div>
  );
}

// ============================================================================
// HTML BLOCK EDITOR
// ============================================================================
function HTMLBlockEditor({
  content,
  onUpdate,
}: {
  content: Record<string, unknown>;
  onUpdate: (content: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <Textarea
        label="HTML Code"
        value={(content.html as string) || ''}
        onChange={(e) => onUpdate({ ...content, html: e.target.value })}
        placeholder="<div>Your custom HTML here</div>"
        rows={8}
        className="font-mono text-sm"
      />
      <Checkbox
        label="Sanitize HTML (remove potentially dangerous elements)"
        checked={(content.sanitize as boolean) !== false}
        onChange={(e) => onUpdate({ ...content, sanitize: e.target.checked })}
      />
    </div>
  );
}

// ============================================================================
// IMAGE BLOCK EDITOR
// ============================================================================
function ImageBlockEditor({
  content,
  locale,
  onUpdate,
}: {
  content: Record<string, unknown>;
  locale: string;
  onUpdate: (content: Record<string, unknown>) => void;
}) {
  const altText = (content.alt as Record<string, string>) || {};
  const caption = (content.caption as Record<string, string>) || {};

  return (
    <div className="space-y-4">
      <ImageField
        label="Image"
        value={(content.src as string) || ''}
        onChange={(url) => onUpdate({ ...content, src: url })}
        placeholder="https://... or select from library"
      />
      <Input
        label="Alt Text"
        value={altText[locale] || altText.en || ''}
        onChange={(e) => onUpdate({ ...content, alt: { ...altText, [locale]: e.target.value } })}
        placeholder="Describe the image"
      />
      <Input
        label="Caption (optional)"
        value={caption[locale] || caption.en || ''}
        onChange={(e) => onUpdate({ ...content, caption: { ...caption, [locale]: e.target.value } })}
        placeholder="Image caption"
      />
      <Input
        label="Link (optional)"
        value={(content.link as string) || ''}
        onChange={(e) => onUpdate({ ...content, link: e.target.value })}
        placeholder="https://..."
      />
    </div>
  );
}

// ============================================================================
// VIDEO BLOCK EDITOR
// ============================================================================
function VideoBlockEditor({
  content,
  onUpdate,
}: {
  content: Record<string, unknown>;
  onUpdate: (content: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="Video URL"
        value={(content.videoUrl as string) || ''}
        onChange={(e) => onUpdate({ ...content, videoUrl: e.target.value })}
        placeholder="YouTube or Vimeo URL"
        hint="Supports YouTube and Vimeo URLs"
      />
      <Input
        label="Thumbnail URL (optional)"
        value={(content.thumbnailUrl as string) || ''}
        onChange={(e) => onUpdate({ ...content, thumbnailUrl: e.target.value })}
        placeholder="https://..."
      />
      <div className="space-y-2">
        <Checkbox
          label="Autoplay"
          checked={(content.autoplay as boolean) || false}
          onChange={(e) => onUpdate({ ...content, autoplay: e.target.checked })}
        />
        <Checkbox
          label="Muted"
          checked={(content.muted as boolean) !== false}
          onChange={(e) => onUpdate({ ...content, muted: e.target.checked })}
        />
        <Checkbox
          label="Loop"
          checked={(content.loop as boolean) || false}
          onChange={(e) => onUpdate({ ...content, loop: e.target.checked })}
        />
      </div>
    </div>
  );
}

// ============================================================================
// CONTACT FORM BLOCK EDITOR
// ============================================================================
function ContactFormBlockEditor({
  content,
  locale,
  onUpdate,
}: {
  content: Record<string, unknown>;
  locale: string;
  onUpdate: (content: Record<string, unknown>) => void;
}) {
  const localeContent = getLocaleContent<Record<string, string>>(content, locale) || {};
  const fields = (content.fields as string[]) || ['name', 'email', 'message'];

  const fieldOptions = [
    { value: 'name', label: 'Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'subject', label: 'Subject' },
    { value: 'company', label: 'Company' },
    { value: 'message', label: 'Message' },
  ];

  const toggleField = (field: string) => {
    if (fields.includes(field)) {
      onUpdate({ ...content, fields: fields.filter((f) => f !== field) });
    } else {
      onUpdate({ ...content, fields: [...fields, field] });
    }
  };

  return (
    <div className="space-y-4">
      <Input
        label="Heading"
        value={localeContent.heading || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { heading: e.target.value }))
        }
        placeholder="Contact Us"
      />
      <Textarea
        label="Description"
        value={localeContent.description || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { description: e.target.value }))
        }
        placeholder="We'd love to hear from you"
        rows={2}
      />
      <Input
        label="Recipient Email"
        value={(content.recipientEmail as string) || ''}
        onChange={(e) => onUpdate({ ...content, recipientEmail: e.target.value })}
        placeholder="contact@example.com"
        type="email"
      />
      <Input
        label="Submit Button Text"
        value={localeContent.submitText || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { submitText: e.target.value }))
        }
        placeholder="Send Message"
      />
      <Input
        label="Success Message"
        value={localeContent.successMessage || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { successMessage: e.target.value }))
        }
        placeholder="Thank you! We'll be in touch soon."
      />

      <div className="space-y-2">
        <label className="text-sm font-medium">Form Fields</label>
        <div className="grid grid-cols-2 gap-2">
          {fieldOptions.map((option) => (
            <Checkbox
              key={option.value}
              label={option.label}
              checked={fields.includes(option.value)}
              onChange={() => toggleField(option.value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FLEET GALLERY BLOCK EDITOR
// ============================================================================
function FleetGalleryBlockEditor({
  content,
  locale,
  onUpdate,
}: {
  content: Record<string, unknown>;
  locale: string;
  onUpdate: (content: Record<string, unknown>) => void;
}) {
  const localeContent = getLocaleContent<Record<string, string>>(content, locale) || {};

  return (
    <div className="space-y-4">
      <Input
        label="Heading"
        value={localeContent.heading || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { heading: e.target.value }))
        }
        placeholder="Our Fleet"
      />
      <Input
        label="Subheading"
        value={localeContent.subheading || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { subheading: e.target.value }))
        }
        placeholder="Browse our available vehicles"
      />
      <Input
        label="Max Vehicles to Show"
        type="number"
        value={String((content.maxVehicles as number) || 6)}
        onChange={(e) => onUpdate({ ...content, maxVehicles: parseInt(e.target.value) || 6 })}
        min={1}
        max={12}
      />
      <Select
        label="Layout"
        value={(content.layout as string) || 'grid'}
        onChange={(e) => onUpdate({ ...content, layout: e.target.value })}
        options={[
          { value: 'grid', label: 'Grid' },
          { value: 'carousel', label: 'Carousel' },
        ]}
      />
      <Checkbox
        label="Show pricing"
        checked={(content.showPricing as boolean) !== false}
        onChange={(e) => onUpdate({ ...content, showPricing: e.target.checked })}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="CTA Button Text"
          value={localeContent.ctaText || ''}
          onChange={(e) =>
            onUpdate(updateLocaleContent(content, locale, { ctaText: e.target.value }))
          }
          placeholder="View All Vehicles"
        />
        <Input
          label="CTA Button Link"
          value={localeContent.ctaLink || ''}
          onChange={(e) =>
            onUpdate(updateLocaleContent(content, locale, { ctaLink: e.target.value }))
          }
          placeholder="/fleet"
        />
      </div>
    </div>
  );
}

// ============================================================================
// LOCATION MAP BLOCK EDITOR
// ============================================================================
function LocationMapBlockEditor({
  content,
  locale,
  onUpdate,
}: {
  content: Record<string, unknown>;
  locale: string;
  onUpdate: (content: Record<string, unknown>) => void;
}) {
  const localeContent = getLocaleContent<Record<string, string>>(content, locale) || {};

  return (
    <div className="space-y-4">
      <Input
        label="Heading"
        value={localeContent.heading || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { heading: e.target.value }))
        }
        placeholder="Our Locations"
      />
      <Input
        label="Subheading"
        value={localeContent.subheading || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { subheading: e.target.value }))
        }
        placeholder="Find a branch near you"
      />
      <Checkbox
        label="Show all branches"
        checked={(content.showAllBranches as boolean) !== false}
        onChange={(e) => onUpdate({ ...content, showAllBranches: e.target.checked })}
      />
      <Select
        label="Map Style"
        value={(content.mapStyle as string) || 'default'}
        onChange={(e) => onUpdate({ ...content, mapStyle: e.target.value })}
        options={[
          { value: 'default', label: 'Default' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'satellite', label: 'Satellite' },
        ]}
      />
      <Input
        label="Map Zoom Level"
        type="number"
        value={String((content.mapZoom as number) || 12)}
        onChange={(e) => onUpdate({ ...content, mapZoom: parseInt(e.target.value) || 12 })}
        min={1}
        max={20}
      />
    </div>
  );
}

// ============================================================================
// PRICING TABLE BLOCK EDITOR
// ============================================================================
function PricingTableBlockEditor({
  content,
  locale,
  onUpdate,
}: {
  content: Record<string, unknown>;
  locale: string;
  onUpdate: (content: Record<string, unknown>) => void;
}) {
  const localeContent = getLocaleContent<Record<string, string>>(content, locale) || {};

  return (
    <div className="space-y-4">
      <Input
        label="Heading"
        value={localeContent.heading || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { heading: e.target.value }))
        }
        placeholder="Our Pricing"
      />
      <Input
        label="Subheading"
        value={localeContent.subheading || ''}
        onChange={(e) =>
          onUpdate(updateLocaleContent(content, locale, { subheading: e.target.value }))
        }
        placeholder="Choose the plan that fits your needs"
      />
      <Checkbox
        label="Show pricing from vehicle categories"
        checked={(content.showFromCategoryPricing as boolean) || false}
        onChange={(e) => onUpdate({ ...content, showFromCategoryPricing: e.target.checked })}
      />
      <p className="text-sm text-muted-foreground">
        Custom pricing tiers can be configured in future updates.
      </p>
    </div>
  );
}

// ============================================================================
// FALLBACK EDITOR
// ============================================================================
function FallbackBlockEditor({ blockType }: { blockType: string }) {
  return (
    <div className="py-8 text-center text-muted-foreground">
      <p>Editor for &quot;{blockType}&quot; block is not yet available.</p>
      <p className="text-sm mt-2">Content editing will be added in a future update.</p>
    </div>
  );
}

// ============================================================================
// Check if block type has localizable content
// ============================================================================
function hasLocalizableContent(blockType: string): boolean {
  // These block types have localizable content that needs language tabs
  const localizableBlocks = [
    'hero',
    'text',
    'cta',
    'faq',
    'features',
    'text_image',
    'testimonials',
    'image',
    'contact_form',
    'fleet_gallery',
    'location_map',
    'pricing_table',
  ];
  return localizableBlocks.includes(blockType);
}

// ============================================================================
// MAIN BLOCK EDITOR COMPONENT
// ============================================================================
export function BlockEditor({ block, locale, onUpdate, onClose }: BlockEditorProps) {
  // Internal state for the editing locale (defaults to the page's current locale)
  const [editingLocale, setEditingLocale] = useState<Locale>(locale as Locale);

  const meta = blockMetadata[block.block_type];
  const IconComponent = blockIcons[meta?.icon || 'layout-template'] || FileText;

  const handleContentUpdate = (newContent: Record<string, unknown>) => {
    onUpdate(newContent as Json);
  };

  const content = block.content as Record<string, unknown>;
  const isLocalizable = hasLocalizableContent(block.block_type);

  // Render appropriate editor based on block type
  const renderEditor = () => {
    switch (block.block_type) {
      case 'hero':
        return <HeroBlockEditor content={content} locale={editingLocale} onUpdate={handleContentUpdate} />;
      case 'text':
        return <TextBlockEditor content={content} locale={editingLocale} onUpdate={handleContentUpdate} />;
      case 'cta':
        return <CTABlockEditor content={content} locale={editingLocale} onUpdate={handleContentUpdate} />;
      case 'faq':
        return <FAQBlockEditor content={content} locale={editingLocale} onUpdate={handleContentUpdate} />;
      case 'features':
        return <FeaturesBlockEditor content={content} locale={editingLocale} onUpdate={handleContentUpdate} />;
      case 'text_image':
        return <TextImageBlockEditor content={content} locale={editingLocale} onUpdate={handleContentUpdate} />;
      case 'testimonials':
        return <TestimonialsBlockEditor content={content} locale={editingLocale} onUpdate={handleContentUpdate} />;
      case 'divider':
        return <DividerBlockEditor content={content} onUpdate={handleContentUpdate} />;
      case 'spacer':
        return <SpacerBlockEditor content={content} onUpdate={handleContentUpdate} />;
      case 'html':
        return <HTMLBlockEditor content={content} onUpdate={handleContentUpdate} />;
      case 'image':
        return <ImageBlockEditor content={content} locale={editingLocale} onUpdate={handleContentUpdate} />;
      case 'video':
        return <VideoBlockEditor content={content} onUpdate={handleContentUpdate} />;
      case 'contact_form':
        return <ContactFormBlockEditor content={content} locale={editingLocale} onUpdate={handleContentUpdate} />;
      case 'fleet_gallery':
        return <FleetGalleryBlockEditor content={content} locale={editingLocale} onUpdate={handleContentUpdate} />;
      case 'location_map':
        return <LocationMapBlockEditor content={content} locale={editingLocale} onUpdate={handleContentUpdate} />;
      case 'pricing_table':
        return <PricingTableBlockEditor content={content} locale={editingLocale} onUpdate={handleContentUpdate} />;
      default:
        return <FallbackBlockEditor blockType={block.block_type} />;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">{meta?.name || block.block_type}</CardTitle>
              <p className="text-sm text-muted-foreground">{meta?.description}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {isLocalizable && (
          <LocaleTabs
            activeLocale={editingLocale}
            onLocaleChange={setEditingLocale}
            content={content}
          />
        )}
        {renderEditor()}
      </CardContent>
    </Card>
  );
}
