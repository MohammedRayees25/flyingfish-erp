"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess, getCurrentUser } from "@/lib/auth/current-user";
import { getOrCreateCompanySettings } from "@/lib/settings-data";
import {
  companySettingsSchema,
  rentalItemSchema,
  type CompanySettingsInput,
  type RentalItemInput,
} from "@/lib/validations/settings";
import type { AuditAction, UserRole } from "@prisma/client";

export type SettingsActionState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

function fieldErrorsFrom(error: import("zod").ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    fieldErrors[String(issue.path[0])] = issue.message;
  }
  return fieldErrors;
}

// Small internal utility other actions call to record what happened. Not a
// validated form action -- callers are trusted, server-side code paths.
export async function logAuditEvent(
  action: AuditAction,
  entityType: string,
  entityId: string | null,
  summary: string
): Promise<void> {
  const user = await getCurrentUser();
  await prisma.auditLog.create({
    data: {
      userId: user?.id ?? null,
      action,
      entityType,
      entityId,
      summary,
    },
  });
}

export async function updateCompanySettings(
  input: CompanySettingsInput
): Promise<SettingsActionState> {
  await requireModuleAccess("settings");

  const parsed = companySettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const data = parsed.data;

  const current = await getOrCreateCompanySettings();

  await prisma.companySettings.update({
    where: { id: current.id },
    data: {
      companyName: data.companyName,
      logoUrl: data.logoUrl || null,
      address: data.address || null,
      gstNumber: data.gstNumber || null,
      phone: data.phone || null,
      email: data.email || null,
      emailNotificationsEnabled: data.emailNotificationsEnabled,
      whatsappNotificationsEnabled: data.whatsappNotificationsEnabled,
    },
  });

  await logAuditEvent("UPDATE", "CompanySettings", current.id, "Updated company settings");

  revalidatePath("/settings");
  return undefined;
}

export async function createRentalItem(input: RentalItemInput): Promise<SettingsActionState> {
  await requireModuleAccess("settings");

  const parsed = rentalItemSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const data = parsed.data;

  const existing = await prisma.rentalItem.findUnique({ where: { name: data.name } });
  if (existing) {
    return { error: "A rental item with this name already exists.", fieldErrors: { name: "Already exists" } };
  }

  const item = await prisma.rentalItem.create({
    data: { name: data.name, dailyRate: data.dailyRate, isActive: data.isActive },
  });

  await logAuditEvent("CREATE", "RentalItem", item.id, `Added rental item "${item.name}"`);

  revalidatePath("/settings");
  return undefined;
}

export async function updateRentalItem(
  rentalItemId: string,
  input: RentalItemInput
): Promise<SettingsActionState> {
  await requireModuleAccess("settings");

  const parsed = rentalItemSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const data = parsed.data;

  const existing = await prisma.rentalItem.findUnique({ where: { name: data.name } });
  if (existing && existing.id !== rentalItemId) {
    return { error: "A rental item with this name already exists.", fieldErrors: { name: "Already exists" } };
  }

  const item = await prisma.rentalItem.update({
    where: { id: rentalItemId },
    data: { name: data.name, dailyRate: data.dailyRate, isActive: data.isActive },
  });

  await logAuditEvent("UPDATE", "RentalItem", item.id, `Updated rental item "${item.name}"`);

  revalidatePath("/settings");
  return undefined;
}

export async function deleteRentalItem(rentalItemId: string): Promise<SettingsActionState> {
  await requireModuleAccess("settings");

  const item = await prisma.rentalItem.delete({ where: { id: rentalItemId } });

  await logAuditEvent("DELETE", "RentalItem", item.id, `Deleted rental item "${item.name}"`);

  revalidatePath("/settings");
  return undefined;
}

export async function updateUserRole(userId: string, role: UserRole): Promise<SettingsActionState> {
  const currentUser = await requireModuleAccess("settings");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "User not found." };

  if (target.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
    const activeSuperAdmins = await prisma.user.count({
      where: { role: "SUPER_ADMIN", isActive: true },
    });
    if (activeSuperAdmins <= 1) {
      return { error: "Cannot remove the last active Super Admin." };
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });

  await logAuditEvent(
    "UPDATE",
    "User",
    userId,
    `${currentUser.fullName} changed ${target.fullName}'s role to ${role}`
  );

  revalidatePath("/settings");
  return undefined;
}

export async function toggleUserActive(userId: string, isActive: boolean): Promise<SettingsActionState> {
  const currentUser = await requireModuleAccess("settings");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "User not found." };

  if (!isActive && target.role === "SUPER_ADMIN") {
    const activeSuperAdmins = await prisma.user.count({
      where: { role: "SUPER_ADMIN", isActive: true },
    });
    if (activeSuperAdmins <= 1) {
      return { error: "Cannot remove the last active Super Admin." };
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { isActive } });

  await logAuditEvent(
    "UPDATE",
    "User",
    userId,
    `${currentUser.fullName} ${isActive ? "reactivated" : "deactivated"} ${target.fullName}`
  );

  revalidatePath("/settings");
  return undefined;
}
