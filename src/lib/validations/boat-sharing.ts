import { z } from "zod";

export const boatSharingEntrySchema = z.object({
  date: z.string().trim().min(1, "Date is required"),
  boatId: z.string().uuid().optional().or(z.literal("")),
  boatVendorName: z.string().trim().optional().or(z.literal("")),
  boatAmount: z.number().min(0, "Boat amount can't be negative"),
  tempoAmount: z.number().min(0, "Tempo amount can't be negative"),
  ffGuests: z.number().int().min(0),
  dgGuests: z.number().int().min(0),
  seiGuests: z.number().int().min(0),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type BoatSharingEntryInput = z.infer<typeof boatSharingEntrySchema>;

export const vendorPaymentSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  method: z.enum(["CASH", "CARD", "UPI", "BANK_TRANSFER", "ONLINE_GATEWAY", "OTHER"]),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type VendorPaymentInput = z.infer<typeof vendorPaymentSchema>;
