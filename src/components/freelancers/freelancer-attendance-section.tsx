"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { AttendanceStatus } from "@prisma/client";
import { markFreelancerAttendance } from "@/actions/freelancers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/labels";
import { ATTENDANCE_BADGE_VARIANT } from "@/lib/status-badges";

const STATUS_OPTIONS: AttendanceStatus[] = [
  "PRESENT",
  "ABSENT",
  "HALF_DAY",
  "LEAVE",
  "HOLIDAY",
];

export type FreelancerAttendanceRow = {
  id: string;
  date: Date;
  status: AttendanceStatus;
  notes: string | null;
};

export function FreelancerAttendanceSection({
  freelancerId,
  records,
}: {
  freelancerId: string;
  records: FreelancerAttendanceRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [date, setDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [status, setStatus] = React.useState<AttendanceStatus>("PRESENT");

  function handleMark() {
    startTransition(async () => {
      const result = await markFreelancerAttendance(freelancerId, date, status);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Attendance updated");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
          />
          <Select value={status} onValueChange={(v) => setStatus(v as AttendanceStatus)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {ATTENDANCE_STATUS_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" onClick={handleMark} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Mark attendance
          </Button>
        </div>

        <ScrollArea className="h-72">
          {records.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No attendance recorded in the last 30 days.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {records.map((record) => (
                <li
                  key={record.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span>{format(record.date, "d MMM yyyy")}</span>
                  <Badge variant={ATTENDANCE_BADGE_VARIANT[record.status]}>
                    {ATTENDANCE_STATUS_LABELS[record.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
