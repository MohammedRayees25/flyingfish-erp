import { z } from "zod";

export const certificationCourseSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  agency: z.enum(["PADI", "SSI", "OTHER"]),
  track: z.string().trim().optional().or(z.literal("")),
  price: z.number().min(0, "Price cannot be negative"),
});

export type CertificationCourseInput = z.infer<typeof certificationCourseSchema>;

export const guestCertificationSchema = z.object({
  guestId: z.string().uuid("Select a guest"),
  courseId: z.string().uuid("Select a course"),
  instructorId: z.string().trim().optional().or(z.literal("")),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "PENDING_CARD", "ISSUED"]),
  progress: z
    .number()
    .min(0, "Progress cannot be negative")
    .max(100, "Progress cannot exceed 100"),
  theoryCompletedAt: z.string().trim().optional().or(z.literal("")),
  poolCompletedAt: z.string().trim().optional().or(z.literal("")),
  openWaterDivesCompleted: z.number().int().min(0, "Cannot be negative"),
  openWaterDivesRequired: z.number().int().min(0, "Cannot be negative"),
  examPassedAt: z.string().trim().optional().or(z.literal("")),
  certificateNumber: z.string().trim().optional().or(z.literal("")),
  startDate: z.string().trim().optional().or(z.literal("")),
  completionDate: z.string().trim().optional().or(z.literal("")),
  issueDate: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type GuestCertificationInput = z.infer<typeof guestCertificationSchema>;
