"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const FollowerGrowthChart = dynamic(
  () => import("./follower-growth-chart").then((mod) => mod.FollowerGrowthChart),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full" /> }
);
