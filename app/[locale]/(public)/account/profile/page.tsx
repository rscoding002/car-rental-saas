import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Lock } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { ProfileForm } from './profile-form';
import { PasswordChangeForm } from './password-change-form';

interface ProfilePageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Profile Page
 *
 * Customer profile settings page with editable fields for:
 * - Personal information (name, date of birth)
 * - Contact information (phone)
 * - Driver's license information
 * - Address
 * - Preferences (newsletter, language)
 * - Password change (security section)
 *
 * Mobile-first design with responsive layout.
 */
export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const t = await getTranslations('account');

  // Get authenticated user
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect(`/${locale}/login?redirect_to=/${locale}/account/profile`);
  }

  // Get user profile from public.users
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authUser.id)
    .single();

  if (error || !user) {
    redirect(`/${locale}/login`);
  }

  // Prepare profile data for the form
  const profileData = {
    id: user.id,
    email: user.email,
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    phone: user.phone || '',
    avatarUrl: user.avatar_url || '',
    profile: {
      dateOfBirth: user.profile?.dateOfBirth || '',
      driverLicense: {
        number: user.profile?.driverLicense?.number || '',
        expiryDate: user.profile?.driverLicense?.expiryDate || '',
        country: user.profile?.driverLicense?.country || '',
      },
      address: {
        street: user.profile?.address?.street || '',
        city: user.profile?.address?.city || '',
        postalCode: user.profile?.address?.postalCode || '',
        country: user.profile?.address?.country || '',
      },
      preferences: {
        language: user.profile?.preferences?.language || locale,
        newsletter: user.profile?.preferences?.newsletter || false,
      },
    },
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('profile')}</h1>
        <p className="text-muted-foreground mt-1">{t('editProfile')}</p>
      </div>

      {/* Profile Form */}
      <ProfileForm initialData={profileData} locale={locale} />

      {/* Security Section Divider */}
      <div className="border-t border-border pt-8">
        <div className="flex items-center gap-2 mb-6">
          <Lock className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            {t('security')}
          </h2>
        </div>

        {/* Password Change Form */}
        <div className="max-w-md">
          <PasswordChangeForm />
        </div>
      </div>
    </div>
  );
}
