/**
 * Block Component Registry
 *
 * Maps block types to their React components for dynamic rendering.
 * Uses dynamic imports for code splitting and lazy loading.
 */

import { lazy, type ComponentType } from 'react';
import type {
  BlockType,
  BlockProps,
  HeroBlockProps,
  FeaturesBlockProps,
  FleetGalleryBlockProps,
  TestimonialsBlockProps,
  FAQBlockProps,
  CTABlockProps,
  TextImageBlockProps,
  ContactFormBlockProps,
  LocationMapBlockProps,
  PricingTableBlockProps,
  TextBlockProps,
  ImageBlockProps,
  VideoBlockProps,
  DividerBlockProps,
  SpacerBlockProps,
  HTMLBlockProps,
} from './block-types';
import type { BlockSettings } from '@/lib/supabase/types';

// ============================================================================
// COMPONENT TYPE DEFINITIONS
// ============================================================================

/** Base block component type */
export type BlockComponent<P extends BlockProps = BlockProps> = ComponentType<P>;

/** Map of block types to their component types */
export interface BlockComponentMap {
  hero: BlockComponent<HeroBlockProps>;
  features: BlockComponent<FeaturesBlockProps>;
  fleet_gallery: BlockComponent<FleetGalleryBlockProps>;
  testimonials: BlockComponent<TestimonialsBlockProps>;
  faq: BlockComponent<FAQBlockProps>;
  cta: BlockComponent<CTABlockProps>;
  text_image: BlockComponent<TextImageBlockProps>;
  contact_form: BlockComponent<ContactFormBlockProps>;
  location_map: BlockComponent<LocationMapBlockProps>;
  pricing_table: BlockComponent<PricingTableBlockProps>;
  text: BlockComponent<TextBlockProps>;
  image: BlockComponent<ImageBlockProps>;
  video: BlockComponent<VideoBlockProps>;
  divider: BlockComponent<DividerBlockProps>;
  spacer: BlockComponent<SpacerBlockProps>;
  html: BlockComponent<HTMLBlockProps>;
}

// ============================================================================
// LAZY-LOADED COMPONENTS
// ============================================================================

/**
 * Lazy-loaded block components for code splitting
 * Components are loaded on-demand when first rendered
 */
export const lazyBlockComponents: BlockComponentMap = {
  hero: lazy(() =>
    import('@/components/blocks/hero-block').then((mod) => ({ default: mod.HeroBlock }))
  ),
  features: lazy(() =>
    import('@/components/blocks/features-block').then((mod) => ({ default: mod.FeaturesBlock }))
  ),
  fleet_gallery: lazy(() =>
    import('@/components/blocks/fleet-gallery-block').then((mod) => ({
      default: mod.FleetGalleryBlock,
    }))
  ),
  testimonials: lazy(() =>
    import('@/components/blocks/testimonials-block').then((mod) => ({
      default: mod.TestimonialsBlock,
    }))
  ),
  faq: lazy(() =>
    import('@/components/blocks/faq-block').then((mod) => ({ default: mod.FAQBlock }))
  ),
  cta: lazy(() =>
    import('@/components/blocks/cta-block').then((mod) => ({ default: mod.CTABlock }))
  ),
  text_image: lazy(() =>
    import('@/components/blocks/text-image-block').then((mod) => ({ default: mod.TextImageBlock }))
  ),
  contact_form: lazy(() =>
    import('@/components/blocks/contact-form-block').then((mod) => ({
      default: mod.ContactFormBlock,
    }))
  ),
  location_map: lazy(() =>
    import('@/components/blocks/location-map-block').then((mod) => ({
      default: mod.LocationMapBlock,
    }))
  ),
  pricing_table: lazy(() =>
    import('@/components/blocks/pricing-table-block').then((mod) => ({
      default: mod.PricingTableBlock,
    }))
  ),
  text: lazy(() =>
    import('@/components/blocks/text-block').then((mod) => ({ default: mod.TextBlock }))
  ),
  image: lazy(() =>
    import('@/components/blocks/image-block').then((mod) => ({ default: mod.ImageBlock }))
  ),
  video: lazy(() =>
    import('@/components/blocks/video-block').then((mod) => ({ default: mod.VideoBlock }))
  ),
  divider: lazy(() =>
    import('@/components/blocks/divider-block').then((mod) => ({ default: mod.DividerBlock }))
  ),
  spacer: lazy(() =>
    import('@/components/blocks/spacer-block').then((mod) => ({ default: mod.SpacerBlock }))
  ),
  html: lazy(() =>
    import('@/components/blocks/html-block').then((mod) => ({ default: mod.HTMLBlock }))
  ),
};

