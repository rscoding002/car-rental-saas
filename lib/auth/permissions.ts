import type { UserRole } from '@/lib/supabase/types';
import type { User } from '@/lib/supabase/types';

import {
  PERMISSIONS,
  ROLE_GROUPS,
  ROLE_HIERARCHY,
  getPermissionsForRole,
  getRoleLevel,
  roleHasPermission,
} from './roles';

import type { Permission } from './roles';

/**
 * Permission Check Result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if a user has a specific role
 */
export function hasRole(user: User | null, role: UserRole): boolean {
  if (!user) return false;
  return user.role === role;
}

/**
 * Check if a user has any of the specified roles
 */
export function hasAnyRole(user: User | null, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * Check if a user has all of the specified roles
 * (Note: A user can only have one role, so this checks if the user's role is in the list)
 */
export function hasAllRoles(user: User | null, roles: UserRole[]): boolean {
  if (!user) return false;
  // Since a user has only one role, this is equivalent to hasAnyRole
  // but semantically different - use hasAnyRole for "one of" checks
  return roles.includes(user.role);
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false;
  return roleHasPermission(user.role, permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(user: User | null, permissions: Permission[]): boolean {
  if (!user) return false;
  const userPermissions = getPermissionsForRole(user.role);
  return permissions.some((permission) => userPermissions.includes(permission));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(user: User | null, permissions: Permission[]): boolean {
  if (!user) return false;
  const userPermissions = getPermissionsForRole(user.role);
  return permissions.every((permission) => userPermissions.includes(permission));
}

/**
 * Check if a user's role is at least as high as the required role
 */
export function hasMinimumRole(user: User | null, minimumRole: UserRole): boolean {
  if (!user) return false;
  return getRoleLevel(user.role) <= getRoleLevel(minimumRole);
}

/**
 * Check if a user is in a specific role group
 */
export function isInRoleGroup(
  user: User | null,
  group: keyof typeof ROLE_GROUPS
): boolean {
  if (!user) return false;
  return ROLE_GROUPS[group].includes(user.role);
}

/**
 * Check if a user can access the admin dashboard
 */
export function canAccessAdmin(user: User | null): boolean {
  return isInRoleGroup(user, 'ADMIN_ACCESS');
}

/**
 * Check if a user can access the platform admin area
 */
export function canAccessPlatformAdmin(user: User | null): boolean {
  return hasRole(user, 'platform_admin');
}

/**
 * Check if a user can manage tenant settings
 */
export function canManageTenantSettings(user: User | null): boolean {
  return isInRoleGroup(user, 'TENANT_SETTINGS');
}

/**
 * Check if a user can manage fleet
 */
export function canManageFleet(user: User | null): boolean {
  return isInRoleGroup(user, 'FLEET_MANAGEMENT');
}

/**
 * Check if a user can manage bookings
 */
export function canManageBookings(user: User | null): boolean {
  return isInRoleGroup(user, 'BOOKING_MANAGEMENT');
}

/**
 * Check if a user can access a specific resource
 *
 * @param user - The user to check
 * @param resource - The resource type
 * @param action - The action to perform
 * @param resourceOwnerId - Optional owner ID for ownership checks
 */
export function canAccess(
  user: User | null,
  resource: ResourceType,
  action: ActionType,
  resourceOwnerId?: string
): PermissionCheckResult {
  if (!user) {
    return { allowed: false, reason: 'Not authenticated' };
  }

  // Get the required permission for this resource/action combination
  const permission = getRequiredPermission(resource, action);

  if (!permission) {
    return { allowed: false, reason: 'Unknown resource or action' };
  }

  // Check if user has the permission
  if (hasPermission(user, permission)) {
    return { allowed: true };
  }

  // Check for ownership-based access (e.g., customer viewing their own booking)
  if (resourceOwnerId && user.id === resourceOwnerId) {
    const ownPermission = getOwnResourcePermission(resource, action);
    if (ownPermission && hasPermission(user, ownPermission)) {
      return { allowed: true };
    }
  }

  return {
    allowed: false,
    reason: `Missing permission: ${permission}`,
  };
}

/**
 * Resource types for access control
 */
export type ResourceType =
  | 'booking'
  | 'vehicle'
  | 'category'
  | 'branch'
  | 'customer'
  | 'pricing'
  | 'coupon'
  | 'addon'
  | 'season'
  | 'page'
  | 'media'
  | 'user'
  | 'tenant'
  | 'settings';

/**
 * Action types for access control
 */
export type ActionType = 'view' | 'create' | 'update' | 'delete' | 'manage';

/**
 * Get the required permission for a resource/action combination
 */
function getRequiredPermission(
  resource: ResourceType,
  action: ActionType
): Permission | null {
  const permissionMap: Record<ResourceType, Record<ActionType, Permission | null>> = {
    booking: {
      view: PERMISSIONS.VIEW_BOOKINGS,
      create: PERMISSIONS.CREATE_BOOKINGS,
      update: PERMISSIONS.MODIFY_BOOKINGS,
      delete: PERMISSIONS.CANCEL_BOOKINGS,
      manage: PERMISSIONS.MANAGE_BOOKINGS,
    },
    vehicle: {
      view: PERMISSIONS.VIEW_FLEET,
      create: PERMISSIONS.MANAGE_FLEET,
      update: PERMISSIONS.MANAGE_FLEET,
      delete: PERMISSIONS.MANAGE_FLEET,
      manage: PERMISSIONS.MANAGE_FLEET,
    },
    category: {
      view: PERMISSIONS.VIEW_FLEET,
      create: PERMISSIONS.MANAGE_CATEGORIES,
      update: PERMISSIONS.MANAGE_CATEGORIES,
      delete: PERMISSIONS.MANAGE_CATEGORIES,
      manage: PERMISSIONS.MANAGE_CATEGORIES,
    },
    branch: {
      view: PERMISSIONS.VIEW_BRANCHES,
      create: PERMISSIONS.MANAGE_BRANCHES,
      update: PERMISSIONS.MANAGE_BRANCHES,
      delete: PERMISSIONS.MANAGE_BRANCHES,
      manage: PERMISSIONS.MANAGE_BRANCHES,
    },
    customer: {
      view: PERMISSIONS.VIEW_CUSTOMERS,
      create: PERMISSIONS.MANAGE_CUSTOMERS,
      update: PERMISSIONS.MANAGE_CUSTOMERS,
      delete: PERMISSIONS.MANAGE_CUSTOMERS,
      manage: PERMISSIONS.MANAGE_CUSTOMERS,
    },
    pricing: {
      view: PERMISSIONS.VIEW_PRICING,
      create: PERMISSIONS.MANAGE_PRICING,
      update: PERMISSIONS.MANAGE_PRICING,
      delete: PERMISSIONS.MANAGE_PRICING,
      manage: PERMISSIONS.MANAGE_PRICING,
    },
    coupon: {
      view: PERMISSIONS.VIEW_PRICING,
      create: PERMISSIONS.MANAGE_COUPONS,
      update: PERMISSIONS.MANAGE_COUPONS,
      delete: PERMISSIONS.MANAGE_COUPONS,
      manage: PERMISSIONS.MANAGE_COUPONS,
    },
    addon: {
      view: PERMISSIONS.VIEW_PRICING,
      create: PERMISSIONS.MANAGE_ADDONS,
      update: PERMISSIONS.MANAGE_ADDONS,
      delete: PERMISSIONS.MANAGE_ADDONS,
      manage: PERMISSIONS.MANAGE_ADDONS,
    },
    season: {
      view: PERMISSIONS.VIEW_PRICING,
      create: PERMISSIONS.MANAGE_SEASONS,
      update: PERMISSIONS.MANAGE_SEASONS,
      delete: PERMISSIONS.MANAGE_SEASONS,
      manage: PERMISSIONS.MANAGE_SEASONS,
    },
    page: {
      view: PERMISSIONS.VIEW_PAGES,
      create: PERMISSIONS.MANAGE_PAGES,
      update: PERMISSIONS.MANAGE_PAGES,
      delete: PERMISSIONS.MANAGE_PAGES,
      manage: PERMISSIONS.MANAGE_PAGES,
    },
    media: {
      view: PERMISSIONS.VIEW_PAGES,
      create: PERMISSIONS.MANAGE_MEDIA,
      update: PERMISSIONS.MANAGE_MEDIA,
      delete: PERMISSIONS.MANAGE_MEDIA,
      manage: PERMISSIONS.MANAGE_MEDIA,
    },
    user: {
      view: PERMISSIONS.MANAGE_USERS,
      create: PERMISSIONS.MANAGE_USERS,
      update: PERMISSIONS.MANAGE_USERS,
      delete: PERMISSIONS.MANAGE_USERS,
      manage: PERMISSIONS.MANAGE_USERS,
    },
    tenant: {
      view: PERMISSIONS.VIEW_ALL_TENANTS,
      create: PERMISSIONS.MANAGE_TENANTS,
      update: PERMISSIONS.MANAGE_TENANTS,
      delete: PERMISSIONS.MANAGE_TENANTS,
      manage: PERMISSIONS.MANAGE_TENANTS,
    },
    settings: {
      view: PERMISSIONS.MANAGE_TENANT_SETTINGS,
      create: PERMISSIONS.MANAGE_TENANT_SETTINGS,
      update: PERMISSIONS.MANAGE_TENANT_SETTINGS,
      delete: PERMISSIONS.MANAGE_TENANT_SETTINGS,
      manage: PERMISSIONS.MANAGE_TENANT_SETTINGS,
    },
  };

  return permissionMap[resource]?.[action] ?? null;
}

/**
 * Get the permission for accessing own resources (for customers)
 */
function getOwnResourcePermission(
  resource: ResourceType,
  action: ActionType
): Permission | null {
  const ownPermissionMap: Partial<
    Record<ResourceType, Partial<Record<ActionType, Permission>>>
  > = {
    booking: {
      view: PERMISSIONS.VIEW_OWN_BOOKINGS,
      update: PERMISSIONS.MANAGE_OWN_BOOKINGS,
      delete: PERMISSIONS.MANAGE_OWN_BOOKINGS,
    },
  };

  return ownPermissionMap[resource]?.[action] ?? null;
}

/**
 * Create a permission guard for use in components
 *
 * Usage:
 * ```tsx
 * const canEdit = createPermissionGuard(user, PERMISSIONS.MANAGE_FLEET);
 * if (!canEdit()) {
 *   return <AccessDenied />;
 * }
 * ```
 */
export function createPermissionGuard(
  user: User | null,
  ...requiredPermissions: Permission[]
) {
  return () => hasAllPermissions(user, requiredPermissions);
}

/**
 * Create a role guard for use in components
 *
 * Usage:
 * ```tsx
 * const isAdmin = createRoleGuard(user, 'tenant_admin', 'platform_admin');
 * if (!isAdmin()) {
 *   return <AccessDenied />;
 * }
 * ```
 */
export function createRoleGuard(user: User | null, ...allowedRoles: UserRole[]) {
  return () => hasAnyRole(user, allowedRoles);
}
