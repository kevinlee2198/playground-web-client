# Authorization Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the frontend to enforce the backend's Cerbos authorization model — gate UI on roles, add editor management, chat role management, blocking, and participation visibility controls.

**Architecture:** 5 independent, domain-based PRs. Each PR is self-contained and mergeable alone. Merge in order since later PRs may reference types from earlier ones. The backend already enforces all rules; the frontend proactively hides/disables UI and handles error responses.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, TanStack Form, Zod v4, `json-to-graphql-query`, shadcn/ui, `next-intl`, Vitest + @testing-library/react

**Reference:** `authorization.md` (root), `schema.graphqls` (root), `docs/plans/2026-03-08-authorization-overhaul-design.md`

---

## PR 1: Game Role-Based Authorization

**Branch:** `feat/game-role-auth`

### Task 1.1: Add GameRole and GameVisibility constants and types

**Files:**
- Modify: `src/lib/constants.ts:136` (after `GameSortField` enum)
- Modify: `src/lib/types/game.ts:1-10` (imports and type additions)

**Step 1: Add enums to constants.ts**

After the `GameSortField` enum (line 135), add:

```typescript
export enum GameRole {
  OWNER = "OWNER",
  EDITOR = "EDITOR",
}

export enum GameVisibility {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
}
```

**Step 2: Add viewerGameRole and visibility to game types**

In `src/lib/types/game.ts`, import the new enums:

```typescript
import {
  type GameSortField,
  type GameStatus,
  type GameRole,
  type GameVisibility,
  type SortDirection,
  SportSubtype,
  SportType,
} from "@/lib/constants";
```

Add `viewerGameRole` and `visibility` to `GameNode` (line 122):

```typescript
export interface GameNode {
  id: number;
  startDate: string;
  endDate: string | null;
  sportType: SportType;
  metadata: GameMetadata;
  gameStatus: GameStatus;
  viewerGameRole: GameRole | null;
  visibility: GameVisibility;
  location: { ... } | null;
  participants: { ... };
}
```

Add `viewerGameRole` and `visibility` to `GameDetail` (line 145):

```typescript
export interface GameDetail {
  id: number;
  startDate: string;
  endDate: string | null;
  sportType: SportType;
  metadata: GameMetadata;
  gameStatus: GameStatus;
  viewerGameRole: GameRole | null;
  visibility: GameVisibility;
  location: Location | null;
  participants: { ... };
  media: { ... };
}
```

**Step 3: Replace createdBy with organizedByMe in GameFilterParams**

In `src/lib/types/game.ts`, update `GameFilterParams` (line 388):

```typescript
export interface GameFilterParams {
  startAfter?: string;
  startBefore?: string;
  endAfter?: string;
  endBefore?: string;
  sportType?: SportType;
  playerId?: number;
  gameStatus?: GameStatus;
  organizedByMe?: boolean;
}
```

**Step 4: Run build to verify types compile**

Run: `npm run build`

**Step 5: Commit**

```
feat: add GameRole, GameVisibility types and organizedByMe filter
```

---

### Task 1.2: Update game queries to include viewerGameRole and visibility

**Files:**
- Modify: `src/app/[locale]/game/[id]/page.tsx:109-136` (game detail query)
- Modify: `src/app/[locale]/game/actions.ts:327-370` (loadMoreGames query)
- Modify: `src/app/[locale]/games/page.tsx:129,152` (createdBy → organizedByMe)
- Modify: `src/app/[locale]/user/[username]/actions.ts:81-129` (user profile games query)

**Step 1: Add viewerGameRole and visibility to game detail query**

In `src/app/[locale]/game/[id]/page.tsx`, add these fields to the game query object (after `gameStatus: true`, around line 117):

```typescript
viewerGameRole: true,
visibility: true,
```

**Step 2: Add viewerGameRole to loadMoreGames in game actions**

In `src/app/[locale]/game/actions.ts`, the `loadMoreGames` function builds the filter. Replace `createdBy` filter (line 325) with `organizedByMe`:

```typescript
if (filters.organizedByMe) filterInput.organizedByMe = filters.organizedByMe;
```

