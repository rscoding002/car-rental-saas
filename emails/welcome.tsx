/**
 * Welcome Email Template
 *
 * Sent to new users after registration.
 * Welcomes them and guides them to explore the platform.
 */

import { Link, Section, Row, Column } from '@react-email/components';
import * as React from 'react';
import {
  BaseLayout,
  EmailHeading,
  EmailText,
  EmailButton,
  EmailCard,
  EmailDivider,
  EmailAlert,
  type TenantBrandingProps,
} from './components';

// ============================================================================
// TYPES
// ============================================================================

export interface WelcomeEmailProps {
  /** Tenant branding */
  branding: TenantBrandingProps;
  /** User info */
  user: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
  /** Whether email verification is required */
  requiresVerification?: boolean;
  /** Email verification URL (if verification required) */
  verificationUrl?: string;
  /** URLs for actions */
  urls: {
    browseFleet: string;
    login: string;
    completeProfile?: string;
    help?: string;
  };
  /** Features to highlight */
  features?: {
    title: string;
    description: string;
    icon?: string;
  }[];
  /** Special offer for new users */
  specialOffer?: {
    code: string;
    discount: string;
    expiresAt?: string;
    description: string;
  };
  /** Language/locale for formatting */
  locale?: string;
}

// ============================================================================
// DEFAULT FEATURES
// ============================================================================

