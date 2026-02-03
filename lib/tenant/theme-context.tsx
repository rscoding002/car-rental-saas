'use client';

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

import { useTenantContext } from './tenant-context';
import {
  generateColorPalette,
  getContrastColor,
  DEFAULT_BRANDING,
} from './theme';
import type { TenantBranding } from '@/lib/supabase/types';

/**
 * Tenant Theme Context
 *
 * Provides computed theme values and utilities for styling components
 * based on tenant branding settings.
 */

/**
 * Color palette type with all shades
 */
export interface ColorPalette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
  DEFAULT: string;
  foreground: string;
}

/**
 * Theme context value
 */
export interface TenantThemeContextValue {
  /** Raw branding settings */
  branding: TenantBranding;

  /** Whether using custom branding (not defaults) */
  isCustomBranding: boolean;

  /** Computed color palettes */
  colors: {
    primary: ColorPalette;
    secondary: ColorPalette;
    accent: ColorPalette;
  };

  /** Logo URL if set */
  logoUrl: string | null;

  /** Tenant name */
  tenantName: string;

  /** Font family */
  fontFamily: string;

  /** Get color value by name and shade */
  getColor: (
    color: 'primary' | 'secondary' | 'accent',
    shade?: keyof ColorPalette
  ) => string;

  /** Get CSS variable name for a color */
  getCssVar: (
    color: 'primary' | 'secondary' | 'accent',
    shade?: number
  ) => string;

  /** Get inline style for a branded element */
  getBrandedStyle: (options?: {
    background?: 'primary' | 'secondary' | 'accent';
    backgroundShade?: number;
    text?: 'primary' | 'secondary' | 'accent' | 'auto';
    textShade?: number;
  }) => React.CSSProperties;
}

const TenantThemeContext = createContext<TenantThemeContextValue | null>(null);

/**
 * Build a color palette object from a base color
 */
function buildColorPalette(baseColor: string): ColorPalette {
  const palette = generateColorPalette(baseColor);
  return {
    50: palette[50],
    100: palette[100],
    200: palette[200],
    300: palette[300],
    400: palette[400],
    500: palette[500],
    600: palette[600],
    700: palette[700],
    800: palette[800],
    900: palette[900],
    950: palette[950],
    DEFAULT: palette[500],
    foreground: getContrastColor(palette[500]),
  };
}

export interface TenantThemeProviderProps {
  children: ReactNode;
}

/**
 * Tenant Theme Provider
 *
 * Provides computed theme values and utilities based on tenant branding.
 * Must be used inside TenantProvider.
 *
 * Usage:
 * ```tsx
 * <TenantProvider tenant={tenant}>
 *   <TenantThemeProvider>
 *     {children}
 *   </TenantThemeProvider>
 * </TenantProvider>
 * ```
 */
export function TenantThemeProvider({ children }: TenantThemeProviderProps) {
  const { tenant, branding: rawBranding } = useTenantContext();

  const value = useMemo<TenantThemeContextValue>(() => {
    // Merge with defaults
    const branding: TenantBranding = {
      primaryColor: rawBranding?.primaryColor || DEFAULT_BRANDING.primaryColor,
      secondaryColor: rawBranding?.secondaryColor || DEFAULT_BRANDING.secondaryColor,
      accentColor: rawBranding?.accentColor || DEFAULT_BRANDING.accentColor,
      fontFamily: rawBranding?.fontFamily || DEFAULT_BRANDING.fontFamily,
    };

    // Check if using custom branding
    const isCustomBranding =
      branding.primaryColor !== DEFAULT_BRANDING.primaryColor ||
      branding.secondaryColor !== DEFAULT_BRANDING.secondaryColor ||
      branding.accentColor !== DEFAULT_BRANDING.accentColor ||
      branding.fontFamily !== DEFAULT_BRANDING.fontFamily;

    // Build color palettes
    const colors = {
      primary: buildColorPalette(branding.primaryColor!),
      secondary: buildColorPalette(branding.secondaryColor!),
      accent: buildColorPalette(branding.accentColor!),
    };

    // Get color helper
    const getColor = (
      color: 'primary' | 'secondary' | 'accent',
      shade: keyof ColorPalette = 'DEFAULT'
    ): string => {
      return colors[color][shade];
    };

    // Get CSS variable name
    const getCssVar = (
      color: 'primary' | 'secondary' | 'accent',
      shade: number = 500
    ): string => {
      return `var(--color-${color}-${shade})`;
    };

    // Get branded inline style
    const getBrandedStyle = (options?: {
      background?: 'primary' | 'secondary' | 'accent';
      backgroundShade?: number;
      text?: 'primary' | 'secondary' | 'accent' | 'auto';
      textShade?: number;
    }): React.CSSProperties => {
      const style: React.CSSProperties = {};

      if (options?.background) {
        const shade = options.backgroundShade || 500;
        const palette = colors[options.background];
        const bgColor = palette[shade as keyof ColorPalette] || palette.DEFAULT;
        style.backgroundColor = bgColor;

        // Auto-calculate text color if set to 'auto'
        if (options.text === 'auto') {
          style.color = getContrastColor(bgColor);
        }
      }

      if (options?.text && options.text !== 'auto') {
        const shade = options.textShade || 500;
        const palette = colors[options.text];
        style.color = palette[shade as keyof ColorPalette] || palette.DEFAULT;
      }

      return style;
    };

    return {
      branding,
      isCustomBranding,
      colors,
      logoUrl: tenant?.logo_url || null,
      tenantName: tenant?.name || 'Car Rental',
      fontFamily: branding.fontFamily || DEFAULT_BRANDING.fontFamily,
      getColor,
      getCssVar,
      getBrandedStyle,
    };
  }, [tenant, rawBranding]);

  return (
    <TenantThemeContext.Provider value={value}>
      {children}
    </TenantThemeContext.Provider>
  );
}

/**
 * Hook to access tenant theme
 *
 * @throws Error if used outside TenantThemeProvider
 */
export function useTenantTheme(): TenantThemeContextValue {
  const context = useContext(TenantThemeContext);

  if (!context) {
    throw new Error('useTenantTheme must be used within a TenantThemeProvider');
  }

  return context;
}

/**
 * Hook to safely access tenant theme
 * Returns null if not within TenantThemeProvider
 */
export function useTenantThemeSafe(): TenantThemeContextValue | null {
  return useContext(TenantThemeContext);
}

/**
 * Hook to get specific branded colors
 */
export function useBrandColors() {
  const theme = useTenantTheme();

  return {
    primary: theme.colors.primary.DEFAULT,
    primaryLight: theme.colors.primary[100],
    primaryDark: theme.colors.primary[700],
    secondary: theme.colors.secondary.DEFAULT,
    secondaryLight: theme.colors.secondary[100],
    secondaryDark: theme.colors.secondary[700],
    accent: theme.colors.accent.DEFAULT,
    accentLight: theme.colors.accent[100],
    accentDark: theme.colors.accent[700],
  };
}

/**
 * Hook to get tenant logo and name for branding
 */
export function useTenantBrand() {
  const theme = useTenantTheme();

  return {
    logoUrl: theme.logoUrl,
    name: theme.tenantName,
    hasLogo: !!theme.logoUrl,
    fontFamily: theme.fontFamily,
  };
}
