# WebSocket Security — Frontend Design

## Problem

The backend is adding JWT expiry enforcement on WebSocket connections (see `playground-backend/.claudedoc/0083-websocket-security/design.md`). When a token's `exp` claim passes, the server closes the connection with close code 4403 ("Forbidden"). The graphql-ws client auto-retries on 4403, but this is reactive — the user experiences a brief interruption while the server kills the connection and the client retries with backoff.

The current frontend has no expiry awareness. `getAccessToken()` discards the `accessTokenExpiresAt` metadata that Better Auth already provides. The WebSocket client sends a token at `connection_init` and never thinks about it again.

Additionally, the game subscription hook currently requires authentication (`getAccessToken()` throws if no token), but the backend supports unauthenticated WebSocket connections for public/protected game subscriptions. Anonymous viewers cannot receive live game updates.

## Scope

**In scope:**
- Surface token `expiresAt` from Better Auth (currently discarded by `getAccessToken()`)
- Preemptive reconnect — close the socket before expiry and reconnect with a fresh token, so the server never needs to kill us
- Graceful fallback to server-initiated 4403 close if the preemptive timer doesn't fire
- Unauthenticated game subscriptions — allow anonymous viewers to receive live updates on public/protected games without a token

**Out of scope:**
- Connection state UX (toasts, banners, visual indicators)
- Refresh token expiry handling (Keycloak default ~30 days — user must re-authenticate)

## Architecture

### Modified Components

**`getAccessToken()` server action** (`src/components/auth/actions.ts`)

Change return type from `string | null` to `TokenInfo | null`:

```typescript
interface TokenInfo {
  token: string;
  expiresAt: number | null; // Unix timestamp (ms)
}
```

`TokenInfo` is defined in `actions.ts` and exported. `graphql-ws-client.ts` imports it — TypeScript types cross the "use server"/"use client" boundary since they're erased at runtime.

`expiresAt` is a number (not `Date`) because server action return values are serialized — numbers are unambiguous. `null` means Better Auth didn't provide an expiry (defensive; Keycloak always sets `exp`).

Implementation change:

```typescript
// Before
return tokenResponse?.accessToken ?? null;

// After
return tokenResponse?.accessToken
  ? {
      token: tokenResponse.accessToken,
      expiresAt: tokenResponse.accessTokenExpiresAt?.getTime() ?? null,
    }
  : null;
```

Better Auth's `auth.api.getAccessToken()` already returns `accessTokenExpiresAt: Date | undefined` — this is the Keycloak access token's expiry derived from the OAuth `expires_in` response field. We are simply surfacing metadata that was previously discarded.

---

**`graphql-ws-client.ts`** (`src/lib/graphql-ws-client.ts`)

