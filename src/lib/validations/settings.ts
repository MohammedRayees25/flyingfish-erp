import { z } from "zod";

export const companySettingsSchema = z.object({
  companyName: z.string().trim().min(2, "Company name must be at least 2 characters"),
  logoUrl: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  gstNumber: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  emailNotificationsEnabled: z.boolean(),
  whatsappNotificationsEnabled: z.boolean(),
});

export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;

export const rentalItemSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  dailyRate: z.number().min(0, "Daily rate cannot be negative"),
  isActive: z.boolean(),
});

export type RentalItemInput = z.infer<typeof rentalItemSchema>;
