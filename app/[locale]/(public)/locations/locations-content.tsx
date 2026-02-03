'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Navigation,
  ChevronDown,
  ChevronUp,
  Search,
  Map,
  List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import type { Branch } from '@/lib/supabase/types';
import { BranchesMap } from '@/components/branches';
import {
  isBranchOpen,
  getTodayHours,
  formatOperatingHours,
  formatAllOperatingHours,
  type DayOfWeek,
} from '@/lib/branches/types';

interface LocationsContentProps {
  branches: Branch[];
  locale: string;
}

const DAY_LABELS: Record<string, Record<DayOfWeek, string>> = {
  en: {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  },
  lt: {
    monday: 'Pirmadienis',
    tuesday: 'Antradienis',
    wednesday: 'Trečiadienis',
    thursday: 'Ketvirtadienis',
    friday: 'Penktadienis',
    saturday: 'Šeštadienis',
    sunday: 'Sekmadienis',
  },
  ru: {
    monday: 'Понедельник',
    tuesday: 'Вторник',
    wednesday: 'Среда',
    thursday: 'Четверг',
    friday: 'Пятница',
    saturday: 'Суббота',
    sunday: 'Воскресенье',
  },
};

/**
 * Locations Content Component
 *
 * Displays branch cards with details, hours, and actions.
 */
