# Notification Bell - Design Document

## Overview

This document describes the technical design for the Notification Bell feature, which adds a bell icon with unread count badge to the navbar for authenticated users. Clicking the bell opens a popover dropdown listing notifications with mark-as-read functionality and cursor-based pagination.

---

## 1. Component Architecture

### New Files

| File | Type | Description |
|------|------|-------------|
| `src/components/notification/notification-bell.tsx` | Client Component | Bell icon with unread badge, popover container, orchestrates fetching and state |
| `src/components/notification/notification-list.tsx` | Client Component | Scrollable list of notifications with load-more and empty/error states |
| `src/components/notification/notification-item.tsx` | Client Component | Single notification row with HTML body, timestamp, and mark-as-read action |
| `src/components/notification/actions.ts` | Server Actions | `fetchNotifications` and `markNotificationsAsRead` server actions |
| `src/lib/types/notification.ts` | Types | Notification response and action result types |

### Modified Files

| File | Change |
|------|--------|
| `src/components/playground/navbar.tsx` | Add `<NotificationBell />` between the `NavigationMenu` and the `<div className="ml-auto">` containing `AuthButton` |
| `messages/en.json` | Add `notifications` namespace with all i18n keys |

### Component Hierarchy

```
navbar.tsx (client)
  +-- ... (existing nav links, search, etc.)
  +-- <div className="ml-auto flex items-center gap-2">
        +-- NotificationBell (client) [only renders for authenticated users]
        |     +-- Button (bell icon + badge)
        |     +-- Popover
        |           +-- PopoverContent
        |                 +-- Header ("Notifications")
        |                 +-- ScrollArea
        |                       +-- NotificationList (client)
        |                             +-- NotificationItem (client) [per notification]
        |                             |     +-- HTML body (sanitized via DOMPurify)
        |                             |     +-- Relative timestamp
        |                             |     +-- Mark-as-read button (unread only)
        |                             +-- "Load more" button
        |                             +-- Loading skeletons / Empty state / Error state
        +-- AuthButton
```

---

## 2. TypeScript Type Definitions

### `src/lib/types/notification.ts`

```typescript
/** A notification as returned by the GraphQL API */
export interface Notification {
  id: string;
  body: string;
  isRead: boolean;
  createdDate: string;
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

These types follow the project convention of `T | null` for nullable response fields. The `Notification` type fields are all non-nullable on the GraphQL schema (id, body, isRead, createdDate are all `!` fields), so no nullable fields on the entity itself.

---

## 3. GraphQL Query Definitions

### Fetch Notifications Query (json-to-graphql-query format)

```typescript
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
        node: {
          id: true,
          body: true,
          isRead: true,
          createdDate: true,
        },
      },
      pageInfo: {
        hasNextPage: true,
        endCursor: true,
      },
    },
  };
}
```

### Mark as Read Mutation

```typescript
function buildReadNotificationsMutation(ids: string[]) {
  return {
    readNotifications: {
      __args: {
        input: { ids },
      },
      notifications: {
        id: true,
        body: true,
        isRead: true,
        createdDate: true,
      },
    },
  };
}
```

### Schema Verification

The GraphQL schema at `/home/kevinlee/workspace/playground/playground-web-client/schema.graphqls` confirms:

- **Query `notifications`** (lines 1280-1285): Supports `first`, `after`, `last`, `before` pagination args, returns `NotificationConnection!`. Requires authentication.
- **Mutation `readNotifications`** (line 1445): Takes `ReadNotificationsInput!` which has `ids: [ID!]!`, returns `ReadNotificationsResponse!` with `notifications: [Notification!]!`.
- **Type `Notification`** (lines 137-142): Has `id: ID!`, `body: String!`, `isRead: Boolean!`, `createdDate: DateTime!`.
- **Subscription `notificationEvents`** (line 1491): Exists but is deferred to a future iteration per requirements.

The schema fully supports all operations needed for this feature. No backend changes are required.

---

## 4. Server Actions

### `src/components/notification/actions.ts`

```typescript
"use server";

import { authQuery, authMutate } from "@/lib/graphql-request";
import type {
  FetchNotificationsResult,
  MarkNotificationsAsReadResult,
} from "@/lib/types/notification";

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
        node: {
          id: true,
          body: true,
          isRead: true,
          createdDate: true,
        },
      },
      pageInfo: {
        hasNextPage: true,
        endCursor: true,
      },
    },
  };
}

