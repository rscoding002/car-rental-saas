import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';
import type { Database } from '@/lib/supabase/types';

/**
 * Sign Out Route Handler
 *
 * This route handles user sign out by:
 * 1. Signing out from Supabase (invalidates session)
 * 2. Clearing auth cookies
 * 3. Redirecting to the specified page (or home)
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  // Get the redirect destination from the request body or default to home
  let redirectTo = '/';
  try {
    const body = await request.json();
    if (body.redirectTo) {
      redirectTo = body.redirectTo;
    }
  } catch {
    // No body or invalid JSON - use default redirect
  }

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

  // Sign out from Supabase
  await supabase.auth.signOut();

  // Redirect to the specified destination
  const { origin } = new URL(request.url);
  return NextResponse.redirect(new URL(redirectTo, origin), {
    status: 302,
  });
}

/**
 * GET handler for simple sign-out links
 * Allows sign-out via a simple link click
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const { searchParams, origin } = new URL(request.url);

  const redirectTo = searchParams.get('redirect_to') ?? '/';

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

  // Sign out from Supabase
  await supabase.auth.signOut();

  // Redirect to the specified destination
  return NextResponse.redirect(new URL(redirectTo, origin), {
    status: 302,
  });
}
