import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";

// Streams a modest JSON snapshot with record counts. A full-database dump
// isn't realistic without dedicated backup infra, so this is deliberately
// scoped to counts rather than a "backup".
export async function GET() {
  await requireModuleAccess("settings");

  const [guests, bookings, financeTransactions, users] = await Promise.all([
    prisma.guest.count(),
    prisma.booking.count(),
    prisma.financeTransaction.count(),
    prisma.user.count(),
  ]);

  const snapshot = {
    exportedAt: new Date().toISOString(),
    counts: {
      guests,
      bookings,
      financeTransactions,
      users,
    },
  };

  return new Response(JSON.stringify(snapshot, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="flying-fish-data-snapshot-${snapshot.exportedAt.slice(0, 10)}.json"`,
    },
  });
}
