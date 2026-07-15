import { z } from "zod";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const diveLogSchema = z
  .object({
    date: z.string().trim().min(1, "Date is required"),
    diveSiteId: z.string().uuid().optional().or(z.literal("")),
    boatId: z.string().uuid().optional().or(z.literal("")),
    instructorId: z.string().uuid().optional().or(z.literal("")),
    entryTime: z.string().regex(TIME_REGEX, "Use HH:MM").optional().or(z.literal("")),
    exitTime: z.string().regex(TIME_REGEX, "Use HH:MM").optional().or(z.literal("")),
    bottomTimeMin: z.number().int().min(0, "Can't be negative").optional(),
    maxDepth: z.number().min(0, "Can't be negative").optional(),
    visibility: z.number().int().min(0, "Can't be negative").optional(),
    current: z.string().trim().optional().or(z.literal("")),
    weather: z.string().trim().optional().or(z.literal("")),
    temperature: z.number().optional(),
    equipmentUsed: z.string().trim().optional().or(z.literal("")),
    cylinderType: z.string().trim().optional().or(z.literal("")),
    weightsUsedKg: z.number().min(0, "Can't be negative").optional(),
    marineLifeSeen: z.string().trim().optional().or(z.literal("")),
    problems: z.string().trim().optional().or(z.literal("")),
    photoUrls: z.array(z.string().trim().url("Enter a valid URL")).default([]),
    notes: z.string().trim().optional().or(z.literal("")),
    guestIds: z.array(z.string().uuid()).default([]),
  })
  .refine(
    (data) => !data.entryTime || !data.exitTime || data.exitTime > data.entryTime,
    { message: "Exit time must be after entry time", path: ["exitTime"] }
  );

export type DiveLogInput = z.infer<typeof diveLogSchema>;
