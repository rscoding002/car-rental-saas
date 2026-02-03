'use client';

import type { DividerBlockProps } from '@/lib/cms/block-types';

export function DividerBlock({ id, content, settings, locale }: DividerBlockProps) {
  // Simple divider block - minimal implementation
  const style = content.style ?? 'solid';
  const width = content.width ?? 'full';

  const widthClasses = {
    full: 'w-full',
    medium: 'w-2/3 mx-auto',
    small: 'w-1/3 mx-auto',
  };

  return (
    <div id={id} data-block-type="divider" className="py-4">
      <hr
        className={`border-t ${widthClasses[width]}`}
        style={{
          borderStyle: style,
          borderColor: content.color,
          borderWidth: content.thickness ? `${content.thickness}px` : undefined,
        }}
      />
    </div>
  );
}
