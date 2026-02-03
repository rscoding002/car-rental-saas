'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Mail, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

interface VerifyEmailContentProps {
  /** Whether email was successfully verified */
  verified?: boolean;
  /** Error message if verification failed */
  error?: string;
}

/**
 * Verify Email Content Component
 *
 * Shows different states:
 * - Success: Email verified successfully
 * - Error: Verification failed
 * - Pending: Waiting for user to verify (with resend option)
 */
export function VerifyEmailContent({ verified, error }: VerifyEmailContentProps) {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');

  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendError(null);
    setResendSuccess(false);
    setIsResending(true);

    try {
      if (!email) {
        setResendError(t('errorRequired'));
        setIsResending(false);
        return;
      }

      const supabase = createClient();
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (resendErr) {
        setResendError(resendErr.message);
      } else {
        setResendSuccess(true);
      }
    } catch {
      setResendError(tCommon('error'));
    } finally {
      setIsResending(false);
    }
  };

  // Success state - email verified
  if (verified) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-muted-foreground">
              {t('emailVerifiedMessage')}
            </p>
          </div>
        </div>

        <Link href="/login" className="block">
          <Button className="w-full" size="lg">
            {t('loginButton')}
          </Button>
        </Link>
      </div>
    );
  }

  // Error state - verification failed
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-muted-foreground">
              {t('verificationFailedMessage')}
            </p>
          </div>
        </div>

        <Alert variant="destructive">
          {error}
        </Alert>

        {/* Resend form */}
        <form onSubmit={handleResendVerification} className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            {t('resendVerificationPrompt')}
          </p>

          {resendSuccess && (
            <Alert variant="success">
              {t('verificationResent')}
            </Alert>
          )}

          {resendError && (
            <Alert variant="destructive" onClose={() => setResendError(null)}>
              {resendError}
            </Alert>
          )}

          <Input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="h-4 w-4" />}
            required
            disabled={isResending}
          />

          <Button
            type="submit"
            variant="outline"
            className="w-full"
            isLoading={isResending}
            disabled={isResending}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            {t('resendVerificationEmail')}
          </Button>
        </form>
      </div>
    );
  }

  // Pending state - waiting for verification
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-muted-foreground">
            {t('checkEmailForVerification')}
          </p>
        </div>
      </div>

      {/* Resend form */}
      <form onSubmit={handleResendVerification} className="space-y-4">
        <p className="text-center text-sm text-muted-foreground">
          {t('didntReceiveEmail')}
        </p>

        {resendSuccess && (
          <Alert variant="success">
            {t('verificationResent')}
          </Alert>
        )}

        {resendError && (
          <Alert variant="destructive" onClose={() => setResendError(null)}>
            {resendError}
          </Alert>
        )}

        <Input
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="h-4 w-4" />}
          required
          disabled={isResending}
        />

        <Button
          type="submit"
          variant="outline"
          className="w-full"
          isLoading={isResending}
          disabled={isResending}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          {t('resendVerificationEmail')}
        </Button>
      </form>

      <div className="text-center">
        <Link
          href="/login"
          className="text-sm font-medium text-primary hover:underline"
        >
          {t('backToLogin')}
        </Link>
      </div>
    </div>
  );
}
