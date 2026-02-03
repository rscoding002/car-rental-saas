'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Lock, Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { changePassword, type PasswordChangeInput } from '@/lib/auth/actions';

/**
 * Password Change Form Component
 *
 * Mobile-first form for changing user password.
 * Requires current password verification and new password confirmation.
 */
export function PasswordChangeForm() {
  const t = useTranslations('auth');
  const tAccount = useTranslations('account');
  const tCommon = useTranslations('common');
  const tValidation = useTranslations('validation');

  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear messages and field errors on change
    setSuccess(false);
    setError(null);
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.currentPassword) {
      errors.currentPassword = tValidation('required');
    }

    if (!formData.newPassword) {
      errors.newPassword = tValidation('required');
    } else if (formData.newPassword.length < 8) {
      errors.newPassword = tValidation('minLength', { min: 8 });
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = tValidation('required');
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = tValidation('passwordMatch');
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setError(null);

    if (!validateForm()) {
      return;
    }

    startTransition(async () => {
      const input: PasswordChangeInput = {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      };

      const result = await changePassword(input);

      if (result.success) {
        setSuccess(true);
        // Clear form on success
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        setError(result.error || 'An error occurred');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Success/Error Messages */}
      {success && (
        <Alert variant="success" onClose={() => setSuccess(false)}>
          {t('successPasswordChanged')}
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Current Password */}
      <Input
        label={t('currentPassword')}
        name="currentPassword"
        type={showCurrentPassword ? 'text' : 'password'}
        value={formData.currentPassword}
        onChange={handleChange}
        error={fieldErrors.currentPassword}
        placeholder="********"
        autoComplete="current-password"
        rightIcon={
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="p-1 hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showCurrentPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        }
      />

      {/* New Password */}
      <Input
        label={t('newPassword')}
        name="newPassword"
        type={showNewPassword ? 'text' : 'password'}
        value={formData.newPassword}
        onChange={handleChange}
        error={fieldErrors.newPassword}
        hint={t('passwordHint')}
        placeholder="********"
        autoComplete="new-password"
        rightIcon={
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="p-1 hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showNewPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        }
      />

      {/* Confirm Password */}
      <Input
        label={t('confirmPassword')}
        name="confirmPassword"
        type={showConfirmPassword ? 'text' : 'password'}
        value={formData.confirmPassword}
        onChange={handleChange}
        error={fieldErrors.confirmPassword}
        placeholder="********"
        autoComplete="new-password"
        rightIcon={
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="p-1 hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        }
      />

      {/* Submit Button */}
      <div className="pt-2">
        <Button
          type="submit"
          isLoading={isPending}
          className="w-full sm:w-auto"
        >
          {isPending ? tCommon('saving') : t('updatePassword')}
        </Button>
      </div>
    </form>
  );
}
