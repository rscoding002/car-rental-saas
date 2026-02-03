'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  Car,
  Building2,
  Plus,
  Filter,
  List,
  Grid,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AvailabilityCalendar } from '@/components/admin/availability-calendar';
import { cn } from '@/lib/utils/cn';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  status: string;
  branch_id: string;
}

interface Branch {
  id: string;
  name: string;
  city: string;
  status: string;
}

export default function AdminAvailabilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [locale, setLocale] = useState('en');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Get filter values from URL
  const selectedVehicleId = searchParams.get('vehicle') || '';
  const selectedBranchId = searchParams.get('branch') || '';

  // Resolve params
  useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  // Fetch vehicles and branches
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const supabase = createClient();

      // Get current user's tenant
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_id', user.id)
        .single();

      if (!profile?.tenant_id) return;

      // Fetch branches
      const { data: branchesData } = await supabase
        .from('branches')
        .select('id, name, city, status')
        .eq('tenant_id', profile.tenant_id)
        .eq('status', 'active')
        .order('name');

      setBranches(branchesData || []);

      // Fetch vehicles (optionally filtered by branch)
      let vehiclesQuery = supabase
        .from('vehicles')
        .select('id, make, model, year, license_plate, status, branch_id')
        .eq('tenant_id', profile.tenant_id)
        .neq('status', 'retired')
        .order('make')
        .order('model');

      if (selectedBranchId) {
        vehiclesQuery = vehiclesQuery.eq('branch_id', selectedBranchId);
      }

      const { data: vehiclesData } = await vehiclesQuery;
      setVehicles(vehiclesData || []);

      setIsLoading(false);
    }

    fetchData();
  }, [selectedBranchId]);

  // Handle filter changes
  const handleVehicleChange = (vehicleId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (vehicleId) {
      params.set('vehicle', vehicleId);
    } else {
      params.delete('vehicle');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleBranchChange = (branchId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (branchId) {
      params.set('branch', branchId);
      // Clear vehicle selection when branch changes
      params.delete('vehicle');
    } else {
      params.delete('branch');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleBookingClick = (bookingId: string) => {
    router.push(`/${locale}/admin/bookings/${bookingId}`);
  };

  const handleBlockClick = (blockId: string) => {
    // Could open a modal to edit the block
    console.log('Block clicked:', blockId);
  };

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Availability</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage vehicle availability
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'calendar' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            Calendar
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4 mr-2" />
            List
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {/* Branch Filter */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            <Building2 className="w-4 h-4 inline-block mr-1" />
            Branch
          </label>
          <select
            value={selectedBranchId}
            onChange={(e) => handleBranchChange(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">All Branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name} - {branch.city}
              </option>
            ))}
          </select>
        </div>

        {/* Vehicle Filter */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            <Car className="w-4 h-4 inline-block mr-1" />
            Vehicle
          </label>
          <select
            value={selectedVehicleId}
            onChange={(e) => handleVehicleChange(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">All Vehicles</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.license_plate})
              </option>
            ))}
          </select>
        </div>

        {/* Quick Actions */}
        <div className="flex items-end gap-2">
          <Link href={`/${locale}/admin/availability/blocks/new`} className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Block
            </Button>
          </Link>
        </div>
      </div>

      {/* Selected Vehicle Info */}
      {selectedVehicle && (
        <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Car className="w-5 h-5 text-muted-foreground" />
              <div>
                <span className="font-medium">
                  {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                </span>
                <span className="text-muted-foreground ml-2">
                  ({selectedVehicle.license_plate})
                </span>
              </div>
              <Badge
                variant={
                  selectedVehicle.status === 'available'
                    ? 'success'
                    : selectedVehicle.status === 'rented'
                    ? 'warning'
                    : selectedVehicle.status === 'maintenance'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {selectedVehicle.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/${locale}/admin/fleet/${selectedVehicle.id}`}>
                <Button variant="ghost" size="sm">
                  View Details
                </Button>
              </Link>
              <Link href={`/${locale}/admin/fleet/${selectedVehicle.id}/edit`}>
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[600px] rounded-lg" />
        </div>
      ) : viewMode === 'calendar' ? (
        <AvailabilityCalendar
          vehicleId={selectedVehicleId || undefined}
          branchId={selectedBranchId || undefined}
          onBookingClick={handleBookingClick}
          onBlockClick={handleBlockClick}
        />
      ) : (
        <VehicleAvailabilityList
          vehicles={vehicles}
          locale={locale}
          onVehicleSelect={handleVehicleChange}
        />
      )}
    </div>
  );
}

// List view component
function VehicleAvailabilityList({
  vehicles,
  locale,
  onVehicleSelect,
}: {
  vehicles: Vehicle[];
  locale: string;
  onVehicleSelect: (id: string) => void;
}) {
  if (vehicles.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-lg border border-border">
        <Car className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No vehicles found.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="hidden sm:grid sm:grid-cols-6 gap-4 px-4 py-3 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
        <div className="col-span-2">Vehicle</div>
        <div>License Plate</div>
        <div>Status</div>
        <div>Upcoming</div>
        <div className="text-right">Actions</div>
      </div>

      <div className="divide-y divide-border">
        {vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className="grid grid-cols-1 sm:grid-cols-6 gap-2 sm:gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
          >
            {/* Vehicle Name */}
            <div className="sm:col-span-2">
              <button
                onClick={() => onVehicleSelect(vehicle.id)}
                className="font-medium text-foreground hover:text-primary transition-colors text-left"
              >
                {vehicle.year} {vehicle.make} {vehicle.model}
              </button>
              <p className="sm:hidden text-sm text-muted-foreground">
                {vehicle.license_plate}
              </p>
            </div>

            {/* License Plate - Desktop */}
            <div className="hidden sm:block text-sm">
              {vehicle.license_plate}
            </div>

            {/* Status */}
            <div>
              <Badge
                variant={
                  vehicle.status === 'available'
                    ? 'success'
                    : vehicle.status === 'rented'
                    ? 'warning'
                    : vehicle.status === 'maintenance'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {vehicle.status}
              </Badge>
            </div>

            {/* Upcoming (placeholder) */}
            <div className="hidden sm:block text-sm text-muted-foreground">
              -
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onVehicleSelect(vehicle.id)}
              >
                <CalendarIcon className="w-4 h-4 mr-1" />
                Calendar
              </Button>
              <Link href={`/${locale}/admin/fleet/${vehicle.id}`}>
                <Button variant="ghost" size="sm">
                  Details
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
