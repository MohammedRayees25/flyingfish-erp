"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { fieldErrorsFrom } from "@/lib/form-errors";
import {
  transactionSchema,
  salaryAmountSchema,
  type TransactionInput,
} from "@/lib/validations/finance";

export type FinanceActionState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

export async function createTransaction(input: TransactionInput): Promise<FinanceActionState> {
  const user = await requireModuleAccess("finance");

  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const data = parsed.data;

  await prisma.financeTransaction.create({
    data: {
      type: data.type,
      revenueCategory: data.type === "REVENUE" ? data.revenueCategory || null : null,
      expenseCategory: data.type === "EXPENSE" ? data.expenseCategory || null : null,
      amount: data.amount,
      date: new Date(data.date),
      description: data.description || null,
      createdById: user.id,
    },
  });

  revalidatePath("/finance");
  revalidatePath("/");
  revalidateTag("dashboard");
  return undefined;
}

export async function updateTransaction(
  transactionId: string,
  input: TransactionInput
): Promise<FinanceActionState> {
  await requireModuleAccess("finance");

  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const data = parsed.data;

  await prisma.financeTransaction.update({
    where: { id: transactionId },
    data: {
      type: data.type,
      revenueCategory: data.type === "REVENUE" ? data.revenueCategory || null : null,
      expenseCategory: data.type === "EXPENSE" ? data.expenseCategory || null : null,
      amount: data.amount,
      date: new Date(data.date),
      description: data.description || null,
    },
  });

  revalidatePath("/finance");
  revalidatePath("/");
  revalidateTag("dashboard");
  return undefined;
}

export async function deleteTransaction(transactionId: string): Promise<FinanceActionState> {
  await requireModuleAccess("finance");
  await prisma.financeTransaction.delete({ where: { id: transactionId } });
  revalidatePath("/finance");
  revalidatePath("/");
  revalidateTag("dashboard");
  return undefined;
}

export async function setStaffMonthlySalary(
  userId: string,
  input: { monthlySalary: number }
): Promise<FinanceActionState> {
  await requireModuleAccess("finance");

  const parsed = salaryAmountSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { monthlySalary: parsed.data.monthlySalary },
  });

  revalidatePath("/finance");
  return undefined;
}

// Creates a PENDING StaffSalaryPayment for the given month for every active
// staff member with a monthlySalary > 0. Safe to run more than once — skips
// staff who already have a row for that month.
export async function generateMonthlySalaries(month: string): Promise<FinanceActionState> {
  await requireModuleAccess("finance");

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return { error: "Invalid month." };
  }

  const staff = await prisma.user.findMany({
    where: { isActive: true, monthlySalary: { gt: 0 } },
    select: { id: true, monthlySalary: true },
  });

  await Promise.all(
    staff.map((s) =>
      prisma.staffSalaryPayment.upsert({
        where: { userId_month: { userId: s.id, month } },
        update: {},
        create: {
          userId: s.id,
          month,
          amount: s.monthlySalary,
          status: "PENDING",
        },
      })
    )
  );

  revalidatePath("/finance");
  return undefined;
}

export async function markSalaryPaid(paymentId: string): Promise<FinanceActionState> {
  await requireModuleAccess("finance");
  await prisma.staffSalaryPayment.update({
    where: { id: paymentId },
    data: { status: "PAID", paidAt: new Date() },
  });
  revalidatePath("/finance");
  return undefined;
}
