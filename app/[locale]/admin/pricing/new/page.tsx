import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PricingRuleForm } from '@/components/admin/pricing-rule-form';
import type { LocalizedString } from '@/lib/supabase/types';

interface NewPricingRulePageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewPricingRulePage({ params }: NewPricingRulePageProps) {
  const { locale } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/login?redirect=/admin/pricing/new`);
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

  // Fetch categories for the tenant
  const { data: categoriesData } = await supabase
    .from('vehicle_categories')
    .select('id, name')
    .eq('tenant_id', profile.tenant_id)
    .eq('status', 'active')
    .order('sort_order', { ascending: true }) as { data: Array<{ id: string; name: LocalizedString }> | null };

  const categories = (categoriesData || []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  // Fetch vehicles for the tenant
  const { data: vehiclesData } = await supabase
    .from('vehicles')
    .select('id, make, model, year')
    .eq('tenant_id', profile.tenant_id)
    .neq('status', 'retired')
    .order('make', { ascending: true })
    .order('model', { ascending: true }) as { data: Array<{ id: string; make: string; model: string; year: number }> | null };

  const vehicles = (vehiclesData || []).map((v) => ({
    id: v.id,
    make: v.make,
    model: v.model,
    year: v.year,
  }));

  return (
    <PricingRuleForm
      locale={locale}
      mode="create"
      categories={categories}
      vehicles={vehicles}
    />
  );
}
