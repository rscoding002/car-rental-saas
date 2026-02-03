'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Car,
  User,
  MapPin,
  Clock,
  ArrowRight,
  List,
  Grid3X3,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';
import type { BookingStatus } from '@/lib/supabase/types';

// ============================================================================
// TYPES
// ============================================================================

export interface CalendarBooking {
  id: string;
  reference: string;
  pickupAt: string;
  returnAt: string;
  status: BookingStatus;
  customerName: string | null;
  customerEmail: string | null;
  vehicleName: string;
  vehiclePhoto: string | null;
  pickupBranch: string;
  returnBranch: string;
  isOneWay: boolean;
  total: number;
  currency: string;
}

export interface BookingCalendarProps {
  locale: string;
  onBookingClick?: (bookingId: string) => void;
  className?: string;
}

type ViewMode = 'month' | 'week';

// ============================================================================
// CONSTANTS
// ============================================================================

const DAYS_OF_WEEK_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_OF_WEEK_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: 'bg-yellow-500 hover:bg-yellow-600',
  confirmed: 'bg-green-500 hover:bg-green-600',
  active: 'bg-blue-500 hover:bg-blue-600',
  completed: 'bg-gray-400 hover:bg-gray-500',
  cancelled: 'bg-red-400 hover:bg-red-500',
};

const STATUS_BADGE_VARIANTS: Record<BookingStatus, 'success' | 'warning' | 'destructive' | 'secondary' | 'default'> = {
  pending: 'warning',
  confirmed: 'success',
  active: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getWeekDates(date: Date): Date[] {
  const dates: Date[] = [];
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }

  return dates;
}

function getMonthDates(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];

  // Fill in empty days before the first day
  for (let i = 0; i < firstDay.getDay(); i++) {
    currentWeek.push(null);
  }

  // Fill in the days of the month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    currentWeek.push(new Date(year, month, day));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Fill in empty days after the last day
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

