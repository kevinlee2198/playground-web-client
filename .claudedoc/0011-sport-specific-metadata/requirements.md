# Sport-Specific Metadata -- Requirements

## 1. Overview

The GraphQL schema has been restructured so that sport-specific configuration (game metadata) and sport-specific results (participant metadata / scores) are now represented as typed union types instead of untyped JSON fields. The old `sportSubtype` top-level field on `Game` has been removed; subtype now lives inside `GameMetadata`. The old `attributes: JSON!` field on `TeamInstance` has been removed and replaced with `metadata: ParticipantMetadata`.

This feature updates the entire frontend to:

1. Display scores and game configuration throughout the app using the new typed metadata.
2. Collect sport-specific game metadata in the create/update forms.
3. Allow inline score editing on the game detail scoreboard.
4. Remove all references to the old `sportSubtype`, `attributes`, and untyped JSON patterns.

**Authentication:** All game-related pages already require authentication. No new auth requirements.

**Location:** The new `location` field on `Game` is explicitly out of scope for this feature.

---

## 2. Schema Changes Summary

### 2.1 Game.metadata (GameMetadata union -- required field)

| Sport | Type | Fields |
|-------|------|--------|
| Basketball | `BasketballGameMetadata` | `subtype: BasketballSubtype!`, `periods: Int` |
| Tennis | `TennisGameMetadata` | `subtype: TennisSubtype!`, `bestOf: Int!`, `tiebreakFinalSet: Boolean!` |
| Football | `FootballGameMetadata` | `subtype: FootballSubtype!`, `periods: Int` |

### 2.2 GameParticipant.metadata (ParticipantMetadata union -- nullable)

| Sport | Type | Fields |
|-------|------|--------|
| Basketball | `BasketballParticipantMetadata` | `score: Int!` |
| Tennis | `TennisParticipantMetadata` | `setsWon: Int!`, `sets: [TennisSetScore!]!` |
| Football | `FootballParticipantMetadata` | `score: Int!` |

`TennisSetScore` has `gamesWon: Int!` and `tiebreakPoints: Int`.

### 2.3 Removed fields

- `Game.sportSubtype` -- removed (subtype is now inside `Game.metadata`)
- `TeamInstance.attributes` -- removed (replaced by `GameParticipant.metadata`)

### 2.4 New input structures

- `CreateGameInput` is now `@oneOf` with `basketball`, `football`, `tennis` branches. Each branch has `startDate`, optional `location`, and a required sport-specific `metadata` object containing `subtype` (required) plus optional config fields.
- `UpdateGameInput` has an optional `metadata: GameMetadataInput` (also `@oneOf`).
- `UpdateGameParticipantInput` / `UpdateTeamInstanceInput` / `UpdateIndividualParticipantInput` now accept `metadata: ParticipantMetadataInput` (`@oneOf`).

---

## 3. TypeScript Type Changes

**File:** `src/lib/types/game.ts`

### 3.1 New types to add

```typescript
// ---------- Game Metadata ----------

interface BasketballGameMetadata {
  __typename: "BasketballGameMetadata";
  subtype: "FIVE_ON_FIVE" | "THREE_ON_THREE";
  periods: number | null;
}

interface TennisGameMetadata {
  __typename: "TennisGameMetadata";
  subtype: "SINGLES" | "DOUBLES";
  bestOf: number;
  tiebreakFinalSet: boolean;
}

interface FootballGameMetadata {
  __typename: "FootballGameMetadata";
  subtype: "FLAG_FOOTBALL" | "AMERICAN_FOOTBALL";
  periods: number | null;
}

type GameMetadata = BasketballGameMetadata | TennisGameMetadata | FootballGameMetadata;

// ---------- Participant Metadata ----------

interface BasketballParticipantMetadata {
  __typename: "BasketballParticipantMetadata";
  score: number;
}

interface TennisSetScore {
  gamesWon: number;
  tiebreakPoints: number | null;
}

interface TennisParticipantMetadata {
  __typename: "TennisParticipantMetadata";
  setsWon: number;
  sets: TennisSetScore[];
}

interface FootballParticipantMetadata {
  __typename: "FootballParticipantMetadata";
  score: number;
}

type ParticipantMetadata =
  | BasketballParticipantMetadata
  | TennisParticipantMetadata
  | FootballParticipantMetadata;
```

