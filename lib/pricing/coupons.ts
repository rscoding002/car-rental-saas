/**
 * Coupon Database Queries & Validation Logic
 *
 * Server-side queries for managing coupons and validating coupon codes.
 * All operations are tenant-scoped through RLS policies.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, DiscountType, CouponStatus, LocalizedString, PriceType } from '@/lib/supabase/types';
import type {
  CouponData,
  CouponWithAddon,
  CreateCouponInput,
  UpdateCouponInput,
  CouponValidationInput,
  CouponValidationResult,
  CouponErrorCode,
  AppliedCoupon,
} from './types';
import { calculateDiscount } from './types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Filters for listing coupons
 */
export interface CouponFilters {
  /** Filter by status */
  status?: CouponStatus;
  /** Filter by discount type */
  discountType?: DiscountType;
  /** Filter by validity (currently valid) */
  currentlyValid?: boolean;
  /** Search by code or description */
  search?: string;
}

/**
 * Sort options for coupons
 */
export interface CouponSort {
  field: 'code' | 'discount_value' | 'valid_from' | 'valid_until' | 'usage_count' | 'created_at';
  direction: 'asc' | 'desc';
}

/**
 * Coupon statistics
 */
export interface CouponStats {
  totalCoupons: number;
  activeCoupons: number;
  expiredCoupons: number;
  totalUsage: number;
  byDiscountType: Record<DiscountType, number>;
}

/**
 * Customer coupon usage record
 */
export interface CustomerCouponUsage {
  couponId: string;
  customerId: string;
  usageCount: number;
}

