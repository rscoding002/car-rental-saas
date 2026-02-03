'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
  Save,
  Trash2,
  Loader2,
} from 'lucide-react';
import type { Branch, OperatingHours } from '@/lib/supabase/types';
import { generateBranchSlug, DEFAULT_OPERATING_HOURS } from '@/lib/branches/types';

interface BranchFormProps {
  locale: string;
  branch?: Branch;
  mode: 'create' | 'edit';
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export function BranchForm({ locale, branch, mode }: BranchFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [name, setName] = useState(branch?.name || '');
  const [slug, setSlug] = useState(branch?.slug || '');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [address, setAddress] = useState(branch?.address || '');
  const [city, setCity] = useState(branch?.city || '');
  const [country, setCountry] = useState(branch?.country || 'LT');
  const [latitude, setLatitude] = useState(branch?.latitude?.toString() || '');
  const [longitude, setLongitude] = useState(branch?.longitude?.toString() || '');
  const [phone, setPhone] = useState(branch?.phone || '');
  const [email, setEmail] = useState(branch?.email || '');
  const [status, setStatus] = useState(branch?.status || 'active');
  const [sortOrder, setSortOrder] = useState(branch?.sort_order?.toString() || '0');

  // Operating hours state
  const defaultHours = branch?.operating_hours || DEFAULT_OPERATING_HOURS;
  const [operatingHours, setOperatingHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>(() => {
    const hours: Record<string, { open: string; close: string; closed: boolean }> = {};
    for (const day of DAYS) {
      const dayHours = defaultHours[day.key];
      hours[day.key] = {
        open: dayHours?.open || '09:00',
        close: dayHours?.close || '18:00',
        closed: !dayHours,
      };
    }
    return hours;
  });

  // Auto-generate slug from name
  const handleNameChange = (newName: string) => {
    setName(newName);
    if (!slugManuallyEdited) {
      setSlug(generateBranchSlug(newName));
    }
  };

  const handleSlugChange = (newSlug: string) => {
    setSlugManuallyEdited(true);
    setSlug(generateBranchSlug(newSlug));
  };

  const handleHoursChange = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const buildOperatingHours = (): OperatingHours => {
    const hours: OperatingHours = {};
    for (const day of DAYS) {
      const dayHours = operatingHours[day.key];
      if (dayHours && !dayHours.closed) {
        hours[day.key] = { open: dayHours.open, close: dayHours.close };
      } else {
        hours[day.key] = null;
      }
    }
    return hours;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      setError('Branch name is required');
      return;
    }
    if (!slug.trim()) {
      setError('URL slug is required');
      return;
    }
    if (!address.trim()) {
      setError('Address is required');
      return;
    }
    if (!city.trim()) {
      setError('City is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      address: address.trim(),
      city: city.trim(),
      country: country.trim() || 'LT',
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      status,
      sort_order: parseInt(sortOrder, 10) || 0,
      operating_hours: buildOperatingHours(),
    };

    try {
      const url = mode === 'create'
        ? '/api/admin/branches'
        : `/api/admin/branches/${branch!.id}`;

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${mode} branch`);
      }

      startTransition(() => {
        router.push(`/${locale}/admin/branches`);
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${mode} branch`);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!branch) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/branches/${branch.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete branch');
      }

      startTransition(() => {
        router.push(`/${locale}/admin/branches`);
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete branch');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const isLoading = isSubmitting || isPending;

  return (
    <form onSubmit={handleSubmit} className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/${locale}/admin/branches`}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">
            {mode === 'create' ? 'Add New Branch' : 'Edit Branch'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'create'
              ? 'Add a new rental location'
              : `Editing: ${branch?.name}`}
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
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Branch name and identification</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Branch Name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Vilnius Airport"
                required
                autoFocus
              />
              <Input
                label="URL Slug"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="vilnius-airport"
                hint={`URL: /${locale}/branches/${slug || 'your-slug'}`}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                options={STATUS_OPTIONS}
              />
              <Input
                label="Sort Order"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="0"
                hint="Lower numbers appear first"
              />
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Location</CardTitle>
                <CardDescription>Address and GPS coordinates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Street Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., Rodūnios kelias 2"
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., Vilnius"
                required
              />
              <Input
                label="Country Code"
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                placeholder="LT"
                maxLength={2}
                hint="ISO 2-letter code (e.g., LT, LV, EE)"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Latitude"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g., 54.6436"
                hint="Optional - for map display"
              />
              <Input
                label="Longitude"
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g., 25.2798"
                hint="Optional - for map display"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>Phone and email for this location</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+370 5 123 4567"
                leftIcon={<Phone className="w-4 h-4" />}
              />
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vilnius@example.com"
                leftIcon={<Mail className="w-4 h-4" />}
              />
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Operating Hours</CardTitle>
                <CardDescription>Set opening and closing times for each day</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {DAYS.map((day) => (
                <div
                  key={day.key}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-muted/30"
                >
                  <div className="w-full sm:w-28 flex items-center gap-3">
                    <Checkbox
                      checked={!operatingHours[day.key].closed}
                      onCheckedChange={(checked) =>
                        handleHoursChange(day.key, 'closed', !checked)
                      }
                    />
                    <span className="text-sm font-medium">{day.label}</span>
                  </div>

                  {operatingHours[day.key].closed ? (
                    <span className="text-sm text-muted-foreground sm:ml-4">Closed</span>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={operatingHours[day.key].open}
                        onChange={(e) => handleHoursChange(day.key, 'open', e.target.value)}
                        className="w-full sm:w-32"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={operatingHours[day.key].close}
                        onChange={(e) => handleHoursChange(day.key, 'close', e.target.value)}
                        className="w-full sm:w-32"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-4">
          {mode === 'edit' && (
            <div>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Delete this branch?</span>
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
                  Delete Branch
                </Button>
              )}
            </div>
          )}

          <div className="flex gap-3 sm:ml-auto">
            <Link href={`/${locale}/admin/branches`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading} isLoading={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {mode === 'create' ? 'Create Branch' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
