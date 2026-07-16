"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// recharts is a large dependency; splitting each chart into its own chunk
// (loaded client-side, on demand) keeps it out of the page's initial JS.
export const RevenueChart = dynamic(
  () => import("./revenue-chart").then((mod) => mod.RevenueChart),
  { ssr: false, loading: () => <Skeleton className="h-[260px] w-full" /> }
);
