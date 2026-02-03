import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CategoryForm } from '@/components/admin/category-form';

interface NewCategoryPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewCategoryPage({ params }: NewCategoryPageProps) {
  const { locale } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirect=/admin/categories/new`);
  }

  // Check user role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .single() as { data: { role: string } | null };

  const allowedRoles = ['platform_admin', 'tenant_admin', 'tenant_manager'];
  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect(`/${locale}/admin/categories`);
  }

  return <CategoryForm locale={locale} mode="create" />;
}
