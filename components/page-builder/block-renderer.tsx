'use client';

import { Suspense } from 'react';
import type { PageBlock, BlockType, BlockSettings } from '@/lib/supabase/types';
import type { Vehicle, VehicleCategory, PricingRule, Branch } from '@/lib/supabase/types';
import {
  getBlockComponent,
  hasBlockComponent,
  getBlockSettingsClasses,
  getBlockSettingsStyles,
  mergeBlockSettings,
} from '@/lib/cms/block-registry';
import { cn } from '@/lib/utils/cn';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

// Data that can be passed to blocks that need it
export interface BlockData {
  vehicles?: Vehicle[];
  vehiclePrices?: Record<string, number>;
  categories?: VehicleCategory[];
  pricingRules?: PricingRule[];
  branches?: Branch[];
  currency?: string;
}

// Props for rendering a single block
export interface BlockRendererProps {
  block: PageBlock;
  locale: string;
  data?: BlockData;
  isEditing?: boolean;
  onSelect?: (blockId: string) => void;
}

// Props for rendering multiple blocks
export interface BlockListRendererProps {
  blocks: PageBlock[];
  locale: string;
  data?: BlockData;
  isEditing?: boolean;
  onSelectBlock?: (blockId: string) => void;
}

// Loading skeleton for blocks
function BlockSkeleton({ type }: { type: BlockType }) {
  // Different skeletons based on block type
  const skeletons: Partial<Record<BlockType, React.ReactNode>> = {
    hero: (
      <div className="min-h-[60vh] bg-muted animate-pulse flex items-center justify-center">
        <div className="text-center space-y-4 max-w-2xl px-4">
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <Skeleton className="h-6 w-1/2 mx-auto" />
          <Skeleton className="h-10 w-40 mx-auto mt-6" />
        </div>
      </div>
    ),
    features: (
      <div className="py-16 px-4">
        <Skeleton className="h-10 w-64 mx-auto mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-6 rounded-xl border border-border">
              <Skeleton className="h-12 w-12 rounded-lg mb-4" />
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </div>
          ))}
        </div>
      </div>
    ),
    testimonials: (
      <div className="py-16 px-4">
        <Skeleton className="h-10 w-64 mx-auto mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-6 rounded-xl border border-border">
              <Skeleton className="h-24 w-full mb-4" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16 mt-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  };

  // Default skeleton
  return (
    skeletons[type] || (
      <div className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    )
  );
}

// Error fallback for blocks
function BlockError({ type, error }: { type: BlockType; error?: string }) {
  return (
    <div className="py-8 px-4">
      <div className="max-w-md mx-auto text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 text-destructive mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="text-sm text-muted-foreground">
          Failed to load {type} block
        </p>
        {error && (
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        )}
      </div>
    </div>
  );
}

// Block wrapper with settings applied
function BlockWrapper({
  settings,
  children,
  isEditing,
  isSelected,
  onClick,
}: {
  settings: BlockSettings;
  children: React.ReactNode;
  isEditing?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const mergedSettings = mergeBlockSettings(settings);
  const classes = getBlockSettingsClasses(mergedSettings);
  const styles = getBlockSettingsStyles(mergedSettings);

  if (isEditing) {
    return (
      <div
        className={cn(
          'relative group cursor-pointer transition-all',
          isSelected && 'ring-2 ring-primary ring-offset-2',
          !isSelected && 'hover:ring-2 hover:ring-primary/50 hover:ring-offset-2'
        )}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onClick?.();
          }
        }}
      >
        {/* Edit Indicator */}
        <div className={cn(
          'absolute top-2 right-2 z-20 px-2 py-1 rounded text-xs font-medium',
          'bg-primary text-primary-foreground',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          isSelected && 'opacity-100'
        )}>
          Click to edit
        </div>
        <div className={classes.container} style={styles}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(classes.container, classes.background)} style={styles}>
      {children}
    </div>
  );
}

/**
 * Renders a single CMS block
 */
export function BlockRenderer({
  block,
  locale,
  data = {},
  isEditing = false,
  onSelect,
}: BlockRendererProps) {
  const { block_type, content, settings, id } = block;

  // Check if block type is valid
  if (!hasBlockComponent(block_type)) {
    if (isEditing) {
      return <BlockError type={block_type} error="Unknown block type" />;
    }
    return null;
  }

  // Get the component
  const Component = getBlockComponent(block_type);

  if (!Component) {
    return <BlockError type={block_type} error="Component not found" />;
  }

  // Build props based on block type
  const baseProps = {
    id,
    content: content as Record<string, unknown>,
    settings: settings || {},
    locale,
  };

  // Add data props for blocks that need them
  const extendedProps: Record<string, unknown> = { ...baseProps };

  if (block_type === 'fleet_gallery') {
    extendedProps.vehicles = data.vehicles;
    extendedProps.basePrices = data.vehiclePrices;
    extendedProps.currency = data.currency;
  }

  if (block_type === 'location_map') {
    extendedProps.branches = data.branches;
  }

  if (block_type === 'pricing_table') {
    extendedProps.categories = data.categories;
    extendedProps.pricingRules = data.pricingRules;
    extendedProps.currency = data.currency;
  }

  return (
    <BlockWrapper
      settings={settings || {}}
      isEditing={isEditing}
      onClick={() => onSelect?.(id)}
    >
      <Suspense fallback={<BlockSkeleton type={block_type} />}>
        {/* @ts-expect-error - Dynamic component props */}
        <Component {...extendedProps} />
      </Suspense>
    </BlockWrapper>
  );
}

/**
 * Renders a list of CMS blocks
 */
export function BlockListRenderer({
  blocks,
  locale,
  data = {},
  isEditing = false,
  onSelectBlock,
}: BlockListRendererProps) {
  // Sort blocks by sort_order
  const sortedBlocks = [...blocks].sort((a, b) => a.sort_order - b.sort_order);

  if (sortedBlocks.length === 0) {
    if (isEditing) {
      return (
        <div className="py-20 text-center border-2 border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">
            No blocks yet. Click &quot;Add Block&quot; to get started.
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="block-list">
      {sortedBlocks.map((block) => (
        <BlockRenderer
          key={block.id}
          block={block}
          locale={locale}
          data={data}
          isEditing={isEditing}
          onSelect={onSelectBlock}
        />
      ))}
    </div>
  );
}

// Default export for convenience
export default BlockRenderer;
