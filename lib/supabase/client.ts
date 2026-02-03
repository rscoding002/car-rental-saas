"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./types";

/**
 * Creates a Supabase client for use in Client Components.
 * This client runs in the browser and uses the anon key.
 *
 * Usage:
 * ```tsx
 * 'use client'
 * import { createClient } from '@/lib/supabase/client'
 *
 * export function MyComponent() {
 *   const supabase = createClient()
 *   // Use supabase...
 * }
 * ```
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