### 3.2 Types to modify

**`TeamInstanceNode`** (used in game cards):
- Remove: nothing new needed here for cards; metadata will be on the node.
- Add: `metadata: ParticipantMetadata | null`

**`TeamInstanceDetail`** (used in game detail page):
- Remove: `attributes: Record<string, unknown>`
- Add: `metadata: ParticipantMetadata | null`

**`IndividualParticipantNode`**:
- Add: `metadata: ParticipantMetadata | null`

**`GameNode`** (game card data):
- Remove: `sportSubtype: SportSubtype`
- Add: `metadata: GameMetadata`

**`GameDetail`** (game detail data):
- Remove: `sportSubtype: SportSubtype`
- Add: `metadata: GameMetadata`

**`CreateGameInput`**:
- Remove: `sportType: SportType`, `subtype: SportSubtype`, `startDate: string`
- Replace with a discriminated union or a structure matching the `@oneOf` pattern:

```typescript
interface CreateBasketballGameInput {
  sportType: "BASKETBALL";
  startDate: string;
  metadata: {
    subtype: "FIVE_ON_FIVE" | "THREE_ON_THREE";
    periods?: number;
  };
}

interface CreateTennisGameInput {
  sportType: "TENNIS";
  startDate: string;
  metadata: {
    subtype: "SINGLES" | "DOUBLES";
    bestOf?: number;
    tiebreakFinalSet?: boolean;
  };
}

interface CreateFootballGameInput {
  sportType: "FOOTBALL";
  startDate: string;
  metadata: {
    subtype: "FLAG_FOOTBALL" | "AMERICAN_FOOTBALL";
    periods?: number;
  };
}

type CreateGameInput = CreateBasketballGameInput | CreateTennisGameInput | CreateFootballGameInput;
```

**`UpdateGameInput`**:
- Add optional `metadata` field for updating game configuration:

```typescript
interface UpdateGameInput {
  id: number;
  startDate?: string;
  metadata?: {
    basketball?: { subtype?: "FIVE_ON_FIVE" | "THREE_ON_THREE"; periods?: number };
    tennis?: { subtype?: "SINGLES" | "DOUBLES"; bestOf?: number; tiebreakFinalSet?: boolean };
    football?: { subtype?: "FLAG_FOOTBALL" | "AMERICAN_FOOTBALL"; periods?: number };
  };
}
```

**`UpdateTeamParticipantInput`**:
- Remove: `attributes?: Record<string, unknown>`
- Add: `metadata?: ParticipantMetadataInput` (see below)

**New -- `UpdateIndividualParticipantInput`** (for updating individual participant scores):

```typescript
interface UpdateIndividualParticipantMetadataInput {
  participantId: number;
  metadata?: ParticipantMetadataInput;
}
```

**New -- `ParticipantMetadataInput`** (`@oneOf` -- exactly one key):

```typescript
interface ParticipantMetadataInput {
  basketball?: { score: number };
  tennis?: { setsWon: number; sets: { gamesWon: number; tiebreakPoints?: number }[] };
  football?: { score: number };
}
```

### 3.3 Types to remove

- Remove `SportSubtype` from `GameNode` and `GameDetail` (the subtype is accessed via `game.metadata.subtype`).
- The `SportSubtype` enum in constants will remain because it is still needed for form validation and config lookups, but it is no longer a direct field on game response types.

---

## 4. Constants / Config Changes

**File:** `src/lib/constants.ts`

### 4.1 Changes needed

The `SportSubtype` enum and `SportSubtypeConfig` remain valid -- they still map subtype enum values to participation type and max sizes. However, the way subtype is accessed changes from `game.sportSubtype` to `game.metadata.subtype`.

**Add a helper function** to extract the subtype from game metadata:

```typescript
function getSubtypeFromMetadata(metadata: GameMetadata): SportSubtype {
  return metadata.subtype as SportSubtype;
}
```

This is needed because each metadata type has its own subtype enum (`BasketballSubtype`, `TennisSubtype`, `FootballSubtype`) in the schema, but the values are identical to our client-side `SportSubtype` enum values.

**No structural changes** to `SportType`, `SportSubtypeConfig`, or the helper functions. They continue to work -- callers just need to pass `getSubtypeFromMetadata(game.metadata)` instead of `game.sportSubtype`.

