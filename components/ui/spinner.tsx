import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = 'md', text, ...props }, ref) => {
    const sizes = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
    };

    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-center gap-2', className)}
        role="status"
        aria-label={text || 'Loading'}
        {...props}
      >
        <Loader2 className={cn('animate-spin text-primary', sizes[size])} />
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';

// Full page loading spinner
const PageSpinner: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Spinner size="lg" text={text} />
    </div>
  );
};

PageSpinner.displayName = 'PageSpinner';

export { Spinner, PageSpinner };
