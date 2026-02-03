'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  CalendarDays,
  User,
  LogOut,
} from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { useAuthContext } from '@/lib/auth/auth-context';

interface AccountNavProps {
  locale: string;
  variant?: 'sidebar' | 'tabs';
}

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
}

/**
 * Account Navigation Component
 *
 * Mobile-first navigation for customer account pages.
 * - Tabs variant for mobile (horizontal scrollable)
 * - Sidebar variant for desktop
 */
export function AccountNav({ locale, variant = 'sidebar' }: AccountNavProps) {
  const pathname = usePathname();
  const t = useTranslations('account');
  const tNav = useTranslations('nav');
  const { signOut } = useAuthContext();

  const navItems: NavItem[] = [
    { href: `/${locale}/account`, icon: LayoutDashboard, labelKey: 'overview' },
    { href: `/${locale}/account/bookings`, icon: CalendarDays, labelKey: 'bookings' },
    { href: `/${locale}/account/profile`, icon: User, labelKey: 'profile' },
  ];

  const isActive = (href: string) => {
    // Exact match for overview
    if (href === `/${locale}/account`) {
      return pathname === href;
    }
    // Prefix match for other pages
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = `/${locale}`;
  };

  if (variant === 'tabs') {
    return (
      <nav className="border-b border-border bg-card">
        <div className="flex overflow-x-auto scrollbar-hide -mb-px">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  'min-h-[48px]', // Touch target
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  // Sidebar variant
  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              'min-h-[44px]', // Touch target
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span>{t(item.labelKey)}</span>
          </Link>
        );
      })}

      {/* Divider */}
      <div className="my-4 border-t border-border" />

      {/* Sign out button */}
      <button
        onClick={handleSignOut}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full',
          'min-h-[44px]', // Touch target
          'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
        )}
      >
        <LogOut className="h-5 w-5 flex-shrink-0" />
        <span>{tNav('signOut')}</span>
      </button>
    </nav>
  );
}
