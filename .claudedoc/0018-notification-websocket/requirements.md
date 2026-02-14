# Requirements: Real-Time Notification WebSocket

## Overview

Add WebSocket-based real-time notifications using the existing `notificationEvents` GraphQL subscription. When a new notification arrives, it should immediately appear in the notification list and update the unread badge count without requiring the user to manually refresh or reopen the popover. A fallback polling mechanism provides reliability when the WebSocket connection is unavailable.

## Functional Requirements

### FR-1: GraphQL WebSocket Client

- Create a reusable WebSocket client module that implements the `graphql-ws` protocol for connecting to the Spring Boot DGS backend.
- The WebSocket endpoint URL is derived from the existing `NEXT_PUBLIC_SERVER_URL` environment variable (same host as HTTP GraphQL, but using `ws://` or `wss://` scheme).
- The client must authenticate using the user's Keycloak access token, passed via the `graphql-ws` `ConnectionInit` payload (e.g., `{ "type": "connection_init", "payload": { "Authorization": "Bearer <token>" } }`).
- Since access tokens are stored server-side in Better Auth session cookies and are not directly accessible from client components, a new Next.js API route (e.g., `/api/auth/token`) must be created to securely expose the Keycloak access token to the client. This route must verify the session before returning the token.

### FR-2: Notification Subscription Hook

- Create a custom React hook (e.g., `useNotificationSubscription`) that manages the WebSocket subscription lifecycle.
- The hook subscribes to the `notificationEvents` subscription defined in the GraphQL schema.
- The subscription query should request: `notificationEvents { notification { id, body, isRead, createdDate } }`.
- The hook must only be active when the user is authenticated (has an active session).
- The hook provides a callback mechanism so the `NotificationBell` component can handle incoming notifications.

### FR-3: Real-Time Notification Updates

- When a `NotificationEvent` is received via the WebSocket subscription, the new notification must be prepended to the beginning of the existing notifications list in `NotificationBell` state.
- The unread badge count must update immediately to reflect the new notification (new notifications arrive with `isRead: false`).
- Duplicate notifications must be prevented -- if a notification with the same `id` already exists in the list, it should not be added again.
- The notification popover does not need to be open for updates to occur; the badge count should update regardless of popover state.

### FR-4: Fallback Polling

- Implement a fallback polling mechanism that fetches notifications every 5 minutes (300,000 ms) as a safety net.
- Polling runs independently of the WebSocket connection -- it always runs while the user is authenticated, whether or not the WebSocket is connected.
- When poll results arrive, the local notification list should be replaced with the fresh data from the server (full refresh of the first page).
- Polling must not run when the user is not authenticated or the component is unmounted.

### FR-5: WebSocket Connection Lifecycle

- The WebSocket connection must be established when the `NotificationBell` component mounts and the user is authenticated.
- The connection must be closed and cleaned up when the component unmounts or the user logs out.
- Implement automatic reconnection with exponential backoff when the connection drops unexpectedly. Suggested schedule: 1s, 2s, 4s, 8s, 16s, 30s (capped at 30 seconds).
- After a reconnection, the client should re-fetch the first page of notifications to catch any that were missed while disconnected.

### FR-6: Connection Status (Optional Visual Indicator)

- No visible connection status indicator is required for the initial implementation. The feature should work silently in the background.
- Connection errors should be logged to the browser console for debugging purposes.

## Non-Functional Requirements

### NFR-1: Security

- The user must be authenticated to establish a WebSocket connection.
- The access token API route (`/api/auth/token`) must validate the session before returning the token. It must not expose tokens to unauthenticated requests.
- The access token should not be stored in localStorage or sessionStorage. It should be fetched on demand when needed (connection init, reconnection).

### NFR-2: Performance

- Only one WebSocket connection should exist per browser tab. The connection should be shared or deduplicated if multiple components need it.
- The WebSocket connection should not interfere with the existing HTTP-based notification fetching (server actions remain functional and are still used for initial load, popover open, and "load more").

### NFR-3: Browser Compatibility

- The implementation should use the standard browser `WebSocket` API.
- Use the `graphql-ws` npm package as the client library since it implements the `graphql-ws` protocol that the Spring Boot DGS server uses.

## i18n

No new user-facing strings are required for this feature. The existing notification translation keys in `messages/en.json` under the `"notifications"` namespace are sufficient. All notification content comes from the server via the `body` field.

## Dependencies

### New NPM Package

- `graphql-ws` -- Client library implementing the `graphql-ws` WebSocket sub-protocol. This is the standard client for connecting to servers that use the `graphql-ws` protocol (including Spring Boot DGS).

### Note on `graphql` Peer Dependency

- The `graphql-ws` package may require `graphql` as a peer dependency. If so, install `graphql` as well. However, since this project uses `json-to-graphql-query` to build query strings (not the `graphql` tagged template literal), the `graphql` package is only needed to satisfy the peer dependency -- it will not be used directly for query construction.

## Affected Files

### New Files

| File | Purpose |
|---|---|
| `src/lib/graphql-ws-client.ts` | WebSocket client setup and connection management using `graphql-ws` |
| `src/hooks/use-notification-subscription.ts` | Custom hook managing the notification subscription lifecycle |
| `src/app/api/auth/token/route.ts` | API route to expose the Keycloak access token to client components |

### Modified Files

| File | Change |
|---|---|
| `src/components/notification/notification-bell.tsx` | Integrate the subscription hook and fallback polling |
| `src/lib/types/notification.ts` | Add `NotificationEvent` type |

## Out of Scope

- Browser push notifications (Web Notifications API / service workers).
- Toast/snackbar UI when a new notification arrives. The notification simply appears in the list and the badge updates.
- Notification sound effects.
- WebSocket subscriptions for other features (e.g., `chatEvents`). This feature focuses solely on `notificationEvents`.
- Marking notifications as read via WebSocket (continues to use the existing `readNotifications` mutation via server action).
