/**
 * Supabase Client Exports
 *
 * Usage:
 * - Client Components: import { createClient } from '@/lib/supabase/client'
 * - Server Components: import { createClient } from '@/lib/supabase/server'
 * - Admin operations:  import { createAdminClient } from '@/lib/supabase/admin'
 */

export { createClient } from "./client";
export { createClient as createServerClient } from "./server";
export { createAdminClient } from "./admin";
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  Json,
} from "./types";
