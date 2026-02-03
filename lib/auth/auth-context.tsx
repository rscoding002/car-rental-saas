'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { Session, User as AuthUser } from '@supabase/supabase-js';
import type { ReactNode } from 'react';

import { createClient } from '@/lib/supabase/client';
import type { User, UserRole } from '@/lib/supabase/types';

/**
 * Auth state representing the current authentication status
 */
export interface AuthState {
  /** Supabase auth user (from auth.users) */
  authUser: AuthUser | null;
  /** Current session */
  session: Session | null;
  /** Application user profile (from public.users) */
  user: User | null;
  /** Whether auth state is being loaded */
  isLoading: boolean;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Auth error if any */
  error: Error | null;
}

/**
 * Auth context value with state and methods
 */
export interface AuthContextValue extends AuthState {
  /** Sign in with email and password */
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  /** Sign up with email and password */
  signUpWithEmail: (
    email: string,
    password: string,
    metadata?: { firstName?: string; lastName?: string }
  ) => Promise<{ error: Error | null }>;
  /** Sign out the current user */
  signOut: () => Promise<{ error: Error | null }>;
  /** Send password reset email */
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  /** Update password (when user has reset token) */
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  /** Refresh the user profile from the database */
  refreshUser: () => Promise<void>;
  /** Check if user has a specific role */
  hasRole: (role: UserRole) => boolean;
  /** Check if user has any of the specified roles */
  hasAnyRole: (roles: UserRole[]) => boolean;
}

// Default context value
const defaultContextValue: AuthContextValue = {
  authUser: null,
  session: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  signInWithEmail: async () => ({ error: new Error('Auth context not initialized') }),
  signUpWithEmail: async () => ({ error: new Error('Auth context not initialized') }),
  signOut: async () => ({ error: new Error('Auth context not initialized') }),
  resetPassword: async () => ({ error: new Error('Auth context not initialized') }),
  updatePassword: async () => ({ error: new Error('Auth context not initialized') }),
  refreshUser: async () => {},
  hasRole: () => false,
  hasAnyRole: () => false,
};

// Create the context
const AuthContext = createContext<AuthContextValue>(defaultContextValue);

/**
 * Props for AuthProvider component
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider Component
 *
 * Wraps the application to provide authentication state and methods.
 * Automatically listens for auth state changes and fetches user profile.
 *
 * Usage:
 * ```tsx
 * // In your root layout or app
 * import { AuthProvider } from '@/lib/auth/auth-context'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <AuthProvider>
 *       {children}
 *     </AuthProvider>
 *   )
 * }
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Create Supabase client
  const supabase = useMemo(() => createClient(), []);

  /**
   * Fetch user profile from the database
   */
  const fetchUserProfile = useCallback(
    async (authId: string): Promise<User | null> => {
      try {
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', authId)
          .single();

        if (fetchError) {
          // User might not exist in public.users yet (new registration)
          if (fetchError.code === 'PGRST116') {
            return null;
          }
          console.error('Error fetching user profile:', fetchError);
          return null;
        }

        return data;
      } catch (err) {
        console.error('Error fetching user profile:', err);
        return null;
      }
    },
    [supabase]
  );

  /**
   * Refresh user profile from the database
   */
  const refreshUser = useCallback(async () => {
    if (!authUser) {
      setUser(null);
      return;
    }

    const profile = await fetchUserProfile(authUser.id);
    setUser(profile);
  }, [authUser, fetchUserProfile]);

  /**
   * Sign in with email and password
   */
  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        setError(null);
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError);
          return { error: signInError };
        }

        return { error: null };
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Sign in failed');
        setError(error);
        return { error };
      }
    },
    [supabase]
  );

  /**
   * Sign up with email and password
   */
  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      metadata?: { firstName?: string; lastName?: string }
    ) => {
      try {
        setError(null);
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: metadata?.firstName,
              last_name: metadata?.lastName,
            },
          },
        });

        if (signUpError) {
          setError(signUpError);
          return { error: signUpError };
        }

        return { error: null };
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Sign up failed');
        setError(error);
        return { error };
      }
    },
    [supabase]
  );

  /**
   * Sign out the current user
   */
  const signOut = useCallback(async () => {
    try {
      setError(null);
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        setError(signOutError);
        return { error: signOutError };
      }

      // Clear local state
      setAuthUser(null);
      setSession(null);
      setUser(null);

      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign out failed');
      setError(error);
      return { error };
    }
  }, [supabase]);

  /**
   * Send password reset email
   */
  const resetPassword = useCallback(
    async (email: string) => {
      try {
        setError(null);
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/api/auth/callback?redirect_to=/reset-password`,
        });

        if (resetError) {
          setError(resetError);
          return { error: resetError };
        }

        return { error: null };
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Password reset failed');
        setError(error);
        return { error };
      }
    },
    [supabase]
  );

  /**
   * Update password (when user has reset token)
   */
  const updatePassword = useCallback(
    async (newPassword: string) => {
      try {
        setError(null);
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateError) {
          setError(updateError);
          return { error: updateError };
        }

        return { error: null };
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Password update failed');
        setError(error);
        return { error };
      }
    },
    [supabase]
  );

  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback(
    (role: UserRole): boolean => {
      return user?.role === role;
    },
    [user]
  );

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = useCallback(
    (roles: UserRole[]): boolean => {
      return user ? roles.includes(user.role) : false;
    },
    [user]
  );

  // Initialize auth state and listen for changes
  useEffect(() => {
    let mounted = true;

    // Get initial session
    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          if (mounted) {
            setError(sessionError);
            setIsLoading(false);
          }
          return;
        }

        if (mounted) {
          setSession(initialSession);
          setAuthUser(initialSession?.user ?? null);

          // Fetch user profile if authenticated
          if (initialSession?.user) {
            const profile = await fetchUserProfile(initialSession.user.id);
            if (mounted) {
              setUser(profile);
            }
          }

          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Auth initialization failed'));
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      setAuthUser(newSession?.user ?? null);

      // Handle different auth events
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (newSession?.user) {
          const profile = await fetchUserProfile(newSession.user.id);
          if (mounted) {
            setUser(profile);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'USER_UPDATED') {
        // Refresh user profile when user is updated
        if (newSession?.user) {
          const profile = await fetchUserProfile(newSession.user.id);
          if (mounted) {
            setUser(profile);
          }
        }
      }
    });

    // Cleanup subscription on unmount
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchUserProfile]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<AuthContextValue>(
    () => ({
      authUser,
      session,
      user,
      isLoading,
      isAuthenticated: !!session && !!authUser,
      error,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      resetPassword,
      updatePassword,
      refreshUser,
      hasRole,
      hasAnyRole,
    }),
    [
      authUser,
      session,
      user,
      isLoading,
      error,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      resetPassword,
      updatePassword,
      refreshUser,
      hasRole,
      hasAnyRole,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access the auth context
 *
 * @throws Error if used outside of AuthProvider
 *
 * Usage:
 * ```tsx
 * 'use client'
 * import { useAuthContext } from '@/lib/auth/auth-context'
 *
 * export function MyComponent() {
 *   const { user, isAuthenticated, signOut } = useAuthContext()
 *
 *   if (!isAuthenticated) {
 *     return <p>Please sign in</p>
 *   }
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user?.first_name}</p>
 *       <button onClick={() => signOut()}>Sign Out</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
}

// Export the context for advanced use cases
export { AuthContext };
