'use client';

import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import {
  User,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/utils/cn';
import { BookingStepWrapper } from './booking-form';
import { useBooking } from './booking-context';
import { useAuth } from '@/lib/auth/use-auth';
import type { DriverInfo } from '@/lib/supabase/types';

// ============================================================================
// SCHEMAS
// ============================================================================

const phoneRegex = /^[+]?[\d\s\-().]+$/;

const driverLicenseSchema = z.object({
  number: z.string().optional(),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
    .optional()
    .or(z.literal('')),
  country: z.string().optional(),
});

const driverDetailsSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .min(7, 'Phone number is too short')
    .max(20, 'Phone number is too long')
    .regex(phoneRegex, 'Invalid phone number format'),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
    .optional()
    .or(z.literal('')),
  driverLicense: driverLicenseSchema.optional(),
});

type DriverDetailsFormData = z.infer<typeof driverDetailsSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface BookingStepDetailsProps {
  /** Locale for translations */
  locale: string;

  /** Custom class name */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Booking Step 3: Customer Details and Driver Information
 *
 * Collects driver information required for the rental.
 * Pre-fills from logged-in user profile when available.
 *
 * Mobile-first design with collapsible license section.
 */
export function BookingStepDetails({
  locale,
  className,
}: BookingStepDetailsProps) {
  const t = useTranslations('booking');
  const tAuth = useTranslations('auth');
  const tAccount = useTranslations('account');
  const tCommon = useTranslations('common');

  const { state, setStep3Data } = useBooking();
  const { user } = useAuth();
  const { step3Data } = state;

  // License section expanded state
  const [showLicense, setShowLicense] = useState(false);

  // Initialize form with existing data or user profile
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
  } = useForm<DriverDetailsFormData>({
    resolver: zodResolver(driverDetailsSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: step3Data?.driverInfo?.firstName || '',
      lastName: step3Data?.driverInfo?.lastName || '',
      email: step3Data?.driverInfo?.email || '',
      phone: step3Data?.driverInfo?.phone || '',
      dateOfBirth: step3Data?.driverInfo?.dateOfBirth || '',
      driverLicense: {
        number: step3Data?.driverInfo?.driverLicense?.number || '',
        expiryDate: step3Data?.driverInfo?.driverLicense?.expiryDate || '',
        country: step3Data?.driverInfo?.driverLicense?.country || '',
      },
    },
  });

  // Pre-fill from user profile if available and form is empty
  useEffect(() => {
    if (user && !step3Data?.driverInfo) {
      // Pre-fill from database user profile
      if (user.email && !watch('email')) {
        setValue('email', user.email);
      }
      if (user.first_name && !watch('firstName')) {
        setValue('firstName', user.first_name);
      }
      if (user.last_name && !watch('lastName')) {
        setValue('lastName', user.last_name);
      }
      if (user.phone && !watch('phone')) {
        setValue('phone', user.phone);
      }
    }
  }, [user, step3Data, setValue, watch]);

  // Check if license has any data
  const licenseData = watch('driverLicense');
  const hasLicenseData =
    licenseData?.number || licenseData?.expiryDate || licenseData?.country;

  // Auto-expand license section if it has data
  useEffect(() => {
    if (hasLicenseData && !showLicense) {
      setShowLicense(true);
    }
  }, [hasLicenseData, showLicense]);

  // Form submission handler
  const onSubmit = useCallback(
    (data: DriverDetailsFormData): boolean => {
      // Build driver info object
      const driverInfo: DriverInfo = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
      };

      // Add optional fields if provided
      if (data.dateOfBirth) {
        driverInfo.dateOfBirth = data.dateOfBirth;
      }

      // Add license info if any field is filled
      if (data.driverLicense?.number || data.driverLicense?.expiryDate || data.driverLicense?.country) {
        driverInfo.driverLicense = {};
        if (data.driverLicense.number) {
          driverInfo.driverLicense.number = data.driverLicense.number;
        }
        if (data.driverLicense.expiryDate) {
          driverInfo.driverLicense.expiryDate = data.driverLicense.expiryDate;
        }
        if (data.driverLicense.country) {
          driverInfo.driverLicense.country = data.driverLicense.country;
        }
      }

      // Save to context
      setStep3Data({ driverInfo });
      return true;
    },
    [setStep3Data]
  );

  // Validation function for step wrapper
  const validateStep = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      handleSubmit(
        (data) => {
          const success = onSubmit(data);
          resolve(success);
        },
        () => {
          resolve(false);
        }
      )();
    });
  }, [handleSubmit, onSubmit]);

  return (
    <BookingStepWrapper
      step={3}
      title={t('steps.details')}
      description={t('customerDetails')}
      onNext={validateStep}
      nextDisabled={!isValid}
      className={className}
    >
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        {/* Primary Driver Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              {t('primaryDriver')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name Row */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* First Name */}
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  {tAuth('firstName')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  {...register('firstName')}
                  placeholder={tAuth('firstName')}
                  className={cn(errors.firstName && 'border-destructive')}
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName.message}</p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  {tAuth('lastName')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  {...register('lastName')}
                  placeholder={tAuth('lastName')}
                  className={cn(errors.lastName && 'border-destructive')}
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Contact Row */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  {tAuth('email')} <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="email@example.com"
                    className={cn('pl-10', errors.email && 'border-destructive')}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">
                  {tAuth('phone')} <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    {...register('phone')}
                    placeholder="+370 600 00000"
                    className={cn('pl-10', errors.phone && 'border-destructive')}
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">
                {tAccount('dateOfBirth')} <span className="text-muted-foreground">({tCommon('optional')})</span>
              </Label>
              <div className="relative max-w-xs">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="dateOfBirth"
                  type="date"
                  {...register('dateOfBirth')}
                  className={cn('pl-10', errors.dateOfBirth && 'border-destructive')}
                />
              </div>
              {errors.dateOfBirth && (
                <p className="text-sm text-destructive">{errors.dateOfBirth.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Driver's License Card (Collapsible) */}
        <Card>
          <CardHeader
            className="cursor-pointer pb-4"
            onClick={() => setShowLicense(!showLicense)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5" />
                {tAccount('driverLicense')}
                <span className="text-sm font-normal text-muted-foreground">
                  ({tCommon('optional')})
                </span>
              </CardTitle>
              <Button variant="ghost" size="sm" type="button">
                {showLicense ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>

          {showLicense && (
            <CardContent className="space-y-4 border-t pt-4">
              <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  You can provide your driver&apos;s license details now or present it at pickup.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* License Number */}
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">{tAccount('licenseNumber')}</Label>
                  <Input
                    id="licenseNumber"
                    {...register('driverLicense.number')}
                    placeholder="AB123456"
                  />
                </div>

                {/* License Country */}
                <div className="space-y-2">
                  <Label htmlFor="licenseCountry">{tAccount('licenseCountry')}</Label>
                  <Input
                    id="licenseCountry"
                    {...register('driverLicense.country')}
                    placeholder="Lithuania"
                  />
                </div>
              </div>

              {/* License Expiry */}
              <div className="space-y-2">
                <Label htmlFor="licenseExpiry">{tAccount('licenseExpiry')}</Label>
                <div className="relative max-w-xs">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="licenseExpiry"
                    type="date"
                    {...register('driverLicense.expiryDate')}
                    className="pl-10"
                  />
                </div>
                {errors.driverLicense?.expiryDate && (
                  <p className="text-sm text-destructive">
                    {errors.driverLicense.expiryDate.message}
                  </p>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Age Requirements Notice */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <div className="ml-2">
            <p className="text-sm font-medium">Driver Requirements</p>
            <p className="text-sm text-muted-foreground">
              The primary driver must be at least 21 years old and hold a valid driver&apos;s license.
              Additional fees may apply for drivers under 25.
            </p>
          </div>
        </Alert>
      </form>
    </BookingStepWrapper>
  );
}
