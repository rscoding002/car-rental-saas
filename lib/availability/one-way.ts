/**
 * One-Way Rental Availability
 *
 * Handles availability logic for one-way rentals where pickup and return
 * branches are different. This affects both branches' operations.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Branch, OperatingHours } from '@/lib/supabase/types';
import type { OneWayAvailability, AvailabilityResult } from './types';
import { isOneWayRental } from './types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * One-way rental configuration for a tenant
 */
export interface OneWayConfig {
  /** Whether one-way rentals are enabled */
  enabled: boolean;
  /** Branches that can accept one-way returns */
  acceptingBranches: string[];
  /** Fee structure */
  feeStructure: OneWayFeeStructure;
}

/**
 * One-way fee structure
 */
export interface OneWayFeeStructure {
  /** Fee calculation type */
  type: 'flat' | 'distance' | 'zone';
  /** Flat fee amount (if type is 'flat') */
  flatFee?: number;
  /** Fee per kilometer (if type is 'distance') */
  perKmFee?: number;
  /** Zone-based fees (if type is 'zone') */
  zoneFees?: OneWayZoneFee[];
  /** Currency code */
  currency: string;
}

/**
 * Zone-based one-way fee
 */
export interface OneWayZoneFee {
  /** From branch ID or zone */
  fromBranchId?: string;
  fromZone?: string;
  /** To branch ID or zone */
  toBranchId?: string;
  toZone?: string;
  /** Fee amount */
  fee: number;
}

/**
 * One-way route information
 */
export interface OneWayRoute {
  pickupBranchId: string;
  pickupBranchName: string;
  pickupCity: string;
  returnBranchId: string;
  returnBranchName: string;
  returnCity: string;
  distanceKm?: number;
  fee: number;
  currency: string;
  isSupported: boolean;
  reason?: string;
}

/**
 * Branch pair for one-way availability
 */
export interface BranchPair {
  pickup: Branch;
  return: Branch;
}

// ============================================================================
// ONE-WAY AVAILABILITY CHECKS
// ============================================================================

/**
 * Check if one-way rental is available between two branches
 */
export async function checkOneWayAvailability(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  pickupBranchId: string,
  returnBranchId: string,
  pickupAt: string,
  returnAt: string
): Promise<OneWayAvailability> {
  // If same branch, not a one-way rental
  if (!isOneWayRental(pickupBranchId, returnBranchId)) {
    return {
      isAvailable: true,
      pickupBranchId,
      returnBranchId: pickupBranchId,
      oneWayFee: 0,
      currency: 'EUR',
    };
  }

  // Get vehicle info to verify it belongs to pickup branch
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('id, tenant_id, branch_id, status')
    .eq('id', vehicleId)
    .single();

  if (!vehicle) {
    return {
      isAvailable: false,
      pickupBranchId,
      returnBranchId,
      unavailableReason: 'Vehicle not found',
    };
  }

  // Check if vehicle is at the pickup branch
  if (vehicle.branch_id !== pickupBranchId) {
    return {
      isAvailable: false,
      pickupBranchId,
      returnBranchId,
      unavailableReason: 'Vehicle is not available at the selected pickup location',
    };
  }

  // Get both branches
  const { data: branches } = await supabase
    .from('branches')
    .select('*')
    .in('id', [pickupBranchId, returnBranchId]);

  if (!branches || branches.length !== 2) {
    return {
      isAvailable: false,
      pickupBranchId,
      returnBranchId,
      unavailableReason: 'One or both branches not found',
    };
  }

  const pickupBranch = branches.find((b) => b.id === pickupBranchId);
  const returnBranch = branches.find((b) => b.id === returnBranchId);

  if (!pickupBranch || !returnBranch) {
    return {
      isAvailable: false,
      pickupBranchId,
      returnBranchId,
      unavailableReason: 'Branch configuration error',
    };
  }

  // Check branch statuses
  if (pickupBranch.status !== 'active') {
    return {
      isAvailable: false,
      pickupBranchId,
      pickupBranchName: pickupBranch.name,
      returnBranchId,
      returnBranchName: returnBranch.name,
      unavailableReason: 'Pickup location is currently unavailable',
    };
  }

  if (returnBranch.status !== 'active') {
    return {
      isAvailable: false,
      pickupBranchId,
      pickupBranchName: pickupBranch.name,
      returnBranchId,
      returnBranchName: returnBranch.name,
      unavailableReason: 'Return location is currently unavailable',
    };
  }

  // Check operating hours at pickup time
  const pickupDate = new Date(pickupAt);
  if (!isBranchOpenAt(pickupBranch.operating_hours, pickupDate)) {
    return {
      isAvailable: false,
      pickupBranchId,
      pickupBranchName: pickupBranch.name,
      returnBranchId,
      returnBranchName: returnBranch.name,
      unavailableReason: 'Pickup location is closed at the selected time',
    };
  }

  // Check operating hours at return time
  const returnDate = new Date(returnAt);
  if (!isBranchOpenAt(returnBranch.operating_hours, returnDate)) {
    return {
      isAvailable: false,
      pickupBranchId,
      pickupBranchName: pickupBranch.name,
      returnBranchId,
      returnBranchName: returnBranch.name,
      unavailableReason: 'Return location is closed at the selected time',
    };
  }

  // Get tenant settings to check one-way configuration and fees
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', vehicle.tenant_id)
    .single();

  // Calculate one-way fee
  const oneWayFee = await calculateOneWayFee(
    supabase,
    vehicle.tenant_id,
    pickupBranch,
    returnBranch
  );

  return {
    isAvailable: true,
    pickupBranchId,
    pickupBranchName: pickupBranch.name,
    returnBranchId,
    returnBranchName: returnBranch.name,
    oneWayFee: oneWayFee.fee,
    currency: oneWayFee.currency,
  };
}

