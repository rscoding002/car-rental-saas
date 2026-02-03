'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  Users,
  Fuel,
  Settings2,
  DoorOpen,
  Briefcase,
  Snowflake,
  Calendar,
  MapPin,
  Check,
  ChevronLeft,
  ChevronRight,
  Share2,
  Heart,
} from 'lucide-react';

import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VehicleCard } from '@/components/vehicles';
import { cn } from '@/lib/utils/cn';
import type { Vehicle, VehicleCategory, Branch } from '@/lib/supabase/types';

interface VehicleDetailContentProps {
  vehicle: Vehicle;
  category: VehicleCategory | null;
  branch: Branch | null;
  dailyPrice: number | null;
  currency: string;
  similarVehicles: Vehicle[];
  similarPrices: Record<string, number>;
  branches: Array<{ id: string; name: string; city: string }>;
  locale: string;
}

/**
 * Vehicle Detail Content (Client Component)
 *
 * Displays vehicle gallery, specs, pricing, and booking options.
 * Mobile-first responsive design.
 */
export function VehicleDetailContent({
  vehicle,
  category,
  branch,
  dailyPrice,
  currency,
  similarVehicles,
  similarPrices,
  branches,
  locale,
}: VehicleDetailContentProps) {
  const t = useTranslations('vehicle');
  const tBooking = useTranslations('booking');
  const tCommon = useTranslations('common');

  // Gallery state
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const photos = vehicle.photos || [];
  const activePhoto = photos[activePhotoIndex] || { url: '/images/vehicle-placeholder.jpg' };

  // Format price
  const formattedPrice = dailyPrice
    ? new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(dailyPrice)
    : null;

  // Get category name
  const categoryName = category?.name?.[locale] || category?.name?.en || '';

  // Get transmission label
  const transmissionLabel =
    vehicle.transmission === 'automatic' ? t('automatic') : t('manual');

  // Get fuel type label
  const fuelLabels: Record<string, string> = {
    petrol: t('petrol'),
    diesel: t('diesel'),
    electric: t('electric'),
    hybrid: t('hybrid'),
    plugin_hybrid: t('pluginHybrid'),
  };
  const fuelLabel = fuelLabels[vehicle.fuel_type] || vehicle.fuel_type;

  // Vehicle specifications
  const specs = [
    { icon: Users, label: t('seats'), value: vehicle.seats },
    { icon: DoorOpen, label: t('doors'), value: vehicle.doors },
    { icon: Settings2, label: t('transmission'), value: transmissionLabel },
    { icon: Fuel, label: t('fuelType'), value: fuelLabel },
    {
      icon: Briefcase,
      label: t('luggage'),
      value: vehicle.luggage_capacity || '-',
    },
    { icon: Snowflake, label: t('ac'), value: t('airConditioning') },
  ];

  // Navigate gallery
  const nextPhoto = () => {
    setActivePhotoIndex((prev) => (prev + 1) % photos.length);
  };
  const prevPhoto = () => {
    setActivePhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/fleet" className="hover:text-foreground transition-colors">
              {t('vehicles')}
            </Link>
            <span>/</span>
            {categoryName && (
              <>
                <span>{categoryName}</span>
                <span>/</span>
              </>
            )}
            <span className="text-foreground font-medium">
              {vehicle.make} {vehicle.model}
            </span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column: Gallery + Specs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photo Gallery */}
            <div className="space-y-4">
              {/* Main Photo */}
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-muted">
                <Image
                  src={activePhoto.url}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 66vw"
                />

                {/* Navigation Arrows */}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                      aria-label="Next photo"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}

                {/* Photo Counter */}
                {photos.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-background/80 backdrop-blur-sm px-3 py-1 text-sm">
                    {activePhotoIndex + 1} / {photos.length}
                  </div>
                )}

                {/* Category Badge */}
                {categoryName && (
                  <Badge className="absolute left-4 top-4" variant="secondary">
                    {categoryName}
                  </Badge>
                )}

                {/* Status Badge */}
                {vehicle.status !== 'available' && (
                  <Badge className="absolute right-4 top-4" variant="destructive">
                    {t(vehicle.status)}
                  </Badge>
                )}
              </div>

              {/* Thumbnail Strip */}
              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {photos.map((photo, index) => (
                    <button
                      key={index}
                      onClick={() => setActivePhotoIndex(index)}
                      className={cn(
                        'relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg transition-all',
                        activePhotoIndex === index
                          ? 'ring-2 ring-primary ring-offset-2'
                          : 'opacity-70 hover:opacity-100'
                      )}
                    >
                      <Image
                        src={photo.url}
                        alt={`${vehicle.make} ${vehicle.model} - Photo ${index + 1}`}
                        fill
                        loading="lazy"
                        className="object-cover"
                        sizes="96px"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Vehicle Title (Mobile) */}
            <div className="lg:hidden">
              <h1 className="text-2xl font-bold sm:text-3xl">
                {vehicle.make} {vehicle.model}
              </h1>
              <p className="text-muted-foreground">{vehicle.year}</p>
            </div>

            {/* Specifications */}
            <Card>
              <CardHeader>
                <CardTitle>{t('specifications')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {specs.map((spec) => (
                    <div
                      key={spec.label}
                      className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <spec.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{spec.label}</p>
                        <p className="font-medium">{spec.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            {vehicle.features && vehicle.features.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('features')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {vehicle.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Check className="h-4 w-4 text-primary" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            {vehicle.description && (vehicle.description[locale] || vehicle.description.en) && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('details')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {vehicle.description[locale] || vehicle.description.en}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Pricing & Booking */}
          <div className="space-y-6">
            {/* Sticky Booking Card */}
            <div className="lg:sticky lg:top-24">
              <Card>
                <CardContent className="p-6">
                  {/* Title (Desktop) */}
                  <div className="hidden lg:block mb-4">
                    <h1 className="text-2xl font-bold">
                      {vehicle.make} {vehicle.model}
                    </h1>
                    <p className="text-muted-foreground">{vehicle.year}</p>
                  </div>

                  {/* Price */}
                  {formattedPrice && (
                    <div className="mb-6 pb-6 border-b">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">{formattedPrice}</span>
                        <span className="text-muted-foreground">/ {tCommon('perDay')}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t('unlimitedMileage')}
                      </p>
                    </div>
                  )}

                  {/* Availability Status */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'h-3 w-3 rounded-full',
                          vehicle.status === 'available'
                            ? 'bg-green-500'
                            : 'bg-red-500'
                        )}
                      />
                      <span className="font-medium">
                        {vehicle.status === 'available'
                          ? t('available')
                          : t(vehicle.status)}
                      </span>
                    </div>
                    {branch && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {branch.name}, {branch.city}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Booking Button */}
                  <Button
                    asChild
                    size="lg"
                    className="w-full"
                    disabled={vehicle.status !== 'available'}
                  >
                    <Link href={`/booking?vehicle=${vehicle.id}`}>
                      <Calendar className="mr-2 h-5 w-5" />
                      {tBooking('bookNow')}
                    </Link>
                  </Button>

                  {/* Secondary Actions */}
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Heart className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Info */}
              <Card className="mt-4">
                <CardContent className="p-4">
                  <h3 className="font-medium mb-3">Price includes:</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      {t('unlimitedMileage')}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      Basic Insurance
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      24/7 Roadside Assistance
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      Free Cancellation (24h)
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Similar Vehicles */}
        {similarVehicles.length > 0 && (
          <section className="mt-12 sm:mt-16">
            <h2 className="mb-6 text-xl font-bold sm:text-2xl">
              {t('similarVehicles')}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {similarVehicles.map((v) => (
                <VehicleCard
                  key={v.id}
                  vehicle={v}
                  category={category || undefined}
                  pricePerDay={similarPrices[v.id]}
                  currency={currency}
                  variant="default"
                  showBookButton={true}
                  showCategory={false}
                  locale={locale}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
