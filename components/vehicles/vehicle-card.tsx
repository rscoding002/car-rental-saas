'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  Users,
  Fuel,
  Settings2,
  DoorOpen,
  Briefcase,
  Snowflake,
  ArrowRight,
} from 'lucide-react';

import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import type { Vehicle, VehicleCategory } from '@/lib/supabase/types';

interface VehicleCardProps {
  /** Vehicle data */
  vehicle: Vehicle;
  /** Vehicle category (optional, for category name display) */
  category?: VehicleCategory;
  /** Price per day (calculated from pricing rules) */
  pricePerDay?: number;
  /** Currency code */
  currency?: string;
  /** Layout variant */
  variant?: 'default' | 'compact' | 'horizontal';
  /** Whether to show the book button */
  showBookButton?: boolean;
  /** Whether to show the category badge */
  showCategory?: boolean;
  /** Additional class names */
  className?: string;
  /** Current locale for translations */
  locale?: string;
}

/**
 * Vehicle Card Component
 *
 * Displays a vehicle with photo, specs, price, and CTA.
 * Mobile-first responsive design with multiple layout variants.
 *
 * Features:
 * - Vehicle photo with fallback
 * - Key specifications with icons
 * - Price display with currency
 * - Category badge
 * - Book Now / View Details CTA
 * - Hover effects
 */
export function VehicleCard({
  vehicle,
  category,
  pricePerDay,
  currency = 'EUR',
  variant = 'default',
  showBookButton = true,
  showCategory = true,
  className,
  locale = 'en',
}: VehicleCardProps) {
  const t = useTranslations('vehicle');
  const tBooking = useTranslations('booking');

  // Get primary photo or first photo
  const primaryPhoto = vehicle.photos?.find((p) => p.isPrimary) || vehicle.photos?.[0];
  const photoUrl = primaryPhoto?.url || '/images/vehicle-placeholder.jpg';

  // Get category name (localized)
  const categoryName = category?.name?.[locale] || category?.name?.en || '';

  // Format price
  const formattedPrice = pricePerDay
    ? new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(pricePerDay)
    : null;

  // Get transmission label
  const transmissionLabel = vehicle.transmission === 'automatic' ? t('automatic') : t('manual');

  // Get fuel type label
  const fuelLabels: Record<string, string> = {
    petrol: t('petrol'),
    diesel: t('diesel'),
    electric: t('electric'),
    hybrid: t('hybrid'),
    plugin_hybrid: t('pluginHybrid'),
  };
  const fuelLabel = fuelLabels[vehicle.fuel_type] || vehicle.fuel_type;

  // Specs to display
  const specs = [
    { icon: Users, value: vehicle.seats, label: t('seats') },
    { icon: Settings2, value: transmissionLabel, label: t('transmission') },
    { icon: Fuel, value: fuelLabel, label: t('fuel') },
    { icon: DoorOpen, value: vehicle.doors, label: t('doors') },
  ];

  // Horizontal variant (for list views)
  if (variant === 'horizontal') {
    return (
      <div
        className={cn(
          'group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md sm:flex-row',
          className
        )}
      >
        {/* Image */}
        <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[4/3] sm:w-64 lg:w-80">
          <Image
            src={photoUrl}
            alt={`${vehicle.make} ${vehicle.model}`}
            fill
            loading="lazy"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 320px"
          />
          {showCategory && categoryName && (
            <Badge className="absolute left-3 top-3" variant="secondary">
              {categoryName}
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          {/* Header */}
          <div className="mb-3">
            <h3 className="text-lg font-semibold">
              {vehicle.make} {vehicle.model}
            </h3>
            <p className="text-sm text-muted-foreground">{vehicle.year}</p>
          </div>

          {/* Specs */}
          <div className="mb-4 flex flex-wrap gap-3">
            {specs.map((spec) => (
              <div
                key={spec.label}
                className="flex items-center gap-1.5 text-sm text-muted-foreground"
              >
                <spec.icon className="h-4 w-4" />
                <span>{spec.value}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between">
            {formattedPrice && (
              <div>
                <span className="text-2xl font-bold">{formattedPrice}</span>
                <span className="text-sm text-muted-foreground">/{t('perDay')}</span>
              </div>
            )}
            {showBookButton && (
              <Button asChild>
                <Link href={`/fleet/${vehicle.id}`}>
                  {tBooking('bookNow')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Compact variant (smaller cards)
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'group overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md',
          className
        )}
      >
        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={photoUrl}
            alt={`${vehicle.make} ${vehicle.model}`}
            fill
            loading="lazy"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className="font-medium truncate">
            {vehicle.make} {vehicle.model}
          </h3>
          <div className="mt-1 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {vehicle.seats}
              </span>
              <span className="flex items-center gap-1">
                <Settings2 className="h-3 w-3" />
                {vehicle.transmission === 'automatic' ? 'A' : 'M'}
              </span>
            </div>
            {formattedPrice && (
              <span className="font-semibold">{formattedPrice}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default variant (standard card)
  return (
    <div
      className={cn(
        'group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-lg',
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={photoUrl}
          alt={`${vehicle.make} ${vehicle.model}`}
          fill
          loading="lazy"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {showCategory && categoryName && (
          <Badge className="absolute left-3 top-3" variant="secondary">
            {categoryName}
          </Badge>
        )}
        {vehicle.status !== 'available' && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <Badge variant="destructive">{t(vehicle.status)}</Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="mb-3">
          <h3 className="text-lg font-semibold">
            {vehicle.make} {vehicle.model}
          </h3>
          <p className="text-sm text-muted-foreground">{vehicle.year}</p>
        </div>

        {/* Specs Grid */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          {specs.map((spec) => (
            <div
              key={spec.label}
              className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm"
            >
              <spec.icon className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{spec.value}</span>
            </div>
          ))}
        </div>

        {/* Features (optional) */}
        {vehicle.features && vehicle.features.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1">
            {vehicle.features.slice(0, 3).map((feature) => (
              <Badge key={feature} variant="outline" className="text-xs">
                {feature}
              </Badge>
            ))}
            {vehicle.features.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{vehicle.features.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-4">
          {formattedPrice ? (
            <div>
              <span className="text-2xl font-bold">{formattedPrice}</span>
              <span className="text-sm text-muted-foreground">/{t('perDay')}</span>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{tBooking('priceFrom')}</div>
          )}

          {showBookButton && (
            <Button asChild size="sm">
              <Link href={`/fleet/${vehicle.id}`}>
                {tBooking('bookNow')}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