function dateToString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatTime(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BookingCalendar({
  locale,
  onBookingClick,
  className,
}: BookingCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<BookingStatus | ''>('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calculate date range based on view mode
  const getDateRange = () => {
    if (viewMode === 'week') {
      const weekDates = getWeekDates(currentDate);
      return {
        start: dateToString(weekDates[0]),
        end: dateToString(weekDates[6]),
      };
    } else {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      // Extend to show full weeks
      const start = new Date(firstDay);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(lastDay);
      end.setDate(end.getDate() + (6 - end.getDay()));
      return {
        start: dateToString(start),
        end: dateToString(end),
      };
    }
  };

  const { start, end } = getDateRange();

  // Fetch bookings
  useEffect(() => {
    async function fetchBookings() {
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          dateFrom: `${start}T00:00:00.000Z`,
          dateTo: `${end}T23:59:59.999Z`,
          pageSize: '200', // Get all bookings for the period
        });

        if (statusFilter) {
          params.set('status', statusFilter);
        }

        const response = await fetch(`/api/admin/bookings?${params}`);
        if (response.ok) {
          const data = await response.json();
          setBookings(data.bookings || []);
        }
      } catch (error) {
        console.error('Error fetching bookings:', error);
      }

      setIsLoading(false);
    }

    fetchBookings();
  }, [start, end, statusFilter]);

  // Get bookings for a specific date
  const getBookingsForDate = (date: Date) => {
    const dateStr = dateToString(date);
    return bookings.filter((booking) => {
      const pickup = booking.pickupAt.split('T')[0];
      const returnDate = booking.returnAt.split('T')[0];
      return pickup <= dateStr && returnDate >= dateStr;
    });
  };

  // Check if date has pickup or return
  const getDateEvents = (date: Date) => {
    const dateStr = dateToString(date);
    const pickups = bookings.filter((b) => b.pickupAt.split('T')[0] === dateStr);
    const returns = bookings.filter((b) => b.returnAt.split('T')[0] === dateStr);
    return { pickups, returns };
  };

  // Navigation
  const navigate = (direction: number) => {
    startTransition(() => {
      if (viewMode === 'week') {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + direction * 7);
        setCurrentDate(newDate);
      } else {
        setCurrentDate(new Date(year, month + direction, 1));
      }
    });
  };

  const goToToday = () => {
    startTransition(() => {
      setCurrentDate(new Date());
    });
  };

  const todayStr = dateToString(new Date());

  // Render header text
  const getHeaderText = () => {
    if (viewMode === 'week') {
      const weekDates = getWeekDates(currentDate);
      const startMonth = MONTHS[weekDates[0].getMonth()];
      const endMonth = MONTHS[weekDates[6].getMonth()];
      const startDay = weekDates[0].getDate();
      const endDay = weekDates[6].getDate();

      if (startMonth === endMonth) {
        return `${startMonth} ${startDay} - ${endDay}, ${weekDates[0].getFullYear()}`;
      }
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${weekDates[6].getFullYear()}`;
    }
    return `${MONTHS[month]} ${year}`;
  };

  return (
    <div className={cn('bg-card rounded-lg border border-border', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} disabled={isPending}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate(1)} disabled={isPending}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <h2 className="text-lg font-semibold">{getHeaderText()}</h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BookingStatus | '')}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>

          {/* View Toggle */}
          <div className="flex rounded-lg border border-input overflow-hidden">
            <Button
              variant={viewMode === 'month' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('month')}
            >
              <Grid3X3 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Month</span>
            </Button>
            <Button
              variant={viewMode === 'week' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('week')}
            >
              <List className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Week</span>
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>
      </div>

      {/* Calendar Content */}
      {isLoading ? (
        <CalendarSkeleton viewMode={viewMode} />
      ) : viewMode === 'month' ? (
        <MonthView
          year={year}
          month={month}
          locale={locale}
          bookings={bookings}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onBookingClick={onBookingClick}
          todayStr={todayStr}
        />
      ) : (
        <WeekView
          currentDate={currentDate}
          locale={locale}
          bookings={bookings}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onBookingClick={onBookingClick}
          todayStr={todayStr}
        />
      )}

      {/* Legend */}
      <div className="px-4 py-3 border-t border-border bg-muted/30">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Confirmed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span>Active</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-400" />
            <span>Completed</span>
          </div>
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <SelectedDatePanel
          date={selectedDate}
          bookings={bookings.filter((b) => {
            const pickup = b.pickupAt.split('T')[0];
            const returnDate = b.returnAt.split('T')[0];
            return pickup <= selectedDate && returnDate >= selectedDate;
          })}
          locale={locale}
          onBookingClick={onBookingClick}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// MONTH VIEW
// ============================================================================

function MonthView({
  year,
  month,
  locale,
  bookings,
  selectedDate,
  onDateSelect,
  onBookingClick,
  todayStr,
}: {
  year: number;
  month: number;
  locale: string;
  bookings: CalendarBooking[];
  selectedDate: string | null;
  onDateSelect: (date: string | null) => void;
  onBookingClick?: (id: string) => void;
  todayStr: string;
}) {
  const weeks = getMonthDates(year, month);

  const getBookingsForDate = (date: Date) => {
    const dateStr = dateToString(date);
    return bookings.filter((booking) => {
      const pickup = booking.pickupAt.split('T')[0];
      const returnDate = booking.returnAt.split('T')[0];
      return pickup <= dateStr && returnDate >= dateStr;
    });
  };

  return (
    <div className="p-4">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS_OF_WEEK_SHORT.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="min-h-[80px] lg:min-h-[100px]" />;
          }

          const dateStr = dateToString(date);
          const dayBookings = getBookingsForDate(date);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const isCurrentMonth = date.getMonth() === month;

          return (
            <button
              key={dateStr}
              onClick={() => onDateSelect(isSelected ? null : dateStr)}
              className={cn(
                'relative min-h-[80px] lg:min-h-[100px] p-1 rounded-lg border transition-all text-left',
                isCurrentMonth ? 'bg-background' : 'bg-muted/30 text-muted-foreground',
                isSelected && 'ring-2 ring-primary',
                isToday && 'border-primary border-2',
                !isSelected && !isToday && 'border-border hover:border-primary/50'
              )}
            >
              {/* Date number */}
              <div
                className={cn(
                  'text-sm font-medium mb-1',
                  isToday &&
                    'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center'
                )}
              >
                {date.getDate()}
              </div>

              {/* Bookings preview */}
              {dayBookings.length > 0 && (
                <div className="space-y-0.5">
                  {dayBookings.slice(0, 2).map((booking) => (
                    <div
                      key={booking.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onBookingClick?.(booking.id);
                      }}
                      className={cn(
                        'text-xs px-1 py-0.5 rounded truncate text-white cursor-pointer transition-colors',
                        STATUS_COLORS[booking.status]
                      )}
                      title={`${booking.reference} - ${booking.vehicleName}`}
                    >
                      {booking.reference}
                    </div>
                  ))}
                  {dayBookings.length > 2 && (
                    <div className="text-xs text-muted-foreground px-1">
                      +{dayBookings.length - 2} more
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// WEEK VIEW
// ============================================================================

function WeekView({
  currentDate,
  locale,
  bookings,
  selectedDate,
  onDateSelect,
  onBookingClick,
  todayStr,
}: {
  currentDate: Date;
  locale: string;
  bookings: CalendarBooking[];
  selectedDate: string | null;
  onDateSelect: (date: string | null) => void;
  onBookingClick?: (id: string) => void;
  todayStr: string;
}) {
  const weekDates = getWeekDates(currentDate);

  const getBookingsForDate = (date: Date) => {
    const dateStr = dateToString(date);
    return bookings.filter((booking) => {
      const pickup = booking.pickupAt.split('T')[0];
      const returnDate = booking.returnAt.split('T')[0];
      return pickup <= dateStr && returnDate >= dateStr;
    });
  };

  return (
    <div className="p-4">
      {/* Week grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-2">
        {weekDates.map((date) => {
          const dateStr = dateToString(date);
          const dayBookings = getBookingsForDate(date);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;

          return (
            <div
              key={dateStr}
              className={cn(
                'rounded-lg border p-3 transition-all',
                isSelected && 'ring-2 ring-primary',
                isToday && 'border-primary border-2',
                !isSelected && !isToday && 'border-border'
              )}
            >
              {/* Day header */}
              <button
                onClick={() => onDateSelect(isSelected ? null : dateStr)}
                className="w-full text-left mb-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {DAYS_OF_WEEK_FULL[date.getDay()]}
                    </div>
                    <div
                      className={cn(
                        'text-lg font-semibold',
                        isToday && 'text-primary'
                      )}
                    >
                      {date.getDate()}
                    </div>
                  </div>
                  {dayBookings.length > 0 && (
                    <Badge variant="secondary">{dayBookings.length}</Badge>
                  )}
                </div>
              </button>

              {/* Bookings list */}
              {dayBookings.length > 0 ? (
                <div className="space-y-2">
                  {dayBookings.map((booking) => (
                    <button
                      key={booking.id}
                      onClick={() => onBookingClick?.(booking.id)}
                      className={cn(
                        'w-full text-left p-2 rounded-lg text-white text-sm transition-colors',
                        STATUS_COLORS[booking.status]
                      )}
                    >
                      <div className="font-medium">{booking.reference}</div>
                      <div className="opacity-90 truncate">
                        {booking.vehicleName}
                      </div>
                      <div className="opacity-75 text-xs mt-1">
                        {booking.customerName || 'No customer'}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No bookings
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// SELECTED DATE PANEL
// ============================================================================

function SelectedDatePanel({
  date,
  bookings,
  locale,
  onBookingClick,
  onClose,
}: {
  date: string;
  bookings: CalendarBooking[];
  locale: string;
  onBookingClick?: (id: string) => void;
  onClose: () => void;
}) {
  const dateObj = new Date(date);
  const formatted = dateObj.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Separate pickups and returns for this date
  const pickups = bookings.filter((b) => b.pickupAt.split('T')[0] === date);
  const returns = bookings.filter((b) => b.returnAt.split('T')[0] === date);
  const ongoing = bookings.filter(
    (b) => b.pickupAt.split('T')[0] < date && b.returnAt.split('T')[0] > date
  );

  return (
    <div className="border-t border-border">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{formatted}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        {bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No bookings on this day.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Pickups */}
            {pickups.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-green-600 mb-2 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  Pickups ({pickups.length})
                </h4>
                <div className="space-y-2">
                  {pickups.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      locale={locale}
                      type="pickup"
                      onClick={() => onBookingClick?.(booking.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Returns */}
            {returns.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-blue-600 mb-2 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Returns ({returns.length})
                </h4>
                <div className="space-y-2">
                  {returns.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      locale={locale}
                      type="return"
                      onClick={() => onBookingClick?.(booking.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Ongoing */}
            {ongoing.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Ongoing ({ongoing.length})
                </h4>
                <div className="space-y-2">
                  {ongoing.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      locale={locale}
                      type="ongoing"
                      onClick={() => onBookingClick?.(booking.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// BOOKING CARD
// ============================================================================

function BookingCard({
  booking,
  locale,
  type,
  onClick,
}: {
  booking: CalendarBooking;
  locale: string;
  type: 'pickup' | 'return' | 'ongoing';
  onClick: () => void;
}) {
  const timeStr =
    type === 'pickup'
      ? formatTime(booking.pickupAt, locale)
      : type === 'return'
      ? formatTime(booking.returnAt, locale)
      : null;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono font-medium">{booking.reference}</span>
          <Badge variant={STATUS_BADGE_VARIANTS[booking.status]} size="sm">
            {booking.status}
          </Badge>
        </div>

        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Car className="w-4 h-4 shrink-0" />
            <span className="truncate">{booking.vehicleName}</span>
          </div>

          {booking.customerName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4 shrink-0" />
              <span className="truncate">{booking.customerName}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {type === 'pickup' ? booking.pickupBranch : booking.returnBranch}
            </span>
          </div>

          {timeStr && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 shrink-0" />
              <span>{timeStr}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// SKELETON
// ============================================================================

function CalendarSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'week') {
    return (
      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-3">
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-6 w-8 mb-3" />
              <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS_OF_WEEK_SHORT.map((day) => (
          <div key={day} className="text-center py-2">
            <Skeleton className="h-4 w-8 mx-auto" />
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-20 lg:h-24 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default BookingCalendar;
