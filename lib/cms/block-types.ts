/**
 * CMS Block Type Definitions
 *
 * TypeScript interfaces and Zod schemas for all CMS block types.
 * Each block has:
 * - Content interface: Defines the localized content structure
 * - Props interface: Component props including content and settings
 * - Zod schema: Validation for the content structure
 */

import { z } from 'zod';
import type { BlockType as DBBlockType, BlockSettings, LocalizedString } from '@/lib/supabase/types';

// Re-export BlockType from database types
export type BlockType = DBBlockType;

// ============================================================================
// COMMON TYPES
// ============================================================================

/** Available icon names for features and other blocks */
export type IconName =
  | 'shield'
  | 'clock'
  | 'map-pin'
  | 'car'
  | 'star'
  | 'check'
  | 'phone'
  | 'mail'
  | 'credit-card'
  | 'calendar'
  | 'key'
  | 'fuel'
  | 'users'
  | 'settings'
  | 'award'
  | 'heart'
  | 'thumbs-up'
  | 'zap'
  | 'globe'
  | 'lock';

/** Padding size options */
export type PaddingSize = 'none' | 'sm' | 'md' | 'lg' | 'xl';

/** Image position for text-image blocks */
export type ImagePosition = 'left' | 'right';

/** Column count options */
export type ColumnCount = 2 | 3 | 4;

/** Contact form field types */
export type ContactFormField = 'name' | 'email' | 'phone' | 'message' | 'subject' | 'company';

/** Map style options */
export type MapStyle = 'default' | 'light' | 'dark' | 'satellite';

/** Supported locales */
export type SupportedLocale = 'en' | 'lt' | 'ru';

// ============================================================================
// BASE BLOCK INTERFACES
// ============================================================================

