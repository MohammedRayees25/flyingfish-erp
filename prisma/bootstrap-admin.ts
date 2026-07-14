// Standalone entrypoint for `npm run db:bootstrap-admin` — ensures the
// default SUPER_ADMIN account exists without touching any other data.
// Safe to run repeatedly (e.g. against production) after `db:deploy`.
import { ensureDefaultAdmin } from "@/lib/supabase/bootstrap-admin";

async function main() {
  const result = await ensureDefaultAdmin();

  if (result.status === "skipped") {
    console.log(`Skipped: ${result.reason}`);
    console.log(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to real values to run this."
    );
    return;
  }

  if (result.status === "created") {
    console.log(`Created Super Admin account: ${result.email}`);
    console.log(`Password: ${result.password}`);
    console.log("Save this now — it will not be shown again. Sign in at /login.");
    return;
  }

  console.log(`Linked existing Supabase Auth account ${result.email} to a SUPER_ADMIN profile.`);
  console.log("Sign in at /login with that account's existing password.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
