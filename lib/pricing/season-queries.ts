/**
 * Season Database Queries
 *
 * Server-side queries for fetching and managing seasonal pricing rules.
 * All operations are tenant-scoped through RLS policies.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import type {
  SeasonData,
  CreateSeasonInput,
  UpdateSeasonInput,
  ActiveSeason,
  SeasonOverlap,
  RuleStatus,
} from './types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Filters for listing seasons
 */
export interface SeasonFilters {
  /** Filter by status */
  status?: RuleStatus;
  /** Filter by date (seasons active on this date) */
  activeOn?: string;
  /** Filter seasons starting after this date */
  startAfter?: string;
  /** Filter seasons ending before this date */
  endBefore?: string;
}

/**
 * Sort options for seasons
 */
export interface SeasonSort {
  field: 'name' | 'start_date' | 'end_date' | 'multiplier' | 'priority' | 'created_at';
  direction: 'asc' | 'desc';
}

// Raw database row type for internal use
interface SeasonRow {
  id: string;
  tenant_id: string;
  name: string;
  start_date: string;
  end_date: string;
  multiplier: number;
  priority: number;
  status: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get a single season by ID
 */
export async function getSeasonById(
  supabase: SupabaseClient<Database>,
  seasonId: string
): Promise<SeasonData | null> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('id', seasonId)
    .single();

  if (error || !data) {
    return null;
  }

  return mapDbToSeason(data as unknown as SeasonRow);
}

/**
 * List all seasons for a tenant with filters and sorting
 */
export async function listSeasons(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  options: {
    filters?: SeasonFilters;
    sort?: SeasonSort;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: SeasonData[]; count: number }> {
  const { filters, sort, limit = 100, offset = 0 } = options;

  let query = supabase
    .from('seasons')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.activeOn) {
    query = query.lte('start_date', filters.activeOn).gte('end_date', filters.activeOn);
  }
  if (filters?.startAfter) {
    query = query.gte('start_date', filters.startAfter);
  }
  if (filters?.endBefore) {
    query = query.lte('end_date', filters.endBefore);
  }

  // Apply sorting
  if (sort) {
    query = query.order(sort.field, { ascending: sort.direction === 'asc' });
  } else {
    query = query.order('start_date', { ascending: true });
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error listing seasons:', error);
    return { data: [], count: 0 };
  }

  const seasons = ((data || []) as unknown as SeasonRow[]).map(mapDbToSeason);

  return { data: seasons, count: count || 0 };
}

/**
 * Get active seasons for a date range
 */
export async function getActiveSeasonsForDateRange(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<SeasonData[]> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .lte('start_date', endDate)
    .gte('end_date', startDate)
    .order('priority', { ascending: false });

  if (error) {
    console.error('Error fetching active seasons:', error);
    return [];
  }

  return ((data || []) as unknown as SeasonRow[]).map(mapDbToSeason);
}

/**
 * Get the season multiplier for a specific date
 */
export async function getSeasonMultiplierForDate(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  date: string
): Promise<number> {
  const { data, error } = await supabase
    .from('seasons')
    .select('multiplier')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .lte('start_date', date)
    .gte('end_date', date)
    .order('priority', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return 1.0; // Default: no multiplier
  }

  return (data as { multiplier: number }).multiplier;
}

/**
 * Calculate season overlap analysis for a rental period
 */
export async function calculateSeasonOverlap(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  rentalStart: string,
  rentalEnd: string,
  basePrice: number
): Promise<SeasonOverlap> {
  const seasons = await getActiveSeasonsForDateRange(supabase, tenantId, rentalStart, rentalEnd);

  const start = new Date(rentalStart);
  const end = new Date(rentalEnd);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (seasons.length === 0) {
    return {
      rentalStart,
      rentalEnd,
      totalDays,
      seasons: [],
      averageMultiplier: 1.0,
      seasonalAmount: 0,
    };
  }

  // Calculate applicable days for each season
  const activeSeasons: ActiveSeason[] = [];
  let totalWeightedMultiplier = 0;
  let daysWithSeason = 0;

  for (const season of seasons) {
    const seasonStart = new Date(season.startDate);
    const seasonEnd = new Date(season.endDate);

    // Calculate overlap
    const overlapStart = new Date(Math.max(start.getTime(), seasonStart.getTime()));
    const overlapEnd = new Date(Math.min(end.getTime(), seasonEnd.getTime()));

    if (overlapStart <= overlapEnd) {
      const applicableDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      activeSeasons.push({
        id: season.id,
        name: season.name,
        multiplier: season.multiplier,
        applicableDays,
        startDate: season.startDate,
        endDate: season.endDate,
      });

      totalWeightedMultiplier += season.multiplier * applicableDays;
      daysWithSeason += applicableDays;
    }
  }

  // Calculate average multiplier (weighted by days)
  // Days without any season get multiplier of 1.0
  const daysWithoutSeason = totalDays - daysWithSeason;
  const averageMultiplier = (totalWeightedMultiplier + daysWithoutSeason) / totalDays;

  // Calculate seasonal amount (difference from base price)
  const seasonalAmount = Math.round((basePrice * averageMultiplier - basePrice) * 100) / 100;

  return {
    rentalStart,
    rentalEnd,
    totalDays,
    seasons: activeSeasons,
    averageMultiplier: Math.round(averageMultiplier * 100) / 100,
    seasonalAmount,
  };
}

