import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { AddonForm } from '@/components/admin/addon-form';
import { getAddonById } from '@/lib/pricing/addon-queries';

interface EditAddonPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EditAddonPage({ params }: EditAddonPageProps) {
  const { locale, id } = await params;
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirect=/admin/pricing/addons/${id}/edit`);
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

  // Fetch the add-on
  const addon = await getAddonById(supabase, id);

  if (!addon) {
    notFound();
  }

  // Verify tenant ownership
  if (addon.tenantId !== profile.tenant_id && profile.role !== 'platform_admin') {
    notFound();
  }

  return <AddonForm locale={locale} mode="edit" addon={addon} />;
}
