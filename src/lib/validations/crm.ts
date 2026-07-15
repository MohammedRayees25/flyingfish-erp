import { z } from "zod";

export const LEAD_STAGES = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "BOOKED",
  "COMPLETED",
  "LOST",
] as const;

export const leadSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(20, "Phone number is too long"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  source: z.string().trim().max(60, "Source is too long").optional().or(z.literal("")),
  stage: z.enum(LEAD_STAGES),
  assignedToId: z.string().uuid("Invalid staff member").optional().or(z.literal("")),
  followUpAt: z.string().trim().optional().or(z.literal("")),
  isRepeatCustomer: z.boolean(),
  referredById: z.string().uuid("Invalid referral").optional().or(z.literal("")),
  guestId: z.string().uuid("Invalid guest").optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type LeadInput = z.infer<typeof leadSchema>;

export const leadStageSchema = z.enum(LEAD_STAGES);
