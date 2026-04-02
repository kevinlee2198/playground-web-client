# Error Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add error boundaries, environment validation, and resilient auth handling for a dev environment launch on AWS ECS.

**Architecture:** Four new error/not-found pages catch unhandled errors and 404s at the root and locale levels. A Zod v4 env validation module validates all server env vars eagerly at import time (with a `SKIP_ENV_VALIDATION` flag for Docker builds, following the t3-env convention). The root layout's session fetch is wrapped in try-catch to degrade gracefully when Keycloak is down.

**Tech Stack:** Next.js 16 App Router, Zod v4, Better Auth, Tailwind CSS v4, next-intl

**Spec:** `docs/superpowers/specs/2026-03-31-error-handling-design.md`

---

### Task 1: Environment Validation Module

**Files:**
- Create: `src/lib/env.ts`
- Test: `__tests__/lib/env.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/lib/env.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

describe("env validation", () => {
  const VALID_ENV = {
    BETTER_AUTH_SECRET: "test-secret-value",
    BETTER_AUTH_URL: "http://localhost:3000",
    KEYCLOAK_CLIENT_ID: "playground",
    KEYCLOAK_URL: "http://localhost:8080",
    KEYCLOAK_REALM: "playground",
    API_SERVER_URL: "http://localhost:8081",
    NEXT_PUBLIC_API_SERVER_URL: "http://localhost:8081",
  };

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("parses valid environment variables", async () => {
    for (const [key, value] of Object.entries(VALID_ENV)) {
      vi.stubEnv(key, value);
    }
    const { env } = await import("@/lib/env");
    expect(env.BETTER_AUTH_SECRET).toBe("test-secret-value");
    expect(env.API_SERVER_URL).toBe("http://localhost:8081");
  });

  it("throws when a required string env var is empty", async () => {
    for (const [key, value] of Object.entries(VALID_ENV)) {
      vi.stubEnv(key, value);
    }
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    await expect(import("@/lib/env")).rejects.toThrow();
  });

  it("throws when a URL env var is not a valid URL", async () => {
    for (const [key, value] of Object.entries(VALID_ENV)) {
      vi.stubEnv(key, value);
    }
    vi.stubEnv("API_SERVER_URL", "not-a-url");
    await expect(import("@/lib/env")).rejects.toThrow();
  });

  it("skips validation when SKIP_ENV_VALIDATION is set", async () => {
    vi.stubEnv("SKIP_ENV_VALIDATION", "1");
    // Don't stub any other env vars — validation should be skipped entirely
    const { env } = await import("@/lib/env");
    expect(env).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run __tests__/lib/env.test.ts 2>&1 | tee /tmp/env-test-results.txt`
Expected: FAIL — `@/lib/env` does not exist yet.

- [ ] **Step 3: Write the env validation module**

Uses eager module-level validation with a `SKIP_ENV_VALIDATION` escape hatch for Docker builds — the same pattern used by t3-env, the most popular env validation library in the Next.js ecosystem.

```typescript
// src/lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url(),
  KEYCLOAK_CLIENT_ID: z.string().min(1),
  KEYCLOAK_URL: z.url(),
  KEYCLOAK_REALM: z.string().min(1),
  API_SERVER_URL: z.url(),
  // NOTE: NEXT_PUBLIC_ vars are inlined at build time into the client bundle.
  // This validates the server-side runtime value only. For Docker/ECS deployments,
  // ensure NEXT_PUBLIC_ vars are set correctly at build time (Dockerfile/CI).
  NEXT_PUBLIC_API_SERVER_URL: z.url(),
});

type Env = z.infer<typeof envSchema>;

// Skip validation during Docker builds where server-only env vars aren't set.
// Usage: SKIP_ENV_VALIDATION=1 npm run build
export const env: Env = process.env.SKIP_ENV_VALIDATION
  ? (process.env as unknown as Env)
  : envSchema.parse(process.env);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run __tests__/lib/env.test.ts 2>&1 | tee /tmp/env-test-results.txt`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/env.ts __tests__/lib/env.test.ts
git commit -m "feat: add Zod v4 env validation module"
```

---

### Task 2: Migrate Server Files to Use Validated Env

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/lib/graphql-request.ts`
- Modify: `src/components/auth/actions.ts`

Since `env` is a simple module-level export (not a function), this is a straightforward find-and-replace of `process.env.X` with `env.X`. No cascading API changes needed — `keycloakIssuer` stays a constant, `auth` stays a module-level export.

- [ ] **Step 1: Update `src/lib/auth.ts`**

Replace direct `process.env` reads with the validated `env` import. The full file should become:

