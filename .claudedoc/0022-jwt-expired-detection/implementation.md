# Implementation: Stale Session Detection and Recovery

Reference: [design.md](design.md)

## Pre-Implementation Notes

- The `ErrorType` enum and `TypedError` interface in `graphql-request.ts` are defined but never imported by any other file. They can be replaced in-place without touching consumers.
- `useNotificationSubscription` already calls `disposeGraphQLWsClient()` when `enabled` (`!!session?.user`) becomes false (line 48-50). No change needed there.
- `hasUnauthorizedError` is exported from `graphql-request.ts` for use by `actions.ts` and future callers that need to distinguish error types.
- `signOut` from `@/lib/auth-client` is NOT currently imported in `auth-button.tsx` — it must be added.

## Steps

### Step 1: Reduce cookie cache duration

**File:** `src/lib/auth.ts` (line 14)

Change `maxAge: 7 * 24 * 60 * 60` to `maxAge: 5 * 60`.

```
Before: maxAge: 7 * 24 * 60 * 60, // 7 days cache duration
After:  maxAge: 5 * 60, // 5 minutes — the Better Auth default
```

Remove the comment about "7 days" — the new value is self-explanatory at 5 minutes.

---

### Step 2: Fix GraphQL error types (pre-existing bug)

**File:** `src/lib/graphql-request.ts`

**2a.** Replace the `ErrorType` enum (lines 110-119) with `ErrorClassification` to match Spring GraphQL:

```typescript
// Before (Netflix DGS — never matched the actual backend)
enum ErrorType {
  BAD_REQUEST = "BAD_REQUEST",
  FAILED_PRECONDITION = "FAILED_PRECONDITION",
  INTERNAL = "INTERNAL",
  NOT_FOUND = "NOT_FOUND",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  UNAUTHENTICATED = "UNAUTHENTICATED",
  UNAVAILABLE = "UNAVAILABLE",
  UNKNOWN = "UNKNOWN",
}

// After (Spring GraphQL — matches actual backend extensions.classification)
enum ErrorClassification {
  BAD_REQUEST = "BAD_REQUEST",
  FORBIDDEN = "FORBIDDEN",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
}
```

**2b.** Replace the `TypedError` interface (lines 121-166) with a simpler `GraphQLErrorExtensions`:

```typescript
// Before
interface TypedError {
  errorType: ErrorType;
  errorDetail?: any;
  origin?: string;
  debugInfo?: any;
  debugUri?: string;
}

// After
interface GraphQLErrorExtensions {
  classification: ErrorClassification;
  [key: string]: unknown;
}
```

**2c.** Update the `GraphQLError` interface (lines 102-108):

```typescript
// Before
interface GraphQLError {
  message: string;
  locations: [string];
  path: [string | number];
  extensions: TypedError;
}

// After
interface GraphQLError {
  message: string;
  locations: { line: number; column: number }[];
  path: (string | number)[];
  extensions: GraphQLErrorExtensions;
}
```

**2d.** Add the `hasUnauthorizedError` utility function after the `GraphQLResponse` interface:

```typescript
function hasUnauthorizedError(response: GraphQLResponse): boolean {
  return (
    response.errors?.some(
      (e) => e.extensions?.classification === ErrorClassification.UNAUTHORIZED,
    ) ?? false
  );
}
```

**2e.** Update the exports (line 168):

```typescript
// Before
export { authMutate, authQuery, ErrorType, mutate, query };
export type { GraphQLError, GraphQLResponse, NextFetchOptions, TypedError };

// After
export { authMutate, authQuery, ErrorClassification, hasUnauthorizedError, mutate, query };
export type { GraphQLError, GraphQLErrorExtensions, GraphQLResponse, NextFetchOptions };
```

**2f.** Update the DGS spec comment (line 102):

```
// Before: // See https://netflix.github.io/dgs/error-handling/#error-specification for more information
// After:  // Spring GraphQL error format — see extensions.classification
```

---

### Step 3: Add warning log to `getAuthHeaders()` on stale session

**File:** `src/lib/graphql-request.ts` — `getAuthHeaders()` (lines 60-75)

Replace the current implementation:

