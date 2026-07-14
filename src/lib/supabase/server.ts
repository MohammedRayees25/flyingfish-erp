import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

// Creates a Supabase client bound to the current request's cookies.
// Must be called fresh inside each server component / action / route
// handler — do not cache or share the instance across requests.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component without a mutable cookie jar.
          // Safe to ignore as long as middleware refreshes the session.
        }
      },
    },
  });
}
