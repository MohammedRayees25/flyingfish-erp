import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "./env";

// Service-role client — bypasses RLS. Only import from trusted server-side
// code (server actions / route handlers) that has already authorized the
// caller, e.g. inviting staff or performing admin-only writes.
export function createAdminClient() {
  return createSupabaseClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
