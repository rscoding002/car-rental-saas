'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Check,
  X,
  Clock,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  isAfter,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
} from 'date-fns';
import { enUS, lt, ru } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

// Booking period representing unavailable dates
export interface BookingPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  status?: 'confirmed' | 'pending' | 'maintenance';
}

// Date status for calendar display
type DateStatus = 'available' | 'unavailable' | 'partial' | 'past' | 'today';

interface AvailabilityCalendarProps {
  /** Booked/unavailable periods */
  bookings?: BookingPeriod[];
  /** Maintenance/blocked periods */
  blockedDates?: BookingPeriod[];
  /** Minimum selectable date (defaults to today) */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Number of months to show */
  monthsToShow?: 1 | 2;
  /** Selected start date */
  selectedStartDate?: Date | null;
  /** Selected end date */
  selectedEndDate?: Date | null;
  /** Callback when date is selected */
  onDateSelect?: (date: Date) => void;
  /** Callback when date range is selected */
  onRangeSelect?: (start: Date, end: Date) => void;
  /** Enable date range selection */
  enableRangeSelection?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Current locale */
  locale?: string;
  /** Additional class names */
  className?: string;
}

// Get date-fns locale
function getDateLocale(locale: string) {
  switch (locale) {
    case 'lt':
      return lt;
    case 'ru':
      return ru;
    default:
      return enUS;
  }
}

/**
 * Availability Calendar Component
 *
 * Displays a calendar showing vehicle availability.
 * Mobile-first responsive design.
 *
 * Features:
 * - Monthly view with navigation
 * - Available/unavailable date highlighting
 * - Date range selection
 * - Localized day/month names
 * - Legend for date statuses
 */
