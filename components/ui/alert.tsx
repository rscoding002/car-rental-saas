import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  title?: string;
  onClose?: () => void;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', title, children, onClose, ...props }, ref) => {
    const variants = {
      default: {
        container: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200',
        icon: <Info className="h-5 w-5" />,
      },
      success: {
        container: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200',
        icon: <CheckCircle className="h-5 w-5" />,
      },
      warning: {
        container: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200',
        icon: <AlertCircle className="h-5 w-5" />,
      },
      destructive: {
        container: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200',
        icon: <XCircle className="h-5 w-5" />,
      },
    };

    const { container, icon } = variants[variant];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative flex gap-3 rounded-lg border p-4',
          container,
          className
        )}
        {...props}
      >
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1">
          {title && <h5 className="mb-1 font-medium">{title}</h5>}
          <div className="text-sm">{children}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-md p-1 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2"
            aria-label="Close alert"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export { Alert };
