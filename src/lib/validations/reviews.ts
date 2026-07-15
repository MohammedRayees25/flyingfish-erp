import { z } from "zod";

const REPLY_STATUSES = ["PENDING", "REPLIED", "NOT_NEEDED"] as const;
const SENTIMENTS = ["POSITIVE", "NEUTRAL", "NEGATIVE"] as const;

export const reviewSchema = z.object({
  reviewerName: z.string().trim().min(2, "Reviewer name must be at least 2 characters"),
  guestId: z.string().uuid().optional().or(z.literal("")),
  rating: z
    .number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  reviewText: z.string().trim().optional().or(z.literal("")),
  reviewDate: z.string().trim().min(1, "Review date is required"),
  replyStatus: z.enum(REPLY_STATUSES),
  instructorMentionedId: z.string().uuid().optional().or(z.literal("")),
  sentiment: z.enum(SENTIMENTS).optional().or(z.literal("")),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
