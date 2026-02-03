import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';

import { VerifyEmailContent } from '@/components/auth/verify-email-content';
import { Spinner } from '@/components/ui/spinner';

import type { Metadata } from 'next';

interface VerifyEmailPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Generate metadata for the verify email page
 */
export async function generateMetadata({ params }: VerifyEmailPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return {
    title: t('verifyEmailTitle'),
    description: t('verifyEmailDescription'),
  };
}

/**
 * Verify Email Page
 *
 * This page handles email verification states:
 * - Success: When user clicks verification link and it's valid
 * - Error: When verification fails
 * - Pending: When user needs to check their email
 */
export default async function VerifyEmailPage({ params, searchParams }: VerifyEmailPageProps) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const t = await getTranslations({ locale, namespace: 'auth' });

  // Check for success or error states from URL params
  const verified = resolvedSearchParams.verified === 'true';
  const error = resolvedSearchParams.error as string | undefined;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {verified ? t('emailVerifiedTitle') : t('verifyEmailTitle')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {verified ? t('emailVerifiedSubtitle') : t('verifyEmailSubtitle')}
        </p>
      </div>

      {/* Verify Email Content */}
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        }
      >
        <VerifyEmailContent verified={verified} error={error} />
      </Suspense>
    </div>
  );
}
