import { Header } from './header';
import { Footer } from './footer';
import { cn } from '@/lib/utils/cn';

interface PublicLayoutProps {
  /** Page content */
  children: React.ReactNode;
  /** Whether to use transparent header (for hero sections) */
  transparentHeader?: boolean;
  /** Whether to hide the header */
  hideHeader?: boolean;
  /** Whether to hide the footer */
  hideFooter?: boolean;
  /** Additional class names for the main content area */
  className?: string;
  /** Additional class names for the wrapper */
  wrapperClassName?: string;
}

/**
 * Public Layout Component
 *
 * Base layout for public-facing pages with header and footer.
 * Mobile-first responsive design.
 *
 * Features:
 * - Header with navigation and language switcher
 * - Footer with links and contact info
 * - Flexible content area
 * - Optional transparent header for hero sections
 * - Option to hide header/footer for special pages
 */
export function PublicLayout({
  children,
  transparentHeader = false,
  hideHeader = false,
  hideFooter = false,
  className,
  wrapperClassName,
}: PublicLayoutProps) {
  return (
    <div className={cn('flex min-h-screen flex-col', wrapperClassName)}>
      {/* Header */}
      {!hideHeader && <Header transparent={transparentHeader} />}

      {/* Main Content */}
      <main className={cn('flex-1', className)}>{children}</main>

      {/* Footer */}
      {!hideFooter && <Footer />}
    </div>
  );
}
