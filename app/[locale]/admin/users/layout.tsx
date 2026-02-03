import { redirect } from 'next/navigation';

import { protectLayout } from '@/lib/auth/middleware';
import { ROLE_GROUPS } from '@/lib/auth/roles';

interface UsersLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Users Management Layout
 *
 * Additional protection for /admin/users/* routes.
 * Requires tenant_admin or platform_admin role.
 *
 * This is layered on top of the main admin layout protection.
 * Staff and managers can access the admin dashboard but cannot
 * manage other users (view, edit, invite, deactivate).
 */
export default async function UsersLayout({ children, params }: UsersLayoutProps) {
  const { locale } = await params;

  // Protect layout - requires tenant settings access (tenant_admin or platform_admin)
  // User management is considered a settings-level permission
  const user = await protectLayout({
    requireAuth: true,
    allowedRoles: ROLE_GROUPS.TENANT_SETTINGS,
    fallbackPath: `/${locale}/admin`,
  });

  // Extra safety check
  if (!user) {
    redirect(`/${locale}/admin`);
  }

  return <>{children}</>;
}
