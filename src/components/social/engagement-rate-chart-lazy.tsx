"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const EngagementRateChart = dynamic(
  () => import("./engagement-rate-chart").then((mod) => mod.EngagementRateChart),
  { ssr: false, loading: () => <Skeleton className="h-[240px] w-full" /> }
);
