# Player → User Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to execute. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Migrate the frontend away from the deleted `Player` type. The backend schema now models participants as `User` (registered accounts) + `GuestParticipant` (named non-registered participants). This PR reshapes every frontend call site to match.

**Branch:** `0097-player-to-user-migration` (off main).

**Scope:** ~62 files across types, fragments, actions, and components. Mechanical but wide. One PR.

**Not in scope:** New UX for guest participants (guest-display UI is deferred to the leagues feature work); any behavioral change beyond "render what the new schema exposes."

---

## Zero-reference mandate

**Hard constraint:** after this PR lands, the frontend codebase must contain **zero** references to the word "player" / "Player" / "PLAYER" — except the preserved tokens below. This includes identifiers, type names, variable names, prop names, JSDoc, line comments, CSS class tokens, ARIA labels, i18n keys, i18n values, file names, folder names, test names, and mock data literals.

### Preserved-tokens allowlist

These are NOT renamed. They refer to third-party services or the HTML5 media player concept and are unrelated to the removed `Player` entity:

- `EmbedPlayer`, `embed-player.tsx` — video-player component (playback, not participants).
- `player.vimeo.com`, `player.twitch.tv`, `player.*` in any URL domain — third-party embed domains.
- Any comment or code reference that specifically means "the thing that plays the video stream" — not game participants.
- External library types / deps whose names contain "player" (e.g., an npm package) — document if encountered.

Validation greps must carry an exclusion for these tokens. Example pattern:

```bash
rg -i '\bplayer' src/ messages/ tests/ CLAUDE.md \
  | grep -v -E 'EmbedPlayer|embed-player|player\.vimeo|player\.twitch'
```

If this returns any match, the zero-reference rule is violated.

---

## Prerequisites — run before Step 1

Two preflight checks. Abort the migration if either fails.

### P-1: Verify backend schema is deployed

```bash
curl -s "$NEXT_PUBLIC_API_SERVER_URL/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __type(name: \"Player\") { name fields { name } } }"}'
```

- Expected: `{ "data": { "__type": null } }` — `Player` type is gone from the backend.
- If `__type` is non-null, the backend has **not** deployed the new schema. Stop. Do not start the migration.

### P-2: Confirm the `me` query shape

`me.player` is removed. Confirm the replacement:

```bash
curl -s "$NEXT_PUBLIC_API_SERVER_URL/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __type(name: \"User\") { fields { name } } }"}'
```

- Expected: `User` has `id`, `displayName`, `username`, etc., but no nested `player` field.
- Record whether the current user's id for frontend use comes from:
  - `me { id }` on the GraphQL side, OR
  - `session.user.id` from Better Auth (zero round-trip — likely the right path).
- Decision: use `session.user.id` everywhere the code previously relied on `me.player.id`. This eliminates the `me.player.id` fetch and avoids re-introducing a `Player`-shaped detour. Every site that threads `currentPlayerId` gets re-plumbed to `currentUserId` sourced from the session.

---

## Why this PR exists

The schema prep committed in `53123c6` removed the `Player` entity and everything that referenced it. Every frontend file that still uses `Player`, `playerId`, `players[]`, `player.user`, `viewerFollowingPlayers`, `updatePlayer`, or `player(id)` is now broken against the new contract. The app will not build until this migration lands.

