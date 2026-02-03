import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  Edit,
  Car,
  Settings2,
  MapPin,
  Calendar,
  Gauge,
  Fuel,
  Users,
  DoorOpen,
  Briefcase,
  Tag,
  FileText,
  Image as ImageIcon,
  Star,
  CheckCircle,
  Clock,
  Wrench,
  XCircle,
} from 'lucide-react';
import type { Vehicle, VehicleStatus, LocalizedString } from '@/lib/supabase/types';
import type { VehicleCategory } from '@/lib/fleet/types';

interface VehicleDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

// Status configuration
const statusConfig: Record<VehicleStatus, { label: string; variant: 'success' | 'warning' | 'secondary' | 'destructive'; icon: typeof CheckCircle }> = {
  available: { label: 'Available', variant: 'success', icon: CheckCircle },
  rented: { label: 'Rented', variant: 'warning', icon: Clock },
  maintenance: { label: 'In Maintenance', variant: 'secondary', icon: Wrench },
  retired: { label: 'Retired', variant: 'destructive', icon: XCircle },
};

const transmissionLabels: Record<string, string> = {
  automatic: 'Automatic',
  manual: 'Manual',
};

const fuelTypeLabels: Record<string, string> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  electric: 'Electric',
  hybrid: 'Hybrid',
  plugin_hybrid: 'Plug-in Hybrid',
};

function getLocalizedString(value: LocalizedString | null | undefined, locale: string): string {
  if (!value) return '-';
  return value[locale as keyof LocalizedString] || value.en || '-';
}

export default async function VehicleDetailPage({ params }: VehicleDetailPageProps) {
  const { locale, id } = await params;
  const supabase = await createClient();

  // Fetch the vehicle with related data
  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .select(`
      *,
      vehicle_categories (
        id,
        name,
        description,
        icon
      ),
      branches (
        id,
        name,
        city,
        address
      )
    `)
    .eq('id', id)
    .single();

  if (error || !vehicle) {
    notFound();
  }

  const typedVehicle = vehicle as Vehicle & {
    vehicle_categories: VehicleCategory | null;
    branches: { id: string; name: string; city: string; address: string } | null;
  };

  const status = statusConfig[typedVehicle.status];
  const StatusIcon = status.icon;
  const primaryPhoto = typedVehicle.photos?.find(p => p.isPrimary) || typedVehicle.photos?.[0];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <Link href={`/${locale}/admin/fleet`}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">
              {typedVehicle.year} {typedVehicle.make} {typedVehicle.model}
            </h1>
            <Badge variant={status.variant} className="gap-1">
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {typedVehicle.license_plate}
            {typedVehicle.vin && ` • VIN: ${typedVehicle.vin}`}
          </p>
        </div>
        <Link href={`/${locale}/admin/fleet/${id}/edit`}>
          <Button>
            <Edit className="w-4 h-4 mr-2" />
            Edit Vehicle
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Photos */}
        <div className="lg:col-span-1 space-y-6">
          {/* Primary Photo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {primaryPhoto ? (
                <div className="space-y-3">
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={primaryPhoto.url}
                      alt={`${typedVehicle.make} ${typedVehicle.model}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    {primaryPhoto.isPrimary && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded">
                        <Star className="w-3 h-3 fill-current" />
                        Primary
                      </div>
                    )}
                  </div>
                  {/* Thumbnail gallery */}
                  {typedVehicle.photos && typedVehicle.photos.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {typedVehicle.photos.slice(0, 4).map((photo, index) => (
                        <div
                          key={photo.url}
                          className={`relative aspect-square rounded overflow-hidden bg-muted ${
                            photo.isPrimary ? 'ring-2 ring-primary' : ''
                          }`}
                        >
                          <Image
                            src={photo.url}
                            alt={`Photo ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground text-center">
                    {typedVehicle.photos?.length || 0} photo{(typedVehicle.photos?.length || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
              ) : (
                <div className="aspect-[4/3] rounded-lg bg-muted flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Car className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No photos</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Gauge className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold">
                    {typedVehicle.odometer?.toLocaleString() || '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">Odometer (km)</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Calendar className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold">{typedVehicle.year}</p>
                  <p className="text-xs text-muted-foreground">Year</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="w-4 h-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Make</dt>
                  <dd className="text-sm font-medium">{typedVehicle.make}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Model</dt>
                  <dd className="text-sm font-medium">{typedVehicle.model}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Year</dt>
                  <dd className="text-sm font-medium">{typedVehicle.year}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Color</dt>
                  <dd className="text-sm font-medium">{typedVehicle.color || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">License Plate</dt>
                  <dd className="text-sm font-medium font-mono">{typedVehicle.license_plate}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">VIN</dt>
                  <dd className="text-sm font-medium font-mono">{typedVehicle.vin || '-'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Specifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Specifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50 text-center">
                  <Settings2 className="w-5 h-5 mb-1 text-muted-foreground" />
                  <span className="text-sm font-medium">{transmissionLabels[typedVehicle.transmission]}</span>
                  <span className="text-xs text-muted-foreground">Transmission</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50 text-center">
                  <Fuel className="w-5 h-5 mb-1 text-muted-foreground" />
                  <span className="text-sm font-medium">{fuelTypeLabels[typedVehicle.fuel_type]}</span>
                  <span className="text-xs text-muted-foreground">Fuel Type</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50 text-center">
                  <Users className="w-5 h-5 mb-1 text-muted-foreground" />
                  <span className="text-sm font-medium">{typedVehicle.seats}</span>
                  <span className="text-xs text-muted-foreground">Seats</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50 text-center">
                  <DoorOpen className="w-5 h-5 mb-1 text-muted-foreground" />
                  <span className="text-sm font-medium">{typedVehicle.doors}</span>
                  <span className="text-xs text-muted-foreground">Doors</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50 text-center">
                  <Briefcase className="w-5 h-5 mb-1 text-muted-foreground" />
                  <span className="text-sm font-medium">{typedVehicle.luggage_capacity || '-'}</span>
                  <span className="text-xs text-muted-foreground">Luggage</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category & Branch */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      {typedVehicle.vehicle_categories?.icon ? (
                        <span className="text-xl">{typedVehicle.vehicle_categories.icon}</span>
                      ) : (
                        <Tag className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Category</p>
                      <p className="font-medium">
                        {typedVehicle.vehicle_categories
                          ? getLocalizedString(typedVehicle.vehicle_categories.name, locale)
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Branch</p>
                      <p className="font-medium">
                        {typedVehicle.branches?.name || '-'}
                      </p>
                      {typedVehicle.branches?.city && (
                        <p className="text-xs text-muted-foreground">
                          {typedVehicle.branches.city}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          {typedVehicle.features && typedVehicle.features.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {typedVehicle.features.map((feature) => (
                    <Badge key={feature} variant="secondary">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {(typedVehicle.description?.en || typedVehicle.description?.lt || typedVehicle.description?.ru) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {getLocalizedString(typedVehicle.description, locale)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span>
                  Created: {new Date(typedVehicle.created_at).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span>
                  Updated: {new Date(typedVehicle.updated_at).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="font-mono">ID: {typedVehicle.id.slice(0, 8)}...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
