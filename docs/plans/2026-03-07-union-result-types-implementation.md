# Union Result Types — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update all implemented mutations to properly handle GraphQL union result types and return structured domain errors.

**Architecture:** Add a generic `extractMutationResult` helper and `errorFragment` catch-all. Each mutation query wraps its success fields in `__on` inline fragments alongside the Error interface fragment. Server actions return `{ errorType, message }` instead of `{ error }`.

**Tech Stack:** TypeScript, json-to-graphql-query, Next.js server actions, Vitest

**Design doc:** `docs/plans/2026-03-07-union-result-types-design.md`

---

## PR 1: Infrastructure + Simple CRUD Mutations

**Branch:** `union-result-types-infrastructure`

### Task 1: Create `extractMutationResult` utility and `errorFragment`

**Files:**
- Create: `src/lib/graphql-result.ts`
- Modify: `src/lib/graphql-fragments.ts`

**Step 1: Write the test**

Create `__tests__/lib/graphql-result.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractMutationResult } from "@/lib/graphql-result";

describe("extractMutationResult", () => {
  it("returns success when __typename matches", () => {
    const result = extractMutationResult<{ player: { id: string } }>(
      { __typename: "CreatePlayerResponse", player: { id: "1" } },
      "CreatePlayerResponse",
    );
    expect(result).toEqual({
      success: true,
      data: { __typename: "CreatePlayerResponse", player: { id: "1" } },
    });
  });

  it("returns error when __typename does not match", () => {
    const result = extractMutationResult(
      { __typename: "PlayerAlreadyExistsError", message: "Player already exists" },
      "CreatePlayerResponse",
    );
    expect(result).toEqual({
      success: false,
      errorType: "PlayerAlreadyExistsError",
      message: "Player already exists",
    });
  });

  it("returns error with fallback message when message is missing", () => {
    const result = extractMutationResult(
      { __typename: "SomeError" },
      "CreatePlayerResponse",
    );
    expect(result).toEqual({
      success: false,
      errorType: "SomeError",
      message: "An unexpected error occurred",
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/graphql-result.test.ts`
Expected: FAIL — module not found

**Step 3: Write `src/lib/graphql-result.ts`**

```ts
/**
 * Typed result types for GraphQL mutations that return union result types.
 *
 * Usage:
 * 1. Request `__typename: true` and `__on: [{ __typeName: "XxxResponse", ...fields }, errorFragment]`
 * 2. Call `extractMutationResult(response.data.mutationName, "XxxResponse")`
 * 3. Check `.success` to discriminate
 */

export type MutationSuccess<T> = { success: true; data: T };
export type MutationError = {
  success: false;
  errorType: string;
  message: string;
};
export type MutationResult<T> = MutationSuccess<T> | MutationError;

/**
 * Extracts a typed result from a GraphQL union response.
 *
 * If `result.__typename` matches `successTypeName`, returns `{ success: true, data }`.
 * Otherwise returns `{ success: false, errorType, message }`.
 */
export function extractMutationResult<T>(
  result: { __typename: string; message?: string },
  successTypeName: string,
): MutationResult<T> {
  if (result.__typename === successTypeName) {
    return { success: true, data: result as T };
  }

  return {
    success: false,
    errorType: result.__typename,
    message: result.message ?? "An unexpected error occurred",
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/graphql-result.test.ts`
Expected: PASS

**Step 5: Add `errorFragment` to graphql-fragments.ts**

Add at the end of `src/lib/graphql-fragments.ts`:

```ts
/**
 * Catch-all fragment for the Error interface in union result types.
 * Every error type implements this interface, so this matches all errors.
 * The __typename at the union level still gives the specific error type.
 * Use as: __on: [{ __typeName: "SuccessResponse", ...fields }, errorFragment]
 */
export const errorFragment = { __typeName: "Error", message: true };
```

**Step 6: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 7: Commit**

```
git add src/lib/graphql-result.ts src/lib/graphql-fragments.ts __tests__/lib/graphql-result.test.ts
git commit -m "add extractMutationResult utility and errorFragment for union result types"
```

---

### Task 2: Migrate player mutations

**Files:**
- Modify: `src/app/[locale]/player/actions.ts`
- Modify: `src/components/player/player-profile-card.tsx`

