import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. Only import from trusted server-side
// code (server actions / route handlers) that has already authorized the
// caller, e.g. inviting staff or performing admin-only writes.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
