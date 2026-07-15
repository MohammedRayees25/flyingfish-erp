// Shared presentation metadata for the three platforms this module covers.
// Kept as one source of truth so the same label/color/icon is used
// everywhere — stat cards, charts, badges, filters — for one consistent
// per-platform identity across the whole page.
import { Camera, Users, Video, type LucideIcon } from "lucide-react";
import { SOCIAL_PLATFORMS, type UiSocialPlatform } from "@/lib/validations/social";

export { SOCIAL_PLATFORMS, type UiSocialPlatform };

export const PLATFORM_LABELS: Record<UiSocialPlatform, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  YOUTUBE: "YouTube",
};

// Fixed categorical order — chart-1/2/3, never reassigned by filters or rank.
export const PLATFORM_COLORS: Record<UiSocialPlatform, string> = {
  INSTAGRAM: "var(--chart-1)",
  FACEBOOK: "var(--chart-2)",
  YOUTUBE: "var(--chart-3)",
};

export const PLATFORM_ICONS: Record<UiSocialPlatform, LucideIcon> = {
  INSTAGRAM: Camera,
  FACEBOOK: Users,
  YOUTUBE: Video,
};