**Step 1: Update `player/actions.ts`**

Replace inline `PlayerActionResult` and both mutations.

The result type becomes:

```ts
interface PlayerActionResult {
  success: boolean;
  player?: Player;
  errorType?: string;
  message?: string;
}
```

For `createPlayer`, the mutation object becomes:

```ts
createPlayer: {
  __args: { input },
  __typename: true,
  __on: [
    {
      __typeName: "CreatePlayerResponse",
      player: {
        id: true,
        firstName: true,
        lastName: true,
        age: true,
        height: true,
        weight: true,
        biography: true,
      },
    },
    errorFragment,
  ],
},
```

Error checking becomes:

```ts
if (response.errors?.length > 0) {
  return { success: false, errorType: "GRAPHQL_ERROR", message: response.errors[0].message };
}

const result = extractMutationResult<{ player: Player }>(
  response.data.createPlayer,
  "CreatePlayerResponse",
);
if (!result.success) return result;

revalidatePath("/[locale]/player", "page");
return { success: true, player: result.data.player };
```

Apply the same pattern to `updatePlayer` with `"UpdatePlayerResponse"`.

New imports needed:

```ts
import { errorFragment } from "@/lib/graphql-fragments";
import { extractMutationResult } from "@/lib/graphql-result";
```

**Step 2: Update `player-profile-card.tsx`**

Find all references to `result.error` and change to `result.message`. The component displays errors via toast — find the toast call that uses `result.error` and switch to `result.message`.

**Step 3: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 4: Commit**

```
git commit -m "migrate player mutations to union result types"
```

---

### Task 3: Migrate game CRUD mutations

**Files:**
- Modify: `src/app/[locale]/game/actions.ts`
- Modify: `src/components/game/create-game-form.tsx`
- Modify: `src/components/game/update-game-form.tsx`
- Modify: `src/components/game/game-detail-header.tsx`
- Modify: `src/components/game/delete-game-dialog.tsx`

**Step 1: Update `game/actions.ts`**

Update `GameActionResult`:

```ts
interface GameActionResult {
  success: boolean;
  gameId?: number;
  errorType?: string;
  message?: string;
}
```

Add imports:

```ts
import { errorFragment } from "@/lib/graphql-fragments";
import { extractMutationResult } from "@/lib/graphql-result";
```

Migrate each mutation:

| Function | Success `__typeName` | Notes |
|----------|---------------------|-------|
| `createGame` | `"CreateGameResponse"` | Schema: `CreateGameResult = CreateGameResponse \| InvalidSportConfigError` |
| `updateGame` | `"UpdateGameResponse"` | Schema: `UpdateGameResult = UpdateGameResponse \| GameNotFoundError \| InvalidSportConfigError \| InvalidDateRangeError` |
| `deleteGame` | `"DeleteGameResponse"` | Schema: `DeleteGameResult = DeleteGameResponse \| GameNotFoundError`. Special: response only has `id`, wrap `__on` around it |
| `startGame` | `"StartGameResponse"` | Schema: `StartGameResult = StartGameResponse \| GameNotFoundError \| InvalidGameStatusTransitionError` |
| `endGame` | `"EndGameResponse"` | Schema: `EndGameResult = EndGameResponse \| GameNotFoundError \| InvalidGameStatusTransitionError` |

For `deleteGame`, the mutation currently has flat fields (`id: true`). Wrap in union:

```ts
deleteGame: {
  __args: { input: { id: gameId } },
  __typename: true,
  __on: [
    { __typeName: "DeleteGameResponse", id: true },
    errorFragment,
  ],
},
```

Then:

```ts
const result = extractMutationResult<{ id: string }>(
  response.data.deleteGame,
  "DeleteGameResponse",
);
if (!result.success) return result;
```

**Step 2: Update consumer components**

All four components check `result.error` — change to `result.message`:

- `create-game-form.tsx`: Find `result.error` references, change to `result.message`
- `update-game-form.tsx`: Same
- `game-detail-header.tsx`: Same
- `delete-game-dialog.tsx`: Same

**Step 3: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 4: Commit**

```
git commit -m "migrate game CRUD mutations to union result types"
```

---

### Task 4: Migrate upload mutations

