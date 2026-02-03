import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { SeasonForm } from '@/components/admin/season-form';
import { getSeasonById } from '@/lib/pricing/season-queries';

interface EditSeasonPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EditSeasonPage({ params }: EditSeasonPageProps) {
  const { locale, id } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/login?redirect=/admin/pricing/seasons/${id}/edit`);
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

  // Fetch the season
  const season = await getSeasonById(supabase, id);

  if (!season || season.tenantId !== profile.tenant_id) {
    notFound();
  }

  return (
    <SeasonForm
      locale={locale}
      season={season}
      mode="edit"
    />
  );
}
