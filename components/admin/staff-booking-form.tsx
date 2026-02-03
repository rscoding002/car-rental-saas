'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Car,
  User,
  CreditCard,
  Save,
  Loader2,
  MapPin,
  Search,
  Check,
  Plus,
  Minus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/format';
import { calculateDurationDays } from '@/lib/pricing/types';
import type { Branch, Vehicle, VehicleCategory, Addon, LocalizedString } from '@/lib/supabase/types';

interface StaffBookingFormProps {
  locale: string;
  branches: Branch[];
  vehicles: (Vehicle & { category: VehicleCategory | null })[];
  addons: Addon[];
}

const SOURCE_OPTIONS = [
  { value: 'walkin', label: 'Walk-in' },
  { value: 'phone', label: 'Phone' },
  { value: 'admin', label: 'Admin' },
];

export function StaffBookingForm({
  locale,
  branches,
  vehicles,
  addons,
}: StaffBookingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ reference: string; id: string } | null>(null);

  // Vehicle selection
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  // Branch selection
  const [pickupBranchId, setPickupBranchId] = useState('');
  const [returnBranchId, setReturnBranchId] = useState('');
  const [sameReturnLocation, setSameReturnLocation] = useState(true);

  // Date/time selection
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('10:00');
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('10:00');

  // Customer info
  const [customerEmail, setCustomerEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  // Addons
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});

  // Options
  const [source, setSource] = useState('walkin');
  const [skipPayment, setSkipPayment] = useState(true);
  const [notes, setNotes] = useState('');

  // Filter vehicles by search
  const filteredVehicles = useMemo(() => {
    if (!vehicleSearch.trim()) return vehicles;
    const search = vehicleSearch.toLowerCase();
    return vehicles.filter(
      (v) =>
        v.make.toLowerCase().includes(search) ||
        v.model.toLowerCase().includes(search) ||
        v.license_plate.toLowerCase().includes(search)
    );
  }, [vehicles, vehicleSearch]);

  // Get selected vehicle
  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedVehicleId);
  }, [vehicles, selectedVehicleId]);

  // Calculate rental duration
  const rentalDays = useMemo(() => {
    if (!pickupDate || !returnDate) return 0;
    const pickupAt = `${pickupDate}T${pickupTime}:00`;
    const returnAt = `${returnDate}T${returnTime}:00`;
    return calculateDurationDays(pickupAt, returnAt);
  }, [pickupDate, pickupTime, returnDate, returnTime]);

  // Calculate estimated total (simplified)
  const estimatedTotal = useMemo(() => {
    if (!selectedVehicle || rentalDays <= 0) return 0;
    // Use a placeholder base rate (in real app, fetch from pricing)
    const baseRate = 50; // Default daily rate
    let total = baseRate * rentalDays;

    // Add addons
    for (const [addonId, quantity] of Object.entries(selectedAddons)) {
      if (quantity > 0) {
        const addon = addons.find((a) => a.id === addonId);
        if (addon) {
          if (addon.price_type === 'per_day') {
            total += addon.price * quantity * rentalDays;
          } else {
            total += addon.price * quantity;
          }
        }
      }
    }

    return total;
  }, [selectedVehicle, rentalDays, selectedAddons, addons]);

  // Handle addon quantity change
  const handleAddonChange = (addonId: string, delta: number) => {
    setSelectedAddons((prev) => {
      const current = prev[addonId] || 0;
      const newQuantity = Math.max(0, current + delta);
      if (newQuantity === 0) {
        const { [addonId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [addonId]: newQuantity };
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!selectedVehicleId) {
      setError('Please select a vehicle');
      return;
    }
    if (!pickupBranchId) {
      setError('Please select a pickup location');
      return;
    }
    if (!pickupDate || !returnDate) {
      setError('Please select pickup and return dates');
      return;
    }
    if (!customerEmail || !firstName || !lastName || !phone) {
      setError('Please fill in all customer details');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const pickupAt = `${pickupDate}T${pickupTime}:00`;
    const returnAt = `${returnDate}T${returnTime}:00`;
    const effectiveReturnBranchId = sameReturnLocation ? pickupBranchId : returnBranchId;

    // Build addons array
    const addonsList = Object.entries(selectedAddons)
      .filter(([_, qty]) => qty > 0)
      .map(([addonId, quantity]) => {
        const addon = addons.find((a) => a.id === addonId);
        if (!addon) return null;
        const unitPrice = addon.price;
        let totalPrice = addon.price * quantity;
        if (addon.price_type === 'per_day') {
          totalPrice = addon.price * quantity * rentalDays;
        }
        return {
          addonId,
          quantity,
          unitPrice,
          priceType: addon.price_type || 'per_rental',
          totalPrice,
        };
      })
      .filter(Boolean);

    const payload = {
      customerEmail,
      vehicleId: selectedVehicleId,
      pickupBranchId,
      returnBranchId: effectiveReturnBranchId,
      pickupAt,
      returnAt,
      driverInfo: {
        firstName,
        lastName,
        email: customerEmail,
        phone,
        driverLicense: licenseNumber
          ? { number: licenseNumber }
          : undefined,
      },
      addons: addonsList,
      source,
      skipPayment,
      status: skipPayment ? 'confirmed' : 'pending',
      notes: notes.trim() || undefined,
    };

    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking');
      }

      setSuccess({ reference: data.booking.reference, id: data.booking.id });

      // Redirect after short delay
      startTransition(() => {
        setTimeout(() => {
          router.push(`/${locale}/admin/bookings`);
        }, 2000);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-green-800 dark:text-green-200">
              Booking Created Successfully
            </h2>
            <p className="mt-2 text-green-700 dark:text-green-300">
              Reference: <span className="font-mono font-bold">{success.reference}</span>
            </p>
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
              Redirecting to bookings list...
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <Link href={`/${locale}/admin/bookings`}>
                <Button variant="outline">View All Bookings</Button>
              </Link>
              <Link href={`/${locale}/admin/bookings/new`}>
                <Button onClick={() => setSuccess(null)}>Create Another</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-6">
      {/* Back Link */}
      <Link
        href={`/${locale}/admin/bookings`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Bookings
      </Link>

      {error && (
        <Alert variant="destructive">{error}</Alert>
      )}

      {/* Vehicle Selection */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Car className="h-5 w-5" />
            Select Vehicle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by make, model, or plate..."
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Vehicle List */}
          <div className="max-h-64 overflow-y-auto rounded-lg border">
            {filteredVehicles.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                No vehicles found
              </p>
            ) : (
              <div className="divide-y">
                {filteredVehicles.slice(0, 20).map((vehicle) => {
                  const isSelected = vehicle.id === selectedVehicleId;
                  const categoryName = vehicle.category?.name as LocalizedString;
                  const photo = vehicle.photos?.[0]?.url;

                  return (
                    <button
                      key={vehicle.id}
                      type="button"
                      onClick={() => setSelectedVehicleId(vehicle.id)}
                      className={`flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50 ${
                        isSelected ? 'bg-primary/5 ring-1 ring-primary' : ''
                      }`}
                    >
                      {/* Photo */}
                      <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded bg-muted">
                        {photo ? (
                          <Image
                            src={photo}
                            alt={`${vehicle.make} ${vehicle.model}`}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Car className="h-6 w-6 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {vehicle.make} {vehicle.model} ({vehicle.year})
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {vehicle.license_plate}
                          {categoryName && (
                            <span className="ml-2">
                              • {categoryName[locale] || categoryName.en}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Selection indicator */}
                      {isSelected && (
                        <Check className="h-5 w-5 flex-shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedVehicle && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-medium">
                Selected: {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})
              </p>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{selectedVehicle.transmission}</span>
                <span>•</span>
                <span>{selectedVehicle.fuel_type}</span>
                <span>•</span>
                <span>{selectedVehicle.seats} seats</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location & Dates */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Location & Dates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pickup Branch */}
          <Select
            label="Pick-up Location"
            value={pickupBranchId}
            onChange={(e) => setPickupBranchId(e.target.value)}
            required
          >
            <option value="">Select location</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name} - {branch.city}
              </option>
            ))}
          </Select>

          {/* Same return location checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="sameLocation"
              checked={sameReturnLocation}
              onChange={(e) => setSameReturnLocation(e.target.checked)}
            />
            <label htmlFor="sameLocation" className="text-sm">
              Return to same location
            </label>
          </div>

          {/* Return Branch (if different) */}
          {!sameReturnLocation && (
            <Select
              label="Return Location"
              value={returnBranchId}
              onChange={(e) => setReturnBranchId(e.target.value)}
              required
            >
              <option value="">Select location</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} - {branch.city}
                </option>
              ))}
            </Select>
          )}

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                type="date"
                label="Pick-up Date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                required
              />
              <Input
                type="time"
                label="Pick-up Time"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                type="date"
                label="Return Date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                min={pickupDate}
                required
              />
              <Input
                type="time"
                label="Return Time"
                value={returnTime}
                onChange={(e) => setReturnTime(e.target.value)}
                required
              />
            </div>
          </div>

          {rentalDays > 0 && (
            <p className="text-sm text-muted-foreground">
              Rental duration: <span className="font-medium">{rentalDays} day(s)</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Customer Details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Customer Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            <Input
              type="email"
              label="Email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              required
            />
            <Input
              type="tel"
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <Input
              label="Driver License Number"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </CardContent>
      </Card>

      {/* Add-ons */}
      {addons.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Add-ons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {addons.map((addon) => {
                const addonName = addon.name as LocalizedString;
                const quantity = selectedAddons[addon.id] || 0;

                return (
                  <div
                    key={addon.id}
                    className={`flex items-center justify-between rounded-lg border p-3 ${
                      quantity > 0 ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">
                        {addonName[locale] || addonName.en}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(addon.price, 'EUR', locale)}
                        {addon.price_type === 'per_day' ? '/day' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddonChange(addon.id, -1)}
                        disabled={quantity === 0}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">
                        {quantity}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddonChange(addon.id, 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Booking Options */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" />
            Booking Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            label="Booking Source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            {SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>

          <div className="flex items-center gap-2">
            <Checkbox
              id="skipPayment"
              checked={skipPayment}
              onChange={(e) => setSkipPayment(e.target.checked)}
            />
            <label htmlFor="skipPayment" className="text-sm">
              Skip payment (confirm booking directly)
            </label>
          </div>

          <Textarea
            label="Internal Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes for staff..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Summary & Submit */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Estimated Total</p>
              <p className="text-2xl font-bold">
                {formatCurrency(estimatedTotal, 'EUR', locale)}
              </p>
              <p className="text-xs text-muted-foreground">
                Final price calculated on submission
              </p>
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || !selectedVehicleId}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create Booking
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
