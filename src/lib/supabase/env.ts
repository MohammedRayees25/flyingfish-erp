// Centralizes reading + validating the Supabase env vars so every client
// factory fails the same way with the same message, instead of each one
// independently doing `process.env.X!` and letting the Supabase SDK throw
// its own generic "supabaseKey is required" error deep in a request.
//
// NEXT_PUBLIC_SUPABASE_ANON_KEY is the canonical name (documented in
// README.md and used by this codebase's Supabase client calls). Newer
// Supabase projects surface the same value in their dashboard as a
// "publishable key" — accept that name too so a project configured with
// the newer naming still works without renaming anything in the hosting
// provider's environment variables.
export class MissingSupabaseEnvError extends Error {
  constructor(missing: string[]) {
    super(
      `Missing required Supabase environment variable(s): ${missing.join(", ")}. ` +
        "Set them in your deployment environment (see .env.example)."
    );
    this.name = "MissingSupabaseEnvError";
  }
}

function isConfigured(value: string | undefined): value is string {
  return !!value && !value.includes("xxxxxxxxxxxx") && !value.includes("your-");
}

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!isConfigured(url)) throw new MissingSupabaseEnvError(["NEXT_PUBLIC_SUPABASE_URL"]);
  return url;
}

export function getSupabaseAnonKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!isConfigured(key)) {
    throw new MissingSupabaseEnvError([
      "NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)",
    ]);
  }
  return key;
}

export function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isConfigured(key)) throw new MissingSupabaseEnvError(["SUPABASE_SERVICE_ROLE_KEY"]);
  return key;
}
