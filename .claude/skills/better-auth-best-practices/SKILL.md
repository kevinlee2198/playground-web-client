---
name: better-auth-best-practices
description: How Better Auth is configured and used in this project. Use when working on authentication, sessions, OAuth, sign-in/sign-out, or any auth-related code. Also trigger when you see imports from "better-auth" or changes to auth.ts / auth-client.ts.
---

# Better Auth in This Project

This project uses Better Auth with Keycloak OAuth in a **stateless, database-less** configuration. Sessions live entirely in encrypted cookies (JWE) — there is no session database table.

## Looking Up Better Auth Documentation

Use the `mcp__better-auth__search-better-auth-docs` or `mcp__better-auth__ask-question-about-better-auth` tools for API reference and usage questions. For the latest code examples, use the `context7` MCP to resolve and query Better Auth docs. Do not rely on memorized API signatures — always verify against current docs.

## Project Auth Architecture

**Server config** (`src/lib/auth.ts`):
- Keycloak via `genericOAuth` plugin with PKCE (public client, no client secret)
- JWE cookie cache for stateless sessions (no database)
- `storeAccountCookie: true` for database-less OAuth flows
- `nextCookies()` plugin — must be last in the plugins array

**Client config** (`src/lib/auth-client.ts`):
- `genericOAuthClient()` + `nextCookies()` plugins
- Exports: `signIn`, `signUp`, `signOut`, `useSession`

## Auth Patterns

**Server-side session access:**
```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const session = await auth.api.getSession({ headers: await headers() });
```

**Client-side session access:**
```typescript
import { useSession } from "@/lib/auth-client";

const { data: session } = useSession();
```

**Getting the OAuth access token** (for forwarding to backend APIs):
```typescript
const tokenResponse = await auth.api.getAccessToken({
  headers: await headers(),
  body: { providerId: "keycloak" },
});
const accessToken = tokenResponse?.accessToken;
```

This pattern is used in `src/lib/graphql-request.ts` to attach Bearer tokens to GraphQL requests via `authQuery` / `authMutate`.

## Key Constraints

- No database — don't use features that require database persistence (e.g., `emailAndPassword`, database-backed sessions, user management tables)
- Cookie-only sessions — session data is limited to what fits in a JWE cookie
- Keycloak is the sole identity provider — user management happens in Keycloak, not in the app
- `nextCookies()` must always be the last plugin in both server and client plugin arrays
