import "server-only";
import { cache } from "react";
import { redirect, unstable_rethrow } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { canAccess, type Module } from "@/lib/permissions";
import type { User } from "@prisma/client";

// Cached per-request: safe to call from multiple server components without
// re-hitting Supabase/Prisma each time. Never throws a *real* error — if
// Supabase is misconfigured/unreachable or the database is down, this
// degrades to "not signed in" (null) instead of taking down every page
// that calls it. unstable_rethrow lets Next's own internal control-flow
// signals (redirect/notFound/the dynamic-rendering bailout used by
// cookies()) pass through untouched — swallowing those would be a real bug,
// not graceful degradation.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return null;

    const profile = await prisma.user.findUnique({ where: { id: authUser.id } });
    return profile;
  } catch (error) {
    unstable_rethrow(error);
    console.error("[getCurrentUser] failed:", error);
    return null;
  }
});

// Use in Server Components / layouts that require a signed-in user with a
// provisioned profile. Redirects to /login otherwise.
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isActive) redirect("/login?error=inactive");
  return user;
}

export async function requireModuleAccess(module: Module): Promise<User> {
  const user = await requireUser();
  if (!canAccess(user.role, module)) redirect("/?error=forbidden");
  return user;
}
