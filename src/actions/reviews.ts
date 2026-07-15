"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { reviewSchema, type ReviewInput } from "@/lib/validations/reviews";
import type { ReviewReplyStatus, ReviewSentiment } from "@prisma/client";

export type ReviewActionState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

function toDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function fieldErrorsFrom(error: import("zod").ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    fieldErrors[String(issue.path[0])] = issue.message;
  }
  return fieldErrors;
}

function deriveSentiment(rating: number): ReviewSentiment {
  if (rating >= 4) return "POSITIVE";
  if (rating === 3) return "NEUTRAL";
  return "NEGATIVE";
}

export async function createReview(input: ReviewInput): Promise<ReviewActionState> {
  await requireModuleAccess("reviews");

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = parsed.data;

  await prisma.googleReview.create({
    data: {
      reviewerName: data.reviewerName,
      guestId: data.guestId || null,
      rating: data.rating,
      reviewText: data.reviewText || null,
      reviewDate: toDateOnly(data.reviewDate),
      replyStatus: data.replyStatus,
      instructorMentionedId: data.instructorMentionedId || null,
      sentiment: data.sentiment || deriveSentiment(data.rating),
    },
  });

  revalidatePath("/reviews");
  return undefined;
}

export async function updateReview(
  reviewId: string,
  input: ReviewInput
): Promise<ReviewActionState> {
  await requireModuleAccess("reviews");

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = parsed.data;

  await prisma.googleReview.update({
    where: { id: reviewId },
    data: {
      reviewerName: data.reviewerName,
      guestId: data.guestId || null,
      rating: data.rating,
      reviewText: data.reviewText || null,
      reviewDate: toDateOnly(data.reviewDate),
      replyStatus: data.replyStatus,
      instructorMentionedId: data.instructorMentionedId || null,
      sentiment: data.sentiment || deriveSentiment(data.rating),
    },
  });

  revalidatePath("/reviews");
  return undefined;
}

export async function deleteReview(reviewId: string): Promise<ReviewActionState> {
  await requireModuleAccess("reviews");

  await prisma.googleReview.delete({ where: { id: reviewId } });

  revalidatePath("/reviews");
  return undefined;
}

export async function updateReplyStatus(
  reviewId: string,
  status: ReviewReplyStatus
): Promise<ReviewActionState> {
  await requireModuleAccess("reviews");

  await prisma.googleReview.update({
    where: { id: reviewId },
    data: { replyStatus: status },
  });

  revalidatePath("/reviews");
  return undefined;
}
