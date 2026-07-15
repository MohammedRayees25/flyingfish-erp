import "server-only";
import { format, startOfMonth, subMonths } from "date-fns";
import { prisma } from "@/lib/prisma";

// Common English function words to exclude when extracting keywords from
// free-text reviews. Deliberately keeps sentiment-bearing adjectives
// ("great", "friendly", "amazing", …) since those are exactly what an
// operator wants to see surfaced.
const STOPWORDS = new Set([
  "the", "a", "an", "and", "is", "was", "were", "are", "be", "been", "being",
  "very", "we", "i", "to", "for", "of", "in", "on", "at", "with", "it", "its",
  "this", "that", "these", "those", "but", "so", "as", "had", "has", "have",
  "not", "no", "nor", "all", "our", "us", "you", "your", "yours", "they",
  "their", "them", "he", "she", "his", "her", "hers", "my", "me", "mine",
  "if", "or", "from", "by", "will", "would", "can", "could", "should",
  "just", "also", "there", "here", "what", "which", "who", "whom", "when",
  "where", "why", "how", "than", "then", "out", "up", "down", "about",
  "into", "over", "after", "before", "again", "more", "most", "some",
  "such", "only", "own", "same", "too", "s", "t", "don", "now", "did",
  "do", "does", "doing", "got", "get", "one", "two", "im", "ive", "id",
  "am", "were", "was", "went", "go", "going", "day", "days", "time",
  "really", "definitely", "would", "u", "cant", "didn", "isn", "wasn",
  "couldn", "wouldn", "shouldn",
]);

export type ReviewTrendPoint = {
  month: string;
  label: string;
  avgRating: number;
  count: number;
};

export async function getReviewTrend(months = 6): Promise<ReviewTrendPoint[]> {
  const now = new Date();
  const rangeStart = startOfMonth(subMonths(now, months - 1));

  const reviews = await prisma.googleReview.findMany({
    where: { reviewDate: { gte: rangeStart } },
    select: { rating: true, reviewDate: true },
  });

  const buckets = new Map<string, { sum: number; count: number; label: string }>();
  for (let i = months - 1; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    const key = format(monthStart, "yyyy-MM");
    buckets.set(key, { sum: 0, count: 0, label: format(monthStart, "MMM yyyy") });
  }

  for (const review of reviews) {
    const key = format(review.reviewDate, "yyyy-MM");
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.sum += review.rating;
    bucket.count += 1;
  }

  return Array.from(buckets.entries()).map(([month, bucket]) => ({
    month,
    label: bucket.label,
    avgRating: bucket.count > 0 ? Math.round((bucket.sum / bucket.count) * 100) / 100 : 0,
    count: bucket.count,
  }));
}

export function extractKeywords(
  texts: string[],
  limit = 15
): { label: string; value: number }[] {
  const counts = new Map<string, number>();

  for (const text of texts) {
    const words = text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
    for (const word of words) {
      if (word.length < 3) continue;
      if (STOPWORDS.has(word)) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}
