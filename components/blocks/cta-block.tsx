'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { CTABlockProps, CTABlockLocaleContent } from '@/lib/cms/block-types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

export function CTABlock({ id, content, settings, locale }: CTABlockProps) {
  // Get localized content with fallback to English
  const localeContent: CTABlockLocaleContent | undefined =
    (content[locale as keyof typeof content] as CTABlockLocaleContent | undefined) ||
    content.en;

  if (!localeContent) {
    return null;
  }

  const {
    heading,
    description,
    buttonText,
    buttonLink,
    secondaryButtonText,
    secondaryButtonLink,
  } = localeContent;

  const {
    backgroundColor,
    textColor,
    backgroundImage,
    overlayOpacity = 0.6,
  } = content;

  // Determine if we have a dark background for button contrast
  const hasDarkBackground = backgroundImage || (backgroundColor && isColorDark(backgroundColor));

  return (
    <section
      id={id}
      data-block-type="cta"
      className="relative py-16 md:py-20 lg:py-24 overflow-hidden"
      style={{
        backgroundColor: !backgroundImage ? (backgroundColor || undefined) : undefined,
        color: textColor || undefined,
      }}
    >
      {/* Background Image - lazy loaded as below-fold content */}
      {backgroundImage && (
        <div className="absolute inset-0 z-0">
          <Image
            src={backgroundImage}
            alt=""
            fill
            loading="lazy"
            className="object-cover"
            sizes="100vw"
          />
          {/* Overlay */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: backgroundColor || '#000000',
              opacity: overlayOpacity,
            }}
          />
        </div>
      )}

      {/* Default gradient background when no custom styles */}
      {!backgroundImage && !backgroundColor && (
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-primary to-primary/80" />
      )}

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Heading */}
        <h2
          className={cn(
            'text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6',
            !textColor && (hasDarkBackground || !backgroundColor)
              ? 'text-white'
              : 'text-foreground'
          )}
          style={{ color: textColor || undefined }}
        >
          {heading}
        </h2>

        {/* Description */}
        {description && (
          <p
            className={cn(
              'text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 md:mb-10',
              !textColor && (hasDarkBackground || !backgroundColor)
                ? 'text-white/90'
                : 'text-muted-foreground'
            )}
            style={{ color: textColor ? `${textColor}cc` : undefined }}
          >
            {description}
          </p>
        )}

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          {/* Primary Button */}
          {buttonText && buttonLink && (
            <Link href={buttonLink}>
              <Button
                size="lg"
                variant={hasDarkBackground || !backgroundColor ? 'secondary' : 'primary'}
                className="w-full sm:w-auto min-w-[180px] text-base"
              >
                {buttonText}
              </Button>
            </Link>
          )}

          {/* Secondary Button */}
          {secondaryButtonText && secondaryButtonLink && (
            <Link href={secondaryButtonLink}>
              <Button
                size="lg"
                variant="outline"
                className={cn(
                  'w-full sm:w-auto min-w-[180px] text-base',
                  (hasDarkBackground || !backgroundColor) &&
                    'border-white text-white hover:bg-white/10'
                )}
              >
                {secondaryButtonText}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

// Helper to determine if a hex color is dark
function isColorDark(color: string): boolean {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }
  // Default to dark for unknown formats
  return true;
}
