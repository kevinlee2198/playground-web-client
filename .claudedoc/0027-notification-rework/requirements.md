# Notification Rework -- Requirements

## Overview

The backend GraphQL schema for notifications has changed from a single concrete type with a server-rendered HTML `body` field to a polymorphic interface with three concrete types (`FriendRequestReceivedNotification`, `FriendRequestAcceptedNotification`, `GameStartedNotification`). Each concrete type carries a type-specific related entity instead of a `body` string.

The frontend must be updated to:

1. Query notifications using inline fragments for each concrete type
2. Render translated title and rich-text body per notification type using i18n
3. Support inline bold + hyperlink on specific entity names within the body text
4. Mark notifications as read on hover instead of via a check button
5. Navigate to the relevant entity when the user clicks a notification
6. Remove the `isomorphic-dompurify` dependency and all HTML sanitization logic

---

## Backend API

### Relevant GraphQL Operations

- `notifications` (query) -- fetches paginated notifications for the current user, ordered by `createdDate` DESC. Returns a `NotificationConnection` whose nodes are the `Notification` interface. Inline fragments are needed to select type-specific fields.
- `readNotifications` (mutation) -- marks notifications as read by ID. Accepts `ReadNotificationsInput { ids: [ID!]! }` and returns `ReadNotificationsResponse { notifications: [Notification!]! }`.
- `notificationEvents` (subscription) -- real-time notification delivery over WebSocket. Returns `NotificationEvent { notification: Notification! }`. Inline fragments are needed here as well.

### Polymorphic Notification Types

The `Notification` interface defines shared fields: `id`, `isRead`, `createdDate`.

Each concrete type adds one type-specific field:

| Concrete Type | Extra Field | Field Type | Description |
|---|---|---|---|
| `FriendRequestReceivedNotification` | `sender` | `User!` | The user who sent the friend request |
| `FriendRequestAcceptedNotification` | `accepter` | `User!` | The user who accepted your friend request |
| `GameStartedNotification` | `game` | `Game!` | The game that started |

The `User` type provides: `id`, `username`, `firstName`, `lastName`, `displayName`, `profilePicture`.

The `Game` type provides: `id`, `sportType`, `gameStatus`, and other fields.

### Schema Gaps

None identified. The backend schema fully supports all requirements described in this document.

---

## Functional Requirements

### FR-1: Polymorphic Notification Rendering

**FR-1.1**: Each notification shall display a **title** and a **body**. The title and body are determined by the notification's concrete type and rendered using i18n translation keys.

**FR-1.2**: The notification body shall use `next-intl`'s `t.rich()` API (already established in the codebase) to render inline rich text. Entity names within the body (e.g., a user's display name) shall be **bolded and hyperlinked** to the relevant entity page. The surrounding body text shall be plain, unlinked text.

**FR-1.3**: Notification content per type:

| Concrete Type | Title | Body | Linked Entity in Body |
|---|---|---|---|
| `FriendRequestReceivedNotification` | "Friend Request" | "{displayName} sent you a friend request" | `{displayName}` is bold + links to `/user/{username}` |
| `FriendRequestAcceptedNotification` | "Friend Request Accepted" | "{displayName} accepted your friend request" | `{displayName}` is bold + links to `/user/{username}` |
| `GameStartedNotification` | "Game Started" | "A {sportType} game has started" | `{sportType}` is bold + links to `/game/{id}` |

For user display names, always use the `displayName` field from the `User` type. For the sport type label, use the existing `sports` i18n keys (e.g., `sports.BASKETBALL` = "Basketball").

**FR-1.4**: If a notification arrives with an unrecognized `__typename` (future-proofing), it shall be rendered with a generic fallback -- no title, and a body of "You have a new notification." This prevents crashes when new notification types are added to the backend before the frontend is updated.

### FR-2: Hover to Mark as Read

**FR-2.1**: When the user hovers over an unread notification, it shall be automatically marked as read. The `readNotifications` mutation shall be called with the notification's ID.

