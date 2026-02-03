/**
 * User Email Helpers
 *
 * Transforms user data into email template props and sends user-related emails.
 * Used for registration welcome emails, password reset confirmations, etc.
 */

import { getTenantEmailBranding, type WelcomeEmailProps } from '@/emails';
import { getTenantById } from '@/lib/tenant/queries';

import { sendWelcomeEmail as sendWelcomeEmailTemplate, isEmailEnabled } from './send';

import type { Database, Tenant } from '@/lib/supabase/types';
import type { SupabaseClient } from '@supabase/supabase-js';


// ============================================================================
// TYPES
// ============================================================================

export interface SendUserEmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

export interface UserEmailContext {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
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
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'carrental.app';
    return `https://${tenant.slug}.${appDomain}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'https://carrental.app';
}

// ============================================================================
// EMAIL BUILDERS
// ============================================================================

/**
 * Build welcome email props from user data
 */
export function buildWelcomeEmailProps(
  context: UserEmailContext,
  options?: {
    requiresVerification?: boolean;
    verificationUrl?: string;
    specialOffer?: {
      code: string;
      discount: string;
      expiresAt?: string;
      description: string;
    };
  }
): WelcomeEmailProps {
  const { user, tenant, locale = 'en' } = context;
  const baseUrl = context.baseUrl || getTenantBaseUrl(tenant);

  const branding = getTenantEmailBranding(tenant);

  return {
    branding,
    user: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    },
    requiresVerification: options?.requiresVerification,
    verificationUrl: options?.verificationUrl,
    urls: {
      browseFleet: `${baseUrl}/${locale}/fleet`,
      login: `${baseUrl}/${locale}/login`,
      completeProfile: `${baseUrl}/${locale}/account/profile`,
      help: `${baseUrl}/${locale}/contact`,
    },
    specialOffer: options?.specialOffer,
    locale,
  };
}

// ============================================================================
// EMAIL SENDING FUNCTIONS
// ============================================================================

/**
 * Send welcome email to a newly registered user
 *
 * Fetches user and tenant data, then sends the welcome email.
 * Should be called after successful email verification.
 *
 * @param supabase - Supabase client (admin client recommended for webhooks)
 * @param userId - The user's auth ID (from Supabase Auth)
 * @param locale - Language for the email (defaults to 'en')
 */
export async function sendWelcome(
  supabase: SupabaseClient<Database>,
  userId: string,
  locale: string = 'en'
): Promise<SendUserEmailResult> {
  // Check if email is enabled
  if (!isEmailEnabled()) {
    console.log('[Email] Skipping welcome email - email not configured');
    return { success: false, error: 'Email not configured' };
  }

  try {
    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, tenant_id')
      .eq('auth_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('[Email] User profile not found:', userId, profileError);
      return { success: false, error: 'User profile not found' };
    }

    if (!profile.email) {
      console.error('[Email] User has no email:', userId);
      return { success: false, error: 'User has no email' };
    }

    if (!profile.tenant_id) {
      console.error('[Email] User has no tenant:', userId);
      return { success: false, error: 'User has no tenant' };
    }

    // Fetch tenant for branding
    const tenant = await getTenantById(supabase, profile.tenant_id);

    if (!tenant) {
      console.error('[Email] Tenant not found:', profile.tenant_id);
      return { success: false, error: 'Tenant not found' };
    }

    // Build email props
    const emailProps = buildWelcomeEmailProps({
      user: {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name || undefined,
        lastName: profile.last_name || undefined,
      },
      tenant,
      locale,
    });

    // Send the email
    const result = await sendWelcomeEmailTemplate(profile.email, emailProps, { locale });

    if (result.success) {
      console.log('[Email] Welcome email sent:', {
        userId,
        email: profile.email,
        emailId: result.id,
      });
    } else {
      console.error('[Email] Failed to send welcome email:', result.error);
    }

    return {
      success: result.success,
      emailId: result.id,
      error: result.error,
    };
  } catch (error) {
    console.error('[Email] Error sending welcome email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send welcome email by email address (when we don't have auth_id yet)
 *
 * Useful when the user profile might not be fully set up yet.
 *
 * @param supabase - Supabase client
 * @param email - User's email address
 * @param tenantId - Tenant ID for branding
 * @param userData - Optional user data (firstName, lastName)
 * @param locale - Language for the email
 */
export async function sendWelcomeByEmail(
  supabase: SupabaseClient<Database>,
  email: string,
  tenantId: string,
  userData?: { firstName?: string; lastName?: string },
  locale: string = 'en'
): Promise<SendUserEmailResult> {
  if (!isEmailEnabled()) {
    console.log('[Email] Skipping welcome email - email not configured');
    return { success: false, error: 'Email not configured' };
  }

  try {
    // Fetch tenant for branding
    const tenant = await getTenantById(supabase, tenantId);

    if (!tenant) {
      console.error('[Email] Tenant not found:', tenantId);
      return { success: false, error: 'Tenant not found' };
    }

    // Build email props
    const emailProps = buildWelcomeEmailProps({
      user: {
        id: '',
        email,
        firstName: userData?.firstName,
        lastName: userData?.lastName,
      },
      tenant,
      locale,
    });

    // Send the email
    const result = await sendWelcomeEmailTemplate(email, emailProps, { locale });

    if (result.success) {
      console.log('[Email] Welcome email sent:', {
        email,
        emailId: result.id,
      });
    } else {
      console.error('[Email] Failed to send welcome email:', result.error);
    }

    return {
      success: result.success,
      emailId: result.id,
      error: result.error,
    };
  } catch (error) {
    console.error('[Email] Error sending welcome email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
