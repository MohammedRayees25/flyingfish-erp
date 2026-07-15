import { z } from "zod";

// This module only supports the three platforms the team actually posts to.
// The Prisma `SocialPlatform` enum has extra legacy values (LINKEDIN,
// EXPLURGER, GOOGLE_BUSINESS) — deliberately excluded from this UI.
export const SOCIAL_PLATFORMS = ["INSTAGRAM", "FACEBOOK", "YOUTUBE"] as const;
export type UiSocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

const nonNegativeInt = z
  .number({ invalid_type_error: "Must be a number" })
  .int("Must be a whole number")
  .min(0, "Cannot be negative");

export const socialPostSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  postDate: z.string().trim().min(1, "Post date is required"),
  url: z.string().trim().optional().or(z.literal("")),
  caption: z.string().trim().optional().or(z.literal("")),
  isReel: z.boolean(),
  views: nonNegativeInt,
  likes: nonNegativeInt,
  comments: nonNegativeInt,
  shares: nonNegativeInt,
  saves: nonNegativeInt,
  reach: nonNegativeInt,
  leadsGenerated: nonNegativeInt,
});

export type SocialPostInput = z.infer<typeof socialPostSchema>;

export const followerSnapshotSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  date: z.string().trim().min(1, "Date is required"),
  followers: nonNegativeInt,
});

export type FollowerSnapshotInput = z.infer<typeof followerSnapshotSchema>;
