"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Catches any error thrown while rendering a route inside the root layout
// (page components, nested layouts, server actions surfaced during render)
// that isn't already handled closer to its source, so a single failing
// page shows a recoverable message instead of Next's raw crash screen.
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          We hit an unexpected error loading this page. This has been logged
          — please try again, or contact an admin if it keeps happening.
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground">Digest: {error.digest}</p>
        ) : null}
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
