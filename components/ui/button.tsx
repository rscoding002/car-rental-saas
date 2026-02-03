'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

    const variants = {
      primary:
        'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary',
      secondary:
        'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-secondary',
      outline:
        'border border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring',
      ghost:
        'hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring',
      destructive:
        'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive',
      link: 'text-primary underline-offset-4 hover:underline focus-visible:ring-primary',
    };

    const sizes = {
      sm: 'h-9 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
      icon: 'h-10 w-10',
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