---

## 5. GraphQL Query Changes

### 5.1 Game card queries (game list + profile game history)

**Affected locations:**
- `src/app/[locale]/games/page.tsx` -- initial games query
- `src/app/[locale]/game/actions.ts` -- `loadMoreGames` function
- `src/app/[locale]/user/[username]/actions.ts` -- `loadMoreGames` function
- `src/app/[locale]/user/[username]/page.tsx` (if it has an inline query -- check and update)

**Changes to the game node query shape:**

Remove:
```
sportSubtype: true,
```

Add:
```
metadata: {
  __typename: true,
  __on: [
    {
      __typeName: "BasketballGameMetadata",
      subtype: true,
      periods: true,
    },
    {
      __typeName: "TennisGameMetadata",
      subtype: true,
      bestOf: true,
      tiebreakFinalSet: true,
    },
    {
      __typeName: "FootballGameMetadata",
      subtype: true,
      periods: true,
    },
  ],
},
```

Add participant metadata to the participant fragments:

```
// Inside TeamInstance fragment:
metadata: {
  __typename: true,
  __on: [
    {
      __typeName: "BasketballParticipantMetadata",
      score: true,
    },
    {
      __typeName: "TennisParticipantMetadata",
      setsWon: true,
      sets: { gamesWon: true, tiebreakPoints: true },
    },
    {
      __typeName: "FootballParticipantMetadata",
      score: true,
    },
  ],
},

// Same metadata fragment inside IndividualParticipant
```

### 5.2 Game detail query

**File:** `src/app/[locale]/game/[id]/page.tsx`

Same changes as 5.1, plus:
- Remove `sportSubtype: true` from the game query.
- Remove `attributes: true` from the `TeamInstance` fragment.
- Add `metadata` with full inline fragments to both game and participants.

### 5.3 Create game mutation

**File:** `src/app/[locale]/game/actions.ts` -- `createGame` function

The mutation input structure changes. The subtype moves into a `metadata` sub-object:

Before:
```
basketball: { startDate, subtype }
```

After:
```
basketball: { startDate, metadata: { subtype, periods? } }
```

Same pattern for football and tennis (tennis also passes `bestOf` and `tiebreakFinalSet` when provided).

The response query for createGame should also fetch the new `metadata` union.

### 5.4 Update game mutation

**File:** `src/app/[locale]/game/actions.ts` -- `updateGame` function

Add support for passing `metadata` in the mutation input when game config fields are being updated.

### 5.5 Update participant mutation (for score editing)

**File:** `src/app/[locale]/game/participant-actions.ts`

Add a new server action `updateParticipantScore` (or modify `updateTeamParticipant` and add `updateIndividualParticipantScore`) that sends the `metadata` field in the `UpdateGameParticipantInput`.

For team-based sports:
```
updateGameParticipant: {
  input: {
    teamInstance: {
      id: participantId,
      metadata: { basketball: { score: 78 } }
    }
  }
}
```

For individual sports:
```
updateGameParticipant: {
  input: {
    individual: {
      id: participantId,
      metadata: { tennis: { setsWon: 2, sets: [...] } }
    }
  }
}
```

Remove all `attributes` references from existing participant actions (`addTeamParticipant`, `updateTeamParticipant`).

### 5.6 Metadata query for generateMetadata

**File:** `src/app/[locale]/game/[id]/page.tsx` -- `generateMetadata` function

Replace `sportSubtype: true` with the `metadata` union fragment. Use `metadata.subtype` for the page description.

---

## 6. Component Changes

### 6.1 Game Card (game list) -- `src/components/game/game-card.tsx`

**Current behavior:** Shows sport type, subtype badge, status badge, date, and participant names (e.g., "Team A vs Team B").

**New behavior:** Add a score display between or alongside participant names.

**Display format by sport:**

- **Basketball / Football:** `"Team A 78 - 65 Team B"` or for individuals `"Player A 21 - 18 Player B"`
  - Score comes from `participant.metadata.score` (for `BasketballParticipantMetadata` or `FootballParticipantMetadata`)
  - If both participants have metadata, show: `"{name1} {score1} - {score2} {name2}"`
  - If only one has metadata, show the available score with a dash for the other.

