'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Globe, Check, ChevronDown } from 'lucide-react';

import { useRouter, usePathname } from '@/i18n/routing';
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config';
import { cn } from '@/lib/utils/cn';
import { useTenantContextSafe } from '@/lib/tenant/tenant-context';

interface LanguageSwitcherProps {
  /** Show flags alongside language names */
  showFlags?: boolean;
  /** Show full language names or just codes */
  showFullNames?: boolean;
  /** Variant style */
  variant?: 'dropdown' | 'buttons' | 'minimal';
  /** Additional class names */
  className?: string;
  /** Override enabled locales (uses tenant settings by default) */
  enabledLocales?: Locale[];
}

/**
 * Language Switcher Component
 *
 * Allows users to switch between available languages.
 * Mobile-first responsive design with multiple display variants.
 *
 * Usage:
 * ```tsx
 * // Dropdown (default)
 * <LanguageSwitcher />
 *
 * // With flags
 * <LanguageSwitcher showFlags />
 *
 * // Button group
 * <LanguageSwitcher variant="buttons" />
 *
 * // Minimal (just globe icon)
 * <LanguageSwitcher variant="minimal" />
 * ```
 */
export function LanguageSwitcher({
  showFlags = false,
  showFullNames = true,
  variant = 'dropdown',
  className,
  enabledLocales: overrideLocales,
}: LanguageSwitcherProps) {
  const t = useTranslations('language');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get tenant's enabled locales or fall back to all locales
  const tenantContext = useTenantContextSafe();
  const availableLocales = overrideLocales || tenantContext?.enabledLocales || locales;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
    setIsOpen(false);
  };

  const getDisplayText = (loc: Locale) => {
    if (showFlags && showFullNames) {
      return `${localeFlags[loc]} ${localeNames[loc]}`;
    }
    if (showFlags) {
      return `${localeFlags[loc]} ${loc.toUpperCase()}`;
    }
    if (showFullNames) {
      return localeNames[loc];
    }
    return loc.toUpperCase();
  };

  // Don't render if only one language is available
  if (availableLocales.length <= 1) {
    return null;
  }

  // Minimal variant - just a globe icon that opens dropdown
  if (variant === 'minimal') {
    return (
      <div ref={dropdownRef} className={cn('relative', className)}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label={t('select')}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <Globe className="h-5 w-5" />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 min-w-[140px] rounded-lg border bg-popover p-1 shadow-md">
            <ul role="listbox" aria-label={t('select')}>
              {availableLocales.map((loc) => (
                <li key={loc}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={locale === loc}
                    onClick={() => handleLocaleChange(loc)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                      locale === loc
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    {showFlags && <span>{localeFlags[loc]}</span>}
                    <span className="flex-1 text-left">{localeNames[loc]}</span>
                    {locale === loc && <Check className="h-4 w-4" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Buttons variant - horizontal button group
  if (variant === 'buttons') {
    return (
      <div
        className={cn('flex rounded-lg border bg-muted p-1', className)}
        role="radiogroup"
        aria-label={t('select')}
      >
        {availableLocales.map((loc) => (
          <button
            key={loc}
            type="button"
            role="radio"
            aria-checked={locale === loc}
            onClick={() => handleLocaleChange(loc)}
            className={cn(
              'flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              locale === loc
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {showFlags && <span className="text-base">{localeFlags[loc]}</span>}
            <span>{showFullNames ? localeNames[loc] : loc.toUpperCase()}</span>
          </button>
        ))}
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 items-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-label={t('select')}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span>{getDisplayText(locale)}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[160px] rounded-lg border bg-popover p-1 shadow-md">
          <ul role="listbox" aria-label={t('select')}>
            {availableLocales.map((loc) => (
              <li key={loc}>
                <button
                  type="button"
                  role="option"
                  aria-selected={locale === loc}
                  onClick={() => handleLocaleChange(loc)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                    locale === loc
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {showFlags && <span className="text-base">{localeFlags[loc]}</span>}
                  <span className="flex-1 text-left">
                    {showFullNames ? localeNames[loc] : loc.toUpperCase()}
                  </span>
                  {locale === loc && <Check className="h-4 w-4" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Language Switcher
 *
 * A smaller version ideal for headers and navbars.
 * Shows current language code with flag option.
 */
export function LanguageSwitcherCompact({
  showFlags = true,
  className,
}: {
  showFlags?: boolean;
  className?: string;
}) {
  return (
    <LanguageSwitcher
      variant="dropdown"
      showFlags={showFlags}
      showFullNames={false}
      className={className}
    />
  );
}

/**
 * Language Switcher for Mobile
 *
 * Full-width buttons optimized for mobile menus.
 */
export function LanguageSwitcherMobile({
  className,
  enabledLocales: overrideLocales,
}: {
  className?: string;
  enabledLocales?: Locale[];
}) {
  const t = useTranslations('language');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  // Get tenant's enabled locales or fall back to all locales
  const tenantContext = useTenantContextSafe();
  const availableLocales = overrideLocales || tenantContext?.enabledLocales || locales;

  const handleLocaleChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
  };

  // Don't render if only one language is available
  if (availableLocales.length <= 1) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm font-medium text-muted-foreground">{t('title')}</p>
      <div className="grid grid-cols-3 gap-2">
        {availableLocales.map((loc) => (
          <button
            key={loc}
            type="button"
            onClick={() => handleLocaleChange(loc)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border p-3 text-sm transition-colors',
              locale === loc
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border hover:border-primary/50 hover:bg-accent'
            )}
          >
            <span className="text-2xl">{localeFlags[loc]}</span>
            <span className="font-medium">{localeNames[loc]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
