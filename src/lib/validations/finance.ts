import { z } from "zod";

const REVENUE_CATEGORIES = ["BOOKING", "COURSE", "MERCHANDISE", "OTHER"] as const;
const EXPENSE_CATEGORIES = [
  "BOAT",
  "TEMPO",
  "FREELANCER",
  "SNACKS",
  "SALARY",
  "MARKETING",
  "EQUIPMENT",
  "MAINTENANCE",
  "OTHER",
] as const;

export const transactionSchema = z.object({
  type: z.enum(["REVENUE", "EXPENSE"]),
  revenueCategory: z.enum(REVENUE_CATEGORIES).optional().or(z.literal("")),
  expenseCategory: z.enum(EXPENSE_CATEGORIES).optional().or(z.literal("")),
  amount: z.number().positive("Amount must be greater than 0"),
  date: z.string().trim().min(1, "Date is required"),
  description: z.string().trim().optional().or(z.literal("")),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

export const salaryAmountSchema = z.object({
  monthlySalary: z.number().min(0, "Salary can't be negative"),
});

export type SalaryAmountInput = z.infer<typeof salaryAmountSchema>;
