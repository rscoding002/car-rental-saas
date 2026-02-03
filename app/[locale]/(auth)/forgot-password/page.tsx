import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';

import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { Spinner } from '@/components/ui/spinner';

import type { Metadata } from 'next';

interface ForgotPasswordPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Generate metadata for the forgot password page
 */
export async function generateMetadata({ params }: ForgotPasswordPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return {
    title: t('forgotPasswordTitle'),
    description: t('forgotPasswordDescription'),
  };
}

/**
 * Forgot Password Page
 *
 * Server component that renders the forgot password form.
 * Uses Suspense for the client-side form component.
 */
export default async function ForgotPasswordPage({ params }: ForgotPasswordPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t('forgotPasswordTitle')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('forgotPasswordSubtitle')}
        </p>
      </div>

      {/* Forgot Password Form */}
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        }
      >
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
