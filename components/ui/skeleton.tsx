import * as React from 'react';
import { cn } from '@/lib/utils/cn';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('animate-pulse rounded-md bg-muted', className)}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Pre-built skeleton patterns
const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className,
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === lines - 1 ? 'w-3/4' : 'w-full')}
        />
      ))}
    </div>
  );
};

SkeletonText.displayName = 'SkeletonText';

const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('rounded-xl border border-border p-4', className)}>
      <Skeleton className="mb-4 h-40 w-full rounded-lg" />
      <Skeleton className="mb-2 h-5 w-3/4" />
      <Skeleton className="mb-4 h-4 w-1/2" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
};

SkeletonCard.displayName = 'SkeletonCard';

const SkeletonTable: React.FC<{ rows?: number; cols?: number; className?: string }> = ({
  rows = 5,
  cols = 4,
  className,
}) => {
  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      <div className="flex gap-4 border-b border-border pb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 border-b border-border py-3">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

SkeletonTable.displayName = 'SkeletonTable';

export { Skeleton, SkeletonText, SkeletonCard, SkeletonTable };
