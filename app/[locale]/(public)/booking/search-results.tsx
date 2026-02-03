'use client';

import { useState, useMemo, useTransition } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  Users,
  Fuel,
  Settings2,
  DoorOpen,
  ArrowRight,
  SlidersHorizontal,
  Grid3X3,
  List,
  ChevronDown,
  X,
  Check,
} from 'lucide-react';

import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils/cn';
import type { Vehicle, VehicleCategory, LocalizedString } from '@/lib/supabase/types';

interface SearchResultsProps {
  vehicles: (Vehicle & { category?: VehicleCategory })[];
  categories: VehicleCategory[];
  prices: Record<string, number>;
  rentalDays: number;
  pickupAt: string;
  returnAt: string;
  pickupBranchId: string;
  returnBranchId: string;
  locale: string;
}

type SortOption = 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc';
type LayoutOption = 'grid' | 'list';

/**
 * Search Results Component
 *
 * Displays available vehicles with filtering, sorting, and pricing.
 * Mobile-first responsive design.
 */
export function SearchResults({
  vehicles,
  categories,
  prices,
  rentalDays,
  pickupAt,
  returnAt,
  pickupBranchId,
  returnBranchId,
  locale,
}: SearchResultsProps) {
  const t = useTranslations('booking');
  const tVehicle = useTranslations('vehicle');
  const tCommon = useTranslations('common');

  const [isPending, startTransition] = useTransition();

  // State
  const [layout, setLayout] = useState<LayoutOption>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('price_asc');
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTransmission, setSelectedTransmission] = useState<string[]>([]);
  const [selectedFuel, setSelectedFuel] = useState<string[]>([]);
  const [minSeats, setMinSeats] = useState<number>(0);

  // Get unique filter options from vehicles
  const filterOptions = useMemo(() => {
    const transmissions = new Set<string>();
    const fuels = new Set<string>();
    const seatCounts = new Set<number>();

    vehicles.forEach((v) => {
      transmissions.add(v.transmission);
      fuels.add(v.fuel_type);
      seatCounts.add(v.seats);
    });

    return {
      transmissions: Array.from(transmissions).sort(),
      fuels: Array.from(fuels).sort(),
      seatCounts: Array.from(seatCounts).sort((a, b) => a - b),
    };
  }, [vehicles]);

  // Filter and sort vehicles
  const filteredVehicles = useMemo(() => {
    let result = [...vehicles];

    // Apply category filter
    if (selectedCategories.length > 0) {
      result = result.filter((v) => selectedCategories.includes(v.category_id));
    }

    // Apply transmission filter
    if (selectedTransmission.length > 0) {
      result = result.filter((v) => selectedTransmission.includes(v.transmission));
    }

    // Apply fuel filter
    if (selectedFuel.length > 0) {
      result = result.filter((v) => selectedFuel.includes(v.fuel_type));
    }

    // Apply seats filter
    if (minSeats > 0) {
      result = result.filter((v) => v.seats >= minSeats);
    }

    // Sort
    result.sort((a, b) => {
      const priceA = prices[a.id] || 0;
      const priceB = prices[b.id] || 0;

      switch (sortBy) {
        case 'price_asc':
          return priceA - priceB;
        case 'price_desc':
          return priceB - priceA;
        case 'name_asc':
          return `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`);
        case 'name_desc':
          return `${b.make} ${b.model}`.localeCompare(`${a.make} ${a.model}`);
        default:
          return 0;
      }
    });

    return result;
  }, [vehicles, prices, selectedCategories, selectedTransmission, selectedFuel, minSeats, sortBy]);

  // Active filter count
  const activeFilterCount =
    selectedCategories.length +
    selectedTransmission.length +
    selectedFuel.length +
    (minSeats > 0 ? 1 : 0);

  // Clear all filters
  const clearFilters = () => {
    startTransition(() => {
      setSelectedCategories([]);
      setSelectedTransmission([]);
      setSelectedFuel([]);
      setMinSeats(0);
    });
  };

  // Toggle filter
  const toggleFilter = (
    value: string,
    selected: string[],
    setSelected: (v: string[]) => void
  ) => {
    startTransition(() => {
      if (selected.includes(value)) {
        setSelected(selected.filter((v) => v !== value));
      } else {
        setSelected([...selected, value]);
      }
    });
  };

  // No results
  if (vehicles.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Settings2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">{t('noVehiclesFound')}</h2>
        <p className="mb-6 text-muted-foreground">{t('tryDifferentDates')}</p>
        <Button asChild variant="outline">
          <Link href="/booking">{t('searchVehicles')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Filters Sidebar - Desktop */}
      <aside className="hidden w-64 flex-shrink-0 lg:block">
        <div className="sticky top-24">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">{tCommon('filters')}</h2>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary hover:underline"
              >
                {tCommon('clearAll')}
              </button>
            )}
          </div>

          <FiltersContent
            categories={categories}
            filterOptions={filterOptions}
            selectedCategories={selectedCategories}
            selectedTransmission={selectedTransmission}
            selectedFuel={selectedFuel}
            minSeats={minSeats}
            setSelectedCategories={setSelectedCategories}
            setSelectedTransmission={setSelectedTransmission}
            setSelectedFuel={setSelectedFuel}
            setMinSeats={setMinSeats}
            toggleFilter={toggleFilter}
            locale={locale}
          />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        {/* Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* Mobile Filters Button */}
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setShowFilters(true)}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              {tCommon('filters')}
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>

            {/* Results Count */}
            <span className="text-sm text-muted-foreground">
              {filteredVehicles.length} of {vehicles.length} vehicles
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) =>
                  startTransition(() => setSortBy(e.target.value as SortOption))
                }
                className="h-9 appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name_asc">Name: A to Z</option>
                <option value="name_desc">Name: Z to A</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>

            {/* Layout Toggle */}
            <div className="hidden items-center gap-1 rounded-md border p-1 sm:flex">
              <button
                onClick={() => setLayout('grid')}
                className={cn(
                  'rounded p-1.5 transition-colors',
                  layout === 'grid'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label="Grid view"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setLayout('list')}
                className={cn(
                  'rounded p-1.5 transition-colors',
                  layout === 'list'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters */}
        {activeFilterCount > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {selectedCategories.map((catId) => {
              const cat = categories.find((c) => c.id === catId);
              const name = cat?.name?.[locale as keyof LocalizedString] || cat?.name?.en || catId;
              return (
                <Badge key={catId} variant="secondary" className="gap-1">
                  {name}
                  <button
                    onClick={() =>
                      setSelectedCategories(selectedCategories.filter((c) => c !== catId))
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
            {selectedTransmission.map((t) => (
              <Badge key={t} variant="secondary" className="gap-1">
                {t === 'automatic' ? tVehicle('automatic') : tVehicle('manual')}
                <button
                  onClick={() =>
                    setSelectedTransmission(selectedTransmission.filter((v) => v !== t))
                  }
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {selectedFuel.map((f) => (
              <Badge key={f} variant="secondary" className="gap-1">
                {f}
                <button
                  onClick={() => setSelectedFuel(selectedFuel.filter((v) => v !== f))}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {minSeats > 0 && (
              <Badge variant="secondary" className="gap-1">
                {minSeats}+ {tVehicle('seats')}
                <button onClick={() => setMinSeats(0)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Results Grid/List */}
        {filteredVehicles.length === 0 ? (
          <div className="py-12 text-center">
            <p className="mb-4 text-muted-foreground">
              No vehicles match your filters
            </p>
            <Button variant="outline" onClick={clearFilters}>
              {tCommon('clearAll')} {tCommon('filters')}
            </Button>
          </div>
        ) : layout === 'grid' ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredVehicles.map((vehicle) => (
              <VehicleResultCard
                key={vehicle.id}
                vehicle={vehicle}
                category={vehicle.category}
                pricePerDay={prices[vehicle.id]}
                rentalDays={rentalDays}
                pickupAt={pickupAt}
                returnAt={returnAt}
                pickupBranchId={pickupBranchId}
                returnBranchId={returnBranchId}
                locale={locale}
                variant="grid"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredVehicles.map((vehicle) => (
              <VehicleResultCard
                key={vehicle.id}
                vehicle={vehicle}
                category={vehicle.category}
                pricePerDay={prices[vehicle.id]}
                rentalDays={rentalDays}
                pickupAt={pickupAt}
                returnAt={returnAt}
                pickupBranchId={pickupBranchId}
                returnBranchId={returnBranchId}
                locale={locale}
                variant="list"
              />
            ))}
          </div>
        )}
      </div>

      {/* Mobile Filters Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowFilters(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-auto rounded-t-xl bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{tCommon('filters')}</h2>
              <button onClick={() => setShowFilters(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <FiltersContent
              categories={categories}
              filterOptions={filterOptions}
              selectedCategories={selectedCategories}
              selectedTransmission={selectedTransmission}
              selectedFuel={selectedFuel}
              minSeats={minSeats}
              setSelectedCategories={setSelectedCategories}
              setSelectedTransmission={setSelectedTransmission}
              setSelectedFuel={setSelectedFuel}
              setMinSeats={setMinSeats}
              toggleFilter={toggleFilter}
              locale={locale}
            />

            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={clearFilters}>
                {tCommon('clearAll')}
              </Button>
              <Button className="flex-1" onClick={() => setShowFilters(false)}>
                Show {filteredVehicles.length} results
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Filters Content Component
function FiltersContent({
  categories,
  filterOptions,
  selectedCategories,
  selectedTransmission,
  selectedFuel,
  minSeats,
  setSelectedCategories,
  setSelectedTransmission,
  setSelectedFuel,
  setMinSeats,
  toggleFilter,
  locale,
}: {
  categories: VehicleCategory[];
  filterOptions: {
    transmissions: string[];
    fuels: string[];
    seatCounts: number[];
  };
  selectedCategories: string[];
  selectedTransmission: string[];
  selectedFuel: string[];
  minSeats: number;
  setSelectedCategories: (v: string[]) => void;
  setSelectedTransmission: (v: string[]) => void;
  setSelectedFuel: (v: string[]) => void;
  setMinSeats: (v: number) => void;
  toggleFilter: (
    value: string,
    selected: string[],
    setSelected: (v: string[]) => void
  ) => void;
  locale: string;
}) {
  const tVehicle = useTranslations('vehicle');

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      {categories.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium">{tVehicle('category')}</h3>
          <div className="space-y-2">
            {categories.map((cat) => {
              const name =
                cat.name?.[locale as keyof LocalizedString] || cat.name?.en || cat.id;
              const isSelected = selectedCategories.includes(cat.id);
              return (
                <label
                  key={cat.id}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() =>
                      toggleFilter(cat.id, selectedCategories, setSelectedCategories)
                    }
                  />
                  <span className="text-sm">{name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Transmission Filter */}
      {filterOptions.transmissions.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium">{tVehicle('transmission')}</h3>
          <div className="space-y-2">
            {filterOptions.transmissions.map((t) => {
              const isSelected = selectedTransmission.includes(t);
              return (
                <label key={t} className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() =>
                      toggleFilter(t, selectedTransmission, setSelectedTransmission)
                    }
                  />
                  <span className="text-sm">
                    {t === 'automatic' ? tVehicle('automatic') : tVehicle('manual')}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Fuel Type Filter */}
      {filterOptions.fuels.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium">{tVehicle('fuel')}</h3>
          <div className="space-y-2">
            {filterOptions.fuels.map((f) => {
              const isSelected = selectedFuel.includes(f);
              const fuelLabels: Record<string, string> = {
                petrol: tVehicle('petrol'),
                diesel: tVehicle('diesel'),
                electric: tVehicle('electric'),
                hybrid: tVehicle('hybrid'),
                plugin_hybrid: tVehicle('pluginHybrid'),
              };
              return (
                <label key={f} className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() =>
                      toggleFilter(f, selectedFuel, setSelectedFuel)
                    }
                  />
                  <span className="text-sm">{fuelLabels[f] || f}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Seats Filter */}
      {filterOptions.seatCounts.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium">{tVehicle('seats')}</h3>
          <div className="flex flex-wrap gap-2">
            {filterOptions.seatCounts.map((count) => (
              <button
                key={count}
                onClick={() => setMinSeats(minSeats === count ? 0 : count)}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm transition-colors',
                  minSeats === count
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input hover:border-primary'
                )}
              >
                {count}+
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Vehicle Result Card Component
function VehicleResultCard({
  vehicle,
  category,
  pricePerDay,
  rentalDays,
  pickupAt,
  returnAt,
  pickupBranchId,
  returnBranchId,
  locale,
  variant = 'grid',
}: {
  vehicle: Vehicle;
  category?: VehicleCategory;
  pricePerDay?: number;
  rentalDays: number;
  pickupAt: string;
  returnAt: string;
  pickupBranchId: string;
  returnBranchId: string;
  locale: string;
  variant?: 'grid' | 'list';
}) {
  const t = useTranslations('booking');
  const tVehicle = useTranslations('vehicle');

  // Photo
  const primaryPhoto = vehicle.photos?.find((p) => p.isPrimary) || vehicle.photos?.[0];
  const photoUrl = primaryPhoto?.url || '/images/vehicle-placeholder.jpg';

  // Category name
  const categoryName =
    category?.name?.[locale as keyof LocalizedString] || category?.name?.en || '';

  // Price formatting
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  // Total price
  const totalPrice = pricePerDay ? pricePerDay * rentalDays : 0;

  // Booking URL with params
  const bookingUrl = `/booking/${vehicle.id}?pickupAt=${encodeURIComponent(pickupAt)}&returnAt=${encodeURIComponent(returnAt)}&pickupBranch=${pickupBranchId}&returnBranch=${returnBranchId}`;

  // Specs
  const specs = [
    { icon: Users, value: vehicle.seats },
    { icon: Settings2, value: vehicle.transmission === 'automatic' ? 'Auto' : 'Manual' },
    { icon: Fuel, value: vehicle.fuel_type },
    { icon: DoorOpen, value: vehicle.doors },
  ];

  if (variant === 'list') {
    return (
      <div className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md sm:flex-row">
        {/* Image */}
        <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[4/3] sm:w-56 lg:w-72">
          <Image
            src={photoUrl}
            alt={`${vehicle.make} ${vehicle.model}`}
            fill
            loading="lazy"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 288px"
          />
          {categoryName && (
            <Badge className="absolute left-3 top-3" variant="secondary">
              {categoryName}
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <div className="mb-3">
            <h3 className="text-lg font-semibold">
              {vehicle.make} {vehicle.model}
            </h3>
            <p className="text-sm text-muted-foreground">{vehicle.year}</p>
          </div>

          <div className="mb-4 flex flex-wrap gap-3">
            {specs.map((spec, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-sm text-muted-foreground"
              >
                <spec.icon className="h-4 w-4" />
                <span>{spec.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto flex items-end justify-between">
            <div>
              {pricePerDay && (
                <>
                  <div className="text-2xl font-bold">{formatPrice(totalPrice)}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatPrice(pricePerDay)}/{tVehicle('perDay')} × {rentalDays} {rentalDays === 1 ? 'day' : 'days'}
                  </div>
                </>
              )}
            </div>
            <Button asChild>
              <Link href={bookingUrl}>
                {t('bookNow')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Grid variant
  return (
    <div className="group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-lg">
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
        {categoryName && (
          <Badge className="absolute left-3 top-3" variant="secondary">
            {categoryName}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="text-lg font-semibold">
            {vehicle.make} {vehicle.model}
          </h3>
          <p className="text-sm text-muted-foreground">{vehicle.year}</p>
        </div>

        {/* Specs Grid */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          {specs.map((spec, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm"
            >
              <spec.icon className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{spec.value}</span>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="border-t pt-4">
          {pricePerDay ? (
            <div className="mb-3">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold">{formatPrice(totalPrice)}</span>
                <span className="text-sm text-muted-foreground">
                  {rentalDays} {rentalDays === 1 ? 'day' : 'days'}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {formatPrice(pricePerDay)}/{tVehicle('perDay')}
              </div>
            </div>
          ) : (
            <div className="mb-3 text-muted-foreground">{t('priceFrom')}</div>
          )}

          <Button asChild className="w-full">
            <Link href={bookingUrl}>
              {t('bookThisVehicle')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