This is the core change. The module gains preemptive close logic following the [graphql-ws token expiry recipe](https://the-guild.dev/graphql/ws/recipes).

Signature change:

```typescript
// Before
getGraphQLWsClient(fetchToken: () => Promise<string>): Client

// After
getGraphQLWsClient(fetchToken: () => Promise<TokenInfo | null>): Client
```

The `fetchToken` callback can now return `null` (unauthenticated user). This enables unauthenticated game subscriptions.

Two module-level variables are added alongside the existing `client`:

```typescript
let client: Client | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | null = null;
let lastExpiresAt: number | null = null;
```

The `BUFFER_MS` constant controls how far ahead of expiry we preemptively close:

```typescript
const BUFFER_MS = 30_000; // 30 seconds
```

30 seconds because: (a) the server's `WebSocketExpiryScheduler` fires at the exact `exp` instant — we want to reconnect before that, and (b) the server's keep-alive is 30s, so we know the connection was recently alive.

Changes inside `createClient`:

1. **`connectionParams`** — calls `fetchToken()` inside a try-catch. If the result is non-null, stores `expiresAt` in `lastExpiresAt` and returns `{ Authorization: "Bearer ..." }`. If null (unauthenticated), sets `lastExpiresAt = null` and returns `{}` (empty params — backend accepts this for public subscriptions). If `fetchToken()` throws (e.g., server action transport failure), logs the error and returns `{}` — this prevents graphql-ws from closing with fatal code 4005 (`InternalClientError`), which bypasses `shouldRetry` and kills the connection permanently.

2. **`connected` handler** — receives the raw `WebSocket` as its first argument (graphql-ws types it as `unknown`; cast to `WebSocket` in browser). Clears any existing `expiryTimer`. If `lastExpiresAt` is non-null, calculates `timeUntilClose = lastExpiresAt - Date.now() - BUFFER_MS`. If positive, schedules `socket.close(4403, "Forbidden")` at that time. If <= 0, no timer is scheduled — the token is nearly expired so we let the server close it, avoiding a tight connect/close retry loop. If `lastExpiresAt` is null (unauthenticated or no expiry), no timer is scheduled.

3. **`closed` handler** — clears `expiryTimer` to prevent stale timers from firing after a natural disconnect.

4. **`disposeGraphQLWsClient()`** — also clears `expiryTimer` (cleanup on logout).

Why the `connected` handler and not `connectionParams`? The `connectionParams` callback runs before the WebSocket is fully established. The `connected` handler runs after the server accepts the connection and completes `connection_init`/`connection_ack`. This is when we know the token was accepted and we have the raw socket reference for closing.

---

**Subscription hooks** (`src/hooks/use-notification-subscription.ts`, `use-chat-subscription.ts`, `use-game-subscription.ts`)

All three hooks remove the throw-on-null pattern and pass `getAccessToken()` through directly:

```typescript
// Before
const client = getGraphQLWsClient(async () => {
  const token = await getAccessToken();
  if (!token) throw new Error("No access token available");
  return token;
});

// After
const client = getGraphQLWsClient(async () => {
  return await getAccessToken();
});
```

The hooks don't need to know about expiry — that's handled entirely within `graphql-ws-client.ts`. The hooks' existing `onReconnect` callbacks already handle stale data refresh on reconnection, so preemptive reconnects are transparent to them.

**Notification and chat hooks** are already gated by their `enabled` prop, which is `false` when the user is not authenticated. They never create the client or subscribe when logged out, so removing the throw is functionally inert — it just makes the contract consistent across all hooks.

**Game hook** is the one that benefits: `enabled` is always `true` regardless of auth state, so unauthenticated users now get a WebSocket connection without an Authorization header, and the backend serves public game subscriptions.

**Game hook `closed` listener** must be updated to ignore close code 4403. The existing `onConnectionLost` callback fires on every socket close, which would show a false "Connection lost" banner during preemptive reconnects. The fix: inspect the close event's code and skip `onConnectionLost` when it's 4403 (an expected, retriable close).

**Singleton behavior across auth transitions:**

The WebSocket client is a module-level singleton. Only the first hook to call `getGraphQLWsClient()` creates it; subsequent callers get the existing instance. The `fetchToken` callback is captured in the `createClient` closure at creation time.

- **Unauthenticated user on game page:** Only the game hook is active (notification/chat disabled). It creates the client. `fetchToken` returns null → unauthenticated connection.
- **Authenticated user on game page:** Notification hook creates the client first (it mounts before or alongside the game hook). `fetchToken` returns a token → authenticated connection. Game hook reuses the existing client.
- **Login/logout:** Both involve Keycloak redirects (full page navigation), which resets module state. The client is recreated from scratch with the appropriate auth context.

## Data Flow

### Preemptive reconnect (happy path)

```
1. Component mounts -> subscription hook calls getGraphQLWsClient(fetchToken)
2. connectionParams() fires
   -> fetchToken() -> getAccessToken() server action
   -> Better Auth returns { accessToken, accessTokenExpiresAt }
   -> Server action returns { token, expiresAt: 1711612800000 }
   -> Store expiresAt in lastExpiresAt
   -> Return { Authorization: "Bearer ..." }
3. Server accepts connection, sends connection_ack
4. connected(socket) fires
   -> Clear any existing expiryTimer
   -> timeUntilClose = 1711612800000 - Date.now() - 30000
   -> Schedule socket.close(4403, "Forbidden") in timeUntilClose ms
5. Subscriptions flow normally
6. [~30s before token expiry] Timer fires
   -> socket.close(4403, "Forbidden")
7. closed(event) fires -> clear expiryTimer
8. graphql-ws sees 4403 (non-fatal) -> auto-retry with backoff
9. connectionParams() fires again
   -> fetchToken() -> getAccessToken() -> Better Auth refreshes via Keycloak
   -> Returns fresh token + new expiresAt
10. connected(socket) fires -> schedule new timer with new expiresAt
11. Subscriptions re-established, onReconnect callbacks fire
```

### Server-initiated close (fallback)

If the preemptive timer didn't fire (null expiresAt, timer cleared by tab suspension, etc.):

```
1. Token expires, server's WebSocketExpiryScheduler fires
2. Server closes connection with CloseStatus(4403, "Forbidden")
3. closed(event) fires -> clear expiryTimer
4. graphql-ws auto-retries -> same flow as step 8 above
```

### Unauthenticated game subscription

```
1. Unauthenticated user opens a public game page
2. Game hook calls getGraphQLWsClient(fetchToken)
   (notification/chat hooks are disabled — enabled=false)
3. connectionParams() fires
   -> fetchToken() -> getAccessToken() -> returns null (no session)
   -> lastExpiresAt = null
   -> Return {} (no Authorization header)
4. Server accepts unauthenticated connection
5. Game subscription established for public game events
6. No expiry timer scheduled — unauthenticated connections have no token to expire
7. Connection stays open until closed by server keep-alive timeout or user navigates away
```

### Null expiresAt (authenticated but no expiry metadata)

```
1. connectionParams() returns token, lastExpiresAt = null
2. connected(socket) fires -> no timer scheduled
3. Connection stays open until server closes it at JWT exp
4. Falls back to server-initiated close flow
```

## Security Considerations

- **No new attack surface.** The `expiresAt` value comes from Better Auth's server-side token metadata, not from decoding the JWT client-side. The client never touches the raw JWT payload.
- **Timer is a UX optimization, not a security control.** If the client's timer is wrong, too early, or never fires, the server's `WebSocketExpiryScheduler` is the authoritative enforcer. The client cannot extend its own session by ignoring the timer.
- **Close reason string.** Per RFC 6455, close reasons must be <= 123 bytes and must not contain sensitive information. We use the fixed string `"Forbidden"`, matching the server's close reason.
- **`shouldRetry: () => true` does not cover all close codes.** graphql-ws has a hardcoded list of fatal close codes (4500, 4005, 4400, 4004, 4401, 4406, 4409, 4429) that bypass `shouldRetry` entirely. Code 4403 ("Forbidden") is NOT in this list, so preemptive and server-initiated closes are retriable. However, if `connectionParams` throws (e.g., network error calling the server action), graphql-ws closes with 4005 (`InternalClientError`), which IS fatal. The `connectionParams` try-catch prevents this — on failure, it returns `{}` instead of throwing, degrading to an unauthenticated connection rather than killing the socket.
- **Unauthenticated connections are server-bounded.** The backend's keep-alive (30s ping) detects dead connections, and `connection-init-timeout` (60s) closes connections that never initialize. Anonymous connections that do initialize have unbounded lifetime — this is intentional for public game viewers. The backend design notes that connection rate limiting (Tier 3) would address resource exhaustion from malicious anonymous connections.
- **Race between client and server close.** If both the client's preemptive timer and the server's expiry timer fire near-simultaneously, the loser sees an already-closed socket. `WebSocket.close()` on an already-closed socket is a no-op per the spec. No error, no double-reconnect — graphql-ws deduplicates.
- **Tab suspension.** `setTimeout` is unreliable when the browser tab is suspended (mobile browsers, background tabs). The timer may fire late or not at all. This is fine — the server-initiated close is the fallback. When the tab resumes, the `closed` event fires and triggers reconnect.

## Testing Strategy

**Unit tests (Vitest):**
- `getAccessToken()` returns `{ token, expiresAt }` when Better Auth provides both
- `getAccessToken()` returns `{ token, expiresAt: null }` when `accessTokenExpiresAt` is undefined
- `getAccessToken()` returns `null` when session is missing

**Integration tests (Playwright):**

These require the backend's WebSocket security changes to be deployed. If testing against MSW mocks, the preemptive close can be verified by:
- Mocking `getAccessToken()` to return a short-lived `expiresAt` (e.g., 5 seconds from now)
- Verifying the WebSocket closes and reconnects before the expiry
- Verifying subscription `onReconnect` callbacks fire after preemptive reconnect
- Mocking `getAccessToken()` to return `null` (unauthenticated) and verifying the game subscription connects without Authorization and receives public game events

**Manual verification:**
- Connect with a short-lived Keycloak token (configure Keycloak realm with a short access token lifespan, e.g., 2 minutes)
- Observe in browser devtools: WebSocket closes ~30s before token expiry
- Verify subscriptions resume automatically with no user-visible interruption
- Verify server logs show no 4403 close from the server side (client preempted it)
- Open a public game page in an incognito window (unauthenticated) and verify live updates are received

## References

- [Backend design: WebSocket Authentication Security](../../playground-backend/.claudedoc/0083-websocket-security/design.md)
- [graphql-ws token expiry recipe](https://the-guild.dev/graphql/ws/recipes)
- [graphql-ws close codes](https://the-guild.dev/graphql/ws/docs/interfaces/common.CloseCode) — 4403 is non-fatal, clients auto-retry
- [Better Auth Generic OAuth plugin](https://www.better-auth.com/docs/plugins/generic-oauth) — `getAccessToken()` returns `accessTokenExpiresAt`
