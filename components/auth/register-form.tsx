'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react';

import { useAuth } from '@/lib/auth/use-auth';
import { authConfig } from '@/lib/auth/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

interface RegisterFormProps {
  /** URL to redirect to after successful registration */
  redirectTo?: string;
}

/**
 * Register Form Component
 *
 * Email/password registration form with validation and error handling.
 * Mobile-first responsive design.
 */
export function RegisterForm({ redirectTo }: RegisterFormProps) {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const { signUp, isLoading: authLoading } = useAuth();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get redirect URL from props or search params
  const redirect = redirectTo || searchParams.get('redirect_to') || '/';

  const validateForm = (): string | null => {
    if (!email || !password || !confirmPassword) {
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

      const result = await signUp(email, password, {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });

      if (result.error) {
        // Map common error messages to user-friendly text
        const errorMessage = result.error.message;
        if (errorMessage.includes('User already registered')) {
          setError(t('errorEmailExists'));
        } else if (errorMessage.includes('Password')) {
          setError(t('errorWeakPassword'));
        } else {
          setError(errorMessage);
        }
      } else {
        // Show success message (email confirmation required)
        setSuccess(true);
      }
    } catch {
      setError(tCommon('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || authLoading;

  // Show success message after registration
  if (success) {
    return (
      <div className="space-y-6">
        <Alert variant="success">
          {t('successRegistration')}
        </Alert>
        <p className="text-center text-sm text-muted-foreground">
          {t('hasAccount')}{' '}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            {t('loginButton')}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Form Error Alert */}
      {error && (
        <Alert variant="destructive" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Name Fields - Side by Side on larger screens */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          type="text"
          label={t('firstName')}
          placeholder="John"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          leftIcon={<User className="h-4 w-4" />}
          autoComplete="given-name"
          disabled={isLoading}
        />
        <Input
          type="text"
          label={t('lastName')}
          placeholder="Doe"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          leftIcon={<User className="h-4 w-4" />}
          autoComplete="family-name"
          disabled={isLoading}
        />
      </div>

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
        hint={t('passwordHint')}
        required
        autoComplete="new-password"
        disabled={isLoading}
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
        disabled={isLoading}
      />

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        isLoading={isLoading}
        disabled={isLoading}
      >
        {t('registerButton')}
      </Button>

      {/* Login Link */}
      <p className="text-center text-sm text-muted-foreground">
        {t('hasAccount')}{' '}
        <Link
          href={`/login${redirect !== '/' ? `?redirect_to=${encodeURIComponent(redirect)}` : ''}`}
          className="font-medium text-primary hover:underline"
        >
          {t('loginButton')}
        </Link>
      </p>
    </form>
  );
}
