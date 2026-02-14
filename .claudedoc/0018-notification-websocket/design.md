# Design: Real-Time Notification WebSocket

## Overview

This design adds WebSocket-based real-time notifications to the existing `NotificationBell` component. When a notification arrives via the `notificationEvents` GraphQL subscription, it is prepended to the notification list and the unread badge updates immediately. A 5-minute polling fallback provides reliability.

---

## 1. Environment Variable Concern

The requirements state that the WebSocket URL is derived from `NEXT_PUBLIC_SERVER_URL`. However, the codebase uses `API_SERVER_URL` (server-side only, in `/home/kevinlee/workspace/playground/playground-web-client/src/lib/graphql-request.ts`). There is no `NEXT_PUBLIC_*` variable for the backend URL today.

**Decision:** Introduce a new environment variable `NEXT_PUBLIC_API_SERVER_URL` that exposes the GraphQL backend base URL to the browser. The WebSocket client module will derive the `ws://` / `wss://` URL from this value. This variable must be added to `env.example`.

Alternatively, the token API route could return the WebSocket URL alongside the token, but that adds coupling and complexity for no meaningful security benefit since the backend URL is not a secret.

---

## 2. Token Exposure API Route

### Security Design

The Keycloak access token is stored server-side in encrypted cookies managed by Better Auth. Client components cannot read it directly. A lightweight Next.js Route Handler will expose it.

**File:** `/home/kevinlee/workspace/playground/playground-web-client/src/app/api/auth/token/route.ts`

```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthenticated" },
      { status: 401 },
    );
  }

  const tokenResponse = await auth.api.getAccessToken({
    headers: reqHeaders,
    body: { providerId: "keycloak" },
  });

  if (!tokenResponse?.accessToken) {
    return NextResponse.json(
      { error: "Token unavailable" },
      { status: 401 },
    );
  }

  return NextResponse.json({ accessToken: tokenResponse.accessToken });
}
```

**Security considerations:**
- Session is validated before returning any token.
- The route is `GET` only. No body parsing needed.
- The token is fetched on-demand per WebSocket connection init, never stored in `localStorage` or `sessionStorage`.
- The route is protected by the existing session cookie -- unauthenticated requests receive a 401.

---

## 3. WebSocket Client Module

**File:** `/home/kevinlee/workspace/playground/playground-web-client/src/lib/graphql-ws-client.ts`

This module wraps the `graphql-ws` library's `createClient` function with authentication and provides a singleton-like factory for the browser tab.

### Responsibilities

1. Derive the WebSocket URL from `NEXT_PUBLIC_API_SERVER_URL` (replace `http` with `ws`, append `/graphql`).
2. Fetch the access token from `/api/auth/token` on each connection init (handles token refresh on reconnect).
3. Configure automatic reconnection with exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped).
4. Export a function to get/create the client singleton.
5. Export a function to dispose the client (for logout/unmount).

### Key Implementation Details

```typescript
import { createClient, type Client } from "graphql-ws";

let client: Client | null = null;

function getWsUrl(): string {
  const httpUrl = process.env.NEXT_PUBLIC_API_SERVER_URL;
  if (!httpUrl) {
    throw new Error("NEXT_PUBLIC_API_SERVER_URL is not defined");
  }
  // Replace http(s) with ws(s)
  const wsUrl = httpUrl.replace(/^http/, "ws");
  return `${wsUrl}/graphql`;
}

async function fetchAccessToken(): Promise<string> {
  const response = await fetch("/api/auth/token");
  if (!response.ok) {
    throw new Error("Failed to fetch access token");
  }
  const data = await response.json();
  return data.accessToken;
}

export function getGraphQLWsClient(): Client {
  if (client) return client;

  client = createClient({
    url: getWsUrl(),
    connectionParams: async () => {
      const token = await fetchAccessToken();
      return { Authorization: `Bearer ${token}` };
    },
    retryAttempts: Infinity,
    retryWait: async (retries) => {
      const baseDelay = Math.min(1000 * Math.pow(2, retries), 30000);
      await new Promise((resolve) => setTimeout(resolve, baseDelay));
    },
    shouldRetry: () => true,
    on: {
      error: (error) => {
        console.error("[graphql-ws] Connection error:", error);
      },
      connected: () => {
        console.debug("[graphql-ws] Connected");
      },
      closed: (event) => {
        console.debug("[graphql-ws] Closed:", event);
      },
    },
  });

  return client;
}

export function disposeGraphQLWsClient(): void {
  if (client) {
    client.dispose();
    client = null;
  }
}
```

