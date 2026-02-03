import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';

import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { Spinner } from '@/components/ui/spinner';

import type { Metadata } from 'next';

interface ResetPasswordPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Generate metadata for the reset password page
 */
export async function generateMetadata({ params }: ResetPasswordPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return {
    title: t('resetPasswordTitle'),
    description: t('resetPasswordDescription'),
  };
}

/**
 * Reset Password Page
 *
 * Server component that renders the reset password form.
 * This page is accessed via the link in the password reset email.
 * Uses Suspense for the client-side form component.
 */
export default async function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t('resetPasswordTitle')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('resetPasswordSubtitle')}
        </p>
      </div>

      {/* Reset Password Form */}
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
