# Notification Rework -- Design

## Overview

This document describes the technical design for migrating the notification system from a single `Notification` type with a server-rendered HTML `body` field to a polymorphic interface with three concrete types. The frontend will render notification content from i18n translations, mark notifications as read on hover, navigate to relevant entities on click, and remove all HTML sanitization logic.

---

## 1. TypeScript Types

**File:** `/home/kevinlee/workspace/playground/playground-web-client/src/lib/types/notification.ts`

Replace the entire file. The new type system uses a discriminated union on `__typename` to model the polymorphic `Notification` interface.

```typescript
import { SportType } from "@/lib/constants";

/** Shared fields from the Notification interface */
interface BaseNotification {
  id: string;
  isRead: boolean;
  createdDate: string;
}

/** User fields needed for friend request notifications */
export interface NotificationUser {
  id: string;
  username: string;
  displayName: string;
}

/** Game fields needed for game started notifications */
export interface NotificationGame {
  id: string;
  sportType: SportType;
}

export interface FriendRequestReceivedNotification extends BaseNotification {
  __typename: "FriendRequestReceivedNotification";
  sender: NotificationUser;
}

export interface FriendRequestAcceptedNotification extends BaseNotification {
  __typename: "FriendRequestAcceptedNotification";
  accepter: NotificationUser;
}

export interface GameStartedNotification extends BaseNotification {
  __typename: "GameStartedNotification";
  game: NotificationGame;
}

/** Known notification types that the frontend can render with full content */
export type KnownNotification =
  | FriendRequestReceivedNotification
  | FriendRequestAcceptedNotification
  | GameStartedNotification;

/**
 * Discriminated union of all known notification types plus a catch-all.
 * The catch-all uses `BaseNotification & { __typename: string }` so that
 * unknown types from the backend (not matching any literal) are accepted
 * without breaking the discriminated union narrowing for known types.
 */
export type Notification = KnownNotification | (BaseNotification & { __typename: string });

/** Type guard to narrow Notification to a known concrete type */
export function isKnownNotificationType(n: Notification): n is KnownNotification {
  return (
    n.__typename === "FriendRequestReceivedNotification" ||
    n.__typename === "FriendRequestAcceptedNotification" ||
    n.__typename === "GameStartedNotification"
  );
}

export interface NotificationEdge {
  cursor: string;
  node: Notification;
}

export interface NotificationPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface NotificationConnection {
  edges: NotificationEdge[];
  pageInfo: NotificationPageInfo;
}

/** A real-time notification event from the GraphQL subscription */
export interface NotificationEvent {
  notification: Notification;
}

/** Result shape returned by the fetchNotifications server action */
export interface FetchNotificationsResult {
  success: boolean;
  edges: NotificationEdge[] | null;
  pageInfo: NotificationPageInfo | null;
  error: string | null;
}

/** Result shape returned by the markNotificationsAsRead server action */
export interface MarkNotificationsAsReadResult {
  success: boolean;
  notifications: Notification[] | null;
  error: string | null;
}
```

### Design decisions

- **Discriminated union with `__typename`**: This matches the established pattern in the codebase (e.g., chat messages use `__typename` to distinguish `TextChatMessage` from `MediaChatMessage`). The GraphQL response automatically includes `__typename` when inline fragments are used.
- **`KnownNotification` union + intersection catch-all**: The unknown fallback is modeled as `BaseNotification & { __typename: string }` rather than a separate `UnknownNotification` interface. This avoids a problem where `UnknownNotification.__typename: string` would be a supertype of the literal string types in other union members, breaking discriminated union narrowing. With the intersection approach, `switch` cases on `__typename` narrow correctly to known types, and the `default` branch handles any unrecognized `__typename` value. The `isKnownNotificationType` type guard provides an alternative narrowing path.
- **`SportType` enum for `sportType`**: `NotificationGame.sportType` uses the `SportType` enum from `@/lib/constants` instead of a plain `string`, matching the backend schema and the rest of the codebase.
- **Slim entity types**: `NotificationUser` and `NotificationGame` contain only the fields needed for rendering and navigation. They are not the full `User` or `Game` types from the schema.

