'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import {
  MapPin,
  Calendar,
  Clock,
  Search,
  ArrowRight,
  ArrowLeftRight,
  ChevronDown,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils/cn';

interface SearchWidgetProps {
  /** Additional class names */
  className?: string;
  /** Layout variant */
  variant?: 'horizontal' | 'vertical' | 'compact';
  /** Whether to show the title */
  showTitle?: boolean;
  /** Available branches for location selection */
  branches?: Array<{ id: string; name: string; city: string }>;
}

/**
 * Booking Search Widget Component
 *
 * Search form for finding available vehicles.
 * Mobile-first responsive design with multiple layout variants.
 *
 * Features:
 * - Pickup and return location selection
 * - Date and time pickers
 * - Same/different return location toggle
 * - Responsive layout variants
 * - Form validation
 */
export function SearchWidget({
  className,
  variant = 'horizontal',
  showTitle = true,
  branches = [],
}: SearchWidgetProps) {
  const t = useTranslations('booking');
  const locale = useLocale();
  const router = useRouter();

  // Form state
  const [pickupLocation, setPickupLocation] = useState('');
  const [returnLocation, setReturnLocation] = useState('');
  const [sameLocation, setSameLocation] = useState(true);
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('10:00');
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('10:00');
  const [isSearching, setIsSearching] = useState(false);

  // Default branches if none provided
  const locationOptions = branches.length > 0 ? branches : [
    { id: '1', name: 'Vilnius Airport', city: 'Vilnius' },
    { id: '2', name: 'Vilnius City Center', city: 'Vilnius' },
    { id: '3', name: 'Kaunas Airport', city: 'Kaunas' },
    { id: '4', name: 'Klaipėda Port', city: 'Klaipėda' },
  ];

  // Generate time options (every 30 minutes)
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of ['00', '30']) {
      const time = `${hour.toString().padStart(2, '0')}:${minute}`;
      timeOptions.push(time);
    }
  }

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  // Get minimum return date (pickup date or today)
  const minReturnDate = pickupDate || today;

  // Handle same location toggle
  const handleSameLocationChange = useCallback((checked: boolean) => {
    setSameLocation(checked);
    if (checked) {
      setReturnLocation(pickupLocation);
    }
  }, [pickupLocation]);

  // Handle pickup location change
  const handlePickupLocationChange = useCallback((value: string) => {
    setPickupLocation(value);
    if (sameLocation) {
      setReturnLocation(value);
    }
  }, [sameLocation]);

  // Handle search submit
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pickupLocation || !pickupDate || !returnDate) {
      return;
    }

    setIsSearching(true);

    // Build search params
    const params = new URLSearchParams({
      pickup: pickupLocation,
      return: sameLocation ? pickupLocation : returnLocation,
      pickupDate,
      pickupTime,
      returnDate,
      returnTime,
    });

    // Navigate to search results
    router.push(`/${locale}/booking?${params.toString()}`);
  };

  // Render location select
  const renderLocationSelect = (
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    id: string
  ) => (
    <div className="relative">
      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-12 w-full appearance-none rounded-lg border border-input bg-background pl-10 pr-10 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          !value && 'text-muted-foreground'
        )}
        required
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {locationOptions.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name} - {branch.city}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );

  // Render date input
  const renderDateInput = (
    value: string,
    onChange: (value: string) => void,
    min: string,
    id: string,
    label: string
  ) => (
    <div className="relative">
      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="date"
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        className={cn(
          'h-12 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
          '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
          !value && 'text-muted-foreground'
        )}
        required
        aria-label={label}
      />
    </div>
  );

  // Render time select
  const renderTimeSelect = (
    value: string,
    onChange: (value: string) => void,
    id: string,
    label: string
  ) => (
    <div className="relative">
      <Clock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-12 w-full appearance-none rounded-lg border border-input bg-background pl-10 pr-10 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
        )}
        aria-label={label}
      >
        {timeOptions.map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );

  // Vertical layout (default for mobile)
  if (variant === 'vertical') {
    return (
      <div className={cn('rounded-xl bg-card p-6 shadow-lg', className)}>
        {showTitle && (
          <h2 className="mb-6 text-xl font-semibold">{t('searchTitle')}</h2>
        )}

        <form onSubmit={handleSearch} className="space-y-4">
          {/* Pickup Location */}
          <div>
            <label htmlFor="pickup-location" className="mb-2 block text-sm font-medium">
              {t('pickupLocation')}
            </label>
            {renderLocationSelect(
              pickupLocation,
              handlePickupLocationChange,
              t('selectLocation'),
              'pickup-location'
            )}
          </div>

          {/* Same Location Toggle */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="same-location"
              checked={sameLocation}
              onCheckedChange={handleSameLocationChange}
            />
            <label htmlFor="same-location" className="text-sm cursor-pointer">
              {t('sameLocation')}
            </label>
          </div>

          {/* Return Location (if different) */}
          {!sameLocation && (
            <div>
              <label htmlFor="return-location" className="mb-2 block text-sm font-medium">
                {t('returnLocation')}
              </label>
              {renderLocationSelect(
                returnLocation,
                setReturnLocation,
                t('selectLocation'),
                'return-location'
              )}
            </div>
          )}

          {/* Pickup Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pickup-date" className="mb-2 block text-sm font-medium">
                {t('pickupDate')}
              </label>
              {renderDateInput(pickupDate, setPickupDate, today, 'pickup-date', t('pickupDate'))}
            </div>
            <div>
              <label htmlFor="pickup-time" className="mb-2 block text-sm font-medium">
                {t('pickupTime')}
              </label>
              {renderTimeSelect(pickupTime, setPickupTime, 'pickup-time', t('pickupTime'))}
            </div>
          </div>

          {/* Return Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="return-date" className="mb-2 block text-sm font-medium">
                {t('returnDate')}
              </label>
              {renderDateInput(returnDate, setReturnDate, minReturnDate, 'return-date', t('returnDate'))}
            </div>
            <div>
              <label htmlFor="return-time" className="mb-2 block text-sm font-medium">
                {t('returnTime')}
              </label>
              {renderTimeSelect(returnTime, setReturnTime, 'return-time', t('returnTime'))}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSearching || !pickupLocation || !pickupDate || !returnDate}
            isLoading={isSearching}
          >
            <Search className="mr-2 h-5 w-5" />
            {t('searchVehicles')}
          </Button>
        </form>
      </div>
    );
  }

  // Compact layout (for embedding in hero sections)
  if (variant === 'compact') {
    return (
      <div className={cn('rounded-xl bg-card p-4 shadow-lg', className)}>
        <form onSubmit={handleSearch} className="space-y-3">
          {/* Location Row */}
          <div className="flex items-center gap-2">
            {renderLocationSelect(
              pickupLocation,
              handlePickupLocationChange,
              t('pickupLocation'),
              'compact-pickup-location'
            )}
            {!sameLocation && (
              <>
                <ArrowRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                {renderLocationSelect(
                  returnLocation,
                  setReturnLocation,
                  t('returnLocation'),
                  'compact-return-location'
                )}
              </>
            )}
          </div>

          {/* Date/Time Row */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {renderDateInput(pickupDate, setPickupDate, today, 'compact-pickup-date', t('pickupDate'))}
            {renderTimeSelect(pickupTime, setPickupTime, 'compact-pickup-time', t('pickupTime'))}
            {renderDateInput(returnDate, setReturnDate, minReturnDate, 'compact-return-date', t('returnDate'))}
            {renderTimeSelect(returnTime, setReturnTime, 'compact-return-time', t('returnTime'))}
          </div>

          {/* Actions Row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="compact-same-location"
                checked={sameLocation}
                onCheckedChange={handleSameLocationChange}
              />
              <label htmlFor="compact-same-location" className="text-sm cursor-pointer">
                {t('sameLocation')}
              </label>
            </div>
            <Button
              type="submit"
              disabled={isSearching || !pickupLocation || !pickupDate || !returnDate}
              isLoading={isSearching}
            >
              <Search className="mr-2 h-4 w-4" />
              {t('searchVehicles')}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // Horizontal layout (default for desktop)
  return (
    <div className={cn('rounded-xl bg-card p-6 shadow-lg', className)}>
      {showTitle && (
        <h2 className="mb-6 text-xl font-semibold">{t('searchTitle')}</h2>
      )}

      <form onSubmit={handleSearch}>
        {/* Main Grid */}
        <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
          {/* Pickup Location */}
          <div className="lg:col-span-3">
            <label htmlFor="h-pickup-location" className="mb-2 block text-sm font-medium">
              {t('pickupLocation')}
            </label>
            {renderLocationSelect(
              pickupLocation,
              handlePickupLocationChange,
              t('selectLocation'),
              'h-pickup-location'
            )}
          </div>

          {/* Return Location */}
          <div className={cn('lg:col-span-3', sameLocation && 'hidden lg:block lg:opacity-50')}>
            <label htmlFor="h-return-location" className="mb-2 block text-sm font-medium">
              {t('returnLocation')}
            </label>
            {renderLocationSelect(
              sameLocation ? pickupLocation : returnLocation,
              setReturnLocation,
              t('selectLocation'),
              'h-return-location'
            )}
          </div>

          {/* Pickup Date & Time */}
          <div className="grid grid-cols-2 gap-2 lg:col-span-2">
            <div>
              <label htmlFor="h-pickup-date" className="mb-2 block text-sm font-medium">
                {t('pickupDate')}
              </label>
              {renderDateInput(pickupDate, setPickupDate, today, 'h-pickup-date', t('pickupDate'))}
            </div>
            <div>
              <label htmlFor="h-pickup-time" className="mb-2 block text-sm font-medium">
                {t('pickupTime')}
              </label>
              {renderTimeSelect(pickupTime, setPickupTime, 'h-pickup-time', t('pickupTime'))}
            </div>
          </div>

          {/* Return Date & Time */}
          <div className="grid grid-cols-2 gap-2 lg:col-span-2">
            <div>
              <label htmlFor="h-return-date" className="mb-2 block text-sm font-medium">
                {t('returnDate')}
              </label>
              {renderDateInput(returnDate, setReturnDate, minReturnDate, 'h-return-date', t('returnDate'))}
            </div>
            <div>
              <label htmlFor="h-return-time" className="mb-2 block text-sm font-medium">
                {t('returnTime')}
              </label>
              {renderTimeSelect(returnTime, setReturnTime, 'h-return-time', t('returnTime'))}
            </div>
          </div>

          {/* Search Button */}
          <div className="lg:col-span-2">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSearching || !pickupLocation || !pickupDate || !returnDate}
              isLoading={isSearching}
            >
              <Search className="mr-2 h-5 w-5" />
              <span className="hidden sm:inline">{t('searchVehicles')}</span>
              <span className="sm:hidden">{t('searchVehicles')}</span>
            </Button>
          </div>
        </div>

        {/* Same Location Toggle */}
        <div className="mt-4 flex items-center gap-2">
          <Checkbox
            id="h-same-location"
            checked={sameLocation}
            onCheckedChange={handleSameLocationChange}
          />
          <label htmlFor="h-same-location" className="text-sm cursor-pointer">
            {t('sameLocation')}
          </label>
          {!sameLocation && (
            <span className="ml-2 flex items-center gap-1 text-sm text-muted-foreground">
              <ArrowLeftRight className="h-4 w-4" />
              {t('differentLocation')}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
