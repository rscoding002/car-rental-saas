/**
 * Vehicle Database Queries
 *
 * Server-side queries for fetching and managing vehicle data.
 * All operations are tenant-scoped through RLS policies.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  Database,
  Vehicle as DbVehicle,
  VehicleInsert as DbVehicleInsert,
  VehicleUpdate as DbVehicleUpdate,
  VehicleStatus,
  VehiclePhoto,
  VehicleCategory as DbVehicleCategory,
} from '@/lib/supabase/types';
import type {
  Vehicle,
  VehicleInsert,
  VehicleUpdate,
  VehicleFilters,
  VehicleSort,
  VehicleListItem,
  VehicleWithRelations,
  VehiclePublic,
  VehicleCategory,
  VehicleCategoryWithCount,
} from './types';

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get a single vehicle by ID
 */
export async function getVehicleById(
  supabase: SupabaseClient<Database>,
  vehicleId: string
): Promise<Vehicle | null> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', vehicleId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Vehicle;
}

/**
 * Get a vehicle by license plate within a tenant
 */
export async function getVehicleByLicensePlate(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  licensePlate: string
): Promise<Vehicle | null> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('tenant_id', tenantId)
    .ilike('license_plate', licensePlate)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Vehicle;
}

/**
 * Get a vehicle with category and branch relations
 */
