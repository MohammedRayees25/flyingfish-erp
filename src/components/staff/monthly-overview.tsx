import Link from "next/link";
import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import type { StaffAttendance, User } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/labels";
import { ATTENDANCE_DOT_CLASS, ATTENDANCE_STATUS_LETTER } from "@/lib/status-badges";

function toDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function MonthlyOverview({
  month,
  date,
  staff,
  records,
}: {
  month: string;
  date: string;
  staff: User[];
  records: StaffAttendance[];
}) {
  const monthStart = startOfMonth(toDateOnly(`${month}-01`));
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const prevMonth = format(addMonths(monthStart, -1), "yyyy-MM");
  const nextMonth = format(addMonths(monthStart, 1), "yyyy-MM");

  // staffId -> "yyyy-MM-dd" -> status
  const byStaff = new Map<string, Map<string, StaffAttendance["status"]>>();
  for (const record of records) {
    const key = format(record.date, "yyyy-MM-dd");
    if (!byStaff.has(record.userId)) byStaff.set(record.userId, new Map());
    byStaff.get(record.userId)!.set(key, record.status);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" asChild aria-label="Previous month">
            <Link href={`/staff?month=${prevMonth}&date=${date}`}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <span className="min-w-32 text-center text-sm font-medium">
            {format(monthStart, "MMMM yyyy")}
          </span>
          <Button variant="outline" size="icon" asChild aria-label="Next month">
            <Link href={`/staff?month=${nextMonth}&date=${date}`}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="ml-auto">
            <a href={`/api/reports/staff-attendance?month=${month}`}>
              <Download className="size-4" /> Export to Excel
            </a>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Legend:</span>
          {(Object.keys(ATTENDANCE_STATUS_LETTER) as (keyof typeof ATTENDANCE_STATUS_LETTER)[]).map(
            (status) => (
              <span key={status} className="flex items-center gap-1">
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[10px] font-semibold",
                    ATTENDANCE_DOT_CLASS[status]
                  )}
                >
                  {ATTENDANCE_STATUS_LETTER[status]}
                </span>
                {ATTENDANCE_STATUS_LABELS[status]}
              </span>
            )
          )}
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background">Staff</TableHead>
                {days.map((day) => (
                  <TableHead key={day.toISOString()} className="text-center">
                    {format(day, "d")}
                  </TableHead>
                ))}
                <TableHead className="text-right">Attendance %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={days.length + 2} className="h-24 text-center text-muted-foreground">
                    No active staff found.
                  </TableCell>
                </TableRow>
              ) : (
                staff.map((member) => {
                  const dayMap = byStaff.get(member.id) ?? new Map<string, StaffAttendance["status"]>();
                  let present = 0;
                  let halfDay = 0;
                  let marked = 0;
                  for (const status of dayMap.values()) {
                    marked += 1;
                    if (status === "PRESENT") present += 1;
                    if (status === "HALF_DAY") halfDay += 1;
                  }
                  const pct = marked > 0 ? ((present + halfDay * 0.5) / marked) * 100 : null;

                  return (
                    <TableRow key={member.id}>
                      <TableCell className="sticky left-0 bg-background font-medium">
                        {member.fullName}
                      </TableCell>
                      {days.map((day) => {
                        const key = format(day, "yyyy-MM-dd");
                        const status = dayMap.get(key);
                        return (
                          <TableCell key={key} className="text-center">
                            {status ? (
                              <span
                                className={cn(
                                  "mx-auto flex size-6 items-center justify-center rounded-full text-[10px] font-semibold",
                                  ATTENDANCE_DOT_CLASS[status]
                                )}
                                title={ATTENDANCE_STATUS_LABELS[status]}
                              >
                                {ATTENDANCE_STATUS_LETTER[status]}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">·</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-medium tabular-nums">
                        {pct === null ? "—" : `${pct.toFixed(0)}%`}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
