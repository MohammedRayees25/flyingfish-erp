import { z } from "zod";

export const guestSchema = z.object({
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
  nationality: z.string().trim().optional().or(z.literal("")),
  emergencyContactName: z.string().trim().optional().or(z.literal("")),
  emergencyContactPhone: z.string().trim().optional().or(z.literal("")),
  medicalDeclaration: z.boolean(),
  medicalNotes: z.string().trim().optional().or(z.literal("")),
  swimmingStatus: z.enum([
    "NON_SWIMMER",
    "WEAK_SWIMMER",
    "COMPETENT_SWIMMER",
    "STRONG_SWIMMER",
  ]),
  certificationLevel: z.enum([
    "NONE",
    "OPEN_WATER",
    "ADVANCED_OPEN_WATER",
    "RESCUE",
    "DIVEMASTER",
    "INSTRUCTOR",
    "OTHER",
  ]),
  previousDives: z.number().int().min(0),
  dateOfBirth: z.string().trim().optional().or(z.literal("")),
  source: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type GuestInput = z.infer<typeof guestSchema>;
