# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server at localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
npm test         # Run Vitest tests
npx playwright test                        # Run all Playwright integration tests
npx playwright test tests/pages/about.spec.ts  # Run a single spec file
```

**Important**: Always capture test output to a file (e.g., `2>&1 | tee /tmp/pw-results.txt`), then read the file for analysis. Never re-run tests just to grep for a different part of the output — tests are expensive.

### Unit Tests (Vitest)

Tests use Vitest with `@testing-library/react` and jsdom. Avoid installing additional test packages — use what's already available (e.g., `fireEvent` from `@testing-library/react` instead of `@testing-library/user-event`). Test files live in `__tests__/` and use `.test.ts(x)`.

### Integration Tests (Playwright)

End-to-end tests use Playwright with Next.js experimental `testProxy` mode (`next/experimental/testmode/playwright/msw`). No real backend needed — MSW intercepts server-side `fetch()` calls via a proxy.

- **Config**: `playwright.config.ts` — imports `defineConfig` from `next/experimental/testmode/playwright`
- **Test files**: `tests/**/*.spec.ts`
- **Fixtures**: `tests/fixtures/` — auth cookie forging, MSW GraphQL handlers, mock data factories
- **Auth mocking**: Forges real Better Auth JWE cookies so server components authenticate correctly
- **MSW handlers**: `tests/fixtures/graphql-handlers.ts` routes GraphQL operations by field name to mock responses
- **`withMeGuard()`**: Helper for per-test MSW overrides that preserve the `me` query routing

**How testProxy works**: When a test runs, the Playwright fixture injects `Next-Test-Proxy-Port` headers into browser requests. Next.js sees these headers and routes its server-side fetches through a proxy where MSW intercepts them.

**Critical limitation**: The proxy only intercepts fetches for requests with the test header. Playwright's `webServer.url` health check does NOT go through the proxy. If the health check URL hits a page that makes server-side fetches to an unavailable backend, it returns 500 and Playwright times out (it requires 2xx/3xx/400-403). The `webServer.url` must point to an endpoint that responds without a backend (e.g., `/api/health`).

### Debugging with playwright-cli

Use `npx @playwright/cli` to interactively control a browser for debugging test failures or inspecting page state. No global install needed.

```bash
# Open a page and inspect it
npx @playwright/cli open http://localhost:3000/en
npx @playwright/cli snapshot                    # accessibility tree with element refs
npx @playwright/cli click e15                   # click element by ref from snapshot
npx @playwright/cli console                     # view console errors
npx @playwright/cli network                     # view network requests
npx @playwright/cli eval "document.title"       # run JS in page context
npx @playwright/cli screenshot --filename=debug.png
npx @playwright/cli close
```

This is invaluable for debugging why a test assertion fails — take a snapshot to see the actual DOM/accessibility tree, check console for errors, inspect network requests, etc. Much faster than re-running tests with different assertions.

## Spec-Driven Development

For multi-step features, use Plan Mode to create specifications before implementation:

1. Start with `claude --permission-mode plan` or press `Shift+Tab` to enter plan mode
2. Ask Claude to interview you about requirements (e.g., "Interview me about this feature before starting")
3. Review and approve the implementation plan
4. Claude executes the approved plan

For complex features, use `claude --model opusplan` for stronger reasoning during planning.

### Agent-Based Workflow

This project uses specialized subagents for structured feature development. Agents are defined in `.claude/agents/`.

**Workflow order:**

1. **requirements** (opus) - Product manager that interviews you about the feature and writes requirements
2. **/web-design-guidelines** - Review requirements against Web Interface Guidelines for accessibility, touch, animation, and copy compliance. Fix issues before design begins
3. **design** (opus) - Principal engineer that creates implementation design from requirements
4. **adversarial-reviewer** (opus) - Antagonistic review of the design to find flaws, race conditions, and edge cases. Update the design with fixes before implementation
5. **implementation** (sonnet) - Frontend engineer that implements the design
6. **qa** (sonnet) - Verifies implementation matches requirements, runs build/lint
7. **debugger** (opus) - Troubleshoots issues when they arise

For code review, use the plugin agents: `pr-review-toolkit:code-reviewer`, `pr-review-toolkit:code-simplifier`, etc.

**Required skills for implementation and review:**

- **/vercel-react-best-practices** — Must be invoked before writing or reviewing React/Next.js code. Covers server/client boundaries, parallel data fetching, serialization, stable callbacks, input validation in server actions, and performance patterns.
- **/web-design-guidelines** — Must be invoked when writing or reviewing UI components. Covers accessibility (ARIA, keyboard, focus, semantics), heading hierarchy, form patterns, animation (`prefers-reduced-motion`), and typography.

Implementation subagents should load these skills before starting work. Review subagents should use them as part of their review criteria.

**Specifications directory:** `.claudedoc/<feature-name>/`

- `requirements.md` - Functional requirements from requirements agent
- `design.md` - Technical design from design agent
- `qa-report.md` - Verification report from QA agent

**Usage:**

```
# Start with requirements gathering
/requirements

