"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ACTIVITY_LABELS, BOOKING_STATUS_LABELS } from "@/lib/labels";
import { BookingFormSheet } from "@/components/bookings/booking-form-sheet";
import type { ActivityType, BookingStatus } from "@prisma/client";

type CalendarBooking = {
  id: string;
  guestId: string;
  guest: { fullName: string; phone: string };
  instructorId: string | null;
  boatId: string | null;
  diveSiteId: string | null;
  activityType: ActivityType;
  date: Date;
  status: BookingStatus;
  price: number;
  notes: string | null;
};

const STATUS_DOT: Record<BookingStatus, string> = {
  PENDING: "bg-warning",
  CONFIRMED: "bg-primary",
  COMPLETED: "bg-success",
  CANCELLED: "bg-destructive",
  NO_SHOW: "bg-muted-foreground",
};

export function BookingCalendar({
  month,
  bookings,
  instructors,
  boats,
  diveSites,
  activityRates,
}: {
  month: string;
  bookings: CalendarBooking[];
  instructors: { id: string; fullName: string }[];
  boats: { id: string; fullName: string }[];
  diveSites: { id: string; fullName: string }[];
  activityRates: Record<string, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const monthStart = startOfMonth(new Date(`${month}-01T00:00:00`));
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(endOfMonth(monthStart));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const bookingsByDay = React.useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    for (const b of bookings) {
      const key = format(b.date, "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(b);
      map.set(key, list);
    }
    return map;
  }, [bookings]);

  function goToMonth(offset: number) {
    const next = offset > 0 ? addMonths(monthStart, 1) : subMonths(monthStart, 1);
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", format(next, "yyyy-MM"));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{format(monthStart, "MMMM yyyy")}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => goToMonth(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => goToMonth(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border bg-border text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="bg-muted px-2 py-1.5 text-center font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayBookings = bookingsByDay.get(key) ?? [];
          const visible = dayBookings.slice(0, 3);
          const overflow = dayBookings.length - visible.length;

          return (
            <div
              key={key}
              className={cn(
                "min-h-[104px] bg-card p-1.5",
                !isSameMonth(day, monthStart) && "bg-muted/40 text-muted-foreground"
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[11px]",
                    isToday(day) && "bg-primary text-primary-foreground font-semibold"
                  )}
                >
                  {format(day, "d")}
                </span>
                {isSameMonth(day, monthStart) ? (
                  <BookingFormSheet
                    mode="create"
                    instructors={instructors}
                    boats={boats}
                    diveSites={diveSites}
                    activityRates={activityRates}
                    defaultDate={key}
                    compactTrigger
                  />
                ) : null}
              </div>
              <div className="flex flex-col gap-1">
                {visible.map((b) => (
                  <Popover key={b.id}>
                    <PopoverTrigger asChild>
                      <button
                        className="flex w-full items-center gap-1 truncate rounded bg-accent/60 px-1.5 py-0.5 text-left text-[11px] hover:bg-accent"
                      >
                        <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[b.status])} />
                        <span className="truncate">{b.guest.fullName}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72" align="start">
                      <div className="flex flex-col gap-2 text-sm">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{b.guest.fullName}</p>
                          <Badge variant="outline">{BOOKING_STATUS_LABELS[b.status]}</Badge>
                        </div>
                        <p className="text-muted-foreground">{ACTIVITY_LABELS[b.activityType]}</p>
                        <BookingFormSheet
                          mode="edit"
                          booking={b}
                          instructors={instructors}
                          boats={boats}
                          diveSites={diveSites}
                          activityRates={activityRates}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                ))}
                {overflow > 0 ? (
                  <span className="px-1 text-[11px] text-muted-foreground">+{overflow} more</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
