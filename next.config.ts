import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

/**
 * next-intl plugin configuration
 * Points to the request configuration file for server-side locale handling
 */
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  /**
   * TypeScript configuration
   * TODO: Fix TypeScript errors and remove this
   */
  typescript: {
    ignoreBuildErrors: true,
  },

  /**
   * ESLint configuration
   * TODO: Fix ESLint errors and remove this
   */
  eslint: {
    ignoreDuringBuilds: true,
  },

  /**
   * Image optimization configuration
   * Optimized for mobile-first responsive delivery
   */
  images: {
    /**
     * Remote patterns for trusted image domains
     * Supports Supabase storage and common image CDNs
     */
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.imgix.net',
        pathname: '/**',
      },
    ],

    /**
     * Device breakpoints for responsive srcset generation
     * Aligned with Tailwind CSS breakpoints for consistency
     * Mobile-first: 320, 375, 425 (mobile), 640 (sm), 768 (md), 1024 (lg), 1280 (xl), 1536 (2xl)
     */
    deviceSizes: [320, 375, 425, 640, 768, 1024, 1280, 1536, 1920],

    /**
     * Image sizes for srcset generation (smaller images, thumbnails, icons)
     * Used when 'sizes' prop specifies fixed widths
     */
    imageSizes: [16, 32, 48, 64, 96, 128, 192, 256, 384, 512],

    /**
     * Enable modern image formats for better compression
     * AVIF offers ~50% smaller files than WebP, with WebP as fallback
     * Order matters: first format that browser supports is used
     */
    formats: ['image/avif', 'image/webp'],

    /**
     * Minimum cache TTL for optimized images (in seconds)
     * 1 week = 604800 seconds - balances freshness with performance
     */
    minimumCacheTTL: 604800,

    /**
     * Disable static image imports size warning in development
     * Enable in production for debugging if needed
     */
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  /**
   * Experimental features
   */
  experimental: {
    // Enable server actions (enabled by default in Next.js 14+)
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  /**
   * Security headers
   * Note: Additional headers are configured in vercel.json for production
   */
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on',
        },
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
      ],
    },
  ],
};

export default withNextIntl(nextConfig);
