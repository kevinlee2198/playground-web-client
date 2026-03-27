# Follow Request Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Review gates:** After each review checkpoint, dispatch a `pr-review-toolkit:code-reviewer` subagent on the unstaged/staged diff since the last checkpoint. Fix any issues found before proceeding to the next task. Review checkpoints are marked with `## Review Checkpoint` headings.

**Goal:** Add Instagram-style follow request approval for private profiles, with request management in notifications and settings.

**Architecture:** Extend the existing follow button with a third "Requested" state, add two new notification types with inline actions, create a follow requests settings page, and handle broken mutual follows in chat. All changes build on existing patterns (server actions, optimistic UI, i18n, pagination).

**Tech Stack:** Next.js 16 App Router, React server/client components, json-to-graphql-query, TanStack Form, Zod v4, next-intl, shadcn/ui, Vitest + Testing Library

---

## File Map

### Modified files

| File | Responsibility |
|---|---|
| `src/lib/types/follow.ts` | Add `FollowStateChange` type, update `FollowRelationship` |
| `src/lib/types/notification.ts` | Add `FollowRequestReceivedNotification`, `FollowRequestApprovedNotification` |
| `src/lib/graphql-fragments.ts` | Update `followUserStateFragment`, `followUserRefFragment`, `notificationInlineFragments`; add `followRequestFragment` |
| `src/app/[locale]/user/[username]/actions.ts` | Rewrite `followUser` for multi-branch union; add `cancelFollowRequest` |
| `src/components/profile/follow-button.tsx` | Three-state button (Follow / Requested / Following) |
| `src/components/profile/follow-actions.tsx` | Thread `viewerSentFollowRequest`, update callback type |
| `src/components/profile/profile-interactive-section.tsx` | Thread `viewerSentFollowRequest`, handle `FollowStateChange` |
| `src/components/profile/profile-header.tsx` | Thread `viewerSentFollowRequest` through props |
| `src/components/profile/follow-list-dialog.tsx` | Thread `viewerSentFollowRequest`, update `handleFollowChange` |
| `src/app/[locale]/user/[username]/page.tsx` | Query `viewerSentFollowRequest` |
| `src/components/notification/notification-item.tsx` | Render two new notification types with inline approve/decline |
| `src/components/notification/actions.ts` | Update notification fragment for new types |
| `src/app/[locale]/settings/settings-sidebar-nav.tsx` | Add "Follow Requests" nav item |
| `src/app/[locale]/settings/privacy/page.tsx` | Add follow requests section |
| `messages/en.json` | Add i18n strings |
| `__tests__/components/profile/follow-button.test.tsx` | Update tests for three-state button |

### New files

| File | Responsibility |
|---|---|
| `src/components/profile/follow-request-actions.ts` | Shared server actions: `approveFollowRequest`, `declineFollowRequest` |
| `src/components/profile/follow-requests-list.tsx` | Client component: paginated incoming follow requests list |
| `src/app/[locale]/settings/follow-requests/page.tsx` | Redirect to privacy (follow requests section lives there) |
| `src/app/[locale]/settings/follow-requests/actions.ts` | Server action: `loadFollowRequests` |
| `__tests__/components/profile/follow-request-actions.test.tsx` | Tests for approve/decline/cancel |
| `__tests__/components/notification/follow-request-notification.test.tsx` | Tests for notification inline actions |

---

## Task 1: Types, Fragments, and i18n Strings

**Files:**
- Modify: `src/lib/types/follow.ts`
- Modify: `src/lib/types/notification.ts`
- Modify: `src/lib/graphql-fragments.ts`
- Modify: `messages/en.json`

This task lays the foundation — types, fragments, and strings that all subsequent tasks depend on.

- [ ] **Step 1: Update `FollowRelationship` and add `FollowStateChange`**

In `src/lib/types/follow.ts`, add `viewerSentFollowRequest` to the interface and add the new callback type:

```typescript
/** Follow state for the viewer relative to a user profile */
export interface FollowRelationship {
  viewerFollowsUser: boolean;
  userFollowsViewer: boolean;
  viewerSentFollowRequest: { id: string } | null;
}

/** Discriminated union for follow state change callbacks */
export type FollowStateChange =
  | { type: "followed" }
  | { type: "requested"; requestId: string }
  | { type: "unfollowed" }
  | { type: "cancelled" };

export function isMutualFollow(rel: FollowRelationship): boolean {
  return rel.viewerFollowsUser && rel.userFollowsViewer;
}
```

- [ ] **Step 2: Add notification types**

In `src/lib/types/notification.ts`, add the two new notification interfaces and update the union/guard:

```typescript
export interface FollowRequestReceivedNotification extends BaseNotification {
  __typename: "FollowRequestReceivedNotification";
  requester: NotificationUser;
  followRequest: { id: string } | null;
}

export interface FollowRequestApprovedNotification extends BaseNotification {
  __typename: "FollowRequestApprovedNotification";
  approver: NotificationUser;
}
```

Update `KnownNotification`:

```typescript
export type KnownNotification =
  | NewFollowerNotification
  | GameStartedNotification
  | GameInvitationReceivedNotification
  | FollowRequestReceivedNotification
  | FollowRequestApprovedNotification;
```

Update `isKnownNotificationType`:

```typescript
export function isKnownNotificationType(
  n: Notification,
): n is KnownNotification {
  return (
    n.__typename === "NewFollowerNotification" ||
    n.__typename === "GameStartedNotification" ||
    n.__typename === "GameInvitationReceivedNotification" ||
    n.__typename === "FollowRequestReceivedNotification" ||
    n.__typename === "FollowRequestApprovedNotification"
  );
}
```

- [ ] **Step 3: Update GraphQL fragments**

In `src/lib/graphql-fragments.ts`:

Update `followUserStateFragment` to include `viewerSentFollowRequest`:

