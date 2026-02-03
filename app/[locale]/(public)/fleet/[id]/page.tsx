import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { createClient } from '@/lib/supabase/server';
import { VehicleDetailContent } from './vehicle-detail-content';
import { generateVehicleMetadata } from '@/lib/seo/metadata';
import { generateVehicleSchema, renderJsonLd } from '@/lib/seo/schema';
import type { Locale } from '@/lib/utils/constants';
import type { Vehicle, VehicleCategory, PricingRule, Branch, VehiclePhoto } from '@/lib/supabase/types';

interface VehicleDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

// Vehicle metadata type for generateMetadata
type VehicleMetadataFields = Pick<
  Vehicle,
  'make' | 'model' | 'year' | 'description' | 'photos' | 'transmission' | 'fuel_type' | 'seats'
>;

// Generate metadata
export async function generateMetadata({
  params,
}: VehicleDetailPageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('vehicles')
    .select('make, model, year, description, photos, transmission, fuel_type, seats')
    .eq('id', id)
    .single();

  const vehicle = data as VehicleMetadataFields | null;

  if (!vehicle) {
    return {
      title: 'Vehicle Not Found',
    };
  }

  // Get vehicle image
  const photos = vehicle.photos as VehiclePhoto[] | null;
  const primaryImage = photos?.[0]?.url;

  // Build features list
  const features = [
    vehicle.transmission,
    vehicle.fuel_type,
    vehicle.seats ? `${vehicle.seats} seats` : null,
  ].filter(Boolean) as string[];

  const description =
    vehicle.description?.[locale as Locale] ||
    vehicle.description?.en ||
    undefined;

  return generateVehicleMetadata({
    vehicle: {
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      description,
      image: primaryImage,
      features,
    },
    locale: locale as Locale,
    pathname: `/fleet/${id}`,
  });
}

// Return type for getVehicleData
interface VehicleDataResult {
  vehicle: Vehicle;
  category: VehicleCategory | null;
  branch: Branch | null;
  pricingRules: PricingRule[];
  similarVehicles: Vehicle[];
  branches: Pick<Branch, 'id' | 'name' | 'city'>[];
}

// Fetch vehicle data
async function getVehicleData(id: string): Promise<VehicleDataResult | null> {
  const supabase = await createClient();

  // Fetch vehicle
  const { data: vehicleData, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !vehicleData) {
    return null;
  }

  const vehicle = vehicleData as Vehicle;

  // Fetch category
  const { data: categoryData } = await supabase
    .from('vehicle_categories')
    .select('*')
    .eq('id', vehicle.category_id)
    .single();

  // Fetch branch
  const { data: branchData } = await supabase
    .from('branches')
    .select('*')
    .eq('id', vehicle.branch_id)
    .single();

  // Fetch pricing rules (vehicle-specific and category-based)
  const { data: pricingData } = await supabase
    .from('pricing_rules')
    .select('*')
    .eq('status', 'active')
    .or(`vehicle_id.eq.${id},category_id.eq.${vehicle.category_id}`);

  // Fetch similar vehicles (same category, different vehicle)
  const { data: similarData } = await supabase
    .from('vehicles')
    .select('*')
    .eq('category_id', vehicle.category_id)
    .eq('status', 'available')
    .neq('id', id)
    .limit(4);

  // Fetch all branches for booking
  const { data: allBranchesData } = await supabase
    .from('branches')
    .select('id, name, city')
    .eq('status', 'active')
    .order('sort_order', { ascending: true });

  return {
    vehicle,
    category: categoryData as VehicleCategory | null,
    branch: branchData as Branch | null,
    pricingRules: (pricingData as PricingRule[]) || [],
    similarVehicles: (similarData as Vehicle[]) || [],
    branches: (allBranchesData as Pick<Branch, 'id' | 'name' | 'city'>[]) || [],
  };
}

/**
 * Vehicle Detail Page
 *
 * Displays detailed information about a specific vehicle.
 * Mobile-first responsive design.
 */
export default async function VehicleDetailPage({
  params,
}: VehicleDetailPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const data = await getVehicleData(id);

  if (!data) {
    notFound();
  }

  const { vehicle, category, branch, pricingRules, similarVehicles, branches } =
    data;

  // Calculate prices
  const vehicleRule = pricingRules.find((r) => r.vehicle_id === vehicle.id);
  const categoryRule = pricingRules.find(
    (r) => r.category_id === vehicle.category_id && !r.vehicle_id
  );

  const dailyPrice = vehicleRule?.amount || categoryRule?.amount || null;
  const currency = vehicleRule?.currency || categoryRule?.currency || 'EUR';

  // Calculate prices for similar vehicles
  const similarPrices: Record<string, number> = {};
  for (const v of similarVehicles) {
    const vRule = pricingRules.find((r: PricingRule) => r.vehicle_id === v.id);
    const cRule = pricingRules.find(
      (r: PricingRule) => r.category_id === v.category_id && !r.vehicle_id
    );
    if (vRule?.amount || cRule?.amount) {
      similarPrices[v.id] = vRule?.amount || cRule?.amount || 0;
    }
  }

  // Generate Vehicle JSON-LD schema for SEO
  const vehiclePhotos = vehicle.photos as VehiclePhoto[] | null;
  const vehicleImages = vehiclePhotos?.map((p) => p.url) || [];
  const vehicleDescription =
    vehicle.description?.[locale as keyof typeof vehicle.description] ||
    vehicle.description?.en ||
    undefined;

  const vehicleSchema = generateVehicleSchema({
    id: vehicle.id,
    name: `${vehicle.make} ${vehicle.model} ${vehicle.year}`,
    description: vehicleDescription,
    images: vehicleImages,
    brand: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    category: category?.name?.[locale as keyof typeof category.name] || category?.name?.en,
    fuelType: vehicle.fuel_type,
    transmission: vehicle.transmission,
    seatingCapacity: vehicle.seats,
    numberOfDoors: vehicle.doors,
    color: vehicle.color || undefined,
    price: dailyPrice || undefined,
    currency: currency,
    availability: vehicle.status === 'available' ? 'InStock' : 'OutOfStock',
  });

  return (
    <>
      {/* Vehicle JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(vehicleSchema) }}
      />
      <VehicleDetailContent
        vehicle={vehicle}
        category={category}
        branch={branch}
        dailyPrice={dailyPrice}
        currency={currency}
        similarVehicles={similarVehicles}
        similarPrices={similarPrices}
        branches={branches}
        locale={locale}
      />
    </>
  );
}
