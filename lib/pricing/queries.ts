/**
 * Pricing Rule Database Queries
 *
 * Server-side queries for fetching and managing pricing rules.
 * All operations are tenant-scoped through RLS policies.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
  RateType,
  LocalizedString,
  PricingRuleInsert,
  PricingRuleUpdate,
} from '@/lib/supabase/types';
import type {
  PricingRuleData,
  PricingRuleWithRelations,
  CreatePricingRuleInput,
  UpdatePricingRuleInput,
  EffectiveRate,
  VehicleRates,
  RuleStatus,
} from './types';
import { DEFAULT_CURRENCY } from './types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Filters for listing pricing rules
 */
export interface PricingRuleFilters {
  /** Filter by rate type */
  rateType?: RateType;
  /** Filter by status */
  status?: RuleStatus;
  /** Filter by category ID */
  categoryId?: string;
  /** Filter by vehicle ID */
  vehicleId?: string;
  /** Filter by scope (category or vehicle rules only) */
  scope?: 'category' | 'vehicle';
}

/**
 * Sort options for pricing rules
 */
export interface PricingRuleSort {
  field: 'amount' | 'rate_type' | 'created_at' | 'updated_at';
  direction: 'asc' | 'desc';
}

// Raw database row type for internal use
interface PricingRuleRow {
  id: string;
  tenant_id: string;
  category_id: string | null;
  vehicle_id: string | null;
  rate_type: string;
  amount: number;
  currency: string;
  min_duration: number | null;
  max_duration: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// Rate row for queries selecting specific fields
interface RateRow {
  id: string;
  rate_type: string;
  amount: number;
  currency: string;
  min_duration: number | null;
  max_duration: number | null;
  vehicle_id?: string | null;
  category_id?: string | null;
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get a single pricing rule by ID
 */
export async function getPricingRuleById(
  supabase: SupabaseClient<Database>,
  ruleId: string
): Promise<PricingRuleData | null> {
  const { data, error } = await supabase
    .from('pricing_rules')
    .select('*')
    .eq('id', ruleId)
    .single();

  if (error || !data) {
    return null;
  }

  return mapDbToPricingRule(data as unknown as PricingRuleRow);
}

/**
 * Get a pricing rule with related category/vehicle data
 */
export async function getPricingRuleWithRelations(
  supabase: SupabaseClient<Database>,
  ruleId: string
): Promise<PricingRuleWithRelations | null> {
  // First get the pricing rule
  const rule = await getPricingRuleById(supabase, ruleId);
  if (!rule) return null;

  // Then fetch related data if needed
  let category: { id: string; name: LocalizedString } | undefined;
  let vehicle: { id: string; make: string; model: string; year: number } | undefined;

  if (rule.categoryId) {
    const { data } = await supabase
      .from('vehicle_categories')
      .select('id, name')
      .eq('id', rule.categoryId)
      .single();
    if (data) {
      const d = data as unknown as { id: string; name: LocalizedString };
      category = { id: d.id, name: d.name };
    }
  }

  if (rule.vehicleId) {
    const { data } = await supabase
      .from('vehicles')
      .select('id, make, model, year')
      .eq('id', rule.vehicleId)
      .single();
    if (data) {
      vehicle = data as unknown as { id: string; make: string; model: string; year: number };
    }
  }

  return { ...rule, category, vehicle };
}

/**
 * List all pricing rules for a tenant with filters and sorting
 */
export async function listPricingRules(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  options: {
    filters?: PricingRuleFilters;
    sort?: PricingRuleSort;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: PricingRuleWithRelations[]; count: number }> {
  const { filters, sort, limit = 100, offset = 0 } = options;

  let query = supabase
    .from('pricing_rules')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Apply filters
  if (filters?.rateType) {
    query = query.eq('rate_type', filters.rateType);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters?.vehicleId) {
    query = query.eq('vehicle_id', filters.vehicleId);
  }
  if (filters?.scope === 'category') {
    query = query.not('category_id', 'is', null);
  } else if (filters?.scope === 'vehicle') {
    query = query.not('vehicle_id', 'is', null);
  }

  // Apply sorting
  if (sort) {
    query = query.order(sort.field, { ascending: sort.direction === 'asc' });
  } else {
    query = query.order('rate_type').order('amount');
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error listing pricing rules:', error);
    return { data: [], count: 0 };
  }

  const rules = ((data || []) as unknown as PricingRuleRow[]).map(mapDbToPricingRule);

  // Fetch related data in bulk
  const categoryIds = [...new Set(rules.filter(r => r.categoryId).map(r => r.categoryId!))];
  const vehicleIds = [...new Set(rules.filter(r => r.vehicleId).map(r => r.vehicleId!))];

  const categoriesMap = new Map<string, { id: string; name: LocalizedString }>();
  const vehiclesMap = new Map<string, { id: string; make: string; model: string; year: number }>();

  if (categoryIds.length > 0) {
    const { data: categories } = await supabase
      .from('vehicle_categories')
      .select('id, name')
      .in('id', categoryIds);
    for (const cat of (categories || []) as unknown as Array<{ id: string; name: LocalizedString }>) {
      categoriesMap.set(cat.id, { id: cat.id, name: cat.name });
    }
  }

  if (vehicleIds.length > 0) {
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, make, model, year')
      .in('id', vehicleIds);
    for (const veh of (vehicles || []) as unknown as Array<{ id: string; make: string; model: string; year: number }>) {
      vehiclesMap.set(veh.id, veh);
    }
  }

  const rulesWithRelations: PricingRuleWithRelations[] = rules.map(rule => ({
    ...rule,
    category: rule.categoryId ? categoriesMap.get(rule.categoryId) : undefined,
    vehicle: rule.vehicleId ? vehiclesMap.get(rule.vehicleId) : undefined,
  }));

  return { data: rulesWithRelations, count: count || 0 };
}

/**
 * Get all pricing rules for a specific category
 */
export async function getPricingRulesForCategory(
  supabase: SupabaseClient<Database>,
  categoryId: string
): Promise<PricingRuleData[]> {
  const { data, error } = await supabase
    .from('pricing_rules')
    .select('*')
    .eq('category_id', categoryId)
    .eq('status', 'active')
    .order('rate_type');

  if (error) {
    console.error('Error fetching category pricing rules:', error);
    return [];
  }

  return ((data || []) as unknown as PricingRuleRow[]).map(mapDbToPricingRule);
}

/**
 * Get all pricing rules for a specific vehicle
 */
export async function getPricingRulesForVehicle(
  supabase: SupabaseClient<Database>,
  vehicleId: string
): Promise<PricingRuleData[]> {
  const { data, error } = await supabase
    .from('pricing_rules')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .eq('status', 'active')
    .order('rate_type');

  if (error) {
    console.error('Error fetching vehicle pricing rules:', error);
    return [];
  }

  return ((data || []) as unknown as PricingRuleRow[]).map(mapDbToPricingRule);
}

/**
 * Get the effective rate for a vehicle
 * Priority: Vehicle-specific > Category > Default
 */
export async function getEffectiveRate(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  categoryId: string,
  rateType: RateType = 'daily'
): Promise<EffectiveRate | null> {
  // First, try to find a vehicle-specific rate
  const { data: vehicleRateData } = await supabase
    .from('pricing_rules')
    .select('id, amount, rate_type, currency, min_duration, max_duration')
    .eq('vehicle_id', vehicleId)
    .eq('rate_type', rateType)
    .eq('status', 'active')
    .single();

  if (vehicleRateData) {
    const vehicleRate = vehicleRateData as unknown as RateRow;
    return {
      amount: vehicleRate.amount,
      rateType: vehicleRate.rate_type as RateType,
      currency: vehicleRate.currency,
      source: 'vehicle',
      sourceId: vehicleId,
      ruleId: vehicleRate.id,
      minDuration: vehicleRate.min_duration ?? undefined,
      maxDuration: vehicleRate.max_duration ?? undefined,
    };
  }

  // Fall back to category rate
  const { data: categoryRateData } = await supabase
    .from('pricing_rules')
    .select('id, amount, rate_type, currency, min_duration, max_duration')
    .eq('category_id', categoryId)
    .eq('rate_type', rateType)
    .eq('status', 'active')
    .single();

  if (categoryRateData) {
    const categoryRate = categoryRateData as unknown as RateRow;
    return {
      amount: categoryRate.amount,
      rateType: categoryRate.rate_type as RateType,
      currency: categoryRate.currency,
      source: 'category',
      sourceId: categoryId,
      ruleId: categoryRate.id,
      minDuration: categoryRate.min_duration ?? undefined,
      maxDuration: categoryRate.max_duration ?? undefined,
    };
  }

  return null;
}

/**
 * Get all available rates for a vehicle (hourly, daily, weekly, monthly)
 */
export async function getVehicleRates(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  categoryId: string
): Promise<VehicleRates | null> {
  // Get all vehicle-specific rates
  const { data: vehicleRatesData } = await supabase
    .from('pricing_rules')
    .select('id, rate_type, amount, currency, min_duration, max_duration')
    .eq('vehicle_id', vehicleId)
    .eq('status', 'active');

  // Get all category rates
  const { data: categoryRatesData } = await supabase
    .from('pricing_rules')
    .select('id, rate_type, amount, currency, min_duration, max_duration')
    .eq('category_id', categoryId)
    .eq('status', 'active');

  const vehicleRates = (vehicleRatesData || []) as unknown as RateRow[];
  const categoryRates = (categoryRatesData || []) as unknown as RateRow[];

  const vehicleRatesMap = new Map<RateType, RateRow>(
    vehicleRates.map((r) => [r.rate_type as RateType, r])
  );
  const categoryRatesMap = new Map<RateType, RateRow>(
    categoryRates.map((r) => [r.rate_type as RateType, r])
  );

  // Build effective rates with vehicle > category priority
  const buildRate = (type: RateType): EffectiveRate | undefined => {
    const vehicleRate = vehicleRatesMap.get(type);
    if (vehicleRate) {
      return {
        amount: vehicleRate.amount,
        rateType: type,
        currency: vehicleRate.currency,
        source: 'vehicle',
        sourceId: vehicleId,
        ruleId: vehicleRate.id,
        minDuration: vehicleRate.min_duration ?? undefined,
        maxDuration: vehicleRate.max_duration ?? undefined,
      };
    }

    const categoryRate = categoryRatesMap.get(type);
    if (categoryRate) {
      return {
        amount: categoryRate.amount,
        rateType: type,
        currency: categoryRate.currency,
        source: 'category',
        sourceId: categoryId,
        ruleId: categoryRate.id,
        minDuration: categoryRate.min_duration ?? undefined,
        maxDuration: categoryRate.max_duration ?? undefined,
      };
    }

    return undefined;
  };

  const dailyRate = buildRate('daily');

  // Daily rate is required
  if (!dailyRate) {
    return null;
  }

  return {
    vehicleId,
    categoryId,
    hourly: buildRate('hourly'),
    daily: dailyRate,
    weekly: buildRate('weekly'),
    monthly: buildRate('monthly'),
    currency: dailyRate.currency,
  };
}

/**
 * Get rates for multiple vehicles (for fleet display)
 */
export async function getVehicleRatesBulk(
  supabase: SupabaseClient<Database>,
  vehicles: Array<{ vehicleId: string; categoryId: string }>
): Promise<Map<string, VehicleRates>> {
  const vehicleIds = vehicles.map((v) => v.vehicleId);
  const categoryIds = [...new Set(vehicles.map((v) => v.categoryId))];

  // Fetch all vehicle-specific rates
  const { data: vehicleRatesData } = await supabase
    .from('pricing_rules')
    .select('id, vehicle_id, category_id, rate_type, amount, currency, min_duration, max_duration')
    .in('vehicle_id', vehicleIds)
    .eq('status', 'active');

  // Fetch all category rates
  const { data: categoryRatesData } = await supabase
    .from('pricing_rules')
    .select('id, vehicle_id, category_id, rate_type, amount, currency, min_duration, max_duration')
    .in('category_id', categoryIds)
    .eq('status', 'active');

  const vehicleRates = (vehicleRatesData || []) as unknown as RateRow[];
  const categoryRates = (categoryRatesData || []) as unknown as RateRow[];

  // Build maps for quick lookup
  const vehicleRatesMap = new Map<string, Map<RateType, RateRow>>();
  for (const rate of vehicleRates) {
    if (!rate.vehicle_id) continue;
    if (!vehicleRatesMap.has(rate.vehicle_id)) {
      vehicleRatesMap.set(rate.vehicle_id, new Map());
    }
    vehicleRatesMap.get(rate.vehicle_id)!.set(rate.rate_type as RateType, rate);
  }

  const categoryRatesMap = new Map<string, Map<RateType, RateRow>>();
  for (const rate of categoryRates) {
    if (!rate.category_id) continue;
    if (!categoryRatesMap.has(rate.category_id)) {
      categoryRatesMap.set(rate.category_id, new Map());
    }
    categoryRatesMap.get(rate.category_id)!.set(rate.rate_type as RateType, rate);
  }

  // Build result map
  const result = new Map<string, VehicleRates>();

  for (const { vehicleId, categoryId } of vehicles) {
    const vRates = vehicleRatesMap.get(vehicleId);
    const cRates = categoryRatesMap.get(categoryId);

    const buildRate = (type: RateType): EffectiveRate | undefined => {
      const vehicleRate = vRates?.get(type);
      if (vehicleRate) {
        return {
          amount: vehicleRate.amount,
          rateType: type,
          currency: vehicleRate.currency,
          source: 'vehicle',
          sourceId: vehicleId,
          ruleId: vehicleRate.id,
          minDuration: vehicleRate.min_duration ?? undefined,
          maxDuration: vehicleRate.max_duration ?? undefined,
        };
      }

      const categoryRate = cRates?.get(type);
      if (categoryRate) {
        return {
          amount: categoryRate.amount,
          rateType: type,
          currency: categoryRate.currency,
          source: 'category',
          sourceId: categoryId,
          ruleId: categoryRate.id,
          minDuration: categoryRate.min_duration ?? undefined,
          maxDuration: categoryRate.max_duration ?? undefined,
        };
      }

      return undefined;
    };

    const dailyRate = buildRate('daily');
    if (dailyRate) {
      result.set(vehicleId, {
        vehicleId,
        categoryId,
        hourly: buildRate('hourly'),
        daily: dailyRate,
        weekly: buildRate('weekly'),
        monthly: buildRate('monthly'),
        currency: dailyRate.currency,
      });
    }
  }

  return result;
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Create a new pricing rule
 */
export async function createPricingRule(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  input: CreatePricingRuleInput
): Promise<{ data: PricingRuleData | null; error: string | null }> {
  // Validate that either categoryId or vehicleId is provided
  if (!input.categoryId && !input.vehicleId) {
    return { data: null, error: 'Either categoryId or vehicleId must be provided' };
  }

  if (input.categoryId && input.vehicleId) {
    return { data: null, error: 'Cannot set both categoryId and vehicleId' };
  }

  // Check for existing rule with same type for the category/vehicle
  let existingQuery = supabase
    .from('pricing_rules')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('rate_type', input.rateType);

  if (input.categoryId) {
    existingQuery = existingQuery.eq('category_id', input.categoryId);
  } else if (input.vehicleId) {
    existingQuery = existingQuery.eq('vehicle_id', input.vehicleId);
  }

  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    return {
      data: null,
      error: `A ${input.rateType} rate already exists for this ${input.categoryId ? 'category' : 'vehicle'}`
    };
  }

  const insertData: PricingRuleInsert = {
    tenant_id: tenantId,
    category_id: input.categoryId ?? null,
    vehicle_id: input.vehicleId ?? null,
    rate_type: input.rateType,
    amount: input.amount,
    currency: input.currency ?? DEFAULT_CURRENCY,
    min_duration: input.minDuration ?? null,
    max_duration: input.maxDuration ?? null,
    status: input.status ?? 'active',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('pricing_rules')
    .insert(insertData)
    .select('*')
    .single();

  if (error) {
    console.error('Error creating pricing rule:', error);
    return { data: null, error: error.message };
  }

  return { data: mapDbToPricingRule(data as unknown as PricingRuleRow), error: null };
}

/**
 * Update an existing pricing rule
 */
export async function updatePricingRule(
  supabase: SupabaseClient<Database>,
  ruleId: string,
  input: UpdatePricingRuleInput
): Promise<{ data: PricingRuleData | null; error: string | null }> {
  // Note: categoryId and vehicleId cannot be changed after creation
  if (input.categoryId !== undefined || input.vehicleId !== undefined) {
    return { data: null, error: 'Cannot change category or vehicle assignment after creation' };
  }

  // Build update object with proper typing
  const updateData: PricingRuleUpdate = {};

  if (input.rateType !== undefined) updateData.rate_type = input.rateType;
  if (input.amount !== undefined) updateData.amount = input.amount;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.minDuration !== undefined) updateData.min_duration = input.minDuration;
  if (input.maxDuration !== undefined) updateData.max_duration = input.maxDuration;
  if (input.status !== undefined) updateData.status = input.status;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('pricing_rules')
    .update(updateData)
    .eq('id', ruleId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating pricing rule:', error);
    return { data: null, error: error.message };
  }

  return { data: mapDbToPricingRule(data as unknown as PricingRuleRow), error: null };
}

/**
 * Delete a pricing rule
 */
export async function deletePricingRule(
  supabase: SupabaseClient<Database>,
  ruleId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('pricing_rules')
    .delete()
    .eq('id', ruleId);

  if (error) {
    console.error('Error deleting pricing rule:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Set pricing rules for a category (bulk upsert)
 * This replaces all existing rates for the category
 */
export async function setCategoryRates(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  categoryId: string,
  rates: Array<{ rateType: RateType; amount: number; currency?: string }>
): Promise<{ success: boolean; error: string | null }> {
  // Delete existing category rates
  await supabase
    .from('pricing_rules')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('category_id', categoryId);

  // Insert new rates
  if (rates.length > 0) {
    const insertData: PricingRuleInsert[] = rates.map((rate) => ({
      tenant_id: tenantId,
      category_id: categoryId,
      vehicle_id: null,
      rate_type: rate.rateType,
      amount: rate.amount,
      currency: rate.currency ?? DEFAULT_CURRENCY,
      status: 'active',
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('pricing_rules')
      .insert(insertData);

    if (error) {
      console.error('Error setting category rates:', error);
      return { success: false, error: error.message };
    }
  }

  return { success: true, error: null };
}

/**
 * Set pricing rules for a vehicle (bulk upsert)
 * This replaces all existing vehicle-specific rates
 */
export async function setVehicleRates(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  vehicleId: string,
  rates: Array<{ rateType: RateType; amount: number; currency?: string }>
): Promise<{ success: boolean; error: string | null }> {
  // Delete existing vehicle-specific rates
  await supabase
    .from('pricing_rules')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('vehicle_id', vehicleId);

  // Insert new rates
  if (rates.length > 0) {
    const insertData: PricingRuleInsert[] = rates.map((rate) => ({
      tenant_id: tenantId,
      category_id: null,
      vehicle_id: vehicleId,
      rate_type: rate.rateType,
      amount: rate.amount,
      currency: rate.currency ?? DEFAULT_CURRENCY,
      status: 'active',
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('pricing_rules')
      .insert(insertData);

    if (error) {
      console.error('Error setting vehicle rates:', error);
      return { success: false, error: error.message };
    }
  }

  return { success: true, error: null };
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get pricing statistics for a tenant
 */
export async function getPricingStats(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<{
  totalRules: number;
  categoryRules: number;
  vehicleRules: number;
  activeRules: number;
  byRateType: Record<RateType, number>;
}> {
  const { data, error } = await supabase
    .from('pricing_rules')
    .select('id, category_id, vehicle_id, status, rate_type')
    .eq('tenant_id', tenantId);

  if (error || !data) {
    return {
      totalRules: 0,
      categoryRules: 0,
      vehicleRules: 0,
      activeRules: 0,
      byRateType: { hourly: 0, daily: 0, weekly: 0, monthly: 0 },
    };
  }

  const rows = data as unknown as Array<{
    id: string;
    category_id: string | null;
    vehicle_id: string | null;
    status: string;
    rate_type: string;
  }>;

  const stats = {
    totalRules: rows.length,
    categoryRules: 0,
    vehicleRules: 0,
    activeRules: 0,
    byRateType: { hourly: 0, daily: 0, weekly: 0, monthly: 0 } as Record<RateType, number>,
  };

  for (const rule of rows) {
    if (rule.category_id) stats.categoryRules++;
    if (rule.vehicle_id) stats.vehicleRules++;
    if (rule.status === 'active') stats.activeRules++;
    const rateType = rule.rate_type as RateType;
    if (rateType in stats.byRateType) {
      stats.byRateType[rateType]++;
    }
  }

  return stats;
}

/**
 * Get categories without pricing rules
 */
export async function getCategoriesWithoutPricing(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<Array<{ id: string; name: LocalizedString }>> {
  // Get all categories
  const { data: categories } = await supabase
    .from('vehicle_categories')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  if (!categories || categories.length === 0) {
    return [];
  }

  const categoryRows = categories as unknown as Array<{ id: string; name: LocalizedString }>;

  // Get categories that have at least one pricing rule
  const { data: rulesData } = await supabase
    .from('pricing_rules')
    .select('category_id')
    .eq('tenant_id', tenantId)
    .not('category_id', 'is', null);

  const rulesRows = (rulesData || []) as unknown as Array<{ category_id: string | null }>;

  const categoriesWithPricing = new Set(
    rulesRows.map((r) => r.category_id).filter((id): id is string => id !== null)
  );

  return categoryRows
    .filter((c) => !categoriesWithPricing.has(c.id))
    .map((c) => ({ id: c.id, name: c.name }));
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map database row to PricingRuleData type
 */
function mapDbToPricingRule(row: PricingRuleRow): PricingRuleData {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    categoryId: row.category_id,
    vehicleId: row.vehicle_id,
    rateType: row.rate_type as RateType,
    amount: row.amount,
    currency: row.currency,
    minDuration: row.min_duration,
    maxDuration: row.max_duration,
    status: row.status as RuleStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
