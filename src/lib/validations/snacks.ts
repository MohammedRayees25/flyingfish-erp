import { z } from "zod";

export const snackItemSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  unit: z.string().trim().min(1, "Unit is required"),
  costPerUnit: z.number().min(0, "Cost per unit cannot be negative"),
  reorderLevel: z.number().int("Reorder level must be a whole number").min(0, "Reorder level cannot be negative"),
  isActive: z.boolean(),
});

export type SnackItemInput = z.infer<typeof snackItemSchema>;

export const snackPurchaseSchema = z.object({
  itemId: z.string().uuid("Select an item"),
  date: z.string().trim().min(1, "Date is required"),
  quantity: z.number().int("Quantity must be a whole number").positive("Quantity must be greater than zero"),
  unitCost: z.number().min(0, "Unit cost cannot be negative"),
  vendor: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type SnackPurchaseInput = z.infer<typeof snackPurchaseSchema>;

export const snackConsumptionSchema = z.object({
  itemId: z.string().uuid("Select an item"),
  date: z.string().trim().min(1, "Date is required"),
  quantity: z.number().int("Quantity must be a whole number").positive("Quantity must be greater than zero"),
  guestId: z.string().uuid("Invalid guest").optional().or(z.literal("")),
  boatId: z.string().uuid("Invalid boat").optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type SnackConsumptionInput = z.infer<typeof snackConsumptionSchema>;
