import type {
  ActivityType,
  BookingStatus,
  PaymentStatus,
  SwimmingStatus,
  CertificationLevel,
  CertificationStatus,
  AttendanceStatus,
} from "@prisma/client";

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  BOAT_RIDE: "Boat Ride",
  SHORT_DIVE: "Short Dive",
  LONG_DIVE: "Long Dive",
  LONG_DOUBLE_DIVE: "Long Double Dive",
  FUN_DIVE: "Fun Dive",
  DIVE_GOA: "Dive Goa",
  SEI: "SEI",
  FLYING_FISH: "Flying Fish",
  PADI_OWD: "PADI OWD",
  SSI_OWD: "SSI OWD",
  PADI_AOW: "PADI AOW",
  SSI_AOW: "SSI AOW",
  EANX: "EANx",
  RESCUE: "Rescue",
  REACT_RIGHT: "React Right",
  PPB: "PPB",
  ADVANCED_ADVENTURE: "Advanced Adventure",
  WRECK_SPECIALTY: "Wreck Specialty",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  PARTIAL: "Partial",
  PAID: "Paid",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
};

export const SWIMMING_STATUS_LABELS: Record<SwimmingStatus, string> = {
  NON_SWIMMER: "Non-swimmer",
  WEAK_SWIMMER: "Weak swimmer",
  COMPETENT_SWIMMER: "Competent swimmer",
  STRONG_SWIMMER: "Strong swimmer",
};

export const CERTIFICATION_LEVEL_LABELS: Record<CertificationLevel, string> = {
  NONE: "None",
  OPEN_WATER: "Open Water",
  ADVANCED_OPEN_WATER: "Advanced Open Water",
  RESCUE: "Rescue",
  DIVEMASTER: "Divemaster",
  INSTRUCTOR: "Instructor",
  OTHER: "Other",
};

export const CERTIFICATION_STATUS_LABELS: Record<CertificationStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  PENDING_CARD: "Pending Card",
  ISSUED: "Issued",
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  HALF_DAY: "Half Day",
  LEAVE: "Leave",
  HOLIDAY: "Holiday",
};

export function formatCurrencyINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