```typescript
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins";
import { keycloak } from "better-auth/plugins/generic-oauth";
import { env } from "./env";

export const keycloakIssuer = `${env.KEYCLOAK_URL}/realms/${env.KEYCLOAK_REALM}`;

export const auth = betterAuth({
  trustedOrigins: [env.BETTER_AUTH_URL],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 7 * 24 * 60 * 60,
      strategy: "jwe",
      refreshCache: true,
    },
  },
  account: {
    storeStateStrategy: "cookie",
    storeAccountCookie: true,
  },
  plugins: [
    genericOAuth({
      config: [
        keycloak({
          clientId: env.KEYCLOAK_CLIENT_ID,
          clientSecret: "",
          issuer: keycloakIssuer,
          pkce: true,
          scopes: ["openid", "profile", "email"],
        }),
      ],
    }),
    nextCookies(),
  ],
});
```

- [ ] **Step 2: Update `src/lib/graphql-request.ts`**

Add the env import and replace `process.env.API_SERVER_URL`:

```typescript
// At the top, add after existing imports:
import { env } from "./env";

// In buildRequestObject(), replace:
//   const baseUrl = process.env.API_SERVER_URL + GRAPHQL_PATH;
// With:
  const baseUrl = env.API_SERVER_URL + GRAPHQL_PATH;
```

- [ ] **Step 3: Update `src/components/auth/actions.ts`**

Add the env import and replace the two `process.env` reads in `getKeycloakLogoutUrl()`:

```typescript
// At the top, add:
import { env } from "@/lib/env";

// In getKeycloakLogoutUrl(), replace:
//   const clientId = process.env.KEYCLOAK_CLIENT_ID!;
//   const redirectUri = process.env.BETTER_AUTH_URL!;
// With:
  const clientId = env.KEYCLOAK_CLIENT_ID;
  const redirectUri = env.BETTER_AUTH_URL;
```

- [ ] **Step 4: Run lint and type check**

Run: `npm run lint 2>&1 | tee /tmp/lint-results.txt && npx tsc --noEmit 2>&1 | tee /tmp/tsc-results.txt`
Expected: No new errors. The non-null assertions (`!`) and `as string` casts are removed — types are inferred from the Zod schema.

- [ ] **Step 5: Run existing tests to check for regressions**

