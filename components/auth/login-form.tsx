'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

import { useAuth } from '@/lib/auth/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

interface LoginFormProps {
  /** URL to redirect to after successful login */
  redirectTo?: string;
}

/**
 * Login Form Component
 *
 * Email/password login form with validation and error handling.
 * Mobile-first responsive design.
 */
export function LoginForm({ redirectTo }: LoginFormProps) {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const { signIn, isLoading: authLoading } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get redirect URL from props or search params
  const redirect = redirectTo || searchParams.get('redirect_to') || '/';

  // Get error from URL params (e.g., from auth callback)
  const urlError = searchParams.get('error');
  const urlErrorDescription = searchParams.get('error_description');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Basic validation
      if (!email || !password) {
        setError(t('errorRequired'));
        setIsSubmitting(false);
        return;
      }

      const result = await signIn(email, password, { redirectTo: redirect });

      if (result.error) {
        // Map common error messages to user-friendly text
        const errorMessage = result.error.message;
        if (errorMessage.includes('Invalid login credentials')) {
          setError(t('errorInvalidCredentials'));
        } else if (errorMessage.includes('Email not confirmed')) {
          setError(t('errorEmailNotConfirmed'));
        } else {
          setError(errorMessage);
        }
      }
    } catch {
      setError(tCommon('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || authLoading;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* URL Error Alert */}
      {urlError && (
        <Alert variant="destructive">
          {urlErrorDescription || t('errorGeneric')}
        </Alert>
      )}

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
        disabled={isLoading}
      />

      {/* Password Field */}
      <div>
        <Input
          type={showPassword ? 'text' : 'password'}
          label={t('password')}
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
          required
          autoComplete="current-password"
          disabled={isLoading}
        />

        {/* Forgot Password Link */}
        <div className="mt-2 text-right">
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:underline"
          >
            {t('forgotPassword')}
          </Link>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        isLoading={isLoading}
        disabled={isLoading}
      >
        {t('loginButton')}
      </Button>

      {/* Register Link */}
      <p className="text-center text-sm text-muted-foreground">
        {t('noAccount')}{' '}
        <Link
          href={`/register${redirect !== '/' ? `?redirect_to=${encodeURIComponent(redirect)}` : ''}`}
          className="font-medium text-primary hover:underline"
        >
          {t('registerButton')}
        </Link>
      </p>
    </form>
  );
}
