"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { canAccess } from "@/lib/permissions";

export type GlobalSearchResult = {
  id: string;
  type: "guest";
  title: string;
  subtitle: string;
  href: string;
};

// Global command-palette search. Currently searches Guests; as later
// phases land (bookings, staff, certifications, ...) add more sections
// here rather than building a parallel search per module.
export async function globalSearch(
  query: string
): Promise<GlobalSearchResult[]> {
  const user = await requireUser();
  const q = query.trim();
  if (q.length < 2) return [];

  const results: GlobalSearchResult[] = [];

  if (canAccess(user.role, "guests")) {
    const guests = await prisma.guest.findMany({
      where: {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 8,
      orderBy: { updatedAt: "desc" },
    });

    results.push(
      ...guests.map((g) => ({
        id: g.id,
        type: "guest" as const,
        title: g.fullName,
        subtitle: [g.phone, g.nationality].filter(Boolean).join(" · "),
        href: `/guests/${g.id}`,
      }))
    );
  }

  return results;
}