Run: `npm test -- --run 2>&1 | tee /tmp/test-results.txt`
Expected: All existing tests still pass. Tests that import `auth.ts` or `graphql-request.ts` transitively will trigger `env.ts` evaluation. If env vars are not set in the test runner's shell, these tests will fail with a ZodError. Fix by adding a `vi.stubEnv` setup or by running tests with a `.env.test` file. The `SKIP_ENV_VALIDATION=1` flag also works: `SKIP_ENV_VALIDATION=1 npm test`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/lib/graphql-request.ts src/components/auth/actions.ts
git commit -m "refactor: use validated env module instead of process.env"
```

---

### Task 3: Global Error Boundary

**Files:**
- Create: `src/app/global-error.tsx`

- [ ] **Step 1: Create the global error boundary**

This is the last-resort fallback. It must render its own `<html>` and `<body>` since the root layout is broken. No custom fonts, no theme provider, no i18n. Uses inline styles and a `prefers-color-scheme` media query for basic dark mode.

```tsx
// src/app/global-error.tsx
"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <style>{`
          @media (prefers-color-scheme: dark) {
            body { background-color: #302b22 !important; color: #e5e5e5 !important; }
            button { background-color: #e5e5e5 !important; color: #302b22 !important; }
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
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit 2>&1 | tee /tmp/tsc-results.txt`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/global-error.tsx
git commit -m "feat: add global error boundary"
```

---

### Task 4: Locale Error Boundary

**Files:**
- Create: `src/app/[locale]/error.tsx`

- [ ] **Step 1: Create the locale error boundary**

This renders inside the root layout, so navbar/footer/theme are available. Uses project UI components.

```tsx
// src/app/[locale]/error.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TypographyH1, TypographyMuted } from "@/components/ui/typography";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <TypographyH1 className="mb-4">Something went wrong</TypographyH1>
      <TypographyMuted className="mb-6">
        An unexpected error occurred. Please try again.
      </TypographyMuted>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

Note: Uses `TypographyMuted` instead of `TypographyP` to avoid the default `[&:not(:first-child)]:mt-6` margin from `TypographyP` which would create uneven spacing.

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit 2>&1 | tee /tmp/tsc-results.txt`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/error.tsx"
git commit -m "feat: add locale-level error boundary"
```

---

### Task 5: Root Not Found Page

**Files:**
- Create: `src/app/not-found.tsx`

- [ ] **Step 1: Create the root-level not-found page**

Same constraints as `global-error.tsx` — no locale layout, no next-intl, no custom fonts. Hardcoded English, inline styles with dark mode media query.

```tsx
// src/app/not-found.tsx
export default function RootNotFound() {
  return (
    <html lang="en">
      <head>
        <style>{`
          @media (prefers-color-scheme: dark) {
            body { background-color: #302b22 !important; color: #e5e5e5 !important; }
            a { color: #e5e5e5 !important; border-color: #666 !important; }
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
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          404
        </h1>
        <p style={{ color: "#666", marginBottom: "1.5rem" }}>
          Page not found
        </p>
        <a
          href="/"
          style={{
            padding: "0.5rem 1.5rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            borderRadius: "0.375rem",
            border: "1px solid #ccc",
            textDecoration: "none",
            color: "#1a1a1a",
          }}
        >
          Return Home
        </a>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit 2>&1 | tee /tmp/tsc-results.txt`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/not-found.tsx
git commit -m "feat: add root-level 404 page"
```

---

### Task 6: Locale Not Found Page and Fix Existing Not Found

**Files:**
- Create: `src/app/[locale]/not-found.tsx`
- Modify: `src/app/[locale]/user/[username]/not-found.tsx`

- [ ] **Step 1: Create the locale-level not-found page**

Renders inside the locale layout — has full access to Tailwind, Typography, and i18n navigation. Uses `buttonVariants` on the `Link` directly (not `<Button><Link>` which produces invalid nested `<button><a>` HTML). This matches the established pattern in `src/app/[locale]/page.tsx`.

```tsx
// src/app/[locale]/not-found.tsx
import { buttonVariants } from "@/components/ui/button-variants";
import { TypographyH1, TypographyMuted } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export default function LocaleNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <TypographyH1 className="mb-4">404</TypographyH1>
      <TypographyMuted className="mb-6">
        Page not found
      </TypographyMuted>
      <Link href="/" className={cn(buttonVariants())}>
        Return Home
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite existing `user/[username]/not-found.tsx`**

The existing file has two issues: `Link` imported from `next/link` (should be `@/i18n/navigation`) and `<Button><Link>` nesting (invalid HTML). Rewrite the full file to match the new pattern:

```tsx
// src/app/[locale]/user/[username]/not-found.tsx
import { buttonVariants } from "@/components/ui/button-variants";
import { TypographyH1, TypographyMuted } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export default function UserNotFound() {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <TypographyH1 className="mb-4">404</TypographyH1>
      <TypographyMuted className="mb-6">User not found</TypographyMuted>
      <Link href="/" className={cn(buttonVariants())}>
        Return Home
      </Link>
    </main>
  );
}
```

- [ ] **Step 3: Verify both files compile**

Run: `npx tsc --noEmit 2>&1 | tee /tmp/tsc-results.txt`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/not-found.tsx" "src/app/[locale]/user/[username]/not-found.tsx"
git commit -m "feat: add locale-level 404 page and fix user not-found invalid HTML"
```

---

### Task 7: Resilient Root Layout Session Fetch

**Files:**
- Modify: `src/app/[locale]/layout.tsx`

- [ ] **Step 1: Wrap getSession in try-catch**

In `src/app/[locale]/layout.tsx`, replace:

```typescript
  const session = await auth.api.getSession({ headers: hdrs });
  const isAuthenticated = !!session?.user;
```

With:

```typescript
  let session = null;
  try {
    session = await auth.api.getSession({ headers: hdrs });
  } catch (error) {
    console.error("[layout] Session fetch failed:", error);
  }
  const isAuthenticated = !!session?.user;
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit 2>&1 | tee /tmp/tsc-results.txt`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/layout.tsx"
git commit -m "fix: gracefully handle auth session failure in root layout"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Run all unit tests**

Run: `npm test -- --run 2>&1 | tee /tmp/final-test-results.txt`
Expected: All tests pass.

- [ ] **Step 2: Run lint**

Run: `npm run lint 2>&1 | tee /tmp/final-lint-results.txt`
Expected: No errors.

- [ ] **Step 3: Run build**

Run: `npm run build 2>&1 | tee /tmp/final-build-results.txt`
Expected: Build succeeds with env vars loaded from `.env.local`. For Docker/CI builds where server-only env vars aren't available, use: `SKIP_ENV_VALIDATION=1 npm run build`. Note that `betterAuth()` in `auth.ts` also reads env vars at module level (this is a pre-existing constraint, not introduced by our changes) — Docker builds will still need placeholder env vars for Better Auth regardless of env validation. See [better-auth/better-auth#3953](https://github.com/better-auth/better-auth/issues/3953).

- [ ] **Step 4: Manual smoke test (if dev server is available)**

1. Visit `http://localhost:3000/en` — should load normally
2. Visit `http://localhost:3000/xyz/anything` — should show root 404 page (system fonts, minimal styling)
3. Visit `http://localhost:3000/en/nonexistent-page` — should show locale 404 page with navbar/footer
4. Check browser console for any errors
