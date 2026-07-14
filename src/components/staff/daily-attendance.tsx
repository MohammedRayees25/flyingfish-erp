"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { addDays, format, parseISO } from "date-fns";
import { toast } from "sonner";
import type { User, AttendanceStatus } from "@prisma/client";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/labels";
import { ATTENDANCE_BADGE_VARIANT } from "@/lib/status-badges";
import { markAttendance } from "@/actions/staff-attendance";

const STATUS_OPTIONS: AttendanceStatus[] = [
  "PRESENT",
  "ABSENT",
  "HALF_DAY",
  "LEAVE",
  "HOLIDAY",
];

export function DailyAttendance({
  date,
  month,
  staff,
  attendance,
}: {
  date: string;
  month: string;
  staff: Omit<User, "monthlySalary">[];
  attendance: Record<string, AttendanceStatus>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = React.useTransition();
  const [pendingUserId, setPendingUserId] = React.useState<string | null>(null);

  function goToDate(next: string) {
    const params = new URLSearchParams();
    params.set("date", next);
    if (month) params.set("month", month);
    router.push(`${pathname}?${params}`);
  }

  function handleStatusChange(userId: string, status: AttendanceStatus) {
    setPendingUserId(userId);
    startTransition(async () => {
      const result = await markAttendance(userId, date, status);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Attendance updated");
        router.refresh();
      }
      setPendingUserId(null);
    });
  }

  const prevDate = format(addDays(parseISO(date), -1), "yyyy-MM-dd");
  const nextDate = format(addDays(parseISO(date), 1), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => goToDate(prevDate)} aria-label="Previous day">
            <ChevronLeft className="size-4" />
          </Button>
          <Input
            type="date"
            value={date}
            onChange={(e) => e.target.value && goToDate(e.target.value)}
            className="w-auto"
          />
          <Button variant="outline" size="icon" onClick={() => goToDate(nextDate)} aria-label="Next day">
            <ChevronRight className="size-4" />
          </Button>
          {date !== today ? (
            <Button variant="ghost" size="sm" onClick={() => goToDate(today)}>
              Today
            </Button>
          ) : null}
          <span className="ml-auto text-sm text-muted-foreground">
            {format(parseISO(date), "EEEE, d MMMM yyyy")}
          </span>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Current status</TableHead>
                <TableHead>Set status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    No active staff found.
                  </TableCell>
                </TableRow>
              ) : (
                staff.map((member) => {
                  const status = attendance[member.id];
                  const rowPending = isPending && pendingUserId === member.id;
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.fullName}</TableCell>
                      <TableCell>
                        {status ? (
                          <Badge variant={ATTENDANCE_BADGE_VARIANT[status]}>
                            {ATTENDANCE_STATUS_LABELS[status]}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not marked</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={status ?? ""}
                            onValueChange={(value) =>
                              handleStatusChange(member.id, value as AttendanceStatus)
                            }
                            disabled={rowPending}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Choose status" />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {ATTENDANCE_STATUS_LABELS[option]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {rowPending ? (
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          ) : null}
                        </div>
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
