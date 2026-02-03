import { MetadataRoute } from 'next';

/**
 * Get base URL for robots.txt sitemap reference
 */
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

/**
 * Dynamic Robots.txt Generation
 *
 * Generates robots.txt with:
 * - Allow all crawlers for public pages
 * - Disallow admin, API, and auth routes
 * - Reference to dynamic sitemap
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/platform-admin/',
          '/_next/',
          '/*/admin/',
          '/*/account/',
          '/*/login',
          '/*/register',
          '/*/forgot-password',
          '/*/reset-password',
          '/*/verify-email',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