```typescript
export const followUserStateFragment = {
  id: true,
  viewerFollowsUser: true,
  userFollowsViewer: true,
  viewerSentFollowRequest: { id: true },
  followerCount: true,
  followingCount: true,
};
```

Update `followUserRefFragment`:

```typescript
export const followUserRefFragment = {
  id: true,
  username: true,
  displayName: true,
  profilePicture: profilePictureThumbnailFragment,
  viewerFollowsUser: true,
  userFollowsViewer: true,
  viewerSentFollowRequest: { id: true },
};
```

Add `followRequestFragment`:

```typescript
/**
 * Follow request fields for follow request lists and notifications.
 * Use as: followRequest: followRequestFragment
 */
export const followRequestFragment = {
  id: true,
  requester: {
    id: true,
    username: true,
    displayName: true,
    profilePicture: profilePictureThumbnailFragment,
  },
  createdDate: true,
};
```

Update `notificationInlineFragments` to include the two new types:

```typescript
export const notificationInlineFragments = [
  {
    __typeName: "NewFollowerNotification",
    follower: userRefFragment,
  },
  {
    __typeName: "GameStartedNotification",
    game: {
      id: true,
      sportType: true,
    },
  },
  {
    __typeName: "GameInvitationReceivedNotification",
    inviter: userRefFragment,
    game: {
      id: true,
      sportType: true,
    },
    invitation: {
      id: true,
    },
  },
  {
    __typeName: "FollowRequestReceivedNotification",
    requester: userRefFragment,
    followRequest: { id: true },
  },
  {
    __typeName: "FollowRequestApprovedNotification",
    approver: userRefFragment,
  },
];
```

- [ ] **Step 4: Add i18n strings**

In `messages/en.json`, add to the `profile.follow` section:

```json
"requested": "Requested",
"cancelRequest": "Cancel follow request for {name}",
"requestSent": "Follow request sent to {name}",
"requestCancelled": "Follow request cancelled",
"approve": "Approve",
"decline": "Decline",
"approved": "Approved",
"declined": "Declined",
"requestNotAvailable": "Request no longer available",
"approveError": "Failed to approve request",
"declineError": "Failed to decline request",
"cancelError": "Failed to cancel request"
```

Add to `notificationTemplates`:

```json
"followRequestReceived": {
  "title": "Follow Request",
  "body": "<link>{displayName}</link> requested to follow you"
},
"followRequestApproved": {
  "title": "Follow Request Approved",
  "body": "<link>{displayName}</link> approved your follow request"
}
```

Add to `settings.nav`:

```json
"followRequests": "Follow Requests"
```

Add `settings.followRequests`:

```json
"followRequests": {
  "title": "Follow Requests",
  "description": "People who have requested to follow you",
  "empty": "No pending follow requests"
}
```

- [ ] **Step 5: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -30`

Expected: No errors related to the modified files. (Other pre-existing errors are fine.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/types/follow.ts src/lib/types/notification.ts src/lib/graphql-fragments.ts messages/en.json
git commit -m "feat(follow-requests): add types, fragments, and i18n strings for follow request approval"
```

---

## Task 2: Server Actions — `followUser` Multi-Branch and New Actions

**Files:**
- Modify: `src/app/[locale]/user/[username]/actions.ts`
- Create: `src/components/profile/follow-request-actions.ts`

- [ ] **Step 1: Rewrite `followUser` server action**

In `src/app/[locale]/user/[username]/actions.ts`, replace the `followUser` function:

```typescript
export type FollowUserResult =
  | { success: true; type: "followed"; user: { id: string; viewerFollowsUser: boolean; userFollowsViewer: boolean; viewerSentFollowRequest: { id: string } | null; followerCount: number; followingCount: number } }
  | { success: true; type: "requested"; requestId: string }
  | { success: false; errorType: string; message: string };

export async function followUser(userId: string): Promise<FollowUserResult> {
  try {
    const response = await authMutate({
      followUser: {
        __args: { input: { userId } },
        __typename: true,
        __on: [
          {
            __typeName: "FollowUserResponse",
            user: followUserStateFragment,
          },
          {
            __typeName: "FollowRequestSentResponse",
            followRequest: { id: true },
          },
          {
            __typeName: "FollowRequestAlreadyExistsError",
            requestId: true,
            message: true,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const data = response.data.followUser;

    if (data.__typename === "FollowUserResponse") {
      return { success: true, type: "followed", user: data.user };
    }

    if (data.__typename === "FollowRequestSentResponse") {
      return { success: true, type: "requested", requestId: data.followRequest.id };
    }

    if (data.__typename === "FollowRequestAlreadyExistsError") {
      return { success: true, type: "requested", requestId: data.requestId };
    }

    return { success: false, errorType: data.__typename, message: data.message ?? "Failed to follow user" };
  } catch {
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to follow user" };
  }
}
```

- [ ] **Step 2: Add `cancelFollowRequest` to user actions**

In the same file, add:

```typescript
export async function cancelFollowRequest(requestId: string) {
  try {
    const response = await authMutate({
      cancelFollowRequest: {
        __args: { input: { requestId } },
        __typename: true,
        __on: [
          {
            __typeName: "CancelFollowRequestResponse",
            id: true,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.cancelFollowRequest, "CancelFollowRequestResponse");
    if (!result.success) return result;

    return { success: true };
  } catch {
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to cancel follow request" };
  }
}
```

- [ ] **Step 3: Create shared follow request actions**

Create `src/components/profile/follow-request-actions.ts`:

