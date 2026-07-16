import "server-only";
import { prisma } from "@/lib/prisma";
import { getBoatSharingReport } from "@/lib/boat-sharing-reports";
import { currency } from "./finance-data";
import type { ReportTable, ReportPeriod } from "./types";
import { CERTIFICATION_LEVEL_LABELS, ATTENDANCE_STATUS_LABELS } from "@/lib/labels";

export async function buildBoatSharingReport(period: ReportPeriod): Promise<ReportTable> {
  const data = await getBoatSharingReport({ date: { gte: period.start, lte: period.end } });

  return {
    id: "boat-sharing",
    title: "Boat Sharing Report",
    subtitle: period.label,
    generatedAt: new Date(),
    summary: [
      { label: "Trips", value: String(data.trips) },
      { label: "Total guests", value: String(data.totalGuests) },
      { label: "Boat + Tempo cost", value: currency(data.boatAmount + data.tempoAmount) },
      { label: "Vendor outstanding", value: currency(data.outstanding) },
      { label: "Party pending", value: currency(data.pendingPartyAmount) },
    ],
    columns: [
      { key: "party", header: "Party" },
      { key: "guests", header: "Guests", align: "right" },
      { key: "due", header: "Amount Due", align: "right" },
      { key: "paid", header: "Amount Paid", align: "right" },
      { key: "remaining", header: "Remaining", align: "right" },
    ],
    rows: data.partyTotals.map((p) => ({
      party: p.partyName,
      guests: p.guestCount,
      due: currency(p.amountDue),
      paid: currency(p.amountPaid),
      remaining: currency(p.amountDue - p.amountPaid),
    })),
  };
}

export async function buildGuestReport(period: ReportPeriod): Promise<ReportTable> {
  const guests = await prisma.guest.findMany({
    where: {
      bookings: { some: { date: { gte: period.start, lte: period.end } } },
    },
    select: {
      fullName: true,
      nationality: true,
      certificationLevel: true,
      previousDives: true,
      bookings: {
        where: { date: { gte: period.start, lte: period.end } },
        select: { id: true },
      },
      payments: {
        where: { status: "PAID" },
        select: { amount: true },
      },
    },
    orderBy: { fullName: "asc" },
  });

  const totalSpend = guests.reduce(
    (sum, g) => sum + g.payments.reduce((s, p) => s + Number(p.amount), 0),
    0
  );

  return {
    id: "guest",
    title: "Guest Report",
    subtitle: period.label,
    generatedAt: new Date(),
    summary: [
      { label: "Active guests", value: String(guests.length) },
      { label: "Total lifetime spend", value: currency(totalSpend) },
    ],
    columns: [
      { key: "name", header: "Guest" },
      { key: "nationality", header: "Nationality" },
      { key: "certification", header: "Certification" },
      { key: "bookings", header: "Bookings (period)", align: "right" },
      { key: "previousDives", header: "Previous Dives", align: "right" },
      { key: "spend", header: "Lifetime Paid", align: "right" },
    ],
    rows: guests.map((g) => ({
      name: g.fullName,
      nationality: g.nationality ?? "—",
      certification: CERTIFICATION_LEVEL_LABELS[g.certificationLevel],
      bookings: g.bookings.length,
      previousDives: g.previousDives,
      spend: currency(g.payments.reduce((s, p) => s + Number(p.amount), 0)),
    })),
  };
}

export async function buildInstructorReport(period: ReportPeriod): Promise<ReportTable> {
  const instructors = await prisma.user.findMany({
    where: { role: "INSTRUCTOR" },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });

  const rows = await Promise.all(
    instructors.map(async (instructor) => {
      const [bookings, certifications, reviews] = await Promise.all([
        prisma.booking.findMany({
          where: {
            instructorId: instructor.id,
            date: { gte: period.start, lte: period.end },
            status: { in: ["CONFIRMED", "COMPLETED"] },
          },
          select: { price: true },
        }),
        prisma.guestCertification.count({
          where: {
            instructorId: instructor.id,
            createdAt: { gte: period.start, lte: period.end },
          },
        }),
        prisma.googleReview.aggregate({
          where: { instructorMentionedId: instructor.id, reviewDate: { gte: period.start, lte: period.end } },
          _avg: { rating: true },
          _count: true,
        }),
      ]);

      const revenueNum = bookings.reduce((sum, b) => sum + Number(b.price), 0);

      return {
        revenueNum,
        row: {
          name: instructor.fullName,
          bookings: bookings.length,
          revenue: currency(revenueNum),
          certifications,
          avgRating: reviews._avg.rating ? reviews._avg.rating.toFixed(1) : "—",
          reviewCount: reviews._count,
        },
      };
    })
  );

  rows.sort((a, b) => b.revenueNum - a.revenueNum);
  const totalRevenue = rows.reduce((sum, r) => sum + r.revenueNum, 0);

  return {
    id: "instructor",
    title: "Instructor Report",
    subtitle: period.label,
    generatedAt: new Date(),
    summary: [
      { label: "Instructors", value: String(instructors.length) },
      { label: "Revenue generated", value: currency(totalRevenue) },
    ],
    columns: [
      { key: "name", header: "Instructor" },
      { key: "bookings", header: "Bookings", align: "right" },
      { key: "revenue", header: "Revenue", align: "right" },
      { key: "certifications", header: "Certifications Taught", align: "right" },
      { key: "avgRating", header: "Avg Rating", align: "right" },
      { key: "reviewCount", header: "Reviews", align: "right" },
    ],
    rows: rows.map((r) => r.row),
  };
}

