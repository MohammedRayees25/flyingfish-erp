"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/supabase/bootstrap-admin";

export type ActionState = { error?: string } | undefined;

export async function signIn(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (error) {
    console.error("[signIn] Supabase client init failed:", error);
    return { error: "Sign-in is temporarily unavailable. Please try again shortly." };
  }

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Invalid email or password" };
  }

  let profile: Awaited<ReturnType<typeof prisma.user.findUnique>>;
  try {
    profile = await prisma.user.findUnique({ where: { id: data.user.id } });
    if (!profile) {
      profile = await tryLinkDefaultAdmin(data.user.id, data.user.email);
    }
  } catch (error) {
    console.error("[signIn] database lookup failed:", error);
    await supabase.auth.signOut();
    return { error: "Sign-in is temporarily unavailable. Please try again shortly." };
  }

  if (!profile) {
    await supabase.auth.signOut();
    return {
      error: "No staff profile is linked to this account. Contact an admin.",
    };
  }

  if (!profile.isActive) {
    await supabase.auth.signOut();
    return { error: "This account has been deactivated. Contact an admin." };
  }

  redirect("/");
}

// Self-heals the exact "first login, trigger never ran / account predates
// it" gap: if this is the designated default admin email and no SUPER_ADMIN
// profile exists yet anywhere, provision one now instead of locking the
// operator out. No-ops (returns null) for every other account — a mismatched
// or already-provisioned admin never falls into this path.
async function tryLinkDefaultAdmin(authUserId: string, email: string | undefined) {
  if (!email || email.toLowerCase() !== DEFAULT_ADMIN_EMAIL) return null;

  const existingSuperAdmin = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
  if (existingSuperAdmin > 0) return null;

  return prisma.user.upsert({
    where: { email },
    update: { id: authUserId, role: "SUPER_ADMIN", isActive: true },
    create: {
      id: authUserId,
      email,
      fullName: "Super Admin",
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });
}

export async function signOut() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error("[signOut] failed:", error);
  }
  redirect("/login");
}
