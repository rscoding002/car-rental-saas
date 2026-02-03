'use client';

import type { HTMLBlockProps } from '@/lib/cms/block-types';

export function HTMLBlock({ id, content, settings, locale }: HTMLBlockProps) {
  // HTML block - renders raw HTML (sanitization should be done server-side)
  if (!content.html) {
    return null;
  }

  return (
    <div
      id={id}
      data-block-type="html"
      dangerouslySetInnerHTML={{ __html: content.html }}
    />
  );
}