**Step 3: Update games list page**

In `src/app/[locale]/games/page.tsx`:
- Line 129: replace `createdBy: queryParams.myGames === "true" ? currentUserId : undefined` with `organizedByMe: queryParams.myGames === "true" ? true : undefined`
- Line 152: replace `if (filters.createdBy) filterInput.createdBy = filters.createdBy` with `if (filters.organizedByMe) filterInput.organizedByMe = filters.organizedByMe`

**Step 4: Run build**

Run: `npm run build`

**Step 5: Commit**

```
feat: query viewerGameRole/visibility fields, use organizedByMe filter
```

---

### Task 1.3: Gate game detail header buttons on viewerGameRole

**Files:**
- Modify: `src/components/game/game-detail-header.tsx`
- Modify: `src/app/[locale]/game/[id]/page.tsx:205` (pass viewerGameRole prop)

**Step 1: Update GameDetailHeader props and button visibility**

In `src/components/game/game-detail-header.tsx`:

Replace the interface (line 21-24):

```typescript
interface GameDetailHeaderProps {
  game: GameDetail;
  viewerGameRole: GameRole | null;
}
```

Update the component signature (line 26):

```typescript
export function GameDetailHeader({ game, viewerGameRole }: GameDetailHeaderProps) {
```

Add import for `GameRole`:

```typescript
import type { GameRole } from "@/lib/constants";
```

Gate buttons (lines 103-134). Replace the button section:

```typescript
<div className="flex flex-wrap gap-2">
  {canStart && viewerGameRole != null && (
    <Button onClick={handleStart} disabled={isPending} variant="default">
      <Play className="mr-2 h-4 w-4" />
      {isPending ? t("game.actions.starting") : t("game.actions.start")}
    </Button>
  )}
  {canEnd && viewerGameRole != null && (
    <Button onClick={handleEnd} disabled={isPending} variant="default">
      <StopCircle className="mr-2 h-4 w-4" />
      {isPending ? t("game.actions.ending") : t("game.actions.end")}
    </Button>
  )}
  {viewerGameRole != null && (
    <Button
      variant="outline"
      onClick={() => setShowUpdateDialog(true)}
      disabled={isPending}
    >
      <Pencil className="mr-2 h-4 w-4" />
      {t("game.actions.edit")}
    </Button>
  )}
  {viewerGameRole === "OWNER" && (
    <Button
      variant="destructive"
      onClick={() => setShowDeleteDialog(true)}
      disabled={isPending}
    >
      {t("game.actions.delete")}
    </Button>
  )}
</div>
```

**Step 2: Pass viewerGameRole from page**

In `src/app/[locale]/game/[id]/page.tsx` line 205, update the component call:

```typescript
<GameDetailHeader game={game} viewerGameRole={game.viewerGameRole} />
```

Remove `currentPlayerId` from the prop since it's no longer needed.

**Step 3: Run build**

Run: `npm run build`

**Step 4: Commit**

```
feat: gate game action buttons on viewerGameRole
```

---

### Task 1.4: Gate scoreboard editing on viewerGameRole

**Files:**
- Modify: `src/components/game/game-scoreboard.tsx:17-28`
- Modify: `src/app/[locale]/game/[id]/page.tsx:209-211`

**Step 1: Update GameScoreboard to accept viewerGameRole**

In `src/components/game/game-scoreboard.tsx`:

Update interface (line 17):

```typescript
interface GameScoreboardProps {
  game: GameDetail;
  viewerGameRole: GameRole | null;
}
```

Add import for `GameRole`:

```typescript
import type { GameRole } from "@/lib/constants";
```

Update component signature:

```typescript
export function GameScoreboard({ game, viewerGameRole }: GameScoreboardProps) {
```

Update `canEdit` logic (line 26-28). Owners/editors can always edit. Others can only edit if game is active:

```typescript
const canEdit =
  viewerGameRole != null ||
  (game.gameStatus === GameStatus.IN_PROGRESS ||
    game.gameStatus === GameStatus.COMPLETE);
```

