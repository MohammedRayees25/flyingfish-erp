"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const LeadFunnelChart = dynamic(
  () => import("./lead-funnel-chart").then((mod) => mod.LeadFunnelChart),
  { ssr: false, loading: () => <Skeleton className="h-[220px] w-full" /> }
);
