'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Car, Menu, X, User } from 'lucide-react';

import { Link } from '@/i18n/routing';
import { useAuth } from '@/lib/auth/use-auth';
import { useTenant } from '@/lib/tenant/use-tenant';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface HeaderProps {
  /** Whether to use transparent background (for hero sections) */
  transparent?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Site Header Component
 *
 * Main navigation header for the public website.
 * Mobile-first responsive design with hamburger menu.
 *
 * Features:
 * - Responsive navigation with mobile menu
 * - Language switcher
 * - Auth state-aware (shows login/account based on auth)
 * - Optional transparent mode for hero sections
 */
export function Header({ transparent = false, className }: HeaderProps) {
  const t = useTranslations('nav');
  const { isAuthenticated, isLoading, isAdmin, isStaff } = useAuth();
  const { tenant } = useTenant();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get tenant branding
  const tenantLogo = tenant?.logo_url;
  const tenantName = tenant?.name || 'Car Rental';

  const navLinks = [
    { href: '/', label: t('home') },
    { href: '/fleet', label: t('fleet') },
    { href: '/locations', label: t('locations') },
    { href: '/about', label: t('aboutUs') },
    { href: '/contact', label: t('contactUs') },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b transition-colors',
        // Safe area padding for devices with notches
        'pt-[env(safe-area-inset-top)]',
        transparent
          ? 'border-transparent bg-transparent'
          : 'border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between sm:h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold"
            onClick={closeMobileMenu}
          >
            {tenantLogo ? (
              <Image
                src={tenantLogo}
                alt={tenantName}
                width={140}
                height={40}
                className="h-8 w-auto object-contain sm:h-10"
                priority
              />
            ) : (
              <>
                <Car className="h-7 w-7 text-primary" />
                <span className="hidden sm:inline">{tenantName}</span>
              </>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden items-center gap-2 md:flex">
            {/* Language Switcher */}
            <LanguageSwitcher variant="minimal" showFlags />

            {/* Auth Actions */}
            {isLoading ? (
              <div className="h-10 w-20 animate-pulse rounded-lg bg-muted" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-2">
                {(isAdmin || isStaff) && (
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/admin">{t('admin')}</Link>
                  </Button>
                )}
                <Button asChild variant="outline" size="sm">
                  <Link href="/account" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{t('account')}</span>
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">{t('signIn')}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/register">{t('signUp')}</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
            onClick={toggleMobileMenu}
            aria-label={isMobileMenuOpen ? t('closeMenu') : t('openMenu')}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="border-t bg-background md:hidden max-h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="container mx-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {/* Mobile Navigation Links */}
            <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-4 py-3.5 text-base font-medium text-foreground transition-colors hover:bg-accent active:bg-accent/80"
                  onClick={closeMobileMenu}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Divider */}
            <div className="my-4 border-t" />

            {/* Mobile Auth Actions */}
            <div className="flex flex-col gap-2">
              {isLoading ? (
                <div className="h-12 animate-pulse rounded-lg bg-muted" />
              ) : isAuthenticated ? (
                <>
                  {(isAdmin || isStaff) && (
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link href="/admin" onClick={closeMobileMenu}>
                        {t('admin')}
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link
                      href="/account"
                      className="flex items-center gap-2"
                      onClick={closeMobileMenu}
                    >
                      <User className="h-4 w-4" />
                      <span>{t('account')}</span>
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/login" onClick={closeMobileMenu}>
                      {t('signIn')}
                    </Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link href="/register" onClick={closeMobileMenu}>
                      {t('signUp')}
                    </Link>
                  </Button>
                </>
              )}
            </div>

            {/* Divider */}
            <div className="my-4 border-t" />

            {/* Mobile Language Switcher */}
            <div className="px-4">
              <LanguageSwitcher variant="buttons" showFlags className="w-full" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