**Step 2: Pass viewerGameRole from page**

In `src/app/[locale]/game/[id]/page.tsx`, update the scoreboard call:

```typescript
<GameScoreboard game={game} viewerGameRole={game.viewerGameRole} />
```

**Step 3: Run build**

Run: `npm run build`

**Step 4: Commit**

```
feat: pass viewerGameRole to scoreboard for edit access control
```

---

### Task 1.5: Gate box score editing on viewerGameRole

**Files:**
- Modify: `src/components/game/game-box-scores.tsx:11-13,51,99-110`
- Modify: `src/components/game/basketball-box-score-table.tsx:39-45,65-66`
- Modify: `src/app/[locale]/game/[id]/page.tsx:259`

**Step 1: Update GameBoxScores to accept and pass viewerGameRole**

In `src/components/game/game-box-scores.tsx`:

Update interface:

```typescript
interface GameBoxScoresProps {
  game: GameDetail;
  viewerGameRole: GameRole | null;
}
```

Update component signature and pass to table:

```typescript
export async function GameBoxScores({ game, viewerGameRole }: GameBoxScoresProps) {
```

Pass `viewerGameRole` to `BasketballBoxScoreTable`:

```typescript
<BasketballBoxScoreTable
  gameId={game.id}
  teamName={group.teamName}
  boxScores={group.boxScores}
  gameStatus={game.gameStatus}
  availablePlayers={group.players}
  viewerGameRole={viewerGameRole}
/>
```

**Step 2: Update BasketballBoxScoreTable to use viewerGameRole**

In `src/components/game/basketball-box-score-table.tsx`:

Update interface:

```typescript
interface BasketballBoxScoreTableProps {
  gameId: number;
  teamName: string;
  boxScores: { node: BasketballBoxScoreNode }[];
  gameStatus: GameStatus;
  availablePlayers?: PlayerRef[];
  viewerGameRole: GameRole | null;
}
```

Update destructured props and `canEdit`:

```typescript
export function BasketballBoxScoreTable({
  gameId,
  teamName,
  boxScores,
  gameStatus,
  availablePlayers = [],
  viewerGameRole,
}: BasketballBoxScoreTableProps) {
```

```typescript
const canEdit =
  viewerGameRole != null ||
  (gameStatus === GameStatus.IN_PROGRESS || gameStatus === GameStatus.COMPLETE);
```

**Step 3: Pass viewerGameRole from page**

In `src/app/[locale]/game/[id]/page.tsx`:

```typescript
<GameBoxScores game={game} viewerGameRole={game.viewerGameRole} />
```

**Step 4: Run build**

Run: `npm run build`

**Step 5: Commit**

```
feat: gate box score editing on viewerGameRole
```

---

### Task 1.6: Add i18n keys for game role labels

**Files:**
- Modify: `messages/en.json`

**Step 1: Add translation keys**

Add under `game` section:

```json
"role": {
  "owner": "Owner",
  "editor": "Editor"
},
"manageEditors": "Manage Editors"
```

**Step 2: Run build to verify**

Run: `npm run build`

**Step 3: Commit and create PR**

```
feat: add i18n keys for game roles
```

Create PR for the full PR 1 branch.

---

## PR 2: Editor Management

**Branch:** `feat/editor-management`

### Task 2.1: Add GameMember type and server actions

**Files:**
- Modify: `src/lib/types/game.ts` (add GameMember type)
- Modify: `src/app/[locale]/game/actions.ts` (add editor mutations + loadGameMembers)

**Step 1: Add GameMember type**

In `src/lib/types/game.ts`, add after the `GameParticipantDetail` type:

```typescript
export interface GameMemberUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
}

export interface GameMember {
  id: string;
  user: GameMemberUser;
  role: GameRole;
}
```

**Step 2: Add server actions**

In `src/app/[locale]/game/actions.ts`, add these functions:

