'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Global error boundary - catches errors in root layout
// Must include its own html/body tags since root layout failed
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-background font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
          <div className="mx-auto max-w-md text-center">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-red-100 p-4">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
            </div>

            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              Critical Error
            </h1>

            <p className="mb-6 text-gray-600">
              A critical error has occurred. Please refresh the page or return
              to the homepage.
            </p>

            {process.env.NODE_ENV === 'development' && error.message && (
              <div className="mb-6 rounded-lg bg-red-50 p-4 text-left">
                <p className="mb-1 text-sm font-medium text-red-800">
                  Error Details (Development Only):
                </p>
                <p className="break-words font-mono text-sm text-red-700">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="mt-2 text-xs text-red-600">
                    Digest: {error.digest}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
