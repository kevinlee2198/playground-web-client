# WebSocket Security — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add preemptive WebSocket reconnect before JWT expiry and support unauthenticated game subscriptions.

**Architecture:** Change `getAccessToken()` to return `{ token, expiresAt }` instead of just the token string. Update the graphql-ws client to schedule a preemptive socket close 30s before token expiry, following the official graphql-ws recipe. Allow `fetchToken` to return `null` for unauthenticated connections.

**Tech Stack:** TypeScript, graphql-ws, Better Auth, Next.js server actions, Vitest

**Design doc:** `.claudedoc/0085-websocket-security/design.md`

---

### Task 1: All code changes

**Files:**
- Modify: `src/components/auth/actions.ts:47-70`
- Modify: `src/lib/graphql-ws-client.ts` (full rewrite)
- Modify: `src/hooks/use-notification-subscription.ts:58-62`
- Modify: `src/hooks/use-chat-subscription.ts:100-104`
- Modify: `src/hooks/use-game-subscription.ts:159-163, 175-179`

- [ ] **Step 1: Add TokenInfo interface and update getAccessToken return type**

In `src/components/auth/actions.ts`, add the `TokenInfo` interface before `getAccessToken` and update the function. Replace lines 47-70 with:

```typescript
export interface TokenInfo {
  token: string;
  expiresAt: number | null;
}

/**
 * Fetch the Keycloak access token for the current session.
 * Used by the WebSocket client to authenticate subscription connections.
 */
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
```

- [ ] **Step 2: Rewrite graphql-ws-client.ts with preemptive close logic**

Replace the entire contents of `src/lib/graphql-ws-client.ts` with:

```typescript
"use client";

import type { TokenInfo } from "@/components/auth/actions";
import { createClient, CloseCode, type Client } from "graphql-ws";
import { GRAPHQL_PATH } from "./graphql-config";

let client: Client | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | null = null;
let lastExpiresAt: number | null = null;

const BUFFER_MS = 30_000;

function getWsUrl(): string {
  const httpUrl = process.env.NEXT_PUBLIC_API_SERVER_URL;
  if (!httpUrl) {
    throw new Error("NEXT_PUBLIC_API_SERVER_URL is not defined");
  }
  return `${httpUrl.replace(/^http/, "ws")}${GRAPHQL_PATH}`;
}

function clearExpiryTimer(): void {
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
}

export function getGraphQLWsClient(
  fetchToken: () => Promise<TokenInfo | null>,
): Client {
  if (client) return client;

  client = createClient({
    url: getWsUrl(),
    connectionParams: async () => {
      try {
        const tokenInfo = await fetchToken();
        if (tokenInfo) {
          lastExpiresAt = tokenInfo.expiresAt;
          return { Authorization: `Bearer ${tokenInfo.token}` };
        }
        lastExpiresAt = null;
        return {};
      } catch (error) {
        console.error("[graphql-ws] Failed to fetch token:", error);
        lastExpiresAt = null;
        return {};
      }
    },
    retryAttempts: Infinity,
    retryWait: async (retries) => {
      const delay = Math.min(1000 * Math.pow(2, retries), 30000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    },
    shouldRetry: () => true,
    on: {
      error: (error) => {
        console.error("[graphql-ws] Connection error:", error);
      },
      connected: (socket) => {
        console.debug("[graphql-ws] Connected");
        clearExpiryTimer();
        if (lastExpiresAt !== null) {
          const timeUntilClose = lastExpiresAt - Date.now() - BUFFER_MS;
          if (timeUntilClose > 0) {
            expiryTimer = setTimeout(() => {
              if ((socket as WebSocket).readyState === WebSocket.OPEN) {
                (socket as WebSocket).close(CloseCode.Forbidden, "Forbidden");
              }
            }, timeUntilClose);
          }
          // else: token is nearly expired, let server close it
        }
      },
      closed: (event) => {
        console.debug("[graphql-ws] Closed:", event);
        clearExpiryTimer();
      },
    },
  });

  return client;
}

export function disposeGraphQLWsClient(): void {
  clearExpiryTimer();
  if (client) {
    client.dispose();
    client = null;
  }
}
```

- [ ] **Step 3: Update notification subscription hook**

In `src/hooks/use-notification-subscription.ts`, replace lines 58-62:

```typescript
    const client = getGraphQLWsClient(async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("No access token available");
      return token;
    });
```

With:

```typescript
    const client = getGraphQLWsClient(async () => {
      return await getAccessToken();
    });
```

- [ ] **Step 4: Update chat subscription hook**

In `src/hooks/use-chat-subscription.ts`, replace lines 100-104:

