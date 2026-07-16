import { PrismaClient } from "@prisma/client";
import { recordQuery } from "@/lib/perf-metrics";

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Query-timing instrumentation for /settings/performance. Guarded so it
  // never affects non-Next.js usage of this module (prisma/seed.ts,
  // bootstrap-admin.ts run via plain `tsx`, outside any Next.js request).
  return client.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        const start = performance.now();
        const result = await query(args);
        try {
          const { headers } = await import("next/headers");
          const path = (await headers()).get("x-pathname") ?? "unknown";
          recordQuery({
            model: model ?? "raw",
            action: operation,
            durationMs: performance.now() - start,
            path,
            timestamp: Date.now(),
          });
        } catch {
          // Not inside a Next.js request context (seed/migration scripts,
          // build-time static generation) -- nothing to attribute this to.
        }
        return result;
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
