import { z } from "zod";

export const freelancerSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters"),
  role: z.string().trim().min(2, "Role is required"),
  phone: z.string().trim().optional().or(z.literal("")),
  dayRate: z.number().min(0, "Day rate cannot be negative"),
  isActive: z.boolean(),
});

export type FreelancerInput = z.infer<typeof freelancerSchema>;

export const freelancerAttendanceSchema = z.object({
  freelancerId: z.string().uuid("Invalid freelancer"),
  date: z.string().trim().min(1, "Date is required"),
  status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "HOLIDAY"]),
});

export type FreelancerAttendanceInput = z.infer<typeof freelancerAttendanceSchema>;

export const freelancerPaymentSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero"),
  status: z.enum(["PENDING", "PARTIAL", "PAID", "REFUNDED", "CANCELLED"]),
  dueDate: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type FreelancerPaymentInput = z.infer<typeof freelancerPaymentSchema>;
