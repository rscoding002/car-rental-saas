/**
 * Add-On Database Queries
 *
 * Server-side queries for fetching and managing rental add-ons.
 * All operations are tenant-scoped through RLS policies.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, LocalizedString, PriceType } from '@/lib/supabase/types';
import type {
  AddonData,
  CreateAddonInput,
  UpdateAddonInput,
  RuleStatus,
} from './types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Filters for listing add-ons
 */
export interface AddonFilters {
  /** Filter by status */
  status?: RuleStatus;
  /** Filter by price type */
  priceType?: PriceType;
  /** Search by name */
  search?: string;
}

/**
 * Sort options for add-ons
 */
export interface AddonSort {
  field: 'name' | 'price' | 'sort_order' | 'created_at';
  direction: 'asc' | 'desc';
}

/**
 * Add-on statistics
 */
export interface AddonStats {
  totalAddons: number;
  activeAddons: number;
  byPriceType: Record<PriceType, number>;
  averagePrice: number;
}

// Raw database row type
interface AddonRow {
  id: string;
  tenant_id: string;
  name: LocalizedString;
  description: LocalizedString;
  price: number;
  price_type: string;
  max_quantity: number;
  image_url: string | null;
  sort_order: number;
  status: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get a single add-on by ID
 */
export async function getAddonById(
  supabase: SupabaseClient<Database>,
  addonId: string
): Promise<AddonData | null> {
  const { data, error } = await supabase
    .from('addons')
    .select('*')
    .eq('id', addonId)
    .single();

  if (error || !data) {
    return null;
  }

  return mapDbToAddon(data as unknown as AddonRow);
}

/**
 * List all add-ons for a tenant with filters and sorting
 */
export async function listAddons(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  options: {
    filters?: AddonFilters;
    sort?: AddonSort;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: AddonData[]; count: number }> {
  const { filters, sort, limit = 100, offset = 0 } = options;

  let query = supabase
    .from('addons')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.priceType) {
    query = query.eq('price_type', filters.priceType);
  }

  // Apply sorting
  if (sort) {
    query = query.order(sort.field, { ascending: sort.direction === 'asc' });
  } else {
    query = query.order('sort_order').order('name');
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error listing add-ons:', error);
    return { data: [], count: 0 };
  }

  const addons = ((data || []) as unknown as AddonRow[]).map(mapDbToAddon);

  return { data: addons, count: count || 0 };
}

/**
 * Get all active add-ons for public display
 */
export async function getActiveAddons(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<AddonData[]> {
  const { data, error } = await supabase
    .from('addons')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('sort_order')
    .order('name');

  if (error) {
    console.error('Error fetching active add-ons:', error);
    return [];
  }

  return ((data || []) as unknown as AddonRow[]).map(mapDbToAddon);
}

/**
 * Get add-ons by IDs
 */
export async function getAddonsByIds(
  supabase: SupabaseClient<Database>,
  addonIds: string[]
): Promise<AddonData[]> {
  if (addonIds.length === 0) return [];

  const { data, error } = await supabase
    .from('addons')
    .select('*')
    .in('id', addonIds);

  if (error) {
    console.error('Error fetching add-ons by IDs:', error);
    return [];
  }

  return ((data || []) as unknown as AddonRow[]).map(mapDbToAddon);
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Create a new add-on
 */
export async function createAddon(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  input: CreateAddonInput
): Promise<{ data: AddonData | null; error: string | null }> {
  // Get max sort order
  const { data: maxSortData } = await supabase
    .from('addons')
    .select('sort_order')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextSortOrder = ((maxSortData as { sort_order: number } | null)?.sort_order || 0) + 1;

  const insertData = {
    tenant_id: tenantId,
    name: input.name,
    description: input.description || {},
    price: input.price,
    price_type: input.priceType,
    max_quantity: input.maxQuantity ?? 1,
    image_url: input.imageUrl ?? null,
    sort_order: input.sortOrder ?? nextSortOrder,
    status: input.status ?? 'active',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('addons')
    .insert(insertData)
    .select('*')
    .single();

  if (error) {
    console.error('Error creating add-on:', error);
    return { data: null, error: error.message };
  }

  return { data: mapDbToAddon(data as unknown as AddonRow), error: null };
}

/**
 * Update an existing add-on
 */
export async function updateAddon(
  supabase: SupabaseClient<Database>,
  addonId: string,
  input: UpdateAddonInput
): Promise<{ data: AddonData | null; error: string | null }> {
  // Build update object
  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.price !== undefined) updateData.price = input.price;
  if (input.priceType !== undefined) updateData.price_type = input.priceType;
  if (input.maxQuantity !== undefined) updateData.max_quantity = input.maxQuantity;
  if (input.imageUrl !== undefined) updateData.image_url = input.imageUrl;
  if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;
  if (input.status !== undefined) updateData.status = input.status;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('addons')
    .update(updateData)
    .eq('id', addonId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating add-on:', error);
    return { data: null, error: error.message };
  }

  return { data: mapDbToAddon(data as unknown as AddonRow), error: null };
}

/**
 * Delete an add-on
 */
export async function deleteAddon(
  supabase: SupabaseClient<Database>,
  addonId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('addons')
    .delete()
    .eq('id', addonId);

  if (error) {
    console.error('Error deleting add-on:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Update add-on sort orders (bulk reorder)
 */
export async function reorderAddons(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  addonOrders: Array<{ id: string; sortOrder: number }>
): Promise<{ success: boolean; error: string | null }> {
  // Update each add-on's sort order
  for (const item of addonOrders) {
    const { error } = await supabase
      .from('addons')
      .update({ sort_order: item.sortOrder })
      .eq('id', item.id)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error reordering add-on:', error);
      return { success: false, error: error.message };
    }
  }

  return { success: true, error: null };
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get add-on statistics for a tenant
 */
export async function getAddonStats(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<AddonStats> {
  const { data, error } = await supabase
    .from('addons')
    .select('id, status, price_type, price')
    .eq('tenant_id', tenantId);

  if (error || !data) {
    return {
      totalAddons: 0,
      activeAddons: 0,
      byPriceType: { per_day: 0, per_rental: 0, one_time: 0 },
      averagePrice: 0,
    };
  }

  const rows = data as unknown as Array<{
    id: string;
    status: string;
    price_type: string;
    price: number;
  }>;

  const stats: AddonStats = {
    totalAddons: rows.length,
    activeAddons: 0,
    byPriceType: { per_day: 0, per_rental: 0, one_time: 0 },
    averagePrice: 0,
  };

  let totalPrice = 0;

  for (const row of rows) {
    if (row.status === 'active') stats.activeAddons++;
    const priceType = row.price_type as PriceType;
    if (priceType in stats.byPriceType) {
      stats.byPriceType[priceType]++;
    }
    totalPrice += row.price;
  }

  stats.averagePrice = rows.length > 0
    ? Math.round((totalPrice / rows.length) * 100) / 100
    : 0;

  return stats;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map database row to AddonData type
 */
function mapDbToAddon(row: AddonRow): AddonData {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description,
    price: row.price,
    priceType: row.price_type as PriceType,
    maxQuantity: row.max_quantity,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
    status: row.status as RuleStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get localized add-on name
 */
export function getLocalizedAddonName(
  addon: AddonData,
  locale: string,
  fallbackLocale: string = 'en'
): string {
  return addon.name[locale] || addon.name[fallbackLocale] || Object.values(addon.name)[0] || 'Untitled';
}

/**
 * Get localized add-on description
 */
export function getLocalizedAddonDescription(
  addon: AddonData,
  locale: string,
  fallbackLocale: string = 'en'
): string {
  return addon.description[locale] || addon.description[fallbackLocale] || '';
}

/**
 * Format price type for display
 */
export function formatAddonPriceType(priceType: PriceType): string {
  const labels: Record<PriceType, string> = {
    per_day: 'per day',
    per_rental: 'per rental',
    one_time: 'one-time',
  };
  return labels[priceType];
}