```typescript
export async function loadGameMembers(gameId: number): Promise<{
  members: Edge<GameMember>[];
} | null> {
  try {
    const response = await authQuery({
      game: {
        __args: { id: gameId },
        members: {
          __args: { first: 50 },
          edges: {
            cursor: true,
            node: {
              id: true,
              user: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
              },
              role: true,
            },
          },
        },
      },
    });

    return { members: response.data?.game?.members?.edges ?? [] };
  } catch (error) {
    console.error("Failed to load game members:", error);
    return null;
  }
}

export async function addGameEditor(
  gameId: number,
  userId: string,
): Promise<{ success: boolean; gameMember?: GameMember; errorType?: string; message?: string }> {
  try {
    const response = await authMutate({
      addGameEditor: {
        __args: { input: { gameId, userId } },
        __typename: true,
        __on: [
          {
            __typeName: "AddGameEditorResponse",
            gameMember: {
              id: true,
              user: { id: true, firstName: true, lastName: true, username: true },
              role: true,
            },
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.addGameEditor, "AddGameEditorResponse");
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, gameMember: result.data.gameMember };
  } catch (error) {
    console.error("Failed to add game editor:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to add editor" };
  }
}

export async function removeGameEditor(
  gameId: number,
  userId: string,
): Promise<GameActionResult> {
  try {
    const response = await authMutate({
      removeGameEditor: {
        __args: { input: { gameId, userId } },
        __typename: true,
        __on: [
          { __typeName: "RemoveGameEditorResponse", id: true },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.removeGameEditor, "RemoveGameEditorResponse");
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true };
  } catch (error) {
    console.error("Failed to remove game editor:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to remove editor" };
  }
}

export async function transferGameOwnership(
  gameId: number,
  userId: string,
): Promise<{ success: boolean; gameMember?: GameMember; errorType?: string; message?: string }> {
  try {
    const response = await authMutate({
      transferGameOwnership: {
        __args: { input: { gameId, userId } },
        __typename: true,
        __on: [
          {
            __typeName: "TransferGameOwnershipResponse",
            gameMember: {
              id: true,
              user: { id: true, firstName: true, lastName: true, username: true },
              role: true,
            },
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.transferGameOwnership, "TransferGameOwnershipResponse");
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, gameMember: result.data.gameMember };
  } catch (error) {
    console.error("Failed to transfer game ownership:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to transfer ownership" };
  }
}
```

Import `GameMember` at the top:

```typescript
import type { ..., GameMember } from "@/lib/types/game";
```

**Step 3: Run build**

Run: `npm run build`

**Step 4: Commit**

```
feat: add editor management server actions and GameMember type
```

---

### Task 2.2: Create ManageEditorsDialog component

**Files:**
- Create: `src/components/game/manage-editors-dialog.tsx`

**Step 1: Create the dialog component**

This is a new file. It should:
- Accept `gameId`, `open`, `onOpenChange` props
- Load members on open using `loadGameMembers`
- Show member list with role badges
- Show "Remove" button next to editors (not owner)
- Show "Transfer Ownership" button on each editor with confirmation AlertDialog
- Show "Add Editor" section with user search input
- Use existing patterns: `AlertDialog` for confirmation, `toast` for feedback, `useTransition` for pending state
- Use `searchUsers` query for finding users to add (same pattern as existing search page)

See `src/components/chat/member-list-panel.tsx` for the member list pattern.
See `src/components/chat/friend-selector.tsx` for the user selector pattern.

**Step 2: Run build**

Run: `npm run build`

**Step 3: Commit**

```
feat: create ManageEditorsDialog component
```

---

### Task 2.3: Wire ManageEditorsDialog into game detail header

**Files:**
- Modify: `src/components/game/game-detail-header.tsx`

**Step 1: Add Manage Editors button and dialog**

Import `ManageEditorsDialog` and add a new button in the header when `viewerGameRole === "OWNER"`. Add state for `showEditorsDialog`. The button should use the `Users` icon from lucide-react.

Add after the delete button:

```typescript
{viewerGameRole === "OWNER" && (
  <Button
    variant="outline"
    onClick={() => setShowEditorsDialog(true)}
    disabled={isPending}
  >
    <Users className="mr-2 h-4 w-4" />
    {t("game.manageEditors")}
  </Button>
)}
```

