import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';

import { LoginForm } from '@/components/auth/login-form';
import { Spinner } from '@/components/ui/spinner';

import type { Metadata } from 'next';

interface LoginPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Generate metadata for the login page
 */
export async function generateMetadata({ params }: LoginPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return {
    title: t('loginTitle'),
    description: t('loginDescription'),
  };
}

/**
 * Login Page
 *
 * Server component that renders the login form.
 * Uses Suspense for the client-side form component.
 */
export default async function LoginPage({ params }: LoginPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t('loginTitle')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('loginSubtitle')}
        </p>
      </div>

      {/* Login Form */}
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
