'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  FileX,
  Archive,
  MoreHorizontal,
  Check,
  Loader2,
} from 'lucide-react';
import type { PageStatus } from '@/lib/supabase/types';
import { cn } from '@/lib/utils/cn';

interface PageStatusToggleProps {
  pageId: string;
  currentStatus: PageStatus;
  locale: string;
}

// Status labels by locale
const statusLabels: Record<string, Record<PageStatus, string>> = {
  en: { draft: 'Draft', published: 'Published', archived: 'Archived' },
  lt: { draft: 'Juodraštis', published: 'Paskelbta', archived: 'Archyvuota' },
  ru: { draft: 'Черновик', published: 'Опубликовано', archived: 'В архиве' },
};

// Action labels by locale
const actionLabels: Record<string, { publish: string; unpublish: string; archive: string }> = {
  en: { publish: 'Publish', unpublish: 'Unpublish', archive: 'Archive' },
  lt: { publish: 'Paskelbti', unpublish: 'Atšaukti', archive: 'Archyvuoti' },
  ru: { publish: 'Опубликовать', unpublish: 'Снять', archive: 'Архивировать' },
};

export function PageStatusToggle({ pageId, currentStatus, locale }: PageStatusToggleProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [status, setStatus] = useState<PageStatus>(currentStatus);

  const labels = statusLabels[locale] || statusLabels.en;
  const actions = actionLabels[locale] || actionLabels.en;

  const handleStatusChange = async (newStatus: PageStatus) => {
    if (newStatus === status) {
      setShowMenu(false);
      return;
    }

    setIsUpdating(true);
    setShowMenu(false);

    try {
      const response = await fetch(`/api/admin/pages/${pageId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      setStatus(newStatus);
      router.refresh();
    } catch (error) {
      console.error('Error updating page status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Quick toggle: Draft <-> Published
  const handleQuickToggle = () => {
    if (status === 'published') {
      handleStatusChange('draft');
    } else if (status === 'draft' || status === 'archived') {
      handleStatusChange('published');
    }
  };

  return (
    <div className="relative flex items-center gap-1">
      {/* Quick toggle button */}
      {status === 'published' ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleQuickToggle}
          disabled={isUpdating}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          title={actions.unpublish}
        >
          {isUpdating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileX className="w-3.5 h-3.5" />
          )}
          <span className="sr-only md:not-sr-only md:ml-1.5">{actions.unpublish}</span>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleQuickToggle}
          disabled={isUpdating}
          className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
          title={actions.publish}
        >
          {isUpdating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span className="sr-only md:not-sr-only md:ml-1.5">{actions.publish}</span>
        </Button>
      )}

      {/* More options dropdown */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowMenu(!showMenu)}
          className="h-7 w-7"
          disabled={isUpdating}
        >
          <MoreHorizontal className="w-4 h-4" />
          <span className="sr-only">More options</span>
        </Button>

        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />

            {/* Dropdown menu */}
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] py-1 bg-card rounded-md border border-border shadow-lg">
              {/* Publish option */}
              {status !== 'published' && (
                <button
                  onClick={() => handleStatusChange('published')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
                >
                  <Send className="w-4 h-4 text-green-600" />
                  <span>{actions.publish}</span>
                </button>
              )}

              {/* Unpublish option */}
              {status === 'published' && (
                <button
                  onClick={() => handleStatusChange('draft')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
                >
                  <FileX className="w-4 h-4" />
                  <span>{actions.unpublish}</span>
                </button>
              )}

              {/* Archive option */}
              {status !== 'archived' && (
                <button
                  onClick={() => handleStatusChange('archived')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
                >
                  <Archive className="w-4 h-4" />
                  <span>{actions.archive}</span>
                </button>
              )}

              {/* Status indicator */}
              <div className="border-t border-border mt-1 pt-1 px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Status:</span>
                  <Badge
                    variant={
                      status === 'published'
                        ? 'success'
                        : status === 'archived'
                        ? 'default'
                        : 'secondary'
                    }
                    className="text-xs"
                  >
                    {labels[status]}
                  </Badge>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