Add the dialog at the bottom of the component:

```typescript
<ManageEditorsDialog
  gameId={game.id}
  open={showEditorsDialog}
  onOpenChange={setShowEditorsDialog}
/>
```

**Step 2: Add i18n keys for editor management**

Add to `messages/en.json` under `game`:

```json
"editors": {
  "title": "Manage Editors",
  "addEditor": "Add Editor",
  "removeEditor": "Remove Editor",
  "transferOwnership": "Transfer Ownership",
  "transferConfirmTitle": "Transfer Ownership",
  "transferConfirmDescription": "Are you sure you want to transfer ownership to {name}? You will become an editor.",
  "searchPlaceholder": "Search users...",
  "noEditors": "No editors yet",
  "removeConfirmTitle": "Remove Editor",
  "removeConfirmDescription": "Are you sure you want to remove {name} as an editor?"
}
```

**Step 3: Run build and lint**

Run: `npm run build && npm run lint`

**Step 4: Commit and create PR**

```
feat: wire ManageEditorsDialog into game detail header
```

---

## PR 3: Chat Role Management

**Branch:** `feat/chat-role-management`

### Task 3.1: Add updateMemberRole and leaveChat server actions

**Files:**
- Modify: `src/app/[locale]/chat/actions.ts`

**Step 1: Add updateMemberRole**

```typescript
export async function updateMemberRole(
  chatRoomId: string,
  userId: string,
  role: string,
): Promise<{ success: boolean; errorType?: string; message?: string }> {
  const { EnumType } = await import("json-to-graphql-query");
  try {
    const response = await authMutate({
      updateChatRoomMemberRole: {
        __args: {
          input: { chatRoomId, userId, role: new EnumType(role) },
        },
        __typename: true,
        __on: [
          {
            __typeName: "UpdateChatRoomMemberRoleResponse",
            member: { id: true, role: true },
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.updateChatRoomMemberRole, "UpdateChatRoomMemberRoleResponse");
    if (!result.success) return result;

    return { success: true };
  } catch (error) {
    console.error("Failed to update member role:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to update role" };
  }
}
```

**Step 2: Add leaveChat**

```typescript
export async function leaveChat(
  chatRoomId: string,
): Promise<{ success: boolean; errorType?: string; message?: string }> {
  try {
    const response = await authMutate({
      leaveChatRoom: {
        __args: { input: { chatRoomId } },
        __typename: true,
        __on: [
          { __typeName: "LeaveChatRoomResponse", chatRoomId: true },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.leaveChatRoom, "LeaveChatRoomResponse");
    if (!result.success) return result;

    return { success: true };
  } catch (error) {
    console.error("Failed to leave chat room:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to leave chat" };
  }
}
```

**Step 3: Run build**

Run: `npm run build`

**Step 4: Commit**

```
feat: add updateMemberRole and leaveChat server actions
```

---

### Task 3.2: Update MemberListPanel with role management

**Files:**
- Modify: `src/components/chat/member-list-panel.tsx`
- Modify: `src/components/chat/chat-layout.tsx:314-321` (pass currentUserRole)

**Step 1: Add currentUserRole prop to MemberListPanel**

Update `MemberListPanelProps` to include:

```typescript
currentUserRole: ChatRoomRole | null;
```

**Step 2: Add role-based action buttons**

For each member in the list, conditionally show:

- **Owner viewing other members:**
  - MEMBER: Show "Promote to Admin" button and "Remove" button
  - ADMIN: Show "Demote to Member" button and "Remove" button
  - Each editor row: Show "Transfer Ownership" button
- **Admin viewing other members:**
  - MEMBER: Show "Remove" button
  - ADMIN or OWNER: No action buttons
- **Member viewing:** No action buttons

Add a "Leave Chat" button in the sheet header for non-owners in group chats.

Use `updateMemberRole` for promotions/demotions.
Use `leaveChat` for leaving.

Add confirmation dialogs for:
- Transfer ownership: warn they become MEMBER
- Leave chat: simple confirmation

**Step 3: Pass currentUserRole from chat-layout**

