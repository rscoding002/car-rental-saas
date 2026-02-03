import { redirect } from 'next/navigation';

import { AdminSidebarWrapper } from '@/components/admin/sidebar';
import { protectLayout } from '@/lib/auth/middleware';
import { ROLE_GROUPS } from '@/lib/auth/roles';

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Admin Layout
 *
 * Protects all /admin routes and requires one of the admin roles:
 * - platform_admin
 * - tenant_admin
 * - tenant_manager
 * - tenant_staff
 *
 * More granular permissions are handled by sub-layouts:
 * - /admin/settings/* - requires tenant_admin or platform_admin
 * - /admin/users/* - requires tenant_admin or platform_admin
 */
export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { locale } = await params;

  // Protect layout - requires authentication and admin access
  const user = await protectLayout({
    requireAuth: true,
    allowedRoles: ROLE_GROUPS.ADMIN_ACCESS,
    fallbackPath: `/${locale}`,
  });

  // Extra safety check - should not happen due to protectLayout
  if (!user) {
    redirect(`/${locale}/login?redirect_to=/${locale}/admin`);
  }

  return (
    <AdminSidebarWrapper locale={locale} userRole={user.role}>
      {children}
    </AdminSidebarWrapper>
  );
}
