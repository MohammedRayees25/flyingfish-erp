import { z } from "zod";

const ACTIVITY_TYPES = [
  "BOAT_RIDE",
  "SHORT_DIVE",
  "LONG_DIVE",
  "LONG_DOUBLE_DIVE",
  "FUN_DIVE",
  "DIVE_GOA",
  "SEI",
  "FLYING_FISH",
  "PADI_OWD",
  "SSI_OWD",
  "PADI_AOW",
  "SSI_AOW",
  "EANX",
  "RESCUE",
  "REACT_RIGHT",
  "PPB",
  "ADVANCED_ADVENTURE",
  "WRECK_SPECIALTY",
] as const;

const BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

export const bookingSchema = z.object({
  guestId: z.string().uuid("Select a guest"),
  instructorId: z.string().uuid().optional().or(z.literal("")),
  boatId: z.string().uuid().optional().or(z.literal("")),
  diveSiteId: z.string().uuid().optional().or(z.literal("")),
  activityType: z.enum(ACTIVITY_TYPES),
  date: z.string().trim().min(1, "Date is required"),
  status: z.enum(BOOKING_STATUSES),
  price: z.number().min(0, "Price can't be negative"),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type BookingInput = z.infer<typeof bookingSchema>;
