"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import {
  freelancerSchema,
  freelancerAttendanceSchema,
  freelancerPaymentSchema,
  type FreelancerInput,
  type FreelancerPaymentInput,
} from "@/lib/validations/freelancer";
import type { AttendanceStatus } from "@prisma/client";
import { fieldErrorsFrom } from "@/lib/form-errors";

export type FreelancerActionState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

function toDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export async function createFreelancer(
  input: FreelancerInput
): Promise<FreelancerActionState> {
  await requireModuleAccess("freelancers");

  const parsed = freelancerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = parsed.data;

  await prisma.freelancer.create({
    data: {
      fullName: data.fullName,
      role: data.role,
      phone: data.phone || null,
      dayRate: data.dayRate,
      isActive: data.isActive,
    },
  });

  revalidatePath("/freelancers");
  return undefined;
}

export async function updateFreelancer(
  freelancerId: string,
  input: FreelancerInput
): Promise<FreelancerActionState> {
  await requireModuleAccess("freelancers");

  const parsed = freelancerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = parsed.data;

  await prisma.freelancer.update({
    where: { id: freelancerId },
    data: {
      fullName: data.fullName,
      role: data.role,
      phone: data.phone || null,
      dayRate: data.dayRate,
      isActive: data.isActive,
    },
  });

  revalidatePath("/freelancers");
  revalidatePath(`/freelancers/${freelancerId}`);
  return undefined;
}

export async function markFreelancerAttendance(
  freelancerId: string,
  date: string,
  status: AttendanceStatus
): Promise<FreelancerActionState> {
  await requireModuleAccess("freelancers");

  const parsed = freelancerAttendanceSchema.safeParse({ freelancerId, date, status });
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = parsed.data;
  const day = toDateOnly(data.date);

  await prisma.freelancerAttendance.upsert({
    where: { freelancerId_date: { freelancerId: data.freelancerId, date: day } },
    update: { status: data.status },
    create: { freelancerId: data.freelancerId, date: day, status: data.status },
  });

  revalidatePath(`/freelancers/${freelancerId}`);
  return undefined;
}

export async function recordFreelancerPayment(
  freelancerId: string,
  input: FreelancerPaymentInput
): Promise<FreelancerActionState> {
  await requireModuleAccess("freelancers");

  const parsed = freelancerPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = parsed.data;

  await prisma.freelancerPayment.create({
    data: {
      freelancerId,
      amount: data.amount,
      status: data.status,
      dueDate: data.dueDate ? toDateOnly(data.dueDate) : null,
      paidAt: data.status === "PAID" ? new Date() : null,
      notes: data.notes || null,
    },
  });

  revalidatePath(`/freelancers/${freelancerId}`);
  revalidatePath("/freelancers");
  revalidatePath("/");
  revalidateTag("dashboard");
  return undefined;
}

export async function markFreelancerPaymentPaid(
  paymentId: string
): Promise<FreelancerActionState> {
  await requireModuleAccess("freelancers");

  const payment = await prisma.freelancerPayment.update({
    where: { id: paymentId },
    data: { status: "PAID", paidAt: new Date() },
  });

  revalidatePath(`/freelancers/${payment.freelancerId}`);
  revalidatePath("/freelancers");
  revalidatePath("/");
  revalidateTag("dashboard");
  return undefined;
}