### Singleton Justification (NFR-2)

Only one WebSocket connection per browser tab. The module-level `client` variable ensures this. Multiple components calling `getGraphQLWsClient()` will share the same connection.

### Note on `graphql-ws` `connectionParams`

The `graphql-ws` library sends `connectionParams` as the `payload` of the `connection_init` message. Spring Boot DGS expects `Authorization` in this payload, which aligns with the library's default behavior. The `connectionParams` function is called on each connection attempt, so reconnections will get a fresh token.

---

## 4. Notification Subscription Hook

**File:** `/home/kevinlee/workspace/playground/playground-web-client/src/hooks/use-notification-subscription.ts`

### Interface

```typescript
"use client";

import { getGraphQLWsClient, disposeGraphQLWsClient } from "@/lib/graphql-ws-client";
import type { Notification } from "@/lib/types/notification";
import { useEffect, useRef } from "react";

interface UseNotificationSubscriptionOptions {
  /** Whether the user is authenticated and the subscription should be active */
  enabled: boolean;
  /** Called when a new notification arrives */
  onNotification: (notification: Notification) => void;
  /** Called when the connection is re-established (for re-fetching missed notifications) */
  onReconnect?: () => void;
}

export function useNotificationSubscription({
  enabled,
  onNotification,
  onReconnect,
}: UseNotificationSubscriptionOptions): void {
  // ...implementation below
}
```

### Implementation Approach

1. When `enabled` is `true`, call `getGraphQLWsClient()` and start a subscription using `client.iterate()` or `client.subscribe()`.
2. The subscription query string: `subscription { notificationEvents { notification { id body isRead createdDate } } }`.
3. On each received event, call `onNotification` with the parsed `Notification`.
4. Track connection state with the `on.connected` event. When a reconnection occurs (not the first connection), call `onReconnect` so the parent can re-fetch the first page to catch missed notifications.
5. On cleanup (unmount or `enabled` becomes `false`), unsubscribe.

**Why a raw string query instead of `json-to-graphql-query`:** The `graphql-ws` library's `subscribe` method accepts a `query` string. While we could use `json-to-graphql-query` to build it, the subscription query is simple and static. Using a plain string avoids importing the library into client bundles. Either approach works; the implementation engineer may choose based on bundle size preference.

### Reconnection Re-fetch

The `graphql-ws` library handles reconnection automatically via `retryAttempts`. On reconnect, the `on.connected` callback fires. The hook tracks whether this is the first connection. If it is a subsequent connection (reconnection), it invokes `onReconnect`, which triggers a full re-fetch of the first page in `NotificationBell` to pick up any missed notifications.

---

## 5. Fallback Polling

Polling is implemented directly in `NotificationBell` using `setInterval`, independent of the WebSocket.

### Approach

- A `useEffect` starts a 5-minute interval that calls the existing `fetchNotifications` server action.
- Polling replaces the entire notification list with fresh data (first page only).
- The interval is cleared on unmount or when `session?.user` becomes falsy.
- Polling and WebSocket are independent -- both run simultaneously when the user is authenticated.

```typescript
// Inside NotificationBell
useEffect(() => {
  if (!session?.user) return;

  const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
  const intervalId = setInterval(() => {
    loadNotifications();
  }, POLL_INTERVAL);

  return () => clearInterval(intervalId);
}, [session?.user, loadNotifications]);
```

---

## 6. NotificationBell Integration

**File:** `/home/kevinlee/workspace/playground/playground-web-client/src/components/notification/notification-bell.tsx`

### Changes to Existing Component

The component already manages `notifications` state as `Notification[]`. The following additions integrate the subscription and polling:

1. **Import and use the hook:**