const DEFAULT_FEATURES = [
  {
    title: 'Wide Selection',
    description: 'Choose from economy to luxury vehicles',
    icon: '🚗',
  },
  {
    title: 'Flexible Booking',
    description: 'Easy modifications and free cancellation',
    icon: '📅',
  },
  {
    title: 'Best Prices',
    description: 'Competitive rates with no hidden fees',
    icon: '💰',
  },
  {
    title: '24/7 Support',
    description: 'We\'re here whenever you need us',
    icon: '🎧',
  },
];

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  welcomeBox: {
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    padding: '32px 24px',
    textAlign: 'center' as const,
    margin: '16px 0',
  },
  welcomeEmoji: {
    fontSize: '48px',
    margin: '0 0 16px',
  },
  welcomeTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1e40af',
    margin: '0 0 8px',
  },
  welcomeSubtitle: {
    fontSize: '16px',
    color: '#3b82f6',
    margin: '0',
  },
  featureGrid: {
    margin: '24px 0',
  },
  featureCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center' as const,
    height: '100%',
  },
  featureIcon: {
    fontSize: '32px',
    margin: '0 0 8px',
  },
  featureTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px',
  },
  featureDesc: {
    fontSize: '12px',
    color: '#64748b',
    margin: '0',
    lineHeight: '18px',
  },
  offerBox: {
    backgroundColor: '#fef3c7',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center' as const,
    margin: '24px 0',
    border: '2px dashed #f59e0b',
  },
  offerLabel: {
    fontSize: '12px',
    color: '#92400e',
    margin: '0 0 8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    fontWeight: 600,
  },
  offerCode: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#78350f',
    margin: '0 0 8px',
    letterSpacing: '2px',
    fontFamily: 'monospace',
  },
  offerDiscount: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#92400e',
    margin: '0 0 4px',
  },
  offerDesc: {
    fontSize: '13px',
    color: '#92400e',
    margin: '0',
  },
  offerExpiry: {
    fontSize: '11px',
    color: '#b45309',
    margin: '8px 0 0',
  },
  stepNumber: {
    display: 'inline-block',
    width: '28px',
    height: '28px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    borderRadius: '50%',
    fontSize: '14px',
    fontWeight: 600,
    lineHeight: '28px',
    textAlign: 'center' as const,
    marginRight: '12px',
  },
  stepText: {
    fontSize: '14px',
    color: '#374151',
    verticalAlign: 'middle',
  },
  stepRow: {
    padding: '12px 0',
    borderBottom: '1px solid #e2e8f0',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function WelcomeEmail({
  branding,
  user,
  requiresVerification = false,
  verificationUrl,
  urls,
  features = DEFAULT_FEATURES,
  specialOffer,
  locale = 'en',
}: WelcomeEmailProps) {
  const displayName = user.firstName || 'there';

  return (
    <BaseLayout
      branding={branding}
      preview={`Welcome to ${branding.name}! Start exploring our fleet today.`}
    >
      {/* Email Verification Alert */}
      {requiresVerification && verificationUrl && (
        <EmailAlert variant="warning" title="Verify Your Email">
          Please verify your email address to complete your registration and access all features.
        </EmailAlert>
      )}

      {/* Welcome Box */}
      <Section style={styles.welcomeBox}>
        <p style={styles.welcomeEmoji}>👋</p>
        <p style={styles.welcomeTitle}>Welcome, {displayName}!</p>
        <p style={styles.welcomeSubtitle}>
          Thanks for joining {branding.name}
        </p>
      </Section>

      {/* Verification Button */}
      {requiresVerification && verificationUrl && (
        <>
          <EmailButton
            href={verificationUrl}
            variant="primary"
            color={branding.primaryColor}
            align="center"
            fullWidth
          >
            Verify Email Address
          </EmailButton>
          <EmailDivider />
        </>
      )}

      {/* Intro Text */}
      <EmailText variant="lead">
        We&apos;re thrilled to have you on board! Whether you&apos;re planning a road trip, need a car for business, or just want to explore, we&apos;ve got you covered.
      </EmailText>

      <EmailDivider />

      {/* Features Grid */}
      <EmailHeading as="h2">Why Choose Us?</EmailHeading>

      <Row style={styles.featureGrid}>
        {features.slice(0, 2).map((feature, index) => (
          <Column key={index} style={{ width: '50%', padding: '0 8px 16px' }}>
            <Section style={styles.featureCard}>
              {feature.icon && <p style={styles.featureIcon}>{feature.icon}</p>}
              <p style={styles.featureTitle}>{feature.title}</p>
              <p style={styles.featureDesc}>{feature.description}</p>
            </Section>
          </Column>
        ))}
      </Row>
      <Row>
        {features.slice(2, 4).map((feature, index) => (
          <Column key={index} style={{ width: '50%', padding: '0 8px' }}>
            <Section style={styles.featureCard}>
              {feature.icon && <p style={styles.featureIcon}>{feature.icon}</p>}
              <p style={styles.featureTitle}>{feature.title}</p>
              <p style={styles.featureDesc}>{feature.description}</p>
            </Section>
          </Column>
        ))}
      </Row>

      <EmailDivider />

      {/* Special Offer */}
      {specialOffer && (
        <>
          <EmailHeading as="h2">A Gift for You!</EmailHeading>

          <Section style={styles.offerBox}>
            <p style={styles.offerLabel}>New Member Offer</p>
            <p style={styles.offerCode}>{specialOffer.code}</p>
            <p style={styles.offerDiscount}>{specialOffer.discount}</p>
            <p style={styles.offerDesc}>{specialOffer.description}</p>
            {specialOffer.expiresAt && (
              <p style={styles.offerExpiry}>
                Valid until {new Date(specialOffer.expiresAt).toLocaleDateString(locale)}
              </p>
            )}
          </Section>

          <EmailDivider />
        </>
      )}

      {/* Getting Started Steps */}
      <EmailHeading as="h2">Getting Started</EmailHeading>

      <EmailCard variant="bordered">
        <Section style={styles.stepRow}>
          <span style={styles.stepNumber}>1</span>
          <span style={styles.stepText}>
            <strong>Browse our fleet</strong> - Find the perfect vehicle for your needs
          </span>
        </Section>
        <Section style={styles.stepRow}>
          <span style={styles.stepNumber}>2</span>
          <span style={styles.stepText}>
            <strong>Choose your dates</strong> - Select pickup and return times
          </span>
        </Section>
        <Section style={styles.stepRow}>
          <span style={styles.stepNumber}>3</span>
          <span style={styles.stepText}>
            <strong>Book instantly</strong> - Secure checkout with instant confirmation
          </span>
        </Section>
        <Section style={{ ...styles.stepRow, borderBottom: 'none' }}>
          <span style={styles.stepNumber}>4</span>
          <span style={styles.stepText}>
            <strong>Hit the road!</strong> - Pick up your car and enjoy your journey
          </span>
        </Section>
      </EmailCard>

      {/* CTA Buttons */}
      <EmailButton
        href={urls.browseFleet}
        variant="primary"
        color={branding.primaryColor}
        align="center"
        fullWidth
      >
        Browse Our Fleet
      </EmailButton>

      {urls.completeProfile && (
        <EmailButton
          href={urls.completeProfile}
          variant="outline"
          color={branding.primaryColor}
          align="center"
          fullWidth
        >
          Complete Your Profile
        </EmailButton>
      )}

      <EmailDivider />

      {/* Help Section */}
      <EmailHeading as="h3">Need Help?</EmailHeading>

      <EmailText variant="small">
        Our support team is here to assist you with any questions. Feel free to reach out anytime!
      </EmailText>

      {branding.contactEmail && (
        <EmailText variant="small">
          Email us at{' '}
          <Link href={`mailto:${branding.contactEmail}`} style={{ color: branding.primaryColor || '#3b82f6' }}>
            {branding.contactEmail}
          </Link>
        </EmailText>
      )}

      {branding.contactPhone && (
        <EmailText variant="small">
          Call us at{' '}
          <Link href={`tel:${branding.contactPhone}`} style={{ color: branding.primaryColor || '#3b82f6' }}>
            {branding.contactPhone}
          </Link>
        </EmailText>
      )}

      {urls.help && (
        <EmailText variant="muted">
          Visit our{' '}
          <Link href={urls.help} style={{ color: branding.primaryColor || '#3b82f6' }}>
            Help Center
          </Link>{' '}
          for FAQs and guides.
        </EmailText>
      )}

      <EmailText variant="muted">
        Happy travels!<br />
        The {branding.name} Team
      </EmailText>
    </BaseLayout>
  );
}

export default WelcomeEmail;
