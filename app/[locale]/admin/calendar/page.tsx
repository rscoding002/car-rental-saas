'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';

import { BookingCalendar } from '@/components/admin/booking-calendar';

export default function AdminCalendarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const router = useRouter();
  const [locale, setLocale] = useState('en');

  // Resolve params
  useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  const handleBookingClick = (bookingId: string) => {
    router.push(`/${locale}/admin/bookings/${bookingId}`);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Booking Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View all bookings in calendar format
          </p>
        </div>
      </div>

      {/* Calendar */}
      <BookingCalendar
        locale={locale}
        onBookingClick={handleBookingClick}
      />
    </div>
  );
}
