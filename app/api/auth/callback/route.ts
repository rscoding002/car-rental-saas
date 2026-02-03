import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { sendWelcome } from '@/lib/email/user-emails';
import type { NextRequest } from 'next/server';
import type { Database } from '@/lib/supabase/types';

/**
 * Auth Callback Route Handler
 *
 * This route handles the callback from Supabase Auth after:
 * - Email confirmation (sign up)
 * - Password reset
 * - Magic link sign in
 * - OAuth sign in
 *
 * The route exchanges the auth code for a session and redirects
 * the user to the appropriate page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  // Get the auth code from the URL
  const code = searchParams.get('code');

  // Get the type of auth action (signup, recovery, etc.)
  const type = searchParams.get('type');

  // Get the redirect destination (defaults to home)
  const redirectTo = searchParams.get('redirect_to') ?? '/';

  // Get error parameters if authentication failed
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle auth errors
  if (error) {
    console.error('Auth callback error:', error, errorDescription);
    // Redirect to login with error message
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', error);
    if (errorDescription) {
      loginUrl.searchParams.set('error_description', errorDescription);
    }
    return NextResponse.redirect(loginUrl);
  }

  // If we have a code, exchange it for a session
  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError.message);

      // For email verification errors, redirect to verify-email page
      if (type === 'signup' || type === 'email') {
        const verifyUrl = new URL('/verify-email', origin);
        verifyUrl.searchParams.set('error', exchangeError.message);
        return NextResponse.redirect(verifyUrl);
      }

      // Redirect to login with error
      const loginUrl = new URL('/login', origin);
      loginUrl.searchParams.set('error', 'auth_error');
      loginUrl.searchParams.set('error_description', exchangeError.message);
      return NextResponse.redirect(loginUrl);
    }

    // Handle email verification success
    if (type === 'signup' || type === 'email') {
      // Get the authenticated user
      const { data: { user: authUser } } = await supabase.auth.getUser();

      // Send welcome email (non-blocking)
      if (authUser?.id) {
        const locale = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0] || 'en';
        sendWelcome(supabase, authUser.id, locale).catch(err => {
          console.error('[Auth Callback] Failed to send welcome email:', err);
        });
      }

      const verifyUrl = new URL('/verify-email', origin);
      verifyUrl.searchParams.set('verified', 'true');
      return NextResponse.redirect(verifyUrl);
    }

    // Handle password recovery - redirect to reset password page
    if (type === 'recovery') {
      return NextResponse.redirect(new URL('/reset-password', origin));
    }

    // Successfully authenticated, redirect to the intended destination
    // Ensure the redirect path is relative and doesn't include the origin
    const redirectUrl = new URL(redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`, origin);

    return NextResponse.redirect(redirectUrl);
  }

  // No code provided - redirect to login
  return NextResponse.redirect(new URL('/login', origin));
}
