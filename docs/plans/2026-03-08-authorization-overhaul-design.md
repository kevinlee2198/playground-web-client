# Authorization Overhaul Design

The backend has implemented a comprehensive authorization model using Cerbos (ABAC) with derived roles. The frontend needs to update to reflect these rules: gating UI elements based on roles, adding new management features, and handling authorization errors. Livestreams are deferred to a separate effort.

Reference: `authorization.md` in the project root.

## Implementation Strategy

Split into 5 domain-based PRs, designed holistically but implemented independently. Each PR is self-contained and mergeable on its own. PRs should be merged in order since later PRs may depend on types/fields introduced in earlier ones.

---

## PR 1: Game Role-Based Authorization

Gate game action buttons using the new `viewerGameRole` field instead of showing them unconditionally.

### Types (`src/lib/types/game.ts`)

- Add `GameRole` type: `"OWNER" | "EDITOR"`
- Add `viewerGameRole: GameRole | null` to `GameDetail` and `GameNode`
- Add `visibility: "PUBLIC" | "PRIVATE"` to `GameDetail` (queried here, used by PR 5)

### Constants (`src/lib/constants.ts`)

- Add `GameRole` enum: `OWNER = "OWNER"`, `EDITOR = "EDITOR"`
- Add `GameVisibility` enum: `PUBLIC = "PUBLIC"`, `PRIVATE = "PRIVATE"`

### Queries (`src/app/[locale]/game/[id]/page.tsx`)

- Add `viewerGameRole` and `visibility` to the game detail query
- Pass `viewerGameRole` to `GameDetailHeader`, `GameParticipants`, `GameBoxScores`, `GameScoreboard`

### Game Detail Header (`src/components/game/game-detail-header.tsx`)

- Accept `viewerGameRole: GameRole | null` prop (replaces `currentPlayerId` for auth)
- Button visibility:
  - Edit game: `viewerGameRole != null`
  - Delete game: `viewerGameRole === "OWNER"`
  - Start/End game: `viewerGameRole != null`
- When `viewerGameRole` is null, only show read-only content

### Game Box Scores

- Gate finalize/unfinalize buttons on `viewerGameRole != null`

### Game Scoreboard

- Pass `viewerGameRole` to determine score editing access
- Owners/editors can always edit scores
- Participants follow `resultsFinalized` + `statEntryMode` rules

### Game List (`loadMoreGames`)

- Replace `createdBy` filter with `organizedByMe` filter for "My Games" screen

---

## PR 2: Editor Management

New dialog on game detail page for owners to manage game editors.

### New Types (`src/lib/types/game.ts`)

```typescript
interface GameMember {
  id: string;
  user: { id: string; firstName: string; lastName: string; username: string };
  role: GameRole;
}
```

### New Server Actions (`src/app/[locale]/game/actions.ts`)

- `addGameEditor(gameId: number, userId: string)` — returns `GameMember`
- `removeGameEditor(gameId: number, userId: string)` — returns success/error
- `transferGameOwnership(gameId: number, userId: string)` — returns updated `GameMember`
- `loadGameMembers(gameId: number)` — queries `Game.members` connection

### New Component (`src/components/game/manage-editors-dialog.tsx`)

Dialog accessible from "Manage Editors" button in game header (visible when `viewerGameRole === "OWNER"`).

Contents:
- List of current members with role badges (OWNER, EDITOR)
- Remove button next to each editor (not the owner)
- "Transfer Ownership" action on each editor with confirmation dialog warning "You will become an editor"
- "Add Editor" section: user search to find users, add button
- Error handling: duplicate member, cannot remove owner

### Game Detail Header Update

- Add "Manage Editors" button when `viewerGameRole === "OWNER"`

---

## PR 3: Chat Role Management

Add promote/demote, leave chat, and transfer ownership to chat member management.

### New Server Actions (`src/app/[locale]/chat/actions.ts`)

- `updateMemberRole(chatRoomId: string, userId: string, role: "OWNER" | "ADMIN" | "MEMBER")` — calls `updateChatRoomMemberRole`
- `leaveChat(chatRoomId: string)` — calls `leaveChatRoom`

