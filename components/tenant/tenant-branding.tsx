'use client';

import { useEffect, useMemo } from 'react';

import { useTenantContext } from '@/lib/tenant/tenant-context';
import { generateBrandingCssVariables, DEFAULT_BRANDING } from '@/lib/tenant/theme';
import type { TenantBranding as TenantBrandingType } from '@/lib/supabase/types';

/**
 * TenantBranding Component
 *
 * Applies tenant branding CSS variables to the document root.
 * This enables dynamic theming based on tenant settings.
 *
 * Features:
 * - Generates full color palettes from primary, secondary, and accent colors
 * - Applies custom font family if configured
 * - Falls back to defaults if no branding is configured
 * - Updates dynamically when tenant changes
 *
 * Usage:
 * ```tsx
 * // In layout or app root
 * <TenantBranding />
 * ```
 */
export function TenantBranding() {
  const { branding, tenant } = useTenantContext();

  // Generate CSS variables from branding
  const cssVariables = useMemo(() => {
    return generateBrandingCssVariables(branding);
  }, [branding]);

  // Apply CSS variables to document root
  useEffect(() => {
    const root = document.documentElement;

    // Apply all CSS variables
    Object.entries(cssVariables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Cleanup: reset to defaults when component unmounts or tenant changes
    return () => {
      const defaultVariables = generateBrandingCssVariables(DEFAULT_BRANDING);
      Object.entries(defaultVariables).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });
    };
  }, [cssVariables]);

  // Inject custom font with preconnect for faster loading (improves LCP)
  useEffect(() => {
    if (branding?.fontFamily && branding.fontFamily !== 'Inter') {
      // Add preconnect hints for faster font loading
      const preconnectId = 'google-fonts-preconnect';
      if (!document.getElementById(preconnectId)) {
        const preconnect = document.createElement('link');
        preconnect.id = preconnectId;
        preconnect.rel = 'preconnect';
        preconnect.href = 'https://fonts.googleapis.com';
        document.head.appendChild(preconnect);

        const preconnectStatic = document.createElement('link');
        preconnectStatic.rel = 'preconnect';
        preconnectStatic.href = 'https://fonts.gstatic.com';
        preconnectStatic.crossOrigin = 'anonymous';
        document.head.appendChild(preconnectStatic);
      }

      // Create a Google Fonts link if not already present
      const fontId = `tenant-font-${branding.fontFamily.replace(/\s+/g, '-').toLowerCase()}`;
      let link = document.getElementById(fontId) as HTMLLinkElement | null;

      if (!link) {
        link = document.createElement('link');
        link.id = fontId;
        link.rel = 'stylesheet';
        // Use font-display: swap to prevent FOIT (Flash of Invisible Text)
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(branding.fontFamily)}:wght@400;500;600;700&display=swap`;
        document.head.appendChild(link);
      }

      // Apply the font to body
      document.body.style.fontFamily = `"${branding.fontFamily}", var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif`;

      return () => {
        // Reset font on cleanup
        document.body.style.fontFamily = '';
      };
    }
  }, [branding?.fontFamily]);

  // This component doesn't render anything visible
  return null;
}

/**
 * TenantBrandingStyle Component
 *
 * Alternative approach: renders a style tag with CSS variables.
 * Useful for server-side rendering or when you want the styles in markup.
 */
interface TenantBrandingStyleProps {
  branding?: TenantBrandingType;
}

export function TenantBrandingStyle({ branding }: TenantBrandingStyleProps) {
  const cssVariables = generateBrandingCssVariables(branding);

  const cssString = Object.entries(cssVariables)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n    ');

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `:root {\n    ${cssString}\n  }`,
      }}
    />
  );
}

/**
 * Hook to get branding-aware CSS class
 * Returns classes that use the tenant's brand colors
 */
export function useBrandingClasses() {
  const { branding } = useTenantContext();

  return {
    // Primary colors
    primaryBg: 'bg-primary',
    primaryText: 'text-primary',
    primaryBorder: 'border-primary',
    primaryHover: 'hover:bg-primary-600',

    // Accent colors
    accentBg: 'bg-accent',
    accentText: 'text-accent',
    accentBorder: 'border-accent',
    accentHover: 'hover:bg-accent-600',

    // Whether branding is customized
    isCustomBranding:
      branding?.primaryColor !== DEFAULT_BRANDING.primaryColor ||
      branding?.accentColor !== DEFAULT_BRANDING.accentColor,
  };
}

export default TenantBranding;
