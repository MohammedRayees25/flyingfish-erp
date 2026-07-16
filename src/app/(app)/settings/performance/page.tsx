import type { Metadata } from "next";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getQueryStats, getDashboardCacheStats } from "@/lib/perf-metrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Performance" };

type TableSizeRow = {
  table_name: string;
  total_bytes: bigint;
  total_size: string;
  row_estimate: bigint;
};

type PgStatStatementsRow = {
  query: string;
  calls: bigint;
  mean_exec_time: number;
  total_exec_time: number;
};

function formatMs(ms: number): string {
  if (ms < 1) return "<1 ms";
  if (ms < 1000) return `${ms.toFixed(1)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export default async function PerformancePage() {
  await requireModuleAccess("settings");

  const [dbSizeRows, tableSizeRows, extensionRows] = await Promise.all([
    prisma.$queryRaw<{ pretty: string; bytes: bigint }[]>`
      SELECT pg_size_pretty(pg_database_size(current_database())) AS pretty,
             pg_database_size(current_database()) AS bytes
    `,
    prisma.$queryRaw<TableSizeRow[]>`
      SELECT relname AS table_name,
             pg_total_relation_size(relid) AS total_bytes,
             pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
             n_live_tup AS row_estimate
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 10
    `,
    prisma.$queryRaw<{ extname: string }[]>`
      SELECT extname FROM pg_extension WHERE extname = 'pg_stat_statements'
    `,
  ]);

  const dbSize = dbSizeRows[0];
  const pgStatStatementsEnabled = extensionRows.length > 0;

  let slowestSqlQueries: PgStatStatementsRow[] = [];
  if (pgStatStatementsEnabled) {
    slowestSqlQueries = await prisma.$queryRaw<PgStatStatementsRow[]>`
      SELECT query, calls, mean_exec_time, total_exec_time
      FROM pg_stat_statements
      WHERE query NOT ILIKE '%pg_stat_statements%'
      ORDER BY mean_exec_time DESC
      LIMIT 10
    `;
  }

  const queryStats = getQueryStats();
  const cacheStats = getDashboardCacheStats();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Performance</h1>
        <p className="text-sm text-muted-foreground">
          Live database and application metrics. Query-level stats are collected in memory
          since this server process started, and reset on redeploy.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Database size</p>
            <p className="text-2xl font-semibold">{dbSize?.pretty ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Prisma queries sampled</p>
            <p className="text-2xl font-semibold">{queryStats.sampleSize}</p>
            <p className="text-xs text-muted-foreground">last {queryStats.sampleSize} queries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Avg query time</p>
            <p className="text-2xl font-semibold">{formatMs(queryStats.avgMs)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Dashboard cache hit rate</p>
            <p className="text-2xl font-semibold">
              {cacheStats.hitRate === null ? "—" : `${(cacheStats.hitRate * 100).toFixed(0)}%`}
            </p>
            <p className="text-xs text-muted-foreground">
              {cacheStats.cacheHits} hit / {cacheStats.cacheMisses} miss of {cacheStats.pageViews}{" "}
              views (45s TTL)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Largest tables</CardTitle>
            <CardDescription>By total size on disk, including indexes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead className="text-right">Rows (est.)</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableSizeRows.map((t) => (
                    <TableRow key={t.table_name}>
                      <TableCell className="font-medium">{t.table_name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(t.row_estimate).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{t.total_size}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Query count by page</CardTitle>
            <CardDescription>
              Total Prisma query time attributed to each route, from the in-memory sample
            </CardDescription>
          </CardHeader>
          <CardContent>
            {queryStats.slowestPaths.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No queries recorded yet in this process.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page</TableHead>
                      <TableHead className="text-right">Queries</TableHead>
                      <TableHead className="text-right">Total time</TableHead>
                      <TableHead className="text-right">Avg</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queryStats.slowestPaths.map((p) => (
                      <TableRow key={p.path}>
                        <TableCell className="font-medium">{p.path}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.queryCount}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMs(p.totalMs)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMs(p.avgMs)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Slowest Prisma queries</CardTitle>
          <CardDescription>Individually, from the in-memory sample</CardDescription>
        </CardHeader>
        <CardContent>
          {queryStats.slowestQueries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No queries recorded yet in this process.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Page</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queryStats.slowestQueries.map((q, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{q.model}</TableCell>
                      <TableCell className="text-muted-foreground">{q.action}</TableCell>
                      <TableCell className="text-muted-foreground">{q.path}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMs(q.durationMs)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Slowest SQL statements (pg_stat_statements)
            {pgStatStatementsEnabled ? (
              <Badge variant="success">Enabled</Badge>
            ) : (
              <Badge variant="outline">Not enabled</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {pgStatStatementsEnabled
              ? "Aggregated across all connections since the extension was last reset."
              : "Enable the pg_stat_statements extension on this Postgres database (Supabase: Database → Extensions) to see aggregate SQL-level timing here."}
          </CardDescription>
        </CardHeader>
        {pgStatStatementsEnabled ? (
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Avg time</TableHead>
                    <TableHead className="text-right">Total time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slowestSqlQueries.map((q, i) => (
                    <TableRow key={i}>
                      <TableCell className="max-w-md truncate font-mono text-xs" title={q.query}>
                        {q.query}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(q.calls).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMs(q.mean_exec_time)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMs(q.total_exec_time)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}
