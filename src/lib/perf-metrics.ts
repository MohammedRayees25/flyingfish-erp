import "server-only";

// Lightweight, in-memory, single-process performance instrumentation for
// the /settings/performance page. Resets on every server restart/redeploy
// -- there's no metrics database in this app, so this reports real activity
// observed since the process started rather than fabricated numbers.

export type QueryLogEntry = {
  model: string;
  action: string;
  durationMs: number;
  path: string;
  timestamp: number;
};

const MAX_QUERY_LOG = 500;
const queryLog: QueryLogEntry[] = [];

let dashboardPageViews = 0;
let dashboardCacheMisses = 0;

export function recordQuery(entry: QueryLogEntry) {
  queryLog.push(entry);
  if (queryLog.length > MAX_QUERY_LOG) queryLog.shift();
}

export function recordDashboardPageView() {
  dashboardPageViews += 1;
}

export function recordDashboardCacheMiss() {
  dashboardCacheMisses += 1;
}

export function getQueryStats() {
  const count = queryLog.length;
  const totalMs = queryLog.reduce((sum, q) => sum + q.durationMs, 0);
  const avgMs = count > 0 ? totalMs / count : 0;

  const slowestQueries = [...queryLog].sort((a, b) => b.durationMs - a.durationMs).slice(0, 15);

  const byPath = new Map<string, { count: number; totalMs: number }>();
  for (const q of queryLog) {
    const entry = byPath.get(q.path) ?? { count: 0, totalMs: 0 };
    entry.count += 1;
    entry.totalMs += q.durationMs;
    byPath.set(q.path, entry);
  }
  const slowestPaths = Array.from(byPath.entries())
    .map(([path, v]) => ({
      path,
      queryCount: v.count,
      totalMs: v.totalMs,
      avgMs: v.totalMs / v.count,
    }))
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, 15);

  return {
    sampleSize: count,
    avgMs,
    slowestQueries,
    slowestPaths,
  };
}

export function getDashboardCacheStats() {
  const hits = Math.max(0, dashboardPageViews - dashboardCacheMisses);
  const hitRate = dashboardPageViews > 0 ? hits / dashboardPageViews : null;
  return {
    pageViews: dashboardPageViews,
    cacheMisses: dashboardCacheMisses,
    cacheHits: hits,
    hitRate,
  };
}
