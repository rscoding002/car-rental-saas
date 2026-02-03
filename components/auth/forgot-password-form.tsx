'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Mail, ArrowLeft } from 'lucide-react';

import { useAuth } from '@/lib/auth/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

/**
 * Forgot Password Form Component
 *
 * Form for requesting a password reset email.
 * Mobile-first responsive design.
 */
export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const { forgotPassword } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      if (!email) {
        setError(t('errorRequired'));
        setIsSubmitting(false);
        return;
      }

      const result = await forgotPassword(email);

      if (result.error) {
        setError(result.error.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError(tCommon('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show success message after sending reset email
  if (success) {
    return (
      <div className="space-y-6">
        <Alert variant="success">
          {t('successPasswordReset')}
        </Alert>
        <p className="text-center text-sm text-muted-foreground">
          {t('checkEmailInstructions')}
        </p>
        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Form Error Alert */}
      {error && (
        <Alert variant="destructive" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Email Field */}
      <Input
        type="email"
        label={t('email')}
        placeholder="name@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        leftIcon={<Mail className="h-4 w-4" />}
        required
        autoComplete="email"
        disabled={isSubmitting}
      />

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        isLoading={isSubmitting}
        disabled={isSubmitting}
      >
        {t('sendResetLink')}
      </Button>

      {/* Back to Login Link */}
      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToLogin')}
        </Link>
      </div>
    </form>
  );
}
