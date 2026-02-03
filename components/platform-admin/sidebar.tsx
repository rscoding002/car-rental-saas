'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Building2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Users,
  CreditCard,
  Globe,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlatformSidebarProps {
  locale: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

interface NavItem {
  href: string;
  icon: React.ElementType;
  labelKey: string;
}

export function PlatformSidebar({ locale, collapsed = false, onCollapsedChange }: PlatformSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('platformAdmin');
  const tNav = useTranslations('nav');

  const navItems: NavItem[] = [
    { href: `/${locale}/platform-admin`, icon: LayoutDashboard, labelKey: 'dashboard' },
    { href: `/${locale}/platform-admin/tenants`, icon: Building2, labelKey: 'tenants' },
    { href: `/${locale}/platform-admin/users`, icon: Users, labelKey: 'users' },
    { href: `/${locale}/platform-admin/subscriptions`, icon: CreditCard, labelKey: 'subscriptions' },
    { href: `/${locale}/platform-admin/domains`, icon: Globe, labelKey: 'domains' },
    { href: `/${locale}/platform-admin/settings`, icon: Settings, labelKey: 'settings' },
  ];

  const isActive = (href: string) => {
    if (href === `/${locale}/platform-admin`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
          'text-muted-foreground hover:text-foreground hover:bg-accent',
          active && 'bg-purple-600 text-white hover:bg-purple-700 hover:text-white font-medium',
          collapsed && 'justify-center px-2'
        )}
        title={collapsed ? t(item.labelKey) : undefined}
      >
        <item.icon className="w-5 h-5 shrink-0" />
        {!collapsed && <span>{t(item.labelKey)}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 bg-card border-r border-border transition-all duration-300',
        'hidden lg:flex lg:flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo / Header */}
      <div className={cn(
        'h-16 flex items-center border-b border-border shrink-0',
        collapsed ? 'justify-center px-2' : 'px-4'
      )}>
        <Link
          href={`/${locale}/platform-admin`}
          className={cn(
            'flex items-center gap-2 text-sm font-semibold',
            collapsed && 'justify-center'
          )}
        >
          <Shield className="w-5 h-5 text-purple-600 shrink-0" />
          {!collapsed && <span>{t('title')}</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className={cn(
        'flex-1 overflow-y-auto py-4',
        collapsed ? 'px-2' : 'px-3'
      )}>
        <div className="space-y-1">
          {navItems.map(item => renderNavItem(item))}
        </div>
      </nav>

      {/* Footer with collapse button */}
      <div className={cn(
        'border-t border-border shrink-0',
        collapsed ? 'p-2' : 'p-3'
      )}>
        {/* Back to Site Link */}
        <Link
          href={`/${locale}`}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-2',
            'text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? tNav('home') : undefined}
        >
          <ChevronLeft className="w-4 h-4 shrink-0" />
          {!collapsed && <span>{tNav('home')}</span>}
        </Link>

        {/* Collapse Button */}
        <button
          onClick={() => onCollapsedChange?.(!collapsed)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
            'text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

interface MobileHeaderProps {
  locale: string;
  onMenuOpen: () => void;
}

export function PlatformMobileHeader({ locale, onMenuOpen }: MobileHeaderProps) {
  const t = useTranslations('platformAdmin');
  const tNav = useTranslations('nav');

  return (
    <header className="lg:hidden fixed top-0 inset-x-0 z-50 h-14 bg-card border-b border-border flex items-center px-4 safe-area-inset-top">
      <button
        onClick={onMenuOpen}
        className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors touch-manipulation"
        aria-label={tNav('openMenu')}
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="ml-3 flex items-center gap-2">
        <Shield className="w-4 h-4 text-purple-600" />
        <span className="font-semibold">{t('title')}</span>
      </div>
      <Link
        href={`/${locale}`}
        className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">{tNav('home')}</span>
      </Link>
    </header>
  );
}

interface MobileMenuProps {
  locale: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PlatformMobileMenu({ locale, isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname();
  const t = useTranslations('platformAdmin');
  const tNav = useTranslations('nav');

  // Close menu on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const navItems: NavItem[] = [
    { href: `/${locale}/platform-admin`, icon: LayoutDashboard, labelKey: 'dashboard' },
    { href: `/${locale}/platform-admin/tenants`, icon: Building2, labelKey: 'tenants' },
    { href: `/${locale}/platform-admin/users`, icon: Users, labelKey: 'users' },
    { href: `/${locale}/platform-admin/subscriptions`, icon: CreditCard, labelKey: 'subscriptions' },
    { href: `/${locale}/platform-admin/domains`, icon: Globe, labelKey: 'domains' },
    { href: `/${locale}/platform-admin/settings`, icon: Settings, labelKey: 'settings' },
  ];

  const isActive = (href: string) => {
    if (href === `/${locale}/platform-admin`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={cn(
          'flex items-center gap-3 px-4 py-3 text-base transition-colors touch-manipulation',
          'text-muted-foreground hover:text-foreground hover:bg-accent',
          active && 'bg-purple-600 text-white hover:bg-purple-700 hover:text-white font-medium'
        )}
      >
        <item.icon className="w-5 h-5 shrink-0" />
        <span>{t(item.labelKey)}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/50 transition-opacity lg:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Menu */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-card shadow-xl transition-transform duration-300 lg:hidden',
          'flex flex-col safe-area-inset-left',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0 safe-area-inset-top">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-600" />
            <span className="font-semibold">{t('title')}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg hover:bg-accent transition-colors touch-manipulation"
            aria-label={tNav('closeMenu')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overscroll-contain">
          <div className="py-2">
            {navItems.map(item => renderNavItem(item))}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4 shrink-0 safe-area-inset-bottom">
          <Link
            href={`/${locale}`}
            onClick={onClose}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{tNav('home')}</span>
          </Link>
        </div>
      </div>
    </>
  );
}

// Wrapper component that manages all sidebar state
interface PlatformSidebarWrapperProps {
  locale: string;
  children: React.ReactNode;
}

export function PlatformSidebarWrapper({ locale, children }: PlatformSidebarWrapperProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('platform-sidebar-collapsed');
    if (saved !== null) {
      setCollapsed(saved === 'true');
    }
  }, []);

  // Save collapsed state to localStorage
  const handleCollapsedChange = (newCollapsed: boolean) => {
    setCollapsed(newCollapsed);
    localStorage.setItem('platform-sidebar-collapsed', String(newCollapsed));
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Desktop Sidebar */}
      <PlatformSidebar
        locale={locale}
        collapsed={collapsed}
        onCollapsedChange={handleCollapsedChange}
      />

      {/* Mobile Header */}
      <PlatformMobileHeader
        locale={locale}
        onMenuOpen={() => setMobileMenuOpen(true)}
      />

      {/* Mobile Menu */}
      <PlatformMobileMenu
        locale={locale}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <main
        className={cn(
          'pt-14 lg:pt-0 transition-all duration-300',
          collapsed ? 'lg:pl-16' : 'lg:pl-64'
        )}
      >
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
