/**
 * Booking Email Helpers
 *
 * Transforms booking data into email template props and sends booking-related emails.
 * Used by webhooks and API routes to send confirmation, modification, cancellation, and reminder emails.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tenant } from '@/lib/supabase/types';
import type { BookingWithRelations, BookingPricing } from '@/lib/booking/types';
import type {
  BookingConfirmationEmailProps,
  BookingCancellationEmailProps,
  BookingModificationEmailProps,
  BookingReminderEmailProps,
} from '@/emails';
import { getTenantEmailBranding } from '@/emails';
import { getBookingWithRelations } from '@/lib/booking/queries';
import { getTenantById } from '@/lib/tenant/queries';
import {
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail,
  sendBookingModificationEmail,
  sendBookingReminderEmail,
  isEmailEnabled,
} from './index';
import type { TenantEmailSettings } from '@/lib/tenant/types';
import { DEFAULT_EMAIL_SETTINGS } from '@/lib/tenant/types';

// ============================================================================
// TYPES
// ============================================================================

export interface SendBookingEmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

export interface BookingEmailContext {
  booking: BookingWithRelations;
  tenant: Tenant;
  locale?: string;
  baseUrl?: string;
}

// ============================================================================
// URL HELPERS
// ============================================================================

/**
 * Get the base URL for a tenant
 */