**Files:**
- Modify: `src/app/[locale]/upload/actions.ts`
- Modify: `src/components/profile/profile-avatar.tsx`
- Modify: `src/components/game/game-media-gallery.tsx`
- Modify: `src/components/chat/conversation-view.tsx`

**Step 1: Update `upload/actions.ts`**

Update result types:

```ts
interface RequestUploadResult {
  success: boolean;
  uploadUrl?: string | null;
  resourceId?: string;
  errorType?: string;
  message?: string;
}

interface ConfirmUploadResult {
  success: boolean;
  resource?: Resource;
  errorType?: string;
  message?: string;
}

interface DeleteResourceResult {
  success: boolean;
  errorType?: string;
  message?: string;
}
```

Add imports:

```ts
import { errorFragment, resourceFragment } from "@/lib/graphql-fragments";
import { extractMutationResult } from "@/lib/graphql-result";
```

Migrate each of the 3 `requestUpload` variants (profile picture, game media, chat media), `confirmUpload`, and `deleteResource`.

For `requestUpload` variants — the mutation currently has flat fields. Wrap:

```ts
requestUpload: {
  __args: { input: { ... } },
  __typename: true,
  __on: [
    { __typeName: "RequestUploadResponse", uploadUrl: true, resourceId: true },
    errorFragment,
  ],
},
```

Schema unions:
- `RequestUploadResult = RequestUploadResponse | InvalidUploadContextError`
- `ConfirmUploadResult = ConfirmUploadResponse | ResourceNotFoundError`
- `DeleteResourceResult = DeleteResourceResponse | ResourceNotFoundError`

For `confirmUpload`, the `resource` field uses `resourceFragment`:

```ts
confirmUpload: {
  __args: { input: { resourceId } },
  __typename: true,
  __on: [
    { __typeName: "ConfirmUploadResponse", resource: resourceFragment },
    errorFragment,
  ],
},
```

For `deleteResource`:

```ts
deleteResource: {
  __args: { input: { resourceId } },
  __typename: true,
  __on: [
    { __typeName: "DeleteResourceResponse", id: true },
    errorFragment,
  ],
},
```

**Step 2: Update consumer components**

- `profile-avatar.tsx`: Change `requestResult.error` → `requestResult.message`, `confirmResult.error` → `confirmResult.message`, `result.error` → `result.message`
- `game-media-gallery.tsx`: Change `requestResult.error` → `requestResult.message`
- `conversation-view.tsx`: Change upload error references to `.message`

**Step 3: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 4: Commit**

```
git commit -m "migrate upload mutations to union result types"
```

---

### Task 5: Migrate notification mutations

**Files:**
- Modify: `src/components/notification/actions.ts`
- Modify: `src/lib/types/notification.ts`
- Modify: `src/components/notification/notification-bell.tsx`

**Step 1: Update `notification.ts` types**

Update `MarkNotificationsAsReadResult`:

```ts
export interface MarkNotificationsAsReadResult {
  success: boolean;
  notifications: Notification[] | null;
  errorType?: string;
  message?: string;
}
```

Note: `FetchNotificationsResult` is for a query, not a mutation — leave it unchanged.

**Step 2: Update `notification/actions.ts`**

Add imports:

```ts
import { errorFragment, notificationInlineFragments } from "@/lib/graphql-fragments";
import { extractMutationResult } from "@/lib/graphql-result";
```

Migrate `markNotificationsAsRead`:

```ts
const response = await authMutate({
  readNotifications: {
    __args: { input: { ids } },
    __typename: true,
    __on: [
      {
        __typeName: "ReadNotificationsResponse",
        notifications: notificationNodeSelection,
      },
      errorFragment,
    ],
  },
});

if (response.errors?.length > 0) {
  return { success: false, notifications: null, errorType: "GRAPHQL_ERROR", message: response.errors[0].message };
}

const result = extractMutationResult<{ notifications: Notification[] }>(
  response.data.readNotifications,
  "ReadNotificationsResponse",
);
if (!result.success) {
  return { success: false, notifications: null, errorType: result.errorType, message: result.message };
}

return { success: true, notifications: result.data.notifications };
```

**Step 3: Update `notification-bell.tsx`**

Find references to `result.error` on markNotificationsAsRead results and change to `result.message`.

**Step 4: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 5: Commit**

```
git commit -m "migrate notification mutation to union result types"
```

---

