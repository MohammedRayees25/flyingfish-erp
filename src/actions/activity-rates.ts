"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import type { ActivityType } from "@prisma/client";

export async function upsertActivityRate(activityType: ActivityType, price: number) {
  await requireModuleAccess("bookings");
  if (!Number.isFinite(price) || price < 0) {
    return { error: "Enter a valid non-negative price." };
  }

  await prisma.activityRate.upsert({
    where: { activityType },
    update: { price },
    create: { activityType, price },
  });

  revalidatePath("/bookings");
  revalidatePath("/settings");
  return undefined;
}
