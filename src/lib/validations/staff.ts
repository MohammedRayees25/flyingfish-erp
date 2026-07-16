import { z } from "zod";

export const markAttendanceSchema = z.object({
  userId: z.string().uuid("Invalid staff member"),
  date: z.string().trim().min(1, "Date is required"),
  status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "HOLIDAY"]),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;

export const bulkAttendanceSchema = z.object({
  date: z.string().trim().min(1, "Date is required"),
  status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "HOLIDAY"]),
  userIds: z.array(z.string().uuid()).min(1, "Select at least one staff member"),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;

export const leaveSchema = z
  .object({
    userId: z.string().uuid("Select a staff member"),
    startDate: z.string().trim().min(1, "Start date is required"),
    endDate: z.string().trim().min(1, "End date is required"),
    notes: z.string().trim().optional().or(z.literal("")),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

export type LeaveInput = z.infer<typeof leaveSchema>;
