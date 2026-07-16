"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { fieldErrorsFrom } from "@/lib/form-errors";
import {
  socialPostSchema,
  followerSnapshotSchema,
  type SocialPostInput,
  type FollowerSnapshotInput,
} from "@/lib/validations/social";

export type SocialActionState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

function toDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export async function createSocialPost(input: SocialPostInput): Promise<SocialActionState> {
  await requireModuleAccess("social");

  const parsed = socialPostSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const data = parsed.data;

  await prisma.socialMediaPost.create({
    data: {
      platform: data.platform,
      postDate: toDateOnly(data.postDate),
      url: data.url || null,
      caption: data.caption || null,
      isReel: data.isReel,
      views: data.views,
      likes: data.likes,
      comments: data.comments,
      shares: data.shares,
      saves: data.saves,
      reach: data.reach,
      leadsGenerated: data.leadsGenerated,
    },
  });

  revalidatePath("/social");
  revalidatePath("/");
  revalidateTag("dashboard");
  return undefined;
}

export async function updateSocialPost(
  postId: string,
  input: SocialPostInput
): Promise<SocialActionState> {
  await requireModuleAccess("social");

  const parsed = socialPostSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const data = parsed.data;

  await prisma.socialMediaPost.update({
    where: { id: postId },
    data: {
      platform: data.platform,
      postDate: toDateOnly(data.postDate),
      url: data.url || null,
      caption: data.caption || null,
      isReel: data.isReel,
      views: data.views,
      likes: data.likes,
      comments: data.comments,
      shares: data.shares,
      saves: data.saves,
      reach: data.reach,
      leadsGenerated: data.leadsGenerated,
    },
  });

  revalidatePath("/social");
  revalidatePath("/");
  revalidateTag("dashboard");
  return undefined;
}

export async function deleteSocialPost(postId: string): Promise<SocialActionState> {
  await requireModuleAccess("social");
  await prisma.socialMediaPost.delete({ where: { id: postId } });
  revalidatePath("/social");
  revalidatePath("/");
  revalidateTag("dashboard");
  return undefined;
}

// Keyed on the platform+date unique constraint, so re-recording the same
// platform's count for a date that already has a snapshot just updates it
// instead of erroring.
export async function upsertFollowerSnapshot(
  input: FollowerSnapshotInput
): Promise<SocialActionState> {
  await requireModuleAccess("social");

  const parsed = followerSnapshotSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const data = parsed.data;
  const day = toDateOnly(data.date);

  await prisma.socialFollowerSnapshot.upsert({
    where: { platform_date: { platform: data.platform, date: day } },
    update: { followers: data.followers },
    create: { platform: data.platform, date: day, followers: data.followers },
  });

  revalidatePath("/social");
  return undefined;
}

export async function deleteFollowerSnapshot(snapshotId: string): Promise<SocialActionState> {
  await requireModuleAccess("social");
  await prisma.socialFollowerSnapshot.delete({ where: { id: snapshotId } });
  revalidatePath("/social");
  return undefined;
}
