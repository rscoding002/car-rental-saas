'use client';

import { useEffect, useCallback, useRef } from 'react';

import { createClient } from '@/lib/supabase/client';

/**
 * Session refresh interval in milliseconds (4 minutes)
 * Supabase tokens expire after 1 hour by default,
 * but we refresh more frequently to ensure smooth UX
 */
const REFRESH_INTERVAL = 4 * 60 * 1000;

/**
 * Session activity check interval (1 minute)
 */
const ACTIVITY_CHECK_INTERVAL = 60 * 1000;

/**
 * Inactivity timeout before stopping refresh (30 minutes)
 */
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

/**
 * Hook to handle session refresh
 *
 * This hook automatically refreshes the session token at regular intervals
 * to prevent expiration during active use. It also tracks user activity
 * and stops refreshing if the user is inactive.
 *
 * Usage:
 * ```tsx
 * 'use client'
 * import { useSessionRefresh } from '@/lib/auth/session'
 *
 * export function AuthWrapper({ children }) {
 *   useSessionRefresh()
 *   return children
 * }
 * ```
 */
export function useSessionRefresh() {
  const lastActivityRef = useRef<number>(Date.now());
  const supabase = createClient();

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Refresh the session
  const refreshSession = useCallback(async () => {
    const timeSinceActivity = Date.now() - lastActivityRef.current;

    // Don't refresh if user has been inactive for too long
    if (timeSinceActivity > INACTIVITY_TIMEOUT) {
      return;
    }

    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh error:', error.message);
      }
    } catch (err) {
      console.error('Session refresh failed:', err);
    }
  }, [supabase]);

  useEffect(() => {
    // Track user activity
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];

    activityEvents.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Set up refresh interval
    const refreshInterval = setInterval(refreshSession, REFRESH_INTERVAL);

    // Initial refresh
    refreshSession();

    // Cleanup
    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(refreshInterval);
    };
  }, [refreshSession, updateActivity]);
}

/**
 * Hook to handle visibility-based session refresh
 *
 * Refreshes the session when the tab becomes visible after being hidden.
 * This ensures the session is fresh when the user returns to the tab.
 *
 * Usage:
 * ```tsx
 * 'use client'
 * import { useVisibilityRefresh } from '@/lib/auth/session'
 *
 * export function AuthWrapper({ children }) {
 *   useVisibilityRefresh()
 *   return children
 * }
 * ```
 */
export function useVisibilityRefresh() {
  const supabase = createClient();

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          await supabase.auth.refreshSession();
        } catch (err) {
          console.error('Visibility refresh failed:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [supabase]);
}

/**
 * Combined session management hook
 *
 * Combines session refresh and visibility refresh into a single hook.
 *
 * Usage:
 * ```tsx
 * 'use client'
 * import { useSessionManagement } from '@/lib/auth/session'
 *
 * export function AuthWrapper({ children }) {
 *   useSessionManagement()
 *   return children
 * }
 * ```
 */
export function useSessionManagement() {
  useSessionRefresh();
  useVisibilityRefresh();
}

/**
 * Get the current session expiry time
 */
export async function getSessionExpiry(): Promise<Date | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.expires_at) {
    return null;
  }

  return new Date(session.expires_at * 1000);
}

/**
 * Check if the session is about to expire (within 5 minutes)
 */
export async function isSessionExpiringSoon(): Promise<boolean> {
  const expiry = await getSessionExpiry();

  if (!expiry) {
    return false;
  }

  const fiveMinutes = 5 * 60 * 1000;
  return expiry.getTime() - Date.now() < fiveMinutes;
}

/**
 * Force refresh the current session
 */
export async function forceRefreshSession(): Promise<boolean> {
  const supabase = createClient();

  try {
    const { error } = await supabase.auth.refreshSession();
    return !error;
  } catch {
    return false;
  }
}