**FR-2.2**: The existing check/acknowledge button on each notification item shall be **removed entirely**.

**FR-2.3**: The hover-to-read behavior shall only trigger for unread notifications (where `isRead` is `false`). Already-read notifications shall not re-trigger the mutation on hover.

**FR-2.4**: To avoid excessive API calls, the mark-as-read mutation should not fire immediately on mouse enter. A brief delay should be used so that rapidly scrolling through the list does not trigger a mutation for every notification the cursor passes over. The exact delay duration is a design decision.

**FR-2.5**: On touch devices where hover is not available, tapping a notification (which navigates) should also mark it as read.

### FR-3: Click Navigation

**FR-3.1**: Clicking anywhere on a notification item shall navigate the user to the relevant entity page:

| Concrete Type | Navigation Target |
|---|---|
| `FriendRequestReceivedNotification` | `/user/{sender.username}` (sender's profile) |
| `FriendRequestAcceptedNotification` | `/user/{accepter.username}` (accepter's profile) |
| `GameStartedNotification` | `/game/{game.id}` (game detail page) |

**FR-3.2**: Clicking on the bold hyperlinked entity name within the body text shall navigate to the same destination as clicking the notification item itself. There is no distinction between clicking the link and clicking the notification row -- they go to the same place.

**FR-3.3**: Navigation shall use the `Link` component from `@/i18n/navigation` to ensure locale-aware routing.

**FR-3.4**: Clicking a notification shall close the notification popover.

**FR-3.5**: For unrecognized notification types (FR-1.4 fallback), clicking shall be a no-op (no navigation).

### FR-4: Visual Design

**FR-4.1**: The visual design shall remain minimal. No per-type icons or color accents. The only visual differentiation between read and unread notifications is the existing unread dot indicator and the background accent.

**FR-4.2**: The notification item layout shall show:
- Unread dot indicator (left side, existing behavior)
- Title text (bold/semibold, small text)
- Body text (normal weight, small text, with inline rich text as described in FR-1.2)
- Relative timestamp (muted, extra-small text, existing behavior)

**FR-4.3**: The entire notification item shall have a cursor pointer to indicate it is clickable.

**FR-4.4**: The notification popover header, empty state, loading state, error state, load-more button, and overall layout shall remain unchanged from the current implementation.

### FR-5: GraphQL Query Updates

**FR-5.1**: All notification queries (paginated fetch, mark-as-read response, and subscription) shall use inline fragments to select type-specific fields from each concrete notification type.

**FR-5.2**: The fields to request per concrete type:

- **FriendRequestReceivedNotification**: `sender { id, username, displayName }`
- **FriendRequestAcceptedNotification**: `accepter { id, username, displayName }`
- **GameStartedNotification**: `game { id, sportType }`

**FR-5.3**: The shared `Notification` interface fields (`id`, `isRead`, `createdDate`) shall continue to be selected at the interface level.

**FR-5.4**: The `body` field shall no longer be queried. All references to `body` in queries, types, and rendering shall be removed.

### FR-6: Subscription Updates

**FR-6.1**: The WebSocket subscription query for `notificationEvents` shall be updated to use the same inline fragment structure as the paginated fetch query (FR-5.1 and FR-5.2).

**FR-6.2**: When a real-time notification arrives via the subscription, it shall be rendered using the same polymorphic rendering logic as notifications from the paginated fetch.

---

## i18n Requirements

### I18N-1: New Translation Keys

A dedicated top-level `notificationTemplates` namespace shall be added to `messages/en.json` for notification type titles and bodies. This keeps notification UI chrome (loading, error, empty states) separate from notification content templates.

The existing `notifications` namespace is unchanged. The new namespace:

```json
{
  "notificationTemplates": {
    "friendRequestReceived": {
      "title": "Friend Request",
      "body": "<link>{displayName}</link> sent you a friend request"
    },
    "friendRequestAccepted": {
      "title": "Friend Request Accepted",
      "body": "<link>{displayName}</link> accepted your friend request"
    },
    "gameStarted": {
      "title": "Game Started",
      "body": "A <link>{sportType}</link> game has started"
    },
    "unknown": {
      "body": "You have a new notification"
    }
  }
}
```

Components rendering notification content will use `useTranslations("notificationTemplates")` for titles/bodies, while continuing to use `useTranslations("notifications")` for UI chrome (header, empty state, errors, etc.).

### I18N-2: Rich Text Tags

The `<link>` tag in body strings shall be rendered by `t.rich()` as a bold, hyperlinked element (e.g., `<a>` wrapped in `<strong>`, or a styled `Link` component). The `link` render function receives the entity-specific URL and renders appropriately.

### I18N-3: Sport Type Labels

The `{sportType}` placeholder in the `gameStarted.body` string shall be resolved using the existing `sports` i18n keys (e.g., `t("sports.BASKETBALL")` yields "Basketball"). This value is then passed as a parameter to the notification body translation.

### I18N-4: Removed Keys

The `markAsRead` key is no longer used in the notification item UI (the check button is removed). However, it may be kept for accessibility or future use. No existing keys need to be removed.

---

## Security Requirements

### SEC-1: Authentication

**SEC-1.1**: All notification operations (query, mutation, subscription) require authentication. This is unchanged from the current implementation.

### SEC-2: Removal of HTML Rendering

**SEC-2.1**: The `dangerouslySetInnerHTML` usage in the notification item shall be completely removed. Notification content is now constructed from i18n translation strings and entity data, not from server-provided HTML.

**SEC-2.2**: The `isomorphic-dompurify` package shall be removed from the project entirely. It is only used in the notification component, and with the removal of HTML body rendering, it is no longer needed. This means removing it from `package.json` and running the package manager to update the lockfile.

### SEC-3: Link Safety

**SEC-3.1**: All navigation links within notification bodies are constructed from known entity data (`username`, game `id`) and use the app's internal `Link` component. There is no risk of open redirect or injection since the URLs are built from structured data, not from free-form user input.

---

## Error Handling

### ERR-1: Mark-as-Read Failure on Hover

**ERR-1.1**: If the `readNotifications` mutation fails when triggered by hover, the notification shall revert to its unread visual state (optimistic update rollback). No error toast or inline error message is shown for hover-triggered failures -- this is a silent, non-disruptive operation.

**ERR-1.2**: A failed hover-to-read attempt should not prevent the user from navigating by clicking the notification.

### ERR-2: Unrecognized Notification Type

**ERR-2.1**: As specified in FR-1.4, unrecognized `__typename` values shall render a generic fallback. No error is thrown or displayed.

### ERR-3: Missing Entity Data

**ERR-3.1**: If a notification arrives with a recognized type but the related entity data is unexpectedly null or missing (e.g., `sender` is null on a `FriendRequestReceivedNotification`), the notification shall render the fallback body ("You have a new notification") rather than crashing. Navigation shall be disabled for that item.

---

## Scope

### In Scope

- Update TypeScript notification types to model the polymorphic interface with concrete types
- Update GraphQL queries (fetch, mutation response, subscription) to use inline fragments
- Implement notification title + rich-text body rendering per concrete type
- Add i18n translation keys for all notification type titles and bodies
- Implement hover-to-mark-as-read behavior (replacing the check button)
- Implement click-to-navigate behavior per notification type
- Remove `dangerouslySetInnerHTML` and DOMPurify HTML sanitization
- Remove `isomorphic-dompurify` from project dependencies
- Handle unrecognized notification types gracefully (fallback rendering)

### Out of Scope

- "Mark all as read" button
- Notification grouping or collapsing (e.g., "3 friend requests")
- Notification settings or preferences (e.g., mute certain types)
- Push notifications (browser or mobile)
- Notification count badge changes (the existing unread count badge on the bell icon remains as-is)
- Adding new notification types beyond the three defined in the schema
- Per-type icons or color accents