export function LocationsContent({ branches, locale }: LocationsContentProps) {
  const t = useTranslations('branches');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Get unique cities
  const cities = useMemo(() => {
    const uniqueCities = [...new Set(branches.map((b) => b.city))].sort();
    return uniqueCities;
  }, [branches]);

  // Filter branches
  const filteredBranches = useMemo(() => {
    return branches.filter((branch) => {
      // Filter by city
      if (selectedCity !== 'all' && branch.city !== selectedCity) {
        return false;
      }

      // Filter by search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          branch.name.toLowerCase().includes(query) ||
          branch.city.toLowerCase().includes(query) ||
          branch.address.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [branches, selectedCity, searchQuery]);

  // Group branches by city
  const groupedBranches = useMemo(() => {
    return filteredBranches.reduce(
      (acc, branch) => {
        if (!acc[branch.city]) {
          acc[branch.city] = [];
        }
        acc[branch.city].push(branch);
        return acc;
      },
      {} as Record<string, Branch[]>
    );
  }, [filteredBranches]);

  const dayLabels = DAY_LABELS[locale] || DAY_LABELS.en;

  if (branches.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No locations available</h2>
        <p className="text-muted-foreground">
          Please check back later for our rental locations.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      {/* Filters */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('findBranch')}
            className="pl-10"
          />
        </div>

        {/* City Filter */}
        {cities.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            <Button
              variant={selectedCity === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCity('all')}
            >
              {t('allBranches')}
            </Button>
            {cities.map((city) => (
              <Button
                key={city}
                variant={selectedCity === city ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedCity(city)}
              >
                {city}
              </Button>
            ))}
          </div>
        )}

        {/* View Toggle */}
        <div className="flex gap-1 border rounded-lg p-1 bg-muted/50 sm:ml-auto">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">List</span>
          </Button>
          <Button
            variant={viewMode === 'map' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('map')}
            className="gap-2"
          >
            <Map className="h-4 w-4" />
            <span className="hidden sm:inline">Map</span>
          </Button>
        </div>
      </div>

      {/* Results count */}
      {searchQuery && (
        <p className="mb-4 text-sm text-muted-foreground">
          Found {filteredBranches.length} location{filteredBranches.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* No results */}
      {filteredBranches.length === 0 && (
        <div className="py-12 text-center">
          <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            No locations match your search. Try a different query.
          </p>
        </div>
      )}

      {/* Map View */}
      {viewMode === 'map' && filteredBranches.length > 0 && (
        <div className="mb-8">
          <BranchesMap
            branches={filteredBranches}
            locale={locale}
            height="500px"
            showBranchList={true}
          />
        </div>
      )}

      {/* List View - Branch Cards Grouped by City */}
      {viewMode === 'list' && Object.entries(groupedBranches)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([city, cityBranches]) => (
          <div key={city} className="mb-10">
            {/* City Header (only if showing multiple cities) */}
            {selectedCity === 'all' && cities.length > 1 && (
              <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                {city}
                <Badge variant="secondary" className="ml-2">
                  {cityBranches.length}
                </Badge>
              </h2>
            )}

            {/* Branch Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {cityBranches.map((branch) => (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                  locale={locale}
                  dayLabels={dayLabels}
                  t={t}
                />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

// Branch Card Component
function BranchCard({
  branch,
  locale,
  dayLabels,
  t,
}: {
  branch: Branch;
  locale: string;
  dayLabels: Record<DayOfWeek, string>;
  t: ReturnType<typeof useTranslations>;
}) {
  const [showAllHours, setShowAllHours] = useState(false);

  // Get status info
  const isOpen = branch.operating_hours ? isBranchOpen(branch.operating_hours) : null;
  const todayHours = branch.operating_hours ? getTodayHours(branch.operating_hours) : null;
  const allHours = branch.operating_hours ? formatAllOperatingHours(branch.operating_hours) : null;

  // Build Google Maps directions URL
  const getDirectionsUrl = () => {
    const address = encodeURIComponent(`${branch.address}, ${branch.city}, ${branch.country}`);
    if (branch.latitude && branch.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${address}`;
  };

  // Build Google Maps view URL
  const getMapUrl = () => {
    if (branch.latitude && branch.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${branch.latitude},${branch.longitude}`;
    }
    const address = encodeURIComponent(`${branch.address}, ${branch.city}, ${branch.country}`);
    return `https://www.google.com/maps/search/?api=1&query=${address}`;
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow">
      {/* Map Preview (if coordinates available) */}
      {branch.latitude && branch.longitude && (
        <a
          href={getMapUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="block h-32 bg-muted relative overflow-hidden group"
        >
          <img
            src={`https://maps.googleapis.com/maps/api/staticmap?center=${branch.latitude},${branch.longitude}&zoom=14&size=400x160&markers=color:red%7C${branch.latitude},${branch.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''}`}
            alt={`Map of ${branch.name}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            loading="lazy"
            onError={(e) => {
              // Hide image if map fails to load
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </a>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-semibold text-lg">{branch.name}</h3>
          {isOpen !== null && (
            <Badge variant={isOpen ? 'success' : 'secondary'} className="shrink-0">
              {isOpen ? t('openNow') : t('closedNow')}
            </Badge>
          )}
        </div>

        {/* Address */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p>{branch.address}</p>
            <p>{branch.city}, {branch.country}</p>
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-2 mb-4">
          {branch.phone && (
            <a
              href={`tel:${branch.phone}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="h-4 w-4" />
              {branch.phone}
            </a>
          )}
          {branch.email && (
            <a
              href={`mailto:${branch.email}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="h-4 w-4" />
              {branch.email}
            </a>
          )}
        </div>

        {/* Operating Hours */}
        {allHours && (
          <div className="border-t pt-4">
            <button
              onClick={() => setShowAllHours(!showAllHours)}
              className="flex items-center justify-between w-full text-sm"
            >
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t('operatingHours')}</span>
              </span>
              {showAllHours ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {/* Today's Hours (always shown) */}
            {!showAllHours && todayHours !== undefined && (
              <p className="mt-2 text-sm text-muted-foreground pl-6">
                Today: {formatOperatingHours(todayHours)}
              </p>
            )}

            {/* All Hours (expandable) */}
            {showAllHours && (
              <div className="mt-3 space-y-1 pl-6">
                {(Object.entries(allHours) as [DayOfWeek, string][]).map(([day, hours]) => (
                  <div
                    key={day}
                    className={cn(
                      'flex justify-between text-sm',
                      hours === 'Closed' ? 'text-muted-foreground' : ''
                    )}
                  >
                    <span>{dayLabels[day]}</span>
                    <span className={hours === 'Closed' ? '' : 'font-medium'}>
                      {hours}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            asChild
          >
            <a href={getMapUrl()} target="_blank" rel="noopener noreferrer">
              <MapPin className="h-4 w-4 mr-2" />
              {t('viewOnMap')}
            </a>
          </Button>
          <Button
            size="sm"
            className="flex-1"
            asChild
          >
            <a href={getDirectionsUrl()} target="_blank" rel="noopener noreferrer">
              <Navigation className="h-4 w-4 mr-2" />
              {t('getDirections')}
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
