# Error Handling for Dev Environment Launch

## Context

The app is launching on a dev environment hosted on AWS (ECS/EC2 with Docker). The Next.js standalone build runs in a container, with stdout/stderr piped to CloudWatch.

The app already has solid error handling foundations:
- Typed GraphQL errors with `ErrorType` enum and `MutationResult<T>` pattern
- Consistent try-catch in all server actions returning `{ success, errorType, message }`
- Sonner toast notifications for user-facing error feedback
- `console.error` throughout catch blocks (captured by CloudWatch via stdout)

What's missing: error boundaries, env validation, and a global 404 page.

## Decisions

- **No structured logging library** (pino, winston, etc.) — keep `console.error` for now. CloudWatch captures stdout, and during dev the primary user is the developer looking at logs directly.
- **No client-side error reporting** — no `/api/log` endpoint. In dev, browser console is sufficient.
- **No Sentry yet** — add it when going to production (~15 min setup with `npx @sentry/wizard@latest -i nextjs`). Sentry replaces the need for structured logging for error tracking.

## 1. Error Boundaries

### 1a. Global Error Boundary — `src/app/global-error.tsx`

Catches errors thrown in the root layout (`src/app/[locale]/layout.tsx`). This is the last-resort fallback when the entire shell (navbar, footer, providers) is broken.

- Must be a `"use client"` component
- Must render its own `<html>` and `<body>` tags (the root layout is broken at this point)
- Receives `error` and `reset` props
- Shows a minimal "Something went wrong" page with a retry button
- Logs the error with `console.error` so it reaches CloudWatch
- Will render without custom fonts (Nunito/Quicksand), theme provider, or i18n — use system fonts and hardcoded English text. Use `prefers-color-scheme` media query for basic dark mode support.

### 1b. Locale Error Boundary — `src/app/[locale]/error.tsx`

Catches errors from any page nested under the locale layout. The root layout (navbar, footer, Toaster) remains intact, so the user still has navigation.

- `"use client"` component
- Receives `error` and `reset` props
- Shows a friendly error message with a "Try again" button that calls `reset()`
- Logs the error with `console.error`
- Styled consistently with the app (can use Tailwind, Typography components, etc.)

### 1c. Root Not Found — `src/app/not-found.tsx`

Catches `notFound()` thrown from the `[locale]/layout.tsx` itself (e.g., invalid locale) and any request that doesn't match the `[locale]` segment at all. Without this, invalid-locale URLs like `/xyz/some-page` get the default unstyled Next.js 404.

- Server component
- No access to next-intl providers, so use hardcoded English text
- Minimal styling (system fonts, Tailwind classes only)
- Shows a "Page not found" message with a link back to `/`

### 1d. Locale Not Found — `src/app/[locale]/not-found.tsx`

Catch-all 404 page for any unmatched route under a valid locale. Has full access to the locale layout (navbar, footer, i18n).

- Server component
- Shows a "Page not found" message with a link back to home
- Use `Link` from `@/i18n/navigation` (not `next/link` — the existing `user/[username]/not-found.tsx` has this wrong and should be fixed)
- Styled consistently with the app

### 1e. Resilient Root Layout Session Fetch

The root layout at `src/app/[locale]/layout.tsx` calls `auth.api.getSession()` without error handling. If Keycloak is down, this crashes the entire layout into `global-error.tsx` (minimal, unstyled) rather than gracefully degrading.

Wrap the session fetch in try-catch so Keycloak outages degrade to unauthenticated mode instead of a full-page crash:

```typescript
let session = null;
try {
  session = await auth.api.getSession({ headers: hdrs });
} catch (error) {
  console.error("[layout] Session fetch failed:", error);
}
```

## 2. Environment Validation

### `src/lib/env.ts`

A Zod v4 schema that validates all required environment variables at import time. If any are missing or invalid, the process throws a clear error listing every problem — failing fast at startup instead of deep in a request.

