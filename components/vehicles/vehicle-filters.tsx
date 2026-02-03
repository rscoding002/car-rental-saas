'use client';

import { useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Filter, X, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/cn';
import type { VehicleCategory, Transmission, FuelType } from '@/lib/supabase/types';

// Filter state interface
export interface VehicleFiltersState {
  categories: string[];
  transmission: Transmission[];
  fuelTypes: FuelType[];
  priceMin: number | null;
  priceMax: number | null;
  seats: number | null;
}

// Default/initial filter state
export const defaultFilters: VehicleFiltersState = {
  categories: [],
  transmission: [],
  fuelTypes: [],
  priceMin: null,
  priceMax: null,
  seats: null,
};

interface VehicleFiltersProps {
  /** Available categories to filter by */
  categories: VehicleCategory[];
  /** Current filter state */
  filters: VehicleFiltersState;
  /** Callback when filters change */
  onFiltersChange: (filters: VehicleFiltersState) => void;
  /** Whether filters are shown on mobile (controlled externally) */
  isOpen?: boolean;
  /** Callback to toggle mobile filter visibility */
  onToggle?: () => void;
  /** Layout variant */
  variant?: 'sidebar' | 'horizontal' | 'modal';
  /** Show filter toggle button */
  showToggleButton?: boolean;
  /** Count of active filters */
  activeFilterCount?: number;
  /** Additional class names */
  className?: string;
}

// Transmission options
const TRANSMISSION_OPTIONS: Transmission[] = ['automatic', 'manual'];

// Fuel type options
const FUEL_TYPE_OPTIONS: FuelType[] = [
  'petrol',
  'diesel',
  'electric',
  'hybrid',
  'plugin_hybrid',
];

// Seat options
const SEAT_OPTIONS = [2, 4, 5, 7, 9];

/**
 * Vehicle Filters Component
 *
 * Provides filtering options for vehicle listings.
 * Mobile-first with collapsible sections and responsive layout.
 *
 * Features:
 * - Category filter (multi-select)
 * - Transmission filter (automatic/manual)
 * - Fuel type filter (multi-select)
 * - Price range filter (min/max inputs)
 * - Seats filter
 * - Clear all / reset functionality
 * - Collapsible filter sections
 * - Mobile-friendly slide-out panel
 */
export function VehicleFilters({
  categories,
  filters,
  onFiltersChange,
  isOpen = true,
  onToggle,
  variant = 'sidebar',
  showToggleButton = true,
  className,
}: VehicleFiltersProps) {
  const t = useTranslations('vehicle');
  const tCommon = useTranslations('common');
  const tFleet = useTranslations('fleet');
  const locale = useLocale();

  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['category', 'transmission', 'fuel', 'price'])
  );

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  // Update a specific filter
  const updateFilter = useCallback(
    <K extends keyof VehicleFiltersState>(
      key: K,
      value: VehicleFiltersState[K]
    ) => {
      onFiltersChange({
        ...filters,
        [key]: value,
      });
    },
    [filters, onFiltersChange]
  );

  // Toggle array filter value
  const toggleArrayFilter = useCallback(
    <K extends keyof VehicleFiltersState>(
      key: K,
      value: string
    ) => {
      const currentValues = filters[key] as string[];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      updateFilter(key, newValues as VehicleFiltersState[K]);
    },
    [filters, updateFilter]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    onFiltersChange(defaultFilters);
  }, [onFiltersChange]);

  // Count active filters
  const activeFilterCount =
    filters.categories.length +
    filters.transmission.length +
    filters.fuelTypes.length +
    (filters.priceMin !== null ? 1 : 0) +
    (filters.priceMax !== null ? 1 : 0) +
    (filters.seats !== null ? 1 : 0);

  // Get category name in current locale
  const getCategoryName = (category: VehicleCategory) => {
    return category.name?.[locale] || category.name?.en || '';
  };

  // Filter section component
  const FilterSection = ({
    id,
    title,
    children,
  }: {
    id: string;
    title: string;
    children: React.ReactNode;
  }) => {
    const isExpanded = expandedSections.has(id);

    return (
      <div className="border-b border-border pb-4">
        <button
          type="button"
          onClick={() => toggleSection(id)}
          className="flex w-full items-center justify-between py-2 text-left font-medium"
          aria-expanded={isExpanded}
          aria-controls={`filter-section-${id}`}
        >
          {title}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {isExpanded && (
          <div id={`filter-section-${id}`} className="mt-2 space-y-2">
            {children}
          </div>
        )}
      </div>
    );
  };

  // Filter content
  const filterContent = (
    <div className="space-y-4">
      {/* Header with clear button */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{tCommon('filters')}</h3>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 text-xs"
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            {tCommon('clearAll')}
          </Button>
        )}
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <FilterSection id="category" title={t('category')}>
          {categories.map((category) => (
            <label
              key={category.id}
              className="flex cursor-pointer items-center gap-2"
            >
              <Checkbox
                checked={filters.categories.includes(category.id)}
                onCheckedChange={() =>
                  toggleArrayFilter('categories', category.id)
                }
              />
              <span className="text-sm">{getCategoryName(category)}</span>
            </label>
          ))}
        </FilterSection>
      )}

      {/* Transmission Filter */}
      <FilterSection id="transmission" title={t('transmission')}>
        {TRANSMISSION_OPTIONS.map((transmission) => (
          <label
            key={transmission}
            className="flex cursor-pointer items-center gap-2"
          >
            <Checkbox
              checked={filters.transmission.includes(transmission)}
              onCheckedChange={() =>
                toggleArrayFilter('transmission', transmission)
              }
            />
            <span className="text-sm">{t(transmission)}</span>
          </label>
        ))}
      </FilterSection>

      {/* Fuel Type Filter */}
      <FilterSection id="fuel" title={t('fuelType')}>
        {FUEL_TYPE_OPTIONS.map((fuelType) => (
          <label
            key={fuelType}
            className="flex cursor-pointer items-center gap-2"
          >
            <Checkbox
              checked={filters.fuelTypes.includes(fuelType)}
              onCheckedChange={() => toggleArrayFilter('fuelTypes', fuelType)}
            />
            <span className="text-sm">{t(fuelType)}</span>
          </label>
        ))}
      </FilterSection>

      {/* Price Range Filter */}
      <FilterSection id="price" title={tCommon('price')}>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Label htmlFor="price-min" className="sr-only">
              {tCommon('from')}
            </Label>
            <Input
              id="price-min"
              type="number"
              min={0}
              placeholder={tCommon('from')}
              value={filters.priceMin ?? ''}
              onChange={(e) =>
                updateFilter(
                  'priceMin',
                  e.target.value ? Number(e.target.value) : null
                )
              }
              className="h-9"
            />
          </div>
          <span className="text-muted-foreground">–</span>
          <div className="flex-1">
            <Label htmlFor="price-max" className="sr-only">
              {tCommon('to')}
            </Label>
            <Input
              id="price-max"
              type="number"
              min={0}
              placeholder={tCommon('to')}
              value={filters.priceMax ?? ''}
              onChange={(e) =>
                updateFilter(
                  'priceMax',
                  e.target.value ? Number(e.target.value) : null
                )
              }
              className="h-9"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{tCommon('perDay')}</p>
      </FilterSection>

      {/* Seats Filter */}
      <FilterSection id="seats" title={t('seats')}>
        <div className="flex flex-wrap gap-2">
          {SEAT_OPTIONS.map((seatCount) => (
            <button
              key={seatCount}
              type="button"
              onClick={() =>
                updateFilter(
                  'seats',
                  filters.seats === seatCount ? null : seatCount
                )
              }
              className={cn(
                'rounded-full border px-3 py-1 text-sm transition-colors',
                filters.seats === seatCount
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:border-primary'
              )}
            >
              {seatCount}+
            </button>
          ))}
        </div>
      </FilterSection>
    </div>
  );

  // Mobile toggle button
  const toggleButton = showToggleButton && (
    <Button
      variant="outline"
      size="sm"
      onClick={onToggle}
      className="lg:hidden"
    >
      <Filter className="mr-2 h-4 w-4" />
      {tFleet('filterResults')}
      {activeFilterCount > 0 && (
        <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
          {activeFilterCount}
        </span>
      )}
    </Button>
  );

  // Sidebar variant (default for desktop)
  if (variant === 'sidebar') {
    return (
      <>
        {toggleButton}

        {/* Mobile overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={onToggle}
          />
        )}

        {/* Filter panel */}
        <aside
          className={cn(
            // Mobile: slide-out panel with safe area support
            'fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] transform bg-background shadow-xl transition-transform duration-300',
            'pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] px-6',
            'overflow-y-auto overscroll-contain',
            // Desktop: static sidebar
            'lg:static lg:z-auto lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none lg:transition-none lg:pt-0 lg:pb-0',
            isOpen ? 'translate-x-0' : '-translate-x-full',
            className
          )}
        >
          {/* Mobile close button */}
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-4 top-4 rounded-full p-2 hover:bg-muted lg:hidden"
            aria-label={tCommon('close')}
          >
            <X className="h-5 w-5" />
          </button>

          {filterContent}
        </aside>
      </>
    );
  }

  // Horizontal variant (inline filters)
  if (variant === 'horizontal') {
    return (
      <div
        className={cn(
          'flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4',
          className
        )}
      >
        {/* Quick category pills */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => updateFilter('categories', [])}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              filters.categories.length === 0
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border hover:border-primary'
            )}
          >
            {t('allCategories')}
          </button>
          {categories.slice(0, 4).map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => toggleArrayFilter('categories', category.id)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                filters.categories.includes(category.id)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:border-primary'
              )}
            >
              {getCategoryName(category)}
            </button>
          ))}
        </div>

        {/* More filters button */}
        <Button variant="outline" size="sm" onClick={onToggle}>
          <Filter className="mr-2 h-4 w-4" />
          {tCommon('filters')}
          {activeFilterCount > 0 && (
            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>
    );
  }

  // Modal variant (for mobile full-screen filters)
  return (
    <>
      {toggleButton}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          {/* Header - with safe area padding */}
          <div className="flex items-center justify-between border-b p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
            <h2 className="text-lg font-semibold">{tCommon('filters')}</h2>
            <button
              type="button"
              onClick={onToggle}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
              aria-label={tCommon('close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4">{filterContent}</div>

          {/* Footer - with safe area padding */}
          <div className="border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12" onClick={clearFilters}>
                {tCommon('clearAll')}
              </Button>
              <Button className="flex-1 h-12" onClick={onToggle}>
                {tCommon('apply')}
                {activeFilterCount > 0 && ` (${activeFilterCount})`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Hook to manage vehicle filter state
 */
export function useVehicleFilters(initialFilters?: Partial<VehicleFiltersState>) {
  const [filters, setFilters] = useState<VehicleFiltersState>({
    ...defaultFilters,
    ...initialFilters,
  });

  const [isOpen, setIsOpen] = useState(false);

  const toggleFilters = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const activeFilterCount =
    filters.categories.length +
    filters.transmission.length +
    filters.fuelTypes.length +
    (filters.priceMin !== null ? 1 : 0) +
    (filters.priceMax !== null ? 1 : 0) +
    (filters.seats !== null ? 1 : 0);

  return {
    filters,
    setFilters,
    isOpen,
    setIsOpen,
    toggleFilters,
    clearFilters,
    activeFilterCount,
  };
}

/**
 * Filter vehicles based on filter state
 */
export function filterVehicles<
  T extends {
    category_id: string;
    transmission: Transmission;
    fuel_type: FuelType;
    seats: number;
  }
>(vehicles: T[], filters: VehicleFiltersState, prices?: Record<string, number>): T[] {
  return vehicles.filter((vehicle) => {
    // Category filter
    if (
      filters.categories.length > 0 &&
      !filters.categories.includes(vehicle.category_id)
    ) {
      return false;
    }

    // Transmission filter
    if (
      filters.transmission.length > 0 &&
      !filters.transmission.includes(vehicle.transmission)
    ) {
      return false;
    }

    // Fuel type filter
    if (
      filters.fuelTypes.length > 0 &&
      !filters.fuelTypes.includes(vehicle.fuel_type)
    ) {
      return false;
    }

    // Seats filter
    if (filters.seats !== null && vehicle.seats < filters.seats) {
      return false;
    }

    // Price filter (if prices provided)
    if (prices) {
      const price = prices[(vehicle as { id: string }).id];
      if (price !== undefined) {
        if (filters.priceMin !== null && price < filters.priceMin) {
          return false;
        }
        if (filters.priceMax !== null && price > filters.priceMax) {
          return false;
        }
      }
    }

    return true;
  });
}
