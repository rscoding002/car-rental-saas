/**
 * Booking Reminder Email Template
 *
 * Sent to customers before their rental pickup (typically 24-48 hours).
 * Reminds them of booking details and what to bring.
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

export interface BookingReminderEmailProps {
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
    dateTime: string;
    phone?: string;
    /** Operating hours for pickup day */
    operatingHours?: string;
    /** Google Maps or directions URL */
    directionsUrl?: string;
  };
  /** Return details */
  return: {
    branchName: string;
    address: string;
    city: string;
    dateTime: string;
  };
  /** Time until pickup */
  timeUntilPickup: {
    hours: number;
    days: number;
    /** Formatted string like "tomorrow at 10:00 AM" or "in 2 days" */
    formatted: string;
  };
  /** Rental duration */
  duration: {
    days: number;
  };
  /** Add-ons included */
  addons?: {
    name: string;
    quantity: number;
  }[];
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
    weekday: 'long',
    month: 'long',
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
  countdownBox: {
    backgroundColor: '#fef3c7',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center' as const,
    margin: '16px 0',
    border: '2px solid #fbbf24',
  },
  countdownLabel: {
    fontSize: '14px',
    color: '#92400e',
    margin: '0 0 8px',
    fontWeight: 500,
  },
  countdownValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#78350f',
    margin: '0',
  },
  vehicleCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '16px',
    margin: '16px 0',
  },
  vehicleImage: {
    width: '100%',
    maxWidth: '280px',
    height: 'auto',
    borderRadius: '8px',
    display: 'block',
    margin: '0 auto 16px',
  },
  vehicleName: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 8px',
    textAlign: 'center' as const,
  },
  vehicleSpecs: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0',
    textAlign: 'center' as const,
  },
  locationCard: {
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    padding: '20px',
    margin: '16px 0',
    border: '1px solid #bfdbfe',
  },
  locationHeader: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#1e40af',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    margin: '0 0 12px',
  },
  locationName: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 8px',
  },
  locationAddress: {
    fontSize: '14px',
    color: '#475569',
    margin: '0 0 12px',
    lineHeight: '20px',
  },
  locationDateTime: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e40af',
    margin: '0',
  },
  checklistItem: {
    fontSize: '14px',
    color: '#374151',
    padding: '8px 0',
    borderBottom: '1px solid #e2e8f0',
  },
  checklistIcon: {
    color: '#22c55e',
    marginRight: '8px',
  },
  addonBadge: {
    display: 'inline-block',
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '13px',
    marginRight: '8px',
    marginBottom: '8px',
  },
  tipBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    padding: '16px',
    margin: '16px 0',
    border: '1px solid #bbf7d0',
  },
  tipTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#166534',
    margin: '0 0 8px',
  },
  tipText: {
    fontSize: '13px',
    color: '#166534',
    margin: '0',
    lineHeight: '20px',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function BookingReminderEmail({
  branding,
  reference,
  customer,
  vehicle,
  pickup,
  return: returnInfo,
  timeUntilPickup,
  duration,
  addons,
  urls,
  locale = 'en',
}: BookingReminderEmailProps) {
  const isOneWay = pickup.branchName !== returnInfo.branchName;
  const isTomorrow = timeUntilPickup.days === 0 && timeUntilPickup.hours <= 24;

  return (
    <BaseLayout
      branding={branding}
      preview={`Reminder: Your rental pickup is ${timeUntilPickup.formatted} - ${vehicle.make} ${vehicle.model}`}
    >
      {/* Urgency Alert */}
      <EmailAlert
        variant={isTomorrow ? 'warning' : 'info'}
        title={isTomorrow ? 'Your Rental is Tomorrow!' : 'Upcoming Rental Reminder'}
      >
        Your car rental pickup is {timeUntilPickup.formatted}. Here&apos;s everything you need to know.
      </EmailAlert>

      {/* Greeting */}
      <EmailHeading as="h1">
        Hi {customer.firstName}!
      </EmailHeading>

      <EmailText variant="lead">
        We&apos;re looking forward to seeing you soon. Your {vehicle.make} {vehicle.model} is ready and waiting for you.
      </EmailText>

      {/* Countdown */}
      <Section style={styles.countdownBox}>
        <p style={styles.countdownLabel}>Pickup in</p>
        <p style={styles.countdownValue}>{timeUntilPickup.formatted}</p>
      </Section>

      <EmailDivider />

      {/* Vehicle */}
      <EmailHeading as="h2">Your Vehicle</EmailHeading>

      <Section style={styles.vehicleCard}>
        {vehicle.photoUrl && (
          <Img
            src={vehicle.photoUrl}
            alt={`${vehicle.make} ${vehicle.model}`}
            style={styles.vehicleImage}
          />
        )}
        <p style={styles.vehicleName}>
          {vehicle.make} {vehicle.model} ({vehicle.year})
        </p>
        <p style={styles.vehicleSpecs}>
          {vehicle.categoryName} &bull; {vehicle.transmission === 'automatic' ? 'Automatic' : 'Manual'} &bull; {vehicle.fuelType} &bull; {vehicle.seats} seats
        </p>
      </Section>

      {/* Add-ons */}
      {addons && addons.length > 0 && (
        <EmailCard>
          <EmailHeading as="h3">Included Add-ons</EmailHeading>
          <Section>
            {addons.map((addon, index) => (
              <span key={index} style={styles.addonBadge}>
                {addon.name} {addon.quantity > 1 ? `x${addon.quantity}` : ''}
              </span>
            ))}
          </Section>
        </EmailCard>
      )}

      <EmailDivider />

      {/* Pickup Location */}
      <EmailHeading as="h2">Pickup Details</EmailHeading>

      <Section style={styles.locationCard}>
        <p style={styles.locationHeader}>Pickup Location</p>
        <p style={styles.locationName}>{pickup.branchName}</p>
        <p style={styles.locationAddress}>
          {pickup.address}<br />
          {pickup.city}
          {pickup.phone && (
            <>
              <br />
              Phone: <Link href={`tel:${pickup.phone}`} style={{ color: '#1e40af' }}>{pickup.phone}</Link>
            </>
          )}
        </p>
        <p style={styles.locationDateTime}>
          {formatDate(pickup.dateTime, locale)} at {formatTime(pickup.dateTime, locale)}
        </p>
        {pickup.operatingHours && (
          <p style={{ fontSize: '12px', color: '#64748b', margin: '8px 0 0' }}>
            Hours: {pickup.operatingHours}
          </p>
        )}
      </Section>

      {urls.directions && (
        <EmailButton
          href={urls.directions}
          variant="outline"
          color={branding.primaryColor}
          align="center"
          fullWidth
        >
          Get Directions
        </EmailButton>
      )}

      {/* Return Info */}
      <EmailCard>
        <EmailDetailRow
          label="Return Location"
          value={returnInfo.branchName}
        />
        <EmailDetailRow
          label="Return Date"
          value={`${formatDate(returnInfo.dateTime, locale)} at ${formatTime(returnInfo.dateTime, locale)}`}
        />
        <EmailDetailRow
          label="Duration"
          value={`${duration.days} day${duration.days > 1 ? 's' : ''}`}
        />
      </EmailCard>

      {isOneWay && (
        <EmailAlert variant="info">
          This is a one-way rental. Please return the vehicle to <strong>{returnInfo.branchName}</strong>.
        </EmailAlert>
      )}

      <EmailDivider />

      {/* What to Bring Checklist */}
      <EmailHeading as="h2">What to Bring</EmailHeading>

      <EmailCard variant="bordered">
        <Section style={styles.checklistItem}>
          <span style={styles.checklistIcon}>✓</span>
          <strong>Valid driver&apos;s license</strong> - Must be held for at least 1 year
        </Section>
        <Section style={styles.checklistItem}>
          <span style={styles.checklistIcon}>✓</span>
          <strong>Credit card</strong> - The one used for booking (for security deposit)
        </Section>
        <Section style={styles.checklistItem}>
          <span style={styles.checklistIcon}>✓</span>
          <strong>ID or Passport</strong> - Valid government-issued identification
        </Section>
        <Section style={{ ...styles.checklistItem, borderBottom: 'none' }}>
          <span style={styles.checklistIcon}>✓</span>
          <strong>Booking confirmation</strong> - This email or reference: <strong>{reference}</strong>
        </Section>
      </EmailCard>

      {/* Helpful Tip */}
      <Section style={styles.tipBox}>
        <p style={styles.tipTitle}>Helpful Tip</p>
        <p style={styles.tipText}>
          Please arrive 15 minutes before your scheduled pickup time to complete the paperwork smoothly.
          Take photos of the vehicle before driving off to document its condition.
        </p>
      </Section>

      <EmailDivider />

      {/* Actions */}
      <EmailButton
        href={urls.viewBooking}
        variant="primary"
        color={branding.primaryColor}
        align="center"
        fullWidth
      >
        View Full Booking Details
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

      {/* Need Changes */}
      <EmailText variant="muted">
        Need to make changes? You can modify or cancel your booking by visiting{' '}
        <Link href={urls.manageBooking} style={{ color: branding.primaryColor || '#3b82f6' }}>
          your account
        </Link>.
        Changes are subject to availability and may affect pricing.
      </EmailText>

      <EmailText variant="small">
        We&apos;re excited to see you! Have a great trip.
      </EmailText>
    </BaseLayout>
  );
}

export default BookingReminderEmail;