```typescript
import { useNotificationSubscription } from "@/hooks/use-notification-subscription";
```

2. **Add incoming notification handler:**

```typescript
const handleIncomingNotification = useCallback((notification: Notification) => {
  setNotifications((prev) => {
    // Deduplicate: skip if already present
    if (prev.some((n) => n.id === notification.id)) {
      return prev;
    }
    return [notification, ...prev];
  });
}, []);
```

3. **Wire up the hook:**

```typescript
useNotificationSubscription({
  enabled: !!session?.user,
  onNotification: handleIncomingNotification,
  onReconnect: loadNotifications,
});
```

4. **Add polling effect** (as described in Section 5).

5. **Unread count** already derives from `notifications.filter((n) => !n.isRead).length` -- no changes needed. New notifications arrive with `isRead: false` and increment the count automatically.

### No changes to child components

`NotificationList` and `NotificationItem` are purely presentational. They render whatever `notifications` array they receive. No modifications needed.

---

## 7. Type Additions

**File:** `/home/kevinlee/workspace/playground/playground-web-client/src/lib/types/notification.ts`

Add the `NotificationEvent` type to match the GraphQL schema:

```typescript
/** A real-time notification event from the GraphQL subscription */
export interface NotificationEvent {
  notification: Notification;
}
```

---

## 8. Component Hierarchy

```
NavBar (server component)
  └── NotificationBell (client component) -- MODIFIED
        ├── useNotificationSubscription (new hook)
        │     └── graphql-ws-client (new module)
        │           └── /api/auth/token (new API route)
        ├── NotificationList (client component) -- UNCHANGED
        │     └── NotificationItem (client component) -- UNCHANGED
        └── actions.ts (server actions) -- UNCHANGED
```

---

