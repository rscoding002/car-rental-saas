/**
 * Metadata Generation Utilities
 *
 * Provides utilities for generating SEO-optimized metadata
 * for Next.js pages including Open Graph and Twitter Cards.
 */

import type { Metadata } from 'next';
import type { Locale } from '@/lib/utils/constants';
import { DEFAULT_LOCALE } from '@/lib/utils/constants';
import { getPageAlternates, getBaseUrl, getCanonicalUrl } from './hreflang';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Page metadata options
 */
export interface PageMetadataOptions {
  /** Page title (will be suffixed with site name) */
  title: string;
  /** Page description (150-160 characters recommended) */
  description: string;
  /** Current locale */
  locale: Locale;
  /** Page pathname (without locale prefix, e.g., '/about') */
  pathname: string;
  /** Optional keywords */
  keywords?: string[];
  /** Optional custom Open Graph image URL */
  ogImage?: string;
  /** Optional Open Graph type (default: 'website') */
  ogType?: 'website' | 'article';
  /** Optional article metadata */
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    tags?: string[];
  };
  /** Optional product metadata */
  product?: {
    price?: number;
    currency?: string;
    availability?: 'in stock' | 'out of stock';
  };
  /** Site name (default from env or 'Car Rental') */
  siteName?: string;
  /** Disable search engine indexing */
  noIndex?: boolean;
  /** Enabled locales for alternates (defaults to all) */
  enabledLocales?: Locale[];
}

/**
 * Open Graph image configuration
 */
export interface OGImageConfig {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
  type?: string;
}

/**
 * Default metadata values
 */
export const DEFAULT_METADATA = {
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || 'Car Rental',
  siteDescription: 'Premium car rental service with a wide selection of vehicles.',
  ogImage: '/images/og-default.jpg',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  twitterCard: 'summary_large_image' as const,
  twitterSite: process.env.NEXT_PUBLIC_TWITTER_HANDLE,
};

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Generate complete page metadata
 *
 * Creates a Metadata object with all SEO-relevant fields including
 * Open Graph, Twitter Cards, canonical URL, and language alternates.
 *
 * @param options - Page metadata options
 * @returns Next.js Metadata object
 *
 * @example
 * ```ts
 * // In page.tsx
 * export async function generateMetadata({ params }): Promise<Metadata> {
 *   const { locale } = await params;
 *   return generatePageMetadata({
 *     title: 'About Us',
 *     description: 'Learn about our car rental company.',
 *     locale,
 *     pathname: '/about',
 *   });
 * }
 * ```
 */
export function generatePageMetadata(options: PageMetadataOptions): Metadata {
  const {
    title,
    description,
    locale,
    pathname,
    keywords,
    ogImage,
    ogType = 'website',
    article,
    product,
    siteName = DEFAULT_METADATA.siteName,
    noIndex = false,
    enabledLocales,
  } = options;

  const baseUrl = getBaseUrl();
  const canonicalUrl = getCanonicalUrl(baseUrl, pathname, locale);
  const alternates = getPageAlternates(pathname, locale, enabledLocales);

  // Build Open Graph image config
  const ogImageUrl = ogImage
    ? ogImage.startsWith('http')
      ? ogImage
      : `${baseUrl}${ogImage}`
    : `${baseUrl}${DEFAULT_METADATA.ogImage}`;

  const ogImages: OGImageConfig[] = [
    {
      url: ogImageUrl,
      width: DEFAULT_METADATA.ogImageWidth,
      height: DEFAULT_METADATA.ogImageHeight,
      alt: title,
    },
  ];

  // Build metadata object
  const metadata: Metadata = {
    title,
    description,
    keywords: keywords?.join(', '),

    // Canonical and alternates
    alternates: {
      canonical: canonicalUrl,
      languages: alternates.languages,
    },

    // Open Graph
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName,
      locale: localeToOGLocale(locale),
      type: ogType as 'website' | 'article',
      images: ogImages.map((img) => ({
        url: img.url,
        width: img.width,
        height: img.height,
        alt: img.alt,
      })),
    },

    // Twitter Card
    twitter: {
      card: DEFAULT_METADATA.twitterCard,
      title,
      description,
      images: [ogImageUrl],
      ...(DEFAULT_METADATA.twitterSite && { site: DEFAULT_METADATA.twitterSite }),
    },

    // Robots
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };

  // Add article metadata if provided
  if (article && metadata.openGraph) {
    metadata.openGraph = {
      ...metadata.openGraph,
      type: 'article',
      ...(article.publishedTime && { publishedTime: article.publishedTime }),
      ...(article.modifiedTime && { modifiedTime: article.modifiedTime }),
      ...(article.author && { authors: [article.author] }),
      ...(article.tags && { tags: article.tags }),
    };
  }

  return metadata;
}

