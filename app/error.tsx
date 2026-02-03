'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/20">
            <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-foreground">
          Something went wrong
        </h1>

        <p className="mb-6 text-muted-foreground">
          We apologize for the inconvenience. An unexpected error has occurred.
          Please try again or return to the homepage.
        </p>

        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-left dark:bg-red-900/10">
            <p className="mb-1 text-sm font-medium text-red-800 dark:text-red-200">
              Error Details (Development Only):
            </p>
            <p className="break-words font-mono text-sm text-red-700 dark:text-red-300">
              {error.message}
            </p>
            {error.digest && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={reset}
            variant="primary"
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Try Again
          </Button>
          <Button
            variant="outline"
            leftIcon={<Home className="h-4 w-4" />}
            onClick={() => (window.location.href = '/')}
          >
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
