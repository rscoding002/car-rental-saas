'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Car,
  Settings2,
  Fuel,
  MapPin,
  Save,
  Trash2,
  Loader2,
  Users,
  DoorOpen,
  Briefcase,
  FileText,
  Tag,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { VehiclePhotoUpload } from './vehicle-photo-upload';
import type { Vehicle, VehicleStatus, Transmission, FuelType, LocalizedString, VehiclePhoto } from '@/lib/supabase/types';
import {
  VEHICLE_STATUS_OPTIONS,
  TRANSMISSION_OPTIONS,
  FUEL_TYPE_OPTIONS,
  COMMON_FEATURES,
} from '@/lib/fleet/types';

interface Category {
  id: string;
  name: LocalizedString;
  status: string;
}

interface Branch {
  id: string;
  name: string;
  city: string;
  status: string;
}

interface VehicleFormProps {
  locale: string;
  vehicle?: Vehicle;
  mode: 'create' | 'edit';
}

export function VehicleForm({ locale, vehicle, mode }: VehicleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoadingRefs, setIsLoadingRefs] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Form state - Basic Info
  const [make, setMake] = useState(vehicle?.make || '');
  const [model, setModel] = useState(vehicle?.model || '');
  const [year, setYear] = useState(vehicle?.year?.toString() || new Date().getFullYear().toString());
  const [licensePlate, setLicensePlate] = useState(vehicle?.license_plate || '');
  const [vin, setVin] = useState(vehicle?.vin || '');
  const [color, setColor] = useState(vehicle?.color || '');
  const [odometer, setOdometer] = useState(vehicle?.odometer?.toString() || '');
  const [status, setStatus] = useState<VehicleStatus>(vehicle?.status || 'available');

  // Form state - Specs
  const [transmission, setTransmission] = useState<Transmission>(vehicle?.transmission || 'automatic');
  const [fuelType, setFuelType] = useState<FuelType>(vehicle?.fuel_type || 'petrol');
  const [seats, setSeats] = useState(vehicle?.seats?.toString() || '5');
  const [doors, setDoors] = useState(vehicle?.doors?.toString() || '4');
  const [luggageCapacity, setLuggageCapacity] = useState(vehicle?.luggage_capacity?.toString() || '');

  // Form state - Category & Branch
  const [categoryId, setCategoryId] = useState(vehicle?.category_id || '');
  const [branchId, setBranchId] = useState(vehicle?.branch_id || '');

  // Form state - Features
  const [features, setFeatures] = useState<string[]>(vehicle?.features || []);
  const [newFeature, setNewFeature] = useState('');

  // Form state - Photos
  const [photos, setPhotos] = useState<VehiclePhoto[]>(vehicle?.photos || []);

  // Form state - Description (localized)
  const [descriptionEn, setDescriptionEn] = useState(vehicle?.description?.en || '');
  const [descriptionLt, setDescriptionLt] = useState(vehicle?.description?.lt || '');
  const [descriptionRu, setDescriptionRu] = useState(vehicle?.description?.ru || '');
  const [activeDescTab, setActiveDescTab] = useState<'en' | 'lt' | 'ru'>('en');

  // Load categories and branches
  useEffect(() => {
    async function loadReferenceData() {
      setIsLoadingRefs(true);
      const supabase = createClient();

      // Get current user's tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_id', user.id)
        .single();

      if (!profile?.tenant_id) return;

      setTenantId(profile.tenant_id);

      const [categoriesResult, branchesResult] = await Promise.all([
        supabase
          .from('vehicle_categories')
          .select('id, name, status')
          .eq('tenant_id', profile.tenant_id)
          .eq('status', 'active')
          .order('sort_order'),
        supabase
          .from('branches')
          .select('id, name, city, status')
          .eq('tenant_id', profile.tenant_id)
          .eq('status', 'active')
          .order('name'),
      ]);

      setCategories(categoriesResult.data || []);
      setBranches(branchesResult.data || []);
      setIsLoadingRefs(false);

      // Set defaults if creating
      if (mode === 'create') {
        if (categoriesResult.data?.length && !categoryId) {
          setCategoryId(categoriesResult.data[0].id);
        }
        if (branchesResult.data?.length && !branchId) {
          setBranchId(branchesResult.data[0].id);
        }
      }
    }

    loadReferenceData();
  }, [mode, categoryId, branchId]);

  // Feature management
  const addFeature = (feature: string) => {
    const trimmed = feature.trim();
    if (trimmed && !features.includes(trimmed)) {
      setFeatures([...features, trimmed]);
    }
    setNewFeature('');
  };

  const removeFeature = (feature: string) => {
    setFeatures(features.filter(f => f !== feature));
  };

  const handleAddFeatureKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addFeature(newFeature);
    }
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!make.trim()) {
      setError('Make is required');
      return;
    }
    if (!model.trim()) {
      setError('Model is required');
      return;
    }
    if (!licensePlate.trim()) {
      setError('License plate is required');
      return;
    }
    if (!categoryId) {
      setError('Category is required');
      return;
    }
    if (!branchId) {
      setError('Branch is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      make: make.trim(),
      model: model.trim(),
      year: parseInt(year, 10) || new Date().getFullYear(),
      license_plate: licensePlate.trim().toUpperCase(),
      vin: vin.trim() || null,
      color: color.trim() || null,
      odometer: odometer ? parseInt(odometer, 10) : null,
      status,
      transmission,
      fuel_type: fuelType,
      seats: parseInt(seats, 10) || 5,
      doors: parseInt(doors, 10) || 4,
      luggage_capacity: luggageCapacity ? parseInt(luggageCapacity, 10) : null,
      category_id: categoryId,
      branch_id: branchId,
      features,
      description: {
        en: descriptionEn.trim(),
        lt: descriptionLt.trim(),
        ru: descriptionRu.trim(),
      },
      photos,
    };

    try {
      const url = mode === 'create'
        ? '/api/admin/fleet'
        : `/api/admin/fleet/${vehicle!.id}`;

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${mode} vehicle`);
      }

      startTransition(() => {
        router.push(`/${locale}/admin/fleet`);
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${mode} vehicle`);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!vehicle) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/fleet/${vehicle.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete vehicle');
      }

      startTransition(() => {
        router.push(`/${locale}/admin/fleet`);
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete vehicle');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const isLoading = isSubmitting || isPending;

  // Generate year options
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 30 }, (_, i) => {
    const y = currentYear + 1 - i;
    return { value: y.toString(), label: y.toString() };
  });

  return (
    <form onSubmit={handleSubmit} className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/${locale}/admin/fleet`}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">
            {mode === 'create' ? 'Add New Vehicle' : 'Edit Vehicle'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'create'
              ? 'Add a new vehicle to your fleet'
              : `Editing: ${vehicle?.year} ${vehicle?.make} ${vehicle?.model}`}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Vehicle identification and details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                label="Make"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="e.g., Toyota"
                required
                autoFocus
              />
              <Input
                label="Model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g., Camry"
                required
              />
              <Select
                label="Year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                options={yearOptions}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                label="License Plate"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                placeholder="e.g., ABC 123"
                required
              />
              <Input
                label="VIN"
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                placeholder="Vehicle Identification Number"
                maxLength={17}
                hint="Optional - 17 characters"
              />
              <Input
                label="Color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g., Silver"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Odometer (km)"
                type="number"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                placeholder="e.g., 50000"
                min="0"
              />
              <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                options={VEHICLE_STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Specifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Settings2 className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Specifications</CardTitle>
                <CardDescription>Vehicle technical details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <Select
                label="Transmission"
                value={transmission}
                onChange={(e) => setTransmission(e.target.value as Transmission)}
                options={TRANSMISSION_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
              />
              <Select
                label="Fuel Type"
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value as FuelType)}
                options={FUEL_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
              />
              <Input
                label="Seats"
                type="number"
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                min="1"
                max="50"
                leftIcon={<Users className="w-4 h-4" />}
              />
              <Input
                label="Doors"
                type="number"
                value={doors}
                onChange={(e) => setDoors(e.target.value)}
                min="1"
                max="10"
                leftIcon={<DoorOpen className="w-4 h-4" />}
              />
              <Input
                label="Luggage"
                type="number"
                value={luggageCapacity}
                onChange={(e) => setLuggageCapacity(e.target.value)}
                placeholder="Bags"
                min="0"
                leftIcon={<Briefcase className="w-4 h-4" />}
              />
            </div>
          </CardContent>
        </Card>

        {/* Category & Branch */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Assignment</CardTitle>
                <CardDescription>Category and branch assignment</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                options={categories.map(c => ({
                  value: c.id,
                  label: c.name[locale as keyof typeof c.name] || c.name.en || 'Unnamed',
                }))}
                disabled={isLoadingRefs}
              />
              <Select
                label="Branch"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                options={branches.map(b => ({
                  value: b.id,
                  label: `${b.name} (${b.city})`,
                }))}
                disabled={isLoadingRefs}
              />
            </div>
            {(categories.length === 0 || branches.length === 0) && !isLoadingRefs && (
              <Alert>
                {categories.length === 0 && 'No categories available. '}
                {branches.length === 0 && 'No branches available. '}
                Please create them first.
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Features</CardTitle>
                <CardDescription>Vehicle amenities and equipment</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current features */}
            {features.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {features.map((feature) => (
                  <Badge key={feature} variant="secondary" className="gap-1 pr-1">
                    {feature}
                    <button
                      type="button"
                      onClick={() => removeFeature(feature)}
                      className="ml-1 rounded-full hover:bg-muted p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Add new feature */}
            <div className="flex gap-2">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyDown={handleAddFeatureKeyDown}
                placeholder="Add a feature..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addFeature(newFeature)}
                disabled={!newFeature.trim()}
              >
                Add
              </Button>
            </div>

            {/* Common features suggestions */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Quick add:</p>
              <div className="flex flex-wrap gap-1">
                {COMMON_FEATURES.filter(f => !features.includes(f)).slice(0, 10).map((feature) => (
                  <button
                    key={feature}
                    type="button"
                    onClick={() => addFeature(feature)}
                    className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + {feature}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Description</CardTitle>
                <CardDescription>Vehicle description in multiple languages</CardDescription>
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
                placeholder="Vehicle description in English..."
                rows={4}
              />
            )}
            {activeDescTab === 'lt' && (
              <Textarea
                value={descriptionLt}
                onChange={(e) => setDescriptionLt(e.target.value)}
                placeholder="Automobilio aprašymas lietuviškai..."
                rows={4}
              />
            )}
            {activeDescTab === 'ru' && (
              <Textarea
                value={descriptionRu}
                onChange={(e) => setDescriptionRu(e.target.value)}
                placeholder="Описание автомобиля на русском..."
                rows={4}
              />
            )}
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Photos</CardTitle>
                <CardDescription>Upload vehicle photos (max 10)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <VehiclePhotoUpload
              photos={photos}
              onChange={setPhotos}
              tenantId={tenantId || undefined}
              vehicleId={vehicle?.id}
              maxPhotos={10}
              disabled={isLoading}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-4">
          {mode === 'edit' && (
            <div>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Delete this vehicle?</span>
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
                  Delete Vehicle
                </Button>
              )}
            </div>
          )}

          <div className="flex gap-3 sm:ml-auto">
            <Link href={`/${locale}/admin/fleet`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading} isLoading={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {mode === 'create' ? 'Create Vehicle' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
