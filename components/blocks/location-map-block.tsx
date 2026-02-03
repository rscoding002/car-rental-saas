'use client';

import { useState } from 'react';
import type { LocationMapBlockProps, LocationMapBlockLocaleContent } from '@/lib/cms/block-types';
import type { Branch } from '@/lib/supabase/types';
import { cn } from '@/lib/utils/cn';
import { MapPin, Phone, Mail, Clock, ChevronDown, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Extended props to accept branches data
interface LocationMapBlockExtendedProps extends LocationMapBlockProps {
  branches?: Branch[];
}

// Format operating hours for display
function formatHours(hours: Branch['operating_hours'], locale: string): string {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels: Record<string, Record<string, string>> = {
    en: { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' },
    lt: { monday: 'Pr', tuesday: 'An', wednesday: 'Tr', thursday: 'Kt', friday: 'Pn', saturday: 'Št', sunday: 'Sk' },
    ru: { monday: 'Пн', tuesday: 'Вт', wednesday: 'Ср', thursday: 'Чт', friday: 'Пт', saturday: 'Сб', sunday: 'Вс' },
  };

  const labels = dayLabels[locale] || dayLabels.en;

  // Find common hours pattern
  const weekdayHours = hours?.monday;
  if (!weekdayHours) return '';

  return `${labels.monday}-${labels.friday}: ${weekdayHours.open}-${weekdayHours.close}`;
}

// Branch Card Component
function BranchCard({
  branch,
  locale,
  isSelected,
  onSelect,
}: {
  branch: Branch;
  locale: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const hoursText = formatHours(branch.operating_hours, locale);

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left p-4 rounded-lg border transition-all',
        isSelected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-card hover:border-primary/50'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
            isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}
        >
          <MapPin className="w-5 h-5" />
        </div>
        <div className="flex-grow min-w-0">
          <h3 className="font-semibold text-foreground mb-1">{branch.name}</h3>
          <p className="text-sm text-muted-foreground truncate">{branch.address}</p>
          <p className="text-sm text-muted-foreground">{branch.city}</p>
          {hoursText && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {hoursText}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// Branch Details Panel
function BranchDetails({
  branch,
  locale,
}: {
  branch: Branch;
  locale: string;
}) {
  const getDirectionsUrl = () => {
    if (branch.latitude && branch.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${branch.address}, ${branch.city}`
    )}`;
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-xl font-semibold text-foreground mb-4">{branch.name}</h3>

      <div className="space-y-3 mb-6">
        <div className="flex items-start gap-3 text-muted-foreground">
          <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p>{branch.address}</p>
            <p>{branch.city}, {branch.country}</p>
          </div>
        </div>

        {branch.phone && (
          <a
            href={`tel:${branch.phone}`}
            className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
          >
            <Phone className="w-5 h-5 flex-shrink-0" />
            <span>{branch.phone}</span>
          </a>
        )}

        {branch.email && (
          <a
            href={`mailto:${branch.email}`}
            className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
          >
            <Mail className="w-5 h-5 flex-shrink-0" />
            <span>{branch.email}</span>
          </a>
        )}
      </div>

      <Button
        variant="primary"
        className="w-full"
        onClick={() => window.open(getDirectionsUrl(), '_blank')}
        rightIcon={<Navigation className="w-4 h-4" />}
      >
        {locale === 'lt' ? 'Gauti nuorodas' : locale === 'ru' ? 'Проложить маршрут' : 'Get Directions'}
      </Button>
    </div>
  );
}

export function LocationMapBlock({
  id,
  content,
  settings,
  locale,
  branches = [],
}: LocationMapBlockExtendedProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [showAllBranches, setShowAllBranches] = useState(false);

  // Get localized content with fallback to English
  const localeContent: LocationMapBlockLocaleContent | undefined =
    (content[locale as keyof typeof content] as LocationMapBlockLocaleContent | undefined) ||
    content.en;

  const { mapZoom = 12, mapStyle = 'default' } = content;

  // Filter branches
  let displayBranches = branches.filter(b => b.status === 'active');

  if (!content.showAllBranches && content.branchIds && content.branchIds.length > 0) {
    displayBranches = displayBranches.filter(b => content.branchIds!.includes(b.id));
  }

  // Get selected branch
  const selectedBranch = selectedBranchId
    ? displayBranches.find(b => b.id === selectedBranchId)
    : displayBranches[0];

  // Calculate map center
  const mapCenter = {
    lat: content.centerLat ?? selectedBranch?.latitude ?? 54.6872,
    lng: content.centerLng ?? selectedBranch?.longitude ?? 25.2797,
  };

  // Mobile: show limited branches initially
  const visibleBranches = showAllBranches ? displayBranches : displayBranches.slice(0, 3);

  // Generate static map URL (using OpenStreetMap for demo)
  const staticMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${
    mapCenter.lng - 0.05
  }%2C${mapCenter.lat - 0.03}%2C${mapCenter.lng + 0.05}%2C${
    mapCenter.lat + 0.03
  }&layer=mapnik&marker=${mapCenter.lat}%2C${mapCenter.lng}`;

  if (displayBranches.length === 0) {
    return (
      <section id={id} data-block-type="location_map" className="py-12 md:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {localeContent?.heading && (
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
              {localeContent.heading}
            </h2>
          )}
          <p className="text-muted-foreground">
            {locale === 'lt' ? 'Filialai nepasiekiami' : locale === 'ru' ? 'Филиалы недоступны' : 'No locations available'}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      id={id}
      data-block-type="location_map"
      className="py-12 md:py-16 lg:py-20 bg-background"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        {(localeContent?.heading || localeContent?.subheading) && (
          <div className="text-center mb-10 md:mb-12">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Branch List */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="space-y-3">
              {visibleBranches.map(branch => (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                  locale={locale}
                  isSelected={selectedBranch?.id === branch.id}
                  onSelect={() => setSelectedBranchId(branch.id)}
                />
              ))}
            </div>

            {/* Show More Button - Mobile */}
            {displayBranches.length > 3 && (
              <button
                onClick={() => setShowAllBranches(!showAllBranches)}
                className="w-full mt-4 py-2 text-sm text-primary hover:text-primary/80 flex items-center justify-center gap-1 lg:hidden"
              >
                {showAllBranches
                  ? (locale === 'lt' ? 'Rodyti mažiau' : locale === 'ru' ? 'Показать меньше' : 'Show less')
                  : (locale === 'lt' ? `Rodyti visus (${displayBranches.length})` : locale === 'ru' ? `Показать все (${displayBranches.length})` : `Show all (${displayBranches.length})`)}
                <ChevronDown className={cn('w-4 h-4 transition-transform', showAllBranches && 'rotate-180')} />
              </button>
            )}

            {/* Desktop: Show all branches */}
            <div className="hidden lg:block">
              {displayBranches.slice(3).map(branch => (
                <div key={branch.id} className="mt-3">
                  <BranchCard
                    branch={branch}
                    locale={locale}
                    isSelected={selectedBranch?.id === branch.id}
                    onSelect={() => setSelectedBranchId(branch.id)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Map Area */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <div className="rounded-xl overflow-hidden border border-border bg-muted">
              {/* Map Container */}
              <div className="relative aspect-[16/9] lg:aspect-[16/10]">
                <iframe
                  title="Location Map"
                  src={staticMapUrl}
                  className="absolute inset-0 w-full h-full"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />

                {/* Map Overlay with Selected Branch Info - Desktop */}
                {selectedBranch && (
                  <div className="absolute bottom-4 left-4 right-4 md:right-auto md:max-w-sm hidden md:block">
                    <BranchDetails branch={selectedBranch} locale={locale} />
                  </div>
                )}
              </div>
            </div>

            {/* Selected Branch Details - Mobile */}
            {selectedBranch && (
              <div className="mt-4 md:hidden">
                <BranchDetails branch={selectedBranch} locale={locale} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
