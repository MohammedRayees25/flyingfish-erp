"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import {
  boatSharingEntrySchema,
  vendorPaymentSchema,
  type BoatSharingEntryInput,
  type VendorPaymentInput,
} from "@/lib/validations/boat-sharing";
import { computeBoatSharingSplits } from "@/lib/boat-sharing";
import type { PaymentStatus, VendorPaymentStatus } from "@prisma/client";

export type BoatSharingActionState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

function fieldErrorsFrom(error: import("zod").ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    fieldErrors[String(issue.path[0])] = issue.message;
  }
  return fieldErrors;
}

export async function createBoatSharingEntry(
  input: BoatSharingEntryInput
): Promise<BoatSharingActionState> {
  await requireModuleAccess("boatSharing");

  const parsed = boatSharingEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const data = parsed.data;
  const totalGuests = data.ffGuests + data.dgGuests + data.seiGuests;
  const splits = computeBoatSharingSplits(data);

  await prisma.boatSharingEntry.create({
    data: {
      date: new Date(data.date),
      boatId: data.boatId || null,
      boatVendorName: data.boatVendorName || null,
      boatAmount: data.boatAmount,
      tempoAmount: data.tempoAmount,
      ffGuests: data.ffGuests,
      dgGuests: data.dgGuests,
      seiGuests: data.seiGuests,
      totalGuests,
      vendorPaymentStatus: "PENDING",
      outstandingAmount: data.boatAmount + data.tempoAmount,
      notes: data.notes || null,
      splits: {
        create: splits.map((s) => ({
          partyName: s.partyName,
          guestCount: s.guestCount,
          amountDue: s.amountDue,
          amountPaid: 0,
          status: "PENDING",
        })),
      },
    },
  });

  revalidatePath("/boat-sharing");
  revalidatePath("/");
  return undefined;
}

export async function updateBoatSharingEntry(
  entryId: string,
  input: BoatSharingEntryInput
): Promise<BoatSharingActionState> {
  await requireModuleAccess("boatSharing");

  const parsed = boatSharingEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const data = parsed.data;
  const totalGuests = data.ffGuests + data.dgGuests + data.seiGuests;
  const splits = computeBoatSharingSplits(data);

  const existing = await prisma.boatSharingEntry.findUnique({
    where: { id: entryId },
    include: { vendorPayments: true, splits: true },
  });
  if (!existing) return { error: "Boat sharing entry not found." };

  const totalVendorPaid = existing.vendorPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const newTotalCost = data.boatAmount + data.tempoAmount;
  const newOutstanding = Math.max(0, newTotalCost - totalVendorPaid);
  const newVendorStatus: VendorPaymentStatus =
    newOutstanding <= 0 ? "PAID" : totalVendorPaid > 0 ? "PARTIAL" : "PENDING";

  await prisma.$transaction([
    prisma.boatSharingEntry.update({
      where: { id: entryId },
      data: {
        date: new Date(data.date),
        boatId: data.boatId || null,
        boatVendorName: data.boatVendorName || null,
        boatAmount: data.boatAmount,
        tempoAmount: data.tempoAmount,
        ffGuests: data.ffGuests,
        dgGuests: data.dgGuests,
        seiGuests: data.seiGuests,
        totalGuests,
        outstandingAmount: newOutstanding,
        vendorPaymentStatus: newVendorStatus,
        notes: data.notes || null,
      },
    }),
    prisma.boatSharingSplit.deleteMany({ where: { entryId } }),
    ...splits.map((s) => {
      const previous = existing.splits.find((p) => p.partyName === s.partyName);
      const amountPaid = previous ? Number(previous.amountPaid) : 0;
      const status: PaymentStatus =
        amountPaid <= 0 ? "PENDING" : amountPaid >= s.amountDue ? "PAID" : "PARTIAL";
      return prisma.boatSharingSplit.create({
        data: {
          entryId,
          partyName: s.partyName,
          guestCount: s.guestCount,
          amountDue: s.amountDue,
          amountPaid,
          status,
        },
      });
    }),
  ]);

  revalidatePath("/boat-sharing");
  revalidatePath("/");
  return undefined;
}

export async function deleteBoatSharingEntry(entryId: string): Promise<BoatSharingActionState> {
  await requireModuleAccess("boatSharing");
  await prisma.boatSharingEntry.delete({ where: { id: entryId } });
  revalidatePath("/boat-sharing");
  revalidatePath("/");
  return undefined;
}

export async function recordVendorPayment(
  entryId: string,
  input: VendorPaymentInput
): Promise<BoatSharingActionState> {
  await requireModuleAccess("boatSharing");

  const parsed = vendorPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const data = parsed.data;

  const entry = await prisma.boatSharingEntry.findUnique({ where: { id: entryId } });
  if (!entry) return { error: "Boat sharing entry not found." };

  const newOutstanding = Math.max(0, Number(entry.outstandingAmount) - data.amount);
  const newStatus: VendorPaymentStatus = newOutstanding <= 0 ? "PAID" : "PARTIAL";

  await prisma.$transaction([
    prisma.boatVendorPayment.create({
      data: {
        entryId,
        amount: data.amount,
        method: data.method,
        notes: data.notes || null,
      },
    }),
    prisma.boatSharingEntry.update({
      where: { id: entryId },
      data: { outstandingAmount: newOutstanding, vendorPaymentStatus: newStatus },
    }),
  ]);

  revalidatePath("/boat-sharing");
  revalidatePath("/");
  return undefined;
}

export async function recordSplitPayment(
  splitId: string,
  amount: number
): Promise<BoatSharingActionState> {
  await requireModuleAccess("boatSharing");
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid payment amount." };
  }

  const split = await prisma.boatSharingSplit.findUnique({ where: { id: splitId } });
  if (!split) return { error: "Split not found." };

  const newPaid = Number(split.amountPaid) + amount;
  const status: PaymentStatus =
    newPaid >= Number(split.amountDue) ? "PAID" : newPaid > 0 ? "PARTIAL" : "PENDING";

  await prisma.boatSharingSplit.update({
    where: { id: splitId },
    data: { amountPaid: newPaid, status },
  });

  revalidatePath("/boat-sharing");
  revalidatePath("/");
  return undefined;
}
