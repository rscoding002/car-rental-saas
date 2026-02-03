/**
 * Tenant Theme Utilities
 *
 * Functions to generate CSS variables from tenant branding settings.
 * Used to apply dynamic colors, fonts, and logo per tenant.
 */

import type { TenantBranding } from '@/lib/supabase/types';

/**
 * Default branding values (matching globals.css defaults)
 */
export const DEFAULT_BRANDING: Required<TenantBranding> = {
  primaryColor: '#3B82F6', // blue-500
  secondaryColor: '#1E40AF', // blue-800
  accentColor: '#F97316', // orange-500
  fontFamily: 'Inter',
};

/**
 * HSL color representation
 */
interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL to hex color
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Color shade lightness values (0-100)
 * These produce a consistent palette from a base color
 */
const SHADE_LIGHTNESS: Record<number, number> = {
  50: 97,
  100: 94,
  200: 86,
  300: 76,
  400: 64,
  500: 50,
  600: 42,
  700: 34,
  800: 26,
  900: 18,
  950: 10,
};

/**
 * Generate a color palette from a base hex color
 * Creates shades from 50 to 950
 */
export function generateColorPalette(
  baseColor: string
): Record<number, string> {
  const rgb = hexToRgb(baseColor);
  if (!rgb) {
    return generateColorPalette(DEFAULT_BRANDING.primaryColor);
  }

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const palette: Record<number, string> = {};

  // Generate each shade
  Object.entries(SHADE_LIGHTNESS).forEach(([shade, lightness]) => {
    palette[parseInt(shade)] = hslToHex(hsl.h, hsl.s, lightness);
  });

  return palette;
}

/**
 * Generate CSS variable declarations for a color palette
 */
export function generatePaletteVariables(
  prefix: string,
  baseColor: string
): Record<string, string> {
  const palette = generateColorPalette(baseColor);
  const variables: Record<string, string> = {};

  Object.entries(palette).forEach(([shade, color]) => {
    variables[`--color-${prefix}-${shade}`] = color;
  });

  return variables;
}

/**
 * Get contrast color (black or white) for a given background color
 * Used for foreground colors on brand backgrounds
 */
export function getContrastColor(hexColor: string): string {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return '#ffffff';

  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

  // Return black for light backgrounds, white for dark
  return luminance > 0.5 ? '#0f172a' : '#ffffff';
}

/**
 * Generate all CSS variables from tenant branding
 */
export function generateBrandingCssVariables(
  branding: TenantBranding | undefined
): Record<string, string> {
  const {
    primaryColor = DEFAULT_BRANDING.primaryColor,
    secondaryColor = DEFAULT_BRANDING.secondaryColor,
    accentColor = DEFAULT_BRANDING.accentColor,
    fontFamily = DEFAULT_BRANDING.fontFamily,
  } = branding || {};

  const variables: Record<string, string> = {};

  // Generate primary color palette
  const primaryPalette = generateColorPalette(primaryColor);
  Object.entries(primaryPalette).forEach(([shade, color]) => {
    variables[`--color-primary-${shade}`] = color;
  });
  variables['--primary'] = primaryPalette[600];
  variables['--primary-foreground'] = getContrastColor(primaryPalette[600]);
  variables['--ring'] = primaryPalette[500];

  // Generate secondary color palette (using provided color as base for slate-like tones)
  // For secondary, we typically want neutral/slate tones, so we'll derive from secondaryColor
  const secondaryPalette = generateColorPalette(secondaryColor);
  Object.entries(secondaryPalette).forEach(([shade, color]) => {
    variables[`--color-secondary-${shade}`] = color;
  });

  // Generate accent color palette
  const accentPalette = generateColorPalette(accentColor);
  Object.entries(accentPalette).forEach(([shade, color]) => {
    variables[`--color-accent-${shade}`] = color;
  });
  variables['--accent'] = accentPalette[500];
  variables['--accent-foreground'] = getContrastColor(accentPalette[500]);

  // Font family
  if (fontFamily && fontFamily !== 'Inter') {
    variables['--font-tenant'] = `"${fontFamily}", var(--font-sans)`;
  }

  return variables;
}

/**
 * Convert CSS variables object to CSS string
 */
export function cssVariablesToString(
  variables: Record<string, string>
): string {
  return Object.entries(variables)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n  ');
}

/**
 * Generate inline style object for React
 */
export function generateBrandingStyle(
  branding: TenantBranding | undefined
): React.CSSProperties {
  const variables = generateBrandingCssVariables(branding);
  const style: Record<string, string> = {};

  Object.entries(variables).forEach(([key, value]) => {
    style[key] = value;
  });

  return style as React.CSSProperties;
}

/**
 * Available font families for tenant branding
 * These should be loaded via next/font or Google Fonts
 */
export const AVAILABLE_FONTS = [
  { name: 'Inter', value: 'Inter' },
  { name: 'Roboto', value: 'Roboto' },
  { name: 'Open Sans', value: 'Open Sans' },
  { name: 'Lato', value: 'Lato' },
  { name: 'Poppins', value: 'Poppins' },
  { name: 'Montserrat', value: 'Montserrat' },
  { name: 'Source Sans Pro', value: 'Source Sans Pro' },
  { name: 'Raleway', value: 'Raleway' },
  { name: 'Nunito', value: 'Nunito' },
  { name: 'Work Sans', value: 'Work Sans' },
] as const;

/**
 * Preset brand color palettes for quick selection
 */
export const PRESET_PALETTES = [
  {
    name: 'Ocean Blue',
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#F59E0B',
  },
  {
    name: 'Forest Green',
    primary: '#22C55E',
    secondary: '#166534',
    accent: '#F97316',
  },
  {
    name: 'Royal Purple',
    primary: '#8B5CF6',
    secondary: '#5B21B6',
    accent: '#EC4899',
  },
  {
    name: 'Crimson Red',
    primary: '#EF4444',
    secondary: '#991B1B',
    accent: '#FBBF24',
  },
  {
    name: 'Midnight',
    primary: '#6366F1',
    secondary: '#312E81',
    accent: '#14B8A6',
  },
  {
    name: 'Sunset Orange',
    primary: '#F97316',
    secondary: '#C2410C',
    accent: '#3B82F6',
  },
  {
    name: 'Professional Gray',
    primary: '#475569',
    secondary: '#1E293B',
    accent: '#3B82F6',
  },
  {
    name: 'Teal',
    primary: '#14B8A6',
    secondary: '#0F766E',
    accent: '#F59E0B',
  },
] as const;
