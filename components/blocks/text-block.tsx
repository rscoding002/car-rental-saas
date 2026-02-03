'use client';

import type { TextBlockProps } from '@/lib/cms/block-types';

export function TextBlock({ id, content, settings, locale }: TextBlockProps) {
  // Simple text block - minimal implementation
  return (
    <section id={id} data-block-type="text">
      <div className="py-12 text-center text-muted-foreground">
        Text Block (To be implemented)
      </div>
    </section>
  );
}