In `src/components/chat/chat-layout.tsx`, the `MemberListPanel` call (line 314). Find the current user's role from `activeRoomMembers` and pass it:

```typescript
const currentUserRole = activeRoomMembers.find(
  (edge) => edge.node.user.id === currentUser.id,
)?.node.role ?? null;
```

Pass as prop:

```typescript
<MemberListPanel
  ...existing props...
  currentUserRole={currentUserRole}
/>
```

**Step 4: Add i18n keys**

Add to `messages/en.json` under `chat.members`:

```json
"promoteToAdmin": "Promote to Admin",
"demoteToMember": "Demote to Member",
"transferOwnership": "Transfer Ownership",
"leaveChat": "Leave Chat",
"transferConfirmTitle": "Transfer Ownership",
"transferConfirmDescription": "Are you sure? You will become a regular member.",
"leaveConfirmTitle": "Leave Chat",
"leaveConfirmDescription": "Are you sure you want to leave this chat?",
"cannotLeaveAsOwner": "Transfer ownership before leaving"
```

**Step 5: Run build and lint**

Run: `npm run build && npm run lint`

**Step 6: Commit and create PR**

```
feat: add chat role management (promote, demote, leave, transfer)
```

---

## PR 4: Blocking

**Branch:** `feat/blocking`

### Task 4.1: Add blockUser and unblockUser server actions

**Files:**
- Modify: `src/app/[locale]/user/[username]/actions.ts`

**Step 1: Add blockUser**

```typescript
export async function blockUser(userId: string): Promise<{
  success: boolean;
  errorType?: string;
  message?: string;
}> {
  try {
    const response = await authMutate({
      blockUser: {
        __args: { input: { userId } },
        __typename: true,
        __on: [
          {
            __typeName: "BlockUserResponse",
            friendship: {
              id: true,
              status: true,
              requester: { id: true },
              addressee: { id: true },
            },
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.blockUser, "BlockUserResponse");
    if (!result.success) return result;

    return { success: true };
  } catch {
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to block user" };
  }
}
```

**Step 2: Add unblockUser**

```typescript
export async function unblockUser(userId: string): Promise<{
  success: boolean;
  errorType?: string;
  message?: string;
}> {
  try {
    const response = await authMutate({
      unblockUser: {
        __args: { input: { userId } },
        __typename: true,
        __on: [
          {
            __typeName: "UnblockUserResponse",
            friendship: {
              id: true,
              status: true,
              requester: { id: true },
              addressee: { id: true },
            },
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.unblockUser, "UnblockUserResponse");
    if (!result.success) return result;

    return { success: true };
  } catch {
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to unblock user" };
  }
}
```

**Step 3: Run build**

Run: `npm run build`

**Step 4: Commit**

```
feat: add blockUser and unblockUser server actions
```

---

### Task 4.2: Add block/unblock UI to profile FriendActions

**Files:**
- Modify: `src/components/profile/friend-actions.tsx`

**Step 1: Add block/unblock functionality**

Import `blockUser`, `unblockUser` from user actions. Add `Ban`, `ShieldOff` from lucide-react.

Add a `DropdownMenu` (import from `@/components/ui/dropdown-menu`) with a "Block User" option that:
- Shows confirmation `AlertDialog` before blocking
- On confirm: calls `blockUser(userId)`, handles `UserBlockedYouError` and `SelfActionError` with toasts
- After blocking: updates local state to show "Blocked" with "Unblock" button

When `status === FriendshipStatus.BLOCKED`:
- Show "Unblock" button if the current user initiated the block (is the requester)
- On unblock: calls `unblockUser(userId)`, handles `BlockNotFoundError` and `UserBlockedYouError`

**Step 2: Add i18n keys**

Add to `messages/en.json` under `profile`:

```json
"block": {
  "blockUser": "Block User",
  "unblockUser": "Unblock User",
  "blocked": "Blocked",
  "confirmTitle": "Block {name}?",
  "confirmDescription": "They won't be able to see your profile, send you messages, or add you as a friend.",
  "success": "User blocked",
  "unblockSuccess": "User unblocked",
  "alreadyBlockedYou": "This user has already blocked you",
  "cannotBlockSelf": "You cannot block yourself",
  "error": "Something went wrong"
}
```

