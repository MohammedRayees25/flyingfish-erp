"use client";

import { useEffect } from "react";
import "./globals.css";

// Last-resort boundary: catches errors thrown by the root layout itself
// (e.g. a broken font/provider) that error.tsx can't catch, since error.tsx
// renders *inside* the root layout. Must render its own <html>/<body> — the
// root layout is what failed, so it isn't available here.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100svh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
            Flying Fish ERP is temporarily unavailable
          </h1>
          <p style={{ maxWidth: "24rem", color: "#666", fontSize: "0.875rem" }}>
            We hit an unexpected error starting the application. This has
            been logged — please try again shortly.
          </p>
          {error.digest ? (
            <p style={{ fontSize: "0.75rem", color: "#999" }}>
              Digest: {error.digest}
            </p>
          ) : null}
        </div>
        <button
          onClick={reset}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            background: "#0f172a",
            color: "#fff",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
