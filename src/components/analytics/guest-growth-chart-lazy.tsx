"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const GuestGrowthChart = dynamic(
  () => import("./guest-growth-chart").then((mod) => mod.GuestGrowthChart),
  { ssr: false, loading: () => <Skeleton className="h-[220px] w-full" /> }
);