**Server-only variables:**
- `BETTER_AUTH_SECRET` — `z.string().min(1)`
- `BETTER_AUTH_URL` — `z.url()`
- `KEYCLOAK_CLIENT_ID` — `z.string().min(1)`
- `KEYCLOAK_URL` — `z.url()`
- `KEYCLOAK_REALM` — `z.string().min(1)`
- `API_SERVER_URL` — `z.url()`

**Public variables (validated server-side only):**
- `NEXT_PUBLIC_API_SERVER_URL` — `z.url()`

**Zod v4 note:** Use `z.url()` (top-level), not `z.string().url()` which is deprecated in Zod v4. `z.url()` is a subclass of `ZodString` and returns a string.

**Usage:** Server-side files that currently read `process.env` directly (`auth.ts`, `graphql-request.ts`, `auth/actions.ts`) import the validated `env` object instead. This provides type safety and a single source of truth.

**Important: `graphql-ws-client.ts` must NOT import `env.ts`.** That file is `"use client"` — importing `env.ts` would fail because server-only env vars like `BETTER_AUTH_SECRET` don't exist in the browser. It should continue reading `process.env.NEXT_PUBLIC_API_SERVER_URL` directly (inlined at build time by Next.js).

**Note on `NEXT_PUBLIC_` variables and Docker:** `NEXT_PUBLIC_` vars are inlined at *build* time into the client bundle. The `env.ts` validation runs at server *runtime* and validates the runtime value, which may differ from the build-time value baked into client code. For Docker/ECS deployments, ensure `NEXT_PUBLIC_` vars are set correctly at build time (in the Dockerfile or CI), not just at runtime. A comment in the schema should note this.

## 3. Future: Sentry (Production)

Not part of this implementation. Documented here for reference.

When ready for production, run:
```bash
npx @sentry/wizard@latest -i nextjs
```

This generates `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, and `instrumentation.ts`. It wraps `next.config.ts` with `withSentryConfig()`. Add `SENTRY_DSN` and `SENTRY_AUTH_TOKEN` env vars (and add them to the Zod schema in `env.ts`).

Sentry automatically captures unhandled errors from both error boundaries and server-side code, with source maps, user context, and error grouping.

## Known Limitations

- **Generic error messages on backend outage:** `graphql-request.ts`'s `fetchData` function has no error handling for network failures or non-JSON responses. When the backend is down, pages crash to the error boundary with a generic "Something went wrong" rather than "Service unavailable." The error boundaries catch the crash (good), but the messaging is not specific. This is acceptable for dev launch — Sentry will provide better error context in production.

- **Suspense + error boundary interaction:** Pages using `<Suspense>` (e.g., game history on user profiles) will replace the *entire page* with the error boundary UI if a suspended component throws, even if the rest of the page rendered successfully. Localized error boundaries around Suspense sections would provide better UX but are out of scope for this initial work.

## Files to Create

| File | Type | Purpose |
|------|------|---------|
| `src/app/global-error.tsx` | Client Component | Last-resort error boundary |
| `src/app/not-found.tsx` | Server Component | Root-level 404 (invalid locale, unmatched routes) |
| `src/app/[locale]/error.tsx` | Client Component | Locale-level error boundary |
| `src/app/[locale]/not-found.tsx` | Server Component | Locale-level 404 page |
| `src/lib/env.ts` | Server module | Zod env validation |

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/auth.ts` | Import env from `env.ts` instead of `process.env` |
| `src/lib/graphql-request.ts` | Import env from `env.ts` instead of `process.env` |
| `src/components/auth/actions.ts` | Import env from `env.ts` instead of `process.env` for `KEYCLOAK_CLIENT_ID` and `BETTER_AUTH_URL` |
| `src/app/[locale]/layout.tsx` | Wrap `auth.api.getSession()` in try-catch to degrade gracefully |
| `src/app/[locale]/user/[username]/not-found.tsx` | Fix `Link` import from `next/link` to `@/i18n/navigation` |
