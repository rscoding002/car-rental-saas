'use client';

import type { ImageBlockProps } from '@/lib/cms/block-types';

export function ImageBlock({ id, content, settings, locale }: ImageBlockProps) {
  // Simple image block - minimal implementation
  return (
    <section id={id} data-block-type="image">
      <div className="py-12 text-center text-muted-foreground">
        Image Block (To be implemented)
      </div>
    </section>
  );
}
