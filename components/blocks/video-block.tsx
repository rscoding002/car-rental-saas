'use client';

import type { VideoBlockProps } from '@/lib/cms/block-types';

export function VideoBlock({ id, content, settings, locale }: VideoBlockProps) {
  // Simple video block - minimal implementation
  return (
    <section id={id} data-block-type="video">
      <div className="py-12 text-center text-muted-foreground">
        Video Block (To be implemented)
      </div>
    </section>
  );
}
