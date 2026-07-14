"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { guestSchema, type GuestInput } from "@/lib/validations/guest";

export type GuestActionState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-10) || digits;
}

export async function findDuplicateGuests(phone: string, fullName: string) {
  await requireModuleAccess("guests");
  const normalized = normalizePhone(phone);
  if (normalized.length < 5) return [];

  const candidates = await prisma.guest.findMany({
    where: {
      OR: [
        { phone: { contains: normalized } },
        { fullName: { equals: fullName.trim(), mode: "insensitive" } },
      ],
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  return candidates;
}

export type GuestOption = { id: string; fullName: string; phone: string };

// Lightweight guest search for comboboxes (e.g. the booking form's guest
// picker) — distinct from findDuplicateGuests, which is tuned for matching
// near-duplicates rather than general lookup.
export async function searchGuestsForSelect(query: string): Promise<GuestOption[]> {
  await requireModuleAccess("guests");
  const q = query.trim();
  if (q.length < 1) {
    const recent = await prisma.guest.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, fullName: true, phone: true },
    });
    return recent;
  }

  const guests = await prisma.guest.findMany({
    where: {
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { fullName: "asc" },
    take: 10,
    select: { id: true, fullName: true, phone: true },
  });
  return guests;
}

function fieldErrorsFrom(error: import("zod").ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    fieldErrors[String(issue.path[0])] = issue.message;
  }
  return fieldErrors;
}

export async function createGuest(input: GuestInput): Promise<GuestActionState> {
  await requireModuleAccess("guests");

  const parsed = guestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = parsed.data;

  await prisma.guest.create({
    data: {
      fullName: data.fullName,
      phone: data.phone,
      email: data.email || null,
      nationality: data.nationality || null,
      emergencyContactName: data.emergencyContactName || null,
      emergencyContactPhone: data.emergencyContactPhone || null,
      medicalDeclaration: data.medicalDeclaration,
      medicalNotes: data.medicalNotes || null,
      swimmingStatus: data.swimmingStatus,
      certificationLevel: data.certificationLevel,
      previousDives: data.previousDives,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      source: data.source || null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/guests");
  return undefined;
}

export async function updateGuest(
  guestId: string,
  input: GuestInput
): Promise<GuestActionState> {
  await requireModuleAccess("guests");

  const parsed = guestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = parsed.data;

  await prisma.guest.update({
    where: { id: guestId },
    data: {
      fullName: data.fullName,
      phone: data.phone,
      email: data.email || null,
      nationality: data.nationality || null,
      emergencyContactName: data.emergencyContactName || null,
      emergencyContactPhone: data.emergencyContactPhone || null,
      medicalDeclaration: data.medicalDeclaration,
      medicalNotes: data.medicalNotes || null,
      swimmingStatus: data.swimmingStatus,
      certificationLevel: data.certificationLevel,
      previousDives: data.previousDives,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      source: data.source || null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/guests");
  revalidatePath(`/guests/${guestId}`);
  return undefined;
}