# Review requirements against web interface guidelines
/web-design-guidelines

# Then design
/design

# Implement
/implementation

# Verify
/qa

# Code review uses plugin agents (pr-review-toolkit)
```

## Architecture

This is a Next.js 16 application using the App Router with TypeScript strict mode.

### Directory Structure

- `src/app/[locale]/` - Dynamic language routing (i18n). All pages are nested under a `[locale]` segment.
- `src/components/ui/` - shadcn/ui components (default style with Lucide icons)
- `src/components/playground/` - App-specific components (navbar, footer)
- `src/components/auth/` - Authentication UI components
- `src/lib/` - Utilities, auth config, GraphQL client, i18n helpers
- `messages/{locale}.json` - i18n JSON dictionary files (currently English only)

**File Conventions**
Always use these file names in the `app/` directory:

- `page.tsx` - Route page component
- `layout.tsx` - Shared layout wrapper
- `loading.tsx` - Loading UI (Suspense fallback)
- `error.tsx` - Error boundary (must be Client Component)
- `not-found.tsx` - 404 page
- `route.ts` - API route handler
- `template.tsx` - Re-rendered layout
- `default.tsx` - Parallel route fallback

### Key Patterns

**Server vs Client Components**:

- Default to Server Components - Only use Client Components when you need interactivity
- Client components are marked with `"use client"` and used for interactive elements (auth buttons, forms).
- Zero client-side JavaScript for static content
- Async components are supported and encouraged

**Authentication**: Better Auth with Keycloak OAuth (PKCE flow, stateless/database-less). Session stored in JWE cookies.

- Server-side: `auth.api.getSession({ headers: await headers() })`
- Client-side: `useSession()` hook from `@/lib/auth-client`

**GraphQL Client** (`src/lib/graphql-request.ts`):

- `query(q)` / `mutate(m)` - Unauthenticated requests
- `authQuery(q)` / `authMutate(m)` - Automatically injects Bearer token from session
- If authenticated - use the auth versions
- Uses `json-to-graphql-query` to build queries from objects. Do not use plain strings
- Error format follows Netflix DGS specification
- Queries are sent to a spring-boot graphql server

**i18n** (`src/i18n/`): Type-safe translation with dot-notation paths (e.g., `t("footer.company.about")`). Uses the `next-intl` library.

**Routing**: next-intl wraps around these NextJS components for routing. Use these instead of the built-in NextJS ones: `Link, redirect, usePathname, useRouter, getPathname` should all be imported from `"@/i18n/navigation"`

**Forms**: We use TanStack Form as the form control in this project. Forms should be validated with Zod v4 (not v3 — e.g., `z.number()` does not accept `invalid_type_error`; use `{ error: "..." }` or `{ message: "..." }` instead).

**Styling**: Tailwind CSS v4 with CSS variables. Use `cn()` utility from `@/lib/utils` to merge class names. Use the Typography from `src/components/ui/typography`. All text should be wrapped in a `src/components/ui/typography.tsx` component

### TypeScript Type Conventions

**Response types** (data from the server): fields are always present but may be null. Use `field: T | null` for nullable schema fields, never `field?: T | null`.

**Input types**: use `field?: T` for optional fields that can be omitted.

**Update/patch inputs**: the GraphQL backend uses PATCH semantics for all update mutations unless otherwise specified. This means three states are possible for nullable fields:

- `undefined` (omit the field) — leave unchanged
- `null` — clear the value in the database
- A value — update to that value

Model these as `field?: T | null`. For non-nullable schema fields on update inputs (e.g., `firstName` on a player), null is not allowed — use `field?: T`.

**No barrel files**: import directly from source files, not from `index.ts` re-exports.

### Path Aliases

`@/*` maps to `./src/*` (e.g., `import { Button } from "@/components/ui/button"`)

## Environment Variables

Required variables (see `env.example`):

- `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` - Auth configuration
- `KEYCLOAK_CLIENT_ID` / `KEYCLOAK_URL` / `KEYCLOAK_REALM` - OAuth provider
- `NEXT_PUBLIC_API_SERVER_URL` - GraphQL backend endpoint (also used for WebSocket subscriptions)

## Adding shadcn/ui Components

```bash
npx shadcn@latest add <component-name>
```

Components are configured with RSC support, default style, and Lucide icons. Components are built on top of BaseUI