/**
 * Fetch notifications for the current user.
 * Always uses authQuery since notifications require authentication.
 */
export async function fetchNotifications(
  first: number,
  after?: string
): Promise<FetchNotificationsResult> {
  try {
    const queryObj = buildNotificationsQuery(first, after);
    const response = await authQuery(queryObj);

    if (response.errors?.length > 0) {
      return {
        success: false,
        edges: null,
        pageInfo: null,
        error: response.errors[0].message,
      };
    }

    const data = response.data?.notifications;
    return {
      success: true,
      edges: data?.edges ?? [],
      pageInfo: data?.pageInfo ?? { hasNextPage: false, endCursor: null },
      error: null,
    };
  } catch {
    return {
      success: false,
      edges: null,
      pageInfo: null,
      error: "Failed to load notifications",
    };
  }
}

/**
 * Mark one or more notifications as read.
 */
export async function markNotificationsAsRead(
  ids: string[]
): Promise<MarkNotificationsAsReadResult> {
  try {
    const response = await authMutate({
      readNotifications: {
        __args: {
          input: { ids },
        },
        notifications: {
          id: true,
          body: true,
          isRead: true,
          createdDate: true,
        },
      },
    });

    if (response.errors?.length > 0) {
      return {
        success: false,
        notifications: null,
        error: response.errors[0].message,
      };
    }

    return {
      success: true,
      notifications: response.data?.readNotifications?.notifications ?? [],
      error: null,
    };
  } catch {
    return {
      success: false,
      notifications: null,
      error: "Failed to mark as read",
    };
  }
}
```

Design decision: Unlike the search actions which branch between `authQuery` and `query`, notification actions always use `authQuery`/`authMutate` since notifications inherently require authentication. There is no unauthenticated path.

---

## 5. Component Specifications

### 5.1 NotificationBell (`src/components/notification/notification-bell.tsx`)

**Directive:** `"use client"`

**Props:** None (self-contained, checks auth internally)

**Responsibilities:**
- Checks `useSession()` and returns `null` if not authenticated (same pattern as `NavbarAuthLinks`)
- Renders a bell `Button` (variant="ghost", size="icon") with an unread count badge
- Manages a `Popover` that opens/closes on bell click
- Fetches notifications on mount via `useEffect`
- Re-fetches (resets to first page) each time the popover opens
- Computes unread count from local state: `notifications.filter(n => !n.isRead).length`
- Passes notification data and callbacks to `NotificationList`

**State:**

| State | Type | Purpose |
|-------|------|---------|
| `notifications` | `Notification[]` | All fetched notifications (accumulated across pages) |
| `pageInfo` | `NotificationPageInfo \| null` | Cursor pagination info for load-more |
| `isOpen` | `boolean` | Popover open/closed state |
| `isLoading` | `boolean` | True during initial fetch or re-fetch |
| `isLoadingMore` | `boolean` | True during load-more fetch (via `useTransition`) |
| `error` | `string \| null` | Error from fetch |

**Fetch behavior:**
- On mount: call `fetchNotifications(10)` via `useEffect` to populate the bell badge immediately
- On popover open (`onOpenChange` -> true): call `fetchNotifications(10)` again, replacing the current list (reset pagination to page 1). This ensures fresh data each time the user opens the dropdown.
- Load more: call `fetchNotifications(10, endCursor)` and append results to the existing list

**Badge logic:**
- Compute `unreadCount` from `notifications.filter(n => !n.isRead).length`
- If `unreadCount === 0`: no badge rendered
- If `unreadCount > 99`: display "99+"
- Otherwise: display the count

**Component sketch:**

```tsx
"use client";

import { fetchNotifications, markNotificationsAsRead } from "@/components/notification/actions";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/lib/auth-client";
import type { Notification, NotificationPageInfo } from "@/lib/types/notification";
import { cn } from "@/lib/utils";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";
import { NotificationList } from "./notification-list";

