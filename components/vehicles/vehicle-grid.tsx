'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { LayoutGrid, List, Car } from 'lucide-react';

import { VehicleCard } from './vehicle-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';
import type { Vehicle, VehicleCategory } from '@/lib/supabase/types';

interface VehicleWithCategory extends Vehicle {
  category?: VehicleCategory;
}

interface VehicleGridProps {
  /** List of vehicles to display */
  vehicles: VehicleWithCategory[];
  /** Map of vehicle ID to price per day */
  prices?: Record<string, number>;
  /** Currency code */
  currency?: string;
  /** Layout mode */
  layout?: 'grid' | 'list';
  /** Whether to show layout toggle */
  showLayoutToggle?: boolean;
  /** Callback when layout changes */
  onLayoutChange?: (layout: 'grid' | 'list') => void;
  /** Number of columns on different breakpoints (mobile-first) */
  columns?: {
    mobile?: 1 | 2;
    tablet?: 2 | 3;
    desktop?: 3 | 4;
  };
  /** Whether the grid is loading */
  isLoading?: boolean;
  /** Number of skeleton items to show when loading */
  skeletonCount?: number;
  /** Whether to show the book button on cards */
  showBookButton?: boolean;
  /** Whether to show category badges on cards */
  showCategory?: boolean;
  /** Empty state message key */
  emptyMessageKey?: string;
  /** Additional class names */
  className?: string;
}

/**
 * Vehicle Grid Component
 *
 * Displays a responsive grid of vehicle cards with optional layout toggle.
 * Mobile-first design: starts with 1 column, expands on larger screens.
 *
 * Features:
 * - Responsive columns (1 → 2 → 3 or 4)
 * - Grid/List layout toggle
 * - Loading skeleton state
 * - Empty state with message
 * - Price integration
 */
export function VehicleGrid({
  vehicles,
  prices = {},
  currency = 'EUR',
  layout = 'grid',
  showLayoutToggle = false,
  onLayoutChange,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  isLoading = false,
  skeletonCount = 6,
  showBookButton = true,
  showCategory = true,
  emptyMessageKey = 'noVehiclesFound',
  className,
}: VehicleGridProps) {
  const t = useTranslations('fleet');
  const locale = useLocale();

  // Generate responsive grid class based on columns config
  const getGridClass = () => {
    const mobileCol = columns.mobile === 2 ? 'grid-cols-2' : 'grid-cols-1';
    const tabletCol =
      columns.tablet === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
    const desktopCol =
      columns.desktop === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3';

    return `${mobileCol} ${tabletCol} ${desktopCol}`;
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Layout toggle placeholder */}
        {showLayoutToggle && (
          <div className="flex justify-end">
            <Skeleton className="h-9 w-20" />
          </div>
        )}

        {/* Grid skeleton */}
        {layout === 'grid' ? (
          <div className={cn('grid gap-4 md:gap-6', getGridClass())}>
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <VehicleCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <VehicleCardSkeleton key={i} variant="horizontal" />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Empty state
  if (vehicles.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-12 text-center',
          className
        )}
      >
        <div className="mb-4 rounded-full bg-muted p-4">
          <Car className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">{t(emptyMessageKey)}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          {t('tryDifferentFilters')}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Layout Toggle */}
      {showLayoutToggle && (
        <div className="flex justify-end">
          <div className="inline-flex rounded-lg border bg-muted p-1">
            <Button
              variant={layout === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              onClick={() => onLayoutChange?.('grid')}
              aria-label={t('gridView')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={layout === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              onClick={() => onLayoutChange?.('list')}
              aria-label={t('listView')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Vehicle Grid/List */}
      {layout === 'grid' ? (
        <div className={cn('grid gap-4 md:gap-6', getGridClass())}>
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              category={vehicle.category}
              pricePerDay={prices[vehicle.id]}
              currency={currency}
              variant="default"
              showBookButton={showBookButton}
              showCategory={showCategory}
              locale={locale}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              category={vehicle.category}
              pricePerDay={prices[vehicle.id]}
              currency={currency}
              variant="horizontal"
              showBookButton={showBookButton}
              showCategory={showCategory}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Vehicle Card Skeleton
 * Loading placeholder for vehicle cards
 */
function VehicleCardSkeleton({
  variant = 'default',
}: {
  variant?: 'default' | 'horizontal';
}) {
  if (variant === 'horizontal') {
    return (
      <div className="flex flex-col overflow-hidden rounded-xl border bg-card sm:flex-row">
        {/* Image skeleton */}
        <Skeleton className="aspect-[16/10] w-full sm:aspect-[4/3] sm:w-64 lg:w-80" />

        {/* Content skeleton */}
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <Skeleton className="mb-2 h-6 w-3/4" />
          <Skeleton className="mb-4 h-4 w-16" />

          <div className="mb-4 flex gap-3">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-10" />
          </div>

          <div className="mt-auto flex items-center justify-between">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {/* Image skeleton */}
      <Skeleton className="aspect-[16/10] w-full" />

      {/* Content skeleton */}
      <div className="p-4">
        <Skeleton className="mb-2 h-6 w-3/4" />
        <Skeleton className="mb-4 h-4 w-16" />

        <div className="mb-4 grid grid-cols-2 gap-2">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </div>
  );
}

export { VehicleCardSkeleton };
