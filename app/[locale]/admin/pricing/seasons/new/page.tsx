import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SeasonForm } from '@/components/admin/season-form';

interface NewSeasonPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewSeasonPage({ params }: NewSeasonPageProps) {
  const { locale } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/login?redirect=/admin/pricing/seasons/new`);
  }

  // Get user's tenant
  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_id', user.id)
    .single() as { data: { tenant_id: string; role: string } | null };

  if (!profile?.tenant_id) {
    redirect(`/${locale}/admin`);
  }

  // Check role
  const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager'];
  if (!allowedRoles.includes(profile.role)) {
    redirect(`/${locale}/admin`);
  }

  return (
    <SeasonForm
      locale={locale}
      mode="create"
    />
  );
}
