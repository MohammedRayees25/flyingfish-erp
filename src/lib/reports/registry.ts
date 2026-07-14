import "server-only";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  subDays,
} from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  buildOperationalPeriodReport,
  buildRevenueReport,
  buildExpenseReport,
  buildProfitReport,
} from "./period-reports";
import {
  buildBoatSharingReport,
  buildGuestReport,
  buildInstructorReport,
  buildStaffAttendanceReport,
  buildFreelancerPaymentReport,
} from "./entity-reports";
import type { ReportTable, ReportPeriod } from "./types";

export const REPORT_DEFINITIONS = [
  { id: "daily", label: "Daily Report", description: "Today's operations and finance summary." },
  { id: "weekly", label: "Weekly Report", description: "This week's operations and finance summary." },
  { id: "monthly", label: "Monthly Report", description: "This month's operations and finance summary." },
  { id: "seasonal", label: "Seasonal Report", description: "The active season's operations and finance summary." },
  { id: "revenue", label: "Revenue Report", description: "Revenue transactions and category breakdown." },
  { id: "expense", label: "Expense Report", description: "Expense transactions and category breakdown." },
  { id: "profit", label: "Profit Report", description: "Daily revenue, expense, profit and margin." },
  { id: "boat-sharing", label: "Boat Sharing Report", description: "Per-party cost split and payment status." },
  { id: "guest", label: "Guest Report", description: "Guest activity, spend and certification level." },
  { id: "instructor", label: "Instructor Report", description: "Bookings, revenue and ratings per instructor." },
  { id: "staff-attendance", label: "Staff Attendance Report", description: "Attendance breakdown per staff member." },
  { id: "freelancer-payment", label: "Freelancer Payment Report", description: "Payments paid and pending per freelancer." },
] as const;

export type ReportId = (typeof REPORT_DEFINITIONS)[number]["id"];

export function isReportId(value: string): value is ReportId {
  return REPORT_DEFINITIONS.some((r) => r.id === value);
}

// Default date range per report when the caller doesn't supply one.
export async function defaultPeriodFor(id: ReportId): Promise<ReportPeriod> {
  const now = new Date();

  switch (id) {
    case "daily":
      return { start: startOfDay(now), end: endOfDay(now), label: format(now, "EEEE, d MMMM yyyy") };
    case "weekly":
      return {
        start: startOfWeek(now),
        end: endOfWeek(now),
        label: `${format(startOfWeek(now), "d MMM")} – ${format(endOfWeek(now), "d MMM yyyy")}`,
      };
    case "seasonal": {
      const season = await prisma.season.findFirst({ where: { isActive: true } });
      if (season) {
        return {
          start: season.startDate,
          end: season.endDate,
          label: `${season.name} (${format(season.startDate, "d MMM yyyy")} – ${format(season.endDate, "d MMM yyyy")})`,
        };
      }
      return { start: startOfMonth(now), end: endOfMonth(now), label: "No active season — showing this month" };
    }
    case "guest":
    case "instructor":
    case "freelancer-payment":
      return {
        start: startOfDay(subDays(now, 89)),
        end: endOfDay(now),
        label: `Last 90 days (${format(subDays(now, 89), "d MMM")} – ${format(now, "d MMM yyyy")})`,
      };
    case "monthly":
    case "revenue":
    case "expense":
    case "profit":
    case "boat-sharing":
    case "staff-attendance":
    default:
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        label: format(now, "MMMM yyyy"),
      };
  }
}

export async function buildReport(id: ReportId, period: ReportPeriod): Promise<ReportTable> {
  switch (id) {
    case "daily":
      return buildOperationalPeriodReport("daily", "Daily Report", period);
    case "weekly":
      return buildOperationalPeriodReport("weekly", "Weekly Report", period);
    case "monthly":
      return buildOperationalPeriodReport("monthly", "Monthly Report", period);
    case "seasonal":
      return buildOperationalPeriodReport("seasonal", "Seasonal Report", period);
    case "revenue":
      return buildRevenueReport(period);
    case "expense":
      return buildExpenseReport(period);
    case "profit":
      return buildProfitReport(period);
    case "boat-sharing":
      return buildBoatSharingReport(period);
    case "guest":
      return buildGuestReport(period);
    case "instructor":
      return buildInstructorReport(period);
    case "staff-attendance":
      return buildStaffAttendanceReport(period);
    case "freelancer-payment":
      return buildFreelancerPaymentReport(period);
  }
}