/**
 * Get all valid one-way routes from a pickup branch
 */
export async function getOneWayRoutes(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  pickupBranchId: string
): Promise<OneWayRoute[]> {
  // Get all active branches
  const { data: branches } = await supabase
    .from('branches')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('sort_order')
    .order('name');

  if (!branches || branches.length === 0) {
    return [];
  }

  const pickupBranch = branches.find((b) => b.id === pickupBranchId);
  if (!pickupBranch) {
    return [];
  }

  const routes: OneWayRoute[] = [];

  for (const returnBranch of branches) {
    // Skip same branch
    if (returnBranch.id === pickupBranchId) {
      continue;
    }

    // Calculate fee for this route
    const feeInfo = await calculateOneWayFee(
      supabase,
      tenantId,
      pickupBranch,
      returnBranch
    );

    // Calculate distance if coordinates available
    let distanceKm: number | undefined;
    if (
      pickupBranch.latitude &&
      pickupBranch.longitude &&
      returnBranch.latitude &&
      returnBranch.longitude
    ) {
      distanceKm = calculateDistance(
        pickupBranch.latitude,
        pickupBranch.longitude,
        returnBranch.latitude,
        returnBranch.longitude
      );
    }

    routes.push({
      pickupBranchId: pickupBranch.id,
      pickupBranchName: pickupBranch.name,
      pickupCity: pickupBranch.city,
      returnBranchId: returnBranch.id,
      returnBranchName: returnBranch.name,
      returnCity: returnBranch.city,
      distanceKm,
      fee: feeInfo.fee,
      currency: feeInfo.currency,
      isSupported: true,
    });
  }

  return routes;
}

/**
 * Get available return branches for one-way rental
 */
