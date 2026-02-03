'use client';

/**
 * Add-on Create/Edit Form
 *
 * Admin form for creating and editing rental add-ons.
 * Mobile-first responsive design.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import {
  Save,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Package,
  Calendar,
  Receipt,
  Zap,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AddonData, PriceType, RuleStatus } from '@/lib/pricing/types';

// ============================================================================
// TYPES
// ============================================================================

export interface AddonFormProps {
  locale: string;
  mode: 'create' | 'edit';
  addon?: AddonData;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRICE_TYPES: Array<{
  value: PriceType;
  label: string;
  description: string;
  icon: typeof Calendar;
}> = [
  {
    value: 'per_day',
    label: 'Per Day',
    description: 'Price multiplied by rental days',
    icon: Calendar,
  },
  {
    value: 'per_rental',
    label: 'Per Rental',
    description: 'Flat fee for the entire rental',
    icon: Receipt,
  },
  {
    value: 'one_time',
    label: 'One-Time',
    description: 'Single charge (same as per rental)',
    icon: Zap,
  },
];

const LOCALES = ['en', 'lt', 'ru'] as const;
const LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  lt: 'Lithuanian',
  ru: 'Russian',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AddonForm({ locale, mode, addon }: AddonFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [names, setNames] = useState<Record<string, string>>({
    en: addon?.name?.en || '',
    lt: addon?.name?.lt || '',
    ru: addon?.name?.ru || '',
  });
  const [descriptions, setDescriptions] = useState<Record<string, string>>({
    en: addon?.description?.en || '',
    lt: addon?.description?.lt || '',
    ru: addon?.description?.ru || '',
  });
  const [price, setPrice] = useState(addon?.price?.toString() || '');
  const [priceType, setPriceType] = useState<PriceType>(addon?.priceType || 'per_day');
  const [maxQuantity, setMaxQuantity] = useState(addon?.maxQuantity?.toString() || '1');
  const [imageUrl, setImageUrl] = useState(addon?.imageUrl || '');
  const [status, setStatus] = useState<RuleStatus>(addon?.status || 'active');

  // UI state
  const [activeLocale, setActiveLocale] = useState<string>(locale);
  const [error, setError] = useState<string | null>(null);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate at least one name
    const hasName = Object.values(names).some((n) => n.trim().length > 0);
    if (!hasName) {
      setError('Please enter a name in at least one language.');
      return;
    }

    // Validate price
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Please enter a valid price.');
      return;
    }

    const data = {
      name: names,
      description: descriptions,
      price: priceNum,
      priceType,
      maxQuantity: parseInt(maxQuantity) || 1,
      imageUrl: imageUrl || undefined,
      status,
    };

    startTransition(async () => {
      try {
        const url = mode === 'create'
          ? '/api/admin/addons'
          : `/api/admin/addons/${addon?.id}`;

        const response = await fetch(url, {
          method: mode === 'create' ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to save add-on');
        }

        router.push(`/${locale}/admin/pricing/addons`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    });
  };

  // Handle delete
  const handleDelete = async () => {
    if (!addon) return;

    if (!confirm('Are you sure you want to delete this add-on? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/addons/${addon.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete add-on');
      }

      router.push(`/${locale}/admin/pricing/addons`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/${locale}/admin/pricing/addons`}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {mode === 'create' ? 'New Add-on' : 'Edit Add-on'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'create'
              ? 'Create a new rental extra'
              : 'Update add-on details'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name (Localized) */}
        <div className="bg-card rounded-lg border border-border p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-medium">Add-on Name</h2>
          </div>

          {/* Language tabs */}
          <div className="flex gap-1 mb-4 border-b border-border">
            {LOCALES.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setActiveLocale(loc)}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                  activeLocale === loc
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {LOCALE_LABELS[loc]}
              </button>
            ))}
          </div>

          {/* Name input for active locale */}
          <div className="space-y-4">
            <div>
              <Label htmlFor={`name-${activeLocale}`}>
                Name ({LOCALE_LABELS[activeLocale]})
                {activeLocale === locale && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Input
                id={`name-${activeLocale}`}
                value={names[activeLocale] || ''}
                onChange={(e) =>
                  setNames({ ...names, [activeLocale]: e.target.value })
                }
                placeholder={`e.g., GPS Navigation`}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor={`description-${activeLocale}`}>
                Description ({LOCALE_LABELS[activeLocale]})
              </Label>
              <Textarea
                id={`description-${activeLocale}`}
                value={descriptions[activeLocale] || ''}
                onChange={(e) =>
                  setDescriptions({ ...descriptions, [activeLocale]: e.target.value })
                }
                placeholder="Optional description for customers"
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-card rounded-lg border border-border p-4 md:p-6">
          <h2 className="font-medium mb-4">Pricing</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="price">Price (EUR) <span className="text-destructive">*</span></Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="maxQuantity">Max Quantity</Label>
              <Input
                id="maxQuantity"
                type="number"
                min="1"
                max="100"
                value={maxQuantity}
                onChange={(e) => setMaxQuantity(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum per booking (e.g., 4 child seats)
              </p>
            </div>
          </div>

          {/* Price Type Selection */}
          <Label className="mb-3 block">Price Type</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PRICE_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = priceType === type.value;

              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setPriceType(type.value)}
                  className={cn(
                    'flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={cn('w-4 h-4', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                    <span className="font-medium">{type.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Image & Status */}
        <div className="bg-card rounded-lg border border-border p-4 md:p-6">
          <h2 className="font-medium mb-4">Display Settings</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional product image
              </p>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as RuleStatus)}
                className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-4 border-t border-border">
          {mode === 'edit' && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || isPending}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          )}

          <div className="flex gap-3 sm:ml-auto">
            <Link href={`/${locale}/admin/pricing/addons`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isPending || isDeleting}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {mode === 'create' ? 'Create Add-on' : 'Save Changes'}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default AddonForm;