- **Tennis:** `"Federer 2-1 Nadal | 6-4, 3-6, 7-5"`
  - `setsWon` values shown as `"{setsWon1}-{setsWon2}"` between names
  - After a pipe separator, per-set game scores: `"{games1}-{games2}"` for each set, comma-separated
  - If a set had a tiebreak (`tiebreakPoints` is not null), append it in parentheses on the losing side: e.g., `"7-6(4)"` where 4 is the tiebreak points of the player who lost the tiebreak. (The tiebreak winner always has 7 games; display the loser's tiebreakPoints in parens after the 6.)

**Edge cases:**
- **No metadata on participants (game SCHEDULED, no scores yet):** Show just participant names as today, no score.
- **Only one participant has metadata:** Show available score, dash for the other (e.g., "Team A 78 - ? Team B"). Use `"-"` for unknown.
- **No participants:** Show the existing "No participants yet" / "TBD" text.

**Subtype badge:** Currently reads `game.sportSubtype`. Change to read `game.metadata.subtype`.

### 6.2 Profile Game Card -- `src/components/profile/game-card.tsx`

**Same score display changes as 6.1.** This card is more compact (horizontal layout) but should show the same score information.

- Subtype badge currently reads `game.sportSubtype`. Change to `game.metadata.subtype`.
- Add score display in the participants text area, same formatting as 6.1.

### 6.3 Game Detail Header -- `src/components/game/game-detail-header.tsx`

**Current behavior:** Shows `"{sportText} - {subtypeText}"` as the page heading.

**Changes:**
- Read subtype from `game.metadata.subtype` instead of `game.sportSubtype`.
- Optionally show secondary metadata in the header (use designer's judgment):
  - Basketball/Football: show periods if set (e.g., "5v5 Basketball - 4 Quarters")
  - Tennis: show bestOf and tiebreak rule (e.g., "Singles Tennis - Best of 3, Final Set Tiebreak")
  - If the optional config values are null/default, just show sport and subtype.

### 6.4 Game Scoreboard (NEW COMPONENT) -- `src/components/game/game-scoreboard.tsx`

A new prominent component displayed on the game detail page, positioned between the header and the schedule card.

**Layout:**

For **basketball and football** (two participants with a simple score):
```
+-----------------------------------------------+
|        Team A          78 - 65        Team B   |
|  (or Player A)                   (or Player B) |
+-----------------------------------------------+
```

- Large, centered score numbers.
- Participant names on either side.
- If the game is IN_PROGRESS or COMPLETE and the user is authenticated, show an edit icon/button to enter inline edit mode.

For **tennis** (two participants with set-by-set scores):
```
+-----------------------------------------------+
|  Player A    2    |  6  |  3  |  7  |          |
|  Player B    1    |  4  |  6  | 6(4)|          |
+-----------------------------------------------+
```

- Table-style layout: participant name, total sets won, then one column per set.
- Tiebreak points shown in parentheses next to the game score of the set loser (e.g., "6(4)" means they scored 4 tiebreak points and lost the tiebreak).
- Full set-by-set breakdown is always visible on the detail page.

**Edge cases:**
- **SCHEDULED game (no scores):** Show participant names with dashes or "0 - 0" placeholder. Do NOT show the edit button.
- **IN_PROGRESS game with no scores yet:** Show "0 - 0" or empty set table. Show the edit button.
- **No participants:** Show a message indicating participants need to be added before scores can be recorded.
- **Only one participant added:** Show that participant's name with placeholder for the other side.

### 6.5 Scoreboard Inline Editing

**Trigger:** An edit (pencil) icon button on the scoreboard. Only visible when `gameStatus` is `IN_PROGRESS` or `COMPLETE`.

**Basketball / Football edit mode:**
- The score numbers become editable number inputs.
- Each participant's score is an independent input field.
- A "Save" button and "Cancel" button appear.
- On save, call the `updateGameParticipants` (bulk) mutation with both participants' metadata.
- On cancel, revert to display mode with original values.
- Validation: scores must be non-negative integers.

**Tennis edit mode:**
- A table appears with rows per set. Each row has:
  - Set number (1, 2, 3, ...)
  - Player A games won (number input)
  - Player B games won (number input)
  - Tiebreak points field for each player (shown only when both players have the same number of games, or when either player's games won is 7 and the other is 6). The tiebreak points input should only appear for the player who lost the tiebreak (the one with 6 games in that set). However, for simplicity in the UI, show tiebreak points inputs for both players when the set score indicates a potential tiebreak (either player has 7 games), and let the server handle validation.
  - An "Add Set" button to add another set row (up to the `bestOf` value).
  - A "Remove Set" button (trash icon) on each set row except the first.
- `setsWon` is computed client-side from the set data before submission (count sets where playerA.gamesWon > playerB.gamesWon for player A, and vice versa).
- "Save" and "Cancel" buttons.
- On save, call `updateGameParticipants` (bulk) with both participants' tennis metadata.

**Error handling:**
- Show toast on mutation error.
- Disable save button while mutation is pending.
- Show loading spinner on save button during pending state.

### 6.6 Game Participants Section -- `src/components/game/game-participants.tsx`

**Changes:**
- Currently calls `getParticipationType(game.sportSubtype)`. Change to use `getParticipationType(getSubtypeFromMetadata(game.metadata))`.
- Same for `getMaxParticipants`.

### 6.7 Team Card -- `src/components/game/team-card.tsx`

**Changes:**
- Remove any references to `team.attributes`.
- The score is displayed on the scoreboard (section 6.4), not duplicated on the team card. No metadata display needed here.

### 6.8 Individual Participant List -- `src/components/game/individual-participant-list.tsx`

**Changes:**
- No score display needed here (scores shown on scoreboard). No metadata display changes.

### 6.9 Create Game Form -- `src/components/game/create-game-form.tsx`

**Current behavior:** Collects sport type, subtype, and start date.

**New behavior:** Add an "Advanced Options" collapsible section below the subtype selector that shows sport-specific metadata fields.

**Form fields (always visible):**
1. Sport Type (select) -- unchanged
2. Sport Subtype (select) -- unchanged (label: "Format")
3. Start Date (date+time picker) -- unchanged

**Advanced Options (collapsed by default):**

When sport type is **Basketball** or **Football**:
- `periods` -- Number input, placeholder text showing the default (e.g., "4" for basketball 5v5, "2" for 3v3). Label: "Number of Periods". Optional.

When sport type is **Tennis**:
- `bestOf` -- Select with options 3 and 5. Label: "Best Of". Placeholder: "3" (default). Optional.
- `tiebreakFinalSet` -- Checkbox/switch. Label: "Tiebreak in Final Set". Default: checked/true. Optional.

**Collapsible UX:**
- Use a clickable text link or button styled as "Advanced Options" with a chevron icon.
- When expanded, show the sport-specific fields.
- When collapsed, fields are not rendered (and their values are not sent -- server uses defaults).
- The toggle should only appear after a sport type is selected.

**Form submission changes:**
- Build the `@oneOf` mutation input with the `metadata` sub-object.
- Only include advanced fields in the metadata if they were explicitly set by the user.

**Zod schema changes:**
- Add optional fields: `periods` (positive integer, optional), `bestOf` (3 or 5, optional), `tiebreakFinalSet` (boolean, optional).
- These fields are conditionally validated based on sport type.

### 6.10 Update Game Form -- `src/components/game/update-game-form.tsx`

**Current behavior:** Only allows editing the start date.

**New behavior:** Add the same "Advanced Options" section as the create form, pre-populated with the game's current metadata values.

**Props changes:**
- Add `metadata: GameMetadata` prop (the current game metadata).
- Add `sportType: SportType` prop.

**Form fields:**
- Start Date -- unchanged
- Advanced Options -- same fields as create form, but pre-populated with current values from `metadata`.

**Submission:**
- Only include `metadata` in the mutation if any metadata field was changed from its current value.
- Use the `GameMetadataInput` `@oneOf` pattern matching the game's sport type.

### 6.11 Create Game Dialog -- `src/components/game/create-game-dialog.tsx`

**Changes:** None expected (it wraps `CreateGameForm`). Verify it passes through correctly.

### 6.12 Game Detail Page -- `src/app/[locale]/game/[id]/page.tsx`

**Changes:**
- Update the GraphQL query (see section 5.2).
- Insert the new `GameScoreboard` component between the header and the schedule card.
- Pass `game.metadata` and `game.sportType` to `UpdateGameForm`.
- Remove `sportSubtype` references from metadata generation.

**New page layout order:**
1. Back button
2. `GameDetailHeader` (with subtype from metadata)
3. **`GameScoreboard`** (NEW -- prominent score display)
4. Schedule card
5. Participants section
6. Box Scores section

### 6.13 Games List Page -- `src/app/[locale]/games/page.tsx`

**Changes:**
- Update the GraphQL query shape (see section 5.1).
- No other structural changes.

### 6.14 Profile Page -- `src/app/[locale]/user/[username]/page.tsx`

**Changes:**
- Update any inline game query to include metadata fields (see section 5.1).
- Verify `GameHistory` / profile `GameCard` receives the updated `GameNode` type.

---

## 7. Server Actions Changes

### 7.1 `src/app/[locale]/game/actions.ts`

**`createGame`:**
- Accept the new `CreateGameInput` type.
- Build the `@oneOf` mutation input with `metadata` containing `subtype` plus any optional fields.
- Update the response query to fetch `metadata` union instead of `sportSubtype`.

**`updateGame`:**
- Accept the updated `UpdateGameInput` with optional `metadata`.
- When `metadata` is provided, include it in the mutation input using the `@oneOf GameMetadataInput` pattern.

**`loadMoreGames`:**
- Update query shape to fetch `metadata` union and participant metadata (see section 5.1).
- Remove `sportSubtype: true`.

### 7.2 `src/app/[locale]/game/participant-actions.ts`

**`addTeamParticipant`:**
- Remove `attributes` from input and response query.
- Add `metadata` union fragment to response query.

**`updateTeamParticipant`:**
- Remove `attributes` from input and response query.
- Add optional `metadata: ParticipantMetadataInput` to the mutation input.
- Add `metadata` union fragment to response query.

**New action -- `updateParticipantScores`:**
A new server action for the scoreboard's save operation. Accepts the game's sport type and an array of participant score updates. Uses the `updateGameParticipants` (bulk) mutation.

```typescript
interface UpdateParticipantScoresInput {
  sportType: SportType;
  participants: {
    id: number;
    isTeam: boolean; // determines teamInstance vs individual in @oneOf
    metadata: ParticipantMetadataInput;
  }[];
}
```

**`addIndividualParticipant`:**
- Add `metadata` union fragment to response query.

**Remove `attributes` from all existing actions** that reference it.

### 7.3 `src/app/[locale]/user/[username]/actions.ts`

**`loadMoreGames`:**
- Update query shape to fetch `metadata` union and participant metadata.
- Remove `sportSubtype: true`.

---

## 8. i18n Translation Keys

**File:** `messages/en.json`

### 8.1 New keys to add

```json
{
  "game": {
    "scoreboard": {
      "title": "Score",
      "noParticipants": "Add participants to track scores",
      "noScores": "No scores recorded",
      "edit": "Edit Score",
      "save": "Save Score",
      "cancel": "Cancel",
      "saving": "Saving...",
      "scoreUpdated": "Score updated",
      "scoreUpdateError": "Failed to update score",
      "set": "Set",
      "sets": "Sets",
      "addSet": "Add Set",
      "removeSet": "Remove Set",
      "gamesWon": "Games",
      "tiebreakPoints": "TB",
      "setsWon": "Sets Won",
      "points": "Points"
    },
    "form": {
      "advancedOptions": "Advanced Options",
      "periods": "Number of Periods",
      "periodsPlaceholder": "Default: {default}",
      "bestOf": "Best Of",
      "bestOfPlaceholder": "Default: 3",
      "tiebreakFinalSet": "Tiebreak in Final Set"
    },
    "metadata": {
      "periods": "{count} {count, plural, one {Period} other {Periods}}",
      "bestOf": "Best of {count}",
      "tiebreakFinalSet": "Final Set Tiebreak",
      "noTiebreakFinalSet": "No Final Set Tiebreak"
    },
    "validation": {
      "periodsPositive": "Periods must be a positive number",
      "bestOfRequired": "Best of must be 3 or 5",
      "scoreNonNegative": "Score must be 0 or greater",
      "gamesWonNonNegative": "Games won must be 0 or greater",
      "tiebreakPointsNonNegative": "Tiebreak points must be 0 or greater"
    }
  }
}
```

These keys are merged into the existing `game` namespace in `en.json`.

---

## 9. Score Formatting Utilities

**New file:** `src/lib/format-score.ts`

Create utility functions for consistent score formatting across game cards and the scoreboard.

### 9.1 Functions

**`formatGameScore(sportType, participants)`** -- Returns a formatted score string for game cards.

- **Basketball / Football (two participants):** `"78 - 65"` or `"- - -"` if no scores.
- **Tennis (two participants):** `"2-1 | 6-4, 3-6, 7-5"` or `"0-0"` if no scores.

**`formatTennisSetScore(playerASets, playerBSets)`** -- Returns the per-set score string.

- Each set: `"{gamesA}-{gamesB}"`.
- If the set had a tiebreak (one player has 7 games, the other 6), append `"({tiebreakPoints})"` to the losing player's game count. The tiebreakPoints shown are those of the player who LOST the tiebreak (i.e., the player who has 6 games in that set).
- Example: Player A won 7-6 with Player B scoring 4 tiebreak points: `"7-6(4)"`.

**`hasScores(participants)`** -- Returns `boolean` indicating whether any participant has non-null metadata.

---

## 10. Edge Cases

### 10.1 Game with no participants
- Game cards: Show sport type and subtype only, no score line.
- Scoreboard: Show message "Add participants to track scores".

### 10.2 Game with participants but no scores (SCHEDULED)
- Game cards: Show participant names without scores (current behavior).
- Scoreboard: Show participant names with "0 - 0" or empty set table. No edit button (editing restricted to IN_PROGRESS or COMPLETE).

### 10.3 Game with participants but no scores (IN_PROGRESS or COMPLETE)
- Game cards: Show participant names with "0 - 0".
- Scoreboard: Show "0 - 0" or empty set table. Show the edit button.

### 10.4 Game with only one participant
- Game cards: Show the one participant's name. No "vs" separator.
- Scoreboard: Show the one participant. Placeholder for the other side ("TBD" or "--").

### 10.5 Participant metadata is null
- Treat as score = 0 for basketball/football.
- Treat as setsWon = 0, sets = [] for tennis.
- The `metadata` field on `GameParticipant` is nullable, so always handle the null case.

### 10.6 Tennis: variable number of sets
- Sets array may have 0 to 5 entries.
- Game card shows only completed sets.
- Scoreboard shows all sets including in-progress.

### 10.7 Concurrent editing
- Not addressed in this feature. Last write wins (server behavior).

---

## 11. Files Changed Summary

| File | Change Type |
|------|-------------|
| `src/lib/types/game.ts` | Major rewrite -- new metadata types, remove `sportSubtype`/`attributes` |
| `src/lib/constants.ts` | Add `getSubtypeFromMetadata` helper |
| `src/lib/format-score.ts` | **NEW** -- score formatting utilities |
| `src/components/game/game-card.tsx` | Add score display, update subtype access |
| `src/components/profile/game-card.tsx` | Add score display, update subtype access |
| `src/components/game/game-detail-header.tsx` | Update subtype access, optional metadata labels |
| `src/components/game/game-scoreboard.tsx` | **NEW** -- prominent scoreboard with inline editing |
| `src/components/game/game-participants.tsx` | Update subtype access path |
| `src/components/game/team-card.tsx` | Remove `attributes` references |
| `src/components/game/individual-participant-list.tsx` | No metadata display changes; type updates only |
| `src/components/game/create-game-form.tsx` | Add Advanced Options with sport-specific fields |
| `src/components/game/update-game-form.tsx` | Add Advanced Options, accept metadata prop |
| `src/app/[locale]/game/actions.ts` | Update mutations and queries for metadata |
| `src/app/[locale]/game/participant-actions.ts` | Remove `attributes`, add score update action |
| `src/app/[locale]/game/[id]/page.tsx` | Update query, add scoreboard, update props |
| `src/app/[locale]/games/page.tsx` | Update query shape |
| `src/app/[locale]/user/[username]/actions.ts` | Update query shape |
| `src/app/[locale]/user/[username]/page.tsx` | Update query shape (if inline query exists) |
| `messages/en.json` | Add new translation keys |

---

## 12. Out of Scope

- `Game.location` display (explicitly excluded per user request).
- Real-time score updates via subscriptions.
- Score validation rules beyond basic non-negative integer checks (server handles sports-rule validation).
- Box score integration with the new metadata (box scores remain unchanged).
- Adding new sports or subtypes.
