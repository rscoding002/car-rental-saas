'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { HeroBlockProps, HeroBlockLocaleContent } from '@/lib/cms/block-types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

export function HeroBlock({ id, content, settings, locale }: HeroBlockProps) {
  // Get localized content with fallback to English
  const localeContent: HeroBlockLocaleContent | undefined =
    content[locale as keyof typeof content] as HeroBlockLocaleContent | undefined ||
    content.en;

  if (!localeContent) {
    return null;
  }

  const {
    heading,
    subheading,
    ctaText,
    ctaLink,
    secondaryCtaText,
    secondaryCtaLink,
  } = localeContent;

  const {
    backgroundImage,
    overlayOpacity = 0.5,
    overlayColor = '#000000',
    alignment = 'center',
    showBookingWidget = false,
  } = content;

  const alignmentClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  };

  const buttonAlignment = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  return (
    <section
      id={id}
      data-block-type="hero"
      className="relative min-h-[60vh] md:min-h-[70vh] lg:min-h-[80vh] flex items-center overflow-hidden"
    >
      {/* Background Image */}
      {backgroundImage && (
        <div className="absolute inset-0 z-0">
          <Image
            src={backgroundImage}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          {/* Overlay */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: overlayColor,
              opacity: overlayOpacity,
            }}
          />
        </div>
      )}

      {/* Fallback gradient background when no image */}
      {!backgroundImage && (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/90 to-primary-foreground/20" />
      )}

      {/* Content */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-20">
        <div
          className={cn(
            'max-w-4xl mx-auto flex flex-col gap-6',
            alignmentClasses[alignment]
          )}
        >
          {/* Heading */}
          <h1
            className={cn(
              'text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight',
              backgroundImage ? 'text-white' : 'text-primary-foreground'
            )}
          >
            {heading}
          </h1>

          {/* Subheading */}
          {subheading && (
            <p
              className={cn(
                'text-base sm:text-lg md:text-xl lg:text-2xl max-w-2xl',
                backgroundImage
                  ? 'text-white/90'
                  : 'text-primary-foreground/80'
              )}
            >
              {subheading}
            </p>
          )}

          {/* CTA Buttons */}
          {(ctaText || secondaryCtaText) && (
            <div
              className={cn(
                'flex flex-col sm:flex-row gap-3 sm:gap-4 mt-2',
                buttonAlignment[alignment]
              )}
            >
              {/* Primary CTA */}
              {ctaText && ctaLink && (
                <Link href={ctaLink}>
                  <Button
                    size="lg"
                    variant={backgroundImage ? 'primary' : 'secondary'}
                    className="w-full sm:w-auto min-w-[160px] text-base"
                  >
                    {ctaText}
                  </Button>
                </Link>
              )}

              {/* Secondary CTA */}
              {secondaryCtaText && secondaryCtaLink && (
                <Link href={secondaryCtaLink}>
                  <Button
                    size="lg"
                    variant="outline"
                    className={cn(
                      'w-full sm:w-auto min-w-[160px] text-base',
                      backgroundImage &&
                        'border-white text-white hover:bg-white/10'
                    )}
                  >
                    {secondaryCtaText}
                  </Button>
                </Link>
              )}
            </div>
          )}

          {/* Booking Widget Placeholder */}
          {showBookingWidget && (
            <div className="mt-6 w-full max-w-3xl">
              <div
                className={cn(
                  'rounded-xl p-4 sm:p-6',
                  backgroundImage
                    ? 'bg-white/95 backdrop-blur-sm shadow-xl'
                    : 'bg-background/95 shadow-lg'
                )}
              >
                {/* Booking widget will be integrated here */}
                <div className="text-center text-muted-foreground py-4">
                  Booking search widget (to be integrated)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scroll indicator for tall heroes */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 hidden md:block animate-bounce">
        <svg
          className={cn(
            'w-6 h-6',
            backgroundImage ? 'text-white/70' : 'text-primary-foreground/70'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  );
}
