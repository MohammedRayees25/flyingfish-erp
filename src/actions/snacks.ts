"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { fieldErrorsFrom } from "@/lib/form-errors";
import {
  snackItemSchema,
  snackPurchaseSchema,
  snackConsumptionSchema,
  type SnackItemInput,
  type SnackPurchaseInput,
  type SnackConsumptionInput,
} from "@/lib/validations/snacks";

export type SnackActionState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

function toDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

// ---------------------------------------------------------------------------
// Snack items
// ---------------------------------------------------------------------------

export async function createSnackItem(input: SnackItemInput): Promise<SnackActionState> {
  await requireModuleAccess("snacks");

  const parsed = snackItemSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const data = parsed.data;

  await prisma.snackItem.create({
    data: {
      name: data.name,
      unit: data.unit,
      costPerUnit: data.costPerUnit,
      reorderLevel: data.reorderLevel,
      isActive: data.isActive,
    },
  });

  revalidatePath("/snacks");
  revalidatePath("/");
  revalidateTag("dashboard");
  return undefined;
}

export async function updateSnackItem(
  itemId: string,
  input: SnackItemInput
): Promise<SnackActionState> {
  await requireModuleAccess("snacks");

  const parsed = snackItemSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const data = parsed.data;

  await prisma.snackItem.update({
    where: { id: itemId },
    data: {
      name: data.name,
      unit: data.unit,
      costPerUnit: data.costPerUnit,
      reorderLevel: data.reorderLevel,
      isActive: data.isActive,
    },
  });

  revalidatePath("/snacks");
  revalidatePath("/");
  revalidateTag("dashboard");
  return undefined;
}

export async function deleteSnackItem(itemId: string): Promise<SnackActionState> {
  await requireModuleAccess("snacks");

  await prisma.snackItem.delete({ where: { id: itemId } });

  revalidatePath("/snacks");
  revalidatePath("/");
  revalidateTag("dashboard");
  return undefined;
}

// ---------------------------------------------------------------------------
// Purchases (stock IN)
// ---------------------------------------------------------------------------

export async function createSnackPurchase(input: SnackPurchaseInput): Promise<SnackActionState> {
  await requireModuleAccess("snacks");

  const parsed = snackPurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const data = parsed.data;
  const totalCost = data.quantity * data.unitCost;

  await prisma.$transaction(async (tx) => {
    await tx.snackPurchase.create({
      data: {
        itemId: data.itemId,
        date: toDateOnly(data.date),
        quantity: data.quantity,
        unitCost: data.unitCost,
        totalCost,
        vendor: data.vendor || null,
        notes: data.notes || null,
      },
    });

    await tx.snackItem.update({
      where: { id: data.itemId },
      data: { currentStock: { increment: data.quantity } },
    });
  });

  revalidatePath("/snacks");
  revalidatePath("/");
  revalidateTag("dashboard");
  return undefined;
}

export async function deleteSnackPurchase(purchaseId: string): Promise<SnackActionState> {
  await requireModuleAccess("snacks");

  const purchase = await prisma.snackPurchase.findUnique({ where: { id: purchaseId } });
  if (!purchase) {
    return { error: "Purchase not found." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.snackPurchase.delete({ where: { id: purchaseId } });
    await tx.snackItem.update({
      where: { id: purchase.itemId },
      data: { currentStock: { decrement: purchase.quantity } },
    });
  });

  revalidatePath("/snacks");
  revalidatePath("/");
  revalidateTag("dashboard");
  return undefined;
}

// ---------------------------------------------------------------------------
// Consumption (stock OUT)
// ---------------------------------------------------------------------------

export async function createSnackConsumption(
  input: SnackConsumptionInput
): Promise<SnackActionState> {
  await requireModuleAccess("snacks");

  const parsed = snackConsumptionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const data = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const item = await tx.snackItem.findUnique({ where: { id: data.itemId } });
    if (!item) {
      return { error: "Snack item not found." };
    }
    if (item.currentStock < data.quantity) {
      return {
        error: `Not enough stock. Only ${item.currentStock} ${item.unit} remaining.`,
      };
    }

    await tx.snackConsumption.create({
      data: {
        itemId: data.itemId,
        date: toDateOnly(data.date),
        quantity: data.quantity,
        guestId: data.guestId || null,
        boatId: data.boatId || null,
        notes: data.notes || null,
      },
    });

    await tx.snackItem.update({
      where: { id: data.itemId },
      data: { currentStock: { decrement: data.quantity } },
    });

    return undefined;
  });

  if (result?.error) {
    return { error: result.error };
  }

  revalidatePath("/snacks");
  revalidatePath("/");
  revalidateTag("dashboard");
  return undefined;
}

export async function deleteSnackConsumption(consumptionId: string): Promise<SnackActionState> {
  await requireModuleAccess("snacks");

  const consumption = await prisma.snackConsumption.findUnique({ where: { id: consumptionId } });
  if (!consumption) {
    return { error: "Consumption record not found." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.snackConsumption.delete({ where: { id: consumptionId } });
    await tx.snackItem.update({
      where: { id: consumption.itemId },
      data: { currentStock: { increment: consumption.quantity } },
    });
  });

  revalidatePath("/snacks");
  revalidatePath("/");
  revalidateTag("dashboard");
  return undefined;
}