This PR is **pre-work for the leagues feature (tracker #97)** — the leagues plan assumes User-based rosters throughout. It also cleans up a legacy concept (`Player` as a thin wrapper around `User` with age/height/weight) that the product stopped using.

---

## Contract changes (what we're migrating to)

| Old shape | New shape |
|---|---|
| `Player { id, age, height, weight, user: User }` | **Deleted.** Demographic fields (age/height/weight) no longer exist. |
| `TeamInstance.players: [Player!]!` | `roster: [User!]!` + `guests: [GuestParticipant!]!` |
| `TeamInstance.name: String!` | `TeamInstance.name: String` (**nullable**) |
| `IndividualParticipant.player: Player!` | `participant: IndividualParticipantWho!` — union of `User \| GuestParticipant` |
| `Game.viewerFollowingPlayers: ViewerFollowingPlayers!` (had `nodes` + `totalCount`) | `viewerFollowingUsers: ViewerFollowingUsers!` (only `nodes`, capped at 10) |
| `GameFilterInput.playerId: ID` | `userId: ID` |
| All `*Input` inputs with `playerId(s)` | `userId(s)` |
| `addPlayerToTeamInstance` mutation family | `addUserToTeamInstance` / `addUsersToTeamInstance` |
| `removePlayerFromTeamInstance` family | `removeUserFromTeamInstance` / `removeUsersFromTeamInstance` |
| `PlayerNotFoundError` in union result types | `UserNotFoundError` |
| `updatePlayer(input: UpdatePlayerInput)` mutation | **Deleted.** Profile edit UI that used it is also deleted. |
| `player(id: ID!): Player` query | **Deleted.** Use `user(id)` instead. |

---

## Load-bearing semantic change: Player PK → User id

`Player.id` was a distinct PK from `User.id`. Under the new schema, rosters are `[User!]!` — the identity space for "who is on this team" becomes `User.id`. This is not a variable rename; it is an **ID-space change**.

Every site that compares "am I this player?" or "is this player on that team?" needs:

1. The variable renamed (`currentPlayerId` → `currentUserId`).
2. The source of the id changed (was `me.player.id`, now `session.user.id` from Better Auth per P-2).
3. The comparison target changed (was `team.players[].id` comparing Player PKs, now `team.roster[].id` comparing User ids).

All three must change together. Doing (1) without (2) or (3) produces a build that type-checks but returns the wrong membership result at runtime.

**Sites with this pattern** (all require the full three-part change):

- `src/components/game/team-card.tsx:48-73` — `currentPlayerId: number` prop + `team.players.some((p) => p.id === currentPlayerId)`.
- `src/components/game/individual-participant-list.tsx:52` — membership comparison.
- `src/components/game/game-participants.tsx:52` — passes `currentPlayerId` to children.
- `src/app/[locale]/game/[id]/page.tsx:131,505` — source of `currentPlayerId` (`me.player?.id`) and forwarder to `GameDetailClient`.

Any other `currentPlayerId` identifier anywhere must be rewritten in the same commit (grep confirms these are the main load-bearing four; verify in Step 1).

**Guest participants are never "currentUser".** Guests have no backing User account — they can't be the viewer. Membership checks that walk `participant` must early-return `false` when `__typename === "GuestParticipant"`.

---

## File inventory (what changes)

Grep-derived from `src/`. Grouped for task decomposition. Counts are approximate.

### A. Type-only rewrites (8 files)

- `src/lib/types/player.ts` — **delete**. Only `HeightImperial` is worth saving (if it has callers; verify).
- `src/lib/types/game.ts` — remove `Player` references; update `TeamInstance` / `IndividualParticipant` types.
- `src/lib/types/feed.ts` — `viewerFollowingPlayers` → `viewerFollowingUsers`.
- `src/lib/types/stats/{base,baseball,basketball,football,tennis,volleyball,*ball}.ts` — 7 per-sport stats files. Each has a `player` field on stat rows that becomes `user`.

### B. GraphQL fragments (1 file)

- `src/lib/graphql-fragments.ts` — rewrite `participantNodeFragment`, `viewerFollowingPlayersFragment`, any team-instance fragments. Replace `player { ... }` with `participant { __typename ... on User { ... } ... on GuestParticipant { ... } }`. Rename `viewerFollowingPlayers` to `viewerFollowingUsers`.

**Name-collision hazard.** `playerRefFragment` (shape: `{ id, user: { displayName, username, profilePicture } }`) must be renamed, but `userRefFragment` **already exists** at line ~408 with a different, smaller shape (`{ id, username, displayName }`, no `profilePicture`) and is consumed by notification/invitation fragments. A naive rename creates a duplicate-name TS error OR silently changes notification fragment shape.

**Resolution:** rename the existing `userRefFragment` → `notificationUserRefFragment` first (covers the 3-5 notification/invitation call sites), then rename `playerRefFragment` → `userRefFragment`. Two separate commits so the intent is obvious in the diff. Call sites of `playerRefFragment` currently live in `game-fragments`, `use-game-subscription.ts`, `game/[id]/page.tsx`, and a handful of stats fragments — verify via grep before committing.

### C. Server actions (11 files)

Rename `playerId`/`playerIds` args → `userId`/`userIds`; rename mutation names; update result-union error-type mapping (`PlayerNotFoundError` → `UserNotFoundError`).

- `src/app/[locale]/game/actions.ts`
- `src/app/[locale]/game/participant-actions.ts` — includes `joinTeamInstance` / `leaveTeamInstance` that take `playerId`. Both inputs rename to `userId`.
- `src/app/[locale]/game/{sport}-stats-actions.ts` × 7 — one per sport.
- `src/app/[locale]/feed/actions.ts`
- `src/app/[locale]/user/[username]/actions.ts` — also delete the `updatePlayer` action; the `player(id)` query usage (if any) maps to `user(id)` or gets removed.
- `src/app/[locale]/game/invitation-actions.ts` (if it touches `playerId`)

**Input types in `src/lib/types/game.ts`** — rename `playerIds` → `userIds` on: `AddTeamInput`, `UpdateTeamParticipantInput`, `JoinTeamInput`, `LeaveTeamInput`, `AddIndividualParticipantInput`, `AddIndividualParticipantsInput`, `AddTeamInstanceData`. Each action consumes one of these; the type + action rename happen together per file.

### D. Component field-access rewrites (~30 files)

Straightforward `.player` → `.participant` (with `__typename` branching where the SR matters) + `TeamInstance.players` → `roster` (plus optional `guests` rendering deferred). Also null-handle `TeamInstance.name`. Also replace `currentPlayerId` prop threading per the "Load-bearing semantic change" section above.

**Stats forms + tables (~16 files)** — all under `src/components/game/`. Real count (verify with grep before starting):
- Baseball × 3 sub-categories (batting, fielding, pitching) × 2 (form + table) = 6
- Football × 3 sub-categories (offensive, defensive, special-teams) × 2 = 6
- Basketball + tennis + net-paddle + volley × 1 (form only or form+table varies by sport; count by grep)

Plus 2 aggregators: `game-stats.tsx` and `collapsible-stats.tsx`. Total surface ~16-18 files — commit-per-sport during Step 6.

Review the full list via:

```bash
rg --files-with-matches 'player|Player' src/components/game/*stats*
```

Pattern in stats forms: the "which participant contributed this stat row" picker currently takes `player.id`. It becomes `user.id` (participant must be a registered user — guests cannot have stats attributed in v1).

**Stats → team correlation is load-bearing.** `game-stats.tsx:86,102` builds `availablePlayers` by pushing individual-participant `.player` into an array; after migration `.participant` is a union. The picker must filter to `__typename === "User"` to avoid emitting guest IDs into `saveStatsXxx({ userId })` inputs the backend would reject. The `groupByTeam` helper correlates stats rows to teams via a `playerIds: Set<number>` against `edge.node.player.id`. After migration both the set and the FK become User ids — rename to `userIds: Set<number>` compared against `edge.node.user.id`.

**Score forms (3 files)** — `src/components/game/scoreboard/*-score-form.tsx` for racket / net sports.

**Game detail / list / live (~8 files):**
- `src/app/[locale]/game/[id]/page.tsx`
- `src/components/game/game-detail-actions.tsx`
- `src/components/game/live/game-detail-client.tsx`
- `src/components/game/live/game-live-reducer.ts`
- `src/hooks/use-game-subscription.ts`
- `src/components/game/game-participants.tsx`
- `src/components/game/individual-participant-list.tsx`
- `src/components/game/team-card.tsx` — handle nullable `TeamInstance.name` (fallback: `"Team"` or team-id-derived label).
- `src/components/game/add-team-form.tsx` — input rename.
- `src/components/game/game-card.tsx` — `viewerFollowingPlayers` → `viewerFollowingUsers`.
- `src/components/game/game-stats.tsx`
- `src/components/game/collapsible-stats.tsx`
- `src/components/game/score/participant-utils.ts` — helper functions that walk participants; rewrite for the union.

**Feed / home / profile (5 files):**
- `src/app/[locale]/page.tsx`
- `src/app/[locale]/games/page.tsx`
- `src/components/profile/game-history.tsx` — currently receives a `player.id` from the user page; becomes `user.id` via the parent's selection change below.
- `src/app/[locale]/user/[username]/page.tsx` — rewrites `buildUserQuery` to drop the `player { id, age, height, weight }` selection and passes `user.id` directly to children. Also unmounts `<PlayerStats>` and `<PlayerStatsEditorLoader>`.
- `src/app/[locale]/user/[username]/loading.tsx` — skeleton layout references the deleted "Player stats" section.

**Shared avatar helper — rename + prop reshape (1 file + 13 consumers):**
- `src/components/game/player-avatar.tsx` — rename to `src/components/ui/user-avatar.tsx` (moves to ui/ because the helper is not game-specific). Component renames `PlayerAvatar` → `UserAvatar`; prop becomes `user: UserRef` instead of `player: PlayerRef`. Export `getInitials` unchanged.
- Update the 3 non-game consumers of `getInitials` (verify paths via grep, expect some variance):
  - `src/components/profile/follow-list-dialog.tsx`
  - `src/components/profile/follow-requests-list.tsx`
  - `src/components/chat/mutual-follow-selector.tsx` (path is `chat/`, not `profile/` — earlier draft had this wrong)
  Import path changes from `@/components/game/player-avatar` → `@/components/ui/user-avatar`.
- Update every stats-table + team-card + participant-list consumer of `PlayerAvatar` (~10 files: 8 stats tables + `team-card.tsx` + `individual-participant-list.tsx` + `following-avatars.tsx`) — prop change from `player={...}` to `user={...}`.

**Invite players dialog — full rename:**
- `src/components/game/invite-players-dialog.tsx` → `src/components/game/invite-users-dialog.tsx`. Component `InvitePlayersDialog` → `InviteUsersDialog`. Props interface `InvitePlayersDialogProps` → `InviteUsersDialogProps`. All internal variables.
- Call sites: `src/components/game/game-detail-actions.tsx` (imports + JSX tag references — grep for exact count).
- i18n keys under `invitations.*` that include "Players" (e.g., `invitations.invitePlayers`, `invitations.dialogTitle` if it references Players) — rename and update values per Step 7.

**Profile stats components — delete (3 files, not just 1):**
- `src/components/profile/player-stats-editor.tsx` — the age/height/weight edit form.
- `src/components/profile/player-stats-editor-loader.tsx` — the mount-point wrapper.
- `src/components/profile/player-stats.tsx` — the read-only viewer.

All three are mounted in `src/app/[locale]/user/[username]/page.tsx` — see Category F cleanup below.

### E. Orphaned code (delete)

Three components listed under category D above are orphaned and deleted outright:
- `src/components/profile/player-stats.tsx`
- `src/components/profile/player-stats-editor.tsx`
- `src/components/profile/player-stats-editor-loader.tsx`

Remove them **with** their mount points in `src/app/[locale]/user/[username]/page.tsx` (lines ~73-78, 201, 221, 223, 227 per the review — verify during Step 2).

`src/lib/constants.ts` has **2 JSDoc references to "player"** at lines ~42-43 ("bench players", "individual players"). Rewrite the JSDoc to use "participant" / "user" per context. `src/lib/unit-conversion.ts` has zero references — no edits there.

### F. Tests (23 files)

Expanded scope:

- **Vitest unit tests** — roughly 18 files under `__tests__/` directories reference `player` / `Player` / `playerId`. Notable:
  - `src/components/game/live/__tests__/game-live-reducer.test.ts` — `makeStats(playerId, points)` factory helpers are load-bearing. Rename to `userId`, reshape mock data.
  - Any `__tests__/` sibling of a component in categories C/D likely needs an update too.

- **Playwright fixtures** (5 files under `tests/fixtures/`):
  - `tests/fixtures/mock-data/me.ts` — mock `me` currently includes `player: { id, age, height, weight }`. Replace with the new `me` shape (no `player` nesting).
  - `tests/fixtures/mock-data/games.ts` — participants use `Player`-shaped mocks.
  - `tests/fixtures/mock-data/user.ts`
  - `tests/fixtures/mock-data/feed.ts`
  - `tests/fixtures/test-ids.ts` — any `PLAYER_ID` constants rename to `USER_ID`.
- **MSW handlers** — `tests/fixtures/graphql-handlers.ts` likely emits `player` in participant responses.

One commit per fixture is overkill; group as: one commit for `me.ts` + handlers (unblocks everything downstream), one for the remaining mock-data factories, one for test files per logical area (stats, game detail, profile).

---

## Work plan — step-by-step

TDD loop per step: write the failing test → run it to fail → implement → run to pass → commit. For pure renames the "failing test" step collapses to "typecheck fails"; run `npm run build` to see it.

**Buildability caveat.** Step 3 through Step 6 produce intermediate commits that **do not** type-check cleanly. This is expected — types land before their consumers update. Only after Step 6 is the tree buildable again. The only "each commit buildable" guarantee applies to Steps 1, 2, 7, 8, 9 (the bookends). Reviewers should expect to run `npm run build` only after Step 6.

If that's unacceptable, the alternative is to fold Steps 3-6 into one mega-commit — but that kills reviewability. The plan keeps granular commits and accepts non-buildable intermediates.

### Step 1: Grep-confirm the inventory

Split the grep into 3 buckets to reduce false positives — naive `\bplayers\b` matches CSS classes (`group/player-row`), ARIA labels, and strings like "multiplayer."

- [ ] **Bucket A — TS identifiers** (the real migration target):

  ```bash
  rg --no-heading -n --type ts \
    '\bPlayer\b|\bplayerId\b|\bplayerIds\b|viewerFollowingPlayers|addPlayerToTeamInstance|addPlayersToTeamInstance|removePlayerFromTeamInstance|removePlayersFromTeamInstance|updatePlayer|PlayerNotFoundError|UpdatePlayerInput|currentPlayerId' \
    src/ > /tmp/refs-identifiers.txt
  ```

- [ ] **Bucket B — field accesses** (`.player`, `.players`):

  ```bash
  rg --no-heading -n --type ts '\.player\b|\.players\b' src/ > /tmp/refs-access.txt
  ```

- [ ] **Bucket C — i18n strings + CSS** (Player-cased user-facing text + class names):

  ```bash
  rg --no-heading -n 'player|Player' messages/ > /tmp/refs-i18n.txt
  rg --no-heading -n --type tsx 'player' src/ | grep -E 'class|aria' > /tmp/refs-strings.txt
  ```

- [ ] Expected: Bucket A ~60 hits across ~50 files. Bucket B ~40 hits. Bucket C is informational — those are separate decisions (see Step 7 for i18n).

- [ ] No commit yet. The output is a working artifact.

### Step 2: Delete dead files

- [ ] `git rm src/lib/types/player.ts src/components/profile/player-stats-editor.tsx`
- [ ] Grep for any lingering imports of either file and remove them. Remove the route / layout mount point of `player-stats-editor.tsx`.
- [ ] Run `npm run build` — expect broken imports across files in categories A / C that still reference `Player`, `UpdatePlayerInput`. This is expected; subsequent steps clean them up.
- [ ] Commit: `refactor: remove Player type and player-stats-editor (dead code)`

### Step 3: Rewrite types

- [ ] Update `src/lib/types/game.ts`:
  - `TeamInstance`: `roster: User[]` + `guests: GuestParticipant[]` + `name: string | null`.
  - `IndividualParticipant`: `participant: IndividualParticipantWho` with a `__typename` discriminator.
  - Add new type:

    ```ts
    export type GuestParticipant = {
      __typename: "GuestParticipant";
      id: string;
      displayName: string;
      addedBy: { id: number; displayName: string; username: string };
    };
    export type IndividualParticipantWho =
      | ({ __typename: "User" } & UserRef)
      | GuestParticipant;
    ```

- [ ] Update `src/lib/types/feed.ts` field names.
- [ ] Update the 7 sport-stats type files under `src/lib/types/stats/`:
  - `src/lib/types/stats/base.ts` — rename `StatsEntry.player: PlayerRef` → `StatsEntry.user: UserRef` (field name + type). Rename `StatsInput.playerId: number` → `StatsInput.userId: number`.
  - Each sport-specific stats file (`baseball.ts`, `basketball.ts`, `football.ts`, `tennis.ts`, `volleyball.ts`, plus the net-paddle and ball-racquet variants) inherits the rename via re-export / inheritance — verify no duplicate declarations of the renamed fields.
  - Rename file-level JSDoc (Step 6.5 covers this but these files are core enough to fix now — don't ship a type file whose docblock says "player").
- [ ] All downstream consumers of the renamed fields (~14 stats tables + ~14 stats forms + their parent aggregators) will break on the next `npm run build` — these land in Step 6.
- [ ] Run: `npm run build` — expect failures downstream in components.
- [ ] Commit: `refactor(types): migrate TeamInstance/IndividualParticipant to User-based shape`

### Step 4: Rewrite `src/lib/graphql-fragments.ts`

- [ ] Replace any fragment that selects `player { ... }` with the union shape:

  ```ts
  export const participantNodeFragment = {
    __typename: true,
    id: true,
    __on: [
      {
        __typeName: "TeamInstance",
        name: true,
        description: true,
        roster: userRefFragment,
        guests: { __typename: true, id: true, displayName: true },
        metadata: { /* sport metadata fragment */ },
      },
      {
        __typeName: "IndividualParticipant",
        participant: {
          __typename: true,
          __on: [
            { __typeName: "User", ...userRefFragment },
            { __typeName: "GuestParticipant", id: true, displayName: true },
          ],
        },
        metadata: { /* sport metadata fragment */ },
      },
    ],
  };
  ```

- [ ] Rename `viewerFollowingPlayersFragment` → `viewerFollowingUsersFragment`; drop the `totalCount` field (backend removed it).
- [ ] Run: `npm run build` — expect the components that consumed the old shape to fail. Move to Step 5.
- [ ] Commit: `refactor(graphql): migrate fragments to User-based participant shape`

### Step 5: Server actions — rename args + result-union handlers

- [ ] For each file in category C above:
  - Rename `playerId`/`playerIds` inputs to `userId`/`userIds`.
  - Rename mutation names where renamed (`addPlayerToTeamInstance` → `addUserToTeamInstance`, etc.).
  - In every `MutationErrorType` switch / `extractMutationResult` mapping, rename `PlayerNotFoundError` → `UserNotFoundError`.
  - Delete the `updatePlayer` action in `user/[username]/actions.ts` and any caller references.
- [ ] One commit per file is overkill; commit per coherent group: `stats-actions` (7 files), `participant-actions` (2 files), `feed + game list` (2 files), `user actions` (1 file). 4 commits.

### Step 6: Components — field-access rewrites

- [ ] For each file in category D:
  - Replace `.player` on a TeamInstance with `.roster`.
  - Replace `.player` on an IndividualParticipant with `.participant`, branching on `__typename` (`User` vs `GuestParticipant`). For callers that only care about the user path, early-return when `__typename === "GuestParticipant"` (guests have no user id/username).
  - Replace every `TeamInstance.name` render with a nullable-safe render: `{team.name ?? t("leagues.team.unnamed")}` or a deterministic fallback.
  - `Game.viewerFollowingPlayers.nodes` → `Game.viewerFollowingUsers.nodes`. Remove any `totalCount` consumers; swap to the new "and others" copy from Step 7.
  - Stats-row `player` → `user`.
  - **Prop cascade:** rename `currentPlayerId` → `currentUserId` and change its source to `session.user.id` per the "Load-bearing semantic change" section. Files: `game/[id]/page.tsx`, `game-participants.tsx`, `team-card.tsx`, `individual-participant-list.tsx`.

- [ ] **Rewrite `src/components/game/score/participant-utils.ts` explicitly.** This helper currently returns `participant.player.user.displayName` (one-line mechanical replace won't work — the union moves `displayName` to two different depths). New shape:

  ```ts
  // Returns the display name of the participant — User's displayName or GuestParticipant's displayName.
  // The team-unnamed fallback is the caller's responsibility: this helper returns null for an
  // unnamed TeamInstance so the caller can apply its own i18n (e.g., t("leagues.team.unnamed")).
  export function getParticipantDisplayName(participant: GameParticipant): string | null {
    if (participant.__typename === "TeamInstance") {
      return participant.name;  // may be null; caller i18n-izes the fallback
    }
    // IndividualParticipant — both User and GuestParticipant expose displayName at this level.
    return participant.participant.displayName;
  }
  ```

  Callers that render the result wrap with `?? t("leagues.team.unnamed")`. Other helpers in this file that walk `player.user.*` need similar union-aware rewrites. Unit test each helper against both User and Guest inputs.

- [ ] **Filter guests out of `individual-participant-list.tsx`**. Line 152 renders `href={/user/${player.user.username}}` — guests have no `username` and would crash. For v1, add a guard before the map: `.filter((p) => p.participant.__typename === "User")`. Document in a code comment that guest display is deferred to the leagues feature.

- [ ] Commit per sport for stats files (1 commit per sport = 7 commits keeping each self-contained and revertable), plus separate commits for: `score-forms`, `game-detail`, `feed+profile`, `participant-utils`, `player-avatar rename`. Roughly 12 commits.

### Step 6.5: Comment / CSS / ARIA / literal-string audit

Mechanical field-access rewrites in Step 6 do not touch JSDoc, line comments, Tailwind class tokens, `aria-label` composition strings, or string literals. Under the zero-reference mandate, every surviving mention of "player" is a bug.

- [ ] **JSDoc + line comments** — grep `\bplayer|\bPlayer` in `src/**/*.{ts,tsx}` comments and rewrite each. Expected hit areas:
  - `src/app/[locale]/game/participant-actions.ts` — mutation JSDoc (`"add a player"`, `"remove a player"` etc.).
  - `src/app/[locale]/game/{sport}-stats-actions.ts` × 7 — "for a single player", "for multiple players".
  - `src/lib/types/stats/{base,baseball,basketball,football,tennis,volleyball,pickle-net}.ts` — "Per-player stats data…", "Every stats entry is tied to a player".
  - `src/lib/types/feed.ts` — "Player node returned within viewerFollowingPlayers", etc.
  - `src/lib/types/game.ts` — "Input for joining a team (adding a player…)", `playerIds` replacements in docblocks.
  - `src/lib/graphql-fragments.ts` — "Player reference fragment matching the PlayerRef type".
  - `src/components/game/team-card.tsx` — `{/* Player rows */}`, `{/* Remove Player Confirmation Dialog */}`.
  - `src/app/[locale]/user/[username]/loading.tsx` — `{/* Player Stats */}`.
  - `src/components/game/scoreboard/tennis-score-form.tsx` — "the losing player".
  - `src/components/game/game-media-item.tsx` — `// see embed-player.tsx for rationale` — this is **allowlisted** (refers to video embed), keep as-is.

- [ ] **Tailwind CSS class tokens** in `team-card.tsx` (and spot-check elsewhere): `group/player-row`, `group-hover/player-row:flex`, `group-focus-within/player-row:flex` — rename token to `roster-row` or `member-row` (pick one, use consistently).

- [ ] **`aria-label` + `placeholder` + `alt` attr strings** built from string concatenation or template literals — grep for `aria-label.*player|alt={.*player|placeholder.*player` and rewrite. Examples: `aria-label={t("game.participants.removePlayer")}` (tied to the i18n rename in Step 7), `alt={player.user.displayName}` (tied to the local-variable rename below).

- [ ] **Local variable / prop identifiers** — grep `\bplayer\b` in source (excluding third-party/allowlist domains). In `team-card.tsx` alone this is ~20 occurrences: `playerToRemove`, `setPlayerToRemove`, `isPlayerOnTeam`, `isPlayerOnAnyTeam`, `handleRemovePlayerFromTeam`, `playerId` parameter, `PlayerRow` component, `PlayerRowProps`, `player` prop, `player` loop variable. Across all 14 stats tables/forms there are many more `.map((player) => …)` loop vars. Rename every local binding to the best fit:
  - `user` — when the value is a User.
  - `member` — when the value is a team roster entry (User).
  - `participant` — when the value is a union (User | GuestParticipant).
  - `row` — when the value is a stats row.

- [ ] **`useState<PlayerRef | null>` / other generic-arg type uses** — grep for `PlayerRef` and update each generic position.

- [ ] **String literal IDs and test names** — see Step 8 for `tests/` scope; in `src/` the only typical case is cached IDs like `"other-player-id"` in stubbed data files — rename to `"other-user-id"`.

- [ ] **`CLAUDE.md`** — line ~186 has a JSDoc-like example `"firstName on a player"`. Rewrite to `"firstName on a user"` to match the zero-reference rule. This file is no longer excluded from the PR despite the earlier validation checklist saying so — update both the file and the checklist.

- [ ] Commit: `refactor: rename local bindings, comments, and class tokens from player to user/member`

### Step 7: i18n — exhaustive rename table

Under the zero-reference mandate, EVERY `messages/en.json` key or value containing "player" / "Player" / "players" must be renamed. No exceptions, no "keep for v1" carve-outs. This replaces the previous "decide per key" table.

- [ ] **Delete outright** (dead surfaces):
  - `user.profile.playerStats` section and every key beneath it (editor + viewer are being deleted).

- [ ] **Rename these keys + update values:**

  | Old key | New key | Value change |
  |---|---|---|
  | `game.participants.players` | `game.participants.users` | "Players" → "Players" (value may stay as shown in UI — verify against UX; default: "Members" for team context, "Participants" otherwise) |
  | `game.participants.noPlayers` | `game.participants.noMembers` | "No players yet" → "No members yet" |
  | `game.participants.noPlayersYet` | (same — merge) | |
  | `game.participants.addPlayer` | `game.participants.addUser` | "Add player" → "Add user" |
  | `game.participants.removePlayer` | `game.participants.removeMember` | "Remove player" → "Remove member" |
  | `game.participants.removePlayerConfirm` | `game.participants.removeMemberConfirm` | value updated accordingly |
  | `game.participants.selectPlayer` | `game.participants.selectUser` | "Select a player" → "Select a user" |
  | `game.participants.playerCount` | `game.participants.memberCount` | value updated accordingly |
  | `game.participants.sortBy.player` | `game.participants.sortBy.user` | label value updated |
  | `game.stats.player` | `game.stats.user` | column header |
  | `game.stats.addPlayerStats` | `game.stats.addStatsForUser` | dialog title |
  | `game.stats.playerStatsAdded` | `game.stats.statsAddedForUser` | toast |
  | `game.stats.playerStatsError` | `game.stats.statsErrorForUser` | error toast |
  | `game.scoring.player` | `game.scoring.user` | |
  | `invitations.invitePlayers` | `invitations.inviteUsers` | "Invite Players" → "Invite Users" |
  | any `invitations.dialogTitle` value containing "players" | unchanged key, updated value | |
  | `invitations.stagedCount` value "player selected" | value "user selected" | |
  | `privateDescription` value containing "invited players" | value "invited users" | |
  | `selfReportDescription` value "Players can only…" | value "Users can only…" | |
  | marketing copy `pages.*.description` mentioning "competitive players" or "players" | value "competitive users/members" per context | |
  | FAQ entries containing "players" | value updated | |

- [ ] Grep final: `rg -i '\bplayer' messages/en.json` must return **zero** hits after this step.

- [ ] **Add new keys:**
  - `leagues.team.unnamed = "Unnamed team"` — Step 6 nullable-fallback.
  - `game.participants.followedUsersSummary = "{names} and others played"` — replaces the former `totalCount`-driven copy.

- [ ] **Update all call sites** that use the renamed keys (stats tables' `statsT("selectPlayer")` → `statsT("selectUser")`, etc.). Grep `t("game.participants.` and `t("game.stats.` to enumerate. ~14 stats-table files + team-card + participant list + game-detail-actions will all need call-site updates in sync.

- [ ] Commit: `i18n(en): rename all player keys to user/member/participant`

### Step 8: Tests

- [ ] Update Vitest tests that mocked `Player` — mock `User` + (where relevant) `GuestParticipant` instead.
- [ ] Update Playwright fixtures (`tests/fixtures/graphql-handlers.ts`, mock-data factories) to emit the new shape.
- [ ] Run: `npm test` and `npx playwright test --project=chromium 2>&1 | tee /tmp/pw-migration.txt`.
- [ ] Fix failures. Commit per logical group.

### Step 9: Final verification

- [ ] `npm run lint` — clean.
- [ ] `npm run build` — clean, zero errors.
- [ ] `npm test` — green.
- [ ] `npx playwright test --project=chromium` — green.
- [ ] Manual smoke test: `npm run dev`, log in, visit:
  - A game with a TeamInstance participant type — team card + stats table render.
  - A game with IndividualParticipant — participant list renders.
  - **A game with a `GuestParticipant` on a team's roster** — team card renders without crashing; guest is excluded from stats-form picker; "am I on this team" still works for the current user.
  - **A game with an `IndividualParticipant` that is a Guest** — guest is filtered out of the individual-participant list (v1 behavior per decisions table).
  - User profile — former Player stats editor is gone; no broken link.
  - Feed — game card renders; `viewerFollowingUsers` avatars appear with the new "and others" copy.
- [ ] Commit any final fixes.

### Step 10: PR open

- [ ] Push branch.
- [ ] Open PR against `main` with title: `refactor(schema): migrate Player to User + GuestParticipant`.
- [ ] PR body summarizes the contract change (copy from the "Contract changes" table above).
- [ ] Assign to yourself; request review.

---

## Decisions locked for v1

| Decision | Rationale |
|---|---|
| Delete `player-stats-editor.tsx` outright | No backing mutation; entirely dead. Profile edit UX for height/weight is not a product requirement. |
| No guest-participant UI in this PR | Guests display on rosters / stats is scope for leagues feature work. This PR only reshapes types so `guests: []` is selected but not rendered (or rendered as a simple "+N guests" chip if the change is trivial). |
| Nullable `TeamInstance.name` fallback: `"Unnamed team"` via new i18n key | One key, universal. Component-specific fallbacks would drift over time. |
| Stats attributable only to Users, not Guests | Backend enforces; frontend stats form pickers filter to `roster` (User-only). |
| `HeightImperial` helper | Deleted along with `types/player.ts` — zero other consumers (verified). |
| `viewerFollowingPlayers.totalCount` removal copy | The "Sarah, Kevin, and 3 others played" pattern in `following-avatars.tsx` loses its count. For v1 migration: switch copy to "Sarah, Kevin, and others played basketball" (no count), since `nodes` is server-capped at 10 and displaying `nodes.length` would be wrong when there are >10 followed users. Flag for product decision if the copy must survive as a count — they may want a separate backend resolver. |
| Guest-participant display in participant lists | Filter out `__typename === "GuestParticipant"` from `individual-participant-list.tsx` in this PR — guests have no `user.username` to link to. Rendering guest avatars / chips is scope for leagues feature. The filter is a one-line guard. |

---

## Risks and mitigations

1. **Schema diff doesn't match what's running.** Mitigated by P-1 (prerequisite) — introspection check at the top of this plan aborts the migration if `Player` type still exists on backend.
2. **Some components cache stale shape in reducers / contexts.** `game-live-reducer.ts` + `use-game-subscription.ts` may persist a stale shape across a session. Verify reducer state types match.
3. **Test fixtures are large.** MSW handler updates could balloon this PR. Mitigate by keeping mock factories tight and colocated with their consumers.
4. **Hidden `.player` accesses via `any`.** TS strict mode helps, but runtime helpers (e.g., `participant-utils.ts`) may erase types. Grep for `\.player[^a-zA-Z]` after the rewrite to catch these.

---

## Not in scope

- Redesigning how rosters / guests render.
- Changing the game-scoring flows.
- Adding guest-participant creation UI (a separate concern for the leagues feature).
- Changing sport-specific stat shapes beyond the `player` → `user` field rename.

---

## Validation checklist before opening the PR

**Zero-reference check** (the load-bearing gate):

- [ ] This command returns **zero** matches (allowlisted tokens filtered out):

  ```bash
  rg -i '\bplayer' src/ messages/ tests/ CLAUDE.md \
    | grep -v -E 'EmbedPlayer|embed-player|player\.vimeo|player\.twitch'
  ```

  Output to `/tmp/player-leaks.txt`. If non-empty, the PR does not meet the zero-reference mandate — fix before opening.

**Scoped greps that should be zero:**

- [ ] `rg '\bPlayer\b' src/` — zero matches (includes class/type/component names).
- [ ] `rg '\bplayerId' src/` — zero matches.
- [ ] `rg 'viewerFollowingPlayers' src/` — zero matches.
- [ ] `rg 'PlayerAvatar|PlayerRef|PlayerNotFoundError' src/` — zero matches.
- [ ] `rg '\bplayer\b' src/ messages/ tests/` — zero matches (loop variables, i18n, mocks).
- [ ] `rg 'player' CLAUDE.md` — zero matches.
- [ ] `rg 'group/player|player-row' src/` — zero matches (CSS class tokens).
- [ ] `rg 'PLAYER_ID' tests/` — zero matches (test constants).
- [ ] `rg 'player stats' tests/` — zero matches (test titles).
- [ ] `rg 'other-player-id' src/ tests/` — zero matches (fixture literals).

**Build + behavior gates:**

- [ ] `npm run lint && npm run build && npm test` all green.
- [ ] `npx playwright test --project=chromium` green (capture output to `/tmp/pw-migration.txt`).

**Hygiene:**

- [ ] No new `any` casts introduced to paper over a type gap.
- [ ] No new i18n keys left with empty values.
- [ ] `schema.graphqls` untouched.
- [ ] `CLAUDE.md` edited only for the one "player" reference at line ~186 (per Step 6.5).
- [ ] Commit count: roughly 15-20 focused commits (per-sport grouping during Step 6 adds some; Step 6.5 adds one).
- [ ] Intermediate commits between Step 3 and Step 6 are known non-buildable by design; only bookend commits are expected to pass `npm run build`.

---

**End of plan.**
