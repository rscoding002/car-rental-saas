'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import type { UserProfile, UserUpdate } from '@/lib/supabase/types';

/**
 * Profile Update Schema
 * Validates user profile data before updating
 */
export const profileUpdateSchema = z.object({
  firstName: z
    .string()
    .max(100, 'First name is too long')
    .optional()
    .nullable(),
  lastName: z
    .string()
    .max(100, 'Last name is too long')
    .optional()
    .nullable(),
  phone: z
    .string()
    .max(50, 'Phone number is too long')
    .optional()
    .nullable(),
  avatarUrl: z
    .string()
    .url('Invalid avatar URL')
    .optional()
    .nullable(),
  profile: z
    .object({
      dateOfBirth: z.string().optional(),
      driverLicense: z
        .object({
          number: z.string().optional(),
          expiryDate: z.string().optional(),
          country: z.string().optional(),
        })
        .optional(),
      address: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          postalCode: z.string().optional(),
          country: z.string().optional(),
        })
        .optional(),
      preferences: z
        .object({
          language: z.string().optional(),
          newsletter: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/**
 * Response type for profile actions
 */
export interface ProfileActionResult {
  success: boolean;
  error?: string;
  data?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    avatarUrl: string | null;
    profile: UserProfile;
  };
}

/**
 * Get current user's profile
 */
export async function getCurrentUserProfile(): Promise<ProfileActionResult> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Get user profile from public.users
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authUser.id)
      .single();

    if (profileError) {
      return {
        success: false,
        error: 'Failed to fetch profile',
      };
    }

    return {
      success: true,
      data: {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        phone: profile.phone,
        avatarUrl: profile.avatar_url,
        profile: profile.profile,
      },
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Update current user's profile
 *
 * @param input - Profile data to update
 * @returns Result with updated profile or error
 */
export async function updateUserProfile(
  input: ProfileUpdateInput
): Promise<ProfileActionResult> {
  try {
    // Validate input
    const validationResult = profileUpdateSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Invalid input',
      };
    }

    const validatedData = validationResult.data;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Get current user profile to merge profile JSONB
    const { data: currentProfile, error: fetchError } = await supabase
      .from('users')
      .select('profile')
      .eq('auth_id', authUser.id)
      .single();

    if (fetchError) {
      return {
        success: false,
        error: 'Failed to fetch current profile',
      };
    }

    // Build update object
    const updateData: UserUpdate = {};

    if (validatedData.firstName !== undefined) {
      updateData.first_name = validatedData.firstName;
    }
    if (validatedData.lastName !== undefined) {
      updateData.last_name = validatedData.lastName;
    }
    if (validatedData.phone !== undefined) {
      updateData.phone = validatedData.phone;
    }
    if (validatedData.avatarUrl !== undefined) {
      updateData.avatar_url = validatedData.avatarUrl;
    }

    // Merge profile JSONB if provided
    if (validatedData.profile) {
      const existingProfile = (currentProfile?.profile || {}) as UserProfile;
      updateData.profile = {
        ...existingProfile,
        ...(validatedData.profile.dateOfBirth !== undefined && {
          dateOfBirth: validatedData.profile.dateOfBirth,
        }),
        ...(validatedData.profile.driverLicense && {
          driverLicense: {
            ...existingProfile.driverLicense,
            ...validatedData.profile.driverLicense,
          },
        }),
        ...(validatedData.profile.address && {
          address: {
            ...existingProfile.address,
            ...validatedData.profile.address,
          },
        }),
        ...(validatedData.profile.preferences && {
          preferences: {
            ...existingProfile.preferences,
            ...validatedData.profile.preferences,
          },
        }),
      };
    }

    // Update user profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('auth_id', authUser.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Profile update error:', updateError);
      return {
        success: false,
        error: 'Failed to update profile',
      };
    }

    // Also update Supabase Auth metadata if name changed
    if (validatedData.firstName !== undefined || validatedData.lastName !== undefined) {
      await supabase.auth.updateUser({
        data: {
          first_name: validatedData.firstName ?? updatedProfile.first_name,
          last_name: validatedData.lastName ?? updatedProfile.last_name,
        },
      });
    }

    // Revalidate account pages
    revalidatePath('/account');
    revalidatePath('/account/profile');

    return {
      success: true,
      data: {
        id: updatedProfile.id,
        email: updatedProfile.email,
        firstName: updatedProfile.first_name,
        lastName: updatedProfile.last_name,
        phone: updatedProfile.phone,
        avatarUrl: updatedProfile.avatar_url,
        profile: updatedProfile.profile,
      },
    };
  } catch (error) {
    console.error('Error updating profile:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Update user's avatar URL
 *
 * @param avatarUrl - New avatar URL (or null to remove)
 */
export async function updateUserAvatar(
  avatarUrl: string | null
): Promise<ProfileActionResult> {
  return updateUserProfile({ avatarUrl });
}

/**
 * Update user's notification preferences
 *
 * @param newsletter - Whether to receive newsletter emails
 */
export async function updateNotificationPreferences(
  newsletter: boolean
): Promise<ProfileActionResult> {
  return updateUserProfile({
    profile: {
      preferences: {
        newsletter,
      },
    },
  });
}

/**
 * Update user's language preference
 *
 * @param language - Preferred language code (en, lt, ru)
 */
export async function updateLanguagePreference(
  language: string
): Promise<ProfileActionResult> {
  return updateUserProfile({
    profile: {
      preferences: {
        language,
      },
    },
  });
}

/**
 * Password Change Schema
 * Validates password change input
 */
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-zA-Z])(?=.*[0-9])/,
      'Password must contain letters and numbers'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

/**
 * Password change result
 */
export interface PasswordChangeResult {
  success: boolean;
  error?: string;
}

/**
 * Change user's password
 *
 * Requires the current password for verification and a new password.
 * Uses Supabase Auth to update the password.
 *
 * @param input - Current password, new password, and confirmation
 * @returns Result indicating success or error
 */
export async function changePassword(
  input: PasswordChangeInput
): Promise<PasswordChangeResult> {
  try {
    // Validate input
    const validationResult = passwordChangeSchema.safeParse(input);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return {
        success: false,
        error: firstError?.message || 'Invalid input',
      };
    }

    const { currentPassword, newPassword } = validationResult.data;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      return {
        success: false,
        error: 'Current password is incorrect',
      };
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      return {
        success: false,
        error: 'Failed to update password',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Password change error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Sign out action result
 */
export interface SignOutResult {
  success: boolean;
  error?: string;
}

/**
 * Sign out the current user
 *
 * Server action for signing out. Can be used directly from forms
 * or called programmatically from server components.
 *
 * @param redirectTo - Optional URL to redirect to after sign out (default: /login)
 */
export async function signOutAction(redirectTo?: string): Promise<SignOutResult> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Sign out error:', error);
      return {
        success: false,
        error: 'Failed to sign out',
      };
    }

    // Revalidate all paths to clear cached user data
    revalidatePath('/', 'layout');

    // Redirect if specified
    if (redirectTo) {
      redirect(redirectTo);
    }

    return { success: true };
  } catch (error) {
    // redirect() throws a special error, so we need to re-throw it
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error;
    }

    console.error('Sign out error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Sign out and redirect to login page
 * Convenience function for common logout flow
 */
export async function signOutAndRedirectToLogin(): Promise<never> {
  await signOutAction('/login');
  // This line is never reached due to redirect
  throw new Error('Redirect failed');
}
