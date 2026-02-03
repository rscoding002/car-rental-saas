'use client';

import type { FeaturesBlockProps, FeaturesBlockLocaleContent, IconName } from '@/lib/cms/block-types';
import { cn } from '@/lib/utils/cn';
import {
  Shield,
  Clock,
  MapPin,
  Car,
  Star,
  Check,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  Key,
  Fuel,
  Users,
  Settings,
  Award,
  Heart,
  ThumbsUp,
  Zap,
  Globe,
  Lock,
  type LucideIcon,
} from 'lucide-react';

// Map icon names to Lucide components
const iconMap: Record<IconName, LucideIcon> = {
  shield: Shield,
  clock: Clock,
  'map-pin': MapPin,
  car: Car,
  star: Star,
  check: Check,
  phone: Phone,
  mail: Mail,
  'credit-card': CreditCard,
  calendar: Calendar,
  key: Key,
  fuel: Fuel,
  users: Users,
  settings: Settings,
  award: Award,
  heart: Heart,
  'thumbs-up': ThumbsUp,
  zap: Zap,
  globe: Globe,
  lock: Lock,
};

export function FeaturesBlock({ id, content, settings, locale }: FeaturesBlockProps) {
  // Get localized content with fallback to English
  const localeContent: FeaturesBlockLocaleContent | undefined =
    (content[locale as keyof typeof content] as FeaturesBlockLocaleContent | undefined) ||
    content.en;

  if (!localeContent || !localeContent.features || localeContent.features.length === 0) {
    return null;
  }

  const { heading, subheading, features } = localeContent;
  const { columns = 3, showIcons = true } = content;

  // Grid column classes based on configuration
  const columnClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <section
      id={id}
      data-block-type="features"
      className="py-12 md:py-16 lg:py-20 bg-background"
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

        {/* Features Grid */}
        <div className={cn('grid gap-6 md:gap-8', columnClasses[columns])}>
          {features.map((feature, index) => {
            const IconComponent = iconMap[feature.icon] || Check;

            return (
              <div
                key={index}
                className="group relative p-6 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-200"
              >
                {/* Icon */}
                {showIcons && (
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
                      <IconComponent className="w-6 h-6" />
                    </div>
                  </div>
                )}

                {/* Title */}
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