// ============================================================================
// REGISTRY FUNCTIONS
// ============================================================================

/**
 * Get the lazy-loaded component for a block type
 * @param blockType - The type of block to get component for
 * @returns The lazy-loaded React component
 */
export function getBlockComponent<T extends BlockType>(
  blockType: T
): BlockComponentMap[T] | null {
  const component = lazyBlockComponents[blockType];
  return component || null;
}

/**
 * Check if a block type has a registered component
 * @param blockType - The block type to check
 * @returns True if the block type has a registered component
 */
export function hasBlockComponent(blockType: string): blockType is BlockType {
  return blockType in lazyBlockComponents;
}

/**
 * Get all registered block types
 * @returns Array of all registered block types
 */
export function getRegisteredBlockTypes(): BlockType[] {
  return Object.keys(lazyBlockComponents) as BlockType[];
}

// ============================================================================
// BLOCK METADATA
// ============================================================================

/** Block category for organizing in editor */
export type BlockCategory = 'content' | 'media' | 'interactive' | 'layout' | 'advanced';

/** Metadata for a block type */
export interface BlockMetadata {
  type: BlockType;
  name: string;
  description: string;
  category: BlockCategory;
  icon: string;
  preview?: string;
}

/** Metadata for all block types */
export const blockMetadata: Record<BlockType, BlockMetadata> = {
  hero: {
    type: 'hero',
    name: 'Hero',
    description: 'Full-width banner with heading, subtext, and call-to-action',
    category: 'content',
    icon: 'layout-template',
  },
  features: {
    type: 'features',
    name: 'Features',
    description: 'Grid of features with icons and descriptions',
    category: 'content',
    icon: 'grid-3x3',
  },
  fleet_gallery: {
    type: 'fleet_gallery',
    name: 'Fleet Gallery',
    description: 'Showcase vehicles from your fleet',
    category: 'content',
    icon: 'car',
  },
  testimonials: {
    type: 'testimonials',
    name: 'Testimonials',
    description: 'Customer reviews and testimonials',
    category: 'content',
    icon: 'quote',
  },
  faq: {
    type: 'faq',
    name: 'FAQ',
    description: 'Frequently asked questions with accordion',
    category: 'interactive',
    icon: 'help-circle',
  },
  cta: {
    type: 'cta',
    name: 'Call to Action',
    description: 'Call-to-action section with button',
    category: 'content',
    icon: 'megaphone',
  },
  text_image: {
    type: 'text_image',
    name: 'Text with Image',
    description: 'Text content alongside an image',
    category: 'content',
    icon: 'layout-sidebar',
  },
  contact_form: {
    type: 'contact_form',
    name: 'Contact Form',
    description: 'Contact form with customizable fields',
    category: 'interactive',
    icon: 'mail',
  },
  location_map: {
    type: 'location_map',
    name: 'Location Map',
    description: 'Map showing branch locations',
    category: 'interactive',
    icon: 'map',
  },
  pricing_table: {
    type: 'pricing_table',
    name: 'Pricing Table',
    description: 'Pricing tiers comparison',
    category: 'content',
    icon: 'table',
  },
  text: {
    type: 'text',
    name: 'Text',
    description: 'Rich text content',
    category: 'content',
    icon: 'type',
  },
  image: {
    type: 'image',
    name: 'Image',
    description: 'Single image with optional caption',
    category: 'media',
    icon: 'image',
  },
  video: {
    type: 'video',
    name: 'Video',
    description: 'Embedded video player',
    category: 'media',
    icon: 'video',
  },
  divider: {
    type: 'divider',
    name: 'Divider',
    description: 'Horizontal line separator',
    category: 'layout',
    icon: 'minus',
  },
  spacer: {
    type: 'spacer',
    name: 'Spacer',
    description: 'Vertical spacing between blocks',
    category: 'layout',
    icon: 'space',
  },
  html: {
    type: 'html',
    name: 'HTML',
    description: 'Custom HTML embed',
    category: 'advanced',
    icon: 'code',
  },
};

