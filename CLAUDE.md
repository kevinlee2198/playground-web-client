# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server at localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
```

Tests use Vitest with `@testing-library/react` and jsdom. Avoid installing additional test packages — use what's already available (e.g., `fireEvent` from `@testing-library/react` instead of `@testing-library/user-event`).

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
2. **design** (opus) - Principal engineer that creates implementation design from requirements
3. **implementation** (sonnet) - Frontend engineer that implements the design
4. **qa** (sonnet) - Verifies implementation matches requirements, runs build/lint
5. **code-reviewer** (haiku) - Reviews code quality and security
6. **debugger** (opus) - Troubleshoots issues when they arise

**Specifications directory:** `.claudedoc/<feature-name>/`

- `requirements.md` - Functional requirements from requirements agent
- `design.md` - Technical design from design agent
- `qa-report.md` - Verification report from QA agent

**Usage:**

```
# Start with requirements gathering
/requirements

# Then design
/design

# Implement
/implementation

# Verify
/qa

# Review code
/code-reviewer
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

**Forms**: We use TansTack forms as the form control in this project. Forms should be validated with Zod v4 (not v3 — e.g., `z.number()` does not accept `invalid_type_error`; use `{ error: "..." }` or `{ message: "..." }` instead).

**Styling**: Tailwind CSS v4 with CSS variables. Use `cn()` utility from `@/lib/utils` to merge class names. Use the Typography from `src/components/ui/typography`. All text should be wrapped in a `src/components/ui/typography.ts` component

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
- `NEXT_PUBLIC_SERVER_URL` - GraphQL backend endpoint

## Adding shadcn/ui Components

```bash
npx shadcn@latest add <component-name>
```

Components are configured with RSC support, default style, and Lucide icons. Components are built on top of BaseUI
