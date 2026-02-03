'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { User, Phone, MapPin, CreditCard, Mail, Globe, Bell } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert } from '@/components/ui/alert';
import { updateUserProfile, type ProfileUpdateInput } from '@/lib/auth/actions';

interface ProfileFormData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl: string;
  profile: {
    dateOfBirth: string;
    driverLicense: {
      number: string;
      expiryDate: string;
      country: string;
    };
    address: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
    preferences: {
      language: string;
      newsletter: boolean;
    };
  };
}

interface ProfileFormProps {
  initialData: ProfileFormData;
  locale: string;
}

// Common country options
const COUNTRY_OPTIONS = [
  { value: '', label: 'Select Country' },
  { value: 'LT', label: 'Lithuania' },
  { value: 'LV', label: 'Latvia' },
  { value: 'EE', label: 'Estonia' },
  { value: 'PL', label: 'Poland' },
  { value: 'DE', label: 'Germany' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'RU', label: 'Russia' },
  { value: 'BY', label: 'Belarus' },
  { value: 'UA', label: 'Ukraine' },
  { value: 'FR', label: 'France' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'BE', label: 'Belgium' },
  { value: 'SE', label: 'Sweden' },
  { value: 'NO', label: 'Norway' },
  { value: 'FI', label: 'Finland' },
  { value: 'DK', label: 'Denmark' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'lt', label: 'Lietuviu' },
  { value: 'ru', label: 'Russkij' },
];

/**
 * Profile Form Component
 *
 * Mobile-first editable profile form with sections for:
 * - Personal information
 * - Contact information
 * - Driver's license
 * - Address
 * - Preferences
 */
export function ProfileForm({ initialData, locale }: ProfileFormProps) {
  const t = useTranslations('account');
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');
  const tValidation = useTranslations('validation');
  const tLanguage = useTranslations('language');

  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<ProfileFormData>(initialData);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => {
      // Handle nested fields with dot notation
      if (name.includes('.')) {
        const keys = name.split('.');
        const newData = { ...prev };
        let current: Record<string, unknown> = newData;

        for (let i = 0; i < keys.length - 1; i++) {
          const key = keys[i];
          current[key] = { ...(current[key] as Record<string, unknown>) };
          current = current[key] as Record<string, unknown>;
        }

        current[keys[keys.length - 1]] = type === 'checkbox' ? checked : value;
        return newData;
      }

      return {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };
    });

    // Clear messages on change
    setSuccess(false);
    setError(null);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setError(null);

    startTransition(async () => {
      const input: ProfileUpdateInput = {
        firstName: formData.firstName || null,
        lastName: formData.lastName || null,
        phone: formData.phone || null,
        profile: {
          dateOfBirth: formData.profile.dateOfBirth || undefined,
          driverLicense: {
            number: formData.profile.driverLicense.number || undefined,
            expiryDate: formData.profile.driverLicense.expiryDate || undefined,
            country: formData.profile.driverLicense.country || undefined,
          },
          address: {
            street: formData.profile.address.street || undefined,
            city: formData.profile.address.city || undefined,
            postalCode: formData.profile.address.postalCode || undefined,
            country: formData.profile.address.country || undefined,
          },
          preferences: {
            language: formData.profile.preferences.language || undefined,
            newsletter: formData.profile.preferences.newsletter,
          },
        },
      };

      const result = await updateUserProfile(input);

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'An error occurred');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Success/Error Messages */}
      {success && (
        <Alert variant="success" onClose={() => setSuccess(false)}>
          {t('profileUpdated')}
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Personal Information */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            {t('personalInfo')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={tAuth('firstName')}
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder={tAuth('firstName')}
          />

          <Input
            label={tAuth('lastName')}
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder={tAuth('lastName')}
          />

          <Input
            label={t('dateOfBirth')}
            name="profile.dateOfBirth"
            type="date"
            value={formData.profile.dateOfBirth}
            onChange={handleChange}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
      </section>

      {/* Contact Information */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Phone className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            {t('contactInfo')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={tAuth('email')}
            name="email"
            type="email"
            value={formData.email}
            disabled
            leftIcon={<Mail className="h-4 w-4" />}
            hint="Email cannot be changed"
          />

          <Input
            label={tAuth('phone')}
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+370 600 00000"
          />
        </div>
      </section>

      {/* Driver's License */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            {t('driverInfo')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('licenseNumber')}
            name="profile.driverLicense.number"
            value={formData.profile.driverLicense.number}
            onChange={handleChange}
            placeholder="ABC123456"
          />

          <Input
            label={t('licenseExpiry')}
            name="profile.driverLicense.expiryDate"
            type="date"
            value={formData.profile.driverLicense.expiryDate}
            onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
          />

          <Select
            label={t('licenseCountry')}
            name="profile.driverLicense.country"
            value={formData.profile.driverLicense.country}
            onChange={handleChange}
            options={COUNTRY_OPTIONS}
          />
        </div>
      </section>

      {/* Address */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            {t('addressInfo')}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Input
            label={t('street')}
            name="profile.address.street"
            value={formData.profile.address.street}
            onChange={handleChange}
            placeholder="123 Main Street, Apt 4"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label={tCommon('city')}
              name="profile.address.city"
              value={formData.profile.address.city}
              onChange={handleChange}
              placeholder="Vilnius"
            />

            <Input
              label={tCommon('postalCode')}
              name="profile.address.postalCode"
              value={formData.profile.address.postalCode}
              onChange={handleChange}
              placeholder="01234"
            />

            <Select
              label={tCommon('country')}
              name="profile.address.country"
              value={formData.profile.address.country}
              onChange={handleChange}
              options={COUNTRY_OPTIONS}
            />
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            {t('preferences')}
          </h2>
        </div>

        <div className="space-y-4">
          <Select
            label={t('languagePreference')}
            name="profile.preferences.language"
            value={formData.profile.preferences.language}
            onChange={handleChange}
            options={LANGUAGE_OPTIONS}
            leftIcon={<Globe className="h-4 w-4" />}
          />

          <div className="pt-2">
            <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card/50">
              <Checkbox
                name="profile.preferences.newsletter"
                checked={formData.profile.preferences.newsletter}
                onChange={handleChange}
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {t('newsletterSubscription')}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t('newsletterDescription')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Submit Button */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-border">
        <Button
          type="submit"
          isLoading={isPending}
          className="w-full sm:w-auto"
        >
          {isPending ? tCommon('saving') : t('updateProfile')}
        </Button>
      </div>
    </form>
  );
}