**Step 3: Run build**

Run: `npm run build`

**Step 4: Commit**

```
feat: add block/unblock UI to user profiles
```

---

### Task 4.3: Create blocked users settings page

**Files:**
- Create: `src/app/[locale]/settings/blocked/page.tsx`
- Create: `src/app/[locale]/settings/actions.ts`

**Step 1: Create settings actions**

`src/app/[locale]/settings/actions.ts`:

```typescript
"use server";

import { chatUserFragment, errorFragment } from "@/lib/graphql-fragments";
import { authQuery } from "@/lib/graphql-request";
import { EnumType } from "json-to-graphql-query";

export async function loadBlockedUsers(first: number, after?: string) {
  try {
    const response = await authQuery({
      friendships: {
        __args: {
          input: { status: new EnumType("BLOCKED") },
          first,
          ...(after ? { after } : {}),
        },
        edges: {
          cursor: true,
          node: {
            id: true,
            requester: chatUserFragment,
            addressee: chatUserFragment,
          },
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

    return response.data?.friendships || null;
  } catch (error) {
    console.error("Failed to load blocked users:", error);
    return null;
  }
}
```

**Step 2: Create the blocked users page**

`src/app/[locale]/settings/blocked/page.tsx`:

Server component that:
- Fetches blocked users using `loadBlockedUsers`
- Renders a list with user name and "Unblock" button next to each
- Shows empty state "You haven't blocked anyone"
- Uses the `unblockUser` action from user actions

**Step 3: Add i18n keys**

Add to `messages/en.json`:

```json
"settings": {
  "blocked": {
    "title": "Blocked Users",
    "description": "Users you have blocked won't be able to see your profile or contact you.",
    "empty": "You haven't blocked anyone",
    "unblock": "Unblock"
  }
}
```

**Step 4: Run build**

Run: `npm run build`

**Step 5: Commit**

```
feat: add blocked users settings page
```

---

### Task 4.4: Handle blocking errors in DM creation and friend requests

**Files:**
- Modify: `src/components/chat/message-button.tsx:27-31` (handle UserBlockedError)
- Modify: `src/components/profile/friend-actions.tsx:57-66` (handle blocked friend request)

**Step 1: Update MessageButton**

In `src/components/chat/message-button.tsx`, after checking `result.success` (line 27-30), add error type checking:

```typescript
if (result.success && result.chatRoom) {
  router.push(`/chat?room=${result.chatRoom.id}`);
} else if (result.errorType === "UserBlockedError") {
  toast.error(t("cannotMessageBlocked"));
} else {
  toast.error(result.message || "Failed to create conversation");
}
```

**Step 2: Update FriendActions sendFriendRequest handler**

In `src/components/profile/friend-actions.tsx`, the `handleAddFriend` function (line 56-67). Check for blocked error:

```typescript
if (result.success) {
  setLocalFriendship(result.friendship);
  setHasSentRequest(true);
  toast.success(t("requestSent"));
} else if (result.errorType === "FriendshipAlreadyExistsError") {
  toast.error(t("cannotAddBlocked"));
} else {
  toast.error(t("error"));
}
```

**Step 3: Add i18n keys**

Add `"cannotMessageBlocked": "Cannot message this user"` under `profile`.
Add `"cannotAddBlocked": "Cannot send friend request to this user"` under `profile.friends`.

**Step 4: Run build and lint**

Run: `npm run build && npm run lint`

**Step 5: Commit and create PR**

```
feat: handle blocking errors in DM creation and friend requests
```

---

## PR 5: Game Participation Visibility

**Branch:** `feat/game-participation-visibility`

### Task 5.1: Gate join buttons on game visibility and viewerGameRole

