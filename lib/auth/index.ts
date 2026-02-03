// Auth module exports

// Config exports
export {
  authConfig,
  authRoutes,
  getAuthCallbackUrl,
  getBaseUrl,
  getSignInRedirectUrl,
} from './config';
export type { AuthRoute } from './config';

// Context exports
export { AuthContext, AuthProvider, useAuthContext } from './auth-context';
export type { AuthContextValue, AuthState } from './auth-context';

// Hook exports
export { useAuth } from './use-auth';
export type { UseAuthReturn } from './use-auth';

// Roles and permissions exports
export {
  ALL_ROLES,
  getPermissionsForRole,
  getRoleBadgeColor,
  getRoleDisplayName,
  getRoleLevel,
  isRoleHigherOrEqual,
  isRoleInGroup,
  PERMISSIONS,
  ROLE_GROUPS,
  ROLE_HIERARCHY,
  roleHasPermission,
  ROLES,
} from './roles';
export type { Permission } from './roles';

// Permission checking utilities
export {
  canAccess,
  canAccessAdmin,
  canAccessPlatformAdmin,
  canManageBookings,
  canManageFleet,
  canManageTenantSettings,
  createPermissionGuard,
  createRoleGuard,
  hasAllPermissions,
  hasAnyPermission,
  hasAnyRole,
  hasMinimumRole,
  hasPermission,
  hasRole,
  isInRoleGroup,
} from './permissions';
export type {
  ActionType,
  PermissionCheckResult,
  ResourceType,
} from './permissions';

// Server-side middleware utilities
export {
  checkPlatformAdminApi,
  checkRolesApi,
  getCurrentUser,
  getUserRole,
  isAuthenticated,
  protectLayout,
  requireAdminAccess,
  requireAnyRole,
  requireAuth,
  requirePlatformAdmin,
  requireRole,
  requireTenantSettings,
} from './middleware';
export type { ApiAuthResult, AuthCheckResult } from './middleware';

// Session management utilities
export {
  forceRefreshSession,
  getSessionExpiry,
  isSessionExpiringSoon,
  useSessionManagement,
  useSessionRefresh,
  useVisibilityRefresh,
} from './session';

// Server actions for profile management
export {
  getCurrentUserProfile,
  profileUpdateSchema,
  signOutAction,
  signOutAndRedirectToLogin,
  updateLanguagePreference,
  updateNotificationPreferences,
  updateUserAvatar,
  updateUserProfile,
} from './actions';
export type { ProfileActionResult, ProfileUpdateInput, SignOutResult } from './actions';
