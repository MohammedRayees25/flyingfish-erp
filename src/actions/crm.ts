"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { leadSchema, LEAD_STAGES, type LeadInput } from "@/lib/validations/crm";
import type { LeadStage } from "@prisma/client";
import { fieldErrorsFrom } from "@/lib/form-errors";

export type LeadActionState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

export async function createLead(input: LeadInput): Promise<LeadActionState> {
  await requireModuleAccess("crm");

  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = parsed.data;

  await prisma.lead.create({
    data: {
      fullName: data.fullName,
      phone: data.phone,
      email: data.email || null,
      source: data.source || null,
      stage: data.stage,
      assignedToId: data.assignedToId || null,
      followUpAt: data.followUpAt ? new Date(data.followUpAt) : null,
      isRepeatCustomer: data.isRepeatCustomer,
      referredById: data.referredById || null,
      guestId: data.guestId || null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/crm");
  return undefined;
}

export async function updateLead(
  leadId: string,
  input: LeadInput
): Promise<LeadActionState> {
  await requireModuleAccess("crm");

  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = parsed.data;

  if (data.referredById && data.referredById === leadId) {
    return {
      error: "A lead cannot refer itself.",
      fieldErrors: { referredById: "A lead cannot refer itself." },
    };
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      fullName: data.fullName,
      phone: data.phone,
      email: data.email || null,
      source: data.source || null,
      stage: data.stage,
      assignedToId: data.assignedToId || null,
      followUpAt: data.followUpAt ? new Date(data.followUpAt) : null,
      isRepeatCustomer: data.isRepeatCustomer,
      referredById: data.referredById || null,
      guestId: data.guestId || null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/crm");
  return undefined;
}

export async function deleteLead(leadId: string): Promise<LeadActionState> {
  await requireModuleAccess("crm");

  // Leads referred by this lead would otherwise fail the FK constraint on
  // delete — detach them first rather than cascading the delete.
  await prisma.lead.updateMany({
    where: { referredById: leadId },
    data: { referredById: null },
  });

  await prisma.lead.delete({ where: { id: leadId } });

  revalidatePath("/crm");
  return undefined;
}

// Quick stage change used by the pipeline board's per-card <Select>.
export async function updateLeadStage(
  leadId: string,
  stage: LeadStage
): Promise<LeadActionState> {
  await requireModuleAccess("crm");

  if (!(LEAD_STAGES as readonly string[]).includes(stage)) {
    return { error: "Invalid stage." };
  }

  await prisma.lead.update({ where: { id: leadId }, data: { stage } });

  revalidatePath("/crm");
  return undefined;
}

export type LeadOption = { id: string; fullName: string; phone: string };

// Lightweight lead search for the "Referred by" combobox — mirrors
// searchGuestsForSelect in actions/guests.ts.
export async function searchLeadsForSelect(
  query: string,
  excludeId?: string
): Promise<LeadOption[]> {
  await requireModuleAccess("crm");
  const q = query.trim();

  const where = {
    ...(excludeId ? { id: { not: excludeId } } : {}),
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  if (q.length < 1) {
    return prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, fullName: true, phone: true },
    });
  }

  return prisma.lead.findMany({
    where,
    orderBy: { fullName: "asc" },
    take: 10,
    select: { id: true, fullName: true, phone: true },
  });
}
