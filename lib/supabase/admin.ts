import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

/**
 * Creates a Supabase admin client with service role privileges.
 * This client bypasses Row Level Security (RLS) and should ONLY be used
 * in secure server-side contexts.
 *
 * WARNING: Never expose this client or the service role key to the browser.
 *
 * Usage (Server-side only):
 * ```ts
 * import { createAdminClient } from '@/lib/supabase/admin'
 *
 * // In a Server Action or Route Handler
 * const supabase = createAdminClient()
 * const { data } = await supabase.from('table').select()
 * ```
 *
 * Common use cases:
 * - Platform admin operations
 * - Background jobs / cron tasks
 * - Webhook handlers
 * - Operations that need to bypass RLS
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
    );
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