```typescript
"use server";

import { errorFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";

export async function approveFollowRequest(requestId: string) {
  try {
    const response = await authMutate({
      approveFollowRequest: {
        __args: { input: { requestId } },
        __typename: true,
        __on: [
          {
            __typeName: "ApproveFollowRequestResponse",
            follow: { id: true },
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.approveFollowRequest, "ApproveFollowRequestResponse");
    if (!result.success) return result;

    return { success: true };
  } catch {
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to approve follow request" };
  }
}

export async function declineFollowRequest(requestId: string) {
  try {
    const response = await authMutate({
      declineFollowRequest: {
        __args: { input: { requestId } },
        __typename: true,
        __on: [
          {
            __typeName: "DeclineFollowRequestResponse",
            id: true,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.declineFollowRequest, "DeclineFollowRequestResponse");
    if (!result.success) return result;

    return { success: true };
  } catch {
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to decline follow request" };
  }
}
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -30`

Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/user/[username]/actions.ts src/components/profile/follow-request-actions.ts
git commit -m "feat(follow-requests): rewrite followUser for multi-branch union, add approve/decline/cancel actions"
```

---

## Review Checkpoint A: Foundation (after Tasks 1-2)

Dispatch `pr-review-toolkit:code-reviewer` on all changes since branch start. Focus areas:
- Type definitions match the GraphQL schema exactly
- GraphQL fragments select the correct fields (no `url` on Resource, correct `__typeName` strings)
- Server action return types are complete and consistent
- `followUser` multi-branch handles all union members from `FollowUserResult`
- Error fragment catches all error types
- i18n keys are consistent with usage in later tasks

Fix any issues before proceeding.

---

## Task 3: Follow Button — Three-State with Tests

**Files:**
- Modify: `src/components/profile/follow-button.tsx`
- Modify: `__tests__/components/profile/follow-button.test.tsx`

- [ ] **Step 1: Write failing tests for the "Requested" state**

Add to `__tests__/components/profile/follow-button.test.tsx`. First update the hoisted mocks to include `cancelFollowRequest`:

```typescript
const { mockFollowUser, mockUnfollowUser, mockCancelFollowRequest, mockToast } = vi.hoisted(() => {
  const mockFollowUser = vi.fn();
  const mockUnfollowUser = vi.fn();
  const mockCancelFollowRequest = vi.fn();
  const mockToast = Object.assign(vi.fn(), { error: vi.fn() });
  return { mockFollowUser, mockUnfollowUser, mockCancelFollowRequest, mockToast };
});

vi.mock("@/app/[locale]/user/[username]/actions", () => ({
  followUser: (...args: unknown[]) => mockFollowUser(...args),
  unfollowUser: (...args: unknown[]) => mockUnfollowUser(...args),
  cancelFollowRequest: (...args: unknown[]) => mockCancelFollowRequest(...args),
}));
```

Update the i18n mock to include the new keys:

```typescript
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    const map: Record<string, string> = {
      follow: "Follow",
      following: "Following",
      unfollow: "Unfollow",
      requested: "Requested",
      error: "Something went wrong. Please try again.",
      undo: "Undo",
      requestCancelled: "Follow request cancelled",
    };
    if (key === "unfollowedUndo" && params?.name) {
      return `Unfollowed ${params.name}. You can no longer message each other.`;
    }
    if (key === "nowFollowing" && params?.name) {
      return `Now following ${params.name}`;
    }
    if (key === "unfollowedName" && params?.name) {
      return `Unfollowed ${params.name}`;
    }
    if (key === "cancelRequest" && params?.name) {
      return `Cancel follow request for ${params.name}`;
    }
    if (key === "requestSent" && params?.name) {
      return `Follow request sent to ${params.name}`;
    }
    return map[key] ?? key;
  },
}));
```

Add the new tests:

```typescript
it('renders "Requested" when initialViewerSentFollowRequest is set', () => {
  render(
    <FollowButton
      {...defaultProps}
      initialViewerSentFollowRequest={{ id: "req-1" }}
    />,
  );

  const button = screen.getByRole("button", { name: /Cancel follow request for Alice/i });
  expect(button).toBeInTheDocument();
  expect(button).toHaveTextContent("Requested");
  expect(button).not.toHaveAttribute("aria-pressed");
});

it("calls cancelFollowRequest when clicking Requested button", async () => {
  mockCancelFollowRequest.mockResolvedValue({ success: true });

  render(
    <FollowButton
      {...defaultProps}
      initialViewerSentFollowRequest={{ id: "req-1" }}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /Cancel follow request for Alice/i }));

  await waitFor(() => {
    expect(mockCancelFollowRequest).toHaveBeenCalledWith("req-1");
  });
});

it("transitions to Requested state when followUser returns a request", async () => {
  mockFollowUser.mockResolvedValue({
    success: true,
    type: "requested",
    requestId: "req-2",
  });

  render(<FollowButton {...defaultProps} />);

  fireEvent.click(screen.getByRole("button", { name: /Follow Alice/i }));

  await waitFor(() => {
    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Requested");
  });
});

it("calls onFollowChange with type 'requested' when follow creates a request", async () => {
  mockFollowUser.mockResolvedValue({
    success: true,
    type: "requested",
    requestId: "req-3",
  });
  const onFollowChange = vi.fn();

  render(
    <FollowButton {...defaultProps} onFollowChange={onFollowChange} />,
  );

  fireEvent.click(screen.getByRole("button", { name: /Follow Alice/i }));

  await waitFor(() => {
    expect(onFollowChange).toHaveBeenCalledWith({ type: "requested", requestId: "req-3" });
  });
});

it("calls onFollowChange with type 'cancelled' when cancel succeeds", async () => {
  mockCancelFollowRequest.mockResolvedValue({ success: true });
  const onFollowChange = vi.fn();

  render(
    <FollowButton
      {...defaultProps}
      initialViewerSentFollowRequest={{ id: "req-1" }}
      onFollowChange={onFollowChange}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /Cancel follow request for Alice/i }));

  await waitFor(() => {
    expect(onFollowChange).toHaveBeenCalledWith({ type: "cancelled" });
  });
});