/** Base interface for all blocks stored in database */
export interface BaseBlock {
  id: string;
  page_id: string;
  block_type: BlockType;
  content: Record<string, unknown>;
  settings: BlockSettings;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Base props for all block components */
export interface BaseBlockProps {
  id: string;
  settings: BlockSettings;
  locale: string;
}

/** Localized content wrapper type */
export type LocalizedContent<T> = {
  [K in SupportedLocale]?: T;
};

// ============================================================================
// HERO BLOCK
// ============================================================================

export interface HeroBlockLocaleContent {
  heading: string;
  subheading?: string;
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
}

export interface HeroBlockContent extends LocalizedContent<HeroBlockLocaleContent> {
  backgroundImage?: string;
  overlayOpacity?: number;
  overlayColor?: string;
  alignment?: 'left' | 'center' | 'right';
  showBookingWidget?: boolean;
}

export interface HeroBlockProps extends BaseBlockProps {
  content: HeroBlockContent;
}

// ============================================================================
// FEATURES BLOCK
// ============================================================================

export interface FeatureItem {
  icon: IconName;
  title: string;
  description: string;
}

export interface FeaturesBlockLocaleContent {
  heading?: string;
  subheading?: string;
  features: FeatureItem[];
}

export interface FeaturesBlockContent extends LocalizedContent<FeaturesBlockLocaleContent> {
  columns?: ColumnCount;
  showIcons?: boolean;
}

export interface FeaturesBlockProps extends BaseBlockProps {
  content: FeaturesBlockContent;
}

// ============================================================================
// FLEET GALLERY BLOCK
// ============================================================================

export interface FleetGalleryBlockLocaleContent {
  heading?: string;
  subheading?: string;
  ctaText?: string;
  ctaLink?: string;
}

export interface FleetGalleryBlockContent extends LocalizedContent<FleetGalleryBlockLocaleContent> {
  categoryIds?: string[];
  vehicleIds?: string[];
  maxVehicles?: number;
  showPricing?: boolean;
  showCta?: boolean;
  layout?: 'grid' | 'carousel';
}

export interface FleetGalleryBlockProps extends BaseBlockProps {
  content: FleetGalleryBlockContent;
}

// ============================================================================
// TESTIMONIALS BLOCK
// ============================================================================

export interface TestimonialItem {
  name: string;
  text: string;
  rating?: number;
  avatar?: string;
  title?: string;
  company?: string;
}

export interface TestimonialsBlockLocaleContent {
  heading?: string;
  subheading?: string;
  testimonials: TestimonialItem[];
}

export interface TestimonialsBlockContent extends LocalizedContent<TestimonialsBlockLocaleContent> {
  layout?: 'grid' | 'carousel';
  showRating?: boolean;
  showAvatar?: boolean;
}

export interface TestimonialsBlockProps extends BaseBlockProps {
  content: TestimonialsBlockContent;
}

// ============================================================================
// FAQ BLOCK
// ============================================================================

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQBlockLocaleContent {
  heading?: string;
  subheading?: string;
  items: FAQItem[];
}

export interface FAQBlockContent extends LocalizedContent<FAQBlockLocaleContent> {
  allowMultipleOpen?: boolean;
  defaultOpenIndex?: number;
}

export interface FAQBlockProps extends BaseBlockProps {
  content: FAQBlockContent;
}

// ============================================================================
// CTA BLOCK
// ============================================================================

export interface CTABlockLocaleContent {
  heading: string;
  description?: string;
  buttonText: string;
  buttonLink: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
}

export interface CTABlockContent extends LocalizedContent<CTABlockLocaleContent> {
  backgroundColor?: string;
  textColor?: string;
  backgroundImage?: string;
  overlayOpacity?: number;
}

export interface CTABlockProps extends BaseBlockProps {
  content: CTABlockContent;
}

// ============================================================================
// TEXT IMAGE BLOCK
// ============================================================================

export interface TextImageBlockLocaleContent {
  heading?: string;
  text: string;
  ctaText?: string;
  ctaLink?: string;
}

export interface TextImageBlockContent extends LocalizedContent<TextImageBlockLocaleContent> {
  image: string;
  imageAlt?: LocalizedString;
  imagePosition?: ImagePosition;
  imageRounded?: boolean;
}

export interface TextImageBlockProps extends BaseBlockProps {
  content: TextImageBlockContent;
}

// ============================================================================
// CONTACT FORM BLOCK
// ============================================================================

export interface ContactFormBlockLocaleContent {
  heading?: string;
  description?: string;
  submitText: string;
  successMessage: string;
  errorMessage?: string;
}

export interface ContactFormBlockContent extends LocalizedContent<ContactFormBlockLocaleContent> {
  fields: ContactFormField[];
  recipientEmail: string;
  showPhone?: boolean;
  showAddress?: boolean;
}

export interface ContactFormBlockProps extends BaseBlockProps {
  content: ContactFormBlockContent;
}

// ============================================================================
// LOCATION MAP BLOCK
// ============================================================================

export interface LocationMapBlockLocaleContent {
  heading?: string;
  subheading?: string;
}

export interface LocationMapBlockContent extends LocalizedContent<LocationMapBlockLocaleContent> {
  showAllBranches?: boolean;
  branchIds?: string[];
  mapZoom?: number;
  mapStyle?: MapStyle;
  centerLat?: number;
  centerLng?: number;
}

export interface LocationMapBlockProps extends BaseBlockProps {
  content: LocationMapBlockContent;
}

// ============================================================================
// PRICING TABLE BLOCK
// ============================================================================

export interface PricingTier {
  name: string;
  description?: string;
  price: string;
  period?: string;
  features: string[];
  ctaText: string;
  ctaLink: string;
  highlighted?: boolean;
}

export interface PricingTableBlockLocaleContent {
  heading?: string;
  subheading?: string;
  tiers: PricingTier[];
}

export interface PricingTableBlockContent extends LocalizedContent<PricingTableBlockLocaleContent> {
  showFromCategoryPricing?: boolean;
  categoryIds?: string[];
}

export interface PricingTableBlockProps extends BaseBlockProps {
  content: PricingTableBlockContent;
}

// ============================================================================
// TEXT BLOCK
// ============================================================================

export interface TextBlockLocaleContent {
  heading?: string;
  content: string;
}

export interface TextBlockContent extends LocalizedContent<TextBlockLocaleContent> {}

export interface TextBlockProps extends BaseBlockProps {
  content: TextBlockContent;
}

// ============================================================================
// IMAGE BLOCK
// ============================================================================

export interface ImageBlockContent {
  src: string;
  alt?: LocalizedString;
  caption?: LocalizedString;
  link?: string;
  width?: number;
  height?: number;
}

export interface ImageBlockProps extends BaseBlockProps {
  content: ImageBlockContent;
}

// ============================================================================
// VIDEO BLOCK
// ============================================================================

export interface VideoBlockLocaleContent {
  caption?: string;
}

export interface VideoBlockContent extends LocalizedContent<VideoBlockLocaleContent> {
  videoUrl: string;
  thumbnailUrl?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

export interface VideoBlockProps extends BaseBlockProps {
  content: VideoBlockContent;
}

// ============================================================================
// DIVIDER BLOCK
// ============================================================================

export interface DividerBlockContent {
  style?: 'solid' | 'dashed' | 'dotted';
  color?: string;
  thickness?: number;
  width?: 'full' | 'medium' | 'small';
}

export interface DividerBlockProps extends BaseBlockProps {
  content: DividerBlockContent;
}

// ============================================================================
// SPACER BLOCK
// ============================================================================

export interface SpacerBlockContent {
  height: PaddingSize;
  mobileHeight?: PaddingSize;
}

export interface SpacerBlockProps extends BaseBlockProps {
  content: SpacerBlockContent;
}

// ============================================================================
// HTML BLOCK
// ============================================================================

export interface HTMLBlockContent {
  html: string;
  sanitize?: boolean;
}

export interface HTMLBlockProps extends BaseBlockProps {
  content: HTMLBlockContent;
}

// ============================================================================
// UNION TYPES
// ============================================================================

/** Union of all block content types */
export type BlockContent =
  | HeroBlockContent
  | FeaturesBlockContent
  | FleetGalleryBlockContent
  | TestimonialsBlockContent
  | FAQBlockContent
  | CTABlockContent
  | TextImageBlockContent
  | ContactFormBlockContent
  | LocationMapBlockContent
  | PricingTableBlockContent
  | TextBlockContent
  | ImageBlockContent
  | VideoBlockContent
  | DividerBlockContent
  | SpacerBlockContent
  | HTMLBlockContent;

/** Union of all block props types */
export type BlockProps =
  | HeroBlockProps
  | FeaturesBlockProps
  | FleetGalleryBlockProps
  | TestimonialsBlockProps
  | FAQBlockProps
  | CTABlockProps
  | TextImageBlockProps
  | ContactFormBlockProps
  | LocationMapBlockProps
  | PricingTableBlockProps
  | TextBlockProps
  | ImageBlockProps
  | VideoBlockProps
  | DividerBlockProps
  | SpacerBlockProps
  | HTMLBlockProps;

/** Map of block types to their content types */
export interface BlockContentMap {
  hero: HeroBlockContent;
  features: FeaturesBlockContent;
  fleet_gallery: FleetGalleryBlockContent;
  testimonials: TestimonialsBlockContent;
  faq: FAQBlockContent;
  cta: CTABlockContent;
  text_image: TextImageBlockContent;
  contact_form: ContactFormBlockContent;
  location_map: LocationMapBlockContent;
  pricing_table: PricingTableBlockContent;
  text: TextBlockContent;
  image: ImageBlockContent;
  video: VideoBlockContent;
  divider: DividerBlockContent;
  spacer: SpacerBlockContent;
  html: HTMLBlockContent;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/** Localized string schema */
const localizedStringSchema = z.object({
  en: z.string().optional(),
  lt: z.string().optional(),
  ru: z.string().optional(),
});

/** Icon name schema */
const iconNameSchema = z.enum([
  'shield', 'clock', 'map-pin', 'car', 'star', 'check', 'phone', 'mail',
  'credit-card', 'calendar', 'key', 'fuel', 'users', 'settings', 'award',
  'heart', 'thumbs-up', 'zap', 'globe', 'lock',
]);

/** Padding size schema */
const paddingSizeSchema = z.enum(['none', 'sm', 'md', 'lg', 'xl']);

/** Block settings schema */
export const blockSettingsSchema = z.object({
  background: z.object({
    type: z.string().optional(),
    value: z.string().optional(),
  }).optional(),
  padding: z.object({
    top: paddingSizeSchema.optional(),
    bottom: paddingSizeSchema.optional(),
  }).optional(),
  maxWidth: z.string().optional(),
  alignment: z.enum(['left', 'center', 'right']).optional(),
});

/** Hero locale content schema */
const heroLocaleContentSchema = z.object({
  heading: z.string().min(1),
  subheading: z.string().optional(),
  ctaText: z.string().optional(),
  ctaLink: z.string().optional(),
  secondaryCtaText: z.string().optional(),
  secondaryCtaLink: z.string().optional(),
});

/** Hero block content schema */
export const heroBlockContentSchema = z.object({
  en: heroLocaleContentSchema.optional(),
  lt: heroLocaleContentSchema.optional(),
  ru: heroLocaleContentSchema.optional(),
  backgroundImage: z.string().optional(),
  overlayOpacity: z.number().min(0).max(1).optional(),
  overlayColor: z.string().optional(),
  alignment: z.enum(['left', 'center', 'right']).optional(),
  showBookingWidget: z.boolean().optional(),
});

/** Feature item schema */
const featureItemSchema = z.object({
  icon: iconNameSchema,
  title: z.string().min(1),
  description: z.string(),
});

/** Features locale content schema */
const featuresLocaleContentSchema = z.object({
  heading: z.string().optional(),
  subheading: z.string().optional(),
  features: z.array(featureItemSchema),
});

/** Features block content schema */
export const featuresBlockContentSchema = z.object({
  en: featuresLocaleContentSchema.optional(),
  lt: featuresLocaleContentSchema.optional(),
  ru: featuresLocaleContentSchema.optional(),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
  showIcons: z.boolean().optional(),
});

/** Fleet gallery locale content schema */
const fleetGalleryLocaleContentSchema = z.object({
  heading: z.string().optional(),
  subheading: z.string().optional(),
  ctaText: z.string().optional(),
  ctaLink: z.string().optional(),
});

/** Fleet gallery block content schema */
export const fleetGalleryBlockContentSchema = z.object({
  en: fleetGalleryLocaleContentSchema.optional(),
  lt: fleetGalleryLocaleContentSchema.optional(),
  ru: fleetGalleryLocaleContentSchema.optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  vehicleIds: z.array(z.string().uuid()).optional(),
  maxVehicles: z.number().int().positive().optional(),
  showPricing: z.boolean().optional(),
  showCta: z.boolean().optional(),
  layout: z.enum(['grid', 'carousel']).optional(),
});

/** Testimonial item schema */
const testimonialItemSchema = z.object({
  name: z.string().min(1),
  text: z.string().min(1),
  rating: z.number().min(1).max(5).optional(),
  avatar: z.string().optional(),
  title: z.string().optional(),
  company: z.string().optional(),
});

/** Testimonials locale content schema */
const testimonialsLocaleContentSchema = z.object({
  heading: z.string().optional(),
  subheading: z.string().optional(),
  testimonials: z.array(testimonialItemSchema),
});

/** Testimonials block content schema */
export const testimonialsBlockContentSchema = z.object({
  en: testimonialsLocaleContentSchema.optional(),
  lt: testimonialsLocaleContentSchema.optional(),
  ru: testimonialsLocaleContentSchema.optional(),
  layout: z.enum(['grid', 'carousel']).optional(),
  showRating: z.boolean().optional(),
  showAvatar: z.boolean().optional(),
});

/** FAQ item schema */
const faqItemSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

/** FAQ locale content schema */
const faqLocaleContentSchema = z.object({
  heading: z.string().optional(),
  subheading: z.string().optional(),
  items: z.array(faqItemSchema),
});

/** FAQ block content schema */
export const faqBlockContentSchema = z.object({
  en: faqLocaleContentSchema.optional(),
  lt: faqLocaleContentSchema.optional(),
  ru: faqLocaleContentSchema.optional(),
  allowMultipleOpen: z.boolean().optional(),
  defaultOpenIndex: z.number().int().min(0).optional(),
});

/** CTA locale content schema */
const ctaLocaleContentSchema = z.object({
  heading: z.string().min(1),
  description: z.string().optional(),
  buttonText: z.string().min(1),
  buttonLink: z.string().min(1),
  secondaryButtonText: z.string().optional(),
  secondaryButtonLink: z.string().optional(),
});

/** CTA block content schema */
export const ctaBlockContentSchema = z.object({
  en: ctaLocaleContentSchema.optional(),
  lt: ctaLocaleContentSchema.optional(),
  ru: ctaLocaleContentSchema.optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  backgroundImage: z.string().optional(),
  overlayOpacity: z.number().min(0).max(1).optional(),
});

/** Text image locale content schema */
const textImageLocaleContentSchema = z.object({
  heading: z.string().optional(),
  text: z.string().min(1),
  ctaText: z.string().optional(),
  ctaLink: z.string().optional(),
});

/** Text image block content schema */
export const textImageBlockContentSchema = z.object({
  en: textImageLocaleContentSchema.optional(),
  lt: textImageLocaleContentSchema.optional(),
  ru: textImageLocaleContentSchema.optional(),
  image: z.string(),
  imageAlt: localizedStringSchema.optional(),
  imagePosition: z.enum(['left', 'right']).optional(),
  imageRounded: z.boolean().optional(),
});

/** Contact form field schema */
const contactFormFieldSchema = z.enum(['name', 'email', 'phone', 'message', 'subject', 'company']);

/** Contact form locale content schema */
const contactFormLocaleContentSchema = z.object({
  heading: z.string().optional(),
  description: z.string().optional(),
  submitText: z.string().min(1),
  successMessage: z.string().min(1),
  errorMessage: z.string().optional(),
});

/** Contact form block content schema */
export const contactFormBlockContentSchema = z.object({
  en: contactFormLocaleContentSchema.optional(),
  lt: contactFormLocaleContentSchema.optional(),
  ru: contactFormLocaleContentSchema.optional(),
  fields: z.array(contactFormFieldSchema).min(1),
  recipientEmail: z.string().email(),
  showPhone: z.boolean().optional(),
  showAddress: z.boolean().optional(),
});

/** Location map locale content schema */
const locationMapLocaleContentSchema = z.object({
  heading: z.string().optional(),
  subheading: z.string().optional(),
});

/** Location map block content schema */
export const locationMapBlockContentSchema = z.object({
  en: locationMapLocaleContentSchema.optional(),
  lt: locationMapLocaleContentSchema.optional(),
  ru: locationMapLocaleContentSchema.optional(),
  showAllBranches: z.boolean().optional(),
  branchIds: z.array(z.string().uuid()).optional(),
  mapZoom: z.number().int().min(1).max(20).optional(),
  mapStyle: z.enum(['default', 'light', 'dark', 'satellite']).optional(),
  centerLat: z.number().min(-90).max(90).optional(),
  centerLng: z.number().min(-180).max(180).optional(),
});

/** Pricing tier schema */
const pricingTierSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.string().min(1),
  period: z.string().optional(),
  features: z.array(z.string()),
  ctaText: z.string().min(1),
  ctaLink: z.string().min(1),
  highlighted: z.boolean().optional(),
});

/** Pricing table locale content schema */
const pricingTableLocaleContentSchema = z.object({
  heading: z.string().optional(),
  subheading: z.string().optional(),
  tiers: z.array(pricingTierSchema),
});

/** Pricing table block content schema */
export const pricingTableBlockContentSchema = z.object({
  en: pricingTableLocaleContentSchema.optional(),
  lt: pricingTableLocaleContentSchema.optional(),
  ru: pricingTableLocaleContentSchema.optional(),
  showFromCategoryPricing: z.boolean().optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
});

/** Text locale content schema */
const textLocaleContentSchema = z.object({
  heading: z.string().optional(),
  content: z.string().min(1),
});

/** Text block content schema */
export const textBlockContentSchema = z.object({
  en: textLocaleContentSchema.optional(),
  lt: textLocaleContentSchema.optional(),
  ru: textLocaleContentSchema.optional(),
});

/** Image block content schema */
export const imageBlockContentSchema = z.object({
  src: z.string(),
  alt: localizedStringSchema.optional(),
  caption: localizedStringSchema.optional(),
  link: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

/** Video locale content schema */
const videoLocaleContentSchema = z.object({
  caption: z.string().optional(),
});

/** Video block content schema */
export const videoBlockContentSchema = z.object({
  en: videoLocaleContentSchema.optional(),
  lt: videoLocaleContentSchema.optional(),
  ru: videoLocaleContentSchema.optional(),
  videoUrl: z.string(),
  thumbnailUrl: z.string().optional(),
  autoplay: z.boolean().optional(),
  muted: z.boolean().optional(),
  loop: z.boolean().optional(),
});

/** Divider block content schema */
export const dividerBlockContentSchema = z.object({
  style: z.enum(['solid', 'dashed', 'dotted']).optional(),
  color: z.string().optional(),
  thickness: z.number().int().min(1).max(10).optional(),
  width: z.enum(['full', 'medium', 'small']).optional(),
});

/** Spacer block content schema */
export const spacerBlockContentSchema = z.object({
  height: paddingSizeSchema,
  mobileHeight: paddingSizeSchema.optional(),
});

/** HTML block content schema */
export const htmlBlockContentSchema = z.object({
  html: z.string().min(1),
  sanitize: z.boolean().optional(),
});

/** Map of block types to their content schemas */
export const blockContentSchemas = {
  hero: heroBlockContentSchema,
  features: featuresBlockContentSchema,
  fleet_gallery: fleetGalleryBlockContentSchema,
  testimonials: testimonialsBlockContentSchema,
  faq: faqBlockContentSchema,
  cta: ctaBlockContentSchema,
  text_image: textImageBlockContentSchema,
  contact_form: contactFormBlockContentSchema,
  location_map: locationMapBlockContentSchema,
  pricing_table: pricingTableBlockContentSchema,
  text: textBlockContentSchema,
  image: imageBlockContentSchema,
  video: videoBlockContentSchema,
  divider: dividerBlockContentSchema,
  spacer: spacerBlockContentSchema,
  html: htmlBlockContentSchema,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get content for a specific locale from a block's content
 * Falls back to 'en' if the locale is not available
 */
export function getLocalizedBlockContent<T, C extends Record<string, unknown>>(
  content: C,
  locale: string
): T | undefined {
  const localeContent = (content as Record<string, unknown>)[locale];
  if (localeContent !== undefined && typeof localeContent === 'object') {
    return localeContent as T;
  }

  // Fallback to English
  const enContent = (content as Record<string, unknown>).en;
  if (enContent !== undefined && typeof enContent === 'object') {
    return enContent as T;
  }

  return undefined;
}

/**
 * Validate block content against its schema
 * Returns the validated content or throws a ZodError
 */
export function validateBlockContent<T extends BlockType>(
  blockType: T,
  content: unknown
): BlockContentMap[T] {
  const schema = blockContentSchemas[blockType];
  return schema.parse(content) as BlockContentMap[T];
}

/**
 * Safely validate block content, returning null on failure
 */
export function safeValidateBlockContent<T extends BlockType>(
  blockType: T,
  content: unknown
): BlockContentMap[T] | null {
  const schema = blockContentSchemas[blockType];
  const result = schema.safeParse(content);
  return result.success ? (result.data as BlockContentMap[T]) : null;
}

/**
 * Get default content for a block type
 */
export function getDefaultBlockContent(blockType: BlockType): BlockContent {
  const defaults: Record<BlockType, BlockContent> = {
    hero: {
      en: { heading: 'Welcome' },
      backgroundImage: undefined,
      overlayOpacity: 0.5,
      alignment: 'center',
    },
    features: {
      en: { features: [] },
      columns: 3,
      showIcons: true,
    },
    fleet_gallery: {
      en: { heading: 'Our Fleet' },
      maxVehicles: 6,
      showPricing: true,
      layout: 'grid',
    },
    testimonials: {
      en: { testimonials: [] },
      layout: 'grid',
      showRating: true,
      showAvatar: true,
    },
    faq: {
      en: { items: [] },
      allowMultipleOpen: false,
    },
    cta: {
      en: { heading: 'Get Started', buttonText: 'Learn More', buttonLink: '/' },
    },
    text_image: {
      en: { text: '' },
      image: '',
      imagePosition: 'right',
    },
    contact_form: {
      en: { submitText: 'Submit', successMessage: 'Thank you!' },
      fields: ['name', 'email', 'message'],
      recipientEmail: '',
    },
    location_map: {
      en: { heading: 'Our Locations' },
      showAllBranches: true,
      mapZoom: 12,
      mapStyle: 'default',
    },
    pricing_table: {
      en: { tiers: [] },
    },
    text: {
      en: { content: '' },
    },
    image: {
      src: '',
    },
    video: {
      videoUrl: '',
      autoplay: false,
      muted: true,
      loop: false,
    },
    divider: {
      style: 'solid',
      width: 'full',
    },
    spacer: {
      height: 'md',
    },
    html: {
      html: '',
      sanitize: true,
    },
  };

  return defaults[blockType];
}

/**
 * Get block type display name
 */
export function getBlockTypeName(blockType: BlockType): string {
  const names: Record<BlockType, string> = {
    hero: 'Hero',
    features: 'Features',
    fleet_gallery: 'Fleet Gallery',
    testimonials: 'Testimonials',
    faq: 'FAQ',
    cta: 'Call to Action',
    text_image: 'Text with Image',
    contact_form: 'Contact Form',
    location_map: 'Location Map',
    pricing_table: 'Pricing Table',
    text: 'Text',
    image: 'Image',
    video: 'Video',
    divider: 'Divider',
    spacer: 'Spacer',
    html: 'HTML',
  };

  return names[blockType];
}

/**
 * Get block type description
 */
export function getBlockTypeDescription(blockType: BlockType): string {
  const descriptions: Record<BlockType, string> = {
    hero: 'Full-width banner with heading, subtext, and call-to-action',
    features: 'Grid of features with icons and descriptions',
    fleet_gallery: 'Showcase vehicles from your fleet',
    testimonials: 'Customer reviews and testimonials',
    faq: 'Frequently asked questions with accordion',
    cta: 'Call-to-action section with button',
    text_image: 'Text content alongside an image',
    contact_form: 'Contact form with customizable fields',
    location_map: 'Map showing branch locations',
    pricing_table: 'Pricing tiers comparison',
    text: 'Rich text content',
    image: 'Single image with optional caption',
    video: 'Embedded video player',
    divider: 'Horizontal line separator',
    spacer: 'Vertical spacing between blocks',
    html: 'Custom HTML embed',
  };

  return descriptions[blockType];
}

/** List of all available block types */
export const BLOCK_TYPES: BlockType[] = [
  'hero',
  'features',
  'fleet_gallery',
  'testimonials',
  'faq',
  'cta',
  'text_image',
  'contact_form',
  'location_map',
  'pricing_table',
  'text',
  'image',
  'video',
  'divider',
  'spacer',
  'html',
];
