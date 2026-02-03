import { PublicLayout } from '@/components/layout';

interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * Public Pages Layout
 *
 * Layout wrapper for all public-facing pages.
 * Includes header with navigation and footer.
 */
export default function PublicPagesLayout({ children }: PublicLayoutProps) {
  return <PublicLayout>{children}</PublicLayout>;
}
