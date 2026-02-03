'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { blockMetadata, type BlockCategory } from '@/lib/cms/block-registry';
import { getDefaultBlockContent, type BlockType } from '@/lib/cms/block-types';
import { cn } from '@/lib/utils/cn';
import {
  Search,
  LayoutTemplate,
  Grid3X3,
  Car,
  Quote,
  HelpCircle,
  Megaphone,
  LayoutPanelLeft,
  Mail,
  Map,
  Table,
  Type,
  Image as ImageIcon,
  Video,
  Minus,
  Space,
  Code,
  FileText,
} from 'lucide-react';

// Icon map for block types
const blockIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'layout-template': LayoutTemplate,
  'grid-3x3': Grid3X3,
  car: Car,
  quote: Quote,
  'help-circle': HelpCircle,
  megaphone: Megaphone,
  'layout-sidebar': LayoutPanelLeft,
  mail: Mail,
  map: Map,
  table: Table,
  type: Type,
  image: ImageIcon,
  video: Video,
  minus: Minus,
  space: Space,
  code: Code,
};

// Category labels and order
const categoryConfig: Record<BlockCategory, { label: string; order: number }> = {
  content: { label: 'Content', order: 1 },
  media: { label: 'Media', order: 2 },
  interactive: { label: 'Interactive', order: 3 },
  layout: { label: 'Layout', order: 4 },
  advanced: { label: 'Advanced', order: 5 },
};

interface BlockPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBlock: (blockType: BlockType) => void;
}

export function BlockPicker({ isOpen, onClose, onSelectBlock }: BlockPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BlockCategory | 'all'>('all');

  // Get all block types
  const allBlocks = Object.values(blockMetadata);

  // Filter blocks by search and category
  const filteredBlocks = allBlocks.filter((block) => {
    const matchesSearch =
      searchQuery === '' ||
      block.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || block.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Group blocks by category
  const blocksByCategory = filteredBlocks.reduce(
    (acc, block) => {
      if (!acc[block.category]) {
        acc[block.category] = [];
      }
      acc[block.category].push(block);
      return acc;
    },
    {} as Record<BlockCategory, typeof allBlocks>
  );

  // Sort categories
  const sortedCategories = Object.entries(blocksByCategory).sort(
    ([a], [b]) => categoryConfig[a as BlockCategory].order - categoryConfig[b as BlockCategory].order
  );

  const handleSelectBlock = (blockType: BlockType) => {
    onSelectBlock(blockType);
    onClose();
    setSearchQuery('');
    setSelectedCategory('all');
  };

  const handleClose = () => {
    onClose();
    setSearchQuery('');
    setSelectedCategory('all');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Block"
      description="Choose a block type to add to your page"
      size="lg"
    >
      <div className="space-y-4">
        {/* Search */}
        <Input
          placeholder="Search blocks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All
          </Button>
          {Object.entries(categoryConfig)
            .sort(([, a], [, b]) => a.order - b.order)
            .map(([category, config]) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedCategory(category as BlockCategory)}
              >
                {config.label}
              </Button>
            ))}
        </div>

        {/* Block list */}
        <div className="max-h-[400px] overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
          {filteredBlocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No blocks found matching your search.
            </div>
          ) : (
            <div className="space-y-6">
              {sortedCategories.map(([category, blocks]) => (
                <div key={category}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    {categoryConfig[category as BlockCategory].label}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {blocks.map((block) => {
                      const IconComponent = blockIcons[block.icon] || FileText;
                      return (
                        <button
                          key={block.type}
                          type="button"
                          onClick={() => handleSelectBlock(block.type)}
                          className={cn(
                            'flex items-start gap-3 p-3 rounded-lg border border-border',
                            'text-left transition-colors',
                            'hover:bg-accent hover:border-accent-foreground/20',
                            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                          )}
                        >
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm">
                              {block.name}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {block.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
