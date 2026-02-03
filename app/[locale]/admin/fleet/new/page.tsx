import { VehicleForm } from '@/components/admin/vehicle-form';

interface NewVehiclePageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewVehiclePage({ params }: NewVehiclePageProps) {
  const { locale } = await params;

  return <VehicleForm locale={locale} mode="create" />;
}
