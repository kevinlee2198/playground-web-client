# Inline Profile Editing — Design Document

> **Prerequisite:** Backend PR [#44](https://github.com/kevinlee2198/playground-backend/pull/44) — moves `biography` to `User`, removes `firstName`/`lastName`/`biography` from `Player`, adds `updateUser` mutation.

## Goal

Replace the disconnected "edit button → form appears below" UX with in-place editing on the user profile page (`/user/[username]`). Two independent edit affordances, each matching the interaction weight of the data it controls:

1. **Click-to-edit** for `displayName` and `biography` (user-level, lightweight text fields)
2. **In-place stat card transform** for `age`, `height`, `weight` (player-level, structured numeric fields)

## Backend Schema Changes (PR #44)

### Player Type

`firstName`, `lastName`, `biography` removed from `Player` GraphQL type. Player retains `user: User` reference. All existing code accessing `player.firstName`/`player.lastName` must migrate to `player.user.displayName`.

### User Type

`biography: String` added to `User` and `CurrentUser`.

### New Mutation

```graphql
mutation {
  updateUser(input: UpdateUserInput!): UpdateUserResult!
}

input UpdateUserInput {
  biography: String       # Omit = unchanged, null = clear
  displayName: String     # Omit = unchanged, cannot be null
}

type UpdateUserResponse {
  user: CurrentUser!
}

union UpdateUserResult = UpdateUserResponse
```

### Updated Mutations

```graphql
input CreatePlayerInput {
  age: Int
  height: Float
  weight: Float
}

input UpdatePlayerInput {
  id: ID!
  age: Int          # Omit = unchanged, null = clear
  height: Float     # Omit = unchanged, null = clear
  weight: Float     # Omit = unchanged, null = clear
}
```

## Architecture

### Page Layout (after)

```
<main>
  ProfileHeader          ← avatar, displayName (click-to-edit), @username,
                           biography (click-to-edit), friend actions
  PlayerStats (other)    ← read-only stat cards (Server Component, non-owners)
  PlayerStatsEditor (own)← dynamic import, stat cards with in-place edit / create CTA
  <Suspense fallback={<GameHistorySkeleton />}>
    GameHistory           ← async server component, streams after header/stats
  </Suspense>
</main>
```

### Component Changes

| Component | Before | After |
|-----------|--------|-------|
| `ProfileHeader` | Server Component, biography read-only | Server Component shell; `EditableDisplayName` and `EditableBiography` client islands on own profile, read-only for others |
| `PlayerStats` | Server Component, read-only stat cards | Removed — merged into `PlayerStatsEditor` |
| `ProfilePlayerEditor` | Client Component, 4 states (CTA/create/edit/view), full player form | Replaced by `PlayerStatsEditor` — stats-only, in-place transform |
| `CreatePlayerForm` | firstName, lastName, age, height, weight, biography | **Left unchanged** — `/player` route still uses it. New stats-only UI built directly into `PlayerStatsEditor` |
| `UpdatePlayerForm` | Same fields as create | **Left unchanged** — same reasoning. `PlayerStatsEditor` handles its own edit UI |

### New Components

**`EditableBiography`** (Client Component)
- Props: `initialBiography: string | null`, `username: string`
- View mode: renders biography text. On own profile, subtle hover indicator (pencil icon, pointer cursor). The entire text region is the click target (minimum 44×44px touch target). No bio: muted "Add a bio..." placeholder.
- Edit mode: textarea replaces text. Character/word counter below (max 1000 words). Cancel + Save buttons. Ctrl/Cmd+Enter saves.
- Save: wraps server action call in `useTransition`. `isPending` disables Save/Cancel buttons and shows a spinner on Save. Optimistic update: immediately set local state to the user's input, then reconcile with the server response (revert on failure). On success, shows success toast. `revalidatePath` runs for server consistency.
- Escape key cancels. Focus: textarea on enter, text region on exit.
- `aria-live="polite"` region announces save success/failure for screen readers.

**`EditableDisplayName`** (Client Component)
- Props: `initialDisplayName: string`, `username: string`
- View mode: renders display name as heading. On own profile, subtle hover indicator. The entire heading is the click target (minimum 44×44px touch target).
- Edit mode: text input replaces heading. Inline validation — cannot save empty/whitespace. Max length TBD (match backend).
- Save: wraps server action call in `useTransition`. `isPending` disables Save/Cancel and shows a spinner on Save. Optimistic update: immediately set local state to the user's input, then reconcile with the server response (revert on failure). Enter key saves.
- Escape key cancels. Focus: input on enter, heading on exit.
- `aria-live="polite"` region announces save success/failure.

**`PlayerStatsEditor`** (Client Component)
- Props: `initialPlayer: { id: number; age: number | null; height: number | null; weight: number | null } | null`, `isOwnProfile: boolean`
- **Rendering strategy:** On `!isOwnProfile`, the parent renders a lightweight read-only `PlayerStats` server component instead of this editor. On `isOwnProfile`, this component is loaded via `next/dynamic` to avoid shipping edit UI JavaScript to read-only visitors.
- Merges current `PlayerStats` (display) and `ProfilePlayerEditor` (edit state) into one component.
- View mode (own profile): stat cards + Edit button below.
- Edit mode: stat cards transform — values become inputs inside the same card shapes. Height/weight get metric/imperial toggles. Edit button replaced by Cancel + Save. Save wraps server action call in `useTransition`; `isPending` disables buttons and shows spinner.
- No player (own profile): Sprout CTA, create form with just age/height/weight.
- Player exists but all stats null (own profile): "Add your stats" empty state with dashed card outlines and Edit button.
- **Null checks:** Use `player.age != null` (not `||` truthiness) to determine if stats exist, so `0` is not treated as "no data".

**Note:** `PlayerStatsEditor` does NOT reuse `CreatePlayerForm`/`UpdatePlayerForm`. Those components retain their current fields for the `/player` route. The stats editor builds its own minimal edit UI (3 numeric inputs inside card shapes). A follow-up PR can deprecate the `/player` route and its forms.

## Data Flow

### New Server Action: `updateUser`

Location: `src/app/[locale]/user/[username]/actions.ts`

```typescript
// Server action
export async function updateUser(input: { displayName?: string; biography?: string | null }) {
  const mutation = {
    updateUser: {
      __args: { input },
      __typename: true,
      __on: [
        {
          __typeName: "UpdateUserResponse",
          user: {
            id: true,
            displayName: true,
            biography: true,
          },
        },
        errorFragment,
      ],
    },
  };
  // authMutate → extractMutationResult → revalidatePath
}
```

**Client data flow after save (optimistic update pattern):**
1. Client optimistically sets local state to the user's input value immediately (before server response)
2. Client calls server action inside `startTransition` (`useTransition`), receives `{ success: true, user }` response
3. On success: reconcile local state with `result.user.displayName` or `result.user.biography` from server response
4. On failure: revert local state to the previous value, show error toast, keep edit mode open
5. `revalidatePath` ensures the next server render has fresh data
6. Client component must NOT reset state from props on re-render (use `useState(initialValue)` without prop-sync `useEffect`)

### Page-Level Performance Improvements

**Parallel data fetching (eliminate waterfall):**

The current page component runs `fetchCurrentUser()` and `authQuery(buildUserQuery(...))` sequentially, but they are independent. Restructure to parallelize:

```typescript
// Cheap cookie-based auth check (no network round-trip)
const session = await auth.api.getSession({ headers: await headers() });
const isAuthenticated = !!session?.user?.id;

// Parallelize independent fetches
const [currentUser, userResponse] = await Promise.all([
  isAuthenticated ? fetchCurrentUser() : Promise.resolve(null),
  isAuthenticated
    ? authQuery(buildUserQuery(username))
    : query(buildUserQuery(username)),
]);
```

**`generateMetadata` deduplication:**

`generateMetadata` and the page component both fetch the same user. Use `React.cache()` to deduplicate:

```typescript
const getCachedUser = cache((username: string) =>
  query({ user: { __args: { input: { username } }, displayName: true } })
);
```

Both `generateMetadata` and the page component call `getCachedUser(username)`. React deduplicates within the same request.

**Suspense boundary for GameHistory:**

Wrap `GameHistory` in a `<Suspense fallback={<GameHistorySkeleton />}>` boundary and move its data fetch into an async server component. This allows the profile header and stats to render immediately while game history streams in.

### Updated Server Actions: `createPlayer` / `updatePlayer`

Location: `src/app/[locale]/player/actions.ts`

- Remove `firstName`, `lastName`, `biography` from the GraphQL selection sets on the response.
- Remove these fields from the mutation `__args` input.
- Update the TypeScript input types accordingly.
- `CreatePlayerInput` → `{ age?: number; height?: number; weight?: number }`
- `UpdatePlayerInput` → `{ id: number; age?: number | null; height?: number | null; weight?: number | null }`

### Updated Types

**`Player`** (`src/lib/types/player.ts`) — remove `firstName`, `lastName`, `biography`.

**`User`** — add `biography: string | null`.

### Updated GraphQL Queries & Fragments

**User page query** (`page.tsx`): remove `firstName`, `lastName`, `biography` from `player` subquery. Add `biography` to `user` query.

**`generateMetadata`** (`page.tsx`): change from `${user.firstName} ${user.lastName}` to `${user.displayName}` for page title.

**`participantNodeFragment`** (`graphql-fragments.ts`): remove `player.firstName`/`player.lastName`, use `player.user.displayName` instead (or query `user { displayName }` within the player fragment).

**`viewerFriendPlayersFragment`** (`graphql-fragments.ts`): same migration — `player.user.displayName`.

## App-Wide Player Name Migration

Backend PR #44 removes `firstName`/`lastName` from the `Player` GraphQL type. Player still exposes them via `player.user`, but the preferred pattern is `player.user.displayName`. The following files must be updated:

| File | Current Usage | Migration |
|------|--------------|-----------|
| `src/lib/graphql-fragments.ts` | `participantNodeFragment`: `firstName`, `lastName` | Query `user { displayName }` on player |
| `src/lib/graphql-fragments.ts` | `viewerFriendPlayersFragment`: `firstName`, `lastName` | Same |
| `src/lib/types/game.ts` | `PlayerRef.firstName`, `PlayerRef.lastName` | Replace with `displayName: string` (from `player.user`) |
| `src/lib/types/feed.ts` | `FeedPlayerNode.firstName`, `FeedPlayerNode.lastName` | Same |
| `src/components/game/basketball-box-score-table.tsx` | `player.firstName`, `player.lastName` | Use `player.displayName` (from updated type) |
| `src/components/game/team-card.tsx` | `player.firstName`, `player.lastName` | Same |
| `src/components/game/basketball-box-score-form.tsx` | `player.firstName`, `player.lastName` | Same |
| `src/components/game/score/participant-utils.ts` | `player.firstName`, `player.lastName` | Same |
| `src/components/game/friend-avatars.tsx` | `player.firstName`, `player.lastName` | Same |
| `src/components/game/individual-participant-list.tsx` | `player.firstName`, `player.lastName` | Same |
| `src/components/player/player-view.tsx` | `player.firstName`, `player.lastName` | Same |
| `src/components/profile/profile-avatar.tsx` | Initials from `user.firstName`/`lastName` | Unchanged — these are `User` fields, not `Player` |
| `src/app/[locale]/player/page.tsx` | Queries `player.firstName`/`lastName`/`biography` | Remove these from query; name comes from User |

**Note:** `ProfileAvatar` and `ProfileHeader` initials use `user.firstName`/`user.lastName` (User fields), which are unchanged by PR #44.

## Empty States & Edge Cases

### Biography
- Own profile, no bio: muted "Add a bio..." placeholder, clickable to edit.
- Other profile, no bio: nothing renders.
- Saving empty/whitespace-only: treat as `null` (clears the bio).

### DisplayName
- Non-nullable — inline validation prevents saving empty/whitespace.
- Max length: match backend constraint (specify during implementation).

### Player Stats
- Own profile, player exists, all stats null: "Add your stats" empty state with dashed card outlines and Edit button.
- Own profile, no player: Sprout CTA → simplified create form (3 optional numeric fields).
- Other profile, player exists with stats: read-only `PlayerStats` server component renders (no edit JS shipped).
- Other profile, no player or all stats null: nothing renders.
- Use `!= null` checks (not truthiness) so `0` is not treated as "no data".

### Concurrent Editing
- Bio, displayName, and stats edit independently — each manages its own local state.
- `revalidatePath` after saving one field triggers server re-render, but mounted client components retain local state via `useState`. No state loss.
- Edge case: if player is created (changing `key` from `"no-player"` to actual ID), the `PlayerStatsEditor` remounts. This is correct — the CTA state transitions to view/edit mode with fresh server data. No concurrent edit conflict because creating a player and editing stats are sequential (you can't edit stats that don't exist yet).
- Mid-edit navigation: changes discarded (no draft persistence).

### Error Handling
- Save failure: error toast, keep edit mode open so user can retry. Don't discard input.

### Focus & Keyboard
- Escape cancels any active edit (displayName, biography, stats).
- Enter saves displayName (single-line input).
- Ctrl/Cmd+Enter saves biography (multi-line textarea).
- Tab order flows naturally through stat inputs in edit mode.
- `aria-label` on all edit affordances for screen readers.
- `aria-live="polite"` regions announce mode transitions and save results.

### Tests
- No existing test files cover the profile components. If tests are added as part of this PR, they should use the updated types (no `firstName`/`lastName`/`biography` on player fixtures, `biography` on user fixtures).

## Scope Boundary

- This design covers `/user/[username]` inline editing and the app-wide player name migration.
- The `/player` route's existing forms (`CreatePlayerForm`, `UpdatePlayerForm`) are **not modified** — they will be addressed in a follow-up deprecation PR.
- The `/player` page query is updated to remove fields that no longer exist on the Player type.
- Avatar upload flow is unchanged.
- Friend actions are unchanged.
- Game history is unchanged.
