import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { canAccess, type Module } from "@/lib/permissions";
import type { User } from "@prisma/client";

// Cached per-request: safe to call from multiple server components without
// re-hitting Supabase/Prisma each time.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const profile = await prisma.user.findUnique({ where: { id: authUser.id } });
  return profile;
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
