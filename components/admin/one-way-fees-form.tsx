'use client';

/**
 * One-Way Fees Configuration Form
 *
 * Admin form for configuring one-way rental fees.
 * Supports flat, distance-based, and zone-based fee structures.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import {
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  MapPin,
  DollarSign,
  Route,
  Grid3X3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OneWayFeesConfig } from '@/lib/tenant/types';

// ============================================================================
// TYPES
// ============================================================================

interface Branch {
  id: string;
  name: string;
  city: string;
  status: string;
}

interface ZoneFee {
  fromBranchId?: string;
  fromZone?: string;
  toBranchId?: string;
  toZone?: string;
  fee: number;
}

export interface OneWayFeesFormProps {
  locale: string;
  initialData: OneWayFeesConfig;
  currency: string;
  branches: Branch[];
}

type FeeType = 'flat' | 'distance' | 'zone';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function FeeTypeCard({
  type,
  title,
  description,
  icon: Icon,
  isSelected,
  onSelect,
}: {
  type: FeeType;
  title: string;
  description: string;
  icon: typeof DollarSign;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left w-full',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('w-5 h-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
        <span className="font-medium">{title}</span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </button>
  );
}

function ZoneFeeRow({
  zoneFee,
  index,
  branches,
  currency,
  onUpdate,
  onRemove,
}: {
  zoneFee: ZoneFee;
  index: number;
  branches: Branch[];
  currency: string;
  onUpdate: (index: number, field: keyof ZoneFee, value: string | number) => void;
  onRemove: (index: number) => void;
}) {
  // Get unique cities
  const cities = [...new Set(branches.map((b) => b.city))].sort();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg">
      <div>
        <Label className="text-xs text-muted-foreground">From</Label>
        <select
          value={zoneFee.fromBranchId || zoneFee.fromZone || ''}
          onChange={(e) => {
            const value = e.target.value;
            // Check if it's a branch ID or city name
            const isBranch = branches.some((b) => b.id === value);
            if (isBranch) {
              onUpdate(index, 'fromBranchId', value);
              onUpdate(index, 'fromZone', '');
            } else {
              onUpdate(index, 'fromZone', value);
              onUpdate(index, 'fromBranchId', '');
            }
          }}
          className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select...</option>
          <optgroup label="Branches">
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Cities">
            {cities.map((city) => (
              <option key={`city-${city}`} value={city}>
                {city} (any branch)
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">To</Label>
        <select
          value={zoneFee.toBranchId || zoneFee.toZone || ''}
          onChange={(e) => {
            const value = e.target.value;
            const isBranch = branches.some((b) => b.id === value);
            if (isBranch) {
              onUpdate(index, 'toBranchId', value);
              onUpdate(index, 'toZone', '');
            } else {
              onUpdate(index, 'toZone', value);
              onUpdate(index, 'toBranchId', '');
            }
          }}
          className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select...</option>
          <optgroup label="Branches">
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Cities">
            {cities.map((city) => (
              <option key={`city-${city}`} value={city}>
                {city} (any branch)
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Fee ({currency})</Label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={zoneFee.fee}
          onChange={(e) => onUpdate(index, 'fee', parseFloat(e.target.value) || 0)}
          className="h-9"
        />
      </div>

      <div className="flex items-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OneWayFeesForm({
  locale,
  initialData,
  currency,
  branches,
}: OneWayFeesFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [enabled, setEnabled] = useState(initialData.enabled);
  const [feeType, setFeeType] = useState<FeeType>(initialData.type);
  const [flatFee, setFlatFee] = useState(initialData.flatFee ?? 25);
  const [perKmFee, setPerKmFee] = useState(initialData.perKmFee ?? 0.5);
  const [minFee, setMinFee] = useState(initialData.minFee ?? 15);
  const [maxFee, setMaxFee] = useState(initialData.maxFee ?? 200);
  const [defaultFee, setDefaultFee] = useState(initialData.defaultFee ?? 50);
  const [zoneFees, setZoneFees] = useState<ZoneFee[]>(initialData.zoneFees || []);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Add zone fee
  const addZoneFee = () => {
    setZoneFees([...zoneFees, { fee: 0 }]);
  };

  // Update zone fee
  const updateZoneFee = (index: number, field: keyof ZoneFee, value: string | number) => {
    const updated = [...zoneFees];
    updated[index] = { ...updated[index], [field]: value };
    setZoneFees(updated);
  };

  // Remove zone fee
  const removeZoneFee = (index: number) => {
    setZoneFees(zoneFees.filter((_, i) => i !== index));
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const data: OneWayFeesConfig = {
      enabled,
      type: feeType,
      flatFee: feeType === 'flat' ? flatFee : undefined,
      perKmFee: feeType === 'distance' ? perKmFee : undefined,
      minFee: feeType === 'distance' ? minFee : undefined,
      maxFee: feeType === 'distance' ? maxFee : undefined,
      defaultFee: feeType === 'zone' ? defaultFee : undefined,
      zoneFees: feeType === 'zone' ? zoneFees.filter((z) => z.fee > 0) : undefined,
    };

    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/settings/one-way-fees', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to save settings');
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div>
          <p className="font-medium">Enable One-Way Rentals</p>
          <p className="text-sm text-muted-foreground">
            Allow customers to return vehicles at different branches
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
        </label>
      </div>

      {enabled && (
        <>
          {/* Fee Type Selection */}
          <div className="space-y-3">
            <Label>Fee Structure</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FeeTypeCard
                type="flat"
                title="Flat Fee"
                description="Same fee for all routes"
                icon={DollarSign}
                isSelected={feeType === 'flat'}
                onSelect={() => setFeeType('flat')}
              />
              <FeeTypeCard
                type="distance"
                title="Distance-Based"
                description="Fee based on km between branches"
                icon={Route}
                isSelected={feeType === 'distance'}
                onSelect={() => setFeeType('distance')}
              />
              <FeeTypeCard
                type="zone"
                title="Custom Routes"
                description="Set fees for specific routes"
                icon={Grid3X3}
                isSelected={feeType === 'zone'}
                onSelect={() => setFeeType('zone')}
              />
            </div>
          </div>

          {/* Flat Fee Configuration */}
          {feeType === 'flat' && (
            <div className="space-y-4 p-4 border border-border rounded-lg">
              <h3 className="font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Flat Fee Configuration
              </h3>
              <div className="max-w-xs">
                <Label htmlFor="flatFee">One-Way Fee ({currency})</Label>
                <Input
                  id="flatFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={flatFee}
                  onChange={(e) => setFlatFee(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This fee will be charged for all one-way rentals
                </p>
              </div>
            </div>
          )}

          {/* Distance-Based Fee Configuration */}
          {feeType === 'distance' && (
            <div className="space-y-4 p-4 border border-border rounded-lg">
              <h3 className="font-medium flex items-center gap-2">
                <Route className="w-4 h-4" />
                Distance-Based Fee Configuration
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="perKmFee">Fee per km ({currency})</Label>
                  <Input
                    id="perKmFee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={perKmFee}
                    onChange={(e) => setPerKmFee(parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="minFee">Minimum Fee ({currency})</Label>
                  <Input
                    id="minFee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={minFee}
                    onChange={(e) => setMinFee(parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="maxFee">Maximum Fee ({currency})</Label>
                  <Input
                    id="maxFee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={maxFee}
                    onChange={(e) => setMaxFee(parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Fee = distance (km) x {perKmFee} {currency}, minimum {minFee} {currency},
                maximum {maxFee} {currency}
              </p>
            </div>
          )}

          {/* Zone/Custom Route Fee Configuration */}
          {feeType === 'zone' && (
            <div className="space-y-4 p-4 border border-border rounded-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4" />
                  Custom Route Fees
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addZoneFee}
                  disabled={branches.length < 2}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Route
                </Button>
              </div>

              {branches.length < 2 && (
                <Alert variant="warning">
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    You need at least 2 active branches to configure custom routes.
                  </span>
                </Alert>
              )}

              {/* Default fee for unlisted routes */}
              <div className="max-w-xs">
                <Label htmlFor="defaultFee">Default Fee ({currency})</Label>
                <Input
                  id="defaultFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={defaultFee}
                  onChange={(e) => setDefaultFee(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Fee for routes not listed below
                </p>
              </div>

              {/* Zone fee list */}
              {zoneFees.length > 0 && (
                <div className="space-y-2">
                  <Label>Route-Specific Fees</Label>
                  {zoneFees.map((zoneFee, index) => (
                    <ZoneFeeRow
                      key={index}
                      zoneFee={zoneFee}
                      index={index}
                      branches={branches}
                      currency={currency}
                      onUpdate={updateZoneFee}
                      onRemove={removeZoneFee}
                    />
                  ))}
                </div>
              )}

              {zoneFees.length === 0 && branches.length >= 2 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No custom routes configured. Click &quot;Add Route&quot; to set specific fees.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Error/Success Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </Alert>
      )}

      {success && (
        <Alert variant="default" className="bg-green-500/10 border-green-500/20 text-green-700">
          <CheckCircle className="w-4 h-4" />
          <span>Settings saved successfully!</span>
        </Alert>
      )}

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default OneWayFeesForm;
