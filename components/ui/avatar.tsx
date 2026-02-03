import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { User } from 'lucide-react';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = 'md', ...props }, ref) => {
    const [hasError, setHasError] = React.useState(false);

    const sizes = {
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
      xl: 'h-16 w-16 text-lg',
    };

    const iconSizes = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
      xl: 'h-8 w-8',
    };

    // Get initials from fallback or alt
    const getInitials = () => {
      const text = fallback || alt || '';
      return text
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    const showImage = src && !hasError;
    const initials = getInitials();

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted',
          sizes[size],
          className
        )}
        {...props}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt || 'Avatar'}
            className="h-full w-full object-cover"
            onError={() => setHasError(true)}
          />
        ) : initials ? (
          <span className="font-medium text-muted-foreground">{initials}</span>
        ) : (
          <User className={cn('text-muted-foreground', iconSizes[size])} />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export { Avatar };