```typescript
    const client = getGraphQLWsClient(async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("No access token available");
      return token;
    });
```

With:

```typescript
    const client = getGraphQLWsClient(async () => {
      return await getAccessToken();
    });
```

- [ ] **Step 5: Update game subscription hook — fetchToken and closed handler**

In `src/hooks/use-game-subscription.ts`, replace lines 159-163:

```typescript
    const client = getGraphQLWsClient(async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("No access token available");
      return token;
    });
```

With:

```typescript
    const client = getGraphQLWsClient(async () => {
      return await getAccessToken();
    });
```

Also replace lines 175-179 (the `closed` listener):

```typescript
    const unsubscribeClosed = client.on("closed", () => {
      if (!disposed && hasEverConnected) {
        onConnectionLostRef.current?.();
      }
    });
```

With:

```typescript
    const unsubscribeClosed = client.on("closed", (event) => {
      const code = (event as { code?: number })?.code;
      if (!disposed && hasEverConnected && code !== 4403) {
        onConnectionLostRef.current?.();
      }
    });
```

This prevents the "Connection lost" banner from showing during preemptive reconnects (close code 4403 is expected and retriable).

- [ ] **Step 6: Verify the build passes**

Run: `npm run build 2>&1 | tail -20`
Expected: PASS — all types now align.

- [ ] **Step 7: Commit**

```bash
git add src/components/auth/actions.ts src/lib/graphql-ws-client.ts src/hooks/use-notification-subscription.ts src/hooks/use-chat-subscription.ts src/hooks/use-game-subscription.ts
git commit -m "feat(ws-security): add preemptive token expiry reconnect and unauthenticated subscriptions

- getAccessToken() now returns TokenInfo { token, expiresAt } instead of string
- WebSocket client schedules preemptive close 30s before token expiry
- connectionParams catches fetchToken errors to avoid fatal 4005 close
- Subscription hooks allow null tokens for unauthenticated game subscriptions
- Game hook ignores close code 4403 for onConnectionLost (preemptive close)"
```

---

### Task 2: Update existing tests

**Files:**
- Modify: `__tests__/hooks/use-game-subscription.test.ts`
- Modify: `__tests__/hooks/use-chat-subscription.test.ts`
- Modify: `__tests__/hooks/use-notification-subscription.test.ts`

The existing tests mock `getAccessToken` to return `"mock-token"` (a string). They need to return `TokenInfo | null` instead.

- [ ] **Step 1: Update game subscription test mock**

In `__tests__/hooks/use-game-subscription.test.ts`, find:

```typescript
vi.mock("@/components/auth/actions", () => ({
  getAccessToken: vi.fn().mockResolvedValue("mock-token"),
}));
```

Replace with:

```typescript
vi.mock("@/components/auth/actions", () => ({
  getAccessToken: vi
    .fn()
    .mockResolvedValue({ token: "mock-token", expiresAt: null }),
}));
```

- [ ] **Step 2: Update chat subscription test mock**

In `__tests__/hooks/use-chat-subscription.test.ts`, find the same pattern and apply the same replacement:

```typescript
vi.mock("@/components/auth/actions", () => ({
  getAccessToken: vi
    .fn()
    .mockResolvedValue({ token: "mock-token", expiresAt: null }),
}));
```

- [ ] **Step 3: Update notification subscription test mock**

In `__tests__/hooks/use-notification-subscription.test.ts`, find the same pattern and apply the same replacement:

```typescript
vi.mock("@/components/auth/actions", () => ({
  getAccessToken: vi
    .fn()
    .mockResolvedValue({ token: "mock-token", expiresAt: null }),
}));
```

- [ ] **Step 4: Check for any other test files that mock getAccessToken**

Run: `grep -r "getAccessToken.*mock\|mockResolvedValue.*mock-token" __tests__/ --include="*.ts" --include="*.tsx" -l`

Update any additional files found with the same `{ token: "mock-token", expiresAt: null }` pattern.

- [ ] **Step 5: Run all tests**

Run: `npm test 2>&1 | tee /tmp/test-results.txt`
Expected: All existing tests PASS.

- [ ] **Step 6: Commit**

```bash
git add __tests__/
git commit -m "test(ws-security): update subscription test mocks for TokenInfo return type"
```

---

### Task 3: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Run lint**

Run: `npm run lint 2>&1 | tail -20`
Expected: PASS — no lint errors.

- [ ] **Step 2: Run production build**

Run: `npm run build 2>&1 | tail -20`
Expected: PASS.

- [ ] **Step 3: Run all tests**

Run: `npm test 2>&1 | tee /tmp/test-results.txt`
Expected: All tests PASS.