export function NotificationBell() {
  const { data: session } = useSession();
  const t = useTranslations("notifications");

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pageInfo, setPageInfo] = useState<NotificationPageInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, startLoadMore] = useTransition();

  if (!session?.user) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await fetchNotifications(10);
    if (result.success) {
      setNotifications(result.edges?.map((e) => e.node) ?? []);
      setPageInfo(result.pageInfo);
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  }, []);

  // Fetch on mount
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (open) {
      // Re-fetch fresh data when opening
      loadNotifications();
    }
  }

  function handleLoadMore() {
    if (!pageInfo?.endCursor) return;
    startLoadMore(async () => {
      const result = await fetchNotifications(10, pageInfo.endCursor!);
      if (result.success) {
        setNotifications((prev) => [
          ...prev,
          ...(result.edges?.map((e) => e.node) ?? []),
        ]);
        setPageInfo(result.pageInfo);
      } else {
        setError(result.error);
      }
    });
  }

  async function handleMarkAsRead(id: string) {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );

    const result = await markNotificationsAsRead([id]);
    if (!result.success) {
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n))
      );
      // Error is surfaced per-item in NotificationItem
    }
    return result;
  }

  const displayCount = unreadCount > 99 ? "99+" : unreadCount.toString();

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -right-1 -top-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-medium",
                unreadCount > 9 ? "h-5 min-w-5 px-1" : "h-4 w-4"
              )}
            >
              {displayCount}
            </span>
          )}
          <span className="sr-only">{t("title")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">{t("title")}</h3>
        </div>
        <ScrollArea className="max-h-[400px]">
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
      </PopoverContent>
    </Popover>
  );
}
```

**Note on conditional hook usage:** The `useSession()` check and early return happens before hooks like `useState` in the sketch above. This is intentional -- `useSession()` is called unconditionally at the top. The early `return null` is after all hooks are declared. The sketch above is illustrative; the actual implementation must ensure all hooks are called before any conditional returns.

### 5.2 NotificationList (`src/components/notification/notification-list.tsx`)

**Directive:** `"use client"`

**Props:**

```typescript
interface NotificationListProps {
  notifications: Notification[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasNextPage: boolean;
  onLoadMore: () => void;
  onMarkAsRead: (id: string) => Promise<MarkNotificationsAsReadResult>;
  onRetry: () => void;
}
```

**Responsibilities:**
- Renders loading skeletons when `isLoading` is true
- Renders error state with retry button when `error` is non-null and no notifications loaded
- Renders empty state when notifications array is empty and not loading
- Renders `NotificationItem` for each notification
- Renders "Load more" button when `hasNextPage` is true
- Renders load-more error state at bottom of list if error occurs during pagination

**Component sketch:**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Notification } from "@/lib/types/notification";
import type { MarkNotificationsAsReadResult } from "@/lib/types/notification";
import { BellOff, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { NotificationItem } from "./notification-item";

interface NotificationListProps {
  notifications: Notification[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasNextPage: boolean;
  onLoadMore: () => void;
  onMarkAsRead: (id: string) => Promise<MarkNotificationsAsReadResult>;
  onRetry: () => void;
}

export function NotificationList({
  notifications,
  isLoading,
  isLoadingMore,
  error,
  hasNextPage,
  onLoadMore,
  onMarkAsRead,
  onRetry,
}: NotificationListProps) {
  const t = useTranslations("notifications");

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="divide-y">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 px-4 py-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  // Error state (no data loaded)
  if (error && notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-8">
        <p className="text-sm text-destructive">{t("error")}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  // Empty state
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-8">
        <BellOff className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  // Notification list
  return (
    <div className="divide-y">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkAsRead={onMarkAsRead}
        />
      ))}

      {/* Load more error */}
      {error && notifications.length > 0 && (
        <div className="flex items-center justify-center gap-2 px-4 py-3">
          <p className="text-xs text-destructive">{t("error")}</p>
          <Button variant="outline" size="sm" onClick={onLoadMore}>
            {t("retry")}
          </Button>
        </div>
      )}

      {/* Load more button */}
      {hasNextPage && !error && (
        <div className="flex justify-center px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            {t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
```

### 5.3 NotificationItem (`src/components/notification/notification-item.tsx`)

**Directive:** `"use client"`

**Props:**

```typescript
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => Promise<MarkNotificationsAsReadResult>;
}
```

**Responsibilities:**
- Renders the notification body as sanitized HTML using `dangerouslySetInnerHTML`
- Renders a relative timestamp using `useFormatter` from `next-intl`
- Shows a visual indicator (background highlight + dot) for unread notifications
- Shows a mark-as-read icon button for unread notifications, with loading spinner during mutation
- Shows inline error text if mark-as-read fails

**HTML Sanitization:**
- Uses `DOMPurify` (client-side only) to sanitize the `body` HTML before rendering
- DOMPurify is instantiated lazily since it requires a DOM environment (`typeof window !== "undefined"`)
- Allowed tags: `b`, `i`, `em`, `strong`, `a`, `span`, `p`, `br`, `ul`, `ol`, `li`
- Strips all scripts, event handlers, `style` attributes (uses `FORBID_ATTR: ['style']` or keep for inline styling depending on needs), and dangerous elements

**Relative Time Formatting:**
- Use `useFormatter` from `next-intl` with `formatter.relativeTime(new Date(notification.createdDate))` for relative timestamps
- `next-intl`'s `useFormatter` provides `relativeTime` which accepts a `Date` and returns strings like "5 minutes ago"

**Component sketch:**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import type { Notification, MarkNotificationsAsReadResult } from "@/lib/types/notification";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";
import { Check, Loader2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => Promise<MarkNotificationsAsReadResult>;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
}: NotificationItemProps) {
  const t = useTranslations("notifications");
  const formatter = useFormatter();
  const [isMarking, setIsMarking] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);

  const sanitizedBody =
    typeof window !== "undefined"
      ? DOMPurify.sanitize(notification.body, {
          ALLOWED_TAGS: [
            "b", "i", "em", "strong", "a", "span", "p", "br",
            "ul", "ol", "li",
          ],
          ALLOWED_ATTR: ["href", "target", "rel", "class"],
        })
      : notification.body;

  const relativeTime = formatter.relativeTime(
    new Date(notification.createdDate)
  );

  async function handleMarkAsRead() {
    setIsMarking(true);
    setMarkError(null);
    const result = await onMarkAsRead(notification.id);
    if (!result.success) {
      setMarkError(t("markAsReadError"));
    }
    setIsMarking(false);
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors",
        !notification.isRead && "bg-accent/50"
      )}
    >
      {/* Unread dot indicator */}
      <div className="mt-1.5 flex-shrink-0">
        {!notification.isRead ? (
          <div className="h-2 w-2 rounded-full bg-primary" />
        ) : (
          <div className="h-2 w-2" /> // spacer for alignment
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div
          className="text-sm [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_img]:h-auto"
          dangerouslySetInnerHTML={{ __html: sanitizedBody }}
        />
        <p className="mt-1 text-xs text-muted-foreground">{relativeTime}</p>
        {markError && (
          <p className="mt-1 text-xs text-destructive">{markError}</p>
        )}
      </div>

      {/* Mark as read button */}
      {!notification.isRead && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0"
          onClick={handleMarkAsRead}
          disabled={isMarking}
          title={t("markAsRead")}
        >
          {isMarking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
        </Button>
      )}
    </div>
  );
}
```

---

## 6. Data Flow

### Initial Load Flow

```
Page loads, Navbar renders
  --> NotificationBell mounts (client component)
  --> useSession() checks auth
  --> If not authenticated: return null (no bell rendered)
  --> If authenticated: useEffect triggers fetchNotifications(10)
  --> Server action calls authQuery with Bearer token
  --> Response mapped to Notification[] + PageInfo
  --> Badge renders with unread count
