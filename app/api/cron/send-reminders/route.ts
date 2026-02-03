import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { sendBookingReminder } from '@/lib/email/booking-emails';

/**
 * Cron job to send booking reminder emails.
 *
 * Runs daily at 8 AM (configured in vercel.json).
 * Sends reminders for bookings starting the next day.
 *
 * @see vercel.json for cron schedule configuration
 */
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    const supabase = createAdminClient();

    // Calculate tomorrow's date range
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    console.log('[Cron] Fetching bookings for reminders:', {
      from: tomorrowStart.toISOString(),
      to: tomorrowEnd.toISOString(),
    });

    // Query confirmed bookings starting tomorrow
    // Using admin client to bypass RLS and access all tenants
    const { data: bookings, error: queryError } = await supabase
      .from('bookings')
      .select(`
        id,
        reference,
        tenant_id,
        customer_id,
        pickup_at,
        status,
        customer:users!bookings_customer_id_fkey(
          id,
          email,
          first_name,
          preferred_language
        )
      `)
      .eq('status', 'confirmed')
      .gte('pickup_at', tomorrowStart.toISOString())
      .lte('pickup_at', tomorrowEnd.toISOString());

    if (queryError) {
      console.error('[Cron] Error querying bookings:', queryError);
      return NextResponse.json(
        { error: 'Database query failed', details: queryError.message },
        { status: 500 }
      );
    }

    if (!bookings || bookings.length === 0) {
      console.log('[Cron] No bookings found for tomorrow');
      return NextResponse.json({
        success: true,
        message: 'No bookings to remind',
        timestamp: new Date().toISOString(),
        results,
      });
    }

    console.log(`[Cron] Found ${bookings.length} bookings to process`);
    results.processed = bookings.length;

    // Process each booking
    for (const booking of bookings) {
      const customerData = booking.customer as {
        id: string;
        email: string;
        first_name: string | null;
        preferred_language: string | null;
      } | null;

      // Skip if no customer email
      if (!customerData?.email) {
        console.log(`[Cron] Skipping booking ${booking.reference}: no customer email`);
        results.skipped++;
        continue;
      }

      // Determine locale from customer preference
      const locale = customerData.preferred_language || 'en';

      try {
        // Send reminder email
        const emailResult = await sendBookingReminder(supabase, booking.id, locale);

        if (emailResult.success) {
          console.log(`[Cron] Sent reminder for booking ${booking.reference}`);
          results.sent++;
        } else {
          console.error(`[Cron] Failed to send reminder for booking ${booking.reference}:`, emailResult.error);
          results.failed++;
          results.errors.push(`${booking.reference}: ${emailResult.error}`);
        }
      } catch (emailError) {
        const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
        console.error(`[Cron] Error sending reminder for booking ${booking.reference}:`, emailError);
        results.failed++;
        results.errors.push(`${booking.reference}: ${errorMessage}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log('[Cron] Reminder job completed:', {
      duration: `${duration}ms`,
      ...results,
    });

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} bookings: ${results.sent} sent, ${results.failed} failed, ${results.skipped} skipped`,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      results,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron] Cron job error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage,
        timestamp: new Date().toISOString(),
        results,
      },
      { status: 500 }
    );
  }
}