### Task 6: Final PR 1 verification

**Step 1: Run full test suite**

Run: `npm test`
Expected: PASS

**Step 2: Run build**

Run: `npm run build`
Expected: PASS

**Step 3: Review all changes**

Run: `git diff main --stat` to see all files changed.
Verify each action file imports `errorFragment` and `extractMutationResult`.
Verify each mutation uses `__typename: true` and `__on: [...]`.
Verify no component still references `.error` for these mutations.

---

## PR 2: Game Participant + Box Score Mutations

**Branch:** `union-result-types-participants` (from PR 1 branch)

### Task 7: Migrate participant mutations

**Files:**
- Modify: `src/app/[locale]/game/participant-actions.ts`
- Modify: `src/lib/types/game.ts` (update `ParticipantActionResult`)
- Modify: `src/components/game/add-team-form.tsx`
- Modify: `src/components/game/individual-participant-list.tsx`
- Modify: `src/components/game/team-card.tsx`
- Modify: `src/components/game/scoreboard/basketball-score-form.tsx`

**Step 1: Update `ParticipantActionResult` in `src/lib/types/game.ts`**

```ts
export interface ParticipantActionResult {
  success: boolean;
  participantId?: number;
  errorType?: string;
  message?: string;
}
```

**Step 2: Update `participant-actions.ts`**

Add imports:

```ts
import { errorFragment, participantMetadataFragment } from "@/lib/graphql-fragments";
import { extractMutationResult } from "@/lib/graphql-result";
```

Migrate each function. The key complexity is the nested `__on` for participant types inside the union result.

Schema unions:
| Function | Mutation | Success Type | Union |
|----------|----------|-------------|-------|
| `addTeamParticipant` | `addGameParticipant` | `AddGameParticipantResponse` | `+ GameNotFoundError \| PlayerNotFoundError \| InvalidParticipantTypeError` |
| `addIndividualParticipant` | `addGameParticipant` | `AddGameParticipantResponse` | same |
| `updateTeamParticipant` | `updateGameParticipant` | `UpdateGameParticipantResponse` | `+ GameNotFoundError \| ParticipantNotFoundError` |
| `updateParticipantScores` | `updateGameParticipants` | `UpdateGameParticipantsResponse` | `+ GameNotFoundError \| ParticipantNotFoundError` |
| `removeTeamParticipant` | `removeGameParticipant` | `RemoveGameParticipantResponse` | `+ GameNotFoundError \| ParticipantNotFoundError` |
| `removeIndividualParticipant` | `removeGameParticipant` | `RemoveGameParticipantResponse` | same |
| `joinTeam` | `addPlayerToTeamInstance` | `AddPlayerToTeamInstanceResponse` | `+ TeamInstanceNotFoundError \| PlayerNotFoundError` |
| `leaveTeam` | `removePlayerFromTeamInstance` | `RemovePlayerFromTeamInstanceResponse` | `+ TeamInstanceNotFoundError \| PlayerNotFoundError` |

Example for `addTeamParticipant` (nested __on):

```ts
addGameParticipant: {
  __args: { input: { teamInstance: mutationInput } },
  __typename: true,
  __on: [
    {
      __typeName: "AddGameParticipantResponse",
      participant: {
        __on: {
          __typeName: "TeamInstance",
          id: true,
          name: true,
          description: true,
          players: { id: true, firstName: true, lastName: true },
          metadata: participantMetadataFragment,
        },
      },
    },
    errorFragment,
  ],
},
```

For `removeTeamParticipant` and `removeIndividualParticipant`, the response only has `id`:

```ts
removeGameParticipant: {
  __args: { input: { teamInstance: { id: input.teamInstanceId } } },
  __typename: true,
  __on: [
    { __typeName: "RemoveGameParticipantResponse", id: true },
    errorFragment,
  ],
},
```

For `updateParticipantScores` (bulk), the response has `participants` array:

```ts
updateGameParticipants: {
  __args: { input: mutationInput },
  __typename: true,
  __on: [
    {
      __typeName: "UpdateGameParticipantsResponse",
      participants: {
        __on: [
          { __typeName: "TeamInstance", id: true, metadata: participantMetadataFragment },
          { __typeName: "IndividualParticipant", id: true, metadata: participantMetadataFragment },
        ],
      },
    },
    errorFragment,
  ],
},
```