---

## 2. GraphQL Query Fragment

**File:** `/home/kevinlee/workspace/playground/playground-web-client/src/lib/graphql-fragments.ts`

Add a new exported fragment for notification inline fragments. This follows the established pattern of reusable fragment objects in this file.

```typescript
/**
 * Inline fragments for Notification types.
 * Use as: __on: notificationInlineFragments
 */
export const notificationInlineFragments = [
  {
    __typeName: "FriendRequestReceivedNotification",
    sender: {
      id: true,
      username: true,
      displayName: true,
    },
  },
  {
    __typeName: "FriendRequestAcceptedNotification",
    accepter: {
      id: true,
      username: true,
      displayName: true,
    },
  },
  {
    __typeName: "GameStartedNotification",
    game: {
      id: true,
      sportType: true,
    },
  },
];
```

### Shared notification node selection object

Define a reusable node selection in `actions.ts` (not exported from fragments, since it combines interface-level and fragment-level fields):

```typescript
const notificationNodeSelection = {
  __typename: true,
  id: true,
  isRead: true,
  createdDate: true,
  __on: notificationInlineFragments,
};
```

This selection object will be used in:
1. The `notifications` query
2. The `readNotifications` mutation response
3. The `notificationEvents` subscription

---

## 3. Server Actions Updates

**File:** `/home/kevinlee/workspace/playground/playground-web-client/src/components/notification/actions.ts`

### Changes

1. Import `notificationInlineFragments` from `@/lib/graphql-fragments`.
2. Define `notificationNodeSelection` as a local constant using the fragment.
3. Update `buildNotificationsQuery` to use `notificationNodeSelection` instead of the flat `{ id, body, isRead, createdDate }` selection.
4. Update `markNotificationsAsRead` to use `notificationNodeSelection` instead of the flat selection.
5. Remove all references to `body`.

```typescript
"use server";

import { authMutate, authQuery } from "@/lib/graphql-request";
import { notificationInlineFragments } from "@/lib/graphql-fragments";
import type {
  FetchNotificationsResult,
  MarkNotificationsAsReadResult,
} from "@/lib/types/notification";

/** Reusable notification node selection for all notification queries */
const notificationNodeSelection = {
  __typename: true,
  id: true,
  isRead: true,
  createdDate: true,
  __on: notificationInlineFragments,
};

function buildNotificationsQuery(first: number, after?: string) {
  const args: Record<string, unknown> = { first };
  if (after) {
    args.after = after;
  }

  return {
    notifications: {
      __args: args,
      edges: {
        cursor: true,
        node: notificationNodeSelection,
      },
      pageInfo: {
        hasNextPage: true,
        endCursor: true,
      },
    },
  };
}

export async function fetchNotifications(
  first: number,
  after?: string,
): Promise<FetchNotificationsResult> {
  // ... same error handling pattern, unchanged
}

export async function markNotificationsAsRead(
  ids: string[],
): Promise<MarkNotificationsAsReadResult> {
  try {
    const response = await authMutate({
      readNotifications: {
        __args: {
          input: { ids },
        },
        notifications: notificationNodeSelection,
      },
    });
    // ... same error handling pattern
  } catch (error) {
    // ... same error handling
  }
}
```

---

## 4. Subscription Updates

**File:** `/home/kevinlee/workspace/playground/playground-web-client/src/hooks/use-notification-subscription.ts`

### Changes

1. Import `notificationInlineFragments` from `@/lib/graphql-fragments`.
2. Update the `SUBSCRIPTION_QUERY` to use inline fragments via `__on`.
3. Remove the `body` field from the selection.

```typescript
import { notificationInlineFragments } from "@/lib/graphql-fragments";

const SUBSCRIPTION_QUERY = jsonToGraphQLQuery({
  subscription: {
    notificationEvents: {
      notification: {
        __typename: true,
        id: true,
        isRead: true,
        createdDate: true,
        __on: notificationInlineFragments,
      },
    },
  },
});
```

