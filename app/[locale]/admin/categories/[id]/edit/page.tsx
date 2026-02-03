import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CategoryForm } from '@/components/admin/category-form';
import type { VehicleCategory } from '@/lib/fleet/types';

interface EditCategoryPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { locale, id } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirect=/admin/categories/${id}/edit`);
  }

  // Check user role and get tenant
  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_id', user.id)
    .single() as { data: { tenant_id: string; role: string } | null };

  const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager'];
  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect(`/${locale}/admin/categories`);
  }

  // Fetch category
  const { data: category, error } = await supabase
    .from('vehicle_categories')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .single();

  if (error || !category) {
    notFound();
  }

  return <CategoryForm locale={locale} category={category as VehicleCategory} mode="edit" />;
}
