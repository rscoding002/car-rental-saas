'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { TextImageBlockProps, TextImageBlockLocaleContent } from '@/lib/cms/block-types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

export function TextImageBlock({ id, content, settings, locale }: TextImageBlockProps) {
  // Get localized content with fallback to English
  const localeContent: TextImageBlockLocaleContent | undefined =
    (content[locale as keyof typeof content] as TextImageBlockLocaleContent | undefined) ||
    content.en;

  if (!localeContent) {
    return null;
  }

  const { heading, text, ctaText, ctaLink } = localeContent;
  const { image, imageAlt, imagePosition = 'right', imageRounded = true } = content;

  // Get localized alt text
  const altText = imageAlt?.[locale] || imageAlt?.en || heading || 'Image';

  const isImageLeft = imagePosition === 'left';

  return (
    <section
      id={id}
      data-block-type="text_image"
      className="py-12 md:py-16 lg:py-20 bg-background"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            'grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center',
            isImageLeft && 'lg:flex-row-reverse'
          )}
        >
          {/* Text Content */}
          <div
            className={cn(
              'flex flex-col',
              isImageLeft ? 'lg:order-2' : 'lg:order-1'
            )}
          >
            {/* Heading */}
            {heading && (
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 md:mb-6">
                {heading}
              </h2>
            )}

            {/* Text Content - supports multiple paragraphs */}
            <div className="text-base sm:text-lg text-muted-foreground leading-relaxed space-y-4">
              {text.split('\n\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            {/* CTA Button */}
            {ctaText && ctaLink && (
              <div className="mt-6 md:mt-8">
                <Link href={ctaLink}>
                  <Button size="lg" variant="primary">
                    {ctaText}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Image */}
          <div
            className={cn(
              'relative',
              isImageLeft ? 'lg:order-1' : 'lg:order-2'
            )}
          >
            <div
              className={cn(
                'relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3] overflow-hidden',
                imageRounded && 'rounded-xl lg:rounded-2xl'
              )}
            >
              {image ? (
                <Image
                  src={image}
                  alt={altText}
                  fill
                  loading="lazy"
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              ) : (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground">No image</span>
                </div>
              )}
            </div>

            {/* Decorative element */}
            <div
              className={cn(
                'absolute -z-10 w-full h-full top-4 lg:top-6',
                isImageLeft ? '-left-4 lg:-left-6' : '-right-4 lg:-right-6',
                imageRounded && 'rounded-xl lg:rounded-2xl',
                'bg-primary/10'
              )}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
