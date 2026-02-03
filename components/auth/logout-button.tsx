'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

import { useAuth } from '@/lib/auth/use-auth';
import { Button } from '@/components/ui/button';
import type { ButtonProps } from '@/components/ui/button';

interface LogoutButtonProps extends Omit<ButtonProps, 'onClick'> {
  /** URL to redirect to after logout (default: /login) */
  redirectTo?: string;
  /** Whether to show the logout icon */
  showIcon?: boolean;
  /** Custom label text */
  label?: string;
  /** Callback after successful logout */
  onLogout?: () => void;
}

/**
 * Logout Button Component
 *
 * A reusable button component that handles user logout with loading state
 * and redirect functionality. Mobile-first responsive design.
 *
 * Usage:
 * ```tsx
 * // Basic usage
 * <LogoutButton />
 *
 * // With custom redirect
 * <LogoutButton redirectTo="/" />
 *
 * // Icon only (for mobile nav)
 * <LogoutButton showIcon label="" variant="ghost" size="icon" />
 *
 * // Custom styling
 * <LogoutButton variant="destructive" className="w-full" />
 * ```
 */
export function LogoutButton({
  redirectTo,
  showIcon = true,
  label = 'Sign Out',
  onLogout,
  variant = 'ghost',
  size = 'md',
  className,
  disabled,
  ...props
}: LogoutButtonProps) {
  const router = useRouter();
  const { signOut, isLoading: authLoading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      const result = await signOut({ redirectTo });

      if (!result.error) {
        onLogout?.();
        // signOut already handles redirect, but we ensure navigation happens
        if (redirectTo) {
          router.push(redirectTo);
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isDisabled = disabled || isLoggingOut || authLoading;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={handleLogout}
      disabled={isDisabled}
      aria-label={label || 'Sign out'}
      {...props}
    >
      {showIcon && (
        <LogOut
          className={`h-4 w-4 ${label ? 'mr-2' : ''} ${isLoggingOut ? 'animate-pulse' : ''}`}
          aria-hidden="true"
        />
      )}
      {label && <span>{isLoggingOut ? 'Signing out...' : label}</span>}
    </Button>
  );
}

/**
 * Logout Link Component
 *
 * A simple link that triggers logout via GET request.
 * Useful for static links in navigation or footers.
 *
 * Usage:
 * ```tsx
 * <LogoutLink>Sign Out</LogoutLink>
 * <LogoutLink redirectTo="/">Log Out</LogoutLink>
 * ```
 */
interface LogoutLinkProps {
  children: React.ReactNode;
  redirectTo?: string;
  className?: string;
}

export function LogoutLink({
  children,
  redirectTo = '/login',
  className = '',
}: LogoutLinkProps) {
  const href = `/api/auth/sign-out?redirect_to=${encodeURIComponent(redirectTo)}`;

  return (
    <a
      href={href}
      className={`inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors ${className}`}
    >
      {children}
    </a>
  );
}