```

### Popover Open Flow

```
User clicks bell icon
  --> Popover opens (onOpenChange -> true)
  --> loadNotifications() called (re-fetch, replaces state)
  --> Dropdown shows loading skeletons briefly
  --> Results populate NotificationList
  --> Notifications rendered in reverse chronological order (API default)
```

### Mark as Read Flow (Optimistic)

```
User clicks Check icon on unread notification
  --> handleMarkAsRead(id) called in NotificationBell
  --> Optimistic update: set notification.isRead = true in state
  --> Badge count decreases immediately
  --> Server action calls authMutate(readNotifications)
  --> On success: state already correct, no action needed
  --> On failure: revert notification.isRead = false in state
  --> NotificationItem shows inline error message
```

### Load More Flow

```
User clicks "Load more" button
  --> handleLoadMore() called
  --> startLoadMore (useTransition) wraps fetchNotifications(10, endCursor)
  --> Button shows loading spinner
  --> Results appended to existing notifications array
  --> PageInfo updated with new cursor/hasNextPage
```

---

## 7. State Management

### NotificationBell State (Client)

All state is local to the `NotificationBell` component using `useState` and `useTransition`. No global state or context is needed. The component is self-contained.

| State | Type | Purpose |
|-------|------|---------|
| `notifications` | `Notification[]` | All fetched notifications (flattened from edges) |
| `pageInfo` | `NotificationPageInfo \| null` | Cursor for load-more |
| `isOpen` | `boolean` | Popover open/closed |
| `isLoading` | `boolean` | Initial/re-fetch loading |
| `error` | `string \| null` | Fetch error message |
| `isLoadingMore` | `boolean` | From `useTransition` for load-more |

### NotificationItem State (Client)

| State | Type | Purpose |
|-------|------|---------|
| `isMarking` | `boolean` | Mark-as-read mutation in flight |
| `markError` | `string \| null` | Inline error for failed mark-as-read |

### Derived Values

- `unreadCount`: `notifications.filter(n => !n.isRead).length` -- computed inline, not stored as state
- `displayCount`: `unreadCount > 99 ? "99+" : unreadCount.toString()`

---

## 8. Navbar Integration

The `NotificationBell` will be placed inside the existing `ml-auto` div in `navbar.tsx`, before `AuthButton`. The current markup:

```tsx
<div className="ml-auto">
  <AuthButton />