The rest of the hook remains unchanged -- the `onNotification` callback already passes the full notification object to the parent component.

---

## 5. Component Hierarchy

### 5.1 NotificationBell (container)

**File:** `/home/kevinlee/workspace/playground/playground-web-client/src/components/notification/notification-bell.tsx`

**Changes:**
- Remove the `onMarkAsRead` prop from `NotificationList` (the check button is being removed).
- Instead, pass `onMarkAsRead` as a simpler function that just calls the server action and handles optimistic update. The function signature changes from returning `Promise<MarkNotificationsAsReadResult>` to `Promise<void>` since the notification item no longer needs to display per-item error state.
- Add `overscroll-contain` class to `ScrollArea` per Web Interface Guidelines.
- The `handleMarkAsRead` function stays in this component (it owns the `notifications` state and performs the optimistic update + rollback).

```tsx
// Updated ScrollArea with overscroll containment
<ScrollArea className="max-h-[400px] overscroll-contain">
  <NotificationList
    notifications={notifications}
    isLoading={isLoading}
    isLoadingMore={isLoadingMore}
    error={error}
    hasNextPage={pageInfo?.hasNextPage ?? false}
    onLoadMore={handleLoadMore}
    onMarkAsRead={handleMarkAsRead}
    onRetry={loadNotifications}
  />
</ScrollArea>
```

The `handleMarkAsRead` function uses `useCallback` for referential stability (it is passed to every `NotificationItem` and appears in their `useCallback` dependency arrays). It also tracks in-flight calls via a `Set<string>` ref to prevent duplicate calls and race-condition-safe rollback:

```typescript
const markingInFlightRef = useRef(new Set<string>());

const handleMarkAsRead = useCallback(async (id: string): Promise<void> => {
  // Skip if already in-flight for this id
  if (markingInFlightRef.current.has(id)) return;
  markingInFlightRef.current.add(id);

  // Optimistic update
  setNotifications((prev) =>
    prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
  );

  const result = await markNotificationsAsRead([id]);
  markingInFlightRef.current.delete(id);

  if (!result.success && !markingInFlightRef.current.has(id)) {
    // Silent rollback per ERR-1.1, only if no subsequent call is in-flight
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)),
    );
  }
}, []);
```

This addresses three concerns:
1. **`useCallback` with stable deps**: `setNotifications` (from `useState`) and `markNotificationsAsRead` (server action import) are both stable references, so the empty dependency array is correct. Without `useCallback`, every `NotificationBell` render would create a new function reference, invalidating all `NotificationItem` callbacks.
2. **Deduplication**: If hover fires, then the popover closes and reopens and hover fires again for the same notification, the second call is skipped while the first is still in-flight.
3. **Race-safe rollback**: If two calls somehow overlap (e.g., the first fails after the guard was already passed by the second), rollback only happens when no subsequent call is still in-flight for that id.

### 5.2 NotificationList (presentational list)

**File:** `/home/kevinlee/workspace/playground/playground-web-client/src/components/notification/notification-list.tsx`

**Changes:**
- Update `onMarkAsRead` prop type from `(id: string) => Promise<MarkNotificationsAsReadResult>` to `(id: string) => Promise<void>`.
- Remove the `MarkNotificationsAsReadResult` import.
- Everything else remains the same (loading skeleton, error state, empty state, load more button).

```typescript
interface NotificationListProps {
  notifications: Notification[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasNextPage: boolean;
  onLoadMore: () => void;
  onMarkAsRead: (id: string) => Promise<void>;
  onRetry: () => void;
}
```

### 5.3 NotificationItem (complete rewrite)

**File:** `/home/kevinlee/workspace/playground/playground-web-client/src/components/notification/notification-item.tsx`

This component is rewritten from scratch. It is a `"use client"` component because it needs:
- `useTranslations` for i18n
- `useFormatter` / `useNow` for relative time
- `onMouseEnter` / `onMouseLeave` event handlers for hover-to-read
- Ref-based debounce timer

**Props:**

