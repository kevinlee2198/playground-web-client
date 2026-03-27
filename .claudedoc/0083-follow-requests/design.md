# Follow Request Approval -- Frontend Design

## 1. Overview

The follow model changes from auto-approve for all profiles to conditional approval: public profiles still auto-approve, but private profiles require explicit approval. This follows the Instagram/Strava pattern -- the backend now returns a `FollowRequestSentResponse` instead of `FollowUserResponse` when following a private profile.

### Key backend changes

- `followUser` mutation returns a union: `FollowUserResponse | FollowRequestSentResponse | FollowRequestAlreadyExistsError | ...`
- New `FollowRequest` type with `requester`, `target`, `createdDate`
- New mutations: `approveFollowRequest`, `declineFollowRequest`, `cancelFollowRequest`
- New `User` fields: `viewerSentFollowRequest`, `viewerReceivedFollowRequest`
- New notification types: `FollowRequestReceivedNotification`, `FollowRequestApprovedNotification`
- Chat enforces mutual follows: `MutualFollowRequiredError` on create DM / send message, `canMessage` field on `DirectMessageChatRoom`
- Old friendship error types removed (`FriendshipAlreadyExistsError`, `FriendRequestNotFoundError`, `InvalidFriendshipStateError`, `UserBlockedYouError`)

### Scope

1. Follow button gains a "Requested" state for pending follow requests
2. Notifications gain inline approve/decline for incoming requests
3. New settings page for managing incoming follow requests
4. Chat handles broken mutual follows gracefully

## 2. Follow Button State Machine

The follow button gains a third state:

```
[Not following, no request] → click → (public profile)  → [Following]
[Not following, no request] → click → (private profile) → [Requested]
[Requested]                 → click → cancel request     → [Not following]
[Following]                 → click → unfollow            → [Not following]
```

### State determination

The button reads two fields from the `User` type to determine its state:

| `viewerFollowsUser` | `viewerSentFollowRequest` | Button state |
|---|---|---|
| `true` | — | "Following" (hover: "Unfollow") |
| `false`/`null` | non-null | "Requested" (click cancels) |
| `false`/`null` | `null` | "Follow" (click follows) |

### Internal state

The `FollowButton` replaces its current `isFollowing: boolean` state with a discriminated union:

```typescript
type FollowButtonState =
  | { type: "not-following" }
  | { type: "requested"; requestId: string }
  | { type: "following" };

// Initialized from props:
const initial: FollowButtonState = initialViewerSentFollowRequest
  ? { type: "requested", requestId: initialViewerSentFollowRequest.id }
  : initialViewerFollowsUser
    ? { type: "following" }
    : { type: "not-following" };
```

This ensures `requestId` is always available when the button is in the "Requested" state.

### Visual treatment

- **"Follow"**: `default` variant (filled primary)
- **"Following"**: `outline` variant, switches to `destructive` on hover with "Unfollow" text
- **"Requested"**: `outline` variant, no hover change -- click cancels

### Optimistic UI

- Follow → Requested: Immediately show "Requested" state, roll back on error
- Cancel request: Immediately show "Follow" state, roll back on error
- Follow → Following (public): Same as today

## 3. Server Action Changes

### Modified: `followUser`

The existing `followUser` action must handle the expanded union. The current `extractMutationResult` only handles a single success type. The GraphQL query needs explicit `__on` fragments for each union member:

```typescript
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
```

Result handling branches on `__typename`:

- `FollowUserResponse` → instant follow (public profile). Return `{ success: true, type: "followed", user }`.
- `FollowRequestSentResponse` → return `{ success: true, type: "requested", requestId }` so the button transitions to "Requested".
- `FollowRequestAlreadyExistsError` → treat as idempotent success: return `{ success: true, type: "requested", requestId }`.
- Any `Error` type → return `{ success: false, errorType, message }`.

### `onFollowChange` callback redesign

The current `onFollowChange?: (viewerFollowsUser: boolean) => void` callback cannot represent "Requested" state. Replace with a discriminated union:

```typescript
type FollowStateChange =
  | { type: "followed" }
  | { type: "requested"; requestId: string }
  | { type: "unfollowed" }
  | { type: "cancelled" };

onFollowChange?: (change: FollowStateChange) => void;
```

Consumer updates:
- `ProfileInteractiveSection.handleFollowChange` — only increment `followerCount` when `change.type === "followed"`, only decrement when `change.type === "unfollowed"`.
- `FollowListDialog.handleFollowChange` — set `viewerFollowsUser: true` only for `"followed"`, not `"requested"`.
- `MutualFollowSelector.onFollowSuccess` — only call `fetchMutualFollows()` when `change.type === "followed"`, ignore `"requested"`.

### New actions

Place `approveFollowRequest`, `declineFollowRequest`, `cancelFollowRequest` in `src/components/profile/follow-request-actions.ts` (a shared server action file) rather than a route-specific actions file, since these are called from both notifications and the settings page:

