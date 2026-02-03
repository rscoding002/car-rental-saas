/**
 * Booking Cancellation Email Template
 *
 * Sent to customers when their booking has been cancelled.
 * Shows cancellation details, refund information, and rebooking options.
 */

import { Link, Section, Row, Column } from '@react-email/components';
import * as React from 'react';
import {
  BaseLayout,
  EmailHeading,
  EmailText,
  EmailButton,
  EmailCard,
  EmailDetailRow,
  EmailDivider,
  EmailAlert,
  type TenantBrandingProps,
} from './components';

// ============================================================================
// TYPES
// ============================================================================

export interface BookingCancellationEmailProps {
  /** Tenant branding */
  branding: TenantBrandingProps;
  /** Booking reference number */
  reference: string;
  /** Customer info */
  customer: {
    firstName: string;
    lastName: string;
    email: string;
  };
  /** Vehicle that was booked */
  vehicle: {
    make: string;
    model: string;
    year: number;
  };
  /** Original booking details */
  booking: {
    pickupDateTime: string;
    pickupBranch: string;
    returnDateTime: string;
    returnBranch: string;
  };
  /** Cancellation details */
  cancellation: {
    /** Who cancelled */
    cancelledBy: 'customer' | 'staff' | 'system';
    /** Reason for cancellation */
    reason?: string;
    /** Reason category */
    reasonType?: 'customer_request' | 'vehicle_unavailable' | 'payment_failed' | 'no_show' | 'force_majeure' | 'other';
    /** When it was cancelled */
    cancelledAt: string;
  };
  /** Refund information */
  refund: {
    /** Original amount paid */
    originalAmount: number;
    /** Amount being refunded */
    refundAmount: number;
    /** Cancellation fee (if any) */
    cancellationFee: number;
    /** Refund percentage */
    refundPercent: number;
    /** Policy tier applied */
    policyTier: 'full' | 'partial' | 'none';
    /** Currency */
    currency: string;
    /** Refund status */
    status: 'pending' | 'processing' | 'completed' | 'failed';
    /** Estimated refund date (if pending) */
    estimatedDate?: string;
  };
  /** URLs for actions */
  urls: {
    bookAgain: string;
    contactSupport: string;
    viewHistory: string;
  };
  /** Language/locale for formatting */
  locale?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(amount: number, currency: string, locale: string = 'en'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

function formatDateTime(isoString: string, locale: string = 'en'): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDate(isoString: string, locale: string = 'en'): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function getCancelledByText(cancelledBy: 'customer' | 'staff' | 'system'): string {
  switch (cancelledBy) {
    case 'customer':
      return 'at your request';
    case 'staff':
      return 'by our team';
    case 'system':
      return 'automatically';
    default:
      return '';
  }
}

function getReasonTypeText(reasonType?: string): string {
  switch (reasonType) {
    case 'customer_request':
      return 'Customer request';
    case 'vehicle_unavailable':
      return 'Vehicle unavailable';
    case 'payment_failed':
      return 'Payment issue';
    case 'no_show':
      return 'No show';
    case 'force_majeure':
      return 'Unforeseen circumstances';
    default:
      return 'Other';
  }
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  refundBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center' as const,
    margin: '16px 0',
    border: '1px solid #bbf7d0',
  },
  refundLabel: {
    fontSize: '12px',
    color: '#166534',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  refundAmount: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#166534',
    margin: '0',
  },
  noRefundBox: {
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center' as const,
    margin: '16px 0',
    border: '1px solid #fecaca',
  },
  noRefundLabel: {
    fontSize: '14px',
    color: '#991b1b',
    margin: '0',
  },
  cancelledBadge: {
    display: 'inline-block',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  strikethrough: {
    textDecoration: 'line-through',
    color: '#94a3b8',
  },
  bookingCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '16px',
    opacity: 0.8,
  },
  feeBreakdown: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '16px',
  },
  feeRow: {
    padding: '8px 0',
    borderBottom: '1px solid #e2e8f0',
  },
  feeLabel: {
    fontSize: '14px',
    color: '#374151',
  },
  feeValue: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: 500,
    textAlign: 'right' as const,
  },
  totalRow: {
    padding: '12px 0 0',
    marginTop: '4px',
  },
  refundStatus: {
    fontSize: '13px',
    color: '#64748b',
    margin: '8px 0 0',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function BookingCancellationEmail({
  branding,
  reference,
  customer,
  vehicle,
  booking,
  cancellation,
  refund,
  urls,
  locale = 'en',
}: BookingCancellationEmailProps) {
  const hasRefund = refund.refundAmount > 0;
  const isFullRefund = refund.policyTier === 'full';
  const isPartialRefund = refund.policyTier === 'partial';

  return (
    <BaseLayout
      branding={branding}
      preview={`Booking ${reference} has been cancelled${hasRefund ? ` - Refund: ${formatCurrency(refund.refundAmount, refund.currency, locale)}` : ''}`}
    >
      {/* Header Alert */}
      <EmailAlert variant="error" title="Booking Cancelled">
        Your booking has been cancelled {getCancelledByText(cancellation.cancelledBy)}.
      </EmailAlert>

      {/* Greeting */}
      <EmailHeading as="h1">
        Hello {customer.firstName},
      </EmailHeading>

      <EmailText variant="lead">
        We confirm that your booking <strong>{reference}</strong> for the {vehicle.make} {vehicle.model} has been cancelled.
      </EmailText>

      <EmailDivider />

      {/* Cancelled Booking Details */}
      <EmailHeading as="h2">Cancelled Booking</EmailHeading>

      <Section style={styles.bookingCard}>
        <Row>
          <Column style={{ width: '50%' }}>
            <EmailText variant="small" marginBottom={4}>
              <strong>Reference:</strong> <span style={styles.strikethrough}>{reference}</span>
            </EmailText>
            <EmailText variant="small" marginBottom={4}>
              <strong>Vehicle:</strong> <span style={styles.strikethrough}>{vehicle.make} {vehicle.model} ({vehicle.year})</span>
            </EmailText>
          </Column>
          <Column style={{ width: '50%' }}>
            <EmailText variant="small" marginBottom={4}>
              <strong>Pickup:</strong> <span style={styles.strikethrough}>{formatDateTime(booking.pickupDateTime, locale)}</span>
            </EmailText>
            <EmailText variant="small" marginBottom={4}>
              <strong>Return:</strong> <span style={styles.strikethrough}>{formatDateTime(booking.returnDateTime, locale)}</span>
            </EmailText>
          </Column>
        </Row>
      </Section>

      {/* Cancellation Reason */}
      {(cancellation.reason || cancellation.reasonType) && (
        <EmailCard>
          <EmailDetailRow
            label="Reason"
            value={cancellation.reason || getReasonTypeText(cancellation.reasonType)}
          />
          <EmailDetailRow
            label="Cancelled on"
            value={formatDateTime(cancellation.cancelledAt, locale)}
          />
        </EmailCard>
      )}

      <EmailDivider />

      {/* Refund Information */}
      <EmailHeading as="h2">Refund Information</EmailHeading>

      {hasRefund ? (
        <>
          {/* Refund Amount Box */}
          <Section style={styles.refundBox}>
            <p style={styles.refundLabel}>
              {isFullRefund ? 'Full Refund' : 'Partial Refund'}
            </p>
            <p style={styles.refundAmount}>
              {formatCurrency(refund.refundAmount, refund.currency, locale)}
            </p>
            <p style={styles.refundStatus}>
              {refund.status === 'completed' && 'Refund has been processed'}
              {refund.status === 'processing' && 'Refund is being processed'}
              {refund.status === 'pending' && 'Refund will be processed shortly'}
              {refund.status === 'failed' && 'There was an issue processing your refund'}
            </p>
          </Section>

          {/* Fee Breakdown */}
          <Section style={styles.feeBreakdown}>
            <Row style={styles.feeRow}>
              <Column style={styles.feeLabel}>Original amount paid</Column>
              <Column style={styles.feeValue}>
                {formatCurrency(refund.originalAmount, refund.currency, locale)}
              </Column>
            </Row>

            {refund.cancellationFee > 0 && (
              <Row style={styles.feeRow}>
                <Column style={styles.feeLabel}>Cancellation fee</Column>
                <Column style={{ ...styles.feeValue, color: '#dc2626' }}>
                  -{formatCurrency(refund.cancellationFee, refund.currency, locale)}
                </Column>
              </Row>
            )}

            <Row style={styles.totalRow}>
              <Column style={{ ...styles.feeLabel, fontWeight: 600 }}>Refund amount</Column>
              <Column style={{ ...styles.feeValue, fontWeight: 700, color: '#166534' }}>
                {formatCurrency(refund.refundAmount, refund.currency, locale)}
              </Column>
            </Row>
          </Section>

          {/* Refund Timeline */}
          <EmailAlert variant="info">
            {refund.status === 'completed'
              ? 'Your refund has been processed and should appear in your account within 5-10 business days.'
              : refund.status === 'processing'
                ? 'Your refund is being processed. Please allow 5-10 business days for the funds to appear in your account.'
                : 'Your refund will be processed to your original payment method. Please allow 5-10 business days for the funds to appear.'}
          </EmailAlert>
        </>
      ) : (
        <>
          {/* No Refund */}
          <Section style={styles.noRefundBox}>
            <p style={styles.noRefundLabel}>
              No refund is applicable for this cancellation based on our cancellation policy.
            </p>
          </Section>

          <EmailText variant="small">
            Bookings cancelled less than 24 hours before the pickup time are not eligible for a refund.
            If you believe this is an error, please contact our support team.
          </EmailText>
        </>
      )}

      <EmailDivider />

      {/* Rebooking CTA */}
      <EmailHeading as="h2">Need a car rental?</EmailHeading>

      <EmailText>
        We&apos;d love to have you back! Browse our fleet and book your next rental with us.
      </EmailText>

      <EmailButton
        href={urls.bookAgain}
        variant="primary"
        color={branding.primaryColor}
        align="center"
        fullWidth
      >
        Book Again
      </EmailButton>

      <EmailButton
        href={urls.viewHistory}
        variant="outline"
        color={branding.primaryColor}
        align="center"
        fullWidth
      >
        View Booking History
      </EmailButton>

      <EmailDivider />

      {/* Support */}
      <EmailText variant="muted">
        If you have any questions about this cancellation or your refund, please don&apos;t hesitate to{' '}
        <Link href={urls.contactSupport} style={{ color: branding.primaryColor || '#3b82f6' }}>
          contact our support team
        </Link>.
        We&apos;re here to help.
      </EmailText>
    </BaseLayout>
  );
}

export default BookingCancellationEmail;