```typescript
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => Promise<void>;
}
```

**Architecture:**

The component renders a `Link` from `@/i18n/navigation` as the outer container when a navigation target exists, or a `<div>` when it does not (unknown notification type or missing entity data). This satisfies the Web Interface Guidelines requirement that notification items be proper `<Link>` elements, not `<div onClick>`.

**Rendering logic:**

A helper function `getNotificationContent` extracts the rendering data from the notification. It accepts a `tSports` translator so that `sportType` is resolved inside the function rather than mutating the return value in render (which would break if the function were ever memoized).

The function also includes null guards on entity fields for each known type. While the GraphQL schema declares these as non-null (`sender: User!`, etc.), the WebSocket subscription path (`graphql-ws`) passes JSON directly to the `next` callback without GraphQL-level validation. A malformed message with missing entity data would cause `Cannot read properties of undefined` and crash the entire notification popover. When entity data is unexpectedly null, the function returns the fallback content per ERR-3.1.

```typescript
interface NotificationContent {
  /** i18n key prefix under notificationTemplates, e.g. "friendRequestReceived" */
  templateKey: string | null;
  /** The href for the Link wrapper and inline body link */
  href: string | null;
  /** Parameters to pass to t.rich() for the body */
  richParams: Record<string, string>;
}

const FALLBACK_CONTENT: NotificationContent = {
  templateKey: null,
  href: null,
  richParams: {},
};

function getNotificationContent(
  notification: Notification,
  tSports: (key: string) => string,
): NotificationContent {
  switch (notification.__typename) {
    case "FriendRequestReceivedNotification":
      if (!notification.sender) return FALLBACK_CONTENT;
      return {
        templateKey: "friendRequestReceived",
        href: `/user/${notification.sender.username}`,
        richParams: { displayName: notification.sender.displayName },
      };
    case "FriendRequestAcceptedNotification":
      if (!notification.accepter) return FALLBACK_CONTENT;
      return {
        templateKey: "friendRequestAccepted",
        href: `/user/${notification.accepter.username}`,
        richParams: { displayName: notification.accepter.displayName },
      };
    case "GameStartedNotification":
      if (!notification.game) return FALLBACK_CONTENT;
      return {
        templateKey: "gameStarted",
        href: `/game/${notification.game.id}`,
        richParams: { sportType: tSports(notification.game.sportType) },
      };
    default:
      return FALLBACK_CONTENT;
  }
}
```

**Title rendering:**

```tsx
{content.templateKey ? (
  <TypographySmall>{tNotif(`${content.templateKey}.title`)}</TypographySmall>
) : null}
```

For unknown types, no title is rendered (FR-1.4).

**Body rendering with `t.rich()`:**

For known notification types, the body uses `tNotif.rich()` with a `link` tag renderer. The `<link>` tag in the i18n string wraps the entity name and renders it as a bold `<strong>` element. Since the entire notification item is already a `<Link>`, the inline entity name does not need to be a separate link (FR-3.2: clicking anywhere goes to the same destination). The `<link>` tag renders as `<strong className="font-semibold">` for visual emphasis.

For `GameStartedNotification`, the `sportType` parameter is resolved inside `getNotificationContent` (which receives `tSports` as a parameter), so no additional mutation is needed in render.

The body:

```tsx
<p className="text-sm">
  {content.templateKey
    ? tNotif.rich(`${content.templateKey}.body`, {
        ...content.richParams,
        link: (chunks) => <strong className="font-semibold">{chunks}</strong>,
      })
    : tNotif("unknown.body")}
</p>
```

**Full component structure:**

