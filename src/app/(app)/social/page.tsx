import type { Metadata } from "next";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, subDays, subMonths } from "date-fns";
import { Prisma } from "@prisma/client";
import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { RankedBarList } from "@/components/dashboard/ranked-bar-list";
import { PostFormSheet } from "@/components/social/post-form-sheet";
import { PostsTable, type PostRow } from "@/components/social/posts-table";
import { FollowerGrowthChart, type FollowerGrowthPoint } from "@/components/social/follower-growth-chart";
import { EngagementRateChart, type EngagementPoint } from "@/components/social/engagement-rate-chart";
import { FollowerSnapshotForm } from "@/components/social/follower-snapshot-form";
import { FollowersPanel, type SnapshotRow } from "@/components/social/followers-panel";
import {
  PLATFORM_LABELS,
  PLATFORM_ICONS,
  SOCIAL_PLATFORMS,
  type UiSocialPlatform,
} from "@/components/social/platform-meta";

export const metadata: Metadata = { title: "Social Media" };

const PAGE_SIZE = 20;

function isUiPlatform(value: string): value is UiSocialPlatform {
  return (SOCIAL_PLATFORMS as readonly string[]).includes(value);
}

export default async function SocialPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    platform?: string;
    start?: string;
    end?: string;
    reelOnly?: string;
    page?: string;
  }>;
}) {
  await requireModuleAccess("social");
  const params = await searchParams;
  const tab = ["overview", "posts", "followers"].includes(params.tab ?? "") ? params.tab! : "overview";
  const q = params.q?.trim() ?? "";
  const platform = params.platform && isUiPlatform(params.platform) ? params.platform : "";
  const start = params.start ?? "";
  const end = params.end ?? "";
  const reelOnly = params.reelOnly === "1";
  const page = Math.max(1, Number(params.page) || 1);

  const exportParams = new URLSearchParams();
  if (start) exportParams.set("start", start);
  if (end) exportParams.set("end", end);
  const exportHref = `/api/reports/social${exportParams.toString() ? `?${exportParams.toString()}` : ""}`;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Social Media</h1>
          <p className="text-sm text-muted-foreground">
            Instagram, Facebook and YouTube performance, follower growth and leads.
          </p>
        </div>
        {tab === "posts" ? (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href={exportHref}>
                <Download /> Export Excel
              </a>
            </Button>
            <PostFormSheet mode="create" />
          </div>
        ) : null}
      </div>

      <Tabs value={tab}>
        <TabsList>
          <TabsTrigger value="overview" asChild>
            <Link href="/social?tab=overview">Overview</Link>
          </TabsTrigger>
          <TabsTrigger value="posts" asChild>
            <Link href="/social?tab=posts">Posts</Link>
          </TabsTrigger>
          <TabsTrigger value="followers" asChild>
            <Link href="/social?tab=followers">Followers</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">{tab === "overview" ? <OverviewTab /> : null}</TabsContent>
        <TabsContent value="posts">
          {tab === "posts" ? (
            <Card>
              <CardContent className="pt-6">
                <PostsList q={q} platform={platform} start={start} end={end} reelOnly={reelOnly} page={page} />
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
        <TabsContent value="followers">{tab === "followers" ? <FollowersTab /> : null}</TabsContent>
      </Tabs>
    </div>
  );
}

async function OverviewTab() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const last30Start = startOfDay(subDays(now, 29));
  const last30End = endOfDay(now);

  const [monthlyByPlatform, allSnapshots, last30ByPlatform] = await Promise.all([
    prisma.socialMediaPost.groupBy({
      by: ["platform"],
      where: { platform: { in: [...SOCIAL_PLATFORMS] }, postDate: { gte: monthStart, lte: monthEnd } },
      _sum: { views: true, leadsGenerated: true },
    }),
    prisma.socialFollowerSnapshot.findMany({
      where: { platform: { in: [...SOCIAL_PLATFORMS] } },
      orderBy: [{ platform: "asc" }, { date: "asc" }],
    }),
    prisma.socialMediaPost.groupBy({
      by: ["platform"],
      where: { platform: { in: [...SOCIAL_PLATFORMS] }, postDate: { gte: last30Start, lte: last30End } },
      _sum: { likes: true, comments: true, shares: true, saves: true, views: true, leadsGenerated: true },
    }),
  ]);

  const monthlyMap = new Map(monthlyByPlatform.map((r) => [r.platform as UiSocialPlatform, r]));
  const last30Map = new Map(last30ByPlatform.map((r) => [r.platform as UiSocialPlatform, r]));

  const snapshotsByPlatform: Record<UiSocialPlatform, { date: Date; followers: number }[]> = {
    INSTAGRAM: [],
    FACEBOOK: [],
    YOUTUBE: [],
  };
  for (const s of allSnapshots) {
    const p = s.platform as UiSocialPlatform;
    snapshotsByPlatform[p]?.push({ date: s.date, followers: s.followers });
  }

  const months: { end: Date; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    months.push({ end: endOfMonth(monthDate), label: format(monthDate, "MMM yy") });
  }

  function valueAsOf(snaps: { date: Date; followers: number }[], asOf: Date): number | null {
    let result: number | null = null;
    for (const s of snaps) {
      if (s.date <= asOf) result = s.followers;
      else break;
    }
    return result;
  }

  const growthData: FollowerGrowthPoint[] = months.map((m) => ({
    label: m.label,
    INSTAGRAM: valueAsOf(snapshotsByPlatform.INSTAGRAM, m.end),
    FACEBOOK: valueAsOf(snapshotsByPlatform.FACEBOOK, m.end),
    YOUTUBE: valueAsOf(snapshotsByPlatform.YOUTUBE, m.end),
  }));

  const leadItems = SOCIAL_PLATFORMS.map((p) => ({
    label: PLATFORM_LABELS[p],
    value: last30Map.get(p)?._sum.leadsGenerated ?? 0,
  })).sort((a, b) => b.value - a.value);

  const engagementData: EngagementPoint[] = SOCIAL_PLATFORMS.map((p) => {
    const agg = last30Map.get(p);
    const views = agg?._sum.views ?? 0;
    const interactions =
      (agg?._sum.likes ?? 0) + (agg?._sum.comments ?? 0) + (agg?._sum.shares ?? 0) + (agg?._sum.saves ?? 0);
    const rate = views > 0 ? (interactions / views) * 100 : 0;
    return { platform: p, label: PLATFORM_LABELS[p], rate: Math.round(rate * 10) / 10 };
  });

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SOCIAL_PLATFORMS.map((p) => {
          const agg = monthlyMap.get(p);
          const Icon = PLATFORM_ICONS[p];
          return (
            <StatCard
              key={p}
              label={`${PLATFORM_LABELS[p]} — this month`}
              value={(agg?._sum.views ?? 0).toLocaleString()}
              icon={Icon}
              subtext={`${(agg?._sum.leadsGenerated ?? 0).toLocaleString()} leads generated`}
            />
          );
        })}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <FollowerGrowthChart data={growthData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Engagement Rate (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <EngagementRateChart data={engagementData} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lead Sources (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <RankedBarList items={leadItems} />
        </CardContent>
      </Card>
    </div>
  );
}

async function PostsList({
  q,
  platform,
  start,
  end,
  reelOnly,
  page,
}: {
  q: string;
  platform: string;
  start: string;
  end: string;
  reelOnly: boolean;
  page: number;
}) {
  const where: Prisma.SocialMediaPostWhereInput = {
    platform: platform ? (platform as UiSocialPlatform) : { in: [...SOCIAL_PLATFORMS] },
    ...(q ? { caption: { contains: q, mode: "insensitive" } } : {}),
    ...(reelOnly ? { isReel: true } : {}),
    ...(start || end
      ? {
          postDate: {
            ...(start ? { gte: new Date(`${start}T00:00:00.000Z`) } : {}),
            ...(end ? { lte: new Date(`${end}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };

  const [postsRaw, total] = await Promise.all([
    prisma.socialMediaPost.findMany({
      where,
      orderBy: { postDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.socialMediaPost.count({ where }),
  ]);

  const posts: PostRow[] = postsRaw.map((p) => ({
    id: p.id,
    platform: p.platform as UiSocialPlatform,
    postDate: p.postDate,
    url: p.url,
    caption: p.caption,
    isReel: p.isReel,
    views: p.views,
    likes: p.likes,
    comments: p.comments,
    shares: p.shares,
    saves: p.saves,
    reach: p.reach,
    leadsGenerated: p.leadsGenerated,
  }));

  return (
    <PostsTable
      posts={posts}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      query={q}
      platform={platform}
      start={start}
      end={end}
      reelOnly={reelOnly}
    />
  );
}

async function FollowersTab() {
  const snapshotsRaw = await prisma.socialFollowerSnapshot.findMany({
    where: { platform: { in: [...SOCIAL_PLATFORMS] } },
    orderBy: [{ platform: "asc" }, { date: "asc" }],
  });

  const byPlatform = new Map<UiSocialPlatform, typeof snapshotsRaw>();
  for (const s of snapshotsRaw) {
    const p = s.platform as UiSocialPlatform;
    const list = byPlatform.get(p);
    if (list) list.push(s);
    else byPlatform.set(p, [s]);
  }

  const grouped: Record<UiSocialPlatform, SnapshotRow[]> = {
    INSTAGRAM: [],
    FACEBOOK: [],
    YOUTUBE: [],
  };
  for (const platform of SOCIAL_PLATFORMS) {
    const list = byPlatform.get(platform) ?? [];
    const withDelta: SnapshotRow[] = list.map((s, idx) => ({
      id: s.id,
      date: s.date,
      followers: s.followers,
      delta: idx === 0 ? null : s.followers - list[idx - 1].followers,
    }));
    grouped[platform] = withDelta.slice().reverse();
  }

  return (
    <div className="flex flex-col gap-6">
      <FollowerSnapshotForm />
      <FollowersPanel snapshotsByPlatform={grouped} />
    </div>
  );
}
