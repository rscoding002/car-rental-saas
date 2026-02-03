import { redirect } from 'next/navigation';

import { PlatformSidebarWrapper } from '@/components/platform-admin';
import { protectLayout } from '@/lib/auth/middleware';
import { ROLE_GROUPS } from '@/lib/auth/roles';

interface PlatformAdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Platform Admin Layout
 *
 * Protects all /platform-admin routes and requires platform_admin role.
 * This layout is separate from the tenant admin layout and provides
 * access to platform-wide management features:
 * - Tenant management (create, edit, suspend tenants)
 * - Subscription management
 * - Domain configuration
 * - Platform settings
 */
export default async function PlatformAdminLayout({ children, params }: PlatformAdminLayoutProps) {
  const { locale } = await params;

  // Protect layout - requires authentication and platform admin role
  const user = await protectLayout({
    requireAuth: true,
    allowedRoles: ROLE_GROUPS.PLATFORM_LEVEL,
    fallbackPath: `/${locale}`,
  });

  // Extra safety check - should not happen due to protectLayout
  if (!user) {
    redirect(`/${locale}/login?redirect_to=/${locale}/platform-admin`);
  }

  return (
    <PlatformSidebarWrapper locale={locale}>
      {children}
    </PlatformSidebarWrapper>
  );
}
