/**
 * Availability Blocks Management
 *
 * CRUD operations and queries for manual availability blocks.
 * Blocks are used to mark vehicles as unavailable for maintenance,
 * reservations, or other reasons.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import type {
  AvailabilityBlock,
  AvailabilityBlockInsert,
  AvailabilityBlockUpdate,
  AvailabilityBlockType,
  RecurrencePattern,
  CalendarBlock,
  CreateAvailabilityBlockInput,
  UpdateAvailabilityBlockInput,
} from './types';
import {
  createAvailabilityBlockSchema,
  updateAvailabilityBlockSchema,
  dateRangesOverlap,
  formatBlockType,
} from './types';

// ============================================================================
// DATABASE TYPES (matching migration)
// ============================================================================

interface DbAvailabilityBlock {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  block_type: string;
  start_at: string;
  end_at: string;
  reason: string | null;
  notes: string | null;
  created_by: string | null;
  recurrence: string;
  recurrence_end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get a single availability block by ID
 */
export async function getBlockById(
  supabase: SupabaseClient<Database>,
  blockId: string
): Promise<AvailabilityBlock | null> {
  const { data, error } = await supabase
    .from('availability_blocks')
    .select('*')
    .eq('id', blockId)
    .single();

  if (error || !data) {
    return null;
  }

  return mapDbBlockToBlock(data as unknown as DbAvailabilityBlock);
}

/**
 * Get all blocks for a vehicle
 */
export async function getVehicleBlocks(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  options: {
    activeOnly?: boolean;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}
): Promise<AvailabilityBlock[]> {
  const { activeOnly = true, startDate, endDate, limit } = options;

  let query = supabase
    .from('availability_blocks')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('start_at', { ascending: true });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  if (startDate) {
    query = query.gte('end_at', startDate);
  }

  if (endDate) {
    query = query.lte('start_at', endDate);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('Error fetching vehicle blocks:', error);
    return [];
  }

  return (data as unknown as DbAvailabilityBlock[]).map(mapDbBlockToBlock);
}

/**
 * Get all blocks for a tenant
 */