## 9. Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ NotificationBell (client component)                         │
│                                                             │
│  State: notifications[], pageInfo, isOpen, error            │
│                                                             │
│  ┌──────────────┐  ┌────────────────────┐  ┌────────────┐  │
│  │ Initial Load  │  │ WebSocket Sub      │  │ Polling    │  │
│  │ (on mount)    │  │ (useNotification-  │  │ (5 min     │  │
│  │               │  │  Subscription)     │  │  interval) │  │
│  │ Server Action │  │                    │  │            │  │
│  │ fetchNotif.   │  │ graphql-ws client  │  │ Server     │  │
│  │ via authQuery │  │ via WebSocket      │  │ Action     │  │
│  └──────┬───────┘  └────────┬───────────┘  └─────┬──────┘  │
│         │                   │                     │         │
│         │  replaces list    │  prepends item      │ replaces│
│         └───────────────────┴─────────────────────┘         │
│                             │                               │
│                    setNotifications()                        │
└─────────────────────────────────────────────────────────────┘
```

### GraphQL Operations Used

| Operation | Type | Source | Purpose |
|---|---|---|---|
| `notifications(first, after)` | Query | Server action (`authQuery`) | Initial load, popover open, load more, polling, reconnect re-fetch |
| `readNotifications(input)` | Mutation | Server action (`authMutate`) | Mark as read (unchanged) |
| `notificationEvents` | Subscription | WebSocket (`graphql-ws`) | Real-time new notifications |

### Subscription Query

```graphql
subscription {
  notificationEvents {
    notification {
      id
      body
      isRead
      createdDate
    }
  }
}
```

This aligns with the schema at line 1426-1427 of `schema.graphqls`:
```graphql
type Subscription {
  chatEvents(chatRoomId: ID!): ChatEvent!
  notificationEvents: NotificationEvent!
}
```

And the `NotificationEvent` type at line 1679-1681:
```graphql
type NotificationEvent {
  notification: Notification!
}
```

---

## 10. State Management

No new global state management is introduced. The `NotificationBell` component continues to own the `notifications` array via `useState`. The subscription hook communicates via callbacks -- this keeps the architecture simple and avoids adding a state management library.

**Why not a context or global store?** Only `NotificationBell` consumes notification state. There is no other component that needs access to the notification list or unread count. If that changes in the future (e.g., a notification count in a sidebar), a context could be introduced then.

---

## 11. New Files Summary

| File | Type | Purpose |
|---|---|---|
| `src/app/api/auth/token/route.ts` | API Route Handler | Exposes Keycloak access token to authenticated client components |
| `src/lib/graphql-ws-client.ts` | Client module | WebSocket client singleton with auth and reconnection |
| `src/hooks/use-notification-subscription.ts` | React hook | Manages subscription lifecycle, delivers events to component |

## 12. Modified Files Summary

| File | Change |
|---|---|
| `src/components/notification/notification-bell.tsx` | Add subscription hook integration, add polling interval, add incoming notification handler |
| `src/lib/types/notification.ts` | Add `NotificationEvent` interface |
| `env.example` | Add `NEXT_PUBLIC_API_SERVER_URL` |

---

## 13. NPM Dependencies

| Package | Purpose | Notes |
|---|---|---|
| `graphql-ws` | WebSocket client implementing `graphql-ws` sub-protocol | Required for Spring Boot DGS subscription support |
| `graphql` | Peer dependency of `graphql-ws` | Not used directly; only satisfies peer dependency |

Install: `npm install graphql-ws graphql`

---

## 14. i18n

No new translation keys are needed. The requirements document confirms this. All notification content comes from the server `body` field, and existing keys in `messages/en.json` under `"notifications"` cover all UI states.

---

## 15. shadcn/ui Components

No new shadcn/ui components needed. The existing components used by the notification feature are sufficient:
- `Popover`, `PopoverContent`, `PopoverTrigger`
- `Button`
- `ScrollArea`
- `Skeleton`
- `Empty` (custom)

---

## 16. Alternative Approaches and Trade-offs

### A. Server-Sent Events (SSE) Instead of WebSocket

**Approach:** Use SSE instead of WebSocket for one-way server-to-client notifications.

**Pros:**
- Simpler protocol; works through HTTP proxies without upgrade.
- Built-in browser reconnection.
- No additional library needed.

**Cons:**
- The backend (Spring Boot DGS) implements the `graphql-ws` protocol, not SSE. Using SSE would require backend changes.
- Cannot be reused for bidirectional features like chat subscriptions later.

**Verdict:** WebSocket is the correct choice given the existing backend.

### B. Token Passed via Cookie Instead of API Route

**Approach:** Set the access token in a regular (non-HttpOnly) cookie so the client can read it directly.

**Pros:**
- No API route needed.

**Cons:**
- Exposing tokens in non-HttpOnly cookies is a security anti-pattern (XSS vulnerability).
- Better Auth already manages cookies; fighting its storage model creates fragility.

**Verdict:** The API route approach is safer and aligns with security best practices.

### C. WebSocket Connection in a React Context / Provider

**Approach:** Create a `WebSocketProvider` context that wraps the app and manages the connection globally.

**Pros:**
- Multiple components could share the same connection state.
- Connection status could be surfaced anywhere in the component tree.

**Cons:**
- Over-engineering for a single consumer (`NotificationBell`).
- The module-level singleton in `graphql-ws-client.ts` already ensures one connection per tab.
- A provider would force the connection to stay open even on pages where notifications are not rendered.

**Verdict:** Not needed now. The singleton module pattern is sufficient. This could be revisited when chat subscriptions are added.

---

## 17. API / Schema Feedback

The GraphQL schema is sufficient for this feature. The `notificationEvents` subscription and `Notification` type provide all required fields. No backend schema changes are needed.

One potential future improvement: the subscription could support a `since: DateTime` argument so the client could request only notifications created after its last-known timestamp on reconnect, rather than re-fetching the full first page. This is not required for the current implementation.

---

## 18. Cleanup on Logout

When the user logs out (`session?.user` becomes `null`):

1. The `useNotificationSubscription` hook detects `enabled: false` and unsubscribes.
2. The polling `useEffect` cleanup clears the interval.
3. The `NotificationBell` renders `null` (existing behavior on line 56).
4. The WebSocket client should be disposed. The hook's cleanup will call `disposeGraphQLWsClient()` to close the connection and reset the singleton, ensuring no stale connections remain.
