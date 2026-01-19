# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server at localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
```

No test runner is currently configured.

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

- `src/app/[lang]/` - Dynamic language routing (i18n). All pages are nested under a `[lang]` segment.
- `src/components/ui/` - shadcn/ui components (new-york style with Lucide icons)
- `src/components/playground/` - App-specific components (navbar, footer)
- `src/components/auth/` - Authentication UI components
- `src/lib/` - Utilities, auth config, GraphQL client, i18n helpers
- `src/dictionaries/` - i18n JSON dictionary files (currently English only)

### Key Patterns

**Server vs Client Components**: Server components are the default. Client components are marked with `"use client"` and used for interactive elements (auth buttons, forms).

**Authentication**: Better Auth with Keycloak OAuth (PKCE flow, stateless/database-less). Session stored in JWE cookies.

- Server-side: `auth.api.getSession({ headers: await headers() })`
- Client-side: `useSession()` hook from `@/lib/auth-client`

**GraphQL Client** (`src/lib/graphql-request.ts`):

- `query(q)` / `mutate(m)` - Unauthenticated requests
- `authQuery(q)` / `authMutate(m)` - Automatically injects Bearer token from session
- Uses `json-to-graphql-query` to build queries from objects
- Error format follows Netflix DGS specification
- Queries are sent to a spring-boot graphql server

**i18n** (`src/lib/i18n/`): Type-safe translation with dot-notation paths (e.g., `t("footer.company.about")`). Dictionary loaded server-side, provided via `LocaleProvider` context.

**Styling**: Tailwind CSS v4 with CSS variables. Use `cn()` utility from `@/lib/utils` to merge class names.

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

Components are configured with RSC support, new-york style, and Lucide icons.
