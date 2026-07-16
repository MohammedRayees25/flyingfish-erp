import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";

export default function Loading() {
  return <DashboardSkeleton statTiles={8} chartCards={4} />;
}
