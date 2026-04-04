# Design: Stale Session Detection and Recovery

## Problem

When a user's Keycloak tokens expire (e.g., after closing the browser tab for longer than the refresh token idle timeout), the Better Auth cookie cache (`session_data`) still considers the session valid. This creates a "half-authenticated" state where:

- `getSession()` returns a valid session (user appears logged in)
- `getAccessToken()` fails silently (refresh token is expired)
- All authenticated GraphQL requests fail with `UNAUTHENTICATED`
- The avatar shows an infinite skeleton, logout doesn't work, and there's no feedback to the user

This is a known upstream issue: [better-auth/better-auth#8574](https://github.com/better-auth/better-auth/issues/8574).

## Goals

1. Detect when the session is stale (cookie cache valid but tokens unrefreshable)
2. Clear stale cookies so the next request sees an unauthenticated state
3. Recover the UI client-side — sign the user out and show the logged-out state
4. Handle backend `UNAUTHORIZED` errors (token revoked, clock skew)
5. Distinguish transient errors (backend/Keycloak down) from true stale sessions
6. Minimize latency impact — no expensive token validation on every request

## Non-Goals

- Proactive session expiry warnings (countdown modals before timeout)
- Aligning cookie TTL precisely with Keycloak token TTL (requires Keycloak config coordination)
- Fixing the upstream Better Auth bug
- Adding proxy/middleware-level auth checks (the stale cookie IS present, so existence checks don't help; full JWE decryption in the proxy is too expensive and not a security boundary per CVE-2025-29927)

## Research Summary

| Source | Key Recommendation |
|---|---|
| Better Auth [#8574](https://github.com/better-auth/better-auth/issues/8574) | Known bug: `session_data` and `account_data` cookies have independent lifetimes; no upstream fix yet |
| Better Auth docs | `cookieCache.maxAge` default is 5 min; 7 days is far too long |
| NextAuth/Auth.js | Error-forwarding pattern: set `session.error = "RefreshAccessTokenError"`, client detects and forces re-auth |
| Next.js docs | Proxy should only do lightweight cookie-existence checks; full validation belongs in the DAL; don't rely on middleware as a security boundary |
| Industry consensus (Auth0, OWASP) | Hybrid: proactive check to shrink the window + reactive 401/UNAUTHENTICATED handling as fallback |
| Keycloak defaults | Access token: 5 min, SSO Session Idle: 30 min, SSO Session Max: 10 hours |

## Key Architectural Decisions

### AD-1: `getAuthHeaders()` stays a pure data function — no `redirect()`, no `signOut()`

The v1 design proposed `redirect()` inside `getAuthHeaders()`. The v2 design proposed `signOut()`. Both are wrong:

1. **`redirect()` is swallowed by try-catch** in 56+ server action call sites.
2. **`signOut()` silently fails in Server Components.** In Next.js, `cookies().set()` throws `ReadonlyRequestCookiesError` during Server Component rendering — cookies are read-only outside Server Actions and Route Handlers. Better Auth's `nextCookies()` plugin catches this error silently. So `signOut()` in `getAuthHeaders()` does nothing during SSR page loads.
3. **No sign-in page exists.** Auth goes through Keycloak OAuth directly.
4. **Public pages use `authQuery()` opportunistically.** A stale session should degrade gracefully, not bounce the user.

**Decision:** `getAuthHeaders()` returns `{}` when tokens can't be obtained. No side effects. Cookie clearing happens exclusively in Server Actions (where `cookies().set()` works), triggered by the auth-button.

### AD-2: The auth-button is THE recovery mechanism

`AuthButton` renders on every page (via the navbar). It calls `fetchCurrentUser()` — a Server Action — on mount. This is the only reliable place to both detect and fix a stale session because:

1. Server Actions CAN write cookies (`signOut()` works — `requestStore.phase === 'action'`)
2. It runs on every page via the navbar
3. It has access to client-side `signOut()` to sync React state
4. It has access to `useSession()` for reactive UI updates

This follows the NextAuth pattern: the server detects the problem, the client reacts to it.

**Important nuance:** Server-side `auth.api.signOut()` clears cookies but does NOT trigger client-side `useSession()` updates ([better-auth/better-auth#3608](https://github.com/better-auth/better-auth/issues/3608)). The server action bypasses the client proxy and its nanostore signal mechanism. Therefore the auth-button must call BOTH server-side `signOut()` (to clear cookies) AND client-side `signOut()` (to reactively update `useSession()` → re-render). Client-side `signOut()` calls `POST /api/auth/sign-out` which always returns `{ success: true }` even if cookies are already cleared, so the double sign-out is safe.

### AD-3: Distinguish transient errors from stale sessions

Two different failure modes must NOT be conflated:

- **Stale session** (permanent): `getAccessToken()` throws because Keycloak returns 400/401 (`invalid_grant` — refresh token expired). The session is irrecoverable. → Sign out.
- **Transient error** (temporary): `getAccessToken()` throws because Keycloak is unreachable (5xx, network timeout, DNS failure). The session may still be valid. → Keep session, show degraded state, retry later.

Similarly for backend GraphQL errors:
- **`UNAUTHORIZED`** from the backend: Token was sent but rejected. → Sign out.
- **Network/server error** (5xx, timeout): Backend is down. → Keep session, show error state.

### AD-4: Fix the `TypedError` interface to match the actual backend (pre-existing bug)

The CLAUDE.md says "Error format follows Netflix DGS specification" but the backend uses Spring GraphQL (`spring-boot-starter-graphql`), which serializes errors differently:

| | Frontend (DGS, wrong) | Backend (Spring GraphQL, actual) |
|---|---|---|
| Key | `extensions.errorType` | `extensions.classification` |
| Auth error | `UNAUTHENTICATED` | `UNAUTHORIZED` |
| Permission error | `PERMISSION_DENIED` | `FORBIDDEN` |
| Server error | `INTERNAL` | `INTERNAL_ERROR` |

This is a pre-existing bug — the `TypedError` interface and `ErrorType` enum have never matched the backend. The Playwright test fixtures (`tests/pages/chat.spec.ts`) also use the wrong format. This design corrects all of these as part of the implementation.

## Design

### Layer 1: Reduce the stale window

**File: `src/lib/auth.ts`**

Change `cookieCache.maxAge` from 7 days to 5 minutes (the Better Auth default).

```typescript
cookieCache: {
  enabled: true,
  maxAge: 5 * 60, // 5 minutes (was 7 days)
  strategy: "jwe",
  refreshCache: true,
},
```

With a 5-minute cache, `getSession()` re-validates the JWE cookie within 5 minutes instead of trusting it for a week. The stale window shrinks from 7 days to 5 minutes.

### Layer 2: Graceful degradation in `getAuthHeaders()`

**File: `src/lib/graphql-request.ts`** — `getAuthHeaders()`

When `getSession()` returns a valid session but `getAccessToken()` returns null or throws, return empty headers. Do NOT call `signOut()` (it doesn't work in Server Components) and do NOT redirect. Log the error for debugging.

```typescript
async function getAuthHeaders() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session?.user?.id) {
    return {};
  }

  try {
    const tokenResponse = await auth.api.getAccessToken({
      headers: reqHeaders,
      body: { providerId: "keycloak" },
    });

    if (!tokenResponse?.accessToken) {
      console.warn("[getAuthHeaders] Token empty despite valid session — stale session");
      return {};
    }

    return { Authorization: `Bearer ${tokenResponse.accessToken}` };
  } catch (error) {
    // This is a network call to Keycloak's token endpoint.
    // Could be: expired refresh token (permanent) OR Keycloak outage (transient).
    // Either way, return empty headers and let the auth-button handle recovery.
    console.warn(
      "[getAuthHeaders] Token fetch failed:",
      error instanceof Error ? error.message : String(error),
    );
    return {};
  }
}
```

**Why no `signOut()` here:**
- In Server Component renders, `cookies().set()` is read-only — `signOut()` silently fails
- In Server Actions, the auth-button's `fetchCurrentUser()` will call `signOut()` after detecting the null result
- Calling `signOut()` here adds complexity for zero benefit — it either doesn't work (SSR) or is redundant (Server Action)

### Layer 3: Fix the GraphQL error types and detect backend `UNAUTHORIZED`

**File: `src/lib/graphql-request.ts`** — Error types and `authQuery()`/`authMutate()`

The existing `TypedError` interface and `ErrorType` enum don't match the actual backend. The backend uses Spring GraphQL which returns `extensions.classification` with values like `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, etc.

**Important context:** The backend's `/graphql` endpoint is `permitAll()` in `SecurityConfiguration.java`. Unauthenticated requests are NOT rejected at the HTTP level (no HTTP 401). They pass through to the GraphQL layer as anonymous, where `@PreAuthorize("isAuthenticated()")` throws `InsufficientAuthenticationException`, caught by `GraphQLExceptionAdvice`, and returned as HTTP 200 with a GraphQL error in the body:

```json
{
  "data": { "me": null },
  "errors": [{
    "message": "Full authentication is required to access this resource.",
    "path": ["me"],
    "extensions": { "classification": "UNAUTHORIZED" }
  }]
}
```

Since this is HTTP 200, `fetchData()` does NOT throw — it returns the full `GraphQLResponse` including the `errors` array. This means the `hasUnauthorizedError()` check IS reachable.

Update the error types to match reality:

```typescript
// Spring GraphQL error classification values
enum ErrorClassification {
  BAD_REQUEST = "BAD_REQUEST",
  FORBIDDEN = "FORBIDDEN",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
}

interface GraphQLErrorExtensions {
  classification: ErrorClassification;
  [key: string]: unknown;
}

interface GraphQLError {
  message: string;
  locations: { line: number; column: number }[];
  path: (string | number)[];
  extensions: GraphQLErrorExtensions;
}
```

Add a utility to check for `UNAUTHORIZED` errors:

```typescript
function hasUnauthorizedError(response: GraphQLResponse): boolean {
  return (
    response.errors?.some(
      (e) => e.extensions?.classification === ErrorClassification.UNAUTHORIZED,
    ) ?? false
  );
}
```

Export `hasUnauthorizedError` and `ErrorClassification` so the auth-button and other components can check for it.

**Note:** `authQuery()`/`authMutate()` should NOT call `signOut()` themselves — it silently fails in SSR context. They return the response as-is. The auth-button checks the response for unauthorized errors.

### Layer 4: Client-side recovery in the auth-button (PRIMARY FIX)

**File: `src/components/auth/actions.ts`** — `fetchCurrentUser()`

Change `fetchCurrentUser()` to return a discriminated result so the auth-button can distinguish "not authenticated" from "server error":

```typescript
export type FetchUserResult =
  | { status: "authenticated"; user: CurrentUserInfo }
  | { status: "unauthenticated" }
  | { status: "error" };

export async function fetchCurrentUser(): Promise<FetchUserResult> {
  try {
    const response = await authQuery({
      me: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        displayName: true,
        email: true,
      },
    });

    if (response.data?.me) {
      return { status: "authenticated", user: response.data.me };
    }

    // The `me` query requires authentication (@PreAuthorize("isAuthenticated()")).
    // If we got here without data, it means the request went through without auth
    // headers (stale session) or the backend rejected the token.
    if (hasUnauthorizedError(response)) {
      // Backend explicitly rejected — clear stale cookies (works in Server Action context)
      const reqHeaders = await headers();
      await auth.api.signOut({ headers: reqHeaders });
      return { status: "unauthenticated" };
    }

    // No data but no UNAUTHORIZED error — treat as unauthenticated
    // (e.g., request sent without auth headers due to stale session)
    // Clear cookies since we're in a Server Action where signOut() works
    const reqHeaders = await headers();
    await auth.api.signOut({ headers: reqHeaders });
    return { status: "unauthenticated" };
  } catch {
    // Network error, server 5xx, etc. — don't sign out, could be transient
    return { status: "error" };
  }
}
```

**File: `src/components/auth/auth-button.tsx`**

Update the auth-button to use the discriminated result:

```typescript
useEffect(() => {
  if (session?.data?.user) {
    fetchCurrentUser().then((result) => {
      switch (result.status) {
        case "authenticated":
          setCurrentUser(result.user);
          break;
        case "unauthenticated":
          // Server confirmed stale session — sync client state
          signOut();
          break;
        case "error":
          // Transient error — don't sign out, keep showing skeleton
          // User can reload or navigate away. Session may still be valid.
          break;
      }
    });
  }
}, [session?.data?.user]);
```

**Why this is the primary fix:**

1. `fetchCurrentUser()` is a Server Action — `signOut()` works here (cookies are mutable)
2. The auth-button runs on every page via the navbar
3. Client-side `signOut()` reactively updates `useSession()` — the UI transitions without reload
4. Discriminated result prevents false sign-outs during backend outages

### Layer 5: Server Action cookie cleanup for `getAccessToken()` (WebSocket path)

**File: `src/components/auth/actions.ts`** — `getAccessToken()`

This Server Action is called by the WebSocket client to get tokens. Apply the same pattern: detect stale session, clear cookies (works because it's a Server Action), return null.

```typescript
export async function getAccessToken(): Promise<TokenInfo | null> {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session?.user?.id) {
    return null;
  }

  try {
    const tokenResponse = await auth.api.getAccessToken({
      headers: reqHeaders,
      body: { providerId: "keycloak" },
    });

    if (!tokenResponse?.accessToken) {
      // Stale session — clear cookies (works in Server Action context)
      await auth.api.signOut({ headers: reqHeaders });
      return null;
    }

    return {
      token: tokenResponse.accessToken,
      expiresAt: tokenResponse.accessTokenExpiresAt?.getTime() ?? null,
    };
  } catch (error) {
    console.warn(
      "[getAccessToken] Token fetch failed:",
      error instanceof Error ? error.message : String(error),
    );
    // Could be stale session or Keycloak outage.
    // Don't call signOut() here — the auth-button handles that determination.
    // Return null so the WebSocket client can handle it.
    return null;
  }
}
```

### Layer 6: WebSocket client — session-aware retry

**File: `src/lib/graphql-ws-client.ts`**

The WebSocket client currently retries infinitely when the token is dead. Instead of an arbitrary counter, tie the retry decision to whether `disposeGraphQLWsClient()` has been called (which happens when the session is cleaned up).

```typescript
let disposed = false;

export function getGraphQLWsClient(
  fetchToken: () => Promise<TokenInfo | null>,
): Client {
  if (client) return client;
  disposed = false;

  client = createClient({
    // ... existing config ...
    shouldRetry: () => !disposed,
    // ... rest of config ...
  });

  return client;
}

export function disposeGraphQLWsClient(): void {
  disposed = true;
  clearExpiryTimer();
  if (client) {
    client.dispose();
    client = null;
  }
}
```

The component that manages the WS client (`useNotificationSubscription`) should call `disposeGraphQLWsClient()` when the session becomes null, which naturally stops retry.

## Flow: What happens when a user returns with a stale session

```
1. User opens page after Keycloak tokens expired
2. Root layout calls getSession() → returns cached session (stale but within 5-min cache)
3. Navbar renders AuthButton with session.data.user set
4. AuthButton shows skeleton, calls fetchCurrentUser() (Server Action)

--- Inside the Server Action ---
5. fetchCurrentUser() calls authQuery() → calls getAuthHeaders()
6. getAuthHeaders() calls getSession() → valid session (cached)
7. getAuthHeaders() calls getAccessToken() → FAILS (refresh token expired)
8. getAuthHeaders() logs warning, returns {} (empty headers)
9. authQuery() sends request without auth → backend returns HTTP 200 with { data: { me: null }, errors: [{ classification: "UNAUTHORIZED" }] }
10. fetchCurrentUser() sees no data + UNAUTHORIZED → calls server-side signOut() (WORKS — Server Action context, clears cookies)
11. fetchCurrentUser() returns { status: "unauthenticated" }

--- Back on the client ---
12. AuthButton receives "unauthenticated" → calls client-side signOut() (POST /api/auth/sign-out → always succeeds even if cookies already cleared → toggles nanostore $sessionSignal)
13. useSession() updates reactively via useSyncExternalStore → session.data becomes null
14. AuthButton re-renders as "Sign In" button
15. NotificationBell sees session null → disposes WebSocket client
16. User sees the page in unauthenticated state, can click Sign In to re-auth
```

**On a public page:** The user stays on the page with unauthenticated content. The auth-button transitions to "Sign In."

**On a protected page:** The user stays on the page momentarily. On their next navigation, the page's auth check sees no session and redirects.

**During a backend outage:** `fetchCurrentUser()` returns `{ status: "error" }`. The auth-button keeps showing the skeleton. The user's session is preserved. When the backend recovers, a page reload will work normally.

## Known Limitations

### Layout class mismatch during recovery

The root layout (`layout.tsx:72`) applies `pb-16 lg:pb-0` when `session?.user` is truthy. Since the layout is a Server Component, this class is baked into the SSR HTML. When the auth-button calls client-side `signOut()`, the bottom padding persists until the next full page load. This is a cosmetic issue — the user sees extra padding at the bottom until they navigate.

### Brief authenticated UI flash

Between steps 2-14, the user briefly sees the authenticated navbar (notification bell, New Game button) with a skeleton avatar. This lasts for the duration of the `fetchCurrentUser()` round-trip (~100-500ms). After step 14, the navbar transitions to the unauthenticated state. This is acceptable — the alternative (blocking the entire page render on auth validation) would be worse for performance.

## Files Changed

| File | Change |
|---|---|
| `src/lib/auth.ts` | Reduce `cookieCache.maxAge` from 7 days to 5 minutes |
| `src/lib/graphql-request.ts` | `getAuthHeaders()` returns `{}` on stale session (no side effects); fix `ErrorType`/`TypedError` to match Spring GraphQL's `classification`/`UNAUTHORIZED`; add `hasUnauthorizedError()` utility; export new types |
| `src/components/auth/actions.ts` | `fetchCurrentUser()` returns discriminated result (`authenticated`/`unauthenticated`/`error`); calls `signOut()` in Server Action context on stale session detection; `getAccessToken()` returns null on failure |
| `src/components/auth/auth-button.tsx` | Handles discriminated result: sign out on `unauthenticated`, keep skeleton on `error` |
| `src/lib/graphql-ws-client.ts` | Session-aware retry via `disposed` flag |
| `tests/pages/chat.spec.ts` | Update mock error format from `{ errorType: "INTERNAL" }` to `{ classification: "INTERNAL_ERROR" }` |
| `CLAUDE.md` | Update "Error format follows Netflix DGS specification" to reflect actual Spring GraphQL format |

## Testing

- **Manual — refresh token expiry**: Log in, wait for Keycloak SSO Session Idle (default 30 min), reload. Auth-button should transition from skeleton to "Sign In" button within ~500ms. Page content should degrade to unauthenticated view.
- **Manual — access token expiry only**: Log in, wait 5+ minutes (access token expires), interact with the page. `getAccessToken()` should transparently refresh via the refresh token. No sign-out should occur.
- **Manual — public page**: Visit a game detail page while logged in. Wait for refresh token to expire. Reload. Page should show game content (unauthenticated view), auth-button shows "Sign In".
- **Manual — backend outage simulation**: Log in, stop the backend, reload. Auth-button should show skeleton (not sign out). Start the backend, reload. Everything works normally.
- **Manual — logout works in stale state**: When stale, clicking "Sign In" should work (cookies cleared by Layer 4, Keycloak login flow starts fresh).
- **Unit**: `fetchCurrentUser()` with mocked `authQuery` returning UNAUTHORIZED error → returns `{ status: "unauthenticated" }` and calls `signOut()`.
- **Unit**: `fetchCurrentUser()` with mocked `authQuery` throwing network error → returns `{ status: "error" }` and does NOT call `signOut()`.
- **Unit**: `getAuthHeaders()` with mocked `getAccessToken()` throwing → returns `{}` and does NOT call `signOut()`.
- **Integration**: Playwright test with MSW returning UNAUTHORIZED GraphQL error → verify auth-button transitions to "Sign In".

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| 5-minute cache increases JWE decryption frequency | Negligible CPU cost. This is the Better Auth default. |
| `getAccessToken()` is a network call to Keycloak (not local) — transient failures possible | `getAuthHeaders()` returns `{}` on any failure without calling `signOut()`. The auth-button distinguishes transient errors from stale sessions via the discriminated result. Only confirmed unauthenticated state triggers sign-out. |
| Multiple parallel server components call `getAuthHeaders()` with stale session | Each returns `{}` independently. No side effects, no race condition. The auth-button is the single point of cookie cleanup. |
| `signOut()` in `fetchCurrentUser()` runs during SSR if called from a Server Component | `fetchCurrentUser()` is defined with `"use server"` — it always runs as a Server Action, never as part of SSR. `signOut()` always works. |
| WebSocket retries after sign-out | `useNotificationSubscription` checks `session?.user`. When session becomes null after `signOut()`, it calls `disposeGraphQLWsClient()`, setting `disposed = true` and stopping retries. |
| Layout padding mismatch after client-side sign-out | Cosmetic only. Resolves on next navigation. Documented in Known Limitations. |
