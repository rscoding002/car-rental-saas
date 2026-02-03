import { ReactNode } from 'react';
import { Car } from 'lucide-react';

import { Link } from '@/i18n/routing';

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Auth Layout
 *
 * Shared layout for authentication pages (login, register, forgot password).
 * Centered card design with branding, mobile-first responsive.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {/* Header with Logo */}
      <header className="flex items-center justify-center py-6 px-4 sm:py-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold text-foreground"
        >
          <Car className="h-8 w-8 text-primary" />
          <span className="hidden sm:inline">Car Rental</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-start justify-center px-4 pb-8 sm:items-center sm:pb-0">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Car Rental. All rights reserved.</p>
      </footer>
    </div>
  );
}