```typescript
// Before
async function getAuthHeaders() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session?.user?.id) {
    return {};
  }

  const tokenResponse = await auth.api.getAccessToken({
    headers: reqHeaders,
    body: { providerId: "keycloak" },
  });

  const accessToken = tokenResponse?.accessToken;
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

// After
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
    console.warn(
      "[getAuthHeaders] Token fetch failed:",
      error instanceof Error ? error.message : String(error),
    );
    return {};
  }
}
```

The key change: wrap `getAccessToken()` in try-catch with a warning log instead of letting it propagate. No `signOut()` — that doesn't work in Server Component context.

---

### Step 4: `fetchCurrentUser()` — discriminated result with cookie cleanup

**File:** `src/components/auth/actions.ts`

**4a.** Update imports at the top:

```typescript
// Before
import { authQuery } from "@/lib/graphql-request";

// After
import { authQuery, hasUnauthorizedError } from "@/lib/graphql-request";
```

`hasUnauthorizedError` is used in `fetchCurrentUser()` to explicitly detect backend auth rejection before calling `signOut()`. While both no-data branches lead to `unauthenticated`, the check documents *why* we're signing out and avoids clearing cookies on unexpected backend responses.

**4b.** Add the `FetchUserResult` type after `CurrentUserInfo`:

```typescript
export type FetchUserResult =
  | { status: "authenticated"; user: CurrentUserInfo }
  | { status: "unauthenticated" }
  | { status: "error" };
```

**4c.** Replace `fetchCurrentUser()` (lines 83-100):

```typescript
// Before
export async function fetchCurrentUser(): Promise<CurrentUserInfo | null> {
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

    return response.data?.me ?? null;
  } catch {
    return null;
  }
}

// After
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

    // The `me` query requires @PreAuthorize("isAuthenticated()").
    // No data means the request went without auth (stale session)
    // or the backend rejected the token. Clear stale cookies.
    // signOut() works here because this is a Server Action.
    if (hasUnauthorizedError(response)) {
      const reqHeaders = await headers();
      await auth.api.signOut({ headers: reqHeaders });
    }

    return { status: "unauthenticated" };
  } catch {
    // Network error, backend 5xx, etc. — don't sign out, could be transient
    return { status: "error" };
  }
}
```

Note: `signOut()` is called only when the backend explicitly returns `UNAUTHORIZED`. If `me` returns no data without an `UNAUTHORIZED` error (unlikely but possible), we still return `unauthenticated` but skip cookie clearing since we can't confirm the session is stale. The auth-button handles the `unauthenticated` status either way by calling client-side `signOut()`.

Also note: the old `.catch { return null }` is replaced by `catch { return { status: "error" } }`. The new `fetchCurrentUser()` never rejects — all errors are caught internally and returned as the discriminated result.

---

### Step 5: Update `auth-button.tsx` to handle discriminated result

**File:** `src/components/auth/auth-button.tsx`

**5a.** Add `signOut` to the `@/lib/auth-client` import (line 4):

```typescript
// Before
import { signIn, useSession } from "@/lib/auth-client";

// After
import { signIn, signOut, useSession } from "@/lib/auth-client";
```

**5b.** Update the `./actions` import (line 10):

```typescript
// Before
import { fetchCurrentUser } from "./actions";

// After
import { fetchCurrentUser } from "./actions";
```

(No change needed — `FetchUserResult` type is inferred from the return type, no explicit import required.)

**5c.** Replace the `useEffect` (lines 23-27):

```typescript
// Before
useEffect(() => {
  if (session?.data?.user) {
    fetchCurrentUser().then(setCurrentUser).catch(() => {});
  }
}, [session?.data?.user]);

// After
useEffect(() => {
  if (session?.data?.user) {
    fetchCurrentUser().then((result) => {
      switch (result.status) {
        case "authenticated":
          setCurrentUser(result.user);
          break;
        case "unauthenticated":
          // Server confirmed stale session — sync client state.
          // Client-side signOut() POSTs to /api/auth/sign-out,
          // which toggles the nanostore $sessionSignal and causes
          // useSession() to refetch and return null.
          signOut();
          break;
        case "error":
          // Transient error — keep skeleton, don't sign out.
          // Session may still be valid once backend recovers.
          break;
      }
    });
  }
}, [session?.data?.user]);
```

