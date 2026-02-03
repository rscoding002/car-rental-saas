'use client';

import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Wrench,
  Clock,
  Ban,
  Car,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

// ============================================================================
// TYPES
// ============================================================================

interface CalendarDay {
  date: string;
  dayOfWeek: number;
  isAvailable: boolean;
  isPartiallyAvailable: boolean;
  bookings: {
    id: string;
    reference: string;
    status: string;
    isPickup: boolean;
    isReturn: boolean;
  }[];
  blocks: {
    id: string;
    type: string;
    reason?: string;
  }[];
}

interface CalendarBooking {
  id: string;
  reference: string;
  pickupAt: string;
  returnAt: string;
  status: string;
  customerName?: string;
}

interface CalendarBlock {
  id: string;
  vehicleId: string;
  type: string;
  startAt: string;
  endAt: string;
  reason?: string;
  isAllDay: boolean;
}

interface VehicleInfo {
  id: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  status: string;
}

interface AvailabilityCalendarProps {
  vehicleId?: string;
  branchId?: string;
  onDateSelect?: (date: string) => void;
  onBookingClick?: (bookingId: string) => void;
  onBlockClick?: (blockId: string) => void;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const BLOCK_TYPE_COLORS: Record<string, string> = {
  maintenance: 'bg-orange-500',
  reserved: 'bg-purple-500',
  out_of_service: 'bg-red-500',
  inspection: 'bg-blue-500',
  damage_repair: 'bg-red-600',
  cleaning: 'bg-cyan-500',
  other: 'bg-gray-500',
};

const BLOCK_TYPE_ICONS: Record<string, typeof Wrench> = {
  maintenance: Wrench,
  reserved: User,
  out_of_service: Ban,
  inspection: Clock,
  damage_repair: Wrench,
  cleaning: Wrench,
  other: Clock,
};

const BOOKING_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  confirmed: 'bg-green-500',
  active: 'bg-blue-500',
  completed: 'bg-gray-400',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AvailabilityCalendar({
  vehicleId,
  branchId,
  onDateSelect,
  onBookingClick,
  onBlockClick,
  className,
}: AvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [calendarData, setCalendarData] = useState<{
    vehicle?: VehicleInfo;
    days: CalendarDay[];
    bookings: CalendarBooking[];
    blocks: CalendarBlock[];
  } | null>(null);

  // Calculate date range for current month view
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Extend to show full weeks
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const endDate = new Date(lastDayOfMonth);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Fetch calendar data
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          startDate: startDateStr,
          endDate: endDateStr,
        });

        if (vehicleId) {
          params.set('vehicleId', vehicleId);
        }
        if (branchId) {
          params.set('branchId', branchId);
        }

        const response = await fetch(`/api/admin/availability?${params}`);
        const data = await response.json();

        if (response.ok) {
          setCalendarData(data);
        }
      } catch (error) {
        console.error('Error fetching calendar data:', error);
      }

      setIsLoading(false);
    }

    fetchData();
  }, [vehicleId, branchId, startDateStr, endDateStr]);

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Date selection handler
  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  // Generate calendar grid
  const calendarDays: (CalendarDay | null)[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const dayData = calendarData?.days.find((d) => d.date === dateStr);

    if (dayData) {
      calendarDays.push(dayData);
    } else {
      calendarDays.push({
        date: dateStr,
        dayOfWeek: current.getDay(),
        isAvailable: true,
        isPartiallyAvailable: false,
        bookings: [],
        blocks: [],
      });
    }

    current.setDate(current.getDate() + 1);
  }

  // Get today's date string for highlighting
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className={cn('bg-card rounded-lg border border-border', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <h2 className="text-lg font-semibold">
            {MONTHS[month]} {year}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>
      </div>

      {/* Vehicle info (if specific vehicle) */}
      {calendarData?.vehicle && (
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <Car className="w-5 h-5 text-muted-foreground" />
            <div>
              <span className="font-medium">
                {calendarData.vehicle.year} {calendarData.vehicle.make}{' '}
                {calendarData.vehicle.model}
              </span>
              <span className="text-muted-foreground ml-2">
                ({calendarData.vehicle.licensePlate})
              </span>
            </div>
            <Badge
              variant={
                calendarData.vehicle.status === 'available'
                  ? 'success'
                  : calendarData.vehicle.status === 'rented'
                  ? 'warning'
                  : 'secondary'
              }
            >
              {calendarData.vehicle.status}
            </Badge>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      {isLoading ? (
        <CalendarSkeleton />
      ) : (
        <div className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (!day) return <div key={index} />;

              const isCurrentMonth = new Date(day.date).getMonth() === month;
              const isToday = day.date === todayStr;
              const isSelected = day.date === selectedDate;
              const hasBookings = day.bookings.length > 0;
              const hasBlocks = day.blocks.length > 0;
              const dayNum = new Date(day.date).getDate();

              return (
                <button
                  key={day.date}
                  onClick={() => handleDateClick(day.date)}
                  className={cn(
                    'relative min-h-[80px] p-1 rounded-lg border transition-colors text-left',
                    isCurrentMonth
                      ? 'bg-background'
                      : 'bg-muted/30 text-muted-foreground',
                    isSelected && 'ring-2 ring-primary',
                    isToday && 'border-primary',
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
                    {dayNum}
                  </div>

                  {/* Bookings indicator */}
                  {hasBookings && (
                    <div className="space-y-0.5">
                      {day.bookings.slice(0, 2).map((booking) => (
                        <div
                          key={booking.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onBookingClick?.(booking.id);
                          }}
                          className={cn(
                            'text-xs px-1 py-0.5 rounded truncate text-white cursor-pointer',
                            BOOKING_STATUS_COLORS[booking.status] || 'bg-gray-500'
                          )}
                          title={booking.reference}
                        >
                          {booking.isPickup && '→ '}
                          {booking.reference}
                          {booking.isReturn && ' ←'}
                        </div>
                      ))}
                      {day.bookings.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{day.bookings.length - 2} more
                        </div>
                      )}
                    </div>
                  )}

                  {/* Blocks indicator */}
                  {hasBlocks && (
                    <div className="absolute bottom-1 right-1 flex gap-0.5">
                      {day.blocks.slice(0, 3).map((block) => {
                        const Icon = BLOCK_TYPE_ICONS[block.type] || Clock;
                        return (
                          <div
                            key={block.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onBlockClick?.(block.id);
                            }}
                            className={cn(
                              'w-4 h-4 rounded flex items-center justify-center text-white cursor-pointer',
                              BLOCK_TYPE_COLORS[block.type] || 'bg-gray-500'
                            )}
                            title={block.reason || block.type}
                          >
                            <Icon className="w-2.5 h-2.5" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="px-4 py-3 border-t border-border bg-muted/30">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-muted-foreground">Bookings:</span>
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
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-muted-foreground">Blocks:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-500" />
              <span>Maintenance</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-purple-500" />
              <span>Reserved</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>Out of Service</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected day details */}
      {selectedDate && calendarData && (
        <SelectedDayDetails
          date={selectedDate}
          day={calendarData.days.find((d) => d.date === selectedDate)}
          bookings={calendarData.bookings.filter((b) => {
            const pickup = b.pickupAt.split('T')[0];
            const ret = b.returnAt.split('T')[0];
            return pickup <= selectedDate && ret >= selectedDate;
          })}
          blocks={calendarData.blocks.filter((b) => {
            const start = b.startAt.split('T')[0];
            const end = b.endAt.split('T')[0];
            return start <= selectedDate && end >= selectedDate;
          })}
          onBookingClick={onBookingClick}
          onBlockClick={onBlockClick}
        />
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function CalendarSkeleton() {
  return (
    <div className="p-4">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day} className="text-center py-2">
            <Skeleton className="h-4 w-8 mx-auto" />
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function SelectedDayDetails({
  date,
  day,
  bookings,
  blocks,
  onBookingClick,
  onBlockClick,
}: {
  date: string;
  day?: CalendarDay;
  bookings: CalendarBooking[];
  blocks: CalendarBlock[];
  onBookingClick?: (id: string) => void;
  onBlockClick?: (id: string) => void;
}) {
  const dateObj = new Date(date);
  const formatted = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="border-t border-border">
      <div className="p-4">
        <h3 className="font-medium mb-3">{formatted}</h3>

        {bookings.length === 0 && blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No bookings or blocks on this day.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Bookings */}
            {bookings.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Bookings ({bookings.length})
                </h4>
                <div className="space-y-2">
                  {bookings.map((booking) => (
                    <button
                      key={booking.id}
                      onClick={() => onBookingClick?.(booking.id)}
                      className="w-full flex items-center justify-between p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                    >
                      <div>
                        <span className="font-medium">{booking.reference}</span>
                        {booking.customerName && (
                          <span className="text-muted-foreground ml-2">
                            - {booking.customerName}
                          </span>
                        )}
                      </div>
                      <Badge
                        variant={
                          booking.status === 'confirmed'
                            ? 'success'
                            : booking.status === 'active'
                            ? 'warning'
                            : 'secondary'
                        }
                      >
                        {booking.status}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Blocks */}
            {blocks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Blocks ({blocks.length})
                </h4>
                <div className="space-y-2">
                  {blocks.map((block) => {
                    const Icon = BLOCK_TYPE_ICONS[block.type] || Clock;
                    return (
                      <button
                        key={block.id}
                        onClick={() => onBlockClick?.(block.id)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                      >
                        <div
                          className={cn(
                            'w-8 h-8 rounded flex items-center justify-center text-white',
                            BLOCK_TYPE_COLORS[block.type] || 'bg-gray-500'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-medium capitalize">
                            {block.type.replace(/_/g, ' ')}
                          </span>
                          {block.reason && (
                            <p className="text-sm text-muted-foreground">
                              {block.reason}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AvailabilityCalendar;