```tsx
"use client";

import { Link } from "@/i18n/navigation";
import { TypographySmall } from "@/components/ui/typography";
import type { Notification } from "@/lib/types/notification";
import { cn } from "@/lib/utils";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";

const HOVER_READ_DELAY_MS = 600;

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => Promise<void>;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
}: NotificationItemProps) {
  const tNotif = useTranslations("notificationTemplates");
  const tSports = useTranslations("sports");
  const formatter = useFormatter();
  const now = useNow();
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const content = getNotificationContent(notification, tSports);

  const relativeTime = formatter.relativeTime(
    new Date(notification.createdDate),
    now,
  );

  // Clean up hover timer on unmount (e.g., popover closes during debounce)
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (notification.isRead) return;
    hoverTimerRef.current = setTimeout(() => {
      onMarkAsRead(notification.id);
    }, HOVER_READ_DELAY_MS);
  }, [notification.isRead, notification.id, onMarkAsRead]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  // On touch devices, mark as read immediately on click (FR-2.5)
  const handleClick = useCallback(() => {
    if (!notification.isRead) {
      // Clear any pending hover timer
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      onMarkAsRead(notification.id);
    }
  }, [notification.isRead, notification.id, onMarkAsRead]);

  const innerContent = (
    <>
      {/* Unread dot indicator */}
      <div className="mt-1.5 flex-shrink-0">
        {!notification.isRead ? (
          <div className="h-2 w-2 rounded-full bg-primary" />
        ) : (
          <div className="h-2 w-2" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {content.templateKey && (
          <TypographySmall>
            {tNotif(`${content.templateKey}.title`)}
          </TypographySmall>
        )}
        <p className="text-sm">
          {content.templateKey
            ? tNotif.rich(`${content.templateKey}.body`, {
                ...content.richParams,
                link: (chunks) => (
                  <strong className="font-semibold">{chunks}</strong>
                ),
              })
            : tNotif("unknown.body")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{relativeTime}</p>
      </div>
    </>
  );

  const sharedClasses = cn(
    "flex items-start gap-3 px-4 py-3 transition-colors touch-manipulation",
    !notification.isRead && "bg-accent/50",
    content.href && "cursor-pointer hover:bg-accent/80",
  );

  if (content.href) {
    return (
      <Link
        href={content.href}
        className={sharedClasses}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {innerContent}
      </Link>
    );
  }

  return (
    <div
      className={sharedClasses}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {innerContent}
    </div>
  );
}
```

### Design decisions for NotificationItem

1. **`Link` vs `<div onClick>`**: Per the Web Interface Guidelines, the notification item MUST be a `<Link>` from `@/i18n/navigation` for proper semantic HTML, accessibility, and right-click/open-in-new-tab support. Unknown notifications use a plain `<div>` since they have no navigation target.

2. **`touch-manipulation`**: Added to notification items per Web Interface Guidelines to eliminate the 300ms tap delay on touch devices.

3. **Hover-to-read debounce**: Uses a 600ms `setTimeout` via `useRef`. The timer is cleared on `mouseLeave`, preventing rapid-scroll triggering. The 600ms value balances responsiveness (user clearly paused on a notification) against accidental triggers. This is longer than a typical 300ms debounce but appropriate since the user must deliberately rest on the item.

4. **`prefers-reduced-motion`**: The hover delay is not animation-related -- it is a functional debounce for an API call. Reducing it for `prefers-reduced-motion` users would not be appropriate. The only motion-related element is the `transition-colors` class, which Tailwind CSS v4 already respects via the `@media (prefers-reduced-motion: reduce)` built-in.

5. **Click also marks as read (FR-2.5)**: On touch devices, hover events do not reliably fire. The `onClick` handler calls `onMarkAsRead` before navigation occurs. Since the Link component handles navigation and `onMarkAsRead` is fire-and-forget (no await needed before navigation), this works seamlessly.

6. **No separate link inside body text**: Since the entire notification item is wrapped in a `<Link>`, having a nested `<Link>` inside the body would be invalid HTML (`<a>` inside `<a>`). Instead, the `<link>` tag in i18n renders as `<strong>` only (bold text). This is correct per FR-3.2: clicking the entity name and clicking the notification row both navigate to the same destination.

7. **`TypographySmall` for title**: Uses the project's Typography component for the notification title. The body text uses a plain `<p>` with `text-sm` since `TypographyP` has `leading-7` and margin styles that are not appropriate for notification body text in a compact list. The timestamp uses a plain `<p>` with `text-xs text-muted-foreground`.