// Raw database row type
interface CouponRow {
  id: string;
  tenant_id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  free_addon_id: string | null;
  min_order_value: number | null;
  valid_from: string;
  valid_until: string;
  usage_limit: number | null;
  usage_per_customer: number;
  usage_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

// Row with addon relation
interface CouponRowWithAddon extends CouponRow {
  addons?: {
    id: string;
    name: LocalizedString;
    price: number;
    price_type: string;
  } | null;
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get a single coupon by ID
 */
export async function getCouponById(
  supabase: SupabaseClient<Database>,
  couponId: string
): Promise<CouponData | null> {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('id', couponId)
    .single();

  if (error || !data) {
    return null;
  }

  return mapDbToCoupon(data as unknown as CouponRow);
}

/**
 * Get a coupon by ID with free addon details
 */
export async function getCouponWithAddon(
  supabase: SupabaseClient<Database>,
  couponId: string
): Promise<CouponWithAddon | null> {
  const { data, error } = await supabase
    .from('coupons')
    .select(`
      *,
      addons:free_addon_id (
        id,
        name,
        price,
        price_type
      )
    `)
    .eq('id', couponId)
    .single();

  if (error || !data) {
    return null;
  }

  const row = data as unknown as CouponRowWithAddon;
  const coupon = mapDbToCoupon(row);

  if (row.addons) {
    return {
      ...coupon,
      freeAddon: {
        id: row.addons.id,
        name: row.addons.name,
        price: row.addons.price,
        priceType: row.addons.price_type as PriceType,
      },
    };
  }

  return coupon;
}

/**
 * Get a coupon by code
 */
export async function getCouponByCode(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  code: string
): Promise<CouponData | null> {
  const normalizedCode = code.toUpperCase().trim();

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('code', normalizedCode)
    .single();

  if (error || !data) {
    return null;
  }

  return mapDbToCoupon(data as unknown as CouponRow);
}

/**
 * List all coupons for a tenant with filters and sorting
 */
export async function listCoupons(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  options: {
    filters?: CouponFilters;
    sort?: CouponSort;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: CouponData[]; count: number }> {
  const { filters, sort, limit = 100, offset = 0 } = options;

  let query = supabase
    .from('coupons')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.discountType) {
    query = query.eq('discount_type', filters.discountType);
  }
  if (filters?.currentlyValid) {
    const now = new Date().toISOString();
    query = query
      .eq('status', 'active')
      .lte('valid_from', now)
      .gte('valid_until', now);
  }
  if (filters?.search) {
    query = query.or(`code.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  // Apply sorting
  if (sort) {
    query = query.order(sort.field, { ascending: sort.direction === 'asc' });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error listing coupons:', error);
    return { data: [], count: 0 };
  }

  const coupons = ((data || []) as unknown as CouponRow[]).map(mapDbToCoupon);

  return { data: coupons, count: count || 0 };
}

/**
 * Get all active and valid coupons
 */
export async function getActiveCoupons(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<CouponData[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .lte('valid_from', now)
    .gte('valid_until', now)
    .order('code');

  if (error) {
    console.error('Error fetching active coupons:', error);
    return [];
  }

  return ((data || []) as unknown as CouponRow[]).map(mapDbToCoupon);
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Create a new coupon
 */
export async function createCoupon(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  input: CreateCouponInput
): Promise<{ data: CouponData | null; error: string | null }> {
  const normalizedCode = input.code.toUpperCase().replace(/\s+/g, '');

  // Check if code already exists
  const existing = await getCouponByCode(supabase, tenantId, normalizedCode);
  if (existing) {
    return { data: null, error: 'A coupon with this code already exists' };
  }

  const insertData = {
    tenant_id: tenantId,
    code: normalizedCode,
    description: input.description ?? null,
    discount_type: input.discountType,
    discount_value: input.discountValue,
    free_addon_id: input.freeAddonId ?? null,
    min_order_value: input.minOrderValue ?? null,
    valid_from: input.validFrom,
    valid_until: input.validUntil,
    usage_limit: input.usageLimit ?? null,
    usage_per_customer: input.usagePerCustomer ?? 1,
    usage_count: 0,
    status: input.status ?? 'active',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('coupons')
    .insert(insertData)
    .select('*')
    .single();

  if (error) {
    console.error('Error creating coupon:', error);
    return { data: null, error: error.message };
  }

  return { data: mapDbToCoupon(data as unknown as CouponRow), error: null };
}

/**
 * Update an existing coupon
 */
export async function updateCoupon(
  supabase: SupabaseClient<Database>,
  couponId: string,
  input: UpdateCouponInput
): Promise<{ data: CouponData | null; error: string | null }> {
  // Build update object
  const updateData: Record<string, unknown> = {};

  if (input.code !== undefined) {
    updateData.code = input.code.toUpperCase().replace(/\s+/g, '');
  }
  if (input.description !== undefined) updateData.description = input.description;
  if (input.discountType !== undefined) updateData.discount_type = input.discountType;
  if (input.discountValue !== undefined) updateData.discount_value = input.discountValue;
  if (input.freeAddonId !== undefined) updateData.free_addon_id = input.freeAddonId;
  if (input.minOrderValue !== undefined) updateData.min_order_value = input.minOrderValue;
  if (input.validFrom !== undefined) updateData.valid_from = input.validFrom;
  if (input.validUntil !== undefined) updateData.valid_until = input.validUntil;
  if (input.usageLimit !== undefined) updateData.usage_limit = input.usageLimit;
  if (input.usagePerCustomer !== undefined) updateData.usage_per_customer = input.usagePerCustomer;
  if (input.status !== undefined) updateData.status = input.status;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('coupons')
    .update(updateData)
    .eq('id', couponId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating coupon:', error);
    return { data: null, error: error.message };
  }

  return { data: mapDbToCoupon(data as unknown as CouponRow), error: null };
}

/**
 * Delete a coupon
 */
export async function deleteCoupon(
  supabase: SupabaseClient<Database>,
  couponId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('coupons')
    .delete()
    .eq('id', couponId);

  if (error) {
    console.error('Error deleting coupon:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Increment coupon usage count
 */
export async function incrementCouponUsage(
  supabase: SupabaseClient<Database>,
  couponId: string
): Promise<{ success: boolean; error: string | null }> {
  // Get current usage count
  const { data: coupon, error: fetchError } = await supabase
    .from('coupons')
    .select('usage_count')
    .eq('id', couponId)
    .single();

  if (fetchError || !coupon) {
    return { success: false, error: 'Coupon not found' };
  }

  const currentCount = (coupon as { usage_count: number }).usage_count;

  const { error } = await supabase
    .from('coupons')
    .update({ usage_count: currentCount + 1 })
    .eq('id', couponId);

  if (error) {
    console.error('Error incrementing coupon usage:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a coupon code
 */
export async function validateCoupon(
  supabase: SupabaseClient<Database>,
  input: CouponValidationInput
): Promise<CouponValidationResult> {
  const { code, tenantId, customerId, orderValue } = input;

  // Normalize code
  const normalizedCode = code.toUpperCase().trim();

  // Fetch coupon
  const coupon = await getCouponByCode(supabase, tenantId, normalizedCode);

  if (!coupon) {
    return {
      isValid: false,
      errorMessage: 'Coupon code not found',
      errorCode: 'not_found',
    };
  }

  // Check status
  if (coupon.status !== 'active') {
    return {
      isValid: false,
      errorMessage: coupon.status === 'expired' ? 'This coupon has expired' : 'This coupon is not active',
      errorCode: 'not_active',
    };
  }

  // Check validity dates
  const now = new Date();
  const validFrom = new Date(coupon.validFrom);
  const validUntil = new Date(coupon.validUntil);

  if (now < validFrom) {
    return {
      isValid: false,
      errorMessage: 'This coupon is not yet valid',
      errorCode: 'not_yet_valid',
    };
  }

  if (now > validUntil) {
    return {
      isValid: false,
      errorMessage: 'This coupon has expired',
      errorCode: 'expired',
    };
  }

  // Check global usage limit
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    return {
      isValid: false,
      errorMessage: 'This coupon has reached its usage limit',
      errorCode: 'usage_limit_reached',
    };
  }

  // Check per-customer usage limit
  if (customerId) {
    const customerUsage = await getCustomerCouponUsage(supabase, coupon.id, customerId);
    if (customerUsage >= coupon.usagePerCustomer) {
      return {
        isValid: false,
        errorMessage: 'You have already used this coupon the maximum number of times',
        errorCode: 'per_customer_limit_reached',
      };
    }
  }

  // Check minimum order value
  if (coupon.minOrderValue !== null && orderValue < coupon.minOrderValue) {
    return {
      isValid: false,
      errorMessage: `Minimum order value of ${coupon.minOrderValue} required for this coupon`,
      errorCode: 'min_order_not_met',
    };
  }

  // Coupon is valid
  return {
    isValid: true,
    coupon,
  };
}

/**
 * Get customer's usage count for a coupon
 */
export async function getCustomerCouponUsage(
  supabase: SupabaseClient<Database>,
  couponId: string,
  customerId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('coupon_id', couponId)
    .eq('customer_id', customerId)
    .neq('status', 'cancelled');

  if (error) {
    console.error('Error checking customer coupon usage:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Apply a coupon to calculate discount
 */
export function applyCoupon(
  coupon: CouponData,
  subtotal: number
): AppliedCoupon {
  const discountAmount = calculateDiscount(subtotal, coupon.discountType, coupon.discountValue);

  return {
    couponId: coupon.id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountAmount,
    freeAddonId: coupon.freeAddonId ?? undefined,
  };
}

/**
 * Validate and apply coupon in one step
 */
export async function validateAndApplyCoupon(
  supabase: SupabaseClient<Database>,
  input: CouponValidationInput
): Promise<{
  isValid: boolean;
  appliedCoupon?: AppliedCoupon;
  errorMessage?: string;
  errorCode?: CouponErrorCode;
}> {
  const validation = await validateCoupon(supabase, input);

  if (!validation.isValid || !validation.coupon) {
    return {
      isValid: false,
      errorMessage: validation.errorMessage,
      errorCode: validation.errorCode,
    };
  }

  const appliedCoupon = applyCoupon(validation.coupon, input.orderValue);

  return {
    isValid: true,
    appliedCoupon,
  };
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get coupon statistics for a tenant
 */
export async function getCouponStats(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<CouponStats> {
  const { data, error } = await supabase
    .from('coupons')
    .select('id, status, discount_type, usage_count, valid_until')
    .eq('tenant_id', tenantId);

  if (error || !data) {
    return {
      totalCoupons: 0,
      activeCoupons: 0,
      expiredCoupons: 0,
      totalUsage: 0,
      byDiscountType: { percentage: 0, fixed_amount: 0, free_addon: 0 },
    };
  }

  const rows = data as unknown as Array<{
    id: string;
    status: string;
    discount_type: string;
    usage_count: number;
    valid_until: string;
  }>;

  const now = new Date();
  const stats: CouponStats = {
    totalCoupons: rows.length,
    activeCoupons: 0,
    expiredCoupons: 0,
    totalUsage: 0,
    byDiscountType: { percentage: 0, fixed_amount: 0, free_addon: 0 },
  };

  for (const row of rows) {
    // Count active vs expired
    const validUntil = new Date(row.valid_until);
    if (row.status === 'active' && validUntil > now) {
      stats.activeCoupons++;
    } else if (row.status === 'expired' || validUntil <= now) {
      stats.expiredCoupons++;
    }

    // Count by discount type
    const discountType = row.discount_type as DiscountType;
    if (discountType in stats.byDiscountType) {
      stats.byDiscountType[discountType]++;
    }

    // Sum total usage
    stats.totalUsage += row.usage_count;
  }

  return stats;
}

/**
 * Get usage statistics for a specific coupon
 */
export async function getCouponUsageDetails(
  supabase: SupabaseClient<Database>,
  couponId: string
): Promise<{
  totalUsage: number;
  uniqueCustomers: number;
  totalDiscount: number;
  recentUsages: Array<{
    bookingId: string;
    customerId: string;
    discountAmount: number;
    usedAt: string;
  }>;
}> {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, customer_id, pricing, created_at')
    .eq('coupon_id', couponId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !data) {
    return {
      totalUsage: 0,
      uniqueCustomers: 0,
      totalDiscount: 0,
      recentUsages: [],
    };
  }

  interface BookingRow {
    id: string;
    customer_id: string;
    pricing: {
      discountAmount?: number;
    };
    created_at: string;
  }

  const rows = data as unknown as BookingRow[];
  const uniqueCustomers = new Set(rows.map((r) => r.customer_id));
  let totalDiscount = 0;

  const recentUsages = rows.map((row) => {
    const discountAmount = row.pricing?.discountAmount || 0;
    totalDiscount += discountAmount;
    return {
      bookingId: row.id,
      customerId: row.customer_id,
      discountAmount,
      usedAt: row.created_at,
    };
  });

  return {
    totalUsage: rows.length,
    uniqueCustomers: uniqueCustomers.size,
    totalDiscount,
    recentUsages,
  };
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Expire all coupons past their valid_until date
 */
export async function expireOutdatedCoupons(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<{ updated: number; error: string | null }> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('coupons')
    .update({ status: 'expired' })
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .lt('valid_until', now)
    .select('id');

  if (error) {
    console.error('Error expiring outdated coupons:', error);
    return { updated: 0, error: error.message };
  }

  return { updated: data?.length || 0, error: null };
}

/**
 * Check if a coupon code is unique within a tenant
 */
export async function isCouponCodeUnique(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  code: string,
  excludeCouponId?: string
): Promise<boolean> {
  const normalizedCode = code.toUpperCase().trim();

  let query = supabase
    .from('coupons')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('code', normalizedCode);

  if (excludeCouponId) {
    query = query.neq('id', excludeCouponId);
  }

  const { count } = await query;

  return count === 0;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map database row to CouponData type
 */
function mapDbToCoupon(row: CouponRow): CouponData {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    code: row.code,
    description: row.description,
    discountType: row.discount_type as DiscountType,
    discountValue: row.discount_value,
    freeAddonId: row.free_addon_id,
    minOrderValue: row.min_order_value,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    usageLimit: row.usage_limit,
    usagePerCustomer: row.usage_per_customer,
    usageCount: row.usage_count,
    status: row.status as CouponStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Format coupon discount for display
 */
export function formatCouponDiscount(coupon: CouponData, currency: string = 'EUR'): string {
  switch (coupon.discountType) {
    case 'percentage':
      return `${coupon.discountValue}% off`;
    case 'fixed_amount':
      return `${currency} ${coupon.discountValue} off`;
    case 'free_addon':
      return 'Free add-on included';
    default:
      return `${coupon.discountValue} discount`;
  }
}

/**
 * Check if coupon is currently valid (date and status)
 */
export function isCouponCurrentlyValid(coupon: CouponData): boolean {
  if (coupon.status !== 'active') return false;

  const now = new Date();
  const validFrom = new Date(coupon.validFrom);
  const validUntil = new Date(coupon.validUntil);

  return now >= validFrom && now <= validUntil;
}

/**
 * Check if coupon has uses remaining
 */
export function hasCouponUsesRemaining(coupon: CouponData): boolean {
  if (coupon.usageLimit === null) return true;
  return coupon.usageCount < coupon.usageLimit;
}

/**
 * Get days until coupon expires (negative if already expired)
 */
export function getDaysUntilExpiry(coupon: CouponData): number {
  const now = new Date();
  const validUntil = new Date(coupon.validUntil);
  const diffMs = validUntil.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Generate a random coupon code
 */
export function generateCouponCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Format coupon validity period for display
 */
export function formatCouponValidity(coupon: CouponData): string {
  const from = new Date(coupon.validFrom);
  const until = new Date(coupon.validUntil);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return `${formatDate(from)} - ${formatDate(until)}`;
}
