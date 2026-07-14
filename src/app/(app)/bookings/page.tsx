import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { getInstructors, getBoats, getDiveSites, getActivityRates } from "@/lib/reference-data";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingFormSheet } from "@/components/bookings/booking-form-sheet";
import { BookingsTable } from "@/components/bookings/bookings-table";
import { BookingCalendar } from "@/components/bookings/booking-calendar";
import { ActivityRatesDialog } from "@/components/bookings/activity-rates-dialog";
import type { BookingStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Bookings" };

const PAGE_SIZE = 20;

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    month?: string;
    q?: string;
    status?: string;
    page?: string;
  }>;
}) {
  await requireModuleAccess("bookings");
  const params = await searchParams;
  const view = params.view === "calendar" ? "calendar" : "list";
  const month = params.month ?? format(new Date(), "yyyy-MM");
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const [instructorsRaw, boatsRaw, diveSitesRaw, activityRatesMap] = await Promise.all([
    getInstructors(),
    getBoats(),
    getDiveSites(),
    getActivityRates(),
  ]);
  const instructors = instructorsRaw;
  const boats = boatsRaw.map((b) => ({ id: b.id, fullName: b.name }));
  const diveSites = diveSitesRaw.map((d) => ({ id: d.id, fullName: d.name }));
  const activityRates = Object.fromEntries(activityRatesMap);

  let listBookings: Awaited<ReturnType<typeof fetchList>> = { bookings: [], total: 0 };
  let calendarBookings: Awaited<ReturnType<typeof fetchMonth>> = [];

  if (view === "list") {
    listBookings = await fetchList({ q, status, page });
  } else {
    calendarBookings = await fetchMonth(month);
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
          <p className="text-sm text-muted-foreground">
            Manage activity bookings, availability and payment status.
          </p>
        </div>
        <div className="flex gap-2">
          <ActivityRatesDialog rates={activityRates} />
          <BookingFormSheet
            mode="create"
            instructors={instructors}
            boats={boats}
            diveSites={diveSites}
            activityRates={activityRates}
          />
        </div>
      </div>

      <Tabs value={view}>
        <TabsList>
          <TabsTrigger value="list" asChild>
            <Link href={buildHref({ view: "list" })}>List</Link>
          </TabsTrigger>
          <TabsTrigger value="calendar" asChild>
            <Link href={buildHref({ view: "calendar", month })}>Calendar</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardContent className="pt-6">
              <BookingsTable
                bookings={listBookings.bookings}
                total={listBookings.total}
                page={page}
                pageSize={PAGE_SIZE}
                query={q}
                status={status}
                instructors={instructors}
                boats={boats}
                diveSites={diveSites}
                activityRates={activityRates}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardContent className="pt-6">
              <BookingCalendar
                month={month}
                bookings={calendarBookings}
                instructors={instructors}
                boats={boats}
                diveSites={diveSites}
                activityRates={activityRates}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function buildHref(params: Record<string, string | undefined>) {
  const search = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => !!entry[1])
  );
  return `/bookings?${search.toString()}`;
}

async function fetchList({ q, status, page }: { q: string; status: string; page: number }) {
  const where: Prisma.BookingWhereInput = {
    ...(status ? { status: status as BookingStatus } : {}),
    ...(q
      ? {
          guest: {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const [bookingsRaw, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        guest: { select: { fullName: true, phone: true } },
        instructor: { select: { fullName: true } },
        boat: { select: { name: true } },
        diveSite: { select: { name: true } },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  const bookings = bookingsRaw.map((b) => ({ ...b, price: Number(b.price), paymentStatus: null }));

  return { bookings, total };
}

async function fetchMonth(month: string) {
  const start = new Date(`${month}-01T00:00:00`);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
  // widen slightly to cover the leading/trailing days shown in the grid
  const gridStart = new Date(start);
  gridStart.setDate(gridStart.getDate() - 7);
  const gridEnd = new Date(end);
  gridEnd.setDate(gridEnd.getDate() + 7);

  const bookings = await prisma.booking.findMany({
    where: { date: { gte: gridStart, lte: gridEnd } },
    orderBy: { date: "asc" },
    include: {
      guest: { select: { fullName: true, phone: true } },
    },
  });

  return bookings.map((b) => ({ ...b, price: Number(b.price) }));
}