it("reverts to Requested state when cancel fails", async () => {
  mockCancelFollowRequest.mockResolvedValue({ success: false });

  render(
    <FollowButton
      {...defaultProps}
      initialViewerSentFollowRequest={{ id: "req-1" }}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /Cancel follow request for Alice/i }));

  await waitFor(() => {
    expect(mockToast.error).toHaveBeenCalled();
  });

  const button = screen.getByRole("button");
  expect(button).toHaveTextContent("Requested");
});
```

Update existing tests — the `onFollowChange` callback now receives objects:

- `onFollowChange(true)` → `onFollowChange({ type: "followed" })`
- `onFollowChange(false)` → `onFollowChange({ type: "unfollowed" })`

The `makeFollowResponse` helper needs updating for the new return shape:

```typescript
function makeFollowResponse(overrides: { viewerFollowsUser?: boolean } = {}) {
  return {
    success: true,
    type: "followed" as const,
    user: {
      viewerFollowsUser: true,
      viewerSentFollowRequest: null,
      ...overrides,
    },
  };
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/components/profile/follow-button.test.tsx 2>&1 | tee /tmp/follow-btn-test.txt`

Expected: New tests FAIL (component doesn't have Requested state yet). Existing tests may also fail due to callback shape change.

- [ ] **Step 3: Rewrite follow-button.tsx for three states**

Replace `src/components/profile/follow-button.tsx`:

```typescript
"use client";

import {
  cancelFollowRequest,
  followUser,
  unfollowUser,
} from "@/app/[locale]/user/[username]/actions";
import { Button } from "@/components/ui/button";
import type { FollowStateChange } from "@/lib/types/follow";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

type FollowButtonState =
  | { type: "not-following" }
  | { type: "requested"; requestId: string }
  | { type: "following" };

interface FollowButtonProps {
  userId: string;
  displayName: string;
  initialViewerFollowsUser: boolean;
  initialViewerSentFollowRequest?: { id: string } | null;
  onFollowChange?: (change: FollowStateChange) => void;
}

export function FollowButton({
  userId,
  displayName,
  initialViewerFollowsUser,
  initialViewerSentFollowRequest = null,
  onFollowChange,
}: FollowButtonProps) {
  const t = useTranslations("profile.follow");
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<FollowButtonState>(() => {
    if (initialViewerSentFollowRequest) {
      return { type: "requested", requestId: initialViewerSentFollowRequest.id };
    }
    return initialViewerFollowsUser
      ? { type: "following" }
      : { type: "not-following" };
  });
  const [isHovered, setIsHovered] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const announcementTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);
    };
  }, []);

  function announce(message: string) {
    if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);
    setAnnouncement(message);
    announcementTimerRef.current = setTimeout(() => setAnnouncement(""), 1000);
  }

  function executeFollow(previousState: FollowButtonState) {
    setState({ type: "following" });

    startTransition(async () => {
      const result = await followUser(userId);

      if (!result.success) {
        setState(previousState);
        toast.error(t("error"));
        return;
      }

      if (result.type === "followed") {
        setState({ type: "following" });
        announce(t("nowFollowing", { name: displayName }));
        onFollowChange?.({ type: "followed" });
      } else {
        // result.type === "requested"
        setState({ type: "requested", requestId: result.requestId });
        announce(t("requestSent", { name: displayName }));
        onFollowChange?.({ type: "requested", requestId: result.requestId });
      }
    });
  }

  function handleFollow() {
    executeFollow(state);
  }

  function handleUnfollow() {
    const previousState = state;
    setState({ type: "not-following" });
    setIsHovered(false);

    startTransition(async () => {
      const result = await unfollowUser(userId);

      if (result.success) {
        setState(result.user.viewerFollowsUser ? { type: "following" } : { type: "not-following" });
        onFollowChange?.({ type: "unfollowed" });

        if (result.wasMutualFollow) {
          toast(t("unfollowedUndo", { name: displayName }), {
            duration: 5000,
            action: {
              label: t("undo"),
              onClick: () => executeFollow({ type: "not-following" }),
            },
          });
        } else {
          announce(t("unfollowedName", { name: displayName }));
        }
      } else {
        setState(previousState);
        toast.error(t("error"));
      }
    });
  }

  function handleCancelRequest() {
    const previousState = state;
    setState({ type: "not-following" });

    startTransition(async () => {
      if (previousState.type !== "requested") return;

      const result = await cancelFollowRequest(previousState.requestId);

      if (result.success) {
        announce(t("requestCancelled"));
        onFollowChange?.({ type: "cancelled" });
      } else {
        setState(previousState);
        toast.error(t("error"));
      }
    });
  }

  function getButtonText(): string {
    if (state.type === "not-following") return t("follow");
    if (state.type === "requested") return t("requested");
    if (isHovered) return t("unfollow");
    return t("following");
  }

  function getButtonVariant(): "default" | "destructive" | "outline" {
    if (state.type === "not-following") return "default";
    if (state.type === "requested") return "outline";
    if (isHovered) return "destructive";
    return "outline";
  }

  function getHandler() {
    if (state.type === "not-following") return handleFollow;
    if (state.type === "requested") return handleCancelRequest;
    return handleUnfollow;
  }

  function getAriaLabel(): string {
    if (state.type === "requested") {
      return t("cancelRequest", { name: displayName });
    }
    if (state.type === "following") {
      return `${t("unfollow")} ${displayName}`;
    }
    return `${t("follow")} ${displayName}`;
  }

  return (
    <>
      <span className="sr-only" aria-live="polite" role="status">
        {announcement}
      </span>

      <Button
        variant={getButtonVariant()}
        onClick={getHandler()}
        disabled={isPending}
        aria-label={getAriaLabel()}
        aria-pressed={state.type === "following" ? true : state.type === "not-following" ? false : undefined}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="min-w-[6rem]"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        {getButtonText()}
      </Button>
    </>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/components/profile/follow-button.test.tsx 2>&1 | tee /tmp/follow-btn-test.txt`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/profile/follow-button.tsx __tests__/components/profile/follow-button.test.tsx
git commit -m "feat(follow-requests): three-state follow button with Requested state and tests"
```

---

## Task 4: Prop Threading — Profile Page Through to Follow Button

**Files:**
- Modify: `src/app/[locale]/user/[username]/page.tsx`
- Modify: `src/components/profile/profile-header.tsx`
- Modify: `src/components/profile/profile-interactive-section.tsx`
- Modify: `src/components/profile/follow-actions.tsx`
- Modify: `src/components/profile/follow-list-dialog.tsx`

- [ ] **Step 1: Add `viewerSentFollowRequest` to page query**

In `src/app/[locale]/user/[username]/page.tsx`, update `buildUserQuery`:

```typescript
function buildUserQuery(username: string) {
  return {
    user: {
      __args: { input: { username } },
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      displayName: true,
      biography: true,
      profileVisibility: true,
      profilePicture: resourceFragment,
      followerCount: true,
      followingCount: true,
      viewerFollowsUser: true,
      userFollowsViewer: true,
      viewerSentFollowRequest: { id: true },
      player: {
        id: true,
        age: true,
        height: true,
        weight: true,
      },
    },
  };
}
```

- [ ] **Step 2: Update `ProfileHeader` props and pass-through**

In `src/components/profile/profile-header.tsx`, add `viewerSentFollowRequest` to the user interface:

```typescript
interface ProfileHeaderProps {
  user: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    displayName: string;
    biography: string | null;
    profilePicture?: Resource | null;
    followerCount: number;
    followingCount: number;
    viewerFollowsUser: boolean | null;
    userFollowsViewer: boolean | null;
    viewerSentFollowRequest: { id: string } | null;
  };
  isOwnProfile: boolean;
  isAuthenticated: boolean;
}
```

Update the `ProfileInteractiveSection` usage:

```typescript
<ProfileInteractiveSection
  userId={user.id}
  displayName={user.displayName}
  initialFollowerCount={user.followerCount}
  initialFollowingCount={user.followingCount}
  initialViewerFollowsUser={user.viewerFollowsUser ?? false}
  initialUserFollowsViewer={user.userFollowsViewer ?? false}
  initialViewerSentFollowRequest={user.viewerSentFollowRequest ?? null}
  isOwnProfile={false}
/>
```

- [ ] **Step 3: Update `ProfileInteractiveSection`**

In `src/components/profile/profile-interactive-section.tsx`:

```typescript
"use client";

import type { FollowStateChange } from "@/lib/types/follow";
import { useState } from "react";
import { FollowActions } from "./follow-actions";
import { FollowCounts } from "./follow-counts";

interface ProfileInteractiveSectionProps {
  userId: string;
  displayName: string;
  initialFollowerCount: number;
  initialFollowingCount: number;
  initialViewerFollowsUser: boolean;
  initialUserFollowsViewer: boolean;
  initialViewerSentFollowRequest: { id: string } | null;
  isOwnProfile: boolean;
}

export function ProfileInteractiveSection({
  userId,
  displayName,
  initialFollowerCount,
  initialFollowingCount,
  initialViewerFollowsUser,
  initialUserFollowsViewer,
  initialViewerSentFollowRequest,
  isOwnProfile,
}: ProfileInteractiveSectionProps) {
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [viewerFollowsUser, setViewerFollowsUser] = useState(
    initialViewerFollowsUser,
  );

  function handleFollowChange(change: FollowStateChange) {
    if (change.type === "followed") {
      setFollowerCount((prev) => prev + 1);
      setViewerFollowsUser(true);
    } else if (change.type === "unfollowed") {
      setFollowerCount((prev) => prev - 1);
      setViewerFollowsUser(false);
    }
    // "requested" and "cancelled" don't change follower counts
  }

  return (
    <div className="flex flex-col gap-4">
      <FollowCounts
        userId={userId}
        followerCount={followerCount}
        followingCount={initialFollowingCount}
        isOwnProfile={isOwnProfile}
      />
      {!isOwnProfile ? (
        <FollowActions
          userId={userId}
          displayName={displayName}
          viewerFollowsUser={viewerFollowsUser}
          userFollowsViewer={initialUserFollowsViewer}
          initialViewerSentFollowRequest={initialViewerSentFollowRequest}
          showMessageButton
          onFollowChange={handleFollowChange}
        />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Update `FollowActions`**

In `src/components/profile/follow-actions.tsx`, update the interface and pass-through:

Update the props interface:

```typescript
interface FollowActionsProps {
  userId: string;
  displayName: string;
  viewerFollowsUser: boolean;
  userFollowsViewer: boolean;
  initialViewerSentFollowRequest?: { id: string } | null;
  showMessageButton?: boolean;
  onFollowChange?: (change: FollowStateChange) => void;
}
```

Add the import:

```typescript
import type { FollowStateChange } from "@/lib/types/follow";
```

Update `handleFollowChange` and `localViewerFollowsUser` tracking:

```typescript
function handleFollowChange(change: FollowStateChange) {
  if (change.type === "followed") {
    setLocalViewerFollowsUser(true);
  } else if (change.type === "unfollowed" || change.type === "cancelled") {
    setLocalViewerFollowsUser(false);
  }
  onFollowChange?.(change);
}
```

Update the `FollowButton` usage:

```typescript
<FollowButton
  userId={userId}
  displayName={displayName}
  initialViewerFollowsUser={localViewerFollowsUser}
  initialViewerSentFollowRequest={initialViewerSentFollowRequest}
  onFollowChange={handleFollowChange}
/>
```

- [ ] **Step 5: Update `FollowListDialog`**

In `src/components/profile/follow-list-dialog.tsx`:

Update the `FollowUser` interface:

```typescript
interface FollowUser {
  id: string;
  username: string;
  displayName: string;
  profilePicture: {
    __typename: string;
    thumbnailUrl?: string;
  } | null;
  viewerFollowsUser: boolean | null;
  userFollowsViewer: boolean | null;
  viewerSentFollowRequest: { id: string } | null;
}
```

Add the import:

```typescript
import type { FollowStateChange } from "@/lib/types/follow";
```

Update `handleFollowChange`:

```typescript
function handleFollowChange(itemUserId: string, change: FollowStateChange) {
  if (isOwnProfile && type === "following" && change.type === "unfollowed") {
    setItems((prev) => prev.filter((item) => item.user.id !== itemUserId));
    return;
  }

  if (change.type === "followed") {
    setItems((prev) =>
      prev.map((item) =>
        item.user.id === itemUserId
          ? { ...item, user: { ...item.user, viewerFollowsUser: true, viewerSentFollowRequest: null } }
          : item,
      ),
    );
  } else if (change.type === "unfollowed") {
    setItems((prev) =>
      prev.map((item) =>
        item.user.id === itemUserId
          ? { ...item, user: { ...item.user, viewerFollowsUser: false } }
          : item,
      ),
    );
  }
  // "requested" and "cancelled" — no list state change needed
}
```

Update the `FollowButton` render to pass `viewerSentFollowRequest`:

```typescript
<FollowButton
  userId={item.user.id}
  displayName={item.user.displayName}
  initialViewerFollowsUser={item.user.viewerFollowsUser ?? false}
  initialViewerSentFollowRequest={item.user.viewerSentFollowRequest}
  onFollowChange={(change) =>
    handleFollowChange(item.user.id, change)
  }
/>
```

- [ ] **Step 6: Run type check and build**

Run: `npx tsc --noEmit 2>&1 | head -30`

Expected: No new errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/[locale]/user/[username]/page.tsx src/components/profile/profile-header.tsx src/components/profile/profile-interactive-section.tsx src/components/profile/follow-actions.tsx src/components/profile/follow-list-dialog.tsx
git commit -m "feat(follow-requests): thread viewerSentFollowRequest through profile component chain"
```

---

## Review Checkpoint B: Core Feature (after Tasks 3-4)

Dispatch `pr-review-toolkit:code-reviewer` on the diff since Checkpoint A. Focus areas:
- Follow button state machine: all three states render correctly, transitions are correct
- `onFollowChange` callback uses `FollowStateChange` everywhere — no leftover boolean callbacks
- Prop threading is complete: no component in the chain is missing `viewerSentFollowRequest`
- `aria-pressed` is only set for "following" and "not-following" states, not "requested"
- `aria-label` on "Requested" button says "Cancel follow request for {name}"
- Optimistic UI: rollback logic restores correct previous state (including `requestId`)
- Tests cover: initial Requested state, follow→requested transition, cancel, cancel failure rollback
- `ProfileInteractiveSection.handleFollowChange` only bumps count on `"followed"`/`"unfollowed"`, not `"requested"`/`"cancelled"`
- `FollowListDialog.handleFollowChange` doesn't set `viewerFollowsUser: true` for `"requested"`

Fix any issues before proceeding.

---

## Task 5: Notification Inline Actions

**Files:**
- Modify: `src/components/notification/notification-item.tsx`

- [ ] **Step 1: Add follow request notification rendering**

In `src/components/notification/notification-item.tsx`, add the new cases to `getKnownNotificationContent`:

```typescript
case "FollowRequestReceivedNotification":
  if (!notification.requester) return FALLBACK_CONTENT;
  return {
    templateKey: "followRequestReceived",
    href: `/user/${notification.requester.username}`,
    richParams: { displayName: notification.requester.displayName },
    followRequestId: notification.followRequest?.id ?? null,
  };
case "FollowRequestApprovedNotification":
  if (!notification.approver) return FALLBACK_CONTENT;
  return {
    templateKey: "followRequestApproved",
    href: `/user/${notification.approver.username}`,
    richParams: { displayName: notification.approver.displayName },
  };
```

Update the `NotificationContent` interface to include the optional `followRequestId`:

```typescript
interface NotificationContent {
  templateKey: string | null;
  href: string | null;
  richParams: Record<string, string>;
  followRequestId?: string | null;
}
```

Add inline approve/decline buttons. The `NotificationItem` component needs a local state for the action result. Add:

```typescript
import {
  approveFollowRequest,
  declineFollowRequest,
} from "@/components/profile/follow-request-actions";

// Inside NotificationItem:
const [requestAction, setRequestAction] = useState<"approved" | "declined" | null>(null);
const [isActionPending, startActionTransition] = useTransition();

function handleApprove(requestId: string) {
  startActionTransition(async () => {
    const result = await approveFollowRequest(requestId);
    if (result.success) {
      setRequestAction("approved");
    } else {
      toast.error(tNotif("profile.follow.approveError"));
    }
  });
}

function handleDecline(requestId: string) {
  startActionTransition(async () => {
    const result = await declineFollowRequest(requestId);
    if (result.success) {
      setRequestAction("declined");
    } else {
      toast.error(tNotif("profile.follow.declineError"));
    }
  });
}
```

Render the action buttons below the notification body when `content.followRequestId` is present:

```typescript
{content.followRequestId && !requestAction ? (
  <div className="mt-2 flex gap-2">
    <Button
      size="sm"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleApprove(content.followRequestId!);
      }}
      disabled={isActionPending}
    >
      {tFollow("approve")}
    </Button>
    <Button
      size="sm"
      variant="outline"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleDecline(content.followRequestId!);
      }}
      disabled={isActionPending}
    >
      {tFollow("decline")}
    </Button>
  </div>
) : null}
{content.followRequestId === null &&
  notification.__typename === "FollowRequestReceivedNotification" &&
  !requestAction ? (
  <TypographySmall className="mt-2 text-muted-foreground">
    {tFollow("requestNotAvailable")}
  </TypographySmall>
) : null}
{requestAction ? (
  <TypographySmall className="mt-2 text-muted-foreground">
    {tFollow(requestAction)}
  </TypographySmall>
) : null}
```

Add the necessary imports (`Button`, `toast`, `useTransition`, `useState`) and get `tFollow` via `useTranslations("profile.follow")`.

- [ ] **Step 2: Run build to verify no errors**

Run: `npx tsc --noEmit 2>&1 | head -30`

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/notification/notification-item.tsx
git commit -m "feat(follow-requests): inline approve/decline in follow request notifications"
```

---

## Task 6: Follow Requests Settings Page

**Files:**
- Create: `src/app/[locale]/settings/follow-requests/actions.ts`
- Create: `src/components/profile/follow-requests-list.tsx`
- Modify: `src/app/[locale]/settings/privacy/page.tsx`
- Modify: `src/app/[locale]/settings/settings-sidebar-nav.tsx`

- [ ] **Step 1: Create `loadFollowRequests` server action**

Create `src/app/[locale]/settings/follow-requests/actions.ts`:

```typescript
"use server";

import { followRequestFragment } from "@/lib/graphql-fragments";
import { authQuery } from "@/lib/graphql-request";
import { EnumType } from "json-to-graphql-query";

export async function loadFollowRequests(
  first: number,
  after?: string,
) {
  try {
    const response = await authQuery({
      followRequests: {
        __args: {
          direction: new EnumType("INCOMING"),
          first,
          ...(after ? { after } : {}),
        },
        edges: {
          cursor: true,
          node: followRequestFragment,
        },
        pageInfo: {
          hasNextPage: true,
          endCursor: true,
        },
      },
    });

    if (response.errors?.length > 0) {
      return null;
    }

    return response.data?.followRequests ?? null;
  } catch (error) {
    console.error("Failed to load follow requests:", error);
    return null;
  }
}
```

- [ ] **Step 2: Create `FollowRequestsList` client component**

Create `src/components/profile/follow-requests-list.tsx`:

```typescript
"use client";

import { loadFollowRequests } from "@/app/[locale]/settings/follow-requests/actions";
import {
  approveFollowRequest,
  declineFollowRequest,
} from "@/components/profile/follow-request-actions";
import { getInitials } from "@/components/game/player-avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TypographyMuted } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import { Check, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

interface FollowRequestEntry {
  id: string;
  cursor: string;
  requester: {
    id: string;
    username: string;
    displayName: string;
    profilePicture: { __typename: string; thumbnailUrl?: string } | null;
  };
  createdDate: string;
}

const PAGE_SIZE = 20;

export function FollowRequestsList() {
  const t = useTranslations("profile.follow");
  const tSettings = useTranslations("settings.followRequests");
  const [items, setItems] = useState<FollowRequestEntry[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasError, setHasError] = useState(false);
  const isLoadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (after?: string) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    const result = await loadFollowRequests(PAGE_SIZE, after);

    if (result) {
      setHasError(false);
      const newItems: FollowRequestEntry[] = result.edges.map(
        (edge: { cursor: string; node: FollowRequestEntry }) => ({
          ...edge.node,
          cursor: edge.cursor,
        }),
      );
      setItems((prev) => (after ? [...prev, ...newItems] : newItems));
      setHasNextPage(result.pageInfo.hasNextPage);
      setEndCursor(result.pageInfo.endCursor ?? undefined);
    } else {
      setHasError(true);
    }

    setIsInitialLoad(false);
    isLoadingRef.current = false;
  }, []);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  useEffect(() => {
    if (!hasNextPage || isInitialLoad) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingRef.current) {
          fetchPage(endCursor);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, endCursor, fetchPage, isInitialLoad]);

  function FollowRequestItem({ item }: { item: FollowRequestEntry }) {
    const [isPending, startTransition] = useTransition();

    function handleApprove() {
      startTransition(async () => {
        const result = await approveFollowRequest(item.id);
        if (result.success) {
          setItems((prev) => prev.filter((i) => i.id !== item.id));
        } else {
          toast.error(t("approveError"));
        }
      });
    }

    function handleDecline() {
      startTransition(async () => {
        const result = await declineFollowRequest(item.id);
        if (result.success) {
          setItems((prev) => prev.filter((i) => i.id !== item.id));
        } else {
          toast.error(t("declineError"));
        }
      });
    }

    return (
      <div className="flex min-h-[44px] items-center gap-3 rounded-lg border px-4 py-3">
        <Link href={`/user/${item.requester.username}`} className="shrink-0">
          <Avatar>
            {item.requester.profilePicture?.thumbnailUrl ? (
              <AvatarImage
                src={item.requester.profilePicture.thumbnailUrl}
                alt={item.requester.displayName}
              />
            ) : null}
            <AvatarFallback>
              {getInitials(item.requester.displayName)}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={`/user/${item.requester.username}`}
            className="truncate font-medium text-sm hover:underline"
          >
            {item.requester.displayName}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            @{item.requester.username}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-1 h-4 w-4" />
            )}
            {t("approve")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDecline}
            disabled={isPending}
          >
            <X className="mr-1 h-4 w-4" />
            {t("decline")}
          </Button>
        </div>
      </div>
    );
  }

  if (isInitialLoad) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex h-[60px] items-center gap-3 rounded-lg border px-4 py-3 animate-pulse"
          >
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <TypographyMuted>{t("loadError")}</TypographyMuted>
        <Button variant="outline" size="sm" onClick={() => fetchPage()}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <TypographyMuted className="text-muted-foreground">
        {tSettings("empty")}
      </TypographyMuted>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <FollowRequestItem key={item.id} item={item} />
      ))}
      {hasNextPage ? (
        <div ref={sentinelRef} className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Add follow requests section to privacy settings page**

In `src/app/[locale]/settings/privacy/page.tsx`, add the follow requests section below blocked users. Add the imports:

```typescript
import { FollowRequestsList } from "@/components/profile/follow-requests-list";
```

Add after the blocked users section:

```typescript
<Separator className="my-6" />

<div>
  <div className="mb-4">
    <TypographyH3>{t("followRequests.title")}</TypographyH3>
    <TypographyMuted>{t("followRequests.description")}</TypographyMuted>
  </div>
  <FollowRequestsList />
</div>
```

- [ ] **Step 4: Add nav item to settings sidebar**

In `src/app/[locale]/settings/settings-sidebar-nav.tsx`, add the follow requests item:

```typescript
import { Bell, Gamepad2, Lock, Monitor, UserPlus } from "lucide-react";

const navItems = [
  { key: "display", icon: Monitor, href: "/settings/display" },
  { key: "games", icon: Gamepad2, href: "/settings/games" },
  { key: "notifications", icon: Bell, href: "/settings/notifications" },
  { key: "privacy", icon: Lock, href: "/settings/privacy" },
  { key: "followRequests", icon: UserPlus, href: "/settings/privacy#follow-requests" },
] as const;
```

Note: Rather than a separate page, follow requests live on the privacy page. The nav item links to the privacy page with a hash anchor. Alternatively, if a separate page is preferred, create a redirect page similar to `/settings/blocked/page.tsx`.

- [ ] **Step 5: Run type check and build**

Run: `npx tsc --noEmit 2>&1 | head -30`

Expected: No new errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/[locale]/settings/follow-requests/actions.ts src/components/profile/follow-requests-list.tsx src/components/profile/follow-request-actions.ts src/app/[locale]/settings/privacy/page.tsx src/app/[locale]/settings/settings-sidebar-nav.tsx messages/en.json
git commit -m "feat(follow-requests): add follow requests settings section with paginated list"
```

---

## Review Checkpoint C: New UI (after Tasks 5-6)

Dispatch `pr-review-toolkit:code-reviewer` on the diff since Checkpoint B. Focus areas:
- Notification inline actions: approve/decline buttons prevent event propagation (no accidental navigation)
- Notification state: stale `followRequest` (null) shows "Request no longer available", not buttons
- `FollowRequestReceivedNotification` and `FollowRequestApprovedNotification` added to type guards and fragment
- Follow requests list: pagination, optimistic removal on approve/decline, error rollback
- Settings sidebar nav item added correctly
- Privacy page integrates `FollowRequestsList` component
- i18n strings used in new components match what was added in Task 1
- Accessibility: buttons have proper labels, focus management after approve/decline

Fix any issues before proceeding.

---

## Task 7: Chat — Handle Broken Mutual Follow

**Files:**
- Modify: `src/components/chat/mutual-follow-selector.tsx`

This task is minimal — the `canMessage` field is already used in `conversation-view.tsx` with `DmDisabledBanner`, and `chatRoomInlineFragments` already includes `canMessage: true`. The only change needed is updating the mutual-follow selector's `onFollowChange` callback to handle the new `FollowStateChange` type.

- [ ] **Step 1: Update `MutualFollowSelector` follow callback**

In `src/components/chat/mutual-follow-selector.tsx`, the `NonMutualSearchResultItem` uses `FollowButton` with `onFollowChange`. Update it to handle `FollowStateChange`:

```typescript
import type { FollowStateChange } from "@/lib/types/follow";

// In NonMutualSearchResultItem:
onFollowChange={(change: FollowStateChange) => {
  if (change.type === "followed") onFollowSuccess();
}}
```

This ensures the mutual follow list is only refetched when an actual follow happens, not when a request is sent to a private profile.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -30`

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/mutual-follow-selector.tsx
git commit -m "feat(follow-requests): update mutual-follow selector for FollowStateChange callback"
```

---

## Task 8: Final Build and Lint

- [ ] **Step 1: Run full lint**

Run: `npm run lint 2>&1 | tee /tmp/lint-results.txt`

Expected: No new lint errors.

- [ ] **Step 2: Run full type check**

Run: `npx tsc --noEmit 2>&1 | tee /tmp/tsc-results.txt`

Expected: No new errors.

- [ ] **Step 3: Run all tests**

Run: `npm test 2>&1 | tee /tmp/test-results.txt`

Expected: All tests pass.

- [ ] **Step 4: Run build**

Run: `npm run build 2>&1 | tee /tmp/build-results.txt`

Expected: Build succeeds.

- [ ] **Step 5: Fix any issues found, then commit**

If any issues are found in steps 1-4, fix them and create a commit:

```bash
git add -A
git commit -m "fix(follow-requests): address lint, type, and build issues"
```

---

## Review Checkpoint D: Final Review (after Tasks 7-8)

Dispatch `pr-review-toolkit:code-reviewer` on the full diff from `main` (all changes in the branch). This is the pre-PR review. Focus areas:
- Full branch diff coherence: no dead code, no leftover boolean `onFollowChange` signatures
- All `FollowStateChange` consumers handle all four variants (`followed`, `requested`, `unfollowed`, `cancelled`)
- GraphQL fragments and notification inline fragments match schema types exactly
- No hardcoded strings — all user-visible text uses i18n
- Accessibility across all new/modified components
- No security concerns (server actions validate auth, no client-side trust)
- Test coverage: follow button three-state tests all pass

Also dispatch `pr-review-toolkit:code-simplifier` to check for any unnecessary complexity.

Fix any issues before creating the PR.
