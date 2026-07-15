import "server-only";
import { prisma } from "@/lib/prisma";
import type { CompanySettings } from "@prisma/client";

// CompanySettings is a singleton table -- application code always reads/
// updates the first (only) row. This helper guarantees that row exists
// before any Settings page or action tries to read/update it.
export async function getOrCreateCompanySettings(): Promise<CompanySettings> {
  const existing = await prisma.companySettings.findFirst();
  if (existing) return existing;
  return prisma.companySettings.create({ data: {} });
}
