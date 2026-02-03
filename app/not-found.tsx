'use client';

import Link from 'next/link';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-muted p-4">
            <FileQuestion className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>

        <h1 className="mb-2 text-4xl font-bold text-foreground">404</h1>
        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Page Not Found
        </h2>

        <p className="mb-6 text-muted-foreground">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It may
          have been moved, deleted, or never existed.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
          <button
            onClick={() => typeof window !== 'undefined' && window.history.back()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
