import type { UserRole } from '@/lib/supabase/types';

/**
 * Role Constants
 *
 * Defines all available roles in the system.
 * Roles are hierarchical - higher roles include permissions of lower roles.
 */
export const ROLES = {
  /** Platform administrator - manages all tenants */
  PLATFORM_ADMIN: 'platform_admin' as const,
  /** Tenant administrator - full access to tenant */
  TENANT_ADMIN: 'tenant_admin' as const,
  /** Tenant manager - manages operations, limited settings access */
  TENANT_MANAGER: 'tenant_manager' as const,
  /** Tenant staff - handles bookings and customers */
  TENANT_STAFF: 'tenant_staff' as const,
  /** Customer - can book vehicles and manage own account */
  CUSTOMER: 'customer' as const,
} as const;

/**
 * All roles array for iteration
 */
export const ALL_ROLES: UserRole[] = [
  ROLES.PLATFORM_ADMIN,
  ROLES.TENANT_ADMIN,
  ROLES.TENANT_MANAGER,
  ROLES.TENANT_STAFF,
  ROLES.CUSTOMER,
];

/**
 * Permission definitions
 *
 * Each permission represents a specific action in the system.
 */
export const PERMISSIONS = {
  // Platform-level permissions
  MANAGE_TENANTS: 'manage_tenants',
  VIEW_ALL_TENANTS: 'view_all_tenants',
  MANAGE_PLATFORM_SETTINGS: 'manage_platform_settings',

  // Tenant settings permissions
  MANAGE_TENANT_SETTINGS: 'manage_tenant_settings',
  MANAGE_BRANDING: 'manage_branding',
  MANAGE_USERS: 'manage_users',
  MANAGE_LANGUAGES: 'manage_languages',

  // Fleet permissions
  VIEW_FLEET: 'view_fleet',
  MANAGE_FLEET: 'manage_fleet',
  MANAGE_CATEGORIES: 'manage_categories',

  // Branch permissions
  VIEW_BRANCHES: 'view_branches',
  MANAGE_BRANCHES: 'manage_branches',

  // Pricing permissions
  VIEW_PRICING: 'view_pricing',
  MANAGE_PRICING: 'manage_pricing',
  MANAGE_COUPONS: 'manage_coupons',
  MANAGE_ADDONS: 'manage_addons',
  MANAGE_SEASONS: 'manage_seasons',

  // Booking permissions
  VIEW_BOOKINGS: 'view_bookings',
  MANAGE_BOOKINGS: 'manage_bookings',
  CREATE_BOOKINGS: 'create_bookings',
  CANCEL_BOOKINGS: 'cancel_bookings',
  MODIFY_BOOKINGS: 'modify_bookings',

  // Customer permissions
  VIEW_CUSTOMERS: 'view_customers',
  MANAGE_CUSTOMERS: 'manage_customers',

  // CMS permissions
  VIEW_PAGES: 'view_pages',
  MANAGE_PAGES: 'manage_pages',
  MANAGE_MEDIA: 'manage_media',

  // Account permissions (for customers)
  VIEW_OWN_BOOKINGS: 'view_own_bookings',
  MANAGE_OWN_BOOKINGS: 'manage_own_bookings',
  MANAGE_OWN_PROFILE: 'manage_own_profile',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Role-Permission Mapping
 *
 * Defines which permissions each role has.
 * Note: Higher roles automatically inherit permissions from lower roles
 * through the role hierarchy.
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Platform Admin - has all permissions
  platform_admin: [
    PERMISSIONS.MANAGE_TENANTS,
    PERMISSIONS.VIEW_ALL_TENANTS,
    PERMISSIONS.MANAGE_PLATFORM_SETTINGS,
    // Also has all tenant permissions (inherited)
    PERMISSIONS.MANAGE_TENANT_SETTINGS,
    PERMISSIONS.MANAGE_BRANDING,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_LANGUAGES,
    PERMISSIONS.VIEW_FLEET,
    PERMISSIONS.MANAGE_FLEET,
    PERMISSIONS.MANAGE_CATEGORIES,
    PERMISSIONS.VIEW_BRANCHES,
    PERMISSIONS.MANAGE_BRANCHES,
    PERMISSIONS.VIEW_PRICING,
    PERMISSIONS.MANAGE_PRICING,
    PERMISSIONS.MANAGE_COUPONS,
    PERMISSIONS.MANAGE_ADDONS,
    PERMISSIONS.MANAGE_SEASONS,
    PERMISSIONS.VIEW_BOOKINGS,
    PERMISSIONS.MANAGE_BOOKINGS,
    PERMISSIONS.CREATE_BOOKINGS,
    PERMISSIONS.CANCEL_BOOKINGS,
    PERMISSIONS.MODIFY_BOOKINGS,
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.VIEW_PAGES,
    PERMISSIONS.MANAGE_PAGES,
    PERMISSIONS.MANAGE_MEDIA,
  ],

  // Tenant Admin - full access to their tenant
  tenant_admin: [
    PERMISSIONS.MANAGE_TENANT_SETTINGS,
    PERMISSIONS.MANAGE_BRANDING,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_LANGUAGES,
    PERMISSIONS.VIEW_FLEET,
    PERMISSIONS.MANAGE_FLEET,
    PERMISSIONS.MANAGE_CATEGORIES,
    PERMISSIONS.VIEW_BRANCHES,
    PERMISSIONS.MANAGE_BRANCHES,
    PERMISSIONS.VIEW_PRICING,
    PERMISSIONS.MANAGE_PRICING,
    PERMISSIONS.MANAGE_COUPONS,
    PERMISSIONS.MANAGE_ADDONS,
    PERMISSIONS.MANAGE_SEASONS,
    PERMISSIONS.VIEW_BOOKINGS,
    PERMISSIONS.MANAGE_BOOKINGS,
    PERMISSIONS.CREATE_BOOKINGS,
    PERMISSIONS.CANCEL_BOOKINGS,
    PERMISSIONS.MODIFY_BOOKINGS,
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.VIEW_PAGES,
    PERMISSIONS.MANAGE_PAGES,
    PERMISSIONS.MANAGE_MEDIA,
  ],

  // Tenant Manager - manages operations, limited settings
  tenant_manager: [
    PERMISSIONS.VIEW_FLEET,
    PERMISSIONS.MANAGE_FLEET,
    PERMISSIONS.MANAGE_CATEGORIES,
    PERMISSIONS.VIEW_BRANCHES,
    PERMISSIONS.MANAGE_BRANCHES,
    PERMISSIONS.VIEW_PRICING,
    PERMISSIONS.MANAGE_PRICING,
    PERMISSIONS.MANAGE_COUPONS,
    PERMISSIONS.MANAGE_ADDONS,
    PERMISSIONS.MANAGE_SEASONS,
    PERMISSIONS.VIEW_BOOKINGS,
    PERMISSIONS.MANAGE_BOOKINGS,
    PERMISSIONS.CREATE_BOOKINGS,
    PERMISSIONS.CANCEL_BOOKINGS,
    PERMISSIONS.MODIFY_BOOKINGS,
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.VIEW_PAGES,
    PERMISSIONS.MANAGE_PAGES,
    PERMISSIONS.MANAGE_MEDIA,
  ],

  // Tenant Staff - handles bookings and customers
  tenant_staff: [
    PERMISSIONS.VIEW_FLEET,
    PERMISSIONS.VIEW_BRANCHES,
    PERMISSIONS.VIEW_PRICING,
    PERMISSIONS.VIEW_BOOKINGS,
    PERMISSIONS.CREATE_BOOKINGS,
    PERMISSIONS.MODIFY_BOOKINGS,
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.VIEW_PAGES,
  ],

  // Customer - can only manage their own data
  customer: [
    PERMISSIONS.VIEW_OWN_BOOKINGS,
    PERMISSIONS.MANAGE_OWN_BOOKINGS,
    PERMISSIONS.MANAGE_OWN_PROFILE,
  ],
};

