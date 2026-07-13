"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";

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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Invalid email or password" };
  }

  const profile = await prisma.user.findUnique({
    where: { id: data.user.id },
  });

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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
