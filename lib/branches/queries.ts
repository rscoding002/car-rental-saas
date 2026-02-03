/**
 * Branch Database Queries
 *
 * Server-side queries for fetching and managing branch/location data.
 * All operations are tenant-scoped through RLS policies.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  Database,
  Branch,
  BranchInsert,
  BranchUpdate,
  BranchStatus,
} from '@/lib/supabase/types';
import type {
  BranchFilters,
  BranchSort,
  BranchListItem,
  BranchWithDetails,
} from './types';

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get a single branch by ID
 */
export async function getBranchById(
  supabase: SupabaseClient<Database>,
  branchId: string
): Promise<Branch | null> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('id', branchId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Get a branch by slug within a tenant
 */
export async function getBranchBySlug(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  slug: string
): Promise<Branch | null> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * List all branches for a tenant
 */
export async function listBranches(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  options: {
    filters?: BranchFilters;
    sort?: BranchSort;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: Branch[]; count: number }> {
  const { filters, sort, limit = 50, offset = 0 } = options;

  let query = supabase
    .from('branches')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.city) {
    query = query.ilike('city', `%${filters.city}%`);
  }

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,address.ilike.%${filters.search}%,city.ilike.%${filters.search}%`
    );
  }

  // Apply sorting
  const sortField = sort?.field || 'sort_order';
  const sortDirection = sort?.direction === 'desc' ? false : true;
  query = query.order(sortField, { ascending: sortDirection });

  // Secondary sort by name for consistency
  if (sortField !== 'name') {
    query = query.order('name', { ascending: true });
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error listing branches:', error);
    return { data: [], count: 0 };
  }

  return { data: data || [], count: count || 0 };
}

/**
 * Get active branches for a tenant (for public use, dropdowns, etc.)
 */
export async function getActiveBranches(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<Branch[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error getting active branches:', error);
    return [];
  }

  return data || [];
}

/**
 * Get branch list items (minimal data for dropdowns)
 */
export async function getBranchListItems(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  options: { activeOnly?: boolean } = {}
): Promise<BranchListItem[]> {
  let query = supabase
    .from('branches')
    .select('id, name, city, status')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (options.activeOnly) {
    query = query.eq('status', 'active');
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error getting branch list items:', error);
    return [];
  }

  return data || [];
}

/**
 * Get branches with vehicle counts
 */
export async function getBranchesWithVehicleCounts(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<BranchWithDetails[]> {
  // First get all branches
  const { data: branches, error: branchesError } = await supabase
    .from('branches')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('sort_order', { ascending: true });

  if (branchesError || !branches) {
    return [];
  }

  // Get vehicle counts per branch
  const { data: vehicleCounts, error: countsError } = await supabase
    .from('vehicles')
    .select('branch_id')
    .eq('tenant_id', tenantId)
    .neq('status', 'retired');

  if (countsError) {
    // Return branches without counts if count query fails
    return branches.map((b) => ({ ...b, vehicleCount: 0 }));
  }

  // Count vehicles per branch
  const countMap: Record<string, number> = {};
  for (const v of vehicleCounts || []) {
    countMap[v.branch_id] = (countMap[v.branch_id] || 0) + 1;
  }

  // Merge counts with branches
  return branches.map((branch) => ({
    ...branch,
    vehicleCount: countMap[branch.id] || 0,
  }));
}

/**
 * Get branches by city
 */
export async function getBranchesByCity(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  city: string
): Promise<Branch[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .ilike('city', city)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error getting branches by city:', error);
    return [];
  }

  return data || [];
}

/**
 * Get unique cities for a tenant's branches
 */
export async function getBranchCities(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('city')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('city', { ascending: true });

  if (error || !data) {
    return [];
  }

  // Get unique cities
  const cities = [...new Set(data.map((b) => b.city))];
  return cities;
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Create a new branch
 */
export async function createBranch(
  supabase: SupabaseClient<Database>,
  branch: BranchInsert
): Promise<{ data: Branch | null; error: string | null }> {
  // Check for duplicate slug within tenant
  const existingSlug = await getBranchBySlug(supabase, branch.tenant_id, branch.slug);
  if (existingSlug) {
    return { data: null, error: 'A branch with this slug already exists' };
  }

  const { data, error } = await supabase
    .from('branches')
    .insert(branch)
    .select('*')
    .single();

  if (error) {
    console.error('Error creating branch:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Update an existing branch
 */
export async function updateBranch(
  supabase: SupabaseClient<Database>,
  branchId: string,
  updates: BranchUpdate
): Promise<{ data: Branch | null; error: string | null }> {
  // If slug is being changed, check for duplicates
  if (updates.slug) {
    const existing = await getBranchById(supabase, branchId);
    if (existing && existing.slug !== updates.slug) {
      const duplicate = await getBranchBySlug(supabase, existing.tenant_id, updates.slug);
      if (duplicate && duplicate.id !== branchId) {
        return { data: null, error: 'A branch with this slug already exists' };
      }
    }
  }

  const { data, error } = await supabase
    .from('branches')
    .update(updates)
    .eq('id', branchId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating branch:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Update branch status
 */
export async function updateBranchStatus(
  supabase: SupabaseClient<Database>,
  branchId: string,
  status: BranchStatus
): Promise<{ data: Branch | null; error: string | null }> {
  return updateBranch(supabase, branchId, { status });
}

/**
 * Update branch sort order
 */
export async function updateBranchSortOrder(
  supabase: SupabaseClient<Database>,
  branchId: string,
  sortOrder: number
): Promise<{ data: Branch | null; error: string | null }> {
  return updateBranch(supabase, branchId, { sort_order: sortOrder });
}

/**
 * Reorder multiple branches
 */
export async function reorderBranches(
  supabase: SupabaseClient<Database>,
  branchOrders: Array<{ id: string; sort_order: number }>
): Promise<{ success: boolean; error: string | null }> {
  // Update each branch's sort order
  for (const { id, sort_order } of branchOrders) {
    const { error } = await supabase
      .from('branches')
      .update({ sort_order })
      .eq('id', id);

    if (error) {
      console.error('Error reordering branch:', error);
      return { success: false, error: error.message };
    }
  }

  return { success: true, error: null };
}

/**
 * Delete a branch (soft delete by setting status to inactive)
 */
export async function deleteBranch(
  supabase: SupabaseClient<Database>,
  branchId: string,
  options: { hardDelete?: boolean } = {}
): Promise<{ success: boolean; error: string | null }> {
  // Check if branch has vehicles
  const { count: vehicleCount } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('branch_id', branchId)
    .neq('status', 'retired');

  if (vehicleCount && vehicleCount > 0) {
    return {
      success: false,
      error: `Cannot delete branch with ${vehicleCount} active vehicles. Reassign or retire vehicles first.`,
    };
  }

  // Check if branch has active bookings
  const { count: bookingCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .or(`pickup_branch_id.eq.${branchId},return_branch_id.eq.${branchId}`)
    .in('status', ['pending', 'confirmed', 'active']);

  if (bookingCount && bookingCount > 0) {
    return {
      success: false,
      error: `Cannot delete branch with ${bookingCount} active bookings.`,
    };
  }

  if (options.hardDelete) {
    // Permanent delete
    const { error } = await supabase.from('branches').delete().eq('id', branchId);

    if (error) {
      console.error('Error deleting branch:', error);
      return { success: false, error: error.message };
    }
  } else {
    // Soft delete - set status to inactive
    const { error } = await supabase
      .from('branches')
      .update({ status: 'inactive' })
      .eq('id', branchId);

    if (error) {
      console.error('Error deactivating branch:', error);
      return { success: false, error: error.message };
    }
  }

  return { success: true, error: null };
}

// ============================================================================
// VALIDATION QUERIES
// ============================================================================

/**
 * Check if a branch slug is available
 */
export async function isBranchSlugAvailable(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  slug: string,
  excludeBranchId?: string
): Promise<boolean> {
  let query = supabase
    .from('branches')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('slug', slug);

  if (excludeBranchId) {
    query = query.neq('id', excludeBranchId);
  }

  const { count } = await query;

  return count === 0;
}

/**
 * Check if branch can be deleted
 */
export async function canDeleteBranch(
  supabase: SupabaseClient<Database>,
  branchId: string
): Promise<{ canDelete: boolean; reason?: string }> {
  // Check for vehicles
  const { count: vehicleCount } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('branch_id', branchId)
    .neq('status', 'retired');

  if (vehicleCount && vehicleCount > 0) {
    return {
      canDelete: false,
      reason: `Branch has ${vehicleCount} active vehicles`,
    };
  }

  // Check for active bookings
  const { count: bookingCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .or(`pickup_branch_id.eq.${branchId},return_branch_id.eq.${branchId}`)
    .in('status', ['pending', 'confirmed', 'active']);

  if (bookingCount && bookingCount > 0) {
    return {
      canDelete: false,
      reason: `Branch has ${bookingCount} active bookings`,
    };
  }

  return { canDelete: true };
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get branch statistics
 */
export async function getBranchStats(
  supabase: SupabaseClient<Database>,
  branchId: string
): Promise<{
  vehicleCount: number;
  availableVehicles: number;
  activeBookings: number;
  completedBookings: number;
}> {
  // Get vehicle counts
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('status')
    .eq('branch_id', branchId)
    .neq('status', 'retired');

  const vehicleCount = vehicles?.length || 0;
  const availableVehicles = vehicles?.filter((v) => v.status === 'available').length || 0;

  // Get booking counts
  const { count: activeBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .or(`pickup_branch_id.eq.${branchId},return_branch_id.eq.${branchId}`)
    .in('status', ['pending', 'confirmed', 'active']);

  const { count: completedBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .or(`pickup_branch_id.eq.${branchId},return_branch_id.eq.${branchId}`)
    .eq('status', 'completed');

  return {
    vehicleCount,
    availableVehicles,
    activeBookings: activeBookings || 0,
    completedBookings: completedBookings || 0,
  };
}

/**
 * Get tenant-wide branch statistics
 */
export async function getTenantBranchStats(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<{
  totalBranches: number;
  activeBranches: number;
  cities: string[];
}> {
  const { data: branches, count } = await supabase
    .from('branches')
    .select('city, status', { count: 'exact' })
    .eq('tenant_id', tenantId);

  const activeBranches = branches?.filter((b) => b.status === 'active').length || 0;
  const cities = [...new Set(branches?.map((b) => b.city) || [])];

  return {
    totalBranches: count || 0,
    activeBranches,
    cities,
  };
}