8. **Missing entity data (ERR-3.1)**: The `getNotificationContent` function includes explicit null guards (`if (!notification.sender)`, etc.) for each known type's entity field. While the GraphQL schema declares these as non-null, the WebSocket subscription path (`graphql-ws`) passes raw JSON to the callback without GraphQL-level validation. A malformed message would crash the entire popover without these guards. When entity data is unexpectedly null, the function returns `FALLBACK_CONTENT` (generic "You have a new notification" with no navigation).

9. **Hover timer cleanup on unmount**: A `useEffect` cleanup function clears the hover debounce timer when the component unmounts. Without this, if the popover closes during the 600ms debounce window, the `setTimeout` fires on an unmounted component, causing a wasted server mutation and potential state inconsistency if the popover is later reopened with fresh data.

10. **`sportType` resolved inside `getNotificationContent`**: The `tSports` translator is passed as a parameter to `getNotificationContent` so that all content resolution happens in one place. The previous approach mutated `content.richParams.sportType` in the render body, which would break if `getNotificationContent` were ever memoized.

11. **Unknown notifications can be marked as read on touch**: The `<div>` fallback (for unknown notification types) includes `onClick={handleClick}` so that touch device users can mark unknown notifications as read by tapping them. Without this, unknown notifications would be permanently unread on touch devices since hover events don't reliably fire.

---

## 6. i18n Updates

**File:** `/home/kevinlee/workspace/playground/playground-web-client/messages/en.json`

Add the `notificationTemplates` namespace as a new top-level key. Do not modify the existing `notifications` namespace.

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

The `<link>` tag is rendered by `t.rich()` with a custom renderer. The `{displayName}` and `{sportType}` are ICU MessageFormat parameters passed as the second argument to `t.rich()`.

The existing `notifications.markAsRead` key is retained since removing it is out of scope per I18N-4.

---

## 7. Dependency Removal

**File:** `/home/kevinlee/workspace/playground/playground-web-client/package.json`

Remove `isomorphic-dompurify` from the `dependencies` object. After editing `package.json`, run `npm install` to update the lockfile and remove the package from `node_modules`.

Verify no other files import from `isomorphic-dompurify`:

```bash
grep -r "isomorphic-dompurify" src/
```

This should only match `notification-item.tsx` which is being rewritten.

---

## 8. Popover Close on Navigation

**Requirement FR-3.4:** Clicking a notification should close the notification popover.

The current `NotificationBell` uses `<Popover open={isOpen} onOpenChange={handleOpenChange}>`. When a `<Link>` inside the popover triggers navigation, the Next.js router causes a re-render. However, since the popover is controlled via `isOpen` state, it may persist across client-side navigations.

**Solution:** Listen for route changes via the `usePathname` hook from `@/i18n/navigation`. When the pathname changes while the popover is open, close it.

The `isOpen` state is read via a ref rather than included in the `useEffect` dependency array. This prevents the effect from re-running on every popover open/close toggle (which would be wasteful and could cause a premature close if a soft navigation completes at the same render cycle as an `isOpen` toggle).

```typescript
import { usePathname } from "@/i18n/navigation";

// Inside NotificationBell:
const pathname = usePathname();
const prevPathnameRef = useRef(pathname);
const isOpenRef = useRef(isOpen);
isOpenRef.current = isOpen;

useEffect(() => {
  if (prevPathnameRef.current !== pathname && isOpenRef.current) {
    setIsOpen(false);
  }
  prevPathnameRef.current = pathname;
}, [pathname]);
```

This is more reliable than trying to close the popover on click, because the Link component handles navigation asynchronously (prefetching, soft navigation, etc.).

---

## 9. Complete File Change Summary