For `joinTeam` and `leaveTeam`:

```ts
addPlayerToTeamInstance: {
  __args: { input: { teamInstanceId: input.teamInstanceId, playerId: input.playerId } },
  __typename: true,
  __on: [
    {
      __typeName: "AddPlayerToTeamInstanceResponse",
      teamInstance: { id: true, name: true, players: { id: true, firstName: true, lastName: true } },
    },
    errorFragment,
  ],
},
```

**Step 3: Update consumer components**

Change `.error` → `.message` in:
- `add-team-form.tsx`
- `individual-participant-list.tsx`
- `team-card.tsx`
- `basketball-score-form.tsx`

**Step 4: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 5: Commit**

```
git commit -m "migrate participant mutations to union result types"
```

---

### Task 8: Migrate box score mutations

**Files:**
- Modify: `src/app/[locale]/game/box-score-actions.ts`
- Modify: `src/components/game/basketball-box-score-table.tsx`

**Step 1: Update `box-score-actions.ts`**

Update `BoxScoreActionResult`:

```ts
interface BoxScoreActionResult {
  success: boolean;
  boxScoreId?: string;
  boxScoreIds?: string[];
  errorType?: string;
  message?: string;
}
```

Add imports:

```ts
import { errorFragment } from "@/lib/graphql-fragments";
import { extractMutationResult } from "@/lib/graphql-result";
```

Schema unions:
- `SaveBasketballBoxScoreResult = SaveBasketballBoxScoreResponse | GameNotFoundError | InvalidSportTypeError`
- `SaveBasketballBoxScoresResult = SaveBasketballBoxScoresResponse | GameNotFoundError | InvalidSportTypeError`

For `saveBasketballBoxScore`:

```ts
saveBasketballBoxScore: {
  __args: { input: mutationInput },
  __typename: true,
  __on: [
    {
      __typeName: "SaveBasketballBoxScoreResponse",
      basketballBoxScore: {
        id: true,
        player: { id: true, firstName: true, lastName: true },
        points: true,
        // ... all other fields ...
      },
    },
    errorFragment,
  ],
},
```

For `saveBasketballBoxScores` — same pattern with `"SaveBasketballBoxScoresResponse"` and `basketballBoxScores` array.

Also remove the `console.log(JSON.stringify(response))` debug line from `saveBasketballBoxScore`.

**Step 2: Update `basketball-box-score-table.tsx`**

Change `.error` → `.message`.

**Step 3: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 4: Commit**

```
git commit -m "migrate box score mutations to union result types"
```

---

### Task 9: Final PR 2 verification

Same as Task 6 — run tests, build, review.

---

## PR 3: Chat + Friendship Mutations

**Branch:** `union-result-types-chat-friendship` (from PR 1 branch)

### Task 10: Migrate chat mutations

**Files:**
- Modify: `src/app/[locale]/chat/actions.ts`
- Modify: `src/components/chat/create-chat-room-dialog.tsx`
- Modify: `src/components/chat/message-button.tsx`
- Modify: `src/components/chat/conversation-view.tsx`
- Modify: `src/components/chat/member-list-panel.tsx`

**Step 1: Update `chat/actions.ts`**

Add imports:

```ts
import { errorFragment } from "@/lib/graphql-fragments";
import { extractMutationResult } from "@/lib/graphql-result";
```

Schema unions:
| Function | Success Type | Union Errors |
|----------|-------------|--------------|
| `createDirectMessage` | `CreateDirectMessageResponse` | `UserBlockedError` |
| `createGroupChat` | `CreateGroupChatResponse` | `EmptyChatRoomError` |
| `sendMessage` | `SendChatMessageResponse` | `ChatRoomNotFoundError` |
| `sendMediaMessage` | `SendChatMessageResponse` | `ChatRoomNotFoundError` |
| `updateMessage` | `UpdateChatMessageResponse` | `ChatMessageNotFoundError \| MessageNotEditableError` |
| `deleteMessage` | `DeleteChatMessageResponse` | `ChatMessageNotFoundError` |
| `addMember` | `AddChatRoomMemberResponse` | `ChatRoomNotFoundError \| DirectMessageNotAllowedError` |
| `removeMember` | `RemoveChatRoomMemberResponse` | `ChatRoomNotFoundError \| DirectMessageNotAllowedError \| CannotRemoveOwnerError \| InsufficientRoleError` |

