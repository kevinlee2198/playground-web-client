"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props): ReactNode {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en" style={{ colorScheme: "light dark" }}>
      <head>
        <style>{`
          button:focus-visible { outline: 2px solid #1a1a1a; outline-offset: 2px; }
          @media (prefers-color-scheme: dark) {
            body { background-color: #302b22 !important; color: #e5e5e5 !important; }
            button { background-color: #e5e5e5 !important; color: #302b22 !important; }
            p { color: #a3a3a3 !important; }
            button:focus-visible { outline-color: #e5e5e5; }
          }
        `}</style>
      </head>
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          margin: 0,
          backgroundColor: "#faf3e6",
          color: "#1a1a1a",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Something went wrong
        </h1>
        <p style={{ color: "#666", marginBottom: "1.5rem" }}>
          An unexpected error occurred. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "0.5rem 1.5rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            borderRadius: "0.375rem",
            border: "none",
            cursor: "pointer",
            backgroundColor: "#1a1a1a",
            color: "#fff",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
