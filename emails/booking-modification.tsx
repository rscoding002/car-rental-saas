/**
 * Booking Modification Email Template
 *
 * Sent to customers when their booking has been modified.
 * Shows what changed (dates, locations, addons) and updated pricing.
 */

import { Img, Link, Section, Row, Column } from '@react-email/components';
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

export interface BookingModificationEmailProps {
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
  /** Vehicle details */
  vehicle: {
    make: string;
    model: string;
    year: number;
    photoUrl?: string;
  };
  /** What was modified */
  changes: {
    /** Dates changed */
    dates?: {
      oldPickup: string;
      newPickup: string;
      oldReturn: string;
      newReturn: string;
    };
    /** Pickup location changed */
    pickupLocation?: {
      oldBranch: string;
      newBranch: string;
      newAddress: string;
      newCity: string;
    };
    /** Return location changed */
    returnLocation?: {
      oldBranch: string;
      newBranch: string;
      newAddress: string;
      newCity: string;
    };
    /** Addons changed */
    addons?: {
      added: { name: string; quantity: number; price: number }[];
      removed: { name: string }[];
    };
  };
  /** Current booking details (after modification) */
  currentBooking: {
    pickupDateTime: string;
    pickupBranch: string;
    pickupAddress: string;
    returnDateTime: string;
    returnBranch: string;
    returnAddress: string;
  };
  /** Pricing comparison */
  pricing: {
    originalTotal: number;
    newTotal: number;
    difference: number;
    currency: string;
    /** If customer owes more money */
    requiresPayment: boolean;
    /** If customer is owed a refund */
    requiresRefund: boolean;
    /** Payment/refund status */
    paymentStatus?: 'pending' | 'completed' | 'processing';
  };
  /** Who made the modification */
  modifiedBy: 'customer' | 'staff';
  /** Modification timestamp */
  modifiedAt: string;
  /** URLs for actions */
  urls: {
    viewBooking: string;
    manageBooking: string;
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

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  changeRow: {
    padding: '12px 0',
    borderBottom: '1px solid #e2e8f0',
  },
  changeLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    margin: '0 0 8px',
  },
  oldValue: {
    fontSize: '14px',
    color: '#94a3b8',
    textDecoration: 'line-through',
    margin: '0 0 4px',
  },
  newValue: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: 600,
    margin: '0',
  },
  arrowIcon: {
    color: '#64748b',
    fontSize: '14px',
    margin: '0 8px',
  },
  pricingBox: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center' as const,
  },
  pricingLabel: {
    fontSize: '12px',
    color: '#64748b',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
  },
  pricingValue: {
    fontSize: '24px',
    fontWeight: 700,
    margin: '0',
  },
  pricingPositive: {
    color: '#dc2626',
  },
  pricingNegative: {
    color: '#16a34a',
  },
  pricingNeutral: {
    color: '#1e293b',
  },
  summaryCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    padding: '16px',
    margin: '16px 0',
  },
  summaryRow: {
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    padding: '4px 0',
  },
  addonAdded: {
    color: '#16a34a',
    fontSize: '14px',
  },
  addonRemoved: {
    color: '#dc2626',
    fontSize: '14px',
    textDecoration: 'line-through',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function BookingModificationEmail({
  branding,
  reference,
  customer,
  vehicle,
  changes,
  currentBooking,
  pricing,
  modifiedBy,
  modifiedAt,
  urls,
  locale = 'en',
}: BookingModificationEmailProps) {
  const hasDateChanges = !!changes.dates;
  const hasLocationChanges = !!changes.pickupLocation || !!changes.returnLocation;
  const hasAddonChanges = !!changes.addons && (changes.addons.added.length > 0 || changes.addons.removed.length > 0);
  const hasPriceChange = pricing.difference !== 0;

  return (
    <BaseLayout
      branding={branding}
      preview={`Booking ${reference} has been modified - ${vehicle.make} ${vehicle.model}`}
    >
      {/* Header Alert */}
      <EmailAlert variant="info" title="Booking Modified">
        {modifiedBy === 'customer'
          ? 'You have successfully modified your booking.'
          : 'Your booking has been modified by our team.'}
      </EmailAlert>

      {/* Greeting */}
      <EmailHeading as="h1">
        Hello {customer.firstName}!
      </EmailHeading>

      <EmailText variant="lead">
        Your booking <strong>{reference}</strong> for the {vehicle.make} {vehicle.model} has been updated.
        {modifiedBy === 'staff' && ' Our team made these changes on your behalf.'}
      </EmailText>

      <EmailDivider />

      {/* Changes Summary */}
      <EmailHeading as="h2">What Changed</EmailHeading>

      <EmailCard variant="bordered">
        {/* Date Changes */}
        {hasDateChanges && changes.dates && (
          <Section style={styles.changeRow}>
            <p style={styles.changeLabel}>Rental Dates</p>
            <Row>
              <Column style={{ width: '45%' }}>
                <p style={{ ...styles.oldValue, margin: '0 0 2px' }}>
                  {formatDateTime(changes.dates.oldPickup, locale)}
                </p>
                <p style={{ ...styles.oldValue, margin: 0 }}>
                  to {formatDateTime(changes.dates.oldReturn, locale)}
                </p>
              </Column>
              <Column style={{ width: '10%', textAlign: 'center' }}>
                <span style={styles.arrowIcon}>→</span>
              </Column>
              <Column style={{ width: '45%' }}>
                <p style={{ ...styles.newValue, margin: '0 0 2px' }}>
                  {formatDateTime(changes.dates.newPickup, locale)}
                </p>
                <p style={{ ...styles.newValue, margin: 0 }}>
                  to {formatDateTime(changes.dates.newReturn, locale)}
                </p>
              </Column>
            </Row>
          </Section>
        )}

        {/* Pickup Location Changes */}
        {changes.pickupLocation && (
          <Section style={styles.changeRow}>
            <p style={styles.changeLabel}>Pickup Location</p>
            <Row>
              <Column style={{ width: '45%' }}>
                <p style={styles.oldValue}>{changes.pickupLocation.oldBranch}</p>
              </Column>
              <Column style={{ width: '10%', textAlign: 'center' }}>
                <span style={styles.arrowIcon}>→</span>
              </Column>
              <Column style={{ width: '45%' }}>
                <p style={styles.newValue}>{changes.pickupLocation.newBranch}</p>
              </Column>
            </Row>
          </Section>
        )}

        {/* Return Location Changes */}
        {changes.returnLocation && (
          <Section style={styles.changeRow}>
            <p style={styles.changeLabel}>Return Location</p>
            <Row>
              <Column style={{ width: '45%' }}>
                <p style={styles.oldValue}>{changes.returnLocation.oldBranch}</p>
              </Column>
              <Column style={{ width: '10%', textAlign: 'center' }}>
                <span style={styles.arrowIcon}>→</span>
              </Column>
              <Column style={{ width: '45%' }}>
                <p style={styles.newValue}>{changes.returnLocation.newBranch}</p>
              </Column>
            </Row>
          </Section>
        )}

        {/* Addon Changes */}
        {hasAddonChanges && changes.addons && (
          <Section style={{ ...styles.changeRow, borderBottom: 'none' }}>
            <p style={styles.changeLabel}>Add-ons</p>
            {changes.addons.added.map((addon, index) => (
              <p key={`added-${index}`} style={styles.addonAdded}>
                + {addon.name} {addon.quantity > 1 ? `x${addon.quantity}` : ''} ({formatCurrency(addon.price, pricing.currency, locale)})
              </p>
            ))}
            {changes.addons.removed.map((addon, index) => (
              <p key={`removed-${index}`} style={styles.addonRemoved}>
                - {addon.name}
              </p>
            ))}
          </Section>
        )}
      </EmailCard>

      <EmailDivider />

      {/* Price Difference */}
      {hasPriceChange && (
        <>
          <EmailHeading as="h2">Price Update</EmailHeading>

          <Row>
            <Column style={{ width: '33%', padding: '0 4px' }}>
              <Section style={styles.pricingBox}>
                <p style={styles.pricingLabel}>Original</p>
                <p style={{ ...styles.pricingValue, ...styles.pricingNeutral }}>
                  {formatCurrency(pricing.originalTotal, pricing.currency, locale)}
                </p>
              </Section>
            </Column>
            <Column style={{ width: '33%', padding: '0 4px' }}>
              <Section style={styles.pricingBox}>
                <p style={styles.pricingLabel}>Difference</p>
                <p style={{
                  ...styles.pricingValue,
                  ...(pricing.difference > 0 ? styles.pricingPositive : styles.pricingNegative),
                }}>
                  {pricing.difference > 0 ? '+' : ''}{formatCurrency(pricing.difference, pricing.currency, locale)}
                </p>
              </Section>
            </Column>
            <Column style={{ width: '33%', padding: '0 4px' }}>
              <Section style={styles.pricingBox}>
                <p style={styles.pricingLabel}>New Total</p>
                <p style={{ ...styles.pricingValue, ...styles.pricingNeutral }}>
                  {formatCurrency(pricing.newTotal, pricing.currency, locale)}
                </p>
              </Section>
            </Column>
          </Row>

          {/* Payment/Refund Notice */}
          {pricing.requiresPayment && (
            <EmailAlert variant="warning" title="Additional Payment Required">
              An additional payment of {formatCurrency(pricing.difference, pricing.currency, locale)} is required for this modification.
              {pricing.paymentStatus === 'completed'
                ? ' This has been charged to your original payment method.'
                : pricing.paymentStatus === 'processing'
                  ? ' Payment is being processed.'
                  : ' Please complete the payment to confirm these changes.'}
            </EmailAlert>
          )}

          {pricing.requiresRefund && (
            <EmailAlert variant="success" title="Refund Due">
              A refund of {formatCurrency(Math.abs(pricing.difference), pricing.currency, locale)} will be issued to your original payment method.
              {pricing.paymentStatus === 'completed'
                ? ' The refund has been processed.'
                : ' Please allow 5-10 business days for the refund to appear.'}
            </EmailAlert>
          )}

          <EmailDivider />
        </>
      )}

      {/* Updated Booking Summary */}
      <EmailHeading as="h2">Your Updated Booking</EmailHeading>

      <EmailCard>
        <EmailDetailRow
          label="Reference"
          value={reference}
        />
        <EmailDetailRow
          label="Vehicle"
          value={`${vehicle.make} ${vehicle.model} (${vehicle.year})`}
        />
        <EmailDetailRow
          label="Pickup"
          value={
            <>
              {currentBooking.pickupBranch}<br />
              <span style={{ color: '#64748b', fontSize: '13px' }}>
                {formatDateTime(currentBooking.pickupDateTime, locale)}
              </span>
            </>
          }
        />
        <EmailDetailRow
          label="Return"
          value={
            <>
              {currentBooking.returnBranch}<br />
              <span style={{ color: '#64748b', fontSize: '13px' }}>
                {formatDateTime(currentBooking.returnDateTime, locale)}
              </span>
            </>
          }
        />
        <EmailDetailRow
          label="Total"
          value={
            <span style={{ fontWeight: 700, color: '#1e293b' }}>
              {formatCurrency(pricing.newTotal, pricing.currency, locale)}
            </span>
          }
        />
      </EmailCard>

      {/* Actions */}
      <EmailButton
        href={urls.viewBooking}
        variant="primary"
        color={branding.primaryColor}
        align="center"
        fullWidth
      >
        View Updated Booking
      </EmailButton>

      <EmailDivider />

      {/* Footer Note */}
      <EmailText variant="small">
        Modified on {formatDateTime(modifiedAt, locale)}
        {modifiedBy === 'staff' && ' by our customer service team'}.
      </EmailText>

      <EmailText variant="muted">
        If you have any questions about these changes, please{' '}
        <Link href={urls.manageBooking} style={{ color: branding.primaryColor || '#3b82f6' }}>
          contact our support team
        </Link>{' '}
        or reply to this email.
      </EmailText>
    </BaseLayout>
  );
}

export default BookingModificationEmail;
