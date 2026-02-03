/**
 * Vehicle Category Database Queries
 *
 * Server-side queries for fetching and managing vehicle category data.
 * All operations are tenant-scoped through RLS policies.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  Database,
  VehicleCategory as DbVehicleCategory,
  VehicleCategoryInsert as DbVehicleCategoryInsert,
  VehicleCategoryUpdate as DbVehicleCategoryUpdate,
} from '@/lib/supabase/types';
import type {
  VehicleCategory,
  VehicleCategoryInsert,
  VehicleCategoryUpdate,
  VehicleCategoryWithCount,
  CategoryListItem,
  CategoryFilters,
  CategorySort,
} from './types';

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get a single category by ID
 */
export async function getCategoryById(
  supabase: SupabaseClient<Database>,
  categoryId: string
): Promise<VehicleCategory | null> {
  const { data, error } = await supabase
    .from('vehicle_categories')
    .select('*')
    .eq('id', categoryId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as VehicleCategory;
}

/**
 * Get a category by name within a tenant (for a specific locale)
 */
export async function getCategoryByName(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  name: string,
  locale: string = 'en'
): Promise<VehicleCategory | null> {
  // Since name is JSONB, we need to query the specific locale field
  const { data, error } = await supabase
    .from('vehicle_categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .filter(`name->>${locale}`, 'ilike', name)
    .single();

  if (error || !data) {
    return null;
  }

  return data as VehicleCategory;
}

/**
 * List all categories for a tenant
 */
export async function listCategories(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  options: {
    filters?: CategoryFilters;
    sort?: CategorySort;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: VehicleCategory[]; count: number }> {
  const { filters, sort, limit = 50, offset = 0 } = options;

  let query = supabase
    .from('vehicle_categories')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.search) {
    // Search across all locale names
    query = query.or(
      `name->>en.ilike.%${filters.search}%,name->>lt.ilike.%${filters.search}%,name->>ru.ilike.%${filters.search}%`
    );
  }

  // Apply sorting
  const sortField = sort?.field || 'sort_order';
  const sortDirection = sort?.direction === 'desc' ? false : true;
  query = query.order(sortField, { ascending: sortDirection });

  // Secondary sort for consistency
  if (sortField !== 'sort_order') {
    query = query.order('sort_order', { ascending: true });
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error listing categories:', error);
    return { data: [], count: 0 };
  }

  return { data: (data as VehicleCategory[]) || [], count: count || 0 };
}

/**
 * Get active categories for a tenant (for public use, dropdowns, etc.)
 */
export async function getActiveCategories(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<VehicleCategory[]> {
  const { data, error } = await supabase
    .from('vehicle_categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error getting active categories:', error);
    return [];
  }

  return (data as VehicleCategory[]) || [];
}

/**
 * Get category list items (minimal data for dropdowns)
 */
export async function getCategoryListItems(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  options: { activeOnly?: boolean } = {}
): Promise<CategoryListItem[]> {
  let query = supabase
    .from('vehicle_categories')
    .select('id, name, status')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true });

  if (options.activeOnly) {
    query = query.eq('status', 'active');
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error getting category list items:', error);
    return [];
  }

  return (data as CategoryListItem[]) || [];
}

/**
 * Get categories with vehicle counts
 */
