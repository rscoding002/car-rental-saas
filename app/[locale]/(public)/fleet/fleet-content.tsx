'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';

import {
  VehicleGrid,
  VehicleFilters,
  useVehicleFilters,
  filterVehicles,
} from '@/components/vehicles';
import { Select } from '@/components/ui/select';
import type { Vehicle, VehicleCategory } from '@/lib/supabase/types';

interface VehicleWithCategory extends Vehicle {
  category?: VehicleCategory;
}

interface FleetPageContentProps {
  vehicles: VehicleWithCategory[];
  categories: VehicleCategory[];
  prices: Record<string, number>;
  locale: string;
}

type SortOption = 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'newest';

/**
 * Fleet Page Content (Client Component)
 *
 * Handles client-side filtering, sorting, and layout toggling.
 * Uses the VehicleGrid and VehicleFilters components.
 */
export function FleetPageContent({
  vehicles,
  categories,
  prices,
  locale,
}: FleetPageContentProps) {
  const t = useTranslations('vehicle');
  const tFleet = useTranslations('fleet');
  const tCommon = useTranslations('common');

  // Filter state
  const {
    filters,
    setFilters,
    isOpen: isFilterOpen,
    toggleFilters,
    activeFilterCount,
  } = useVehicleFilters();

  // Sort state
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Layout state
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    return filterVehicles(vehicles, filters, prices);
  }, [vehicles, filters, prices]);

  // Sort vehicles
  const sortedVehicles = useMemo(() => {
    const sorted = [...filteredVehicles];

    switch (sortBy) {
      case 'price-asc':
        sorted.sort((a, b) => (prices[a.id] || 0) - (prices[b.id] || 0));
        break;
      case 'price-desc':
        sorted.sort((a, b) => (prices[b.id] || 0) - (prices[a.id] || 0));
        break;
      case 'name-asc':
        sorted.sort((a, b) =>
          `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`)
        );
        break;
      case 'name-desc':
        sorted.sort((a, b) =>
          `${b.make} ${b.model}`.localeCompare(`${a.make} ${a.model}`)
        );
        break;
      case 'newest':
      default:
        sorted.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
    }

    return sorted;
  }, [filteredVehicles, sortBy, prices]);

  // Sort options
  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'price-asc', label: `${t('sortByPrice')}: ${t('lowToHigh')}` },
    { value: 'price-desc', label: `${t('sortByPrice')}: ${t('highToLow')}` },
    { value: 'name-asc', label: `${t('sortByName')}: A-Z` },
    { value: 'name-desc', label: `${t('sortByName')}: Z-A` },
  ];

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* Sidebar Filters (Desktop) */}
        <VehicleFilters
          categories={categories}
          filters={filters}
          onFiltersChange={setFilters}
          isOpen={isFilterOpen}
          onToggle={toggleFilters}
          variant="sidebar"
          showToggleButton={true}
        />

        {/* Main Content */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            {/* Results count */}
            <p className="text-sm text-muted-foreground">
              {tFleet('showingResults', { count: sortedVehicles.length })}
              {activeFilterCount > 0 && (
                <span className="ml-1">
                  ({activeFilterCount} {tCommon('filters').toLowerCase()})
                </span>
              )}
            </p>

            {/* Sort and Layout Controls */}
            <div className="flex items-center gap-3">
              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <label htmlFor="sort-select" className="text-sm text-muted-foreground hidden sm:inline">
                  {tFleet('sortBy')}:
                </label>
                <Select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  options={sortOptions}
                  className="w-auto min-w-[140px] sm:min-w-[180px]"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Grid */}
          <VehicleGrid
            vehicles={sortedVehicles}
            prices={prices}
            currency="EUR"
            layout={layout}
            showLayoutToggle={true}
            onLayoutChange={setLayout}
            columns={{ mobile: 1, tablet: 2, desktop: 3 }}
            showBookButton={true}
            showCategory={true}
          />
        </div>
      </div>
    </div>
  );
}
