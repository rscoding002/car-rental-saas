'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Car,
  Calendar,
  Users,
  FileText,
  Settings,
  Image as ImageIcon,
  Building2,
  Tag,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Menu,
  X,
  Percent,
  Gift,
  Sun,
  Clock,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import type { UserRole } from '@/lib/supabase/types';

interface AdminSidebarProps {
  locale: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  userRole?: UserRole;
}

interface NavItem {
  href: string;
  icon: React.ElementType;
  labelKey: string;
  children?: NavItem[];
  /** Roles that can see this item. If not specified, all admin roles can see it. */
  allowedRoles?: UserRole[];
}

/** Roles that can manage settings and users */
const ADMIN_ONLY_ROLES: UserRole[] = ['platform_admin', 'tenant_admin'];

/** All admin roles */
const ALL_ADMIN_ROLES: UserRole[] = ['platform_admin', 'tenant_admin', 'tenant_manager', 'tenant_staff'];

export function AdminSidebar({ locale, collapsed = false, onCollapsedChange, userRole }: AdminSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('admin');
  const tNav = useTranslations('nav');
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['pricing']);

  const allNavItems: NavItem[] = [
    { href: `/${locale}/admin`, icon: LayoutDashboard, labelKey: 'dashboard' },
    { href: `/${locale}/admin/bookings`, icon: Calendar, labelKey: 'bookings' },
    { href: `/${locale}/admin/availability`, icon: Clock, labelKey: 'availability' },
    { href: `/${locale}/admin/fleet`, icon: Car, labelKey: 'fleet' },
    { href: `/${locale}/admin/branches`, icon: Building2, labelKey: 'branches' },
    { href: `/${locale}/admin/categories`, icon: Tag, labelKey: 'categories' },
    {
      href: `/${locale}/admin/pricing`,
      icon: DollarSign,
      labelKey: 'pricing',
      children: [
        { href: `/${locale}/admin/pricing`, icon: DollarSign, labelKey: 'rates' },
        { href: `/${locale}/admin/pricing/seasons`, icon: Sun, labelKey: 'seasons' },
        { href: `/${locale}/admin/pricing/addons`, icon: Gift, labelKey: 'addons' },
        { href: `/${locale}/admin/pricing/coupons`, icon: Percent, labelKey: 'coupons' },
      ]
    },
    { href: `/${locale}/admin/customers`, icon: Users, labelKey: 'customers' },
    { href: `/${locale}/admin/pages`, icon: FileText, labelKey: 'pages' },
    { href: `/${locale}/admin/media`, icon: ImageIcon, labelKey: 'media' },
    { href: `/${locale}/admin/users`, icon: UserCog, labelKey: 'users', allowedRoles: ADMIN_ONLY_ROLES },
    { href: `/${locale}/admin/settings`, icon: Settings, labelKey: 'settings', allowedRoles: ADMIN_ONLY_ROLES },
  ];

  // Filter nav items based on user role
  const navItems = allNavItems.filter(item => {
    if (!item.allowedRoles) return true;
    if (!userRole) return false;
    return item.allowedRoles.includes(userRole);
  });

  const isActive = (href: string) => {
    if (href === `/${locale}/admin`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const toggleGroup = (labelKey: string) => {
    setExpandedGroups(prev =>
      prev.includes(labelKey)
        ? prev.filter(g => g !== labelKey)
        : [...prev, labelKey]
    );
  };

  const renderNavItem = (item: NavItem, isChild = false) => {
    const active = isActive(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedGroups.includes(item.labelKey);

    if (hasChildren && !collapsed) {
      return (
        <div key={item.href}>
          <button
            onClick={() => toggleGroup(item.labelKey)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              'text-muted-foreground hover:text-foreground hover:bg-accent',
              active && 'bg-accent text-foreground font-medium'
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="flex-1 text-left">{t(item.labelKey)}</span>
            <ChevronRight
              className={cn(
                'w-4 h-4 transition-transform',
                isExpanded && 'rotate-90'
              )}
            />
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
              {item.children!.map(child => renderNavItem(child, true))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
          'text-muted-foreground hover:text-foreground hover:bg-accent',
          active && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground font-medium',
          isChild && 'py-2',
          collapsed && 'justify-center px-2'
        )}
        title={collapsed ? t(item.labelKey) : undefined}
      >
        <item.icon className={cn('w-5 h-5 shrink-0', isChild && 'w-4 h-4')} />
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
      {/* Logo / Back */}
      <div className={cn(
        'h-16 flex items-center border-b border-border shrink-0',
        collapsed ? 'justify-center px-2' : 'px-4'
      )}>
        <Link
          href={`/${locale}`}
          className={cn(
            'flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors',
            collapsed && 'justify-center'
          )}
          title={collapsed ? tNav('home') : undefined}
        >
          <ChevronLeft className="w-4 h-4 shrink-0" />
          {!collapsed && <span>{tNav('home')}</span>}
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

      {/* Collapse Button */}
      <div className={cn(
        'h-14 flex items-center border-t border-border shrink-0',
        collapsed ? 'justify-center px-2' : 'px-3'
      )}>
        <button
          onClick={() => onCollapsedChange?.(!collapsed)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
            'text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
            collapsed && 'px-2'
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

export function AdminMobileHeader({ locale, onMenuOpen }: MobileHeaderProps) {
  const t = useTranslations('admin');
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
      <span className="ml-3 font-semibold">{t('title')}</span>
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
  userRole?: UserRole;
}

export function AdminMobileMenu({ locale, isOpen, onClose, userRole }: MobileMenuProps) {
  const pathname = usePathname();
  const t = useTranslations('admin');
  const tNav = useTranslations('nav');
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['pricing']);

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

  const allNavItems: NavItem[] = [
    { href: `/${locale}/admin`, icon: LayoutDashboard, labelKey: 'dashboard' },
    { href: `/${locale}/admin/bookings`, icon: Calendar, labelKey: 'bookings' },
    { href: `/${locale}/admin/availability`, icon: Clock, labelKey: 'availability' },
    { href: `/${locale}/admin/fleet`, icon: Car, labelKey: 'fleet' },
    { href: `/${locale}/admin/branches`, icon: Building2, labelKey: 'branches' },
    { href: `/${locale}/admin/categories`, icon: Tag, labelKey: 'categories' },
    {
      href: `/${locale}/admin/pricing`,
      icon: DollarSign,
      labelKey: 'pricing',
      children: [
        { href: `/${locale}/admin/pricing`, icon: DollarSign, labelKey: 'rates' },
        { href: `/${locale}/admin/pricing/seasons`, icon: Sun, labelKey: 'seasons' },
        { href: `/${locale}/admin/pricing/addons`, icon: Gift, labelKey: 'addons' },
        { href: `/${locale}/admin/pricing/coupons`, icon: Percent, labelKey: 'coupons' },
      ]
    },
    { href: `/${locale}/admin/customers`, icon: Users, labelKey: 'customers' },
    { href: `/${locale}/admin/pages`, icon: FileText, labelKey: 'pages' },
    { href: `/${locale}/admin/media`, icon: ImageIcon, labelKey: 'media' },
    { href: `/${locale}/admin/users`, icon: UserCog, labelKey: 'users', allowedRoles: ADMIN_ONLY_ROLES },
    { href: `/${locale}/admin/settings`, icon: Settings, labelKey: 'settings', allowedRoles: ADMIN_ONLY_ROLES },
  ];

  // Filter nav items based on user role
  const navItems = allNavItems.filter(item => {
    if (!item.allowedRoles) return true;
    if (!userRole) return false;
    return item.allowedRoles.includes(userRole);
  });

  const isActive = (href: string) => {
    if (href === `/${locale}/admin`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const toggleGroup = (labelKey: string) => {
    setExpandedGroups(prev =>
      prev.includes(labelKey)
        ? prev.filter(g => g !== labelKey)
        : [...prev, labelKey]
    );
  };

  const renderNavItem = (item: NavItem, isChild = false) => {
    const active = isActive(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedGroups.includes(item.labelKey);

    if (hasChildren) {
      return (
        <div key={item.href}>
          <button
            onClick={() => toggleGroup(item.labelKey)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 text-base transition-colors touch-manipulation',
              'text-muted-foreground hover:text-foreground hover:bg-accent',
              active && 'bg-accent text-foreground font-medium'
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="flex-1 text-left">{t(item.labelKey)}</span>
            <ChevronRight
              className={cn(
                'w-4 h-4 transition-transform',
                isExpanded && 'rotate-90'
              )}
            />
          </button>
          {isExpanded && (
            <div className="bg-muted/50">
              {item.children!.map(child => renderNavItem(child, true))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={cn(
          'flex items-center gap-3 px-4 py-3 text-base transition-colors touch-manipulation',
          'text-muted-foreground hover:text-foreground hover:bg-accent',
          active && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground font-medium',
          isChild && 'pl-12 py-2.5'
        )}
      >
        <item.icon className={cn('w-5 h-5 shrink-0', isChild && 'w-4 h-4')} />
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
          <span className="font-semibold">{t('title')}</span>
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
interface AdminSidebarWrapperProps {
  locale: string;
  children: React.ReactNode;
  userRole?: UserRole;
}

export function AdminSidebarWrapper({ locale, children, userRole }: AdminSidebarWrapperProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed');
    if (saved !== null) {
      setCollapsed(saved === 'true');
    }
  }, []);

  // Save collapsed state to localStorage
  const handleCollapsedChange = (newCollapsed: boolean) => {
    setCollapsed(newCollapsed);
    localStorage.setItem('admin-sidebar-collapsed', String(newCollapsed));
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Desktop Sidebar */}
      <AdminSidebar
        locale={locale}
        collapsed={collapsed}
        onCollapsedChange={handleCollapsedChange}
        userRole={userRole}
      />

      {/* Mobile Header */}
      <AdminMobileHeader
        locale={locale}
        onMenuOpen={() => setMobileMenuOpen(true)}
      />

      {/* Mobile Menu */}
      <AdminMobileMenu
        locale={locale}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        userRole={userRole}
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