export async function getTenantBlocks(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  options: {
    vehicleId?: string;
    blockType?: AvailabilityBlockType;
    activeOnly?: boolean;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: AvailabilityBlock[]; count: number }> {
  const {
    vehicleId,
    blockType,
    activeOnly = true,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = options;

  let query = supabase
    .from('availability_blocks')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('start_at', { ascending: false });

  if (vehicleId) {
    query = query.eq('vehicle_id', vehicleId);
  }

  if (blockType) {
    query = query.eq('block_type', blockType);
  }

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  if (startDate) {
    query = query.gte('end_at', startDate);
  }

  if (endDate) {
    query = query.lte('start_at', endDate);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching tenant blocks:', error);
    return { data: [], count: 0 };
  }

  return {
    data: (data as unknown as DbAvailabilityBlock[]).map(mapDbBlockToBlock),
    count: count || 0,
  };
}

/**
 * Get blocks that conflict with a time range
 */
export async function getConflictingBlocks(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  startAt: string,
  endAt: string,
  excludeBlockId?: string
): Promise<AvailabilityBlock[]> {
  let query = supabase
    .from('availability_blocks')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .eq('is_active', true)
    .lt('start_at', endAt)
    .gt('end_at', startAt);

  if (excludeBlockId) {
    query = query.neq('id', excludeBlockId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return (data as unknown as DbAvailabilityBlock[]).map(mapDbBlockToBlock);
}

/**
 * Check if a vehicle has any blocks in a time range
 */
export async function hasActiveBlocks(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  startAt: string,
  endAt: string
): Promise<boolean> {
  const { count } = await supabase
    .from('availability_blocks')
    .select('*', { count: 'exact', head: true })
    .eq('vehicle_id', vehicleId)
    .eq('is_active', true)
    .lt('start_at', endAt)
    .gt('end_at', startAt);

  return (count || 0) > 0;
}

/**
 * Get blocks for calendar view
 */
export async function getBlocksForCalendar(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  startDate: string,
  endDate: string
): Promise<CalendarBlock[]> {
  const blocks = await getVehicleBlocks(supabase, vehicleId, {
    activeOnly: true,
    startDate: `${startDate}T00:00:00Z`,
    endDate: `${endDate}T23:59:59Z`,
  });

  return blocks.map((block) => ({
    id: block.id,
    vehicleId: block.vehicleId,
    type: block.blockType,
    startAt: block.startAt,
    endAt: block.endAt,
    reason: block.reason,
    isAllDay: isAllDayBlock(block.startAt, block.endAt),
  }));
}

/**
 * Get upcoming blocks for a vehicle
 */
export async function getUpcomingBlocks(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  limit: number = 5
): Promise<AvailabilityBlock[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('availability_blocks')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .eq('is_active', true)
    .gte('end_at', now)
    .order('start_at', { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return (data as unknown as DbAvailabilityBlock[]).map(mapDbBlockToBlock);
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Create a new availability block
 */
export async function createBlock(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  input: CreateAvailabilityBlockInput,
  createdBy?: string
): Promise<{ data: AvailabilityBlock | null; error: string | null }> {
  // Validate input
  const validation = createAvailabilityBlockSchema.safeParse(input);
  if (!validation.success) {
    return { data: null, error: validation.error.errors[0].message };
  }

  const validatedInput = validation.data;

  // Check for overlapping blocks
  const overlapping = await getConflictingBlocks(
    supabase,
    validatedInput.vehicleId,
    validatedInput.startAt,
    validatedInput.endAt
  );

  if (overlapping.length > 0) {
    return {
      data: null,
      error: `Vehicle already has ${overlapping.length} block(s) during this time period`,
    };
  }

  // Insert block
  const { data, error } = await supabase
    .from('availability_blocks')
    .insert({
      tenant_id: tenantId,
      vehicle_id: validatedInput.vehicleId,
      block_type: validatedInput.blockType,
      start_at: validatedInput.startAt,
      end_at: validatedInput.endAt,
      reason: validatedInput.reason || null,
      notes: validatedInput.notes || null,
      created_by: createdBy || null,
      recurrence: validatedInput.recurrence || 'none',
      recurrence_end_date: validatedInput.recurrenceEndDate || null,
      is_active: validatedInput.isActive ?? true,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating block:', error);
    return { data: null, error: error.message };
  }

  return {
    data: mapDbBlockToBlock(data as unknown as DbAvailabilityBlock),
    error: null,
  };
}

/**
 * Update an existing availability block
 */
export async function updateBlock(
  supabase: SupabaseClient<Database>,
  blockId: string,
  input: UpdateAvailabilityBlockInput
): Promise<{ data: AvailabilityBlock | null; error: string | null }> {
  // Validate input
  const validation = updateAvailabilityBlockSchema.safeParse(input);
  if (!validation.success) {
    return { data: null, error: validation.error.errors[0].message };
  }

  const validatedInput = validation.data;

  // Get existing block to check vehicle_id
  const existing = await getBlockById(supabase, blockId);
  if (!existing) {
    return { data: null, error: 'Block not found' };
  }

  // Check for overlapping blocks if dates are changing
  if (validatedInput.startAt || validatedInput.endAt) {
    const newStartAt = validatedInput.startAt || existing.startAt;
    const newEndAt = validatedInput.endAt || existing.endAt;

    const overlapping = await getConflictingBlocks(
      supabase,
      existing.vehicleId,
      newStartAt,
      newEndAt,
      blockId
    );

    if (overlapping.length > 0) {
      return {
        data: null,
        error: `Update would overlap with ${overlapping.length} existing block(s)`,
      };
    }
  }

  // Build update object
  const updates: Record<string, any> = {};
  if (validatedInput.blockType) updates.block_type = validatedInput.blockType;
  if (validatedInput.startAt) updates.start_at = validatedInput.startAt;
  if (validatedInput.endAt) updates.end_at = validatedInput.endAt;
  if (validatedInput.reason !== undefined) updates.reason = validatedInput.reason || null;
  if (validatedInput.notes !== undefined) updates.notes = validatedInput.notes || null;
  if (validatedInput.recurrence) updates.recurrence = validatedInput.recurrence;
  if (validatedInput.recurrenceEndDate !== undefined) {
    updates.recurrence_end_date = validatedInput.recurrenceEndDate || null;
  }
  if (validatedInput.isActive !== undefined) updates.is_active = validatedInput.isActive;

  const { data, error } = await supabase
    .from('availability_blocks')
    .update(updates)
    .eq('id', blockId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating block:', error);
    return { data: null, error: error.message };
  }

  return {
    data: mapDbBlockToBlock(data as unknown as DbAvailabilityBlock),
    error: null,
  };
}

/**
 * Deactivate a block (soft delete)
 */
export async function deactivateBlock(
  supabase: SupabaseClient<Database>,
  blockId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('availability_blocks')
    .update({ is_active: false })
    .eq('id', blockId);

  if (error) {
    console.error('Error deactivating block:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Reactivate a block
 */
export async function reactivateBlock(
  supabase: SupabaseClient<Database>,
  blockId: string
): Promise<{ data: AvailabilityBlock | null; error: string | null }> {
  // Get existing block
  const existing = await getBlockById(supabase, blockId);
  if (!existing) {
    return { data: null, error: 'Block not found' };
  }

  // Check for overlapping blocks
  const overlapping = await getConflictingBlocks(
    supabase,
    existing.vehicleId,
    existing.startAt,
    existing.endAt,
    blockId
  );

  if (overlapping.length > 0) {
    return {
      data: null,
      error: `Cannot reactivate: would overlap with ${overlapping.length} existing block(s)`,
    };
  }

  const { data, error } = await supabase
    .from('availability_blocks')
    .update({ is_active: true })
    .eq('id', blockId)
    .select('*')
    .single();

  if (error) {
    console.error('Error reactivating block:', error);
    return { data: null, error: error.message };
  }

  return {
    data: mapDbBlockToBlock(data as unknown as DbAvailabilityBlock),
    error: null,
  };
}

/**
 * Delete a block permanently
 */
export async function deleteBlock(
  supabase: SupabaseClient<Database>,
  blockId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('availability_blocks')
    .delete()
    .eq('id', blockId);

  if (error) {
    console.error('Error deleting block:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Bulk deactivate blocks
 */
export async function bulkDeactivateBlocks(
  supabase: SupabaseClient<Database>,
  blockIds: string[]
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('availability_blocks')
    .update({ is_active: false })
    .in('id', blockIds);

  if (error) {
    console.error('Error bulk deactivating blocks:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Delete all past blocks for cleanup
 */
export async function deleteExpiredBlocks(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  beforeDate: string
): Promise<{ deletedCount: number; error: string | null }> {
  const { data, error } = await supabase
    .from('availability_blocks')
    .delete()
    .eq('tenant_id', tenantId)
    .lt('end_at', beforeDate)
    .select('id');

  if (error) {
    console.error('Error deleting expired blocks:', error);
    return { deletedCount: 0, error: error.message };
  }

  return { deletedCount: data?.length || 0, error: null };
}

// ============================================================================
// QUICK BLOCK CREATION
// ============================================================================

/**
 * Create a maintenance block
 */
export async function createMaintenanceBlock(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  vehicleId: string,
  startAt: string,
  endAt: string,
  reason?: string,
  createdBy?: string
): Promise<{ data: AvailabilityBlock | null; error: string | null }> {
  return createBlock(supabase, tenantId, {
    vehicleId,
    blockType: 'maintenance',
    startAt,
    endAt,
    reason,
    isActive: true,
  }, createdBy);
}

/**
 * Create a reservation block (for VIP/specific customer)
 */
export async function createReservationBlock(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  vehicleId: string,
  startAt: string,
  endAt: string,
  reason?: string,
  createdBy?: string
): Promise<{ data: AvailabilityBlock | null; error: string | null }> {
  return createBlock(supabase, tenantId, {
    vehicleId,
    blockType: 'reserved',
    startAt,
    endAt,
    reason,
    isActive: true,
  }, createdBy);
}

/**
 * Create an all-day block
 */
export async function createAllDayBlock(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  vehicleId: string,
  date: string,
  blockType: AvailabilityBlockType,
  reason?: string,
  createdBy?: string
): Promise<{ data: AvailabilityBlock | null; error: string | null }> {
  const startAt = `${date}T00:00:00.000Z`;
  const endAt = `${date}T23:59:59.999Z`;

  return createBlock(supabase, tenantId, {
    vehicleId,
    blockType,
    startAt,
    endAt,
    reason,
    isActive: true,
  }, createdBy);
}

/**
 * Create a multi-day block
 */
export async function createMultiDayBlock(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  vehicleId: string,
  startDate: string,
  endDate: string,
  blockType: AvailabilityBlockType,
  reason?: string,
  createdBy?: string
): Promise<{ data: AvailabilityBlock | null; error: string | null }> {
  const startAt = `${startDate}T00:00:00.000Z`;
  const endAt = `${endDate}T23:59:59.999Z`;

  return createBlock(supabase, tenantId, {
    vehicleId,
    blockType,
    startAt,
    endAt,
    reason,
    isActive: true,
  }, createdBy);
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get block statistics for a tenant
 */
export async function getBlockStats(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<{
  totalBlocks: number;
  activeBlocks: number;
  blocksByType: Record<string, number>;
  upcomingBlocks: number;
}> {
  const now = new Date().toISOString();

  // Get all blocks
  const { data: blocks } = await supabase
    .from('availability_blocks')
    .select('block_type, is_active, start_at, end_at')
    .eq('tenant_id', tenantId);

  if (!blocks) {
    return {
      totalBlocks: 0,
      activeBlocks: 0,
      blocksByType: {},
      upcomingBlocks: 0,
    };
  }

  const totalBlocks = blocks.length;
  const activeBlocks = blocks.filter((b) => b.is_active).length;
  const upcomingBlocks = blocks.filter(
    (b) => b.is_active && new Date(b.start_at) > new Date(now)
  ).length;

  // Count by type
  const blocksByType: Record<string, number> = {};
  for (const block of blocks.filter((b) => b.is_active)) {
    blocksByType[block.block_type] = (blocksByType[block.block_type] || 0) + 1;
  }

  return {
    totalBlocks,
    activeBlocks,
    blocksByType,
    upcomingBlocks,
  };
}

/**
 * Get vehicle block summary
 */
export async function getVehicleBlockSummary(
  supabase: SupabaseClient<Database>,
  vehicleId: string
): Promise<{
  activeBlocks: number;
  upcomingBlocks: number;
  currentBlock: AvailabilityBlock | null;
  nextBlock: AvailabilityBlock | null;
}> {
  const now = new Date().toISOString();

  const { data: blocks } = await supabase
    .from('availability_blocks')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .eq('is_active', true)
    .gte('end_at', now)
    .order('start_at', { ascending: true });

  if (!blocks || blocks.length === 0) {
    return {
      activeBlocks: 0,
      upcomingBlocks: 0,
      currentBlock: null,
      nextBlock: null,
    };
  }

  const mappedBlocks = (blocks as unknown as DbAvailabilityBlock[]).map(mapDbBlockToBlock);
  const currentBlock = mappedBlocks.find(
    (b) => new Date(b.startAt) <= new Date(now) && new Date(b.endAt) > new Date(now)
  ) || null;
  const upcomingBlocks = mappedBlocks.filter(
    (b) => new Date(b.startAt) > new Date(now)
  );
  const nextBlock = upcomingBlocks[0] || null;

  return {
    activeBlocks: mappedBlocks.length,
    upcomingBlocks: upcomingBlocks.length,
    currentBlock,
    nextBlock,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Map database block to application block type
 */
function mapDbBlockToBlock(db: DbAvailabilityBlock): AvailabilityBlock {
  return {
    id: db.id,
    tenantId: db.tenant_id,
    vehicleId: db.vehicle_id,
    blockType: db.block_type as AvailabilityBlockType,
    startAt: db.start_at,
    endAt: db.end_at,
    reason: db.reason || undefined,
    notes: db.notes || undefined,
    createdBy: db.created_by || undefined,
    recurrence: db.recurrence as RecurrencePattern,
    recurrenceEndDate: db.recurrence_end_date || undefined,
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

/**
 * Check if a block spans entire days
 */
function isAllDayBlock(startAt: string, endAt: string): boolean {
  const start = new Date(startAt);
  const end = new Date(endAt);

  // Check if start is at 00:00 and end is at 23:59
  const startIsStartOfDay = start.getHours() === 0 && start.getMinutes() === 0;
  const endIsEndOfDay = end.getHours() === 23 && end.getMinutes() === 59;

  return startIsStartOfDay && endIsEndOfDay;
}

/**
 * Format block duration for display
 */
export function formatBlockDuration(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const diffMs = end.getTime() - start.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    if (remainingHours > 0) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}, ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
    }
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }

  if (diffHours > 0) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
}

/**
 * Get block status text
 */
export function getBlockStatus(block: AvailabilityBlock): 'active' | 'upcoming' | 'past' | 'inactive' {
  if (!block.isActive) {
    return 'inactive';
  }

  const now = new Date();
  const start = new Date(block.startAt);
  const end = new Date(block.endAt);

  if (now >= start && now < end) {
    return 'active';
  }

  if (now < start) {
    return 'upcoming';
  }

  return 'past';
}
