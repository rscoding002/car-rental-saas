import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';

import { RegisterForm } from '@/components/auth/register-form';
import { Spinner } from '@/components/ui/spinner';

import type { Metadata } from 'next';

interface RegisterPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Generate metadata for the registration page
 */
export async function generateMetadata({ params }: RegisterPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return {
    title: t('registerTitle'),
    description: t('registerDescription'),
  };
}

/**
 * Registration Page
 *
 * Server component that renders the registration form.
 * Uses Suspense for the client-side form component.
 */
export default async function RegisterPage({ params }: RegisterPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t('registerTitle')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('registerSubtitle')}
        </p>
      </div>

      {/* Register Form */}
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </div>
  );
}
