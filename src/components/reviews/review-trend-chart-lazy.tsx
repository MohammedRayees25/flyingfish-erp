"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const ReviewTrendChart = dynamic(
  () => import("./review-trend-chart").then((mod) => mod.ReviewTrendChart),
  { ssr: false, loading: () => <Skeleton className="h-[260px] w-full" /> }
);
