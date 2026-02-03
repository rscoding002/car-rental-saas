'use client';

import type { SpacerBlockProps } from '@/lib/cms/block-types';

export function SpacerBlock({ id, content, settings, locale }: SpacerBlockProps) {
  // Simple spacer block - functional implementation
  const heightClasses = {
    none: 'h-0',
    sm: 'h-4',
    md: 'h-8',
    lg: 'h-12 md:h-16',
    xl: 'h-16 md:h-24',
  };

  const mobileHeightClasses = {
    none: 'h-0',
    sm: 'h-4',
    md: 'h-8',
    lg: 'h-12',
    xl: 'h-16',
  };

  const mobileHeight = content.mobileHeight ?? content.height;

  return (
    <div
      id={id}
      data-block-type="spacer"
      className={`${mobileHeightClasses[mobileHeight]} md:${heightClasses[content.height].replace('h-', 'h-')}`}
      aria-hidden="true"
    />
  );
}