**Files:**
- Modify: `src/components/game/game-participants.tsx:25-28` (add props)
- Modify: `src/components/game/individual-participant-list.tsx:15-19` (add props, gate join)
- Modify: `src/components/game/team-card.tsx:27-32` (add props, gate join/remove)
- Modify: `src/app/[locale]/game/[id]/page.tsx:245-247` (pass new props)

**Step 1: Update GameParticipants to accept and pass auth props**

In `src/components/game/game-participants.tsx`, update interface:

```typescript
interface GameParticipantsProps {
  game: GameDetail;
  currentPlayerId: number;
  viewerGameRole: GameRole | null;
  visibility: GameVisibility;
}
```

Pass to children:

```typescript
<IndividualParticipantList
  participants={game.participants.edges.map((edge) => edge.node)}
  gameId={game.id}
  currentPlayerId={currentPlayerId}
  atParticipantLimit={atParticipantLimit}
  viewerGameRole={viewerGameRole}
  visibility={visibility}
/>
```

```typescript
<TeamCard
  key={participant.id}
  team={participant}
  gameId={game.id}
  gameStatus={game.gameStatus}
  currentPlayerId={currentPlayerId}
  isPlayerOnAnyTeam={isPlayerOnAnyTeam}
  viewerGameRole={viewerGameRole}
  visibility={visibility}
/>
```

Gate "Add Team" button: only show when `viewerGameRole != null || visibility === "PUBLIC"`:

```typescript
{isTeamBased && !atParticipantLimit && (viewerGameRole != null || visibility === "PUBLIC") && (
  <Button onClick={() => setShowAddTeamDialog(true)} size="sm">
    {t("game.participants.addTeam")}
  </Button>
)}
```

**Step 2: Update IndividualParticipantList**

Update interface to add `viewerGameRole` and `visibility` props. Gate the join button:

```typescript
const canJoin =
  !atParticipantLimit &&
  !isCurrentPlayerParticipant &&
  (viewerGameRole != null || visibility === "PUBLIC");
```

Replace the non-participant branch (line 100-112):

```typescript
{isCurrentPlayerParticipant ? (
  <Button variant="outline" size="sm" onClick={handleLeaveGame} disabled={isPending}>
    {t("game.participants.leaveGame")}
  </Button>
) : (
  canJoin && (
    <Button variant="default" size="sm" onClick={handleJoinGame} disabled={isPending}>
      <UserPlus className="mr-2 h-4 w-4" />
      {t("game.participants.joinGame")}
    </Button>
  )
)}
```

Also gate the remove button on each participant — only show when `viewerGameRole != null`:

```typescript
{viewerGameRole != null && (
  <Button variant="ghost" size="icon" onClick={() => handleRemoveParticipant(player.id)} disabled={isPending}>
    <X className="h-4 w-4" />
    <span className="sr-only">{t("game.participants.removeParticipant")}</span>
  </Button>
)}
```

**Step 3: Update TeamCard**

Update interface to add `viewerGameRole` and `visibility` props.

Gate join/leave and remove:
- Join team: show when `(viewerGameRole != null || visibility === "PUBLIC") && !isPlayerOnAnyTeam`
- Leave team: always show for current team members
- Remove team button: only show when `viewerGameRole != null`

**Step 4: Pass props from page**

In `src/app/[locale]/game/[id]/page.tsx`:

```typescript
<GameParticipants
  game={game}
  currentPlayerId={player.id}
  viewerGameRole={game.viewerGameRole}
  visibility={game.visibility}
/>
```

**Step 5: Run build and lint**

Run: `npm run build && npm run lint`

**Step 6: Commit and create PR**

```
feat: gate game participation on visibility and viewer role
```

---

## Summary of PR Order

1. **PR 1: Game Role-Based Auth** — Foundation: types, queries, button gating
2. **PR 2: Editor Management** — New feature: dialog, mutations, editor CRUD
3. **PR 3: Chat Role Management** — Enhancement: promote/demote/leave/transfer
4. **PR 4: Blocking** — New feature: block/unblock UI, settings page, error handling
5. **PR 5: Game Participation Visibility** — Enhancement: PUBLIC/PRIVATE join gating

Each PR should pass `npm run build` and `npm run lint` before creating.
