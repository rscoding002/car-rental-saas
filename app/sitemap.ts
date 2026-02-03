import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { locales, defaultLocale } from '@/i18n/config';
import type { Locale } from '@/lib/utils/constants';
import type { Vehicle, Page } from '@/lib/supabase/types';

/**
 * Get base URL for sitemap
 */
function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
  );
}

/**
 * Static routes that exist for all locales
 */
const STATIC_ROUTES = [
  '', // Homepage
  '/fleet',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
];

/**
 * Generate sitemap entries for static routes
 */
function generateStaticEntries(baseUrl: string): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const route of STATIC_ROUTES) {
    // Create entry for each locale
    for (const locale of locales) {
      const url = `${baseUrl}/${locale}${route}`;

      // Generate alternates for all locales
      const languages: Record<string, string> = {};
      for (const altLocale of locales) {
        languages[altLocale] = `${baseUrl}/${altLocale}${route}`;
      }
      // Add x-default pointing to default locale
      languages['x-default'] = `${baseUrl}/${defaultLocale}${route}`;

      entries.push({
        url,
        lastModified: new Date(),
        changeFrequency: route === '' ? 'daily' : 'weekly',
        priority: route === '' ? 1.0 : route === '/fleet' ? 0.9 : 0.7,
        alternates: {
          languages,
        },
      });
    }
  }

  return entries;
}

/**
 * Generate sitemap entries for vehicles
 */
async function generateVehicleEntries(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  try {
    const supabase = await createClient();

    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, updated_at')
      .eq('status', 'available');

    if (vehicles && vehicles.length > 0) {
      for (const vehicle of vehicles as Pick<Vehicle, 'id' | 'updated_at'>[]) {
        for (const locale of locales) {
          const url = `${baseUrl}/${locale}/fleet/${vehicle.id}`;

          // Generate alternates for all locales
          const languages: Record<string, string> = {};
          for (const altLocale of locales) {
            languages[altLocale] = `${baseUrl}/${altLocale}/fleet/${vehicle.id}`;
          }
          languages['x-default'] = `${baseUrl}/${defaultLocale}/fleet/${vehicle.id}`;

          entries.push({
            url,
            lastModified: new Date(vehicle.updated_at),
            changeFrequency: 'weekly',
            priority: 0.8,
            alternates: {
              languages,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch vehicles for sitemap:', error);
  }

  return entries;
}

/**
 * Generate sitemap entries for CMS pages
 */
async function generateCmsPageEntries(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Reserved slugs that have dedicated routes
  const reservedSlugs = ['fleet', 'about', 'contact', 'terms', 'privacy', 'booking', 'account', 'admin'];

  try {
    const supabase = await createClient();

    const { data: pages } = await supabase
      .from('pages')
      .select('slug, updated_at')
      .eq('status', 'published');

    if (pages && pages.length > 0) {
      for (const page of pages as Pick<Page, 'slug' | 'updated_at'>[]) {
        // Skip reserved slugs
        if (reservedSlugs.includes(page.slug)) {
          continue;
        }

        for (const locale of locales) {
          const url = `${baseUrl}/${locale}/${page.slug}`;

          // Generate alternates for all locales
          const languages: Record<string, string> = {};
          for (const altLocale of locales) {
            languages[altLocale] = `${baseUrl}/${altLocale}/${page.slug}`;
          }
          languages['x-default'] = `${baseUrl}/${defaultLocale}/${page.slug}`;

          entries.push({
            url,
            lastModified: new Date(page.updated_at),
            changeFrequency: 'monthly',
            priority: 0.6,
            alternates: {
              languages,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch CMS pages for sitemap:', error);
  }

  return entries;
}

/**
 * Dynamic Sitemap Generation
 *
 * Generates a complete XML sitemap with:
 * - Static pages (homepage, fleet, about, contact, terms, privacy)
 * - Vehicle detail pages
 * - CMS pages
 *
 * All entries include hreflang alternates for all supported locales.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  // Generate all sitemap entries
  const staticEntries = generateStaticEntries(baseUrl);
  const vehicleEntries = await generateVehicleEntries(baseUrl);
  const cmsPageEntries = await generateCmsPageEntries(baseUrl);

  // Combine all entries
  return [...staticEntries, ...vehicleEntries, ...cmsPageEntries];
}
