import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BranchForm } from '@/components/admin/branch-form';
import { getBranchById } from '@/lib/branches';

interface EditBranchPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EditBranchPage({ params }: EditBranchPageProps) {
  const { locale, id } = await params;
  const supabase = await createClient();

  // Fetch branch data
  const branch = await getBranchById(supabase, id);

  if (!branch) {
    notFound();
  }

  return <BranchForm locale={locale} branch={branch} mode="edit" />;
}
