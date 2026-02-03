'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import type { TestimonialsBlockProps, TestimonialsBlockLocaleContent, TestimonialItem } from '@/lib/cms/block-types';
import { cn } from '@/lib/utils/cn';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';

// Star Rating Component
function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'w-4 h-4',
            i < rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-muted text-muted'
          )}
        />
      ))}
    </div>
  );
}

// Single Testimonial Card
function TestimonialCard({
  testimonial,
  showRating,
  showAvatar,
}: {
  testimonial: TestimonialItem;
  showRating?: boolean;
  showAvatar?: boolean;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-6 sm:p-8 h-full flex flex-col">
      {/* Quote Icon */}
      <Quote className="w-8 h-8 text-primary/20 mb-4 flex-shrink-0" />

      {/* Testimonial Text */}
      <blockquote className="text-base sm:text-lg text-foreground leading-relaxed mb-6 flex-grow">
        &ldquo;{testimonial.text}&rdquo;
      </blockquote>

      {/* Rating */}
      {showRating && testimonial.rating && (
        <div className="mb-4">
          <StarRating rating={testimonial.rating} />
        </div>
      )}

      {/* Author */}
      <div className="flex items-center gap-3 pt-4 border-t border-border">
        {/* Avatar */}
        {showAvatar && (
          <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
            {testimonial.avatar ? (
              <Image
                src={testimonial.avatar}
                alt={testimonial.name}
                fill
                loading="lazy"
                className="object-cover"
                sizes="48px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-muted-foreground">
                {testimonial.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}

        {/* Name and Title */}
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">
            {testimonial.name}
          </p>
          {(testimonial.title || testimonial.company) && (
            <p className="text-sm text-muted-foreground truncate">
              {testimonial.title}
              {testimonial.title && testimonial.company && ' · '}
              {testimonial.company}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function TestimonialsBlock({ id, content, settings, locale }: TestimonialsBlockProps) {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Get localized content with fallback to English
  const localeContent: TestimonialsBlockLocaleContent | undefined =
    (content[locale as keyof typeof content] as TestimonialsBlockLocaleContent | undefined) ||
    content.en;

  if (!localeContent || !localeContent.testimonials || localeContent.testimonials.length === 0) {
    return null;
  }

  const { heading, subheading, testimonials } = localeContent;
  const { layout = 'grid', showRating = true, showAvatar = true } = content;

  // Carousel navigation
  const itemsPerView = { mobile: 1, tablet: 2, desktop: 3 };
  const maxIndex = Math.max(0, testimonials.length - itemsPerView.desktop);

  // Use transition for non-blocking carousel updates (improves INP)
  const handlePrev = () => {
    startTransition(() => {
      setCarouselIndex(prev => Math.max(0, prev - 1));
    });
  };

  const handleNext = () => {
    startTransition(() => {
      setCarouselIndex(prev => Math.min(maxIndex, prev + 1));
    });
  };

  return (
    <section
      id={id}
      data-block-type="testimonials"
      className="py-12 md:py-16 lg:py-20 bg-muted/30"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        {(heading || subheading) && (
          <div className="text-center mb-10 md:mb-14">
            {heading && (
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
                {heading}
              </h2>
            )}
            {subheading && (
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                {subheading}
              </p>
            )}
          </div>
        )}

        {/* Grid Layout */}
        {layout === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard
                key={index}
                testimonial={testimonial}
                showRating={showRating}
                showAvatar={showAvatar}
              />
            ))}
          </div>
        )}

        {/* Carousel Layout */}
        {layout === 'carousel' && (
          <div className="relative">
            {/* Navigation Buttons - Desktop */}
            {testimonials.length > itemsPerView.desktop && (
              <>
                <button
                  onClick={handlePrev}
                  disabled={carouselIndex === 0}
                  className={cn(
                    'absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10',
                    'w-10 h-10 rounded-full bg-background border border-border shadow-lg',
                    'flex items-center justify-center',
                    'hover:bg-accent transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'hidden lg:flex'
                  )}
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNext}
                  disabled={carouselIndex >= maxIndex}
                  className={cn(
                    'absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10',
                    'w-10 h-10 rounded-full bg-background border border-border shadow-lg',
                    'flex items-center justify-center',
                    'hover:bg-accent transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'hidden lg:flex'
                  )}
                  aria-label="Next testimonial"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Desktop Carousel */}
            <div className="hidden lg:block overflow-hidden">
              <div
                className="flex gap-6 transition-transform duration-300 ease-out"
                style={{
                  transform: `translateX(-${carouselIndex * (100 / itemsPerView.desktop + 2)}%)`,
                }}
              >
                {testimonials.map((testimonial, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-[calc(33.333%-16px)]"
                  >
                    <TestimonialCard
                      testimonial={testimonial}
                      showRating={showRating}
                      showAvatar={showAvatar}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Tablet Grid */}
            <div className="hidden md:grid lg:hidden grid-cols-2 gap-6">
              {testimonials.map((testimonial, index) => (
                <TestimonialCard
                  key={index}
                  testimonial={testimonial}
                  showRating={showRating}
                  showAvatar={showAvatar}
                />
              ))}
            </div>

            {/* Mobile: Horizontal Scroll */}
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:hidden -mx-4 px-4">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-[85%] snap-start"
                >
                  <TestimonialCard
                    testimonial={testimonial}
                    showRating={showRating}
                    showAvatar={showAvatar}
                  />
                </div>
              ))}
            </div>

            {/* Dots Indicator - Mobile */}
            {testimonials.length > 1 && (
              <div className="flex justify-center gap-2 mt-6 md:hidden">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    className={cn(
                      'w-2 h-2 rounded-full transition-colors',
                      index === carouselIndex
                        ? 'bg-primary'
                        : 'bg-muted-foreground/30'
                    )}
                    aria-label={`Go to testimonial ${index + 1}`}
                    onClick={() => setCarouselIndex(index)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
