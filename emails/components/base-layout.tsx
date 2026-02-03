/**
 * Base Email Layout Component
 *
 * Provides consistent structure for all email templates including:
 * - Header with logo and branding
 * - Footer with contact info and links
 * - Tenant-specific styling via props
 *
 * @see https://react.email/docs/components
 */

import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
  Font,
} from '@react-email/components';
import * as React from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface TenantBrandingProps {
  /** Tenant display name */
  name: string;
  /** Logo URL (optional) */
  logoUrl?: string | null;
  /** Primary brand color (hex) */
  primaryColor?: string;
  /** Secondary brand color (hex) */
  secondaryColor?: string;
  /** Accent color (hex) */
  accentColor?: string;
  /** Contact email */
  contactEmail?: string;
  /** Contact phone */
  contactPhone?: string;
  /** Physical address */
  address?: string;
  /** Website URL */
  websiteUrl?: string;
}

export interface BaseLayoutProps {
  /** Email preview text (shown in inbox) */
  preview: string;
  /** Tenant branding information */
  branding: TenantBrandingProps;
  /** Email content */
  children: React.ReactNode;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_BRANDING: Required<Omit<TenantBrandingProps, 'contactEmail' | 'contactPhone' | 'address' | 'websiteUrl' | 'logoUrl'>> = {
  name: 'Car Rental',
  primaryColor: '#3B82F6',
  secondaryColor: '#1E40AF',
  accentColor: '#F59E0B',
};

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (branding: TenantBrandingProps) => {
  const primary = branding.primaryColor || DEFAULT_BRANDING.primaryColor;
  const secondary = branding.secondaryColor || DEFAULT_BRANDING.secondaryColor;

  return {
    main: {
      backgroundColor: '#f6f9fc',
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
    },
    container: {
      backgroundColor: '#ffffff',
      margin: '0 auto',
      padding: '20px 0 48px',
      marginBottom: '64px',
      maxWidth: '600px',
    },
    header: {
      padding: '24px 32px',
      borderBottom: `3px solid ${primary}`,
    },
    logo: {
      margin: '0 auto',
      display: 'block' as const,
    },
    logoText: {
      fontSize: '24px',
      fontWeight: 'bold' as const,
      color: primary,
      textAlign: 'center' as const,
      margin: '0',
    },
    content: {
      padding: '32px',
    },
    footer: {
      padding: '24px 32px',
      backgroundColor: '#f8fafc',
      borderTop: '1px solid #e2e8f0',
    },
    footerText: {
      fontSize: '12px',
      color: '#64748b',
      lineHeight: '20px',
      margin: '0 0 8px',
      textAlign: 'center' as const,
    },
    footerLink: {
      color: secondary,
      textDecoration: 'none',
    },
    footerDivider: {
      margin: '16px 0',
      borderTop: '1px solid #e2e8f0',
    },
    socialLinks: {
      textAlign: 'center' as const,
      margin: '16px 0',
    },
    copyright: {
      fontSize: '11px',
      color: '#94a3b8',
      textAlign: 'center' as const,
      margin: '16px 0 0',
    },
  };
};

// ============================================================================
// COMPONENT
// ============================================================================

export function BaseLayout({ preview, branding, children }: BaseLayoutProps) {
  const styles = createStyles(branding);
  const currentYear = new Date().getFullYear();

  return (
    <Html>
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="sans-serif"
          webFont={{
            url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Inter"
          fallbackFontFamily="sans-serif"
          webFont={{
            url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2',
            format: 'woff2',
          }}
          fontWeight={600}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            {branding.logoUrl ? (
              <Img
                src={branding.logoUrl}
                width="180"
                height="50"
                alt={branding.name}
                style={styles.logo}
              />
            ) : (
              <Text style={styles.logoText}>{branding.name}</Text>
            )}
          </Section>

          {/* Main Content */}
          <Section style={styles.content}>{children}</Section>

          {/* Footer */}
          <Section style={styles.footer}>
            {/* Contact Information */}
            {(branding.contactEmail || branding.contactPhone || branding.address) && (
              <>
                <Text style={styles.footerText}>
                  {branding.contactEmail && (
                    <>
                      <Link href={`mailto:${branding.contactEmail}`} style={styles.footerLink}>
                        {branding.contactEmail}
                      </Link>
                      {(branding.contactPhone || branding.address) && ' | '}
                    </>
                  )}
                  {branding.contactPhone && (
                    <>
                      <Link href={`tel:${branding.contactPhone}`} style={styles.footerLink}>
                        {branding.contactPhone}
                      </Link>
                      {branding.address && ' | '}
                    </>
                  )}
                  {branding.address && <span>{branding.address}</span>}
                </Text>
                <Hr style={styles.footerDivider} />
              </>
            )}

            {/* Website Link */}
            {branding.websiteUrl && (
              <Text style={styles.footerText}>
                <Link href={branding.websiteUrl} style={styles.footerLink}>
                  Visit our website
                </Link>
              </Text>
            )}

            {/* Unsubscribe & Legal */}
            <Text style={styles.footerText}>
              This email was sent by {branding.name}. If you have any questions,
              please contact our support team.
            </Text>

            {/* Copyright */}
            <Text style={styles.copyright}>
              &copy; {currentYear} {branding.name}. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default BaseLayout;