Update each mutation's return type to use `errorType?: string; message?: string` instead of `error?: string`.

Example for `createDirectMessage`:

```ts
const response = await authMutate({
  createDirectMessage: {
    __args: { input: { userId: parsed.data.userId } },
    __typename: true,
    __on: [
      { __typeName: "CreateDirectMessageResponse", chatRoom: chatRoomListNodeSelection },
      errorFragment,
    ],
  },
});

if (response.errors?.length > 0) {
  return { success: false, errorType: "GRAPHQL_ERROR", message: response.errors[0].message };
}

const result = extractMutationResult<{ chatRoom: ChatRoomListNode }>(
  response.data.createDirectMessage,
  "CreateDirectMessageResponse",
);
if (!result.success) return result;

return { success: true, chatRoom: result.data.chatRoom };
```

For `deleteMessage`, the response only has `id`:

```ts
deleteChatMessage: {
  __args: { input: { id } },
  __typename: true,
  __on: [
    { __typeName: "DeleteChatMessageResponse", id: true },
    errorFragment,
  ],
},
```

For `updateMessage`, the response has nested `__on` for ChatMessage types:

```ts
updateChatMessage: {
  __args: { input: { textMessage: { id, content } } },
  __typename: true,
  __on: [
    {
      __typeName: "UpdateChatMessageResponse",
      chatMessage: {
        id: true,
        __on: [{ __typeName: "TextChatMessage", content: true, updatedDate: true }],
      },
    },
    errorFragment,
  ],
},
```

**Step 2: Update consumer components**

Change `.error` → `.message` in:
- `create-chat-room-dialog.tsx`
- `message-button.tsx`
- `conversation-view.tsx`
- `member-list-panel.tsx`

**Step 3: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 4: Commit**

```
git commit -m "migrate chat mutations to union result types"
```

---

### Task 11: Migrate friendship mutations

**Files:**
- Modify: `src/app/[locale]/user/[username]/actions.ts`
- Modify: `src/components/profile/friend-actions.tsx`

**Step 1: Update `user/[username]/actions.ts`**

Add imports:

```ts
import { errorFragment } from "@/lib/graphql-fragments";
import { extractMutationResult } from "@/lib/graphql-result";
```

Schema unions:
- `SendFriendRequestResult = SendFriendRequestResponse | UserNotFoundError | SelfActionError | FriendshipAlreadyExistsError`
- `AcceptFriendRequestResult = AcceptFriendRequestResponse | FriendRequestNotFoundError | InvalidFriendshipStateError`

Migrate `sendFriendRequest`:

```ts
const response = await authMutate({
  sendFriendRequest: {
    __args: { input: { userId } },
    __typename: true,
    __on: [
      {
        __typeName: "SendFriendRequestResponse",
        friendship: { id: true, status: true, requester: { id: true }, addressee: { id: true } },
      },
      errorFragment,
    ],
  },
});

if (response.errors?.length > 0) {
  return { success: false, errorType: "GRAPHQL_ERROR", message: response.errors[0].message };
}

const result = extractMutationResult<{ friendship: { id: string; status: string } }>(
  response.data.sendFriendRequest,
  "SendFriendRequestResponse",
);
if (!result.success) return result;

return { success: true, friendship: result.data.friendship };
```

Same pattern for `acceptFriendRequest` with `"AcceptFriendRequestResponse"`.

**Step 2: Update `friend-actions.tsx`**

Change `.error` → `.message`.

**Step 3: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 4: Commit**

```
git commit -m "migrate friendship mutations to union result types"
```

---

### Task 12: Final PR 3 verification

Same as Task 6 — run tests, build, review.

---

## Out of Scope (Not Implemented Yet)

These mutations exist in the schema but have no frontend call sites. They'll get union result handling when they're built:

- `startLivestream`, `endLivestream`, `updateLivestream`
- `finalizeGameResults`, `unfinalizeGameResults`
- `renameChatRoom`, `updateChatRoomMemberRole`, `leaveChatRoom`
- `declineFriendRequest`, `cancelFriendRequest`, `unfriend`, `blockUser`, `unblockUser`
- `deletePlayer`
