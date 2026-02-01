# Notification Bell - Requirements

## Overview

This feature adds a notification bell icon to the navbar, visible only to authenticated users. The bell displays an unread notification count badge and opens a popover dropdown listing the user's notifications. Users can mark individual notifications as read. Notifications are fetched on mount using cursor-based pagination, with real-time subscriptions deferred to a future iteration.

## GraphQL API

The backend provides the following notification operations (all authenticated):

**Query:**

```graphql
notifications(
  first: Int
  after: String
  last: Int
  before: String
): NotificationConnection!
```

Returns `NotificationEdge` nodes containing the `Notification` type (`id`, `body`, `isRead`, `createdDate`).

**Mutation:**

```graphql
readNotifications(input: ReadNotificationsInput!): ReadNotificationsResponse!
# input: { ids: [ID!]! }
# response: { notifications: [Notification!]! }
```

**Subscription (future, not in v1):**

```graphql
notificationEvents: NotificationEvent!
# event: { notification: Notification! }
```

---

## Functional Requirements

### FR-1: Notification Bell Visibility

**FR-1.1**: The navbar shall include a notification bell icon that is only visible to authenticated users.

**FR-1.2**: When the user is not authenticated, the notification bell shall not render at all (same pattern as `NavbarAuthLinks` using `useSession()`).

**FR-1.3**: The notification bell shall be positioned in the navbar between the navigation links area and the `AuthButton` (inside the `ml-auto` right-aligned section, before the `AuthButton`).

### FR-2: Unread Count Badge

**FR-2.1**: When there are unread notifications, the bell icon shall display a badge showing the count of unread notifications.

**FR-2.2**: The unread count shall be computed client-side from the fetched notifications (count of notifications where `isRead` is `false`).

**FR-2.3**: When the unread count is zero, the badge shall be hidden.

**FR-2.4**: When the unread count exceeds 99, the badge shall display "99+".

### FR-3: Notification Dropdown

**FR-3.1**: Clicking the notification bell icon shall open a popover/dropdown displaying the user's notifications.

**FR-3.2**: The dropdown shall display notifications in reverse chronological order (newest first, as returned by the API).

**FR-3.3**: Each notification item in the dropdown shall display:
- The notification body rendered as HTML (the backend returns Thymeleaf-rendered HTML templates). The HTML shall be rendered using `dangerouslySetInnerHTML` with appropriate sanitization (see SEC-2).
- A relative timestamp (e.g., "2 minutes ago", "1 hour ago", "3 days ago")
- A visual indicator distinguishing unread notifications from read ones (e.g., a dot or background highlight)

**FR-3.4**: The dropdown shall close when the user clicks outside of it, presses Escape, or navigates away.

### FR-4: Mark as Read

**FR-4.1**: Each unread notification shall have a "Mark as read" action (e.g., a button or clickable icon).

**FR-4.2**: Clicking "Mark as read" shall call the `readNotifications` mutation with the notification's ID.

**FR-4.3**: After a successful `readNotifications` mutation, the notification shall be updated in the local state to reflect `isRead: true`, and the unread count badge shall update accordingly.

**FR-4.4**: If the `readNotifications` mutation fails, an error message shall be shown inline in the dropdown (e.g., "Failed to mark as read").

### FR-5: Data Fetching

**FR-5.1**: Notifications shall be fetched when the notification bell component mounts (on page load for authenticated users) and re-fetched each time the bell icon is clicked (popover opened). Re-fetching replaces the current notification list with fresh data (resets pagination to the first page).

**FR-5.2**: The initial fetch shall request the first page of notifications using `first: 10`.

**FR-5.3**: The dropdown shall support loading additional notifications via a "Load more" button when `pageInfo.hasNextPage` is `true`, using cursor-based pagination (`after: endCursor`).

**FR-5.4**: All notification queries and mutations shall use the authenticated GraphQL client (`authQuery` / `authMutate`).

### FR-6: Error Handling

**FR-6.1**: If the initial notification fetch fails, the bell icon shall still render but without a badge. The dropdown shall display an error message with a retry option.

**FR-6.2**: If the "Load more" fetch fails, an error message shall appear at the bottom of the notification list with a retry option.

**FR-6.3**: If the mark-as-read mutation fails, a brief inline error message shall appear near the affected notification.

---

## UI/UX Requirements

### UX-1: Bell Icon

**UX-1.1**: Use the Lucide `Bell` icon for the notification bell.

**UX-1.2**: The bell icon shall be rendered as a shadcn/ui `Button` with `variant="ghost"` and `size="icon"` for consistent styling and accessible click target.

**UX-1.3**: The unread count badge shall be a small circular element positioned at the top-right corner of the bell icon, using a destructive/red background color with white text.

**UX-1.4**: The badge shall use a small font size (e.g., `text-xs`) and be sized to fit the count text (minimum width for single digits, expanding for double digits or "99+").

