'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  PlayCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import type { BookingStatus } from '@/lib/supabase/types';

interface BookingStatusActionsProps {
  bookingId: string;
  currentStatus: BookingStatus;
  locale: string;
}

// Define valid status transitions
const statusTransitions: Record<BookingStatus, { status: BookingStatus; label: string; icon: typeof CheckCircle; variant: 'default' | 'secondary' | 'destructive' }[]> = {
  pending: [
    { status: 'confirmed', label: 'Confirm Booking', icon: CheckCircle, variant: 'default' },
    { status: 'cancelled', label: 'Cancel Booking', icon: XCircle, variant: 'destructive' },
  ],
  confirmed: [
    { status: 'active', label: 'Start Rental', icon: PlayCircle, variant: 'default' },
    { status: 'cancelled', label: 'Cancel Booking', icon: XCircle, variant: 'destructive' },
  ],
  active: [
    { status: 'completed', label: 'Complete Rental', icon: CheckCircle, variant: 'default' },
  ],
  completed: [],
  cancelled: [],
};

export function BookingStatusActions({
  bookingId,
  currentStatus,
  locale,
}: BookingStatusActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const availableTransitions = statusTransitions[currentStatus] || [];

  const handleStatusUpdate = async (newStatus: BookingStatus) => {
    setError(null);

    // Show confirmation for cancel
    if (newStatus === 'cancelled' && !showCancelConfirm) {
      setShowCancelConfirm(true);
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/bookings/${bookingId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update status');
        }

        // Refresh the page to show updated status
        router.refresh();
        setShowCancelConfirm(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    });
  };

  if (availableTransitions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h3 className="font-medium text-sm">Update Status</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Change the booking status to reflect current state
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {showCancelConfirm ? (
            <>
              <div className="flex items-center gap-2 text-sm text-amber-600 mr-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Are you sure?</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelConfirm(false)}
                disabled={isPending}
              >
                No, Keep
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleStatusUpdate('cancelled')}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-1" />
                    Yes, Cancel
                  </>
                )}
              </Button>
            </>
          ) : (
            availableTransitions.map((transition) => {
              const Icon = transition.icon;
              return (
                <Button
                  key={transition.status}
                  variant={transition.variant}
                  size="sm"
                  onClick={() => handleStatusUpdate(transition.status)}
                  disabled={isPending}
                  className="gap-1.5"
                >
                  {isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  {transition.label}
                </Button>
              );
            })
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 p-2 rounded bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
