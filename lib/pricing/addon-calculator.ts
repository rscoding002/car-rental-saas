/**
 * Add-On Pricing Calculator
 *
 * Calculates add-on prices based on rental duration and price type.
 * Supports per-day, per-rental, and one-time pricing models.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, PriceType } from '@/lib/supabase/types';
import type {
  AddonData,
  SelectedAddon,
  AddonCalculationInput,
  AddonCalculationResult,
} from './types';
import { getAddonsByIds, getLocalizedAddonName } from './addon-queries';

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate price for a single add-on based on rental duration
 */
export function calculateAddonPrice(
  addon: AddonData,
  quantity: number,
  rentalDays: number
): number {
  const basePrice = addon.price;

  switch (addon.priceType) {
    case 'per_day':
      // Price multiplied by number of rental days
      return basePrice * quantity * rentalDays;

    case 'per_rental':
      // Flat price per rental, regardless of duration
      return basePrice * quantity;

    case 'one_time':
      // One-time charge, same as per_rental
      return basePrice * quantity;

    default:
      return basePrice * quantity;
  }
}

/**
 * Calculate effective daily rate for an add-on
 */
export function calculateAddonDailyRate(
  addon: AddonData,
  rentalDays: number
): number {
  switch (addon.priceType) {
    case 'per_day':
      return addon.price;

    case 'per_rental':
    case 'one_time':
      // Spread the one-time cost across rental days
      return rentalDays > 0 ? addon.price / rentalDays : addon.price;

    default:
      return addon.price;
  }
}

/**
 * Calculate all selected add-ons for a booking
 */
export async function calculateAddonsTotal(
  supabase: SupabaseClient<Database>,
  input: AddonCalculationInput,
  locale: string = 'en'
): Promise<AddonCalculationResult> {
  const { addons: selections, rentalDays, currency } = input;

  if (selections.length === 0) {
    return {
      items: [],
      total: 0,
      currency,
    };
  }

  // Fetch all add-on data
  const addonIds = selections.map((s) => s.addonId);
  const addons = await getAddonsByIds(supabase, addonIds);

  // Create a map for quick lookup
  const addonMap = new Map(addons.map((a) => [a.id, a]));

  // Calculate each add-on
  const items: SelectedAddon[] = [];
  let total = 0;

  for (const selection of selections) {
    const addon = addonMap.get(selection.addonId);
    if (!addon) continue;

    // Validate quantity against max
    const quantity = Math.min(selection.quantity, addon.maxQuantity);
    if (quantity <= 0) continue;

    // Calculate price
    const totalPrice = calculateAddonPrice(addon, quantity, rentalDays);
    total += totalPrice;

    items.push({
      addonId: addon.id,
      name: getLocalizedAddonName(addon, locale),
      quantity,
      unitPrice: addon.price,
      priceType: addon.priceType,
      totalPrice: Math.round(totalPrice * 100) / 100,
    });
  }

  return {
    items,
    total: Math.round(total * 100) / 100,
    currency,
  };
}

/**
 * Calculate add-ons from local data (no database call)
 */
export function calculateAddonsFromData(
  addons: AddonData[],
  selections: Array<{ addonId: string; quantity: number }>,
  rentalDays: number,
  currency: string,
  locale: string = 'en'
): AddonCalculationResult {
  if (selections.length === 0) {
    return {
      items: [],
      total: 0,
      currency,
    };
  }

  // Create a map for quick lookup
  const addonMap = new Map(addons.map((a) => [a.id, a]));

  // Calculate each add-on
  const items: SelectedAddon[] = [];
  let total = 0;

  for (const selection of selections) {
    const addon = addonMap.get(selection.addonId);
    if (!addon) continue;

    // Validate quantity against max
    const quantity = Math.min(selection.quantity, addon.maxQuantity);
    if (quantity <= 0) continue;

    // Calculate price
    const totalPrice = calculateAddonPrice(addon, quantity, rentalDays);
    total += totalPrice;

    items.push({
      addonId: addon.id,
      name: getLocalizedAddonName(addon, locale),
      quantity,
      unitPrice: addon.price,
      priceType: addon.priceType,
      totalPrice: Math.round(totalPrice * 100) / 100,
    });
  }

  return {
    items,
    total: Math.round(total * 100) / 100,
    currency,
  };
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Format add-on price for display
 */
export function formatAddonPrice(
  price: number,
  priceType: PriceType,
  currency: string,
  locale: string = 'en'
): string {
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);

  switch (priceType) {
    case 'per_day':
      return `${formatted}/day`;
    case 'per_rental':
      return `${formatted}/rental`;
    case 'one_time':
      return formatted;
    default:
      return formatted;
  }
}

/**
 * Get add-on price breakdown for display
 */
