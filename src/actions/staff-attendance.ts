"use server";

import { revalidatePath } from "next/cache";
import { format, eachDayOfInterval } from "date-fns";
import type { AttendanceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import {
  markAttendanceSchema,
  leaveSchema,
  type LeaveInput,
} from "@/lib/validations/staff";

export type StaffActionState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

const MAX_LEAVE_RANGE_DAYS = 60;

// StaffAttendance.date is a Postgres @db.Date column. Parsing/formatting
// through "yyyy-MM-dd" and reconstructing as UTC midnight keeps every date
// we send to Prisma aligned with the stored value regardless of server TZ.
function toDateOnly(input: string | Date): Date {
  const dateStr = typeof input === "string" ? input : format(input, "yyyy-MM-dd");
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function fieldErrorsFrom(error: import("zod").ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    fieldErrors[String(issue.path[0])] = issue.message;
  }
  return fieldErrors;
}

export async function markAttendance(
  userId: string,
  date: string,
  status: AttendanceStatus
): Promise<StaffActionState> {
  await requireModuleAccess("staff");

  const parsed = markAttendanceSchema.safeParse({ userId, date, status });
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = parsed.data;
  const day = toDateOnly(data.date);

  await prisma.staffAttendance.upsert({
    where: { userId_date: { userId: data.userId, date: day } },
    update: { status: data.status },
    create: { userId: data.userId, date: day, status: data.status },
  });

  revalidatePath("/staff");
  return undefined;
}

export async function bulkMarkLeave(input: LeaveInput): Promise<StaffActionState> {
  await requireModuleAccess("staff");

  const parsed = leaveSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = parsed.data;
  const start = toDateOnly(data.startDate);
  const end = toDateOnly(data.endDate);

  const days = eachDayOfInterval({ start, end });
  if (days.length > MAX_LEAVE_RANGE_DAYS) {
    return {
      error: `Leave range cannot exceed ${MAX_LEAVE_RANGE_DAYS} days.`,
      fieldErrors: { endDate: `Range is too long (max ${MAX_LEAVE_RANGE_DAYS} days).` },
    };
  }

  const notes = data.notes || null;

  await prisma.$transaction(
    days.map((d) => {
      const day = toDateOnly(d);
      return prisma.staffAttendance.upsert({
        where: { userId_date: { userId: data.userId, date: day } },
        update: { status: "LEAVE", notes },
        create: { userId: data.userId, date: day, status: "LEAVE", notes },
      });
    })
  );

  revalidatePath("/staff");
  return undefined;
}