| File | Action | Description |
|---|---|---|
| `src/lib/types/notification.ts` | **Rewrite** | Replace single `Notification` type with discriminated union of concrete types |
| `src/lib/graphql-fragments.ts` | **Add export** | Add `notificationInlineFragments` array |
| `src/components/notification/actions.ts` | **Update** | Use `notificationNodeSelection` with inline fragments; remove `body` field |
| `src/hooks/use-notification-subscription.ts` | **Update** | Use `notificationInlineFragments` in subscription query; remove `body` field |
| `src/components/notification/notification-item.tsx` | **Rewrite** | Polymorphic rendering, Link wrapper, hover-to-read, remove DOMPurify |
| `src/components/notification/notification-list.tsx` | **Update** | Change `onMarkAsRead` return type from `Promise<MarkNotificationsAsReadResult>` to `Promise<void>`; remove unused import |
| `src/components/notification/notification-bell.tsx` | **Update** | Simplify `handleMarkAsRead`; add `overscroll-contain` to ScrollArea; add pathname-based popover close |
| `messages/en.json` | **Update** | Add `notificationTemplates` namespace |
| `package.json` | **Update** | Remove `isomorphic-dompurify` from dependencies |

---

## 10. Data Flow Diagram

```
NotificationBell (state owner)
  |-- fetchNotifications() ---- server action ---> authQuery (GraphQL)
  |-- markNotificationsAsRead() - server action ---> authMutate (GraphQL)
  |-- useNotificationSubscription() -- WebSocket --> graphql-ws
  |
  |-- notifications: Notification[] (state)
  |-- markingInFlightRef: Set<string> (dedup + race-safe rollback)
  |-- handleMarkAsRead(id) --> useCallback, optimistic update + server action
  |-- isOpenRef (ref mirror of isOpen for pathname effect)
  |
  +-- NotificationList (presentational)
       |
       +-- NotificationItem (per item, "use client")
            |-- getNotificationContent(notification, tSports) --> { templateKey, href, richParams }
            |-- useTranslations("notificationTemplates") --> tNotif
            |-- useTranslations("sports") --> tSports (passed to getNotificationContent)
            |-- tNotif.rich(`${templateKey}.body`, { ...richParams, link: ... })
            |-- <Link href={href}> or <div onClick> wrapper
            |-- onMouseEnter --> setTimeout(onMarkAsRead, 600ms)
            |-- onMouseLeave --> clearTimeout
            |-- onClick --> onMarkAsRead (touch devices + unknown type fallback)
            |-- useEffect cleanup --> clearTimeout on unmount
```

---

## 11. Implementation Checklist

The implementation agent should execute these steps in order:

1. **Update types** (`src/lib/types/notification.ts`) -- rewrite with discriminated union.
2. **Add fragment** (`src/lib/graphql-fragments.ts`) -- add `notificationInlineFragments`.
3. **Update server actions** (`src/components/notification/actions.ts`) -- use new fragment, remove `body`.
4. **Update subscription** (`src/hooks/use-notification-subscription.ts`) -- use new fragment, remove `body`.
5. **Rewrite NotificationItem** (`src/components/notification/notification-item.tsx`) -- complete rewrite per section 5.3.
6. **Update NotificationList** (`src/components/notification/notification-list.tsx`) -- update `onMarkAsRead` type.
7. **Update NotificationBell** (`src/components/notification/notification-bell.tsx`) -- simplify mark-as-read, add overscroll-contain, add pathname-based close.
8. **Update i18n** (`messages/en.json`) -- add `notificationTemplates` namespace.
9. **Remove dependency** -- remove `isomorphic-dompurify` from `package.json`, run `npm install`.
10. **Verify** -- run `npm run build` and `npm run lint` to ensure no type errors or lint violations.

---

## 12. Alternatives Considered

### Alternative A: Nested `<Link>` inside body text

Instead of wrapping the entire notification item in a `<Link>`, we could keep the item as a `<div>` and only have the entity name in the body be a `<Link>`. Clicking the outer div would use `router.push()` for navigation.

**Rejected because:** This violates the Web Interface Guidelines (must use semantic `<Link>`, not `<div onClick>`). It also prevents right-click/open-in-new-tab and hurts accessibility. The `<div onClick>` approach also requires managing keyboard navigation manually.

### Alternative B: Single translation namespace

