/**
 * Booking Confirmation Email Template
 *
 * Sent to customers after successful booking/payment.
 * Includes booking details, vehicle info, dates, pricing breakdown.
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

export interface BookingConfirmationEmailProps {
  /** Tenant branding */
  branding: TenantBrandingProps;
  /** Booking reference number */
  reference: string;
  /** Booking status */
  status: 'confirmed' | 'pending';
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
    categoryName: string;
    transmission: 'manual' | 'automatic';
    fuelType: string;
    seats: number;
    photoUrl?: string;
  };
  /** Pickup details */
  pickup: {
    branchName: string;
    address: string;
    city: string;
    dateTime: string; // ISO string
    phone?: string;
  };
  /** Return details */
  return: {
    branchName: string;
    address: string;
    city: string;
    dateTime: string; // ISO string
    phone?: string;
  };
  /** Driver info */
  driver: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  /** Pricing breakdown */
  pricing: {
    baseRate: number;
    days: number;
    dailyRate: number;
    seasonMultiplier?: number;
    addons?: { name: string; quantity: number; total: number }[];
    oneWayFee?: number;
    discount?: { code: string; amount: number };
    subtotal: number;
    total: number;
    currency: string;
  };
  /** URLs for actions */
  urls: {
    viewBooking: string;
    manageBooking: string;
    addToCalendar?: string;
    directions?: string;
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
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDate(isoString: string, locale: string = 'en'): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatTime(isoString: string, locale: string = 'en'): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  vehicleSection: {
    display: 'flex' as const,
    alignItems: 'flex-start' as const,
  },
  vehicleImage: {
    width: '140px',
    height: '90px',
    objectFit: 'cover' as const,
    borderRadius: '6px',
  },
  vehicleInfo: {
    paddingLeft: '16px',
  },
  vehicleName: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px',
  },
  vehicleSpecs: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0',
    lineHeight: '20px',
  },
  locationCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
  },
  locationHeader: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    margin: '0 0 8px',
  },
  locationName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px',
  },
  locationAddress: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 8px',
    lineHeight: '18px',
  },
  locationDateTime: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#3b82f6',
    margin: '0',
  },
  pricingRow: {
    padding: '8px 0',
    borderBottom: '1px solid #e2e8f0',
  },
  pricingLabel: {
    fontSize: '14px',
    color: '#374151',
  },
  pricingValue: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: 500,
    textAlign: 'right' as const,
  },
  totalRow: {
    padding: '12px 0 0',
    marginTop: '8px',
  },
  totalLabel: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
  },
  totalValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1e293b',
    textAlign: 'right' as const,
  },
  discountValue: {
    color: '#16a34a',
  },
  referenceBox: {
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center' as const,
    margin: '16px 0',
  },
  referenceLabel: {
    fontSize: '12px',
    color: '#64748b',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  referenceNumber: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e40af',
    margin: '0',
    letterSpacing: '2px',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function BookingConfirmationEmail({
  branding,
  reference,
  status,
  customer,
  vehicle,
  pickup,
  return: returnInfo,
  driver,
  pricing,
  urls,
  locale = 'en',
}: BookingConfirmationEmailProps) {
  const isOneWay = pickup.branchName !== returnInfo.branchName;
  const statusText = status === 'confirmed' ? 'Confirmed' : 'Pending Confirmation';

  return (
    <BaseLayout
      branding={branding}
      preview={`Your booking ${reference} is ${statusText.toLowerCase()} - ${vehicle.make} ${vehicle.model}`}
    >
      {/* Success Banner */}
      <EmailAlert variant="success" title="Booking Confirmed!">
        Thank you for your reservation. Your booking has been {status === 'confirmed' ? 'confirmed' : 'received and is pending confirmation'}.
      </EmailAlert>

      {/* Greeting */}
      <EmailHeading as="h1">
        Hello {customer.firstName}!
      </EmailHeading>

      <EmailText variant="lead">
        Your car rental has been successfully booked. Please find your booking details below.
      </EmailText>

      {/* Reference Number */}
      <Section style={styles.referenceBox}>
        <p style={styles.referenceLabel}>Booking Reference</p>
        <p style={styles.referenceNumber}>{reference}</p>
      </Section>

      <EmailDivider />

      {/* Vehicle Info */}
      <EmailHeading as="h2">Your Vehicle</EmailHeading>

      <EmailCard variant="bordered">
        <Row>
          {vehicle.photoUrl && (
            <Column style={{ width: '140px', paddingRight: '16px' }}>
              <Img
                src={vehicle.photoUrl}
                alt={`${vehicle.make} ${vehicle.model}`}
                style={styles.vehicleImage}
              />
            </Column>
          )}
          <Column>
            <p style={styles.vehicleName}>
              {vehicle.make} {vehicle.model} ({vehicle.year})
            </p>
            <p style={styles.vehicleSpecs}>
              {vehicle.categoryName}
            </p>
            <p style={styles.vehicleSpecs}>
              {vehicle.transmission === 'automatic' ? 'Automatic' : 'Manual'} &bull; {vehicle.fuelType} &bull; {vehicle.seats} seats
            </p>
          </Column>
        </Row>
      </EmailCard>

      <EmailDivider />

      {/* Pickup & Return Details */}
      <EmailHeading as="h2">Rental Details</EmailHeading>

      <Row>
        <Column style={{ width: '50%', paddingRight: '8px' }}>
          <Section style={styles.locationCard}>
            <p style={styles.locationHeader}>Pickup</p>
            <p style={styles.locationName}>{pickup.branchName}</p>
            <p style={styles.locationAddress}>
              {pickup.address}<br />
              {pickup.city}
            </p>
            <p style={styles.locationDateTime}>
              {formatDate(pickup.dateTime, locale)}<br />
              {formatTime(pickup.dateTime, locale)}
            </p>
          </Section>
        </Column>
        <Column style={{ width: '50%', paddingLeft: '8px' }}>
          <Section style={styles.locationCard}>
            <p style={styles.locationHeader}>Return</p>
            <p style={styles.locationName}>{returnInfo.branchName}</p>
            <p style={styles.locationAddress}>
              {returnInfo.address}<br />
              {returnInfo.city}
            </p>
            <p style={styles.locationDateTime}>
              {formatDate(returnInfo.dateTime, locale)}<br />
              {formatTime(returnInfo.dateTime, locale)}
            </p>
          </Section>
        </Column>
      </Row>

      {isOneWay && (
        <EmailAlert variant="info">
          This is a one-way rental. Please return the vehicle to {returnInfo.branchName}.
        </EmailAlert>
      )}

      <EmailDivider />

      {/* Driver Info */}
      <EmailHeading as="h2">Driver Information</EmailHeading>

      <EmailCard>
        <EmailDetailRow label="Name" value={`${driver.firstName} ${driver.lastName}`} />
        <EmailDetailRow label="Email" value={driver.email} />
        <EmailDetailRow label="Phone" value={driver.phone} />
      </EmailCard>

      <EmailDivider />

      {/* Pricing Breakdown */}
      <EmailHeading as="h2">Price Summary</EmailHeading>

      <EmailCard variant="bordered">
        {/* Base Rate */}
        <Row style={styles.pricingRow}>
          <Column style={styles.pricingLabel}>
            {pricing.days} day{pricing.days > 1 ? 's' : ''} x {formatCurrency(pricing.dailyRate, pricing.currency, locale)}
          </Column>
          <Column style={styles.pricingValue}>
            {formatCurrency(pricing.baseRate, pricing.currency, locale)}
          </Column>
        </Row>

        {/* Season Multiplier */}
        {pricing.seasonMultiplier && pricing.seasonMultiplier !== 1 && (
          <Row style={styles.pricingRow}>
            <Column style={styles.pricingLabel}>
              Seasonal pricing ({Math.round(pricing.seasonMultiplier * 100)}%)
            </Column>
            <Column style={styles.pricingValue}>
              Included
            </Column>
          </Row>
        )}

        {/* Add-ons */}
        {pricing.addons?.map((addon, index) => (
          <Row key={index} style={styles.pricingRow}>
            <Column style={styles.pricingLabel}>
              {addon.name} {addon.quantity > 1 ? `x${addon.quantity}` : ''}
            </Column>
            <Column style={styles.pricingValue}>
              {formatCurrency(addon.total, pricing.currency, locale)}
            </Column>
          </Row>
        ))}

        {/* One-way Fee */}
        {isOneWay && pricing.oneWayFee && pricing.oneWayFee > 0 && (
          <Row style={styles.pricingRow}>
            <Column style={styles.pricingLabel}>
              One-way fee
            </Column>
            <Column style={styles.pricingValue}>
              {formatCurrency(pricing.oneWayFee, pricing.currency, locale)}
            </Column>
          </Row>
        )}

        {/* Discount */}
        {pricing.discount && pricing.discount.amount > 0 && (
          <Row style={styles.pricingRow}>
            <Column style={styles.pricingLabel}>
              Discount ({pricing.discount.code})
            </Column>
            <Column style={{ ...styles.pricingValue, ...styles.discountValue }}>
              -{formatCurrency(pricing.discount.amount, pricing.currency, locale)}
            </Column>
          </Row>
        )}

        {/* Total */}
        <Row style={styles.totalRow}>
          <Column style={styles.totalLabel}>
            Total Paid
          </Column>
          <Column style={styles.totalValue}>
            {formatCurrency(pricing.total, pricing.currency, locale)}
          </Column>
        </Row>
      </EmailCard>

      <EmailDivider />

      {/* Actions */}
      <EmailHeading as="h2">What&apos;s Next?</EmailHeading>

      <EmailText>
        Please bring the following when you pick up your vehicle:
      </EmailText>

      <EmailCard>
        <EmailText marginBottom={8}>&bull; Valid driver&apos;s license</EmailText>
        <EmailText marginBottom={8}>&bull; Credit card used for booking</EmailText>
        <EmailText marginBottom={8}>&bull; This confirmation email or booking reference</EmailText>
        <EmailText marginBottom={0}>&bull; Valid ID or passport</EmailText>
      </EmailCard>

      <EmailButton
        href={urls.viewBooking}
        variant="primary"
        color={branding.primaryColor}
        align="center"
        fullWidth
      >
        View Booking Details
      </EmailButton>

      {urls.addToCalendar && (
        <EmailButton
          href={urls.addToCalendar}
          variant="outline"
          color={branding.primaryColor}
          align="center"
          fullWidth
        >
          Add to Calendar
        </EmailButton>
      )}

      <EmailDivider />

      {/* Important Notes */}
      <EmailHeading as="h3">Important Information</EmailHeading>

      <EmailText variant="small">
        &bull; Please arrive at least 15 minutes before your pickup time.<br />
        &bull; The driver must be present at pickup to sign the rental agreement.<br />
        &bull; Fuel policy: Please return the vehicle with the same fuel level.<br />
        &bull; Late returns may incur additional charges.
      </EmailText>

      <EmailText variant="muted">
        Need to make changes? You can modify or cancel your booking up to 24 hours before pickup by visiting{' '}
        <Link href={urls.manageBooking} style={{ color: branding.primaryColor || '#3b82f6' }}>
          your account
        </Link>.
      </EmailText>
    </BaseLayout>
  );
}

export default BookingConfirmationEmail;
