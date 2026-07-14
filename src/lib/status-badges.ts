// Shared Badge-variant / display mappings for the Staff Attendance and
// Freelancer Management modules, kept in one place so every table, card and
// legend colors statuses identically.
import type { AttendanceStatus, PaymentStatus } from "@prisma/client";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "success"
  | "warning";

export const ATTENDANCE_BADGE_VARIANT: Record<AttendanceStatus, BadgeVariant> = {
  PRESENT: "success",
  ABSENT: "destructive",
  HALF_DAY: "warning",
  LEAVE: "warning",
  HOLIDAY: "outline",
};

export const ATTENDANCE_STATUS_LETTER: Record<AttendanceStatus, string> = {
  PRESENT: "P",
  ABSENT: "A",
  HALF_DAY: "H",
  LEAVE: "L",
  HOLIDAY: "HO",
};

export const ATTENDANCE_DOT_CLASS: Record<AttendanceStatus, string> = {
  PRESENT: "bg-success text-success-foreground",
  ABSENT: "bg-destructive text-white",
  HALF_DAY: "bg-warning text-warning-foreground",
  LEAVE: "bg-warning text-warning-foreground",
  HOLIDAY: "bg-muted-foreground/40 text-foreground",
};

export const PAYMENT_BADGE_VARIANT: Record<PaymentStatus, BadgeVariant> = {
  PAID: "success",
  PENDING: "warning",
  PARTIAL: "warning",
  REFUNDED: "outline",
  CANCELLED: "outline",
};
