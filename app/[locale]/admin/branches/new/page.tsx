import { BranchForm } from '@/components/admin/branch-form';

interface NewBranchPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewBranchPage({ params }: NewBranchPageProps) {
  const { locale } = await params;

  return <BranchForm locale={locale} mode="create" />;
}