/**
 * Role Hierarchy
 *
 * Defines the role hierarchy from highest to lowest.
 * Higher roles can access resources meant for lower roles.
 */
export const ROLE_HIERARCHY: UserRole[] = [
  ROLES.PLATFORM_ADMIN,
  ROLES.TENANT_ADMIN,
  ROLES.TENANT_MANAGER,
  ROLES.TENANT_STAFF,
  ROLES.CUSTOMER,
];

/**
 * Role Groups
 *
 * Convenient groupings of roles for common checks.
 */
export const ROLE_GROUPS = {
  /** Roles that can access the admin dashboard */
  ADMIN_ACCESS: [
    ROLES.PLATFORM_ADMIN,
    ROLES.TENANT_ADMIN,
    ROLES.TENANT_MANAGER,
    ROLES.TENANT_STAFF,
  ] as UserRole[],

  /** Roles that can manage tenant settings */
  TENANT_SETTINGS: [
    ROLES.PLATFORM_ADMIN,
    ROLES.TENANT_ADMIN,
  ] as UserRole[],

  /** Roles that can manage fleet */
  FLEET_MANAGEMENT: [
    ROLES.PLATFORM_ADMIN,
    ROLES.TENANT_ADMIN,
    ROLES.TENANT_MANAGER,
  ] as UserRole[],

  /** Roles that can manage bookings */
  BOOKING_MANAGEMENT: [
    ROLES.PLATFORM_ADMIN,
    ROLES.TENANT_ADMIN,
    ROLES.TENANT_MANAGER,
    ROLES.TENANT_STAFF,
  ] as UserRole[],

  /** Roles that are platform-level */
  PLATFORM_LEVEL: [
    ROLES.PLATFORM_ADMIN,
  ] as UserRole[],

  /** Roles that are tenant-level staff */
  TENANT_STAFF_LEVEL: [
    ROLES.TENANT_ADMIN,
    ROLES.TENANT_MANAGER,
    ROLES.TENANT_STAFF,
  ] as UserRole[],
} as const;

/**
 * Get permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}

/**
 * Get the role level (lower number = higher authority)
 */
export function getRoleLevel(role: UserRole): number {
  const index = ROLE_HIERARCHY.indexOf(role);
  return index === -1 ? Infinity : index;
}

/**
 * Check if roleA is higher or equal to roleB in hierarchy
 */
export function isRoleHigherOrEqual(roleA: UserRole, roleB: UserRole): boolean {
  return getRoleLevel(roleA) <= getRoleLevel(roleB);
}

/**
 * Check if a role is in a specific group
 */
export function isRoleInGroup(
  role: UserRole,
  group: keyof typeof ROLE_GROUPS
): boolean {
  return ROLE_GROUPS[group].includes(role);
}

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    platform_admin: 'Platform Administrator',
    tenant_admin: 'Administrator',
    tenant_manager: 'Manager',
    tenant_staff: 'Staff',
    customer: 'Customer',
  };
  return displayNames[role] || role;
}

/**
 * Get role badge color for UI
 */
export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    platform_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    tenant_admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    tenant_manager: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    tenant_staff: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    customer: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  };
  return colors[role] || colors.customer;
}
