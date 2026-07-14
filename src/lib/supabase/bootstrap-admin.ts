import crypto from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

// Not `import "server-only"` here deliberately: this module is also
// imported by prisma/seed.ts and prisma/bootstrap-admin.ts, which run under
// tsx (plain Node), not Next's "react-server" build — the marker package
// throws unconditionally outside that specific webpack condition. It's
// still never reachable from a client component (only from the server
// action in src/actions/auth.ts and the two Node scripts above).
function createAdminClient() {
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

export const DEFAULT_ADMIN_EMAIL =
  process.env.DEFAULT_ADMIN_EMAIL?.trim().toLowerCase() || "admin@flyingfish.in";

const DEFAULT_ADMIN_FULL_NAME = "Super Admin";

// Placeholder values ship in .env.example so the app can boot without real
// Supabase credentials configured yet — treat those as "not configured".
function isConfigured(value: string | undefined): value is string {
  return !!value && !value.includes("xxxxxxxxxxxx") && !value.includes("your-");
}

async function findAuthUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
) {
  const target = email.toLowerCase();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match) return match;

    if (data.users.length < perPage) return null;
    page += 1;
  }
}

export type EnsureDefaultAdminResult =
  | { status: "skipped"; reason: string }
  | { status: "linked"; email: string }
  | { status: "created"; email: string; password: string };

// Idempotently makes sure a Supabase Auth account + linked SUPER_ADMIN
// `public.users` profile exist for DEFAULT_ADMIN_EMAIL. Safe to call
// repeatedly (from the seed script or standalone) — a second run just links
// or no-ops instead of creating a duplicate account.
export async function ensureDefaultAdmin(): Promise<EnsureDefaultAdminResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isConfigured(url) || !isConfigured(serviceKey)) {
    return {
      status: "skipped",
      reason:
        "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured with real values.",
    };
  }

  const email = DEFAULT_ADMIN_EMAIL;
  const admin = createAdminClient();

  let authUser = await findAuthUserByEmail(admin, email);
  let password: string | undefined;

  if (!authUser) {
    password = process.env.DEFAULT_ADMIN_PASSWORD?.trim() || crypto.randomBytes(9).toString("base64url");
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: DEFAULT_ADMIN_FULL_NAME, role: "SUPER_ADMIN" },
    });
    if (error) throw error;
    authUser = data.user;
  }

  // Keyed on email (not id) so a stale/orphaned profile row left over from
  // an earlier failed setup gets re-pointed at the real auth user id rather
  // than colliding on the unique email constraint.
  try {
    await prisma.user.upsert({
      where: { email },
      update: { id: authUser.id, role: "SUPER_ADMIN", isActive: true },
      create: {
        id: authUser.id,
        email,
        fullName: DEFAULT_ADMIN_FULL_NAME,
        role: "SUPER_ADMIN",
        isActive: true,
      },
    });
  } catch (err) {
    throw new Error(
      `Found a Supabase Auth account for ${email}, but could not link it to a ` +
        `public.users profile — an existing row with that email has other records ` +
        `pointing at its old id. Resolve manually in Prisma Studio (npm run db:studio), ` +
        `then re-run this. Original error: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return password ? { status: "created", email, password } : { status: "linked", email };
}