### UX-2: Dropdown Layout

**UX-2.1**: The dropdown shall use a shadcn/ui `Popover` component, anchored to the bell icon button and aligned to the right edge.

**UX-2.2**: The dropdown shall have a fixed width (e.g., 360px) and a maximum height with vertical scrolling for the notification list.

**UX-2.3**: The dropdown shall include a header section with the title "Notifications".

**UX-2.4**: When there are no notifications at all, the dropdown shall display an empty state message: "No notifications".

### UX-3: Notification Item

**UX-3.1**: Unread notifications shall be visually distinct from read notifications. Use a subtle background highlight (e.g., a light primary/accent background) for unread items and a small unread dot indicator.

**UX-3.2**: Each notification item shall display:
- Body as rendered HTML (the backend provides Thymeleaf-rendered HTML). Style inner HTML elements to fit the notification item context (constrain images, link colors, etc.).
- Relative time (secondary/muted text, e.g., "5 min ago")
- Mark-as-read button (only for unread notifications) -- a small icon button (e.g., Lucide `Check` or `MailOpen`)

**UX-3.3**: Notification items shall have subtle separators between them (e.g., a border or divider).

**UX-3.4**: The mark-as-read button shall show a loading spinner while the mutation is in flight.

### UX-4: Loading States

**UX-4.1**: While the initial notifications are loading, the dropdown shall show skeleton placeholders.

**UX-4.2**: The "Load more" button shall show a loading spinner when fetching additional pages.

**UX-4.3**: The bell icon itself shall not show a loading state -- it renders immediately and the badge appears once data is fetched.

### UX-5: Empty and Error States

**UX-5.1**: Empty state: centered text "No notifications" with a muted icon (e.g., Lucide `BellOff` or `Inbox`).

**UX-5.2**: Error state: centered error text with a "Retry" button.

---

## Technical Requirements

### TR-1: Data Fetching

**TR-1.1**: GraphQL query for fetching notifications:

```graphql
query {
  notifications(first: 10) {
    edges {
      cursor
      node {
        id
        body
        isRead
        createdDate
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

**TR-1.2**: GraphQL mutation for marking notifications as read:

```graphql
mutation {
  readNotifications(input: { ids: ["notif-id-1"] }) {
    notifications {
      id
      body
      isRead
      createdDate
    }
  }
}
```

**TR-1.3**: The initial page size shall be `first: 10`. Subsequent pages shall use `first: 10, after: endCursor`.

**TR-1.4**: All requests shall use the authenticated GraphQL client functions (`authQuery`, `authMutate`).

### TR-2: Component Structure

**TR-2.1**: Create the following new components:

| File | Type | Description |
|------|------|-------------|
| `src/components/notification/notification-bell.tsx` | Client Component | Bell icon with unread badge, popover trigger, and dropdown container |
| `src/components/notification/notification-list.tsx` | Client Component | Scrollable list of notification items with load-more |
| `src/components/notification/notification-item.tsx` | Client Component | Single notification row with mark-as-read action |
| `src/components/notification/actions.ts` | Server Actions | Server actions for fetching notifications and marking as read |

**TR-2.2**: Update `src/components/playground/navbar.tsx` to include the `NotificationBell` component, placed between the `NavigationMenu` and the `AuthButton` div.

### TR-3: State Management

**TR-3.1**: Notification state (list of notifications, pagination info, unread count) shall be managed via React `useState` within the `NotificationBell` component.

**TR-3.2**: When a notification is marked as read, update the local state optimistically (set `isRead: true` immediately) and revert on mutation failure.

**TR-3.3**: The unread count shall be derived from the local notification state: `notifications.filter(n => !n.isRead).length`.

### TR-4: Relative Time Formatting

**TR-4.1**: Use `next-intl`'s `useFormatter` hook with `relativeTime` or a similar approach to display relative timestamps (e.g., "5 minutes ago").

**TR-4.2**: If `next-intl` relative time formatting is not sufficient, use the `Intl.RelativeTimeFormat` API or a lightweight utility function.

### TR-5: shadcn/ui Components Required

**TR-5.1**: The following shadcn/ui components shall be used (install any that are not already present):
- `Button` - Bell icon button and mark-as-read button
- `Popover` / `PopoverTrigger` / `PopoverContent` - Dropdown container
- `Skeleton` - Loading states
- `Separator` - Dividers between notification items (optional, can use border classes instead)
- `ScrollArea` - Scrollable notification list within the dropdown

### TR-6: TypeScript Types

**TR-6.1**: Define the following response types:

```typescript
interface Notification {
  id: string;
  body: string;
  isRead: boolean;
  createdDate: string;
}

interface NotificationEdge {
  cursor: string;
  node: Notification;
}