Instead of a separate `notificationTemplates` namespace, we could nest notification type translations under the existing `notifications` namespace.

**Rejected because:** The requirements explicitly call for a separate `notificationTemplates` namespace to keep content templates separate from UI chrome. This separation is cleaner and aligns with the principle of separating concerns -- UI state strings (loading, error, empty) vs content templates (notification bodies).

### Alternative C: Immediate mark-as-read on hover (no debounce)

Fire the mutation immediately on `mouseEnter`.

**Rejected because:** FR-2.4 explicitly requires a delay to prevent excessive API calls when scrolling through the list. 600ms was chosen as the delay.

### Alternative D: `useCallback` + `onPointerEnter` instead of `onMouseEnter`

Using pointer events for better cross-device support.

**Considered but deferred:** `onMouseEnter` is sufficient here because the touch case is handled separately via `onClick`. Pointer events would unify the handlers but add complexity without clear benefit. The current design explicitly handles touch via the click handler (FR-2.5).

---

## 13. API Feedback

No schema changes are needed. The backend schema fully supports all requirements:

- The `Notification` interface with `id`, `isRead`, `createdDate` covers shared fields.
- Each concrete type (`FriendRequestReceivedNotification`, `FriendRequestAcceptedNotification`, `GameStartedNotification`) provides the exact entity fields needed.
- `ReadNotificationsInput` accepts an array of IDs, which works for single-item hover-to-read.
- The subscription returns `NotificationEvent { notification: Notification! }` which supports inline fragments.

The only minor observation: the `ReadNotificationsResponse` returns `notifications: [Notification!]!` with inline fragment support, so the mutation response can include the concrete type fields. However, since we perform an optimistic update locally and the mutation response is only used for rollback verification, we technically do not need the full concrete type fields in the mutation response. We include them anyway for consistency and to ensure the local state has complete data after a successful mutation.

---

## 14. Adversarial Review Incorporation

The following issues from the adversarial review (`adversarial-review.md`) were incorporated into this design:

| # | Issue | Severity | Resolution |
|---|-------|----------|------------|
| 1 | Missing entity null guards -- crashes on malformed WebSocket data | Critical | Added null guards in `getNotificationContent` for each known type's entity field. Returns `FALLBACK_CONTENT` when null. See section 5.3 |
| 2 | `UnknownNotification.__typename: string` breaks discriminated union | Critical | Replaced `UnknownNotification` interface with `BaseNotification & { __typename: string }` intersection. Added `KnownNotification` type and `isKnownNotificationType` type guard. See section 1 |
| 3 | Hover timer not cleaned up on unmount | High | Added `useEffect` cleanup in `NotificationItem`. See section 5.3 |
| 4 | Optimistic rollback race with concurrent mark-as-read calls | High | Added `markingInFlightRef` (`Set<string>`) to `NotificationBell` for deduplication and race-safe rollback. See section 5.1 |
| 5 | `handleMarkAsRead` not wrapped in `useCallback` | High | Wrapped in `useCallback` with empty dependency array. See section 5.1 |
| 6 | `usePathname` effect has `isOpen` in deps | Medium | Replaced `isOpen` in dependency array with `isOpenRef`. See section 8 |
| 7 | `sportType` typed as `string` instead of `SportType` enum | Medium | Changed `NotificationGame.sportType` to `SportType` from `@/lib/constants`. See section 1 |
| 8 | Mutating `getNotificationContent` return value in render | Medium | `tSports` is now passed as a parameter to `getNotificationContent`; `sportType` is resolved inside the function. See section 5.3 |
| 9 | No deduplication for hover-triggered mutations | Medium | Addressed by issue #4's in-flight `Set` fix |
| 10 | Unknown notifications can't be marked read on touch | Medium | Added `onClick={handleClick}` to the `<div>` fallback. See section 5.3 |
| 11 | `useNow()` without `updateInterval` -- stale timestamps | Low | Acknowledged as pre-existing behavior. Acceptable since the popover is short-lived and re-fetches on reopen. No change needed |