The `.catch(() => {})` is removed because the new `fetchCurrentUser()` never rejects — errors are caught internally and returned as `{ status: "error" }`.

---

### Step 6: Update `getAccessToken()` server action

**File:** `src/components/auth/actions.ts` — `getAccessToken()` (lines 57-81)

Replace the current implementation:

```typescript
// Before
export async function getAccessToken(): Promise<TokenInfo | null> {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session?.user?.id) {
      return null;
    }

    const tokenResponse = await auth.api.getAccessToken({
      headers: reqHeaders,
      body: { providerId: "keycloak" },
    });

    return tokenResponse?.accessToken
      ? {
          token: tokenResponse.accessToken,
          expiresAt: tokenResponse.accessTokenExpiresAt?.getTime() ?? null,
        }
      : null;
  } catch (error) {
    console.error("Failed to fetch access token:", error);
    return null;
  }
}

// After
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
    // Could be stale session or Keycloak outage — don't call signOut().
    // The auth-button handles that determination.
    return null;
  }
}
```

Key changes:
- Move `session` check outside try-catch (it's a read operation that shouldn't be caught)
- When `getAccessToken()` returns empty despite valid session: call `signOut()` (we're in a Server Action)
- When `getAccessToken()` throws: log warning, return null, do NOT call `signOut()` (could be transient)

---

### Step 7: WebSocket client — `disposed` flag

**File:** `src/lib/graphql-ws-client.ts`

**7a.** Add the `disposed` flag after existing module-level state (line 9):

```typescript
let lastExpiresAt: number | null = null;
let disposed = false;  // ADD THIS
```

**7b.** Reset `disposed` in `getGraphQLWsClient()` before creating the client:

```typescript
export function getGraphQLWsClient(
  fetchToken: () => Promise<TokenInfo | null>,
): Client {
  if (client) return client;
  disposed = false;  // ADD THIS
```

**7c.** Replace `shouldRetry` in the `createClient` config (line 55):

```typescript
// Before
shouldRetry: () => true,

// After
shouldRetry: () => !disposed,
```

**7d.** Set `disposed = true` in `disposeGraphQLWsClient()`:

```typescript
export function disposeGraphQLWsClient(): void {
  disposed = true;  // ADD THIS
  clearExpiryTimer();
  if (client) {
    client.dispose();
    client = null;
  }
}
```

No changes needed to `useNotificationSubscription` — it already calls `disposeGraphQLWsClient()` when `enabled` (which is `!!session?.user`) becomes false.

---

### Step 8: Update Playwright test fixture

**File:** `tests/pages/chat.spec.ts` (line 6)

```typescript
// Before
errors: [{ message: "Server error", extensions: { errorType: "INTERNAL" } }],

// After
errors: [{ message: "Server error", extensions: { classification: "INTERNAL_ERROR" } }],
```

---

### Step 9: Update CLAUDE.md

**File:** `CLAUDE.md`

Find the line about error format (in the GraphQL Client section):

```
Before: - Error format follows Netflix DGS specification
After:  - Error format follows Spring GraphQL convention (`extensions.classification`)
```

---

## Build Order

All steps are independent at the code level — no step requires another step's output to compile. However, they should be grouped into logical commits:

1. **Steps 2, 8, 9**: Fix GraphQL error types (pre-existing bug fix, independent of stale session feature)
2. **Steps 1, 3**: Reduce cache duration + graceful degradation in `getAuthHeaders()`
3. **Steps 4, 5**: Auth-button stale session recovery (the primary fix)
4. **Steps 6, 7**: WebSocket path cleanup

## Verification

After each commit group, run:

```bash
npm run build    # Type errors from ErrorType → ErrorClassification rename
npm run lint     # Unused imports, etc.
npm test         # Unit tests
```

After commit 1 (error type fix), also run:

```bash
npx playwright test --project=chromium tests/pages/chat.spec.ts 2>&1 | tee /tmp/pw-chat.txt
```

The design lists additional unit test scenarios (e.g., mocking `authQuery` to return UNAUTHORIZED, mocking `getAccessToken` to throw). Writing those tests is deferred — the verification above confirms no regressions.
