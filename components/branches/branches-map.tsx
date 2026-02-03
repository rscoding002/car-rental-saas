'use client';

import { useState, useMemo, useCallback } from 'react';
import { MapPin, Navigation, Phone, Clock, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import type { Branch } from '@/lib/supabase/types';
import { isBranchOpen, getTodayHours, formatOperatingHours } from '@/lib/branches/types';

interface BranchesMapProps {
  /** Branches to display on the map */
  branches: Branch[];
  /** Current locale */
  locale: string;
  /** Initial selected branch ID */
  selectedBranchId?: string;
  /** Callback when a branch is selected */
  onBranchSelect?: (branchId: string) => void;
  /** Map height */
  height?: string;
  /** Additional class names */
  className?: string;
  /** Show branch list alongside map */
  showBranchList?: boolean;
}

/**
 * Branches Map Component
 *
 * Displays branches on an interactive map with markers and popups.
 * Uses OpenStreetMap embed for free, no-API-key-required mapping.
 *
 * Features:
 * - Shows all branch locations on map
 * - Clickable branch cards to focus on location
 * - Branch details popup
 * - Get directions link
 * - Mobile-responsive layout
 */
export function BranchesMap({
  branches,
  locale,
  selectedBranchId,
  onBranchSelect,
  height = '400px',
  className,
  showBranchList = true,
}: BranchesMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(selectedBranchId || null);
  const [showPopup, setShowPopup] = useState(false);

  // Filter branches with coordinates
  const mappableBranches = useMemo(() => {
    return branches.filter((b) => b.latitude && b.longitude && b.status === 'active');
  }, [branches]);

  // Get selected branch
  const selectedBranch = useMemo(() => {
    return mappableBranches.find((b) => b.id === selectedId) || mappableBranches[0];
  }, [mappableBranches, selectedId]);

  // Calculate map bounds to show all branches
  const mapBounds = useMemo(() => {
    if (mappableBranches.length === 0) {
      // Default to Lithuania center
      return { lat: 54.6872, lng: 25.2797, zoom: 7 };
    }

    if (mappableBranches.length === 1) {
      const b = mappableBranches[0];
      return { lat: b.latitude!, lng: b.longitude!, zoom: 14 };
    }

    // Calculate bounding box
    const lats = mappableBranches.map((b) => b.latitude!);
    const lngs = mappableBranches.map((b) => b.longitude!);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Center of bounding box
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // Estimate zoom level based on span
    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;
    const maxSpan = Math.max(latSpan, lngSpan);

    let zoom = 12;
    if (maxSpan > 2) zoom = 6;
    else if (maxSpan > 1) zoom = 7;
    else if (maxSpan > 0.5) zoom = 8;
    else if (maxSpan > 0.2) zoom = 9;
    else if (maxSpan > 0.1) zoom = 10;
    else if (maxSpan > 0.05) zoom = 11;

    return { lat: centerLat, lng: centerLng, zoom };
  }, [mappableBranches]);

  // Generate OpenStreetMap embed URL
  const mapUrl = useMemo(() => {
    if (selectedBranch) {
      const lat = selectedBranch.latitude!;
      const lng = selectedBranch.longitude!;
      const bbox = `${lng - 0.02},${lat - 0.01},${lng + 0.02},${lat + 0.01}`;
      return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
    }

    const { lat, lng, zoom } = mapBounds;
    const span = 0.05 * Math.pow(2, 12 - zoom);
    const bbox = `${lng - span},${lat - span / 2},${lng + span},${lat + span / 2}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;
  }, [selectedBranch, mapBounds]);

  // Generate Google Maps URL for all branches
  const googleMapsUrl = useMemo(() => {
    if (mappableBranches.length === 0) return null;

    if (mappableBranches.length === 1) {
      const b = mappableBranches[0];
      return `https://www.google.com/maps/search/?api=1&query=${b.latitude},${b.longitude}`;
    }

    // For multiple locations, use the search with coordinates
    const { lat, lng } = mapBounds;
    return `https://www.google.com/maps/@${lat},${lng},${mapBounds.zoom}z`;
  }, [mappableBranches, mapBounds]);

  // Handle branch selection
  const handleSelectBranch = useCallback((branchId: string) => {
    setSelectedId(branchId);
    setShowPopup(true);
    onBranchSelect?.(branchId);
  }, [onBranchSelect]);

  // Get directions URL
  const getDirectionsUrl = (branch: Branch) => {
    if (branch.latitude && branch.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      `${branch.address}, ${branch.city}, ${branch.country}`
    )}`;
  };

  if (mappableBranches.length === 0) {
    return (
      <div
        className={cn(
          'rounded-xl border bg-muted/50 flex items-center justify-center',
          className
        )}
        style={{ height }}
      >
        <div className="text-center text-muted-foreground p-6">
          <MapPin className="mx-auto h-10 w-10 mb-3 opacity-50" />
          <p>No locations with map coordinates available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <div className={cn('grid gap-4', showBranchList ? 'lg:grid-cols-3' : '')}>
        {/* Branch List - Left Side */}
        {showBranchList && (
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {mappableBranches.map((branch) => {
                const isOpen = branch.operating_hours
                  ? isBranchOpen(branch.operating_hours)
                  : null;
                const isSelected = branch.id === selectedId;

                return (
                  <button
                    key={branch.id}
                    onClick={() => handleSelectBranch(branch.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-card hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-medium text-sm truncate">
                            {branch.name}
                          </h4>
                          {isOpen !== null && (
                            <span
                              className={cn(
                                'text-xs px-1.5 py-0.5 rounded-full shrink-0',
                                isOpen
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {isOpen ? 'Open' : 'Closed'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {branch.city}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Map - Right Side */}
        <div
          className={cn(
            'relative rounded-xl overflow-hidden border bg-muted',
            showBranchList ? 'lg:col-span-2 order-1 lg:order-2' : ''
          )}
          style={{ height }}
        >
          {/* Map iframe */}
          <iframe
            title="Branches Map"
            src={mapUrl}
            className="absolute inset-0 w-full h-full"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />

          {/* Open in Google Maps button */}
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-3 right-3 z-10"
            >
              <Button variant="secondary" size="sm" className="shadow-md">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Maps
              </Button>
            </a>
          )}

          {/* Selected Branch Popup */}
          {showPopup && selectedBranch && (
            <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-sm z-10">
              <div className="bg-card rounded-lg border shadow-lg p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h4 className="font-semibold">{selectedBranch.name}</h4>
                  <button
                    onClick={() => setShowPopup(false)}
                    className="p-1 rounded-md hover:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      {selectedBranch.address}, {selectedBranch.city}
                    </span>
                  </div>
                  {selectedBranch.phone && (
                    <a
                      href={`tel:${selectedBranch.phone}`}
                      className="flex items-center gap-2 hover:text-foreground"
                    >
                      <Phone className="w-4 h-4" />
                      {selectedBranch.phone}
                    </a>
                  )}
                  {selectedBranch.operating_hours && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        Today:{' '}
                        {formatOperatingHours(
                          getTodayHours(selectedBranch.operating_hours)
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <Button size="sm" className="w-full" asChild>
                  <a
                    href={getDirectionsUrl(selectedBranch)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Get Directions
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Mini map for showing a single branch location
 */
export function BranchMiniMap({
  branch,
  height = '200px',
  className,
}: {
  branch: Branch;
  height?: string;
  className?: string;
}) {
  if (!branch.latitude || !branch.longitude) {
    return null;
  }

  const lat = branch.latitude;
  const lng = branch.longitude;
  const bbox = `${lng - 0.01},${lat - 0.005},${lng + 0.01},${lat + 0.005}`;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <a
      href={googleMapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'block rounded-lg overflow-hidden border bg-muted relative group',
        className
      )}
      style={{ height }}
    >
      <iframe
        title={`Map of ${branch.name}`}
        src={mapUrl}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ border: 0 }}
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
        <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 px-3 py-1.5 rounded-md text-sm font-medium">
          View on Google Maps
        </span>
      </div>
    </a>
  );
}
