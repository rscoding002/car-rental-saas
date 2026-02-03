'use client';

import { useState } from 'react';
import type { FAQBlockProps, FAQBlockLocaleContent } from '@/lib/cms/block-types';
import { cn } from '@/lib/utils/cn';
import { ChevronDown } from 'lucide-react';
import { generateFAQSchema, renderJsonLd } from '@/lib/seo/schema';

// FAQ Item Component
function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
  index,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  const itemId = `faq-item-${index}`;
  const headerId = `${itemId}-header`;
  const panelId = `${itemId}-panel`;

  return (
    <div className="border-b border-border last:border-b-0">
      <h3>
        <button
          id={headerId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className={cn(
            'flex items-center justify-between w-full py-4 sm:py-5 text-left',
            'text-base sm:text-lg font-medium text-foreground',
            'hover:text-primary transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm'
          )}
        >
          <span className="pr-4">{question}</span>
          <ChevronDown
            className={cn(
              'w-5 h-5 flex-shrink-0 text-muted-foreground transition-transform duration-200',
              isOpen && 'rotate-180 text-primary'
            )}
          />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className={cn(
          'overflow-hidden transition-all duration-200 ease-out',
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="pb-4 sm:pb-5 pr-8 text-sm sm:text-base text-muted-foreground leading-relaxed">
          {answer}
        </div>
      </div>
    </div>
  );
}

export function FAQBlock({ id, content, settings, locale }: FAQBlockProps) {
  // Get localized content with fallback to English
  const localeContent: FAQBlockLocaleContent | undefined =
    (content[locale as keyof typeof content] as FAQBlockLocaleContent | undefined) ||
    content.en;

  const { allowMultipleOpen = false, defaultOpenIndex } = content;

  // Initialize open state
  const [openIndices, setOpenIndices] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    if (defaultOpenIndex !== undefined && defaultOpenIndex >= 0) {
      initial.add(defaultOpenIndex);
    }
    return initial;
  });

  if (!localeContent || !localeContent.items || localeContent.items.length === 0) {
    return null;
  }

  const { heading, subheading, items } = localeContent;

  // Generate FAQPage JSON-LD schema for SEO
  const faqSchema = generateFAQSchema(
    items.map((item) => ({
      question: item.question,
      answer: item.answer,
    }))
  );

  const handleToggle = (index: number) => {
    setOpenIndices(prev => {
      const newSet = new Set(prev);

      if (newSet.has(index)) {
        // Close this item
        newSet.delete(index);
      } else {
        // Open this item
        if (allowMultipleOpen) {
          newSet.add(index);
        } else {
          // Close all others and open this one
          newSet.clear();
          newSet.add(index);
        }
      }

      return newSet;
    });
  };

  return (
    <>
      {/* FAQPage JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(faqSchema) }}
      />
      <section
        id={id}
        data-block-type="faq"
        className="py-12 md:py-16 lg:py-20 bg-background"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        {(heading || subheading) && (
          <div className="text-center mb-10 md:mb-12">
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

        {/* FAQ Accordion */}
        <div className="bg-card rounded-xl border border-border divide-y divide-border px-4 sm:px-6">
          {items.map((item, index) => (
            <FAQItem
              key={index}
              question={item.question}
              answer={item.answer}
              isOpen={openIndices.has(index)}
              onToggle={() => handleToggle(index)}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
    </>
  );
}