- `cancelFollowRequest(requestId: string)` → calls `cancelFollowRequest` mutation
- `approveFollowRequest(requestId: string)` → calls `approveFollowRequest` mutation, returns the new `Follow`
- `declineFollowRequest(requestId: string)` → calls `declineFollowRequest` mutation

And in `src/app/[locale]/settings/follow-requests/actions.ts`:

- `loadFollowRequests(direction, first, after?)` → paginated query using `followRequests(direction: INCOMING)`

## 4. GraphQL Fragment Changes

### `followUserStateFragment`

Add `viewerSentFollowRequest` to the fragment returned by follow/unfollow mutations:

```
id
viewerFollowsUser
userFollowsViewer
viewerSentFollowRequest { id }
followerCount
followingCount
```

### `followUserRefFragment`

Add `viewerSentFollowRequest` so follow list dialogs can show the correct button state:

```
id
username
displayName
profilePicture: profilePictureThumbnailFragment
viewerFollowsUser
userFollowsViewer
viewerSentFollowRequest { id }
```

### `followRequestFragment` (new)

Shared fragment for follow request data. Uses the existing `profilePictureThumbnailFragment` pattern (not `{ id, url }` which doesn't exist on `Resource`):

```
id
requester {
  id
  username
  displayName
  profilePicture: profilePictureThumbnailFragment
}
createdDate
```

## 5. Type Changes

### `FollowRelationship` (in `src/lib/types/follow.ts`)

Add optional follow request tracking:

```typescript
interface FollowRelationship {
  viewerFollowsUser: boolean
  userFollowsViewer: boolean
  viewerSentFollowRequest: { id: string } | null
}
```

### New types

```typescript
interface FollowRequest {
  id: string
  requester: {
    id: string
    username: string
    displayName: string
    profilePicture: { __typename: string; thumbnailUrl?: string } | null
  }
  createdDate: string
}
```

## 6. Prop Threading

`viewerSentFollowRequest` must be threaded through the entire component chain. Every component in the path needs the new prop:

1. `buildUserQuery` in `page.tsx` — add `viewerSentFollowRequest: { id: true }` to the user query
2. `ProfileHeader` props — user object includes `viewerSentFollowRequest: { id: string } | null`
3. `ProfileInteractiveSection` props — add `initialViewerSentFollowRequest: { id: string } | null`
4. `FollowActions` props — add `viewerSentFollowRequest: { id: string } | null`
5. `FollowButton` props — add `initialViewerSentFollowRequest: { id: string } | null`

The `FollowListDialog` gets this data from the updated `followUserRefFragment` (Section 4) and passes it through its inline `FollowButton` instances.

## 7. Notification Changes

### New notification types

**FollowRequestReceivedNotification:**
- Template: "{displayName} requested to follow you"
- Inline Approve / Decline buttons rendered directly in the notification item
- After action: buttons replaced with "Approved" or "Declined" text (local state, no refetch)
- If `followRequest` is null (already approved/declined/cancelled): show "Request no longer available" instead of buttons
- Links to requester's profile

**FollowRequestApprovedNotification:**
- Template: "{displayName} approved your follow request"
- Informational only -- no action buttons
- Links to approver's profile

### Cross-component consistency

If a request is approved/declined from the settings page, the notification popover may still show stale approve/decline buttons. This is acceptable because:
- The notification popover re-fetches data on open (`loadNotifications` in `notification-bell.tsx`), so reopening the popover self-corrects
- If the user clicks a stale button, the server returns `FollowRequestNotFoundError`, which we handle with a "Request no longer available" toast and remove the buttons

### Changes to notification infrastructure

- Add both types to the discriminated union in `src/lib/types/notification.ts`
- Add type guards: `isFollowRequestReceivedNotification()`, `isFollowRequestApprovedNotification()`
- Add i18n templates in `messages/en.json` under `notificationTemplates`
- Add rendering cases in `notification-item.tsx`
- Update the notification GraphQL fragment to include the new fields (`requester`, `followRequest { id }`, `approver`)

## 8. Follow Requests Settings Page

### Route: `/settings/follow-requests`

New page alongside the existing blocked users page at `/settings/blocked`.

### Layout

- Added to the settings sidebar navigation as "Follow Requests"
- Shows a count badge on the nav item when there are pending requests

### Component structure

```
FollowRequestsPage (server component)
  +-- FollowRequestsList (client component)
        +-- FollowRequestItem (per-request row)
        |     +-- Avatar + displayName + username
        |     +-- Approve button (primary)
        |     +-- Decline button (outline/destructive)
        +-- Empty state: "No pending follow requests"
        +-- Load more (infinite scroll, same pattern as follow-list-dialog)
```

### Behavior

- Uses `followRequests(direction: INCOMING)` query with cursor pagination
- Optimistic removal on approve/decline (remove from list immediately)
- Approve creates the follow relationship -- the requester now follows you
- Decline removes the request with no follow created
- Error handling: toast on failure, item reappears in list

## 9. Chat Changes

### `MutualFollowRequiredError` handling

Add to error handling in:
- `createDirectMessage` action → toast: "You need to be mutual followers to message this person"
- `sendChatMessage` action → toast: same message
- `addChatRoomMember` action → toast: same message

This is defensive -- the UI already prevents these actions via the mutual-follow selector and message button disabled state.

### `canMessage` field on `DirectMessageChatRoom`

- Add `canMessage` to the DM query fragment
- When `canMessage === false` on an existing DM conversation:
  - Disable the message input
  - Show inline message: "You can no longer message this person" (similar to Instagram's pattern when a mutual follow is broken)
  - The conversation history remains visible but read-only

Note: the existing `canMessage` state defaults to `true` before room data loads. The `MutualFollowRequiredError` toast on `sendMessage` provides a safety net if a user sends before the room data arrives.

## 10. Private Profile Gate

No changes needed. The existing logic in `user/[username]/page.tsx` already checks:

```typescript
isPrivateProfile = !isOwnProfile && profileVisibility === "PRIVATE" && viewerFollowsUser !== true
```

Since `viewerFollowsUser` remains `false`/`null` until the follow request is approved, the private profile gate works correctly for the new flow.

### Edge case: target switches from private to public

If User A sends a follow request to User B (private), and User B later switches to public, User A's button may still show "Requested" until the page refreshes. The backend behavior for pending requests when profile visibility changes is outside frontend control. If the backend auto-approves them, no issue. If not, the user can cancel and re-follow (which will auto-approve since the profile is now public). This is acceptable behavior.

## 11. Component Changes Summary

| Component | Change |
|---|---|
| `follow-button.tsx` | Add "Requested" state with discriminated union, cancel request on click |
| `follow-actions.tsx` | Pass `viewerSentFollowRequest` through, update `onFollowChange` callback type |
| `follow-list-dialog.tsx` | Pass `viewerSentFollowRequest` from updated fragment, update `onFollowChange` handler |
| `follow-counts.tsx` | No changes needed |
| `profile-interactive-section.tsx` | Thread `viewerSentFollowRequest` prop, update `handleFollowChange` for new callback type |
| `notification-item.tsx` | Add follow request received/approved rendering with inline actions |
| `notification-bell.tsx` | No changes (new types flow through existing infrastructure) |
| `mutual-follow-selector.tsx` | Update `onFollowChange` handler — only refetch on `"followed"`, ignore `"requested"` |
| `user/[username]/page.tsx` | Query `viewerSentFollowRequest`, thread through component chain |
| `user/[username]/actions.ts` | Expand `followUser` response handling with multi-branch `__typename` check |
| `src/components/profile/follow-request-actions.ts` | New: shared approve/decline/cancel server actions |
| `settings/` sidebar | Add "Follow Requests" nav item |
| `settings/follow-requests/` | New page + actions (server component + client list) |
| DM conversation view | Use `canMessage` to disable input when mutual follow broken |
| `src/lib/types/follow.ts` | Add `viewerSentFollowRequest` to `FollowRelationship`, add `FollowStateChange` type |
| `src/lib/types/notification.ts` | Add two new notification types + type guards |
| `src/lib/graphql-fragments.ts` | Update `followUserStateFragment`, `followUserRefFragment`, add `followRequestFragment` |
| `messages/en.json` | Add i18n strings for new notification templates, follow request UI |

## 12. Accessibility

- "Requested" button: no `aria-pressed` (it's not a toggle in this state), `aria-label="Cancel follow request for {displayName}"`
- "Following" button: `aria-pressed="true"` (existing behavior, correct for toggle)
- "Follow" button: `aria-pressed="false"` (existing behavior)
- Approve/Decline in notifications: standard button semantics, focus management after action (focus next item or empty state)
- Follow requests settings page: uses same patterns as blocked users list
- Live region announcements for follow state changes (same `sr-only` pattern as existing follow button)
- `canMessage: false` disabled input: `aria-disabled="true"` with visible explanation text

## 13. Error Handling

| Error | Source | Handling |
|---|---|---|
| `FollowRequestAlreadyExistsError` | `followUser` | Treat as success, show "Requested" with returned `requestId` |
| `FollowRequestNotFoundError` | approve/decline/cancel | Toast "Request no longer available", remove from list |
| `NotFollowRequestTargetError` | approve/decline | Toast generic error (shouldn't happen in normal flow) |
| `NotFollowRequestRequesterError` | cancel | Toast generic error (shouldn't happen in normal flow) |
| `MutualFollowRequiredError` | chat actions | Toast "You need to be mutual followers to message this person" |
