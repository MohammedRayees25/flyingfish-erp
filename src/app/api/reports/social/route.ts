import ExcelJS from "exceljs";
import { NextRequest } from "next/server";
import { format } from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { PLATFORM_LABELS, SOCIAL_PLATFORMS, type UiSocialPlatform } from "@/components/social/platform-meta";

export async function GET(request: NextRequest) {
  await requireModuleAccess("social");

  const startParam = request.nextUrl.searchParams.get("start");
  const endParam = request.nextUrl.searchParams.get("end");

  const postsWhere: Prisma.SocialMediaPostWhereInput = {
    platform: { in: [...SOCIAL_PLATFORMS] },
    ...(startParam || endParam
      ? {
          postDate: {
            ...(startParam ? { gte: new Date(`${startParam}T00:00:00.000Z`) } : {}),
            ...(endParam ? { lte: new Date(`${endParam}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };
  const snapshotsWhere: Prisma.SocialFollowerSnapshotWhereInput = {
    platform: { in: [...SOCIAL_PLATFORMS] },
    ...(startParam || endParam
      ? {
          date: {
            ...(startParam ? { gte: new Date(`${startParam}T00:00:00.000Z`) } : {}),
            ...(endParam ? { lte: new Date(`${endParam}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };

  const [posts, snapshots] = await Promise.all([
    prisma.socialMediaPost.findMany({ where: postsWhere, orderBy: { postDate: "asc" } }),
    prisma.socialFollowerSnapshot.findMany({ where: snapshotsWhere, orderBy: [{ platform: "asc" }, { date: "asc" }] }),
  ]);

  const label =
    startParam || endParam
      ? `${startParam ?? "start"}_to_${endParam ?? "end"}`
      : format(new Date(), "yyyy-MM-dd");

  const workbook = new ExcelJS.Workbook();

  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Platform", key: "platform", width: 16 },
    { header: "Posts", key: "posts", width: 10 },
    { header: "Views", key: "views", width: 12 },
    { header: "Likes", key: "likes", width: 12 },
    { header: "Comments", key: "comments", width: 12 },
    { header: "Shares", key: "shares", width: 12 },
    { header: "Saves", key: "saves", width: 12 },
    { header: "Reach", key: "reach", width: 12 },
    { header: "Leads Generated", key: "leads", width: 16 },
    { header: "Engagement Rate", key: "engagementRate", width: 16 },
  ];
  for (const platform of SOCIAL_PLATFORMS) {
    const platformPosts = posts.filter((p) => (p.platform as UiSocialPlatform) === platform);
    const totals = platformPosts.reduce(
      (acc, p) => {
        acc.views += p.views;
        acc.likes += p.likes;
        acc.comments += p.comments;
        acc.shares += p.shares;
        acc.saves += p.saves;
        acc.reach += p.reach;
        acc.leads += p.leadsGenerated;
        return acc;
      },
      { views: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0, leads: 0 }
    );
    const interactions = totals.likes + totals.comments + totals.shares + totals.saves;
    const engagementRate = totals.views > 0 ? interactions / totals.views : 0;
    summarySheet.addRow({
      platform: PLATFORM_LABELS[platform],
      posts: platformPosts.length,
      views: totals.views,
      likes: totals.likes,
      comments: totals.comments,
      shares: totals.shares,
      saves: totals.saves,
      reach: totals.reach,
      leads: totals.leads,
      engagementRate: `${(engagementRate * 100).toFixed(1)}%`,
    });
  }
  summarySheet.getRow(1).font = { bold: true };

  const postsSheet = workbook.addWorksheet("Posts");
  postsSheet.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Platform", key: "platform", width: 14 },
    { header: "Caption", key: "caption", width: 40 },
    { header: "URL", key: "url", width: 30 },
    { header: "Reel", key: "reel", width: 8 },
    { header: "Views", key: "views", width: 12 },
    { header: "Likes", key: "likes", width: 12 },
    { header: "Comments", key: "comments", width: 12 },
    { header: "Shares", key: "shares", width: 12 },
    { header: "Saves", key: "saves", width: 12 },
    { header: "Reach", key: "reach", width: 12 },
    { header: "Leads Generated", key: "leads", width: 16 },
  ];
  posts.forEach((p) => {
    postsSheet.addRow({
      date: format(p.postDate, "yyyy-MM-dd"),
      platform: PLATFORM_LABELS[p.platform as UiSocialPlatform] ?? p.platform,
      caption: p.caption ?? "",
      url: p.url ?? "",
      reel: p.isReel ? "Yes" : "No",
      views: p.views,
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
      saves: p.saves,
      reach: p.reach,
      leads: p.leadsGenerated,
    });
  });
  postsSheet.getRow(1).font = { bold: true };

  const followersSheet = workbook.addWorksheet("Followers");
  followersSheet.columns = [
    { header: "Platform", key: "platform", width: 14 },
    { header: "Date", key: "date", width: 14 },
    { header: "Followers", key: "followers", width: 14 },
  ];
  snapshots.forEach((s) => {
    followersSheet.addRow({
      platform: PLATFORM_LABELS[s.platform as UiSocialPlatform] ?? s.platform,
      date: format(s.date, "yyyy-MM-dd"),
      followers: s.followers,
    });
  });
  followersSheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="social-media-${label}.xlsx"`,
    },
  });
}