export async function getAvailableReturnBranches(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  pickupBranchId: string,
  returnAt: string
): Promise<Array<Branch & { oneWayFee: number; currency: string }>> {
  // Get all active branches except pickup
  const { data: branches } = await supabase
    .from('branches')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .neq('id', pickupBranchId)
    .order('sort_order')
    .order('name');

  if (!branches || branches.length === 0) {
    return [];
  }

  // Get pickup branch for fee calculation
  const { data: pickupBranch } = await supabase
    .from('branches')
    .select('*')
    .eq('id', pickupBranchId)
    .single();

  if (!pickupBranch) {
    return [];
  }

  const returnDate = new Date(returnAt);
  const result: Array<Branch & { oneWayFee: number; currency: string }> = [];

  for (const branch of branches) {
    // Check if branch is open at return time
    if (!isBranchOpenAt(branch.operating_hours, returnDate)) {
      continue;
    }

    // Calculate fee
    const feeInfo = await calculateOneWayFee(supabase, tenantId, pickupBranch, branch);

    result.push({
      ...branch,
      oneWayFee: feeInfo.fee,
      currency: feeInfo.currency,
    });
  }

  return result;
}

// ============================================================================
// ONE-WAY FEE CALCULATION
// ============================================================================

/**
 * Calculate one-way fee between two branches
 */
export async function calculateOneWayFee(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  pickupBranch: Branch,
  returnBranch: Branch
): Promise<{ fee: number; currency: string; feeType: string }> {
  // Get tenant settings for one-way fee configuration
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const currency = tenant?.settings?.currency || 'EUR';
  const oneWaySettings = (tenant?.settings as any)?.oneWayFees;

  // If no one-way settings configured, use default calculation
  if (!oneWaySettings) {
    return calculateDefaultOneWayFee(pickupBranch, returnBranch, currency);
  }

  // Handle different fee structures
  switch (oneWaySettings.type) {
    case 'flat':
      return {
        fee: oneWaySettings.flatFee || 0,
        currency,
        feeType: 'flat',
      };

    case 'distance':
      return calculateDistanceBasedFee(
        pickupBranch,
        returnBranch,
        oneWaySettings.perKmFee || 0,
        oneWaySettings.minFee || 0,
        oneWaySettings.maxFee,
        currency
      );

    case 'zone':
      return calculateZoneBasedFee(
        pickupBranch,
        returnBranch,
        oneWaySettings.zoneFees || [],
        oneWaySettings.defaultFee || 0,
        currency
      );

    default:
      return calculateDefaultOneWayFee(pickupBranch, returnBranch, currency);
  }
}

/**
 * Calculate default one-way fee based on distance
 */
function calculateDefaultOneWayFee(
  pickupBranch: Branch,
  returnBranch: Branch,
  currency: string
): { fee: number; currency: string; feeType: string } {
  // If same city, lower fee
  if (pickupBranch.city.toLowerCase() === returnBranch.city.toLowerCase()) {
    return { fee: 15, currency, feeType: 'same_city' };
  }

  // If coordinates available, calculate based on distance
  if (
    pickupBranch.latitude &&
    pickupBranch.longitude &&
    returnBranch.latitude &&
    returnBranch.longitude
  ) {
    const distanceKm = calculateDistance(
      pickupBranch.latitude,
      pickupBranch.longitude,
      returnBranch.latitude,
      returnBranch.longitude
    );

    // €0.50 per km, min €20, max €200
    const fee = Math.min(200, Math.max(20, Math.round(distanceKm * 0.5)));
    return { fee, currency, feeType: 'distance' };
  }

  // Default flat fee for different cities
  return { fee: 50, currency, feeType: 'default' };
}

/**
 * Calculate distance-based one-way fee
 */
function calculateDistanceBasedFee(
  pickupBranch: Branch,
  returnBranch: Branch,
  perKmFee: number,
  minFee: number,
  maxFee: number | undefined,
  currency: string
): { fee: number; currency: string; feeType: string } {
  if (
    !pickupBranch.latitude ||
    !pickupBranch.longitude ||
    !returnBranch.latitude ||
    !returnBranch.longitude
  ) {
    // Fallback to flat minimum fee if no coordinates
    return { fee: minFee, currency, feeType: 'distance_fallback' };
  }

  const distanceKm = calculateDistance(
    pickupBranch.latitude,
    pickupBranch.longitude,
    returnBranch.latitude,
    returnBranch.longitude
  );

  let fee = Math.round(distanceKm * perKmFee);
  fee = Math.max(minFee, fee);
  if (maxFee !== undefined) {
    fee = Math.min(maxFee, fee);
  }

  return { fee, currency, feeType: 'distance' };
}