/**
 * Check for overlapping seasons (for validation)
 */
export async function checkSeasonOverlap(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  startDate: string,
  endDate: string,
  excludeSeasonId?: string
): Promise<SeasonData[]> {
  let query = supabase
    .from('seasons')
    .select('*')
    .eq('tenant_id', tenantId)
    .lte('start_date', endDate)
    .gte('end_date', startDate);

  if (excludeSeasonId) {
    query = query.neq('id', excludeSeasonId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error checking season overlap:', error);
    return [];
  }

  return ((data || []) as unknown as SeasonRow[]).map(mapDbToSeason);
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Create a new season
 */
export async function createSeason(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  input: CreateSeasonInput
): Promise<{ data: SeasonData | null; error: string | null }> {
  // Validate dates
  if (new Date(input.startDate) > new Date(input.endDate)) {
    return { data: null, error: 'End date must be on or after start date' };
  }

  // Validate multiplier
  if (input.multiplier <= 0 || input.multiplier > 10) {
    return { data: null, error: 'Multiplier must be between 0 and 10' };
  }

  const insertData = {
    tenant_id: tenantId,
    name: input.name,
    start_date: input.startDate,
    end_date: input.endDate,
    multiplier: input.multiplier,
    priority: input.priority ?? 0,
    status: input.status ?? 'active',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('seasons')
    .insert(insertData)
    .select('*')
    .single();

  if (error) {
    console.error('Error creating season:', error);
    return { data: null, error: error.message };
  }

  return { data: mapDbToSeason(data as unknown as SeasonRow), error: null };
}

/**
 * Update an existing season
 */
export async function updateSeason(
  supabase: SupabaseClient<Database>,
  seasonId: string,
  input: UpdateSeasonInput
): Promise<{ data: SeasonData | null; error: string | null }> {
  // Build update object
  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.startDate !== undefined) updateData.start_date = input.startDate;
  if (input.endDate !== undefined) updateData.end_date = input.endDate;
  if (input.multiplier !== undefined) {
    if (input.multiplier <= 0 || input.multiplier > 10) {
      return { data: null, error: 'Multiplier must be between 0 and 10' };
    }
    updateData.multiplier = input.multiplier;
  }
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.status !== undefined) updateData.status = input.status;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('seasons')
    .update(updateData)
    .eq('id', seasonId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating season:', error);
    return { data: null, error: error.message };
  }

  return { data: mapDbToSeason(data as unknown as SeasonRow), error: null };
}

/**
 * Delete a season
 */
export async function deleteSeason(
  supabase: SupabaseClient<Database>,
  seasonId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('seasons')
    .delete()
    .eq('id', seasonId);

  if (error) {
    console.error('Error deleting season:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get season statistics for a tenant
 */
export async function getSeasonStats(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<{
  totalSeasons: number;
  activeSeasons: number;
  currentlyActive: number;
  upcomingSeasons: number;
  averageMultiplier: number;
}> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('seasons')
    .select('id, status, start_date, end_date, multiplier')
    .eq('tenant_id', tenantId);

  if (error || !data) {
    return {
      totalSeasons: 0,
      activeSeasons: 0,
      currentlyActive: 0,
      upcomingSeasons: 0,
      averageMultiplier: 1.0,
    };
  }

  const rows = data as unknown as Array<{
    id: string;
    status: string;
    start_date: string;
    end_date: string;
    multiplier: number;
  }>;

  let activeCount = 0;
  let currentlyActiveCount = 0;
  let upcomingCount = 0;
  let totalMultiplier = 0;
  let multiplierCount = 0;

  for (const season of rows) {
    if (season.status === 'active') {
      activeCount++;
      totalMultiplier += season.multiplier;
      multiplierCount++;

      if (season.start_date <= today && season.end_date >= today) {
        currentlyActiveCount++;
      } else if (season.start_date > today) {
        upcomingCount++;
      }
    }
  }

  return {
    totalSeasons: rows.length,
    activeSeasons: activeCount,
    currentlyActive: currentlyActiveCount,
    upcomingSeasons: upcomingCount,
    averageMultiplier: multiplierCount > 0
      ? Math.round((totalMultiplier / multiplierCount) * 100) / 100
      : 1.0,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map database row to SeasonData type
 */
function mapDbToSeason(row: SeasonRow): SeasonData {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    multiplier: row.multiplier,
    priority: row.priority,
    status: row.status as RuleStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Format multiplier for display
 */
export function formatMultiplier(multiplier: number): string {
  if (multiplier === 1) {
    return 'No change';
  } else if (multiplier > 1) {
    const increase = Math.round((multiplier - 1) * 100);
    return `+${increase}%`;
  } else {
    const decrease = Math.round((1 - multiplier) * 100);
    return `-${decrease}%`;
  }
}

/**
 * Get season status based on dates
 */
export function getSeasonStatus(startDate: string, endDate: string): 'upcoming' | 'active' | 'past' {
  const today = new Date().toISOString().split('T')[0];

  if (startDate > today) {
    return 'upcoming';
  } else if (endDate < today) {
    return 'past';
  } else {
    return 'active';
  }
}
