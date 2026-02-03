'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  RefreshCw,
  Check,
  AlertCircle,
  Clock,
  Percent,
  Ban,
} from 'lucide-react';
import type { CancellationPolicy } from '@/lib/booking/types';

interface CancellationPolicyFormProps {
  locale: string;
  initialData: CancellationPolicy;
}

export function CancellationPolicyForm({
  locale,
  initialData,
}: CancellationPolicyFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<CancellationPolicy>({
    allowCancellation: initialData.allowCancellation ?? true,
    freeCancellationHours: initialData.freeCancellationHours ?? 48,
    partialRefundHours: initialData.partialRefundHours ?? 24,
    partialRefundPercent: initialData.partialRefundPercent ?? 50,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (formData.partialRefundHours >= formData.freeCancellationHours) {
      setError('Partial refund cutoff must be before the free cancellation cutoff');
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/settings/cancellation-policy', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to save settings');
        }

        setSuccess(true);
        router.refresh();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    });
  };

  const handleNumberChange = (field: keyof CancellationPolicy, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setFormData((prev) => ({ ...prev, [field]: numValue }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Allow Cancellation Toggle */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Ban className="w-4 h-4" />
            Cancellation Availability
          </CardTitle>
          <CardDescription>
            Control whether customers can cancel bookings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-3">
            <Checkbox
              id="allowCancellation"
              checked={formData.allowCancellation}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, allowCancellation: !!checked }))
              }
            />
            <Label htmlFor="allowCancellation" className="cursor-pointer">
              Allow customers to cancel bookings
            </Label>
          </div>
          {!formData.allowCancellation && (
            <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-sm text-amber-700 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Cancellations will only be possible by staff through the admin panel.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Free Cancellation */}
      <Card className={!formData.allowCancellation ? 'opacity-50' : ''}>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Free Cancellation Window
          </CardTitle>
          <CardDescription>
            Time period before pickup when full refund is available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="freeCancellationHours">Hours before pickup</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <Input
                  id="freeCancellationHours"
                  type="number"
                  min="0"
                  max="720"
                  value={formData.freeCancellationHours}
                  onChange={(e) => handleNumberChange('freeCancellationHours', e.target.value)}
                  disabled={!formData.allowCancellation}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">hours</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Cancellations made more than {formData.freeCancellationHours} hours before pickup receive a full refund.
              </p>
            </div>

            {/* Preview */}
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-sm">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <Check className="w-4 h-4" />
                <span className="font-medium">100% Refund</span>
              </div>
              <p className="text-green-600 dark:text-green-400 mt-1">
                When cancelled {formData.freeCancellationHours}+ hours before pickup (
                {Math.round(formData.freeCancellationHours / 24 * 10) / 10} days)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partial Refund */}
      <Card className={!formData.allowCancellation ? 'opacity-50' : ''}>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Percent className="w-4 h-4" />
            Partial Refund Window
          </CardTitle>
          <CardDescription>
            Time period before pickup when partial refund is available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="partialRefundHours">Cutoff (hours before pickup)</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input
                    id="partialRefundHours"
                    type="number"
                    min="0"
                    max={formData.freeCancellationHours - 1}
                    value={formData.partialRefundHours}
                    onChange={(e) => handleNumberChange('partialRefundHours', e.target.value)}
                    disabled={!formData.allowCancellation}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">hours</span>
                </div>
              </div>
              <div>
                <Label htmlFor="partialRefundPercent">Refund percentage</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input
                    id="partialRefundPercent"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.partialRefundPercent}
                    onChange={(e) => handleNumberChange('partialRefundPercent', e.target.value)}
                    disabled={!formData.allowCancellation}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Cancellations made between {formData.partialRefundHours} and {formData.freeCancellationHours} hours before pickup receive a {formData.partialRefundPercent}% refund.
            </p>

            {/* Preview */}
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 text-sm">
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">{formData.partialRefundPercent}% Refund</span>
              </div>
              <p className="text-yellow-600 dark:text-yellow-400 mt-1">
                When cancelled {formData.partialRefundHours}-{formData.freeCancellationHours} hours before pickup
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No Refund Info */}
      <Card className={!formData.allowCancellation ? 'opacity-50' : ''}>
        <CardContent className="pt-6">
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-sm">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <Ban className="w-4 h-4" />
              <span className="font-medium">No Refund</span>
            </div>
            <p className="text-red-600 dark:text-red-400 mt-1">
              Cancellations made less than {formData.partialRefundHours} hours before pickup receive no refund.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Policy Summary */}
      <div className="p-4 rounded-lg border border-border bg-muted/30">
        <h4 className="font-medium text-sm mb-3">Policy Summary</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
            <span>
              <strong className="text-foreground">Full refund:</strong> Cancel {formData.freeCancellationHours}+ hours before pickup
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 shrink-0" />
            <span>
              <strong className="text-foreground">{formData.partialRefundPercent}% refund:</strong> Cancel {formData.partialRefundHours}-{formData.freeCancellationHours} hours before pickup
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
            <span>
              <strong className="text-foreground">No refund:</strong> Cancel less than {formData.partialRefundHours} hours before pickup
            </span>
          </li>
        </ul>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 text-sm flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          Settings saved successfully!
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