interface NotificationConnection {
  edges: NotificationEdge[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}

interface ReadNotificationsResponse {
  notifications: Notification[];
}
```

---

## Internationalization (i18n)

### i18n-1: Translation Keys Required

Add the following keys to `messages/en.json` under a new `notifications` namespace:

```json
{
  "notifications": {
    "title": "Notifications",
    "empty": "No notifications",
    "markAsRead": "Mark as read",
    "loadMore": "Load more",
    "loading": "Loading notifications...",
    "error": "Failed to load notifications",
    "markAsReadError": "Failed to mark as read",
    "retry": "Retry"
  }
}
```

---

## Security Considerations

### SEC-1: Authentication

**SEC-1.1**: The notification bell component shall only render for authenticated users. It shall check session status via `useSession()` and return `null` if no session exists.

**SEC-1.2**: All GraphQL requests for notifications shall use the authenticated client (`authQuery` / `authMutate`), which automatically injects the Bearer token.

**SEC-1.3**: If the session expires while the dropdown is open, subsequent requests will fail. The error handling (FR-6) covers this scenario gracefully.

### SEC-2: HTML Sanitization

**SEC-2.1**: The notification `body` field contains HTML rendered by the backend (Thymeleaf templates). Before rendering with `dangerouslySetInnerHTML`, the HTML shall be sanitized using a library such as `DOMPurify` to prevent XSS attacks. Even though the HTML originates from our own backend, sanitization is a defense-in-depth measure.

**SEC-2.2**: The sanitization configuration shall allow basic formatting tags (e.g., `<b>`, `<i>`, `<a>`, `<span>`, `<p>`, `<br>`) and strip scripts, event handlers, and other dangerous elements.

### SEC-3: Input Validation

**SEC-3.1**: Notification IDs passed to the `readNotifications` mutation shall come only from previously fetched notification data (not from user input).

---

## Acceptance Criteria

1. The notification bell icon is visible in the navbar only for authenticated users
2. The bell icon is positioned between the navigation links and the AuthButton
3. When there are unread notifications, a red badge displays the unread count on the bell icon
4. The badge shows "99+" when the unread count exceeds 99
5. The badge is hidden when there are no unread notifications
6. Clicking the bell icon opens a popover dropdown with a list of notifications
7. Notifications are displayed in reverse chronological order with body text and relative timestamp
8. Unread notifications are visually distinct from read notifications (background highlight and/or dot indicator)
9. Each unread notification has a "Mark as read" button that calls the `readNotifications` mutation
10. After marking a notification as read, the UI updates optimistically (notification appearance changes, badge count decreases)
11. The dropdown supports "Load more" pagination when additional notifications exist
12. The dropdown shows skeleton loading state during initial fetch
13. The dropdown shows an empty state message when there are no notifications
14. Error states are handled gracefully with retry options for both fetching and marking as read
15. All user-facing text uses i18n translation keys from the `notifications` namespace
16. The feature uses `authQuery` and `authMutate` for all GraphQL requests

---

## Dependencies

- Existing authenticated GraphQL client infrastructure (`authQuery`, `authMutate` from `@/lib/graphql-request`)
- Existing i18n infrastructure (next-intl)
- Existing auth infrastructure (`useSession` from `@/lib/auth-client`)
- shadcn/ui components: Button, Popover, Skeleton, ScrollArea
- Lucide icons: Bell, Check (or MailOpen), BellOff (or Inbox)
- `dompurify` (+ `@types/dompurify`) - HTML sanitization for notification body content
- Navbar component (`src/components/playground/navbar.tsx`) will be modified

---

## Future Extensibility

**FE-1.1**: Real-time notifications via the `notificationEvents` GraphQL subscription can be added in a future iteration to push new notifications to the client without requiring a page refresh or manual poll.

**FE-1.2**: A "Mark all as read" action could be added to the dropdown header, calling `readNotifications` with all unread notification IDs.

**FE-1.3**: A dedicated notifications page (`/[locale]/notifications`) could provide a full-page view with filtering, search, and richer notification detail.

**FE-1.4**: Notification types could be differentiated visually (e.g., friend request notifications vs. game notifications) once the backend supports categorization.

**FE-1.5**: Browser push notifications or toast notifications could complement the bell dropdown for time-sensitive alerts.

**FE-1.6**: Polling at a configurable interval (e.g., every 60 seconds) could be added as an intermediate step before full subscription support.

**FE-1.7**: **Clickable notifications with navigation.** Add `referenceType` (enum: `GAME`, `USER`, `FRIENDSHIP`, etc.) and `referenceId` (ID) fields to the `Notification` schema on the backend. The frontend would own a mapping function that resolves `(referenceType, referenceId)` to a route (e.g., `GAME` + `"123"` → `/games/123`). This keeps routing logic out of the backend and allows each client (web, mobile) to resolve routes independently. Notifications without a reference would have `null` for both fields and remain non-clickable. Target this alongside subscriptions in v2.