export function AvailabilityCalendar({
  bookings = [],
  blockedDates = [],
  minDate,
  maxDate,
  monthsToShow = 1,
  selectedStartDate,
  selectedEndDate,
  onDateSelect,
  onRangeSelect,
  enableRangeSelection = false,
  showLegend = true,
  locale = 'en',
  className,
}: AvailabilityCalendarProps) {
  const t = useTranslations('booking');
  const tVehicle = useTranslations('vehicle');

  const dateLocale = getDateLocale(locale);
  const today = new Date();
  const effectiveMinDate = minDate || today;

  // Current displayed month
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(today));

  // Selection state for range
  const [rangeStart, setRangeStart] = useState<Date | null>(
    selectedStartDate || null
  );
  const [rangeEnd, setRangeEnd] = useState<Date | null>(selectedEndDate || null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // All unavailable periods (bookings + blocked)
  const unavailablePeriods = useMemo(() => {
    return [...bookings, ...blockedDates];
  }, [bookings, blockedDates]);

  // Check if a date is unavailable
  const isDateUnavailable = (date: Date): boolean => {
    return unavailablePeriods.some((period) =>
      isWithinInterval(date, { start: period.startDate, end: period.endDate })
    );
  };

  // Get date status
  const getDateStatus = (date: Date): DateStatus => {
    if (isBefore(date, effectiveMinDate) && !isSameDay(date, effectiveMinDate)) {
      return 'past';
    }
    if (maxDate && isAfter(date, maxDate)) {
      return 'past';
    }
    if (isToday(date)) {
      return 'today';
    }
    if (isDateUnavailable(date)) {
      return 'unavailable';
    }
    return 'available';
  };

  // Check if date is in selected range
  const isInSelectedRange = (date: Date): boolean => {
    if (!rangeStart) return false;
    if (!rangeEnd && !hoverDate) return isSameDay(date, rangeStart);

    const end = rangeEnd || hoverDate;
    if (!end) return false;

    const start = rangeStart < end ? rangeStart : end;
    const endDate = rangeStart < end ? end : rangeStart;

    return isWithinInterval(date, { start, end: endDate });
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    const status = getDateStatus(date);
    if (status === 'past' || status === 'unavailable') return;

    if (enableRangeSelection) {
      if (!rangeStart || rangeEnd) {
        // Start new selection
        setRangeStart(date);
        setRangeEnd(null);
      } else {
        // Complete selection
        const start = rangeStart < date ? rangeStart : date;
        const end = rangeStart < date ? date : rangeStart;

        // Check if range contains unavailable dates
        const daysInRange = eachDayOfInterval({ start, end });
        const hasUnavailable = daysInRange.some(isDateUnavailable);

        if (hasUnavailable) {
          // Reset and start new selection
          setRangeStart(date);
          setRangeEnd(null);
        } else {
          setRangeEnd(end);
          onRangeSelect?.(start, end);
        }
      }
    } else {
      onDateSelect?.(date);
    }
  };

  // Navigate months
  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Generate calendar days
  const generateCalendarDays = (month: Date) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  // Get weekday headers
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 1; i <= 7; i++) {
      const day = new Date(2024, 0, i); // Jan 1, 2024 is Monday
      days.push(format(day, 'EEEEEE', { locale: dateLocale }));
    }
    return days;
  }, [dateLocale]);

  // Render single month
  const renderMonth = (month: Date) => {
    const days = generateCalendarDays(month);

    return (
      <div className="flex-1">
        {/* Month Header */}
        <div className="mb-4 text-center font-semibold">
          {format(month, 'LLLL yyyy', { locale: dateLocale })}
        </div>

        {/* Weekday Headers */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {weekDays.map((day, i) => (
            <div
              key={i}
              className="py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const status = getDateStatus(day);
            const isCurrentMonth = isSameMonth(day, month);
            const isSelected = isInSelectedRange(day);
            const isRangeStart = rangeStart && isSameDay(day, rangeStart);
            const isRangeEnd = rangeEnd && isSameDay(day, rangeEnd);

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleDateClick(day)}
                onMouseEnter={() => enableRangeSelection && setHoverDate(day)}
                onMouseLeave={() => setHoverDate(null)}
                disabled={status === 'past' || status === 'unavailable'}
                className={cn(
                  'relative h-10 w-full rounded-lg text-sm transition-colors',
                  // Base states
                  !isCurrentMonth && 'opacity-30',
                  status === 'past' && 'cursor-not-allowed text-muted-foreground opacity-50',
                  status === 'unavailable' &&
                    'cursor-not-allowed bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
                  status === 'available' &&
                    isCurrentMonth &&
                    'hover:bg-primary/10 cursor-pointer',
                  status === 'today' &&
                    'font-bold ring-1 ring-primary',
                  // Selection states
                  isSelected &&
                    status !== 'unavailable' &&
                    'bg-primary/20',
                  isRangeStart && 'bg-primary text-primary-foreground rounded-l-lg',
                  isRangeEnd && 'bg-primary text-primary-foreground rounded-r-lg',
                  isRangeStart && isRangeEnd && 'rounded-lg'
                )}
              >
                {format(day, 'd')}
                {/* Unavailable indicator dot */}
                {status === 'unavailable' && isCurrentMonth && (
                  <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-red-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('rounded-xl border bg-card p-4', className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">{tVehicle('availability')}</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrevMonth}
            disabled={isSameMonth(currentMonth, effectiveMinDate)}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextMonth}
            disabled={maxDate && isSameMonth(currentMonth, maxDate)}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid(s) */}
      <div
        className={cn(
          'flex gap-6',
          monthsToShow === 1 ? 'flex-col' : 'flex-col lg:flex-row'
        )}
      >
        {renderMonth(currentMonth)}
        {monthsToShow === 2 && renderMonth(addMonths(currentMonth, 1))}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="mt-4 flex flex-wrap gap-4 border-t pt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-background border" />
            <span>{tVehicle('available')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-red-100 dark:bg-red-900/30" />
            <span>{tVehicle('unavailable')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-primary" />
            <span>{t('selectedDates') || 'Selected'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border ring-1 ring-primary" />
            <span>Today</span>
          </div>
        </div>
      )}

      {/* Selected Range Display */}
      {enableRangeSelection && rangeStart && (
        <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {rangeEnd ? (
                <>
                  {format(rangeStart, 'PPP', { locale: dateLocale })} –{' '}
                  {format(rangeEnd, 'PPP', { locale: dateLocale })}
                </>
              ) : (
                <>
                  {format(rangeStart, 'PPP', { locale: dateLocale })} –{' '}
                  <span className="text-muted-foreground">Select end date</span>
                </>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact availability indicator for listings
 */
export function AvailabilityIndicator({
  isAvailable,
  nextAvailableDate,
  locale = 'en',
  className,
}: {
  isAvailable: boolean;
  nextAvailableDate?: Date;
  locale?: string;
  className?: string;
}) {
  const t = useTranslations('vehicle');
  const dateLocale = getDateLocale(locale);

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm',
        isAvailable ? 'text-green-600' : 'text-amber-600',
        className
      )}
    >
      {isAvailable ? (
        <>
          <Check className="h-4 w-4" />
          <span>{t('available')}</span>
        </>
      ) : (
        <>
          <X className="h-4 w-4" />
          <span>
            {nextAvailableDate
              ? `Available ${format(nextAvailableDate, 'MMM d', { locale: dateLocale })}`
              : t('unavailable')}
          </span>
        </>
      )}
    </div>
  );
}
