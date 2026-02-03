import { Geist, Geist_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

import { locales, isValidLocale, localeMetadata } from '@/i18n/config';
import { AuthProvider } from '@/lib/auth/auth-context';
import { TenantProvider } from '@/lib/tenant/tenant-context';
import { TenantThemeProvider } from '@/lib/tenant/theme-context';
import { resolveTenantFromHostname } from '@/lib/tenant/queries';
import { createClient } from '@/lib/supabase/server';
import { TenantBranding } from '@/components/tenant/tenant-branding';
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
  renderJsonLd,
} from '@/lib/seo/schema';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import type { Locale } from '@/i18n/config';

import '../globals.css';

/**
 * Font Configuration
 *
 * Using next/font for optimized font loading:
 * - Self-hosted fonts (no external requests to Google)
 * - Automatic font-display: swap for FOIT prevention
 * - Preloading of critical font files
 * - CSS size-adjust for CLS prevention
 * - Extended character support for Lithuanian (latin-ext)
 */
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  preload: false, // Defer loading - monospace font rarely used above-fold, improves LCP
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
  adjustFontFallback: true,
});

/**
 * Generate static params for all supported locales
 * This enables static generation for locale routes
 */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/**
 * Generate metadata for the locale layout
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: {
      template: '%s | Car Rental',
      default: 'Car Rental - Premium Vehicle Rentals',
    },
    description: 'Premium car rental service with a wide selection of vehicles.',
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: '/en',
        lt: '/lt',
        ru: '/ru',
      },
    },
    openGraph: {
      type: 'website',
      locale: locale,
      siteName: 'Car Rental',
    },
  };
}

/**
 * Locale Layout Props
 */
interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Locale Layout
 *
 * Root layout for all locale-specific pages.
 * Provides:
 * - NextIntlClientProvider for translations
 * - AuthProvider for authentication state
 * - TenantProvider for multi-tenant context
 * - Proper HTML lang attribute
 * - Font configuration
 */
export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  // Validate locale
  if (!isValidLocale(locale)) {
    notFound();
  }

  // Enable static rendering for this locale
  setRequestLocale(locale);

  // Get messages for the current locale
  const messages = await getMessages();

  // Get locale metadata
  const { lang, dir } = localeMetadata[locale as Locale];

  // Resolve tenant from hostname
  const headersList = await headers();
  const hostname = headersList.get('host') || 'localhost';
  const supabase = await createClient();
  const tenant = await resolveTenantFromHostname(supabase, hostname);

  // Generate organization schema from tenant data or defaults
  const siteName = tenant?.name || process.env.NEXT_PUBLIC_SITE_NAME || 'Car Rental';
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${hostname}`;

  const organizationSchema = generateOrganizationSchema({
    name: siteName,
    description: 'Premium car rental service with a wide selection of vehicles.',
    url: siteUrl,
    logo: tenant?.settings?.branding?.logo || '/images/logo.png',
    email: tenant?.settings?.contact?.email || 'contact@carrental.lt',
    phone: tenant?.settings?.contact?.phone,
    address: tenant?.settings?.contact?.address
      ? {
          streetAddress: tenant.settings.contact.address,
          addressLocality: tenant.settings.contact.city,
          addressCountry: tenant.settings.contact.country || 'LT',
        }
      : {
          addressLocality: 'Vilnius',
          addressCountry: 'LT',
        },
    sameAs: [
      tenant?.settings?.social?.facebook,
      tenant?.settings?.social?.instagram,
      tenant?.settings?.social?.twitter,
      tenant?.settings?.social?.linkedin,
    ].filter(Boolean) as string[],
  });

  const webSiteSchema = generateWebSiteSchema({
    name: siteName,
    description: 'Premium car rental service with a wide selection of vehicles.',
    searchPath: '/fleet',
  });

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {/* Organization Schema JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: renderJsonLd(organizationSchema) }}
        />
        {/* WebSite Schema JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: renderJsonLd(webSiteSchema) }}
        />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <TenantProvider tenant={tenant}>
            <TenantThemeProvider>
              <TenantBranding />
              <AuthProvider>{children}</AuthProvider>
            </TenantThemeProvider>
          </TenantProvider>
        </NextIntlClientProvider>
        {/* Vercel Analytics - tracks page views and custom events */}
        <Analytics />
        {/* Vercel Speed Insights - monitors Core Web Vitals (LCP, FID, CLS, TTFB, INP) */}
        <SpeedInsights />
      </body>
    </html>
  );
}
