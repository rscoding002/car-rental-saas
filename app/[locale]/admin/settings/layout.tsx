import { redirect } from 'next/navigation';

import { protectLayout } from '@/lib/auth/middleware';
import { ROLE_GROUPS } from '@/lib/auth/roles';

interface SettingsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Settings Layout
 *
 * Additional protection for /admin/settings/* routes.
 * Requires tenant_admin or platform_admin role.
 *
 * This is layered on top of the main admin layout protection.
 * Staff and managers can access the admin dashboard but cannot
 * access tenant settings like branding, languages, policies, etc.
 */
export default async function SettingsLayout({ children, params }: SettingsLayoutProps) {
  const { locale } = await params;

  // Protect layout - requires tenant settings access (tenant_admin or platform_admin)
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