</div>
```

Will become:

```tsx
<div className="ml-auto flex items-center gap-2">
  <NotificationBell />
  <AuthButton />
</div>
```

This positions the bell icon to the right of the navigation links and to the left of the auth button. The `NotificationBell` component handles its own auth check (returns `null` for unauthenticated users), so no conditional rendering is needed in the navbar itself.

Import to add in `navbar.tsx`:

```typescript
import { NotificationBell } from "../notification/notification-bell";
```

---

## 9. HTML Sanitization Approach

### Why DOMPurify

The notification `body` contains HTML rendered by the backend via Thymeleaf templates. Even though this HTML originates from our own server, sanitization is a defense-in-depth measure against:
- Compromised backend returning malicious content
- Future changes to the notification system that might accept user-generated content
- XSS via HTML injection if the backend incorporates user-provided data into templates without proper escaping

### DOMPurify Configuration

```typescript
DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "span", "p", "br", "ul", "ol", "li"],
  ALLOWED_ATTR: ["href", "target", "rel", "class"],
});
```

This configuration:
- Allows basic formatting tags that Thymeleaf templates are likely to produce
- Allows `<a>` tags with `href`, `target`, and `rel` attributes for links
- Strips `<script>`, `<iframe>`, `<img>`, `<style>`, event handlers (`onclick`, etc.), and `style` attributes
- Does NOT allow images -- if backend notifications need images in the future, add `img` with `src` to the allowed list

### SSR Safety

DOMPurify requires a DOM environment. During SSR, `typeof window === "undefined"`, so we fall back to the raw body string. This is safe because:
1. The component is a client component (`"use client"`) so it hydrates on the client immediately
2. During the brief SSR render, the unsanitized HTML is only used to produce the initial HTML string, which the client immediately replaces after hydration with the sanitized version
3. As an additional safeguard, consider using `isomorphic-dompurify` instead of `dompurify` to handle SSR properly -- this package wraps DOMPurify with jsdom for server-side use

**Recommendation:** Use `isomorphic-dompurify` instead of `dompurify` to avoid the SSR conditional. It provides the same API but works in both environments.

### CSS Scoping for HTML Content

The `dangerouslySetInnerHTML` div uses scoped Tailwind selectors to constrain rendered HTML:

```tsx
<div className="text-sm [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_img]:h-auto">
```

This ensures links within notification bodies use the theme's primary color and any images (if allowed in the future) are constrained to the container width.

### New Dependency

- `isomorphic-dompurify` (recommended over `dompurify` + `@types/dompurify`)
- Or: `dompurify` + `@types/dompurify` if the SSR conditional approach is acceptable

---

## 10. Relative Time Formatting

### Approach: `next-intl` `useFormatter`

The `next-intl` library provides `useFormatter` which includes a `relativeTime` method:

```typescript
const formatter = useFormatter();
const relativeTime = formatter.relativeTime(new Date(notification.createdDate));
// Output: "5 minutes ago", "2 hours ago", "3 days ago", etc.
```

This integrates cleanly with the existing i18n infrastructure and respects the user's locale. No additional library is needed.

### Fallback

If `useFormatter().relativeTime` does not produce satisfactory output for edge cases (e.g., "just now" for very recent notifications), a small utility function using `Intl.RelativeTimeFormat` can be written. However, `next-intl`'s implementation should be sufficient for the initial version.

---

## 11. i18n Integration

### Keys to add to `messages/en.json`

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

### Usage

- `NotificationBell`: `useTranslations("notifications")` -- for header title and sr-only label
- `NotificationList`: `useTranslations("notifications")` -- for empty, error, retry, load more states
- `NotificationItem`: `useTranslations("notifications")` -- for mark-as-read button title and error

---

## 12. shadcn/ui Components

### Already installed (no action needed)

- `Button` (`/home/kevinlee/workspace/playground/playground-web-client/src/components/ui/button.tsx`) -- bell icon button, mark-as-read button, load-more button, retry button
- `Popover` + `PopoverTrigger` + `PopoverContent` (`/home/kevinlee/workspace/playground/playground-web-client/src/components/ui/popover.tsx`) -- dropdown container
- `Skeleton` (`/home/kevinlee/workspace/playground/playground-web-client/src/components/ui/skeleton.tsx`) -- loading placeholders
- `Separator` (`/home/kevinlee/workspace/playground/playground-web-client/src/components/ui/separator.tsx`) -- optional, can use `divide-y` class instead

### Needs to be installed

- **`ScrollArea`** -- scrollable notification list within the fixed-height dropdown. Install via:
  ```bash
  npx shadcn@latest add scroll-area
  ```

### Component usage summary

| Component | Where Used | Purpose |
|-----------|-----------|---------|
| `Button` | `NotificationBell`, `NotificationItem`, `NotificationList` | Bell trigger, mark-as-read action, load-more, retry |
| `Popover`, `PopoverTrigger`, `PopoverContent` | `NotificationBell` | Dropdown container anchored to bell |
| `ScrollArea` | `NotificationBell` | Scrollable area for notification list (max-h constraint) |
| `Skeleton` | `NotificationList` | Loading placeholders for initial fetch |

---

## 13. Alternative Approaches and Trade-offs

### Alternative 1: Global notification state via React Context

**Approach:** Create a `NotificationProvider` context wrapping the app that maintains notification state globally, allowing any component to access unread count or trigger refetches.

**Trade-offs:**
- Pro: Other components (e.g., a future notifications page) can access the same state without re-fetching
- Pro: Supports future real-time subscription integration more naturally (subscription writes to context)
- Con: More complex setup for a feature that currently only has one consumer (the bell)
- Con: Context re-renders propagate to all consumers when notifications change

**Recommendation:** Start with local state in `NotificationBell`. Extract to a context if/when the subscription feature (FE-1.1) or a dedicated notifications page (FE-1.3) is added. The current local state approach is simpler and sufficient.

### Alternative 2: Server component for initial notification fetch

**Approach:** Fetch the initial notification data in a server component (e.g., in `navbar.tsx` or a wrapper) and pass it as props to `NotificationBell`.

**Trade-offs:**
- Pro: Initial data available on first render without a client-side fetch (no flash of empty state)
- Con: The navbar is already a `"use client"` component, so there is no server component boundary to leverage here
- Con: Re-fetching on popover open still requires client-side calls anyway
- Con: Would require restructuring the navbar layout

**Recommendation:** Use client-side fetch on mount. The bell icon renders immediately (no badge flash -- badge simply appears once data loads), which is the expected UX per requirement UX-4.3.

### Alternative 3: Polling instead of re-fetch on open

**Approach:** Poll for notifications every N seconds to keep the badge count fresh without user interaction.

**Trade-offs:**
- Pro: Badge count stays up-to-date without user opening the popover
- Con: Additional server load from periodic requests
- Con: Complexity of managing polling intervals, cleanup, and visibility API integration
- Con: Requirements defer real-time updates to a future subscription-based iteration (FE-1.6 acknowledges polling as an intermediate step)

**Recommendation:** Do not implement polling in v1. The re-fetch-on-open approach is simpler and explicitly matches the requirements. Polling can be added as FE-1.6 or skipped entirely in favor of subscriptions.

### Alternative 4: `DropdownMenu` instead of `Popover`

**Approach:** Use shadcn/ui `DropdownMenu` instead of `Popover` for the notification dropdown.

**Trade-offs:**
- Pro: Built-in keyboard navigation and focus management (DropdownMenu uses Radix Menu)
- Con: DropdownMenu items are semantically menu items and have strict interaction patterns (click to select). Notification items with HTML content and mark-as-read buttons do not fit this pattern cleanly.
- Con: DropdownMenu closes on any item click, which conflicts with mark-as-read staying open

**Recommendation:** Use `Popover` as specified in requirements. It provides the right level of flexibility for complex content (HTML body, interactive buttons per item) and does not impose menu item semantics.

---

## 14. API Feedback

### Current Schema Assessment

The GraphQL schema fully supports all required operations for this feature:
- `notifications` query with cursor-based pagination -- confirmed at schema lines 1280-1285
- `readNotifications` mutation with batch ID support -- confirmed at schema line 1445
- `Notification` type with all needed fields (`id`, `body`, `isRead`, `createdDate`) -- confirmed at schema lines 137-142
- `notificationEvents` subscription exists for future use -- confirmed at schema line 1491

No schema changes are required.

### Suggestion: Add `unreadCount` field to notifications query

Currently, the unread count is derived client-side from the fetched notifications. This means the count only reflects the first page of results. If a user has 15 unread notifications but only fetches 10, the badge would show "10" instead of "15".

**Proposed schema addition:**

```graphql
type Query {
  notificationUnreadCount: Int!
}
```

Or as a field on `NotificationConnection`:

```graphql
type NotificationConnection implements Connection {
  edges: [NotificationEdge!]!
  pageInfo: PageInfo!
  unreadCount: Int!  # Add this
}
```

This would allow the badge to display the true unread count independent of pagination. The current approach is acceptable for v1 since most users will have fewer than 10 unread notifications, but this is a known limitation worth addressing.

### Suggestion: Add sorting/filtering to notifications query

The current `notifications` query returns notifications sorted by `createdDate` with no filter options. For a future notifications page (FE-1.3), the following would be useful:

```graphql
input NotificationFilterInput {
  isRead: Boolean
}
```

This is not needed for v1 but would support "show unread only" filtering.

---

## 15. Security Considerations

- **Authentication gating:** `NotificationBell` checks `useSession()` and returns `null` for unauthenticated users. All server actions use `authQuery`/`authMutate` which inject the Bearer token from the session.
- **HTML sanitization:** All notification body HTML is sanitized via DOMPurify before rendering with `dangerouslySetInnerHTML`. Only safe formatting tags and limited attributes are allowed. Scripts, event handlers, iframes, and other dangerous elements are stripped.
- **Input validation:** Notification IDs passed to `readNotifications` come exclusively from previously fetched notification data, not from user input.
- **Session expiration:** If the session expires while the dropdown is open, subsequent `authQuery`/`authMutate` calls will fail. The error handling (error states with retry) covers this gracefully.
- **Rate limiting:** Client-side rate limiting is implicit -- re-fetch only occurs on mount and popover open (user-initiated). No automated polling that could cause excessive requests.

---

## 16. File Structure Summary

```
src/
  components/
    notification/
      notification-bell.tsx       # Client - bell icon, badge, popover, state orchestrator
      notification-list.tsx       # Client - notification list with loading/empty/error states
      notification-item.tsx       # Client - single notification with HTML body, timestamp, mark-as-read
      actions.ts                  # Server actions - fetchNotifications, markNotificationsAsRead
    playground/
      navbar.tsx                  # Update - add NotificationBell import and render
  lib/
    types/
      notification.ts             # Types - Notification, edges, page info, action results
messages/
  en.json                         # Update - add notifications namespace
```

---

## 17. Implementation Order

1. **Dependencies and Types**
   - Install `scroll-area` shadcn/ui component
   - Install `isomorphic-dompurify` (or `dompurify` + `@types/dompurify`)
   - Create `src/lib/types/notification.ts`
   - Add `notifications` keys to `messages/en.json`

2. **Server Actions**
   - Create `src/components/notification/actions.ts`

3. **Components (bottom-up)**
   - Create `src/components/notification/notification-item.tsx`
   - Create `src/components/notification/notification-list.tsx`
   - Create `src/components/notification/notification-bell.tsx`

4. **Navbar Integration**
   - Update `src/components/playground/navbar.tsx`

5. **Verification**
   - Verify bell only renders for authenticated users
   - Verify badge count and "99+" cap
   - Verify popover opens/closes correctly
   - Verify mark-as-read optimistic update and revert on failure
   - Verify load-more pagination
   - Verify HTML sanitization strips dangerous content
   - Verify all text uses i18n keys
   - Run `npm run build` and `npm run lint`