function getTenantBaseUrl(tenant: Tenant): string {
  if (tenant.domain) {
    return `https://${tenant.domain}`;
  }
  if (tenant.slug) {
    // Use the configured app domain or default
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'carrental.app';
    return `https://${tenant.slug}.${appDomain}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'https://carrental.app';
}

/**
 * Build URLs for booking email actions
 */
function buildBookingUrls(
  baseUrl: string,
  locale: string,
  bookingId: string,
  bookingReference: string
): BookingConfirmationEmailProps['urls'] {
  const accountPath = `/${locale}/account`;

  return {
    viewBooking: `${baseUrl}${accountPath}/bookings/${bookingId}`,
    manageBooking: `${baseUrl}${accountPath}/bookings/${bookingId}`,
    addToCalendar: `${baseUrl}${accountPath}/bookings/${bookingId}?action=calendar`,
    directions: undefined, // Could be built from branch GPS coordinates
  };
}

/**
 * Get tenant email settings with defaults
 */
function getTenantEmailSettings(tenant: Tenant): TenantEmailSettings {
  const settings = tenant.settings as Record<string, unknown> | null;
  const emailSettings = settings?.email as TenantEmailSettings | undefined;

  return {
    ...DEFAULT_EMAIL_SETTINGS,
    ...emailSettings,
  };
}

/**
 * Build email options from tenant settings
 */
function buildEmailOptionsFromTenant(tenant: Tenant): {
  fromName?: string;
  replyTo?: string;
} {
  const emailSettings = getTenantEmailSettings(tenant);

  return {
    fromName: emailSettings.fromName || tenant.name || undefined,
    replyTo: emailSettings.replyToEmail || undefined,
  };
}

/**
 * Check if a specific email type should be sent based on tenant settings
 */
function shouldSendEmail(
  tenant: Tenant,
  emailType: 'confirmation' | 'modification' | 'cancellation' | 'reminder'
): boolean {
  const emailSettings = getTenantEmailSettings(tenant);

  switch (emailType) {
    case 'confirmation':
      return emailSettings.sendBookingConfirmation !== false;
    case 'modification':
      return emailSettings.sendBookingModification !== false;
    case 'cancellation':
      return emailSettings.sendBookingCancellation !== false;
    case 'reminder':
      return emailSettings.sendBookingReminder !== false;
    default:
      return true;
  }
}

// ============================================================================
// DATA TRANSFORMERS
// ============================================================================

/**
 * Get localized string value (handles LocalizedString type)
 */
function getLocalizedString(
  value: string | { [key: string]: string | undefined } | undefined | null,
  locale: string = 'en'
): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const localized = value[locale] || value['en'];
  if (localized) return localized;
  // Fallback to first non-undefined value
  const values = Object.values(value).filter((v): v is string => typeof v === 'string');
  return values[0] || '';
}

/**
 * Transform booking pricing to email pricing format
 */
function transformPricing(
  pricing: BookingPricing,
  addons?: BookingWithRelations['addons'],
  couponCode?: string,
  locale: string = 'en'
): BookingConfirmationEmailProps['pricing'] {
  // Calculate daily rate from base rate and duration
  const days = pricing.duration || 1;
  const dailyRate = pricing.baseRate / days;

  return {
    baseRate: pricing.baseRate,
    days: days,
    dailyRate: dailyRate,
    seasonMultiplier: pricing.seasonMultiplier,
    addons: addons?.map((a) => ({
      name: getLocalizedString(a.addon?.name, locale) || 'Add-on',
      quantity: a.quantity,
      total: a.totalPrice,
    })),
    oneWayFee: pricing.oneWayFee,
    discount: pricing.discountAmount && pricing.discountAmount > 0
      ? {
          code: couponCode || 'DISCOUNT',
          amount: pricing.discountAmount,
        }
      : undefined,
    subtotal: pricing.subtotal || pricing.baseRate,
    total: pricing.total,
    currency: pricing.currency || 'EUR',
  };
}

/**
 * Build confirmation email props from booking data
 */
export function buildConfirmationEmailProps(
  context: BookingEmailContext
): BookingConfirmationEmailProps {
  const { booking, tenant, locale = 'en' } = context;
  const baseUrl = context.baseUrl || getTenantBaseUrl(tenant);

  const branding = getTenantEmailBranding(tenant);

  // Get vehicle photo URL
  const vehiclePhotoUrl = booking.vehicle?.photoUrl || undefined;

  // Build the email props
  return {
    branding,
    reference: booking.reference,
    status: booking.status === 'confirmed' ? 'confirmed' : 'pending',
    customer: {
      firstName: booking.customer?.firstName || booking.driverInfo?.firstName || 'Customer',
      lastName: booking.customer?.lastName || booking.driverInfo?.lastName || '',
      email: booking.customer?.email || booking.driverInfo?.email || '',
    },
    vehicle: {
      make: booking.vehicle?.make || 'Vehicle',
      model: booking.vehicle?.model || '',
      year: booking.vehicle?.year || new Date().getFullYear(),
      categoryName: getLocalizedString(booking.vehicle?.category?.name, locale) || 'Standard',
      transmission: booking.vehicle?.transmission === 'automatic' ? 'automatic' : 'manual',
      fuelType: booking.vehicle?.fuelType || 'Petrol',
      seats: booking.vehicle?.seats || 5,
      photoUrl: vehiclePhotoUrl,
    },
    pickup: {
      branchName: booking.pickupBranch?.name || 'Pickup Location',
      address: booking.pickupBranch?.address || '',
      city: booking.pickupBranch?.city || '',
      dateTime: booking.pickupAt,
      phone: booking.pickupBranch?.phone || undefined,
    },
    return: {
      branchName: booking.returnBranch?.name || 'Return Location',
      address: booking.returnBranch?.address || '',
      city: booking.returnBranch?.city || '',
      dateTime: booking.returnAt,
      phone: booking.returnBranch?.phone || undefined,
    },
    driver: {
      firstName: booking.driverInfo?.firstName || booking.customer?.firstName || '',
      lastName: booking.driverInfo?.lastName || booking.customer?.lastName || '',
      email: booking.driverInfo?.email || booking.customer?.email || '',
      phone: booking.driverInfo?.phone || booking.customer?.phone || '',
    },
    pricing: transformPricing(
      booking.pricing,
      booking.addons,
      booking.coupon?.code,
      locale
    ),
    urls: buildBookingUrls(baseUrl, locale, booking.id, booking.reference),
    locale,
  };
}

/**
 * Build cancellation email props from booking data
 */
export function buildCancellationEmailProps(
  context: BookingEmailContext,
  cancellation: {
    cancelledBy: 'customer' | 'staff' | 'system';
    reason?: string;
    reasonType?: string;
    cancelledAt: string;
  },
  refund: {
    originalAmount: number;
    refundAmount: number;
    cancellationFee: number;
    refundPercent: number;
    policyTier: 'full' | 'partial' | 'none';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    estimatedDate?: string;
  }
): BookingCancellationEmailProps {
  const { booking, tenant, locale = 'en' } = context;
  const baseUrl = context.baseUrl || getTenantBaseUrl(tenant);

  const branding = getTenantEmailBranding(tenant);

  return {
    branding,
    reference: booking.reference,
    customer: {
      firstName: booking.customer?.firstName || booking.driverInfo?.firstName || 'Customer',
      lastName: booking.customer?.lastName || booking.driverInfo?.lastName || '',
      email: booking.customer?.email || booking.driverInfo?.email || '',
    },
    vehicle: {
      make: booking.vehicle?.make || 'Vehicle',
      model: booking.vehicle?.model || '',
      year: booking.vehicle?.year || new Date().getFullYear(),
    },
    booking: {
      pickupDateTime: booking.pickupAt,
      pickupBranch: booking.pickupBranch?.name || '',
      returnDateTime: booking.returnAt,
      returnBranch: booking.returnBranch?.name || '',
    },
    cancellation: {
      cancelledBy: cancellation.cancelledBy,
      reason: cancellation.reason,
      reasonType: cancellation.reasonType as BookingCancellationEmailProps['cancellation']['reasonType'],
      cancelledAt: cancellation.cancelledAt,
    },
    refund: {
      originalAmount: refund.originalAmount,
      refundAmount: refund.refundAmount,
      cancellationFee: refund.cancellationFee,
      refundPercent: refund.refundPercent,
      policyTier: refund.policyTier,
      currency: booking.pricing.currency || 'EUR',
      status: refund.status,
      estimatedDate: refund.estimatedDate,
    },
    urls: {
      bookAgain: `${baseUrl}/${locale}/fleet`,
      contactSupport: `${baseUrl}/${locale}/contact`,
      viewHistory: `${baseUrl}/${locale}/account/bookings`,
    },
    locale,
  };
}

/**
 * Build modification email props from booking data
 */
export function buildModificationEmailProps(
  context: BookingEmailContext,
  modification: {
    modifiedBy: 'customer' | 'staff';
    modifiedAt: string;
    changes: {
      dates?: {
        oldPickup: string;
        newPickup: string;
        oldReturn: string;
        newReturn: string;
      };
      pickupLocation?: {
        oldBranch: string;
        newBranch: string;
        newAddress: string;
        newCity: string;
      };
      returnLocation?: {
        oldBranch: string;
        newBranch: string;
        newAddress: string;
        newCity: string;
      };
      addons?: {
        added: { name: string; quantity: number; price: number }[];
        removed: { name: string }[];
      };
    };
    originalPricing: BookingPricing;
    newPricing: BookingPricing;
    priceDifference: number;
    requiresPayment: boolean;
    requiresRefund: boolean;
    paymentStatus?: 'pending' | 'completed' | 'processing';
  }
): BookingModificationEmailProps {
  const { booking, tenant, locale = 'en' } = context;
  const baseUrl = context.baseUrl || getTenantBaseUrl(tenant);

  const branding = getTenantEmailBranding(tenant);

  return {
    branding,
    reference: booking.reference,
    customer: {
      firstName: booking.customer?.firstName || booking.driverInfo?.firstName || 'Customer',
      lastName: booking.customer?.lastName || booking.driverInfo?.lastName || '',
      email: booking.customer?.email || booking.driverInfo?.email || '',
    },
    vehicle: {
      make: booking.vehicle?.make || 'Vehicle',
      model: booking.vehicle?.model || '',
      year: booking.vehicle?.year || new Date().getFullYear(),
      photoUrl: booking.vehicle?.photoUrl || undefined,
    },
    changes: modification.changes,
    currentBooking: {
      pickupDateTime: booking.pickupAt,
      pickupBranch: booking.pickupBranch?.name || 'Pickup Location',
      pickupAddress: booking.pickupBranch?.address || '',
      returnDateTime: booking.returnAt,
      returnBranch: booking.returnBranch?.name || 'Return Location',
      returnAddress: booking.returnBranch?.address || '',
    },
    pricing: {
      originalTotal: modification.originalPricing.total,
      newTotal: modification.newPricing.total,
      difference: modification.priceDifference,
      currency: booking.pricing.currency || 'EUR',
      requiresPayment: modification.requiresPayment,
      requiresRefund: modification.requiresRefund,
      paymentStatus: modification.paymentStatus,
    },
    modifiedBy: modification.modifiedBy,
    modifiedAt: modification.modifiedAt,
    urls: {
      viewBooking: `${baseUrl}/${locale}/account/bookings/${booking.id}`,
      manageBooking: `${baseUrl}/${locale}/account/bookings/${booking.id}`,
    },
    locale,
  };
}

/**
 * Build reminder email props from booking data
 */
export function buildReminderEmailProps(
  context: BookingEmailContext,
  timeUntilPickup: {
    hours: number;
    days: number;
    formatted: string;
  }
): BookingReminderEmailProps {
  const { booking, tenant, locale = 'en' } = context;
  const baseUrl = context.baseUrl || getTenantBaseUrl(tenant);

  const branding = getTenantEmailBranding(tenant);
  const vehiclePhotoUrl = booking.vehicle?.photoUrl || undefined;

  // Calculate duration
  const pickupDate = new Date(booking.pickupAt);
  const returnDate = new Date(booking.returnAt);
  const durationMs = returnDate.getTime() - pickupDate.getTime();
  const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

  return {
    branding,
    reference: booking.reference,
    customer: {
      firstName: booking.customer?.firstName || booking.driverInfo?.firstName || 'Customer',
      lastName: booking.customer?.lastName || booking.driverInfo?.lastName || '',
      email: booking.customer?.email || booking.driverInfo?.email || '',
    },
    vehicle: {
      make: booking.vehicle?.make || 'Vehicle',
      model: booking.vehicle?.model || '',
      year: booking.vehicle?.year || new Date().getFullYear(),
      categoryName: getLocalizedString(booking.vehicle?.category?.name, locale) || 'Standard',
      transmission: booking.vehicle?.transmission === 'automatic' ? 'automatic' : 'manual',
      fuelType: booking.vehicle?.fuelType || 'Petrol',
      seats: booking.vehicle?.seats || 5,
      photoUrl: vehiclePhotoUrl,
    },
    pickup: {
      branchName: booking.pickupBranch?.name || 'Pickup Location',
      address: booking.pickupBranch?.address || '',
      city: booking.pickupBranch?.city || '',
      dateTime: booking.pickupAt,
      phone: booking.pickupBranch?.phone || undefined,
    },
    return: {
      branchName: booking.returnBranch?.name || 'Return Location',
      address: booking.returnBranch?.address || '',
      city: booking.returnBranch?.city || '',
      dateTime: booking.returnAt,
    },
    timeUntilPickup,
    duration: {
      days: durationDays,
    },
    addons: booking.addons?.map((a) => ({
      name: getLocalizedString(a.addon?.name, locale) || 'Add-on',
      quantity: a.quantity,
    })),
    urls: buildBookingUrls(baseUrl, locale, booking.id, booking.reference),
    locale,
  };
}

// ============================================================================
// EMAIL SENDING FUNCTIONS
// ============================================================================

/**
 * Send booking confirmation email
 *
 * Fetches complete booking data and sends confirmation email to the customer.
 * Used after successful payment processing.
 *
 * @param supabase - Supabase client (admin client for webhooks)
 * @param bookingId - The booking ID
 * @param locale - Language for the email (defaults to 'en')
 */
export async function sendBookingConfirmation(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  locale: string = 'en'
): Promise<SendBookingEmailResult> {
  // Check if email is enabled
  if (!isEmailEnabled()) {
    console.log('[Email] Skipping booking confirmation - email not configured');
    return { success: false, error: 'Email not configured' };
  }

  try {
    // Fetch booking with all relations
    const booking = await getBookingWithRelations(supabase, bookingId);

    if (!booking) {
      console.error('[Email] Booking not found:', bookingId);
      return { success: false, error: 'Booking not found' };
    }

    // Fetch tenant for branding
    const tenant = await getTenantById(supabase, booking.tenantId);

    if (!tenant) {
      console.error('[Email] Tenant not found:', booking.tenantId);
      return { success: false, error: 'Tenant not found' };
    }

    // Check if tenant has this email type enabled
    if (!shouldSendEmail(tenant, 'confirmation')) {
      console.log('[Email] Skipping booking confirmation - disabled for tenant:', tenant.id);
      return { success: true, error: undefined }; // Return success as it's intentionally skipped
    }

    // Get customer email
    const customerEmail = booking.customer?.email || booking.driverInfo?.email;

    if (!customerEmail) {
      console.error('[Email] No customer email for booking:', bookingId);
      return { success: false, error: 'No customer email' };
    }

    // Build email props
    const emailProps = buildConfirmationEmailProps({
      booking,
      tenant,
      locale,
    });

    // Get tenant email options
    const emailOptions = buildEmailOptionsFromTenant(tenant);

    // Send the email
    const result = await sendBookingConfirmationEmail(customerEmail, emailProps, {
      locale,
      ...emailOptions,
    });

    if (result.success) {
      console.log('[Email] Booking confirmation sent:', {
        bookingId,
        reference: booking.reference,
        email: customerEmail,
        emailId: result.id,
      });
    } else {
      console.error('[Email] Failed to send booking confirmation:', result.error);
    }

    return {
      success: result.success,
      emailId: result.id,
      error: result.error,
    };
  } catch (error) {
    console.error('[Email] Error sending booking confirmation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send booking cancellation email
 */
export async function sendBookingCancellation(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  cancellation: {
    cancelledBy: 'customer' | 'staff' | 'system';
    reason?: string;
    reasonType?: string;
    cancelledAt: string;
  },
  refund: {
    originalAmount: number;
    refundAmount: number;
    cancellationFee: number;
    refundPercent: number;
    policyTier: 'full' | 'partial' | 'none';
    status: 'pending' | 'processing' | 'completed' | 'failed';
  },
  locale: string = 'en'
): Promise<SendBookingEmailResult> {
  if (!isEmailEnabled()) {
    console.log('[Email] Skipping cancellation email - email not configured');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const booking = await getBookingWithRelations(supabase, bookingId);

    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    const tenant = await getTenantById(supabase, booking.tenantId);

    if (!tenant) {
      return { success: false, error: 'Tenant not found' };
    }

    // Check if tenant has this email type enabled
    if (!shouldSendEmail(tenant, 'cancellation')) {
      console.log('[Email] Skipping cancellation email - disabled for tenant:', tenant.id);
      return { success: true, error: undefined };
    }

    const customerEmail = booking.customer?.email || booking.driverInfo?.email;

    if (!customerEmail) {
      return { success: false, error: 'No customer email' };
    }

    const emailProps = buildCancellationEmailProps(
      { booking, tenant, locale },
      cancellation,
      refund
    );

    // Get tenant email options
    const emailOptions = buildEmailOptionsFromTenant(tenant);

    const result = await sendBookingCancellationEmail(customerEmail, emailProps, {
      locale,
      ...emailOptions,
    });

    if (result.success) {
      console.log('[Email] Booking cancellation sent:', {
        bookingId,
        reference: booking.reference,
        email: customerEmail,
      });
    }

    return {
      success: result.success,
      emailId: result.id,
      error: result.error,
    };
  } catch (error) {
    console.error('[Email] Error sending cancellation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send booking reminder email
 */
export async function sendBookingReminder(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  locale: string = 'en'
): Promise<SendBookingEmailResult> {
  if (!isEmailEnabled()) {
    console.log('[Email] Skipping reminder email - email not configured');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const booking = await getBookingWithRelations(supabase, bookingId);

    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    const tenant = await getTenantById(supabase, booking.tenantId);

    if (!tenant) {
      return { success: false, error: 'Tenant not found' };
    }

    // Check if tenant has this email type enabled
    if (!shouldSendEmail(tenant, 'reminder')) {
      console.log('[Email] Skipping reminder email - disabled for tenant:', tenant.id);
      return { success: true, error: undefined };
    }

    const customerEmail = booking.customer?.email || booking.driverInfo?.email;

    if (!customerEmail) {
      return { success: false, error: 'No customer email' };
    }

    // Calculate time until pickup
    const now = new Date();
    const pickupDate = new Date(booking.pickupAt);
    const diffMs = pickupDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    // Format the time until pickup
    let formatted: string;
    if (diffDays === 0) {
      if (diffHours <= 1) {
        formatted = 'in about an hour';
      } else {
        formatted = `in ${diffHours} hours`;
      }
    } else if (diffDays === 1) {
      formatted = 'tomorrow';
    } else {
      formatted = `in ${diffDays} days`;
    }

    const emailProps = buildReminderEmailProps(
      { booking, tenant, locale },
      { hours: diffHours, days: diffDays, formatted }
    );

    // Get tenant email options
    const emailOptions = buildEmailOptionsFromTenant(tenant);

    const result = await sendBookingReminderEmail(customerEmail, emailProps, {
      locale,
      ...emailOptions,
    });

    if (result.success) {
      console.log('[Email] Booking reminder sent:', {
        bookingId,
        reference: booking.reference,
        email: customerEmail,
        timeUntilPickup: formatted,
      });
    }

    return {
      success: result.success,
      emailId: result.id,
      error: result.error,
    };
  } catch (error) {
    console.error('[Email] Error sending reminder email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send booking modification email
 *
 * Fetches complete booking data and sends modification email to the customer.
 * Used after a booking has been modified (dates, locations, or add-ons changed).
 *
 * @param supabase - Supabase client
 * @param bookingId - The booking ID
 * @param modification - Details about what was modified
 * @param locale - Language for the email (defaults to 'en')
 */
export async function sendBookingModification(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  modification: {
    modifiedBy: 'customer' | 'staff';
    changes: {
      dates?: {
        oldPickup: string;
        newPickup: string;
        oldReturn: string;
        newReturn: string;
      };
      pickupLocation?: {
        oldBranch: string;
        newBranch: string;
        newAddress: string;
        newCity: string;
      };
      returnLocation?: {
        oldBranch: string;
        newBranch: string;
        newAddress: string;
        newCity: string;
      };
      addons?: {
        added: { name: string; quantity: number; price: number }[];
        removed: { name: string }[];
      };
    };
    originalPricing: BookingPricing;
    newPricing: BookingPricing;
    priceDifference: number;
    requiresPayment: boolean;
    requiresRefund: boolean;
    paymentStatus?: 'pending' | 'completed' | 'processing';
  },
  locale: string = 'en'
): Promise<SendBookingEmailResult> {
  if (!isEmailEnabled()) {
    console.log('[Email] Skipping modification email - email not configured');
    return { success: false, error: 'Email not configured' };
  }

  try {
    // Fetch updated booking with all relations
    const booking = await getBookingWithRelations(supabase, bookingId);

    if (!booking) {
      console.error('[Email] Booking not found:', bookingId);
      return { success: false, error: 'Booking not found' };
    }

    // Fetch tenant for branding
    const tenant = await getTenantById(supabase, booking.tenantId);

    if (!tenant) {
      console.error('[Email] Tenant not found:', booking.tenantId);
      return { success: false, error: 'Tenant not found' };
    }

    // Check if tenant has this email type enabled
    if (!shouldSendEmail(tenant, 'modification')) {
      console.log('[Email] Skipping modification email - disabled for tenant:', tenant.id);
      return { success: true, error: undefined };
    }

    // Get customer email
    const customerEmail = booking.customer?.email || booking.driverInfo?.email;

    if (!customerEmail) {
      console.error('[Email] No customer email for booking:', bookingId);
      return { success: false, error: 'No customer email' };
    }

    // Build email props
    const emailProps = buildModificationEmailProps(
      { booking, tenant, locale },
      {
        ...modification,
        modifiedAt: new Date().toISOString(),
      }
    );

    // Get tenant email options
    const emailOptions = buildEmailOptionsFromTenant(tenant);

    // Send the email
    const result = await sendBookingModificationEmail(customerEmail, emailProps, {
      locale,
      ...emailOptions,
    });

    if (result.success) {
      console.log('[Email] Booking modification sent:', {
        bookingId,
        reference: booking.reference,
        email: customerEmail,
        emailId: result.id,
        modifiedBy: modification.modifiedBy,
        priceDifference: modification.priceDifference,
      });
    } else {
      console.error('[Email] Failed to send booking modification:', result.error);
    }

    return {
      success: result.success,
      emailId: result.id,
      error: result.error,
    };
  } catch (error) {
    console.error('[Email] Error sending booking modification email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