/**
 * Get metadata for a block type
 * @param blockType - The block type to get metadata for
 * @returns Block metadata or undefined if not found
 */
export function getBlockMetadata(blockType: BlockType): BlockMetadata {
  return blockMetadata[blockType];
}

/**
 * Get all blocks grouped by category
 * @returns Object with categories as keys and block metadata arrays as values
 */
export function getBlocksByCategory(): Record<BlockCategory, BlockMetadata[]> {
  const categories: Record<BlockCategory, BlockMetadata[]> = {
    content: [],
    media: [],
    interactive: [],
    layout: [],
    advanced: [],
  };

  Object.values(blockMetadata).forEach((meta) => {
    categories[meta.category].push(meta);
  });

  return categories;
}

// ============================================================================
// BLOCK SETTINGS HELPERS
// ============================================================================

/** Default block settings */
export const defaultBlockSettings: BlockSettings = {
  background: {
    type: 'color',
    value: 'transparent',
  },
  padding: {
    top: 'lg',
    bottom: 'lg',
  },
  maxWidth: 'container',
  alignment: 'center',
};

/**
 * Merge block settings with defaults
 * @param settings - Partial block settings
 * @returns Complete block settings with defaults filled in
 */
export function mergeBlockSettings(settings?: Partial<BlockSettings>): BlockSettings {
  return {
    background: {
      ...defaultBlockSettings.background,
      ...settings?.background,
    },
    padding: {
      ...defaultBlockSettings.padding,
      ...settings?.padding,
    },
    maxWidth: settings?.maxWidth ?? defaultBlockSettings.maxWidth,
    alignment: settings?.alignment ?? defaultBlockSettings.alignment,
  };
}

/**
 * Get CSS classes for block settings
 * @param settings - Block settings
 * @returns Object with className strings for various elements
 */
export function getBlockSettingsClasses(settings: BlockSettings): {
  container: string;
  wrapper: string;
  background: string;
} {
  const paddingClasses: Record<string, string> = {
    none: '',
    sm: 'py-4',
    md: 'py-8',
    lg: 'py-12 md:py-16',
    xl: 'py-16 md:py-24',
  };

  const maxWidthClasses: Record<string, string> = {
    container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    narrow: 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8',
    wide: 'max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8',
    full: 'w-full',
  };

  const alignmentClasses: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const paddingTop = paddingClasses[settings.padding?.top ?? 'lg'] || paddingClasses.lg;
  const paddingBottom = paddingClasses[settings.padding?.bottom ?? 'lg'] || paddingClasses.lg;
  const maxWidth = maxWidthClasses[settings.maxWidth ?? 'container'] || maxWidthClasses.container;
  const alignment = alignmentClasses[settings.alignment ?? 'center'] || alignmentClasses.center;

  // Combine padding classes, removing duplicates
  const paddingClass = paddingTop === paddingBottom
    ? paddingTop
    : `${paddingTop.replace('py-', 'pt-').replace(' md:py-', ' md:pt-')} ${paddingBottom.replace('py-', 'pb-').replace(' md:py-', ' md:pb-')}`;

  // Background styles
  let backgroundClass = '';
  if (settings.background?.type === 'color' && settings.background.value) {
    if (settings.background.value.startsWith('#') || settings.background.value.startsWith('rgb')) {
      // Custom color - will need inline style
      backgroundClass = '';
    } else if (settings.background.value !== 'transparent') {
      backgroundClass = `bg-${settings.background.value}`;
    }
  }

  return {
    container: `${paddingClass}`,
    wrapper: `${maxWidth} ${alignment}`,
    background: backgroundClass,
  };
}

/**
 * Get inline styles for block settings
 * @param settings - Block settings
 * @returns React CSSProperties object
 */
export function getBlockSettingsStyles(settings: BlockSettings): React.CSSProperties {
  const styles: React.CSSProperties = {};

  if (settings.background?.type === 'color' && settings.background.value) {
    if (
      settings.background.value.startsWith('#') ||
      settings.background.value.startsWith('rgb')
    ) {
      styles.backgroundColor = settings.background.value;
    }
  } else if (settings.background?.type === 'image' && settings.background.value) {
    styles.backgroundImage = `url(${settings.background.value})`;
    styles.backgroundSize = 'cover';
    styles.backgroundPosition = 'center';
  }

  return styles;
}
