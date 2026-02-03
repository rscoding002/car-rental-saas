'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { FleetGalleryBlockProps, FleetGalleryBlockLocaleContent } from '@/lib/cms/block-types';
import type { Vehicle, VehiclePhoto, LocalizedString } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { Users, Fuel, Settings2, ChevronLeft, ChevronRight } from 'lucide-react';

// Extended props to accept vehicles data
interface FleetGalleryBlockExtendedProps extends FleetGalleryBlockProps {
  vehicles?: Vehicle[];
  basePrices?: Record<string, number>; // vehicleId -> daily price
  currency?: string;
}

// Helper to get localized string
function getLocalizedText(text: LocalizedString | undefined, locale: string): string {
  if (!text) return '';
  return text[locale] || text.en || Object.values(text).find(v => v) || '';
}

// Get primary photo URL
function getPrimaryPhoto(photos: VehiclePhoto[]): string | null {
  if (!photos || photos.length === 0) return null;
  const primary = photos.find(p => p.isPrimary);
  return primary?.url || photos[0]?.url || null;
}

// Fuel type labels
const fuelTypeLabels: Record<string, string> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  electric: 'Electric',
  hybrid: 'Hybrid',
  plugin_hybrid: 'Plug-in Hybrid',
};

// Vehicle Card Component
function VehicleCard({
  vehicle,
  price,
  currency = '€',
  locale,
  showPricing,
  showCta,
  ctaText,
  ctaLink,
}: {
  vehicle: Vehicle;
  price?: number;
  currency?: string;
  locale: string;
  showPricing?: boolean;
  showCta?: boolean;
  ctaText?: string;
  ctaLink?: string;
}) {
  const photoUrl = getPrimaryPhoto(vehicle.photos);
  const description = getLocalizedText(vehicle.description, locale);

  return (
    <div className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* Image */}
      <div className="relative aspect-[16/10] bg-muted overflow-hidden">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={`${vehicle.make} ${vehicle.model}`}
            fill
            loading="lazy"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <Settings2 className="w-12 h-12 opacity-30" />
          </div>
        )}
        {/* Status Badge */}
        {vehicle.status !== 'available' && (
          <div className="absolute top-3 right-3 px-2 py-1 text-xs font-medium rounded bg-yellow-500/90 text-white">
            {vehicle.status === 'rented' ? 'Rented' : vehicle.status}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5">
        {/* Title */}
        <h3 className="text-lg font-semibold text-foreground mb-1">
          {vehicle.make} {vehicle.model}
        </h3>
        <p className="text-sm text-muted-foreground mb-3">{vehicle.year}</p>

        {/* Specs */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {vehicle.seats}
          </span>
          <span className="flex items-center gap-1.5">
            <Settings2 className="w-4 h-4" />
            {vehicle.transmission === 'automatic' ? 'Auto' : 'Manual'}
          </span>
          <span className="flex items-center gap-1.5">
            <Fuel className="w-4 h-4" />
            {fuelTypeLabels[vehicle.fuel_type] || vehicle.fuel_type}
          </span>
        </div>

        {/* Price and CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          {showPricing && price !== undefined ? (
            <div>
              <span className="text-xl font-bold text-foreground">
                {currency}{price}
              </span>
              <span className="text-sm text-muted-foreground">/day</span>
            </div>
          ) : (
            <div />
          )}

          {showCta && ctaLink && (
            <Link href={ctaLink.replace('[id]', vehicle.id)}>
              <Button size="sm" variant="primary">
                {ctaText || 'View'}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function FleetGalleryBlock({
  id,
  content,
  settings,
  locale,
  vehicles = [],
  basePrices = {},
  currency = '€',
}: FleetGalleryBlockExtendedProps) {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Get localized content with fallback to English
  const localeContent: FleetGalleryBlockLocaleContent | undefined =
    (content[locale as keyof typeof content] as FleetGalleryBlockLocaleContent | undefined) ||
    content.en;

  const {
    maxVehicles = 6,
    showPricing = true,
    showCta = true,
    layout = 'grid',
  } = content;

  // Filter and limit vehicles
  let displayVehicles = vehicles;

  // Filter by category if specified
  if (content.categoryIds && content.categoryIds.length > 0) {
    displayVehicles = displayVehicles.filter(v =>
      content.categoryIds!.includes(v.category_id)
    );
  }

  // Filter by specific vehicle IDs if specified
  if (content.vehicleIds && content.vehicleIds.length > 0) {
    displayVehicles = displayVehicles.filter(v =>
      content.vehicleIds!.includes(v.id)
    );
  }

  // Limit to maxVehicles
  displayVehicles = displayVehicles.slice(0, maxVehicles);

  // Carousel navigation
  const itemsPerView = 3;
  const maxIndex = Math.max(0, displayVehicles.length - itemsPerView);

  // Use transition for non-blocking carousel updates (improves INP)
  const handlePrev = () => {
    startTransition(() => {
      setCarouselIndex(prev => Math.max(0, prev - 1));
    });
  };

  const handleNext = () => {
    startTransition(() => {
      setCarouselIndex(prev => Math.min(maxIndex, prev + 1));
    });
  };

  // Empty state
  if (displayVehicles.length === 0) {
    return (
      <section id={id} data-block-type="fleet_gallery" className="py-12 md:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {localeContent?.heading && (
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
              {localeContent.heading}
            </h2>
          )}
          <p className="text-muted-foreground">No vehicles available at the moment.</p>
        </div>
      </section>
    );
  }

  return (
    <section
      id={id}
      data-block-type="fleet_gallery"
      className="py-12 md:py-16 lg:py-20 bg-muted/30"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        {(localeContent?.heading || localeContent?.subheading) && (
          <div className="text-center mb-10 md:mb-14">
            {localeContent?.heading && (
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
                {localeContent.heading}
              </h2>
            )}
            {localeContent?.subheading && (
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                {localeContent.subheading}
              </p>
            )}
          </div>
        )}

        {/* Grid Layout */}
        {layout === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayVehicles.map(vehicle => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                price={basePrices[vehicle.id]}
                currency={currency}
                locale={locale}
                showPricing={showPricing}
                showCta={showCta}
                ctaText={localeContent?.ctaText}
                ctaLink={localeContent?.ctaLink || '/fleet/[id]'}
              />
            ))}
          </div>
        )}

        {/* Carousel Layout */}
        {layout === 'carousel' && (
          <div className="relative">
            {/* Navigation Buttons */}
            {displayVehicles.length > itemsPerView && (
              <>
                <button
                  onClick={handlePrev}
                  disabled={carouselIndex === 0}
                  className={cn(
                    'absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10',
                    'w-10 h-10 rounded-full bg-background border border-border shadow-lg',
                    'flex items-center justify-center',
                    'hover:bg-accent transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'hidden md:flex'
                  )}
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNext}
                  disabled={carouselIndex >= maxIndex}
                  className={cn(
                    'absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10',
                    'w-10 h-10 rounded-full bg-background border border-border shadow-lg',
                    'flex items-center justify-center',
                    'hover:bg-accent transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'hidden md:flex'
                  )}
                  aria-label="Next"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Carousel Container */}
            <div className="overflow-hidden">
              <div
                className="flex gap-6 transition-transform duration-300 ease-out"
                style={{
                  transform: `translateX(-${carouselIndex * (100 / itemsPerView + 2)}%)`,
                }}
              >
                {displayVehicles.map(vehicle => (
                  <div
                    key={vehicle.id}
                    className="flex-shrink-0 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
                  >
                    <VehicleCard
                      vehicle={vehicle}
                      price={basePrices[vehicle.id]}
                      currency={currency}
                      locale={locale}
                      showPricing={showPricing}
                      showCta={showCta}
                      ctaText={localeContent?.ctaText}
                      ctaLink={localeContent?.ctaLink || '/fleet/[id]'}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile: Horizontal Scroll */}
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:hidden -mx-4 px-4">
              {displayVehicles.map(vehicle => (
                <div
                  key={vehicle.id}
                  className="flex-shrink-0 w-[85%] snap-start"
                >
                  <VehicleCard
                    vehicle={vehicle}
                    price={basePrices[vehicle.id]}
                    currency={currency}
                    locale={locale}
                    showPricing={showPricing}
                    showCta={showCta}
                    ctaText={localeContent?.ctaText}
                    ctaLink={localeContent?.ctaLink || '/fleet/[id]'}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View All CTA */}
        {localeContent?.ctaText && localeContent?.ctaLink && !localeContent.ctaLink.includes('[id]') && (
          <div className="text-center mt-10">
            <Link href={localeContent.ctaLink}>
              <Button size="lg" variant="outline">
                {localeContent.ctaText}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