### Member List Panel Updates (`src/components/chat/member-list-panel.tsx`)

Accept `currentUserRole: ChatRoomRole` prop and gate management actions:

- **Owner sees**: role dropdown on each member (MEMBER<->ADMIN promotion/demotion), "Transfer Ownership" option, remove button (for members and admins)
- **Admin sees**: remove button for MEMBERs only (not other admins or owner)
- **Member sees**: no management actions
- All non-owners in group chats see "Leave Chat" button in sheet header
- Ownership transfer: confirmation dialog, then redirect/refresh

### Error Handling

- `InsufficientRoleError` — toast: "You don't have permission to manage this member"
- `OwnerCannotLeaveError` — toast: "Transfer ownership before leaving"

---

## PR 4: Blocking

Full blocking UI: block/unblock on profiles, manage blocked users page, and error handling across the app.

### New Server Actions

**`src/app/[locale]/user/[username]/actions.ts`:**
- `blockUser(userId: string)` — calls `blockUser` mutation
- `unblockUser(userId: string)` — calls `unblockUser` mutation

**`src/app/[locale]/settings/actions.ts` (new file):**
- `loadBlockedUsers(first: number, after?: string)` — queries `friendships` with `status: BLOCKED` filter

### Profile Page Updates (`src/components/profile/friend-actions.tsx`)

- Add "Block User" action (dropdown or standalone button)
- Confirmation dialog before blocking: "Block [username]? They won't be able to see your profile or contact you."
- After blocking: show "Blocked" state with "Unblock" button
- Handle `UserBlockedYouError` — toast: "This user has already blocked you"
- Handle `SelfActionError` — graceful handling

### New Settings Page (`src/app/[locale]/settings/blocked/page.tsx`)

- "Manage Blocked Users" page
- List blocked users with "Unblock" button next to each
- Empty state: "You haven't blocked anyone"
- Accessible from user profile dropdown/settings

### DM Creation Error Handling

- Check for `UserBlockedError` in `createDirectMessage`
- Toast: "Cannot message this user"
- Update `MessageButton` component to surface this error

### Friend Request Error Handling

- Check for `FriendshipAlreadyExistsError` with status BLOCKED in `sendFriendRequest`
- Toast: "Cannot send friend request to this user"

---

## PR 5: Game Participation Visibility

Gate self-join based on game visibility (PUBLIC vs PRIVATE).

### Individual Participant List (`src/components/game/individual-participant-list.tsx`)

Accept `visibility` and `viewerGameRole` props.

- "Join Game" button visibility:
  - Game is `PUBLIC` (any authenticated user can self-join), OR
  - `viewerGameRole != null` (owner/editor can always add participants)
- "Leave Game" button: always shown for current participant

### Team Participant Components

- "Join Team" button: same logic as individual join
- "Leave Team" button: always shown for current team members

### Game Participants Container (`src/components/game/game-participants.tsx`)

- Pass `visibility` and `viewerGameRole` to child components
- For PRIVATE games with no management role: hide "Add Team" / "Add Participant" buttons

---

## Cross-Cutting Concerns

### Error Handling Pattern

All mutations already use union result types. The `extractMutationResult` utility handles unwrapping. New error types to handle:
- `UserBlockedError` — blocked user interaction
- `UserBlockedYouError` — reverse block
- `SelfActionError` — self-block attempt
- `InsufficientRoleError` — chat role violations
- `OwnerCannotLeaveError` — owner leaving without transfer
- `FriendshipAlreadyExistsError` (with status BLOCKED) — blocked friend request

### i18n

Each PR adds translation keys to `messages/en.json` for new UI text (button labels, error messages, confirmation dialogs, settings page content).

### Backend Assumptions

The backend already enforces all authorization rules. The frontend changes are about:
1. Proactively hiding/disabling UI elements the user can't interact with
2. Handling domain error responses gracefully with user-friendly messages
3. Adding new UI for features that previously had no frontend (editor management, blocking)
