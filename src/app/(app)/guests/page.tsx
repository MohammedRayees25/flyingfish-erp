import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { GuestsTable } from "@/components/guests/guests-table";
import { GuestFormSheet } from "@/components/guests/guest-form-sheet";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Guests" };

const PAGE_SIZE = 20;

export default async function GuestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireModuleAccess("guests");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.GuestWhereInput = q
    ? {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { nationality: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [guests, total] = await Promise.all([
    prisma.guest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: { select: { bookings: true, payments: true } },
      },
    }),
    prisma.guest.count({ where }),
  ]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Guests</h1>
          <p className="text-sm text-muted-foreground">
            {total} guest{total === 1 ? "" : "s"} on record
          </p>
        </div>
        <GuestFormSheet mode="create" />
      </div>

      <Card>
        <CardContent className="pt-6">
          <GuestsTable
            guests={guests}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            query={q}
          />
        </CardContent>
      </Card>
    </div>
  );
}
