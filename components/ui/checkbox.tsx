'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { Check } from 'lucide-react';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const checkboxId = id || React.useId();

    return (
      <div className="flex items-start">
        <div className="relative flex h-5 items-center">
          <input
            type="checkbox"
            id={checkboxId}
            ref={ref}
            className={cn(
              'peer h-4 w-4 shrink-0 cursor-pointer appearance-none rounded border border-input bg-background transition-colors',
              'checked:border-primary checked:bg-primary',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-destructive',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            {...props}
          />
          <Check className="pointer-events-none absolute left-0.5 top-0.5 h-3 w-3 text-primary-foreground opacity-0 peer-checked:opacity-100" />
        </div>
        {label && (
          <label
            htmlFor={checkboxId}
            className="ml-2 cursor-pointer text-sm text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
          >
            {label}
          </label>
        )}
        {error && (
          <p className="ml-2 text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
