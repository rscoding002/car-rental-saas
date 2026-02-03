'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import {
  ArrowLeft,
  DollarSign,
  Save,
  Trash2,
  Loader2,
  Tag,
  Car,
  Clock,
  Calendar,
  CalendarDays,
  CalendarRange,
} from 'lucide-react';
import type { PricingRuleWithRelations, RuleStatus } from '@/lib/pricing/types';
import type { LocalizedString, RateType } from '@/lib/supabase/types';

interface PricingRuleFormProps {
  locale: string;
  rule?: PricingRuleWithRelations;
  mode: 'create' | 'edit';
  categories: Array<{ id: string; name: LocalizedString }>;
  vehicles: Array<{ id: string; make: string; model: string; year: number }>;
}

const RATE_TYPE_OPTIONS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const SCOPE_OPTIONS = [
  { value: 'category', label: 'Category' },
  { value: 'vehicle', label: 'Vehicle' },
];

const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'GBP', label: 'GBP (£)' },
];

// Rate type icons
const rateTypeIcons: Record<RateType, typeof Clock> = {
  hourly: Clock,
  daily: Calendar,
  weekly: CalendarDays,
  monthly: CalendarRange,
};

export function PricingRuleForm({ locale, rule, mode, categories, vehicles }: PricingRuleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Determine initial scope
  const initialScope = rule?.categoryId ? 'category' : rule?.vehicleId ? 'vehicle' : 'category';

  // Form state
  const [scope, setScope] = useState<'category' | 'vehicle'>(initialScope);
  const [categoryId, setCategoryId] = useState(rule?.categoryId || '');
  const [vehicleId, setVehicleId] = useState(rule?.vehicleId || '');
  const [rateType, setRateType] = useState<RateType>(rule?.rateType || 'daily');
  const [amount, setAmount] = useState(rule?.amount?.toString() || '');
  const [currency, setCurrency] = useState(rule?.currency || 'EUR');
  const [minDuration, setMinDuration] = useState(rule?.minDuration?.toString() || '');
  const [maxDuration, setMaxDuration] = useState(rule?.maxDuration?.toString() || '');
  const [status, setStatus] = useState<RuleStatus>(rule?.status || 'active');

  // Reset target ID when scope changes
  useEffect(() => {
    if (mode === 'create') {
      if (scope === 'category') {
        setVehicleId('');
      } else {
        setCategoryId('');
      }
    }
  }, [scope, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (scope === 'category' && !categoryId) {
      setError('Please select a category');
      return;
    }
    if (scope === 'vehicle' && !vehicleId) {
      setError('Please select a vehicle');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: Record<string, unknown> = {
      rateType,
      amount: parseFloat(amount),
      currency,
      status,
    };

    // Only set categoryId or vehicleId for create mode
    if (mode === 'create') {
      if (scope === 'category') {
        payload.categoryId = categoryId;
      } else {
        payload.vehicleId = vehicleId;
      }
    }

    // Optional duration fields
    if (minDuration) {
      payload.minDuration = parseInt(minDuration, 10);
    }
    if (maxDuration) {
      payload.maxDuration = parseInt(maxDuration, 10);
    }

    try {
      const url = mode === 'create'
        ? '/api/admin/pricing'
        : `/api/admin/pricing/${rule!.id}`;

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${mode} pricing rule`);
      }

      startTransition(() => {
        router.push(`/${locale}/admin/pricing`);
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${mode} pricing rule`);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!rule) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/pricing/${rule.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete pricing rule');
      }

      startTransition(() => {
        router.push(`/${locale}/admin/pricing`);
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete pricing rule');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const isLoading = isSubmitting || isPending;

  // Get rate type icon
  const RateIcon = rateTypeIcons[rateType];

  // Format display for selected target
  const getTargetDisplay = () => {
    if (mode === 'edit') {
      if (rule?.category) {
        return rule.category.name[locale as keyof LocalizedString] || rule.category.name.en || 'Unknown Category';
      }
      if (rule?.vehicle) {
        return `${rule.vehicle.make} ${rule.vehicle.model} (${rule.vehicle.year})`;
      }
    }
    return null;
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/${locale}/admin/pricing`}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">
            {mode === 'create' ? 'Add Pricing Rule' : 'Edit Pricing Rule'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'create'
              ? 'Set a rate for a category or vehicle'
              : `Editing rate for: ${getTargetDisplay()}`}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="space-y-6">
        {/* Scope & Target Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                {scope === 'category' ? <Tag className="w-5 h-5" /> : <Car className="w-5 h-5" />}
              </div>
              <div>
                <CardTitle>Apply To</CardTitle>
                <CardDescription>
                  {mode === 'edit'
                    ? 'The target cannot be changed after creation'
                    : 'Choose whether to apply this rate to a category or specific vehicle'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode === 'create' ? (
              <>
                {/* Scope selection */}
                <div className="grid grid-cols-2 gap-3">
                  {SCOPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setScope(option.value as 'category' | 'vehicle')}
                      className={`p-4 rounded-lg border-2 text-left transition-colors ${
                        scope === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {option.value === 'category' ? (
                          <Tag className="w-5 h-5" />
                        ) : (
                          <Car className="w-5 h-5" />
                        )}
                        <span className="font-medium">{option.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {option.value === 'category'
                          ? 'Apply to all vehicles in a category'
                          : 'Override rate for a specific vehicle'}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Target selection */}
                {scope === 'category' ? (
                  <Select
                    label="Category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    options={[
                      { value: '', label: 'Select a category...' },
                      ...categories.map((c) => ({
                        value: c.id,
                        label: c.name[locale as keyof LocalizedString] || c.name.en || 'Unnamed',
                      })),
                    ]}
                    required
                  />
                ) : (
                  <Select
                    label="Vehicle"
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    options={[
                      { value: '', label: 'Select a vehicle...' },
                      ...vehicles.map((v) => ({
                        value: v.id,
                        label: `${v.make} ${v.model} (${v.year})`,
                      })),
                    ]}
                    required
                  />
                )}
              </>
            ) : (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {rule?.categoryId ? (
                    <Tag className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Car className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {rule?.categoryId ? 'Category Rule' : 'Vehicle Rule'}
                    </p>
                    <p className="font-medium">{getTargetDisplay()}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rate Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Rate Details</CardTitle>
                <CardDescription>Set the rate type and amount</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Rate Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Rate Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {RATE_TYPE_OPTIONS.map((option) => {
                  const Icon = rateTypeIcons[option.value as RateType];
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRateType(option.value as RateType)}
                      className={`p-3 rounded-lg border-2 text-center transition-colors ${
                        rateType === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <Icon className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount and Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
                leftIcon={<DollarSign className="w-4 h-4" />}
              />
              <Select
                label="Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={CURRENCY_OPTIONS}
              />
            </div>

            {/* Amount preview */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <RateIcon className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Rate Preview</p>
                  <p className="text-lg font-semibold">
                    {amount ? new Intl.NumberFormat(locale, {
                      style: 'currency',
                      currency: currency,
                    }).format(parseFloat(amount)) : '—'}{' '}
                    <span className="text-sm font-normal text-muted-foreground">
                      per {rateType === 'hourly' ? 'hour' : rateType === 'daily' ? 'day' : rateType === 'weekly' ? 'week' : 'month'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Duration Limits (Optional) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Duration Limits</CardTitle>
                <CardDescription>Optional: Set when this rate applies based on rental duration</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={`Minimum Duration (${rateType === 'hourly' ? 'hours' : 'days'})`}
                type="number"
                value={minDuration}
                onChange={(e) => setMinDuration(e.target.value)}
                placeholder="No minimum"
                min="1"
                hint="Leave empty for no minimum"
              />
              <Input
                label={`Maximum Duration (${rateType === 'hourly' ? 'hours' : 'days'})`}
                type="number"
                value={maxDuration}
                onChange={(e) => setMaxDuration(e.target.value)}
                placeholder="No maximum"
                min="1"
                hint="Leave empty for no maximum"
              />
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Status</CardTitle>
                <CardDescription>Enable or disable this pricing rule</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as RuleStatus)}
              options={STATUS_OPTIONS}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Inactive rules will not be applied to new bookings.
            </p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-4">
          {mode === 'edit' && (
            <div>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Delete this rule?</span>
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
                  Delete Rule
                </Button>
              )}
            </div>
          )}

          <div className="flex gap-3 sm:ml-auto">
            <Link href={`/${locale}/admin/pricing`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading} isLoading={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {mode === 'create' ? 'Create Rule' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
