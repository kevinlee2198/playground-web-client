# Union Result Types — Design

## Problem

The backend now returns union result types for all mutations (e.g., `CreatePlayerResult = CreatePlayerResponse | PlayerAlreadyExistsError`). The frontend ignores these unions — it only requests success response fields and checks `response.errors` for protocol-level errors. Domain-level errors (e.g., `PlayerAlreadyExistsError`, `UserBlockedError`, `GameNotFoundError`) are silently missed.

**Scope:** 37 mutations across 13 action files. 30+ union result types. 25+ typed error types.

## Approach

**Generic `extractMutationResult` helper** with a catch-all `... on Error { message }` fragment. Every mutation query requests `__typename` on the union, uses inline fragments for the success response and the `Error` interface, then calls the helper to discriminate.

**Structured error returns** from server actions: `{ success: false; errorType: string; message: string }` so components can branch on error type.

## Infrastructure

### New file: `src/lib/graphql-result.ts`

```ts
type MutationSuccess<T> = { success: true; data: T };
type MutationError = { success: false; errorType: string; message: string };
type MutationResult<T> = MutationSuccess<T> | MutationError;

function extractMutationResult<T>(
  result: { __typename: string; message?: string },
  successTypeName: string,
): MutationResult<T>
```

- If `result.__typename === successTypeName`, returns `{ success: true, data: result as T }`.
- Otherwise, returns `{ success: false, errorType: result.__typename, message: result.message }`.

### New fragment in `src/lib/graphql-fragments.ts`

```ts
export const errorFragment = { __typeName: "Error", message: true };
```

Uses the `Error` interface — every error type implements it, so this is a catch-all. The `__typename` field at the union level still gives us the specific error type name (e.g., `"PlayerAlreadyExistsError"`).

## Migration Pattern

### Before

```ts
const response = await authMutate({
  createPlayer: {
    __args: { input },
    player: { id: true, firstName: true, ... },
  },
});

if (response.errors?.length > 0) {
  return { success: false, error: response.errors[0].message };
}

return { success: true, player: response.data.createPlayer.player };
```

### After

```ts
const response = await authMutate({
  createPlayer: {
    __args: { input },
    __typename: true,
    __on: [
      {
        __typeName: "CreatePlayerResponse",
        player: { id: true, firstName: true, ... },
      },
      errorFragment,
    ],
  },
});

if (response.errors?.length > 0) {
  return { success: false, errorType: "GRAPHQL_ERROR", message: response.errors[0].message };
}

const result = extractMutationResult<{ player: Player }>(
  response.data.createPlayer,
  "CreatePlayerResponse",
);
if (!result.success) return result;

return { success: true, player: result.data.player };
```

### Action return type change

```ts
// Before
interface PlayerActionResult {
  success: boolean;
  player?: Player;
  error?: string;
}

// After
interface PlayerActionResult {
  success: boolean;
  player?: Player;
  errorType?: string;
  message?: string;
}
```

Components that display `result.error` switch to `result.message`. They gain `result.errorType` for specific error branching.

## Nested `__on` (Participant Mutations)

Mutations like `addGameParticipant` already use `__on` for the `GameParticipant` interface. With result unions, there are two levels:

```ts
addGameParticipant: {
  __args: { input },
  __typename: true,
  __on: [
    {
      __typeName: "AddGameParticipantResponse",
      participant: {
        __typename: true,
        __on: [
          { __typeName: "TeamInstance", id: true, name: true, ... },
          { __typeName: "IndividualParticipant", id: true, player: { ... } },
        ],
      },
    },
    errorFragment,
  ],
}
```

Existing `participantNodeFragment` / `participantDetailNodeFragment` are reused inside the success `__typeName` block unchanged.

## PR Plan

### PR 1: Infrastructure + Simple CRUD (~15 mutations)

**Infrastructure:**
- New `src/lib/graphql-result.ts`
- Add `errorFragment` to `src/lib/graphql-fragments.ts`

**Mutations:**
- Player (2): `createPlayer`, `updatePlayer`
- Game CRUD (5): `createGame`, `updateGame`, `deleteGame`, `startGame`, `endGame`
- Upload (3): `requestUpload`, `confirmUpload`, `deleteResource`
- Notifications (1): `readNotifications`
- Livestream (3): `startLivestream`, `endLivestream`, `updateLivestream`
- Game results (2): `finalizeGameResults`, `unfinalizeGameResults`

**Files modified:**
- `src/lib/graphql-result.ts` (new)
- `src/lib/graphql-fragments.ts`
- `src/app/[locale]/player/actions.ts`
- `src/app/[locale]/game/actions.ts`
- `src/app/[locale]/upload/actions.ts`
- `src/components/notification/actions.ts`
- Plus any components that check `result.error` for these actions

### PR 2: Game Participant + Box Score Mutations (~10 mutations)

- `addGameParticipant`, `addGameParticipants`
- `updateGameParticipant`, `updateGameParticipants`
- `removeGameParticipant`, `removeGameParticipants`
- `addPlayerToTeamInstance`, `removePlayerFromTeamInstance`
- `saveBasketballBoxScore`, `saveBasketballBoxScores`

**Files modified:**
- `src/app/[locale]/game/participant-actions.ts`
- `src/app/[locale]/game/box-score-actions.ts`
- Plus components

### PR 3: Chat + Friendship Mutations (~14 mutations)

**Chat (8):**
- `createDirectMessage`, `createGroupChat`
- `sendChatMessage`, `updateChatMessage`, `deleteChatMessage`
- `addChatRoomMember`, `removeChatRoomMember`
- `renameChatRoom`, `updateChatRoomMemberRole`, `leaveChatRoom`

**Friendship (6):**
- `sendFriendRequest`, `acceptFriendRequest`, `declineFriendRequest`
- `cancelFriendRequest`, `unfriend`
- `blockUser`, `unblockUser`

**Files modified:**
- `src/app/[locale]/chat/actions.ts`
- `src/app/[locale]/user/[username]/actions.ts`
- Plus components

### Dependencies

PR 1 is the foundation. PRs 2 and 3 are independent of each other and can be worked in parallel via worktrees.

## Out of Scope

- Authorization-aware UI (hide/disable buttons based on user role) — separate effort
- `deletePlayer` mutation — no call site exists yet
- Query changes — queries don't use union result types