export async function getVehicleWithRelations(
  supabase: SupabaseClient<Database>,
  vehicleId: string
): Promise<VehicleWithRelations | null> {
  const { data, error } = await supabase
    .from('vehicles')
    .select(`
      *,
      category:vehicle_categories(id, name, description, icon, image_url),
      branch:branches(id, name, city)
    `)
    .eq('id', vehicleId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as unknown as VehicleWithRelations;
}

/**
 * List all vehicles for a tenant with filters, sorting, and pagination
 */
export async function listVehicles(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  options: {
    filters?: VehicleFilters;
    sort?: VehicleSort;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: Vehicle[]; count: number }> {
  const { filters, sort, limit = 50, offset = 0 } = options;

  let query = supabase
    .from('vehicles')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  if (filters?.branchId) {
    query = query.eq('branch_id', filters.branchId);
  }

  if (filters?.transmission) {
    query = query.eq('transmission', filters.transmission);
  }

  if (filters?.fuelType) {
    query = query.eq('fuel_type', filters.fuelType);
  }

  if (filters?.minSeats !== undefined) {
    query = query.gte('seats', filters.minSeats);
  }

  if (filters?.maxSeats !== undefined) {
    query = query.lte('seats', filters.maxSeats);
  }

  if (filters?.minYear !== undefined) {
    query = query.gte('year', filters.minYear);
  }

  if (filters?.maxYear !== undefined) {
    query = query.lte('year', filters.maxYear);
  }

  if (filters?.search) {
    query = query.or(
      `make.ilike.%${filters.search}%,model.ilike.%${filters.search}%,license_plate.ilike.%${filters.search}%`
    );
  }

  // Apply sorting
  const sortField = sort?.field || 'created_at';
  const sortDirection = sort?.direction === 'asc';
  query = query.order(sortField, { ascending: sortDirection });

  // Secondary sort by make/model for consistency
  if (sortField !== 'make') {
    query = query.order('make', { ascending: true });
    query = query.order('model', { ascending: true });
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error listing vehicles:', error);
    return { data: [], count: 0 };
  }

  return { data: (data as Vehicle[]) || [], count: count || 0 };
}

/**
 * List vehicles with relations (category and branch)
 */
export async function listVehiclesWithRelations(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  options: {
    filters?: VehicleFilters;
    sort?: VehicleSort;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: VehicleWithRelations[]; count: number }> {
  const { filters, sort, limit = 50, offset = 0 } = options;

  let query = supabase
    .from('vehicles')
    .select(`
      *,
      category:vehicle_categories(id, name, description, icon, image_url),
      branch:branches(id, name, city)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  if (filters?.branchId) {
    query = query.eq('branch_id', filters.branchId);
  }

  if (filters?.transmission) {
    query = query.eq('transmission', filters.transmission);
  }

  if (filters?.fuelType) {
    query = query.eq('fuel_type', filters.fuelType);
  }

  if (filters?.minSeats !== undefined) {
    query = query.gte('seats', filters.minSeats);
  }

  if (filters?.maxSeats !== undefined) {
    query = query.lte('seats', filters.maxSeats);
  }

  if (filters?.minYear !== undefined) {
    query = query.gte('year', filters.minYear);
  }

  if (filters?.maxYear !== undefined) {
    query = query.lte('year', filters.maxYear);
  }

  if (filters?.search) {
    query = query.or(
      `make.ilike.%${filters.search}%,model.ilike.%${filters.search}%,license_plate.ilike.%${filters.search}%`
    );
  }

  // Apply sorting
  const sortField = sort?.field || 'created_at';
  const sortDirection = sort?.direction === 'asc';
  query = query.order(sortField, { ascending: sortDirection });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error listing vehicles with relations:', error);
    return { data: [], count: 0 };
  }

  return { data: (data as unknown as VehicleWithRelations[]) || [], count: count || 0 };
}

/**
 * Get available vehicles for public display (fleet page)
 */
export async function getAvailableVehicles(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  options: {
    filters?: Omit<VehicleFilters, 'status'>;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: VehiclePublic[]; count: number }> {
  const { filters, limit = 50, offset = 0 } = options;

  let query = supabase
    .from('vehicles')
    .select(`
      *,
      category:vehicle_categories(id, name, description, icon, image_url, status),
      branch:branches(id, name, city, status)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('status', 'available');

  // Apply filters
  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  if (filters?.branchId) {
    query = query.eq('branch_id', filters.branchId);
  }

  if (filters?.transmission) {
    query = query.eq('transmission', filters.transmission);
  }

  if (filters?.fuelType) {
    query = query.eq('fuel_type', filters.fuelType);
  }

  if (filters?.minSeats !== undefined) {
    query = query.gte('seats', filters.minSeats);
  }

  if (filters?.maxSeats !== undefined) {
    query = query.lte('seats', filters.maxSeats);
  }

  if (filters?.search) {
    query = query.or(
      `make.ilike.%${filters.search}%,model.ilike.%${filters.search}%`
    );
  }

  // Default sort by make/model
  query = query.order('make', { ascending: true });
  query = query.order('model', { ascending: true });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error getting available vehicles:', error);
    return { data: [], count: 0 };
  }

  // Filter out vehicles with inactive categories or branches
  const filteredData = (data || []).filter((vehicle: any) => {
    const categoryActive = !vehicle.category || vehicle.category.status === 'active';
    const branchActive = !vehicle.branch || vehicle.branch.status === 'active';
    return categoryActive && branchActive;
  });

  return { data: filteredData as unknown as VehiclePublic[], count: count || 0 };
}

/**
 * Get vehicle list items (minimal data for dropdowns)
 */
export async function getVehicleListItems(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  options: { availableOnly?: boolean; branchId?: string } = {}
): Promise<VehicleListItem[]> {
  let query = supabase
    .from('vehicles')
    .select('id, make, model, year, license_plate, transmission, fuel_type, seats, status, photos, category_id, branch_id')
    .eq('tenant_id', tenantId)
    .neq('status', 'retired')
    .order('make', { ascending: true })
    .order('model', { ascending: true });

  if (options.availableOnly) {
    query = query.eq('status', 'available');
  }

  if (options.branchId) {
    query = query.eq('branch_id', options.branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error getting vehicle list items:', error);
    return [];
  }

  return (data as VehicleListItem[]) || [];
}

/**
 * Get vehicles by branch
 */
export async function getVehiclesByBranch(
  supabase: SupabaseClient<Database>,
  branchId: string,
  options: { status?: VehicleStatus } = {}
): Promise<Vehicle[]> {
  let query = supabase
    .from('vehicles')
    .select('*')
    .eq('branch_id', branchId)
    .neq('status', 'retired')
    .order('make', { ascending: true })
    .order('model', { ascending: true });

  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error getting vehicles by branch:', error);
    return [];
  }

  return (data as Vehicle[]) || [];
}

/**
 * Get vehicles by category
 */
export async function getVehiclesByCategory(
  supabase: SupabaseClient<Database>,
  categoryId: string,
  options: { status?: VehicleStatus; limit?: number } = {}
): Promise<Vehicle[]> {
  let query = supabase
    .from('vehicles')
    .select('*')
    .eq('category_id', categoryId)
    .neq('status', 'retired')
    .order('make', { ascending: true })
    .order('model', { ascending: true });

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error getting vehicles by category:', error);
    return [];
  }

  return (data as Vehicle[]) || [];
}

/**
 * Get unique makes for a tenant
 */
export async function getVehicleMakes(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('make')
    .eq('tenant_id', tenantId)
    .neq('status', 'retired')
    .order('make', { ascending: true });

  if (error || !data) {
    return [];
  }

  // Get unique makes
  const makes = [...new Set(data.map((v) => v.make))];
  return makes;
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Create a new vehicle
 */
export async function createVehicle(
  supabase: SupabaseClient<Database>,
  vehicle: VehicleInsert
): Promise<{ data: Vehicle | null; error: string | null }> {
  // Check for duplicate license plate within tenant
  const existingPlate = await getVehicleByLicensePlate(
    supabase,
    vehicle.tenant_id,
    vehicle.license_plate
  );
  if (existingPlate) {
    return { data: null, error: 'A vehicle with this license plate already exists' };
  }

  // Check if VIN is provided and unique
  if (vehicle.vin) {
    const { data: existingVin } = await supabase
      .from('vehicles')
      .select('id')
      .eq('tenant_id', vehicle.tenant_id)
      .eq('vin', vehicle.vin)
      .single();

    if (existingVin) {
      return { data: null, error: 'A vehicle with this VIN already exists' };
    }
  }

  const { data, error } = await supabase
    .from('vehicles')
    .insert(vehicle as DbVehicleInsert)
    .select('*')
    .single();

  if (error) {
    console.error('Error creating vehicle:', error);
    return { data: null, error: error.message };
  }

  return { data: data as Vehicle, error: null };
}

/**
 * Update an existing vehicle
 */
export async function updateVehicle(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  updates: VehicleUpdate
): Promise<{ data: Vehicle | null; error: string | null }> {
  // If license plate is being changed, check for duplicates
  if (updates.license_plate) {
    const existing = await getVehicleById(supabase, vehicleId);
    if (existing && existing.license_plate !== updates.license_plate) {
      const duplicate = await getVehicleByLicensePlate(
        supabase,
        existing.tenant_id,
        updates.license_plate
      );
      if (duplicate && duplicate.id !== vehicleId) {
        return { data: null, error: 'A vehicle with this license plate already exists' };
      }
    }
  }

  // If VIN is being changed, check for duplicates
  if (updates.vin) {
    const existing = await getVehicleById(supabase, vehicleId);
    if (existing && existing.vin !== updates.vin) {
      const { data: duplicate } = await supabase
        .from('vehicles')
        .select('id')
        .eq('tenant_id', existing.tenant_id)
        .eq('vin', updates.vin)
        .neq('id', vehicleId)
        .single();

      if (duplicate) {
        return { data: null, error: 'A vehicle with this VIN already exists' };
      }
    }
  }

  const { data, error } = await supabase
    .from('vehicles')
    .update(updates as DbVehicleUpdate)
    .eq('id', vehicleId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating vehicle:', error);
    return { data: null, error: error.message };
  }

  return { data: data as Vehicle, error: null };
}

/**
 * Update vehicle status
 */
export async function updateVehicleStatus(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  status: VehicleStatus
): Promise<{ data: Vehicle | null; error: string | null }> {
  return updateVehicle(supabase, vehicleId, { status });
}

/**
 * Update vehicle photos
 */
export async function updateVehiclePhotos(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  photos: VehiclePhoto[]
): Promise<{ data: Vehicle | null; error: string | null }> {
  return updateVehicle(supabase, vehicleId, { photos });
}

/**
 * Update vehicle branch assignment
 */
export async function updateVehicleBranch(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  branchId: string
): Promise<{ data: Vehicle | null; error: string | null }> {
  return updateVehicle(supabase, vehicleId, { branch_id: branchId });
}

/**
 * Update vehicle category assignment
 */
export async function updateVehicleCategory(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  categoryId: string
): Promise<{ data: Vehicle | null; error: string | null }> {
  return updateVehicle(supabase, vehicleId, { category_id: categoryId });
}

/**
 * Delete a vehicle (soft delete by setting status to retired, or hard delete)
 */
export async function deleteVehicle(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  options: { hardDelete?: boolean } = {}
): Promise<{ success: boolean; error: string | null }> {
  // Check if vehicle has active bookings
  const { count: bookingCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('vehicle_id', vehicleId)
    .in('status', ['pending', 'confirmed', 'active']);

  if (bookingCount && bookingCount > 0) {
    return {
      success: false,
      error: `Cannot delete vehicle with ${bookingCount} active bookings.`,
    };
  }

  if (options.hardDelete) {
    // Permanent delete
    const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);

    if (error) {
      console.error('Error deleting vehicle:', error);
      return { success: false, error: error.message };
    }
  } else {
    // Soft delete - set status to retired
    const { error } = await supabase
      .from('vehicles')
      .update({ status: 'retired' })
      .eq('id', vehicleId);

    if (error) {
      console.error('Error retiring vehicle:', error);
      return { success: false, error: error.message };
    }
  }

  return { success: true, error: null };
}

/**
 * Bulk update vehicle status
 */
export async function bulkUpdateVehicleStatus(
  supabase: SupabaseClient<Database>,
  vehicleIds: string[],
  status: VehicleStatus
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('vehicles')
    .update({ status })
    .in('id', vehicleIds);

  if (error) {
    console.error('Error bulk updating vehicles:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Bulk assign vehicles to branch
 */
export async function bulkAssignVehiclesToBranch(
  supabase: SupabaseClient<Database>,
  vehicleIds: string[],
  branchId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('vehicles')
    .update({ branch_id: branchId })
    .in('id', vehicleIds);

  if (error) {
    console.error('Error bulk assigning vehicles to branch:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// ============================================================================
// VALIDATION QUERIES
// ============================================================================

/**
 * Check if a license plate is available within a tenant
 */
export async function isLicensePlateAvailable(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  licensePlate: string,
  excludeVehicleId?: string
): Promise<boolean> {
  let query = supabase
    .from('vehicles')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .ilike('license_plate', licensePlate);

  if (excludeVehicleId) {
    query = query.neq('id', excludeVehicleId);
  }

  const { count } = await query;

  return count === 0;
}

/**
 * Check if a VIN is available within a tenant
 */
export async function isVinAvailable(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  vin: string,
  excludeVehicleId?: string
): Promise<boolean> {
  let query = supabase
    .from('vehicles')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('vin', vin);

  if (excludeVehicleId) {
    query = query.neq('id', excludeVehicleId);
  }

  const { count } = await query;

  return count === 0;
}

/**
 * Check if a vehicle can be deleted
 */
export async function canDeleteVehicle(
  supabase: SupabaseClient<Database>,
  vehicleId: string
): Promise<{ canDelete: boolean; reason?: string }> {
  // Check for active bookings
  const { count: bookingCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('vehicle_id', vehicleId)
    .in('status', ['pending', 'confirmed', 'active']);

  if (bookingCount && bookingCount > 0) {
    return {
      canDelete: false,
      reason: `Vehicle has ${bookingCount} active bookings`,
    };
  }

  return { canDelete: true };
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get vehicle statistics
 */
export async function getVehicleStats(
  supabase: SupabaseClient<Database>,
  vehicleId: string
): Promise<{
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  totalRevenue: number;
}> {
  // Get all bookings for vehicle
  const { data: bookings } = await supabase
    .from('bookings')
    .select('status, pricing')
    .eq('vehicle_id', vehicleId);

  if (!bookings) {
    return {
      totalBookings: 0,
      activeBookings: 0,
      completedBookings: 0,
      totalRevenue: 0,
    };
  }

  const totalBookings = bookings.length;
  const activeBookings = bookings.filter((b) =>
    ['pending', 'confirmed', 'active'].includes(b.status)
  ).length;
  const completedBookings = bookings.filter((b) => b.status === 'completed').length;
  const totalRevenue = bookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + (b.pricing?.total || 0), 0);

  return {
    totalBookings,
    activeBookings,
    completedBookings,
    totalRevenue,
  };
}

/**
 * Get tenant-wide vehicle statistics
 */
export async function getTenantVehicleStats(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<{
  totalVehicles: number;
  availableVehicles: number;
  rentedVehicles: number;
  maintenanceVehicles: number;
  retiredVehicles: number;
  vehiclesByCategory: Record<string, number>;
  vehiclesByBranch: Record<string, number>;
}> {
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('status, category_id, branch_id')
    .eq('tenant_id', tenantId);

  if (!vehicles) {
    return {
      totalVehicles: 0,
      availableVehicles: 0,
      rentedVehicles: 0,
      maintenanceVehicles: 0,
      retiredVehicles: 0,
      vehiclesByCategory: {},
      vehiclesByBranch: {},
    };
  }

  const totalVehicles = vehicles.length;
  const availableVehicles = vehicles.filter((v) => v.status === 'available').length;
  const rentedVehicles = vehicles.filter((v) => v.status === 'rented').length;
  const maintenanceVehicles = vehicles.filter((v) => v.status === 'maintenance').length;
  const retiredVehicles = vehicles.filter((v) => v.status === 'retired').length;

  // Count by category
  const vehiclesByCategory: Record<string, number> = {};
  for (const v of vehicles.filter((v) => v.status !== 'retired')) {
    vehiclesByCategory[v.category_id] = (vehiclesByCategory[v.category_id] || 0) + 1;
  }

  // Count by branch
  const vehiclesByBranch: Record<string, number> = {};
  for (const v of vehicles.filter((v) => v.status !== 'retired')) {
    vehiclesByBranch[v.branch_id] = (vehiclesByBranch[v.branch_id] || 0) + 1;
  }

  return {
    totalVehicles,
    availableVehicles,
    rentedVehicles,
    maintenanceVehicles,
    retiredVehicles,
    vehiclesByCategory,
    vehiclesByBranch,
  };
}

/**
 * Get fleet summary for dashboard
 */
export async function getFleetSummary(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<{
  total: number;
  available: number;
  rented: number;
  maintenance: number;
  utilizationRate: number;
}> {
  const stats = await getTenantVehicleStats(supabase, tenantId);
  const activeVehicles = stats.totalVehicles - stats.retiredVehicles;
  const utilizationRate =
    activeVehicles > 0
      ? Math.round((stats.rentedVehicles / activeVehicles) * 100)
      : 0;

  return {
    total: activeVehicles,
    available: stats.availableVehicles,
    rented: stats.rentedVehicles,
    maintenance: stats.maintenanceVehicles,
    utilizationRate,
  };
}
