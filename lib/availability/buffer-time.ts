/**
 * Buffer Time Calculator
 *
 * Handles buffer time logic for vehicle availability.
 * Supports global tenant settings, per-category overrides, and per-vehicle overrides.
 *
 * Priority (highest to lowest):
 * 1. Vehicle-specific buffer time
 * 2. Category buffer time
 * 3. Tenant global buffer time
 * 4. System default (60 minutes)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import type {
  BufferTimeSettings,
  CategoryBufferTime,
  VehicleBufferTime,
  EffectiveBufferTime,
} from './types';
import { DEFAULT_BUFFER_MINUTES } from './types';

// ============================================================================
// BUFFER TIME RESOLUTION
// ============================================================================

/**
 * Get complete buffer time settings for a tenant
 * Includes global setting and all category/vehicle overrides
 */
export async function getTenantBufferTimeSettings(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<BufferTimeSettings> {
  // Get tenant global setting
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const globalBufferMinutes = tenant?.settings?.bufferTime ?? DEFAULT_BUFFER_MINUTES;

  // Get category overrides
  const { data: categories } = await supabase
    .from('vehicle_categories')
    .select('id, name, buffer_time_minutes')
    .eq('tenant_id', tenantId)
    .not('buffer_time_minutes', 'is', null);

  const categoryOverrides: CategoryBufferTime[] = (categories || []).map((cat) => ({
    categoryId: cat.id,
    categoryName: cat.name?.en || cat.name?.lt || 'Unknown',
    bufferMinutes: cat.buffer_time_minutes as number,
  }));

  // Get vehicle overrides
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, make, model, year, buffer_time_minutes')
    .eq('tenant_id', tenantId)
    .not('buffer_time_minutes', 'is', null);

  const vehicleOverrides: VehicleBufferTime[] = (vehicles || []).map((v) => ({
    vehicleId: v.id,
    vehicleName: `${v.year} ${v.make} ${v.model}`,
    bufferMinutes: v.buffer_time_minutes as number,
  }));

  return {
    globalBufferMinutes,
    categoryOverrides,
    vehicleOverrides,
  };
}

/**
 * Resolve effective buffer time for a specific vehicle
 * Uses the priority: Vehicle > Category > Global > Default
 */
export async function resolveVehicleBufferTime(
  supabase: SupabaseClient<Database>,
  vehicleId: string
): Promise<EffectiveBufferTime> {
  // Get vehicle with category and tenant info
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select(`
      id,
      tenant_id,
      category_id,
      buffer_time_minutes,
      category:vehicle_categories(id, buffer_time_minutes),
      tenant:tenants(id, settings)
    `)
    .eq('id', vehicleId)
    .single();

  if (!vehicle) {
    return {
      vehicleId,
      bufferMinutes: DEFAULT_BUFFER_MINUTES,
      source: 'global',
    };
  }

  // Priority 1: Vehicle-specific buffer time
  if (vehicle.buffer_time_minutes !== null) {
    return {
      vehicleId,
      bufferMinutes: vehicle.buffer_time_minutes,
      source: 'vehicle',
      sourceId: vehicleId,
    };
  }

  // Priority 2: Category buffer time
  const category = vehicle.category as any;
  if (category?.buffer_time_minutes !== null && category?.buffer_time_minutes !== undefined) {
    return {
      vehicleId,
      bufferMinutes: category.buffer_time_minutes,
      source: 'category',
      sourceId: vehicle.category_id,
    };
  }

  // Priority 3: Tenant global buffer time
  const tenant = vehicle.tenant as any;
  const tenantBuffer = tenant?.settings?.bufferTime;
  if (tenantBuffer !== null && tenantBuffer !== undefined) {
    return {
      vehicleId,
      bufferMinutes: tenantBuffer,
      source: 'global',
      sourceId: vehicle.tenant_id,
    };
  }

  // Priority 4: System default
  return {
    vehicleId,
    bufferMinutes: DEFAULT_BUFFER_MINUTES,
    source: 'global',
  };
}

/**
 * Resolve buffer times for multiple vehicles efficiently
 */
export async function resolveMultipleVehicleBufferTimes(
  supabase: SupabaseClient<Database>,
  vehicleIds: string[]
): Promise<Map<string, EffectiveBufferTime>> {
  const results = new Map<string, EffectiveBufferTime>();

  if (vehicleIds.length === 0) {
    return results;
  }

  // Batch fetch all vehicles with their categories
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select(`
      id,
      tenant_id,
      category_id,
      buffer_time_minutes,
      category:vehicle_categories(id, buffer_time_minutes)
    `)
    .in('id', vehicleIds);

  if (!vehicles || vehicles.length === 0) {
    // Return defaults for all
    vehicleIds.forEach((id) => {
      results.set(id, {
        vehicleId: id,
        bufferMinutes: DEFAULT_BUFFER_MINUTES,
        source: 'global',
      });
    });
    return results;
  }

  // Get tenant IDs for batch fetching settings
  const tenantIds = [...new Set(vehicles.map((v) => v.tenant_id))];

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, settings')
    .in('id', tenantIds);

  const tenantSettings = new Map(tenants?.map((t) => [t.id, t.settings]) || []);

  // Resolve buffer time for each vehicle
  for (const vehicle of vehicles) {
    const category = vehicle.category as any;
    const tenantBuffer = tenantSettings.get(vehicle.tenant_id)?.bufferTime;

    let effectiveBuffer: EffectiveBufferTime;

    // Priority 1: Vehicle-specific
    if (vehicle.buffer_time_minutes !== null) {
      effectiveBuffer = {
        vehicleId: vehicle.id,
        bufferMinutes: vehicle.buffer_time_minutes,
        source: 'vehicle',
        sourceId: vehicle.id,
      };
    }
    // Priority 2: Category
    else if (category?.buffer_time_minutes !== null && category?.buffer_time_minutes !== undefined) {
      effectiveBuffer = {
        vehicleId: vehicle.id,
        bufferMinutes: category.buffer_time_minutes,
        source: 'category',
        sourceId: vehicle.category_id,
      };
    }
    // Priority 3: Tenant global
    else if (tenantBuffer !== null && tenantBuffer !== undefined) {
      effectiveBuffer = {
        vehicleId: vehicle.id,
        bufferMinutes: tenantBuffer,
        source: 'global',
        sourceId: vehicle.tenant_id,
      };
    }
    // Priority 4: System default
    else {
      effectiveBuffer = {
        vehicleId: vehicle.id,
        bufferMinutes: DEFAULT_BUFFER_MINUTES,
        source: 'global',
      };
    }

    results.set(vehicle.id, effectiveBuffer);
  }

  // Add defaults for any missing vehicles
  vehicleIds.forEach((id) => {
    if (!results.has(id)) {
      results.set(id, {
        vehicleId: id,
        bufferMinutes: DEFAULT_BUFFER_MINUTES,
        source: 'global',
      });
    }
  });

  return results;
}

// ============================================================================
// BUFFER TIME MANAGEMENT
// ============================================================================

/**
 * Update global buffer time for a tenant
 */
export async function updateTenantBufferTime(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  bufferMinutes: number
): Promise<{ success: boolean; error?: string }> {
  if (bufferMinutes < 0 || bufferMinutes > 1440) {
    return { success: false, error: 'Buffer time must be between 0 and 1440 minutes (24 hours)' };
  }

  const { data: tenant, error: fetchError } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  const updatedSettings = {
    ...(tenant?.settings || {}),
    bufferTime: bufferMinutes,
  };

  const { error: updateError } = await supabase
    .from('tenants')
    .update({ settings: updatedSettings })
    .eq('id', tenantId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

/**
 * Update buffer time for a category
 */
export async function updateCategoryBufferTime(
  supabase: SupabaseClient<Database>,
  categoryId: string,
  bufferMinutes: number | null
): Promise<{ success: boolean; error?: string }> {
  if (bufferMinutes !== null && (bufferMinutes < 0 || bufferMinutes > 1440)) {
    return { success: false, error: 'Buffer time must be between 0 and 1440 minutes (24 hours)' };
  }

  const { error } = await supabase
    .from('vehicle_categories')
    .update({ buffer_time_minutes: bufferMinutes })
    .eq('id', categoryId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update buffer time for a vehicle
 */
export async function updateVehicleBufferTime(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  bufferMinutes: number | null
): Promise<{ success: boolean; error?: string }> {
  if (bufferMinutes !== null && (bufferMinutes < 0 || bufferMinutes > 1440)) {
    return { success: false, error: 'Buffer time must be between 0 and 1440 minutes (24 hours)' };
  }

  const { error } = await supabase
    .from('vehicles')
    .update({ buffer_time_minutes: bufferMinutes })
    .eq('id', vehicleId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Clear category buffer time override (use global setting)
 */
export async function clearCategoryBufferTime(
  supabase: SupabaseClient<Database>,
  categoryId: string
): Promise<{ success: boolean; error?: string }> {
  return updateCategoryBufferTime(supabase, categoryId, null);
}

/**
 * Clear vehicle buffer time override (use category/global setting)
 */
export async function clearVehicleBufferTime(
  supabase: SupabaseClient<Database>,
  vehicleId: string
): Promise<{ success: boolean; error?: string }> {
  return updateVehicleBufferTime(supabase, vehicleId, null);
}

// ============================================================================
// BUFFER TIME CALCULATION UTILITIES
// ============================================================================

/**
 * Calculate buffered pickup time (subtract buffer from requested time)
 */
export function calculateBufferedPickupTime(
  pickupAt: Date | string,
  bufferMinutes: number
): Date {
  const date = new Date(pickupAt);
  date.setMinutes(date.getMinutes() - bufferMinutes);
  return date;
}

/**
 * Calculate buffered return time (add buffer to requested time)
 */
export function calculateBufferedReturnTime(
  returnAt: Date | string,
  bufferMinutes: number
): Date {
  const date = new Date(returnAt);
  date.setMinutes(date.getMinutes() + bufferMinutes);
  return date;
}

/**
 * Get the buffered time range for an availability check
 */
export function getBufferedTimeRange(
  pickupAt: Date | string,
  returnAt: Date | string,
  bufferMinutes: number
): { bufferedPickupAt: Date; bufferedReturnAt: Date } {
  return {
    bufferedPickupAt: calculateBufferedPickupTime(pickupAt, bufferMinutes),
    bufferedReturnAt: calculateBufferedReturnTime(returnAt, bufferMinutes),
  };
}

/**
 * Check if a proposed booking conflicts with an existing booking considering buffer time
 */
export function hasBufferConflict(
  proposedPickup: Date | string,
  proposedReturn: Date | string,
  existingPickup: Date | string,
  existingReturn: Date | string,
  bufferMinutes: number
): { hasConflict: boolean; isBufferConflict: boolean; isDirectConflict: boolean } {
  const pPickup = new Date(proposedPickup);
  const pReturn = new Date(proposedReturn);
  const ePickup = new Date(existingPickup);
  const eReturn = new Date(existingReturn);

  // Check direct overlap (without buffer)
  const isDirectConflict = pPickup < eReturn && pReturn > ePickup;

  // Check with buffer
  const bufferedPickup = calculateBufferedPickupTime(pPickup, bufferMinutes);
  const bufferedReturn = calculateBufferedReturnTime(pReturn, bufferMinutes);

  const hasConflict = bufferedPickup < eReturn && bufferedReturn > ePickup;
  const isBufferConflict = hasConflict && !isDirectConflict;

  return {
    hasConflict,
    isBufferConflict,
    isDirectConflict,
  };
}

/**
 * Format buffer time for display
 */
export function formatBufferTime(minutes: number): string {
  if (minutes === 0) {
    return 'No buffer';
  }

  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Get buffer time description for display
 */
export function getBufferTimeDescription(effectiveBuffer: EffectiveBufferTime): string {
  const formattedTime = formatBufferTime(effectiveBuffer.bufferMinutes);

  switch (effectiveBuffer.source) {
    case 'vehicle':
      return `${formattedTime} (vehicle-specific)`;
    case 'category':
      return `${formattedTime} (category setting)`;
    case 'global':
      return `${formattedTime} (global setting)`;
    default:
      return formattedTime;
  }
}

// ============================================================================
// COMMON BUFFER TIME PRESETS
// ============================================================================

/**
 * Common buffer time presets for quick selection
 */
export const BUFFER_TIME_PRESETS = [
  { value: 0, label: 'No buffer', description: 'Back-to-back bookings allowed' },
  { value: 30, label: '30 minutes', description: 'Quick turnaround' },
  { value: 60, label: '1 hour', description: 'Standard buffer (recommended)' },
  { value: 120, label: '2 hours', description: 'Extended preparation time' },
  { value: 180, label: '3 hours', description: 'Long preparation time' },
  { value: 240, label: '4 hours', description: 'Half-day buffer' },
  { value: 480, label: '8 hours', description: 'Full day buffer' },
  { value: 1440, label: '24 hours', description: 'Full day between bookings' },
] as const;

/**
 * Validate buffer time value
 */
export function isValidBufferTime(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= 0 && minutes <= 1440;
}