export async function getCategoriesWithVehicleCounts(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  options: { activeOnly?: boolean; excludeRetiredVehicles?: boolean } = {}
): Promise<VehicleCategoryWithCount[]> {
  const { activeOnly = false, excludeRetiredVehicles = true } = options;

  // First get all categories
  let categoryQuery = supabase
    .from('vehicle_categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true });

  if (activeOnly) {
    categoryQuery = categoryQuery.eq('status', 'active');
  }

  const { data: categories, error: categoriesError } = await categoryQuery;

  if (categoriesError || !categories) {
    return [];
  }

  // Get vehicle counts per category
  let vehicleQuery = supabase
    .from('vehicles')
    .select('category_id')
    .eq('tenant_id', tenantId);

  if (excludeRetiredVehicles) {
    vehicleQuery = vehicleQuery.neq('status', 'retired');
  }

  const { data: vehicles, error: vehiclesError } = await vehicleQuery;

  if (vehiclesError) {
    // Return categories without counts if count query fails
    return categories.map((c) => ({ ...c, vehicleCount: 0 })) as VehicleCategoryWithCount[];
  }

  // Count vehicles per category
  const countMap: Record<string, number> = {};
  for (const v of vehicles || []) {
    countMap[v.category_id] = (countMap[v.category_id] || 0) + 1;
  }

  // Merge counts with categories
  return categories.map((category) => ({
    ...category,
    vehicleCount: countMap[category.id] || 0,
  })) as VehicleCategoryWithCount[];
}

/**
 * Get categories with available vehicle counts (for public fleet page)
 */
export async function getCategoriesWithAvailableVehicles(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<VehicleCategoryWithCount[]> {
  // Get active categories
  const { data: categories, error: categoriesError } = await supabase
    .from('vehicle_categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('sort_order', { ascending: true });

  if (categoriesError || !categories) {
    return [];
  }

  // Get available vehicle counts per category
  const { data: vehicles, error: vehiclesError } = await supabase
    .from('vehicles')
    .select('category_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'available');

  if (vehiclesError) {
    return categories.map((c) => ({ ...c, vehicleCount: 0 })) as VehicleCategoryWithCount[];
  }

  // Count vehicles per category
  const countMap: Record<string, number> = {};
  for (const v of vehicles || []) {
    countMap[v.category_id] = (countMap[v.category_id] || 0) + 1;
  }

  // Merge counts with categories, filter out categories with no vehicles
  return categories
    .map((category) => ({
      ...category,
      vehicleCount: countMap[category.id] || 0,
    }))
    .filter((c) => c.vehicleCount > 0) as VehicleCategoryWithCount[];
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Create a new category
 */
export async function createCategory(
  supabase: SupabaseClient<Database>,
  category: VehicleCategoryInsert
): Promise<{ data: VehicleCategory | null; error: string | null }> {
  // Get the next sort order if not provided
  if (category.sort_order === undefined) {
    const { data: maxOrderData } = await supabase
      .from('vehicle_categories')
      .select('sort_order')
      .eq('tenant_id', category.tenant_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    category.sort_order = (maxOrderData?.sort_order || 0) + 1;
  }

  const { data, error } = await supabase
    .from('vehicle_categories')
    .insert(category as DbVehicleCategoryInsert)
    .select('*')
    .single();

  if (error) {
    console.error('Error creating category:', error);
    return { data: null, error: error.message };
  }

  return { data: data as VehicleCategory, error: null };
}

/**
 * Update an existing category
 */
export async function updateCategory(
  supabase: SupabaseClient<Database>,
  categoryId: string,
  updates: VehicleCategoryUpdate
): Promise<{ data: VehicleCategory | null; error: string | null }> {
  const { data, error } = await supabase
    .from('vehicle_categories')
    .update(updates as DbVehicleCategoryUpdate)
    .eq('id', categoryId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating category:', error);
    return { data: null, error: error.message };
  }

  return { data: data as VehicleCategory, error: null };
}

/**
 * Update category status
 */
export async function updateCategoryStatus(
  supabase: SupabaseClient<Database>,
  categoryId: string,
  status: 'active' | 'inactive'
): Promise<{ data: VehicleCategory | null; error: string | null }> {
  return updateCategory(supabase, categoryId, { status });
}

/**
 * Update category sort order
 */
export async function updateCategorySortOrder(
  supabase: SupabaseClient<Database>,
  categoryId: string,
  sortOrder: number
): Promise<{ data: VehicleCategory | null; error: string | null }> {
  return updateCategory(supabase, categoryId, { sort_order: sortOrder });
}

/**
 * Reorder multiple categories
 */
export async function reorderCategories(
  supabase: SupabaseClient<Database>,
  categoryOrders: Array<{ id: string; sort_order: number }>
): Promise<{ success: boolean; error: string | null }> {
  // Update each category's sort order
  for (const { id, sort_order } of categoryOrders) {
    const { error } = await supabase
      .from('vehicle_categories')
      .update({ sort_order })
      .eq('id', id);

    if (error) {
      console.error('Error reordering category:', error);
      return { success: false, error: error.message };
    }
  }

  return { success: true, error: null };
}

/**
 * Delete a category (soft delete by setting status to inactive, or hard delete)
 */
export async function deleteCategory(
  supabase: SupabaseClient<Database>,
  categoryId: string,
  options: { hardDelete?: boolean } = {}
): Promise<{ success: boolean; error: string | null }> {
  // Check if category has vehicles
  const { count: vehicleCount } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId)
    .neq('status', 'retired');

  if (vehicleCount && vehicleCount > 0) {
    return {
      success: false,
      error: `Cannot delete category with ${vehicleCount} active vehicles. Reassign or retire vehicles first.`,
    };
  }

  if (options.hardDelete) {
    // Permanent delete
    const { error } = await supabase.from('vehicle_categories').delete().eq('id', categoryId);

    if (error) {
      console.error('Error deleting category:', error);
      return { success: false, error: error.message };
    }
  } else {
    // Soft delete - set status to inactive
    const { error } = await supabase
      .from('vehicle_categories')
      .update({ status: 'inactive' })
      .eq('id', categoryId);

    if (error) {
      console.error('Error deactivating category:', error);
      return { success: false, error: error.message };
    }
  }

  return { success: true, error: null };
}

// ============================================================================
// VALIDATION QUERIES
// ============================================================================

/**
 * Check if a category can be deleted
 */
export async function canDeleteCategory(
  supabase: SupabaseClient<Database>,
  categoryId: string
): Promise<{ canDelete: boolean; reason?: string; vehicleCount?: number }> {
  // Check for vehicles
  const { count: vehicleCount } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId)
    .neq('status', 'retired');

  if (vehicleCount && vehicleCount > 0) {
    return {
      canDelete: false,
      reason: `Category has ${vehicleCount} active vehicles`,
      vehicleCount,
    };
  }

  return { canDelete: true };
}

/**
 * Check if category has any vehicles (including retired)
 */
export async function categoryHasVehicles(
  supabase: SupabaseClient<Database>,
  categoryId: string
): Promise<boolean> {
  const { count } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId);

  return (count || 0) > 0;
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get category statistics
 */
export async function getCategoryStats(
  supabase: SupabaseClient<Database>,
  categoryId: string
): Promise<{
  vehicleCount: number;
  availableVehicles: number;
  rentedVehicles: number;
  maintenanceVehicles: number;
}> {
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('status')
    .eq('category_id', categoryId)
    .neq('status', 'retired');

  if (!vehicles) {
    return {
      vehicleCount: 0,
      availableVehicles: 0,
      rentedVehicles: 0,
      maintenanceVehicles: 0,
    };
  }

  return {
    vehicleCount: vehicles.length,
    availableVehicles: vehicles.filter((v) => v.status === 'available').length,
    rentedVehicles: vehicles.filter((v) => v.status === 'rented').length,
    maintenanceVehicles: vehicles.filter((v) => v.status === 'maintenance').length,
  };
}

/**
 * Get tenant-wide category statistics
 */
export async function getTenantCategoryStats(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<{
  totalCategories: number;
  activeCategories: number;
  inactiveCategories: number;
  categoriesWithVehicles: number;
}> {
  // Get all categories
  const { data: categories } = await supabase
    .from('vehicle_categories')
    .select('id, status')
    .eq('tenant_id', tenantId);

  if (!categories) {
    return {
      totalCategories: 0,
      activeCategories: 0,
      inactiveCategories: 0,
      categoriesWithVehicles: 0,
    };
  }

  // Get vehicles to count categories with vehicles
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('category_id')
    .eq('tenant_id', tenantId)
    .neq('status', 'retired');

  const categoriesWithVehicles = new Set(vehicles?.map((v) => v.category_id) || []);

  return {
    totalCategories: categories.length,
    activeCategories: categories.filter((c) => c.status === 'active').length,
    inactiveCategories: categories.filter((c) => c.status === 'inactive').length,
    categoriesWithVehicles: categoriesWithVehicles.size,
  };
}