export async function buildStaffAttendanceReport(period: ReportPeriod): Promise<ReportTable> {
  const [staff, records] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
    prisma.staffAttendance.findMany({
      where: { date: { gte: period.start, lte: period.end } },
      select: { userId: true, status: true },
    }),
  ]);

  const rows = staff.map((s) => {
    const staffRecords = records.filter((r) => r.userId === s.id);
    const present = staffRecords.filter((r) => r.status === "PRESENT").length;
    const halfDay = staffRecords.filter((r) => r.status === "HALF_DAY").length;
    const absent = staffRecords.filter((r) => r.status === "ABSENT").length;
    const leave = staffRecords.filter((r) => r.status === "LEAVE").length;
    const holiday = staffRecords.filter((r) => r.status === "HOLIDAY").length;
    const marked = staffRecords.length;
    const pct = marked > 0 ? (((present + halfDay * 0.5) / marked) * 100).toFixed(1) : "—";

    return {
      name: s.fullName,
      present,
      halfDay,
      absent,
      leave,
      holiday,
      attendancePct: marked > 0 ? `${pct}%` : "—",
    };
  });

  const totalMarked = records.length;
  const totalPresent = records.filter((r) => r.status === "PRESENT").length;

  return {
    id: "staff-attendance",
    title: "Staff Attendance Report",
    subtitle: period.label,
    generatedAt: new Date(),
    summary: [
      { label: "Staff", value: String(staff.length) },
      { label: "Days marked", value: String(totalMarked) },
      { label: "Present", value: String(totalPresent) },
    ],
    columns: [
      { key: "name", header: "Staff" },
      { key: "present", header: ATTENDANCE_STATUS_LABELS.PRESENT, align: "right" },
      { key: "halfDay", header: ATTENDANCE_STATUS_LABELS.HALF_DAY, align: "right" },
      { key: "absent", header: ATTENDANCE_STATUS_LABELS.ABSENT, align: "right" },
      { key: "leave", header: ATTENDANCE_STATUS_LABELS.LEAVE, align: "right" },
      { key: "holiday", header: ATTENDANCE_STATUS_LABELS.HOLIDAY, align: "right" },
      { key: "attendancePct", header: "Attendance %", align: "right" },
    ],
    rows,
  };
}

export async function buildFreelancerPaymentReport(period: ReportPeriod): Promise<ReportTable> {
  const freelancers = await prisma.freelancer.findMany({
    select: {
      fullName: true,
      role: true,
      payments: {
        where: { createdAt: { gte: period.start, lte: period.end } },
        select: { status: true, amount: true },
      },
      attendance: {
        where: { date: { gte: period.start, lte: period.end }, status: "PRESENT" },
        select: { id: true },
      },
    },
    orderBy: { fullName: "asc" },
  });

  let totalPaid = 0;
  let totalPending = 0;

  const rows = freelancers.map((f) => {
    const paid = f.payments.filter((p) => p.status === "PAID").reduce((s, p) => s + Number(p.amount), 0);
    const pending = f.payments
      .filter((p) => p.status === "PENDING" || p.status === "PARTIAL")
      .reduce((s, p) => s + Number(p.amount), 0);
    totalPaid += paid;
    totalPending += pending;

    return {
      name: f.fullName,
      role: f.role,
      daysPresent: f.attendance.length,
      paid: currency(paid),
      pending: currency(pending),
    };
  });

  return {
    id: "freelancer-payment",
    title: "Freelancer Payment Report",
    subtitle: period.label,
    generatedAt: new Date(),
    summary: [
      { label: "Freelancers", value: String(freelancers.length) },
      { label: "Total paid", value: currency(totalPaid) },
      { label: "Total pending", value: currency(totalPending) },
    ],
    columns: [
      { key: "name", header: "Freelancer" },
      { key: "role", header: "Role" },
      { key: "daysPresent", header: "Days Present", align: "right" },
      { key: "paid", header: "Paid", align: "right" },
      { key: "pending", header: "Pending", align: "right" },
    ],
    rows,
  };
}
