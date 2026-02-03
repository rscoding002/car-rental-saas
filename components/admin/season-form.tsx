'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import {
  ArrowLeft,
  CalendarRange,
  Save,
  Trash2,
  Loader2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Hash,
} from 'lucide-react';
import type { SeasonData, RuleStatus } from '@/lib/pricing/types';
import { formatMultiplier } from '@/lib/pricing/season-queries';

interface SeasonFormProps {
  locale: string;
  season?: SeasonData;
  mode: 'create' | 'edit';
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

// Preset multipliers
const MULTIPLIER_PRESETS = [
  { value: 0.8, label: '-20%', description: 'Low season discount' },
  { value: 0.9, label: '-10%', description: 'Slight discount' },
  { value: 1.0, label: 'No change', description: 'Standard pricing' },
  { value: 1.1, label: '+10%', description: 'Slight increase' },
  { value: 1.25, label: '+25%', description: 'Moderate increase' },
  { value: 1.5, label: '+50%', description: 'High season' },
  { value: 2.0, label: '+100%', description: 'Peak season' },
];

export function SeasonForm({ locale, season, mode }: SeasonFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [name, setName] = useState(season?.name || '');
  const [startDate, setStartDate] = useState(season?.startDate || '');
  const [endDate, setEndDate] = useState(season?.endDate || '');
  const [multiplier, setMultiplier] = useState(season?.multiplier?.toString() || '1');
  const [priority, setPriority] = useState(season?.priority?.toString() || '0');
  const [status, setStatus] = useState<RuleStatus>(season?.status || 'active');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      setError('Please enter a season name');
      return;
    }
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('End date must be after start date');
      return;
    }
    const mult = parseFloat(multiplier);
    if (isNaN(mult) || mult <= 0 || mult > 10) {
      setError('Multiplier must be between 0 and 10');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
      startDate,
      endDate,
      multiplier: mult,
      priority: parseInt(priority, 10) || 0,
      status,
    };

    try {
      const url = mode === 'create'
        ? '/api/admin/seasons'
        : `/api/admin/seasons/${season!.id}`;

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${mode} season`);
      }

      startTransition(() => {
        router.push(`/${locale}/admin/pricing/seasons`);
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${mode} season`);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!season) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/seasons/${season.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete season');
      }

      startTransition(() => {
        router.push(`/${locale}/admin/pricing/seasons`);
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete season');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const isLoading = isSubmitting || isPending;
  const mult = parseFloat(multiplier) || 1;
  const isIncrease = mult >= 1;

  return (
    <form onSubmit={handleSubmit} className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/${locale}/admin/pricing/seasons`}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">
            {mode === 'create' ? 'Add Season' : 'Edit Season'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'create'
              ? 'Create a new seasonal pricing period'
              : `Editing: ${season?.name}`}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="space-y-6">
        {/* Season Name */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <CalendarRange className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Season Details</CardTitle>
                <CardDescription>Name and identification</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Input
              label="Season Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Summer Peak, Christmas Holiday, Off Season"
              required
              autoFocus={mode === 'create'}
            />
          </CardContent>
        </Card>

        {/* Date Range */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Date Range</CardTitle>
                <CardDescription>When this season applies</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              <Input
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            {startDate && endDate && new Date(startDate) <= new Date(endDate) && (
              <p className="text-sm text-muted-foreground mt-2">
                Duration: {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
              </p>
            )}
          </CardContent>
        </Card>

        {/* Multiplier */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isIncrease ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'}`}>
                {isIncrease ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
              <div>
                <CardTitle>Price Multiplier</CardTitle>
                <CardDescription>Adjust prices during this season</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preset buttons */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Quick Select</label>
              <div className="flex flex-wrap gap-2">
                {MULTIPLIER_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setMultiplier(preset.value.toString())}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                      parseFloat(multiplier) === preset.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted'
                    }`}
                    title={preset.description}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom multiplier input */}
            <Input
              label="Custom Multiplier"
              type="number"
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
              placeholder="1.0"
              min="0.01"
              max="10"
              step="0.01"
              required
              hint="1.0 = no change, 1.5 = 50% increase, 0.8 = 20% discount"
            />

            {/* Preview */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {isIncrease ? (
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-green-500" />
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Price Effect</p>
                  <p className={`text-lg font-semibold ${isIncrease ? 'text-orange-600' : 'text-green-600'}`}>
                    {formatMultiplier(mult)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                A base rate of €50/day will become €{(50 * mult).toFixed(2)}/day during this season.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Priority & Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Hash className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Priority & Status</CardTitle>
                <CardDescription>Overlap handling and visibility</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Priority"
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                min="0"
                hint="Higher priority wins when seasons overlap (0 = default)"
              />
              <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as RuleStatus)}
                options={STATUS_OPTIONS}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Inactive seasons will not affect pricing calculations.
            </p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-4">
          {mode === 'edit' && (
            <div>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Delete this season?</span>
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
                  Delete Season
                </Button>
              )}
            </div>
          )}

          <div className="flex gap-3 sm:ml-auto">
            <Link href={`/${locale}/admin/pricing/seasons`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading} isLoading={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {mode === 'create' ? 'Create Season' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
