import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VehicleForm } from '@/components/admin/vehicle-form';
import type { Vehicle } from '@/lib/supabase/types';

interface EditVehiclePageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EditVehiclePage({ params }: EditVehiclePageProps) {
  const { locale, id } = await params;
  const supabase = await createClient();

  // Fetch the vehicle
  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !vehicle) {
    notFound();
  }

  return <VehicleForm locale={locale} vehicle={vehicle as Vehicle} mode="edit" />;
}