/**
 * Generate metadata for vehicle/product pages
 *
 * Specialized metadata generation for vehicle pages with
 * product-specific Open Graph properties.
 *
 * @example
 * ```ts
 * export async function generateMetadata({ params }): Promise<Metadata> {
 *   const vehicle = await getVehicle(params.id);
 *   return generateVehicleMetadata({
 *     vehicle: {
 *       make: vehicle.make,
 *       model: vehicle.model,
 *       year: vehicle.year,
 *       description: vehicle.description,
 *       image: vehicle.photos[0]?.url,
 *       price: 45,
 *       currency: 'EUR',
 *     },
 *     locale,
 *     pathname: `/fleet/${vehicle.id}`,
 *   });
 * }
 * ```
 */
export interface VehicleMetadataOptions {
  vehicle: {
    make: string;
    model: string;
    year: number;
    description?: string;
    image?: string;
    price?: number;
    currency?: string;
    features?: string[];
  };
  locale: Locale;
  pathname: string;
  enabledLocales?: Locale[];
}

export function generateVehicleMetadata(options: VehicleMetadataOptions): Metadata {
  const { vehicle, locale, pathname, enabledLocales } = options;

  const title = `${vehicle.make} ${vehicle.model} ${vehicle.year}`;
  const description =
    vehicle.description ||
    `Rent a ${vehicle.year} ${vehicle.make} ${vehicle.model}. Premium car rental with flexible booking options.`;

  const keywords = [
    `${vehicle.make} rental`,
    `${vehicle.model} rental`,
    `rent ${vehicle.make}`,
    'car rental',
    ...(vehicle.features || []),
  ];

  return generatePageMetadata({
    title,
    description,
    locale,
    pathname,
    keywords,
    ogImage: vehicle.image,
    ogType: 'website', // Use 'website' as 'product' isn't standard OG type
    product: vehicle.price
      ? {
          price: vehicle.price,
          currency: vehicle.currency || 'EUR',
          availability: 'in stock',
        }
      : undefined,
    enabledLocales,
  });
}

/**
 * Generate metadata for CMS pages
 *
 * Uses page-specific metadata if available, falls back to defaults.
 *
 * @example
 * ```ts
 * const page = await getPage('about');
 * return generateCmsPageMetadata({
 *   page: {
 *     title: page.title[locale],
 *     description: page.meta[locale]?.description,
 *     ogImage: page.meta[locale]?.ogImage,
 *   },
 *   locale,
 *   pathname: `/${page.slug}`,
 * });
 * ```
 */
export interface CmsPageMetadataOptions {
  page: {
    title: string;
    description?: string;
    keywords?: string;
    ogImage?: string;
  };
  locale: Locale;
  pathname: string;
  enabledLocales?: Locale[];
}

export function generateCmsPageMetadata(options: CmsPageMetadataOptions): Metadata {
  const { page, locale, pathname, enabledLocales } = options;

  return generatePageMetadata({
    title: page.title,
    description: page.description || DEFAULT_METADATA.siteDescription,
    locale,
    pathname,
    keywords: page.keywords?.split(',').map((k) => k.trim()),
    ogImage: page.ogImage,
    enabledLocales,
  });
}

/**
 * Generate metadata for branch/location pages
 */
export interface BranchMetadataOptions {
  branch: {
    name: string;
    city: string;
    address: string;
    description?: string;
  };
  locale: Locale;
  pathname: string;
  enabledLocales?: Locale[];
}

export function generateBranchMetadata(options: BranchMetadataOptions): Metadata {
  const { branch, locale, pathname, enabledLocales } = options;

  const title = `${branch.name} - ${branch.city}`;
  const description =
    branch.description ||
    `Car rental at ${branch.name}, ${branch.city}. ${branch.address}. Book your vehicle today.`;

  const keywords = [
    `car rental ${branch.city}`,
    `rent car ${branch.city}`,
    `${branch.name} car rental`,
    branch.city,
  ];

  return generatePageMetadata({
    title,
    description,
    locale,
    pathname,
    keywords,
    enabledLocales,
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert our locale to Open Graph locale format
 */
function localeToOGLocale(locale: Locale): string {
  const mapping: Record<Locale, string> = {
    en: 'en_US',
    lt: 'lt_LT',
    ru: 'ru_RU',
  };
  return mapping[locale] || 'en_US';
}

/**
 * Generate title with site name suffix
 *
 * @example
 * ```ts
 * formatTitle('About Us'); // 'About Us | Car Rental'
 * formatTitle('About Us', 'My Site'); // 'About Us | My Site'
 * ```
 */
export function formatTitle(
  pageTitle: string,
  siteName: string = DEFAULT_METADATA.siteName
): string {
  return `${pageTitle} | ${siteName}`;
}

/**
 * Truncate description to recommended length
 *
 * @param description - Full description
 * @param maxLength - Maximum length (default 160)
 * @returns Truncated description with ellipsis if needed
 */
export function truncateDescription(
  description: string,
  maxLength: number = 160
): string {
  if (description.length <= maxLength) {
    return description;
  }

  // Find last space before maxLength
  const truncated = description.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength - 30) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Generate keywords string from array
 */
export function formatKeywords(keywords: string[]): string {
  return keywords.join(', ');
}

/**
 * Extract plain text from HTML/markdown for description
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Generate structured breadcrumb for SEO
 */
export function generateBreadcrumbList(
  items: Array<{ name: string; url: string }>
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
