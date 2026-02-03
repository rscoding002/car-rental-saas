import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AddonForm } from '@/components/admin/addon-form';

interface NewAddonPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewAddonPage({ params }: NewAddonPageProps) {
  const { locale } = await params;
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirect=/admin/pricing/addons/new`);
  }

  // Get user's tenant and role
  const { data: profile } = (await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_id', user.id)
    .single()) as { data: { tenant_id: string; role: string } | null };

  if (!profile?.tenant_id) {
    redirect(`/${locale}/admin`);
  }

  // Check role
  const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager'];
  if (!allowedRoles.includes(profile.role)) {
    redirect(`/${locale}/admin/pricing/addons`);
  }

  return <AddonForm locale={locale} mode="create" />;
}