/**
 * Calculate zone-based one-way fee
 */
function calculateZoneBasedFee(
  pickupBranch: Branch,
  returnBranch: Branch,
  zoneFees: OneWayZoneFee[],
  defaultFee: number,
  currency: string
): { fee: number; currency: string; feeType: string } {
  // Look for specific branch pair fee
  const specificFee = zoneFees.find(
    (z) =>
      z.fromBranchId === pickupBranch.id && z.toBranchId === returnBranch.id
  );

  if (specificFee) {
    return { fee: specificFee.fee, currency, feeType: 'zone_specific' };
  }

  // Look for city-based zone fee
  const cityFee = zoneFees.find(
    (z) =>
      z.fromZone?.toLowerCase() === pickupBranch.city.toLowerCase() &&
      z.toZone?.toLowerCase() === returnBranch.city.toLowerCase()
  );

  if (cityFee) {
    return { fee: cityFee.fee, currency, feeType: 'zone_city' };
  }

  return { fee: defaultFee, currency, feeType: 'zone_default' };
}

// ============================================================================
// BRANCH VALIDATION FOR ONE-WAY
// ============================================================================

/**
 * Validate branch pair for one-way rental
 */
export async function validateOneWayBranches(
  supabase: SupabaseClient<Database>,
  pickupBranchId: string,
  returnBranchId: string,
  pickupAt: string,
  returnAt: string
): Promise<{
  isValid: boolean;
  pickupBranch?: Branch;
  returnBranch?: Branch;
  errors: string[];
}> {
  const errors: string[] = [];

  // Get both branches
  const { data: branches } = await supabase
    .from('branches')
    .select('*')
    .in('id', [pickupBranchId, returnBranchId]);

  const pickupBranch = branches?.find((b) => b.id === pickupBranchId);
  const returnBranch = branches?.find((b) => b.id === returnBranchId);

  if (!pickupBranch) {
    errors.push('Pickup branch not found');
  } else if (pickupBranch.status !== 'active') {
    errors.push('Pickup branch is not active');
  }

  if (!returnBranch) {
    errors.push('Return branch not found');
  } else if (returnBranch.status !== 'active') {
    errors.push('Return branch is not active');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Check operating hours
  const pickupDate = new Date(pickupAt);
  const returnDate = new Date(returnAt);

  if (!isBranchOpenAt(pickupBranch!.operating_hours, pickupDate)) {
    errors.push('Pickup branch is closed at the selected pickup time');
  }

  if (!isBranchOpenAt(returnBranch!.operating_hours, returnDate)) {
    errors.push('Return branch is closed at the selected return time');
  }

  return {
    isValid: errors.length === 0,
    pickupBranch,
    returnBranch,
    errors,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a branch is open at a specific date/time
 */
function isBranchOpenAt(
  operatingHours: OperatingHours | null,
  date: Date
): boolean {
  if (!operatingHours) {
    return true; // If no hours defined, assume 24/7
  }

  const days = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ] as const;
  const dayName = days[date.getDay()];
  const hours = operatingHours[dayName];

  if (!hours) {
    return false; // Closed on this day
  }

  const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  return timeString >= hours.open && timeString < hours.close;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format one-way fee for display
 */
export function formatOneWayFee(fee: number, currency: string): string {
  if (fee === 0) {
    return 'Free';
  }

  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(fee);
}

/**
 * Get one-way rental summary text
 */
export function getOneWaySummary(
  pickupBranchName: string,
  returnBranchName: string,
  fee: number,
  currency: string
): string {
  const feeText = formatOneWayFee(fee, currency);
  return `One-way rental: ${pickupBranchName} → ${returnBranchName} (${feeText} fee)`;
}
