'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';

import { useAuth } from '@/lib/auth/use-auth';
import { authConfig } from '@/lib/auth/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

/**
 * Reset Password Form Component
 *
 * Form for setting a new password after clicking the reset link.
 * Mobile-first responsive design.
 */
export function ResetPasswordForm() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { updatePassword } = useAuth();

  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateForm = (): string | null => {
    if (!password || !confirmPassword) {
      return t('errorRequired');
    }

    if (password !== confirmPassword) {
      return t('errorPasswordMismatch');
    }

    if (password.length < authConfig.passwordRequirements.minLength) {
      return t('errorWeakPassword');
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      // Validate form
      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        setIsSubmitting(false);
        return;
      }

      const result = await updatePassword(password);

      if (result.error) {
        setError(result.error.message);
      } else {
        setSuccess(true);
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch {
      setError(tCommon('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show success message after password reset
  if (success) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground">
              {t('passwordResetSuccess')}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('redirectingToLogin')}
            </p>
          </div>
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

      {/* New Password Field */}
      <Input
        type={showPassword ? 'text' : 'password'}
        label={t('newPassword')}
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        leftIcon={<Lock className="h-4 w-4" />}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="focus:outline-none"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        }
        hint={t('passwordHint')}
        required
        autoComplete="new-password"
        disabled={isSubmitting}
      />

      {/* Confirm Password Field */}
      <Input
        type={showConfirmPassword ? 'text' : 'password'}
        label={t('confirmPassword')}
        placeholder="••••••••"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        leftIcon={<Lock className="h-4 w-4" />}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="focus:outline-none"
            tabIndex={-1}
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        }
        required
        autoComplete="new-password"
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
        {t('resetPassword')}
      </Button>

      {/* Back to Login Link */}
      <p className="text-center text-sm text-muted-foreground">
        {t('rememberPassword')}{' '}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          {t('loginButton')}
        </Link>
      </p>
    </form>
  );
}
