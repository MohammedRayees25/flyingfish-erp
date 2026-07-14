import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { BoatSharingReportData } from "@/components/boat-sharing/report-view";

export async function getBoatSharingReport(
  where: Prisma.BoatSharingEntryWhereInput
): Promise<BoatSharingReportData> {
  const entries = await prisma.boatSharingEntry.findMany({
    where,
    include: { splits: true, vendorPayments: true },
  });

  const trips = entries.length;
  const totalGuests = entries.reduce((sum, e) => sum + e.totalGuests, 0);
  const boatAmount = entries.reduce((sum, e) => sum + Number(e.boatAmount), 0);
  const tempoAmount = entries.reduce((sum, e) => sum + Number(e.tempoAmount), 0);
  const outstanding = entries.reduce((sum, e) => sum + Number(e.outstandingAmount), 0);

  const partyMap = new Map<string, { guestCount: number; amountDue: number; amountPaid: number }>();
  let pendingPartyAmount = 0;
  for (const entry of entries) {
    for (const split of entry.splits) {
      const current = partyMap.get(split.partyName) ?? { guestCount: 0, amountDue: 0, amountPaid: 0 };
      current.guestCount += split.guestCount;
      current.amountDue += Number(split.amountDue);
      current.amountPaid += Number(split.amountPaid);
      partyMap.set(split.partyName, current);
      pendingPartyAmount += Number(split.amountDue) - Number(split.amountPaid);
    }
  }

  const partyTotals = Array.from(partyMap.entries()).map(([partyName, totals]) => ({
    partyName,
    ...totals,
  }));

  return {
    trips,
    totalGuests,
    boatAmount,
    tempoAmount,
    outstanding,
    pendingPartyAmount,
    partyTotals,
  };
}
