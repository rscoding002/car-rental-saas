'use client';

import Link from 'next/link';
import type { PricingTableBlockProps, PricingTableBlockLocaleContent, PricingTier } from '@/lib/cms/block-types';
import type { VehicleCategory, PricingRule, LocalizedString } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { Check } from 'lucide-react';

// Extended props to accept category pricing data
interface PricingTableBlockExtendedProps extends PricingTableBlockProps {
  categories?: VehicleCategory[];
  pricingRules?: PricingRule[];
  currency?: string;
}

// Helper to get localized string
function getLocalizedText(text: LocalizedString | undefined, locale: string): string {
  if (!text) return '';
  return text[locale] || text.en || Object.values(text).find(v => v) || '';
}

// Pricing Tier Card Component
function PricingTierCard({
  tier,
  locale,
}: {
  tier: PricingTier;
  locale: string;
}) {
  const isHighlighted = tier.highlighted;

  return (
    <div
      className={cn(
        'relative rounded-2xl border p-6 sm:p-8 flex flex-col h-full transition-shadow',
        isHighlighted
          ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]'
          : 'border-border bg-card hover:shadow-md'
      )}
    >
      {/* Popular Badge */}
      {isHighlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
            {locale === 'lt' ? 'Populiariausias' : locale === 'ru' ? 'Популярный' : 'Most Popular'}
          </span>
        </div>
      )}

      {/* Tier Name */}
      <h3 className="text-xl font-semibold text-foreground mb-2">{tier.name}</h3>

      {/* Description */}
      {tier.description && (
        <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>
      )}

      {/* Price */}
      <div className="mb-6">
        <span className="text-4xl sm:text-5xl font-bold text-foreground">{tier.price}</span>
        {tier.period && (
          <span className="text-muted-foreground ml-1">/{tier.period}</span>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8 flex-grow">
        {tier.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span className="text-sm text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <Link href={tier.ctaLink} className="mt-auto">
        <Button
          variant={isHighlighted ? 'primary' : 'outline'}
          size="lg"
          className="w-full"
        >
          {tier.ctaText}
        </Button>
      </Link>
    </div>
  );
}

// Category Pricing Card Component
function CategoryPricingCard({
  category,
  price,
  currency,
  locale,
}: {
  category: VehicleCategory;
  price?: number;
  currency: string;
  locale: string;
}) {
  const name = getLocalizedText(category.name, locale);
  const description = getLocalizedText(category.description, locale);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 flex flex-col h-full hover:shadow-md transition-shadow">
      {/* Category Name */}
      <h3 className="text-xl font-semibold text-foreground mb-2">{name}</h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{description}</p>
      )}

      {/* Price */}
      <div className="mb-6">
        {price !== undefined ? (
          <>
            <span className="text-sm text-muted-foreground">
              {locale === 'lt' ? 'Nuo' : locale === 'ru' ? 'От' : 'From'}
            </span>
            <div>
              <span className="text-4xl font-bold text-foreground">{currency}{price}</span>
              <span className="text-muted-foreground ml-1">
                /{locale === 'lt' ? 'dieną' : locale === 'ru' ? 'день' : 'day'}
              </span>
            </div>
          </>
        ) : (
          <span className="text-lg text-muted-foreground">
            {locale === 'lt' ? 'Kaina pagal užklausą' : locale === 'ru' ? 'Цена по запросу' : 'Price on request'}
          </span>
        )}
      </div>

      {/* CTA Button */}
      <Link href={`/fleet?category=${category.id}`} className="mt-auto">
        <Button variant="outline" size="lg" className="w-full">
          {locale === 'lt' ? 'Peržiūrėti' : locale === 'ru' ? 'Посмотреть' : 'View Vehicles'}
        </Button>
      </Link>
    </div>
  );
}

export function PricingTableBlock({
  id,
  content,
  settings,
  locale,
  categories = [],
  pricingRules = [],
  currency = '€',
}: PricingTableBlockExtendedProps) {
  // Get localized content with fallback to English
  const localeContent: PricingTableBlockLocaleContent | undefined =
    (content[locale as keyof typeof content] as PricingTableBlockLocaleContent | undefined) ||
    content.en;

  const { showFromCategoryPricing = false, categoryIds } = content;

  // If showing category pricing
  if (showFromCategoryPricing) {
    let displayCategories = categories.filter(c => c.status === 'active');

    // Filter by specific category IDs if provided
    if (categoryIds && categoryIds.length > 0) {
      displayCategories = displayCategories.filter(c => categoryIds.includes(c.id));
    }

    // Sort by sort_order
    displayCategories.sort((a, b) => a.sort_order - b.sort_order);

    // Get minimum daily price for each category
    const categoryPrices: Record<string, number> = {};
    pricingRules
      .filter(r => r.rate_type === 'daily' && r.status === 'active')
      .forEach(rule => {
        if (rule.category_id) {
          const existing = categoryPrices[rule.category_id];
          if (existing === undefined || rule.amount < existing) {
            categoryPrices[rule.category_id] = rule.amount;
          }
        }
      });

    if (displayCategories.length === 0) {
      return null;
    }

    return (
      <section
        id={id}
        data-block-type="pricing_table"
        className="py-12 md:py-16 lg:py-20 bg-muted/30"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          {(localeContent?.heading || localeContent?.subheading) && (
            <div className="text-center mb-10 md:mb-14">
              {localeContent?.heading && (
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
                  {localeContent.heading}
                </h2>
              )}
              {localeContent?.subheading && (
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                  {localeContent.subheading}
                </p>
              )}
            </div>
          )}

          {/* Category Pricing Grid */}
          <div className={cn(
            'grid gap-6 md:gap-8',
            displayCategories.length === 1 && 'max-w-md mx-auto',
            displayCategories.length === 2 && 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto',
            displayCategories.length === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
            displayCategories.length >= 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          )}>
            {displayCategories.map(category => (
              <CategoryPricingCard
                key={category.id}
                category={category}
                price={categoryPrices[category.id]}
                currency={currency}
                locale={locale}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Show custom tiers from CMS content
  const tiers = localeContent?.tiers || [];

  if (tiers.length === 0) {
    return null;
  }

  return (
    <section
      id={id}
      data-block-type="pricing_table"
      className="py-12 md:py-16 lg:py-20 bg-muted/30"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        {(localeContent?.heading || localeContent?.subheading) && (
          <div className="text-center mb-10 md:mb-14">
            {localeContent?.heading && (
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
                {localeContent.heading}
              </h2>
            )}
            {localeContent?.subheading && (
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                {localeContent.subheading}
              </p>
            )}
          </div>
        )}

        {/* Pricing Tiers Grid */}
        <div className={cn(
          'grid gap-6 md:gap-8 items-stretch',
          tiers.length === 1 && 'max-w-md mx-auto',
          tiers.length === 2 && 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto',
          tiers.length === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
          tiers.length >= 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        )}>
          {tiers.map((tier, index) => (
            <PricingTierCard
              key={index}
              tier={tier}
              locale={locale}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
