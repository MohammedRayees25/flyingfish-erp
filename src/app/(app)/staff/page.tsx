import type { Metadata } from "next";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailyAttendance } from "@/components/staff/daily-attendance";
import { MonthlyOverview } from "@/components/staff/monthly-overview";
import { LeaveManagement } from "@/components/staff/leave-management";

export const metadata: Metadata = { title: "Staff Attendance" };

function toDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; month?: string }>;
}) {
  await requireModuleAccess("staff");
  const params = await searchParams;

  const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "")
    ? params.date!
    : format(new Date(), "yyyy-MM-dd");
  const monthStr = /^\d{4}-\d{2}$/.test(params.month ?? "")
    ? params.month!
    : format(new Date(), "yyyy-MM");

  const monthStart = startOfMonth(toDateOnly(`${monthStr}-01`));
  const monthEnd = endOfMonth(monthStart);

  const [staff, attendanceForDate, monthAttendance, leaveRecords] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, orderBy: { fullName: "asc" } }),
    prisma.staffAttendance.findMany({ where: { date: toDateOnly(dateStr) } }),
    prisma.staffAttendance.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.staffAttendance.findMany({
      where: { status: "LEAVE", date: { gte: monthStart, lte: monthEnd } },
      include: { user: true },
      orderBy: { date: "desc" },
    }),
  ]);

  const attendanceByUserId = Object.fromEntries(
    attendanceForDate.map((a) => [a.userId, a.status])
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Staff Attendance</h1>
        <p className="text-sm text-muted-foreground">
          Track daily attendance, monthly summaries and leave for active staff.
        </p>
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily Attendance</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Overview</TabsTrigger>
          <TabsTrigger value="leave">Leave Management</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <DailyAttendance date={dateStr} month={monthStr} staff={staff} attendance={attendanceByUserId} />
        </TabsContent>

        <TabsContent value="monthly">
          <MonthlyOverview
            month={monthStr}
            date={dateStr}
            staff={staff}
            records={monthAttendance}
          />
        </TabsContent>

        <TabsContent value="leave">
          <LeaveManagement staff={staff} leaveRecords={leaveRecords} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