export function getAddonBreakdown(
  addon: AddonData,
  quantity: number,
  rentalDays: number,
  currency: string,
  locale: string = 'en'
): {
  unitPrice: string;
  calculation: string;
  totalPrice: string;
} {
  const total = calculateAddonPrice(addon, quantity, rentalDays);
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);

  let calculation: string;

  switch (addon.priceType) {
    case 'per_day':
      calculation = `${formatPrice(addon.price)} x ${quantity} x ${rentalDays} days`;
      break;
    case 'per_rental':
      calculation = quantity > 1
        ? `${formatPrice(addon.price)} x ${quantity}`
        : formatPrice(addon.price);
      break;
    case 'one_time':
      calculation = quantity > 1
        ? `${formatPrice(addon.price)} x ${quantity}`
        : formatPrice(addon.price);
      break;
    default:
      calculation = formatPrice(total);
  }

  return {
    unitPrice: formatAddonPrice(addon.price, addon.priceType, currency, locale),
    calculation,
    totalPrice: formatPrice(total),
  };
}

/**
 * Validate add-on selections
 */
export function validateAddonSelections(
  addons: AddonData[],
  selections: Array<{ addonId: string; quantity: number }>
): {
  valid: boolean;
  errors: Array<{ addonId: string; error: string }>;
  validSelections: Array<{ addonId: string; quantity: number }>;
} {
  const addonMap = new Map(addons.map((a) => [a.id, a]));
  const errors: Array<{ addonId: string; error: string }> = [];
  const validSelections: Array<{ addonId: string; quantity: number }> = [];

  for (const selection of selections) {
    const addon = addonMap.get(selection.addonId);

    if (!addon) {
      errors.push({
        addonId: selection.addonId,
        error: 'Add-on not found',
      });
      continue;
    }

    if (addon.status !== 'active') {
      errors.push({
        addonId: selection.addonId,
        error: 'Add-on is no longer available',
      });
      continue;
    }

    if (selection.quantity <= 0) {
      errors.push({
        addonId: selection.addonId,
        error: 'Quantity must be at least 1',
      });
      continue;
    }

    if (selection.quantity > addon.maxQuantity) {
      errors.push({
        addonId: selection.addonId,
        error: `Maximum quantity is ${addon.maxQuantity}`,
      });
      // Still add with corrected quantity
      validSelections.push({
        addonId: selection.addonId,
        quantity: addon.maxQuantity,
      });
      continue;
    }

    validSelections.push(selection);
  }

  return {
    valid: errors.length === 0,
    errors,
    validSelections,
  };
}

// ============================================================================
// ADDON COMPARISON
// ============================================================================

/**
 * Compare add-on value for different rental durations
 * Helps customers understand which add-ons are better value for their duration
 */
export function compareAddonValue(
  addon: AddonData,
  shortDays: number = 3,
  longDays: number = 7
): {
  shortRental: { total: number; dailyRate: number };
  longRental: { total: number; dailyRate: number };
  savingsOnLonger: number;
  savingsPercent: number;
  recommendation: 'better_short' | 'better_long' | 'neutral';
} {
  const shortTotal = calculateAddonPrice(addon, 1, shortDays);
  const longTotal = calculateAddonPrice(addon, 1, longDays);

  const shortDailyRate = shortTotal / shortDays;
  const longDailyRate = longTotal / longDays;

  const savingsOnLonger = shortDailyRate - longDailyRate;
  const savingsPercent = shortDailyRate > 0
    ? (savingsOnLonger / shortDailyRate) * 100
    : 0;

  let recommendation: 'better_short' | 'better_long' | 'neutral';
  if (savingsPercent > 10) {
    recommendation = 'better_long';
  } else if (savingsPercent < -10) {
    recommendation = 'better_short';
  } else {
    recommendation = 'neutral';
  }

  return {
    shortRental: {
      total: Math.round(shortTotal * 100) / 100,
      dailyRate: Math.round(shortDailyRate * 100) / 100,
    },
    longRental: {
      total: Math.round(longTotal * 100) / 100,
      dailyRate: Math.round(longDailyRate * 100) / 100,
    },
    savingsOnLonger: Math.round(savingsOnLonger * 100) / 100,
    savingsPercent: Math.round(savingsPercent * 10) / 10,
    recommendation,
  };
}

/**
 * Suggest add-ons based on rental duration
 * Per-rental add-ons become better value for longer rentals
 */
export function suggestAddonsForDuration(
  addons: AddonData[],
  rentalDays: number
): {
  recommended: AddonData[];
  goodValue: AddonData[];
  other: AddonData[];
} {
  const recommended: AddonData[] = [];
  const goodValue: AddonData[] = [];
  const other: AddonData[] = [];

  for (const addon of addons) {
    if (addon.status !== 'active') continue;

    if (addon.priceType === 'per_day') {
      // Per-day add-ons are always neutral
      other.push(addon);
    } else if (addon.priceType === 'per_rental' || addon.priceType === 'one_time') {
      // Per-rental add-ons become better value for longer rentals
      const dailyEquivalent = addon.price / rentalDays;

      // If daily equivalent is under a threshold, it's a good value
      if (rentalDays >= 7 && dailyEquivalent < addon.price * 0.2) {
        recommended.push(addon);
      } else if (rentalDays >= 3 && dailyEquivalent < addon.price * 0.4) {
        goodValue.push(addon);
      } else {
        other.push(addon);
      }
    }
  }

  return { recommended, goodValue, other };
}
