"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { diveLogSchema, type DiveLogInput } from "@/lib/validations/dive-logs";

export type DiveLogActionState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

function fieldErrorsFrom(error: import("zod").ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    fieldErrors[String(issue.path[0])] = issue.message;
  }
  return fieldErrors;
}

function toDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function toDateTime(dateStr: string, timeStr: string | undefined): Date | null {
  if (!timeStr) return null;
  return new Date(`${dateStr}T${timeStr}:00.000Z`);
}

function toDiveLogData(data: DiveLogInput) {
  return {
    date: toDateOnly(data.date),
    diveSiteId: data.diveSiteId || null,
    boatId: data.boatId || null,
    instructorId: data.instructorId || null,
    entryTime: toDateTime(data.date, data.entryTime),
    exitTime: toDateTime(data.date, data.exitTime),
    bottomTimeMin: data.bottomTimeMin ?? null,
    maxDepth: data.maxDepth ?? null,
    visibility: data.visibility ?? null,
    current: data.current || null,
    weather: data.weather || null,
    temperature: data.temperature ?? null,
    equipmentUsed: data.equipmentUsed || null,
    cylinderType: data.cylinderType || null,
    weightsUsedKg: data.weightsUsedKg ?? null,
    marineLifeSeen: data.marineLifeSeen || null,
    problems: data.problems || null,
    photoUrls: data.photoUrls,
    notes: data.notes || null,
  };
}

export async function createDiveLog(input: DiveLogInput): Promise<DiveLogActionState> {
  await requireModuleAccess("diveLogs");

  const parsed = diveLogSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    const log = await tx.diveLog.create({ data: toDiveLogData(data) });

    if (data.guestIds.length > 0) {
      await tx.diveLogGuest.createMany({
        data: data.guestIds.map((guestId) => ({ diveLogId: log.id, guestId })),
      });
    }
  });

  revalidatePath("/dive-logs");
  return undefined;
}

export async function updateDiveLog(
  id: string,
  input: DiveLogInput
): Promise<DiveLogActionState> {
  await requireModuleAccess("diveLogs");

  const parsed = diveLogSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.diveLog.update({ where: { id }, data: toDiveLogData(data) });
    await tx.diveLogGuest.deleteMany({ where: { diveLogId: id } });
    if (data.guestIds.length > 0) {
      await tx.diveLogGuest.createMany({
        data: data.guestIds.map((guestId) => ({ diveLogId: id, guestId })),
      });
    }
  });

  revalidatePath("/dive-logs");
  return undefined;
}

export async function deleteDiveLog(id: string): Promise<DiveLogActionState> {
  await requireModuleAccess("diveLogs");
  await prisma.diveLog.delete({ where: { id } });
  revalidatePath("/dive-logs");
  return undefined;
}
