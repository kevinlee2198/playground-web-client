# Stats Package Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the playground-web-client frontend with the renamed GraphQL schema (`BoxScore`/`Statistics` → `Stats`) and propagate the rename through every internal identifier in the stats package.

**Architecture:** This is a bugfix wrapped in a refactor. The frontend's runtime queries/mutations/subscriptions currently reference schema fields and types that no longer exist; basketball/pickleball/tennis/volleyball stats are 100% broken. The plan is split into 6 ordered phases — phase 2 restores schema alignment, phases 3–6 propagate the consistent naming to internal identifiers, i18n keys, file names, fixtures, and the developer-facing skill doc — all landing in a single atomic commit at the end.

**Tech Stack:** Next.js 16 App Router, TypeScript strict mode, json-to-graphql-query (object-form GraphQL), TanStack Form + Vitest + Playwright/MSW, next-intl for i18n.

**Spec:** `docs/superpowers/specs/2026-04-06-stats-rename-design.md`

**Critical reading before starting any task:**
- The spec doc (full design and rationale)
- `git diff schema.graphqls` (the source of truth for schema renames — basketball `BoxScore` → `Stats`, pickleball/tennis/volleyball `Statistics` → `Stats`, bulk save inputs use field name `stats: [...]`)
- `CLAUDE.md` (project conventions: import patterns, json-to-graphql-query usage, test capture rule)

**Single commit.** The entire rename is one logical change — "align frontend with renamed stats schema + propagate consistent naming." The plan is split into 6 ordered phases for mental clarity, but they all land in a single commit at the very end (Task F.2). Do not commit or push intermediate states.

**Order discipline within the single commit:**
- Execute phases in order. Several phases produce broken intermediate states (phase 1 doesn't compile; between phases 3 and 4 the runtime logs missing-translation warnings). Do not run verification (build, tests, Playwright) until after phase 6 completes.
- Task F.1 runs the full verification suite once at the end.

---

## File Structure

This plan touches existing files only — no new files except renames. Renames preserve responsibility:

| File (renamed) | Responsibility |
|---|---|
| `src/lib/types/stats/base.ts` | Sport-neutral base types `StatsNode` and `SaveStatsInput` |
| `src/lib/types/stats/{sport}.ts` (×6) | Per-sport node and save-input/data interfaces |
| `src/lib/types/game-event.ts` | Discriminated union of game events including `BasketballStatsSavedEvent` |
| `src/app/[locale]/game/basketball-stats-actions.ts` (was `box-score-actions.ts`) | Single + bulk save mutations for basketball |
| `src/app/[locale]/game/{sport}-stats-actions.ts` (×3 — pickleball, tennis, volleyball) | Single + bulk save mutations for each sport |
| `src/app/[locale]/game/{sport}-stats-actions.ts` (×2 — football, baseball) | Already conformant; only touched for cross-file imports if any |
| `src/app/[locale]/game/[id]/page.tsx` | Server component fetching stats per sport |
| `src/components/game/live/game-detail-client.tsx` | Client wrapper passing initial stats to live reducer + UI |
| `src/components/game/live/game-live-reducer.ts` | Reducer for live basketball stats updates |
| `src/hooks/use-game-subscription.ts` | GraphQL WS subscription including `BasketballStatsSavedEvent` selection |
| `src/components/game/basketball-stats-table.tsx` (was `basketball-box-score-table.tsx`) | Basketball stats table |
| `src/components/game/basketball-stats-form.tsx` (was `basketball-box-score-form.tsx`) | Basketball edit dialog |
| `src/components/game/{sport}-stats-table.tsx` (×9 total — basketball, pickleball, tennis, volleyball, football×3, baseball×3) | Per-sport stats table; uses generic prop `stats` |
| `src/components/game/{sport}-stats-form.tsx` (×9 total) | Per-sport edit dialog |
| `src/components/game/game-stats.tsx` (was `game-box-scores.tsx`) | Orchestrator picking the right table per sport |
| `src/components/game/game-stats-skeleton.tsx` (was `game-box-scores-skeleton.tsx`) | Loading skeleton (currently dead code; renamed for consistency) |
| `src/components/game/collapsible-stats.tsx` (was `collapsible-box-score.tsx`) | Collapsible card wrapping each team's table |
| `messages/en.json` | i18n namespace `game.stats.*` |
| `tests/fixtures/graphql-handlers.ts` | MSW handlers; `EMPTY_STAT_FIELDS` array gains `volleyballStats` |
| `tests/fixtures/mock-data/games.ts` | Mock helper `mockBasketballStatsResponse` |
| `__tests__/[locale]/game/basketball-stats-actions.test.ts` (was `box-score-actions.test.ts`) | Action unit tests |
| `__tests__/components/game/live/game-live-reducer.test.ts` | Reducer unit tests |
| `.claude/skills/add-sport-type/SKILL.md` | Developer-facing skill for adding new sports |

---

## Phase 1 — Type model rename

**Goal:** Rename TypeScript types in the type-defs layer. Project will not compile after this phase. Continue to phase 2.

### Task 1.1: Rename base types in `src/lib/types/stats/base.ts`

**Files:**
- Modify: `src/lib/types/stats/base.ts`

- [ ] **Step 1: Open the file**

Read `src/lib/types/stats/base.ts`. The current contents define `BoxScoreNode` and `SaveBoxScoreInput`.

- [ ] **Step 2: Rewrite the file**

Replace the entire file with:

```typescript
import type { PlayerRef } from "@/lib/types/game";

/**
 * Lightweight game reference used in stats responses.
 */
export interface GameRef {
  id: number;
}

/**
 * Base interface for all sport stats response types.
 * Every stats entry is identified by an id and tied to a player.
 * The game field is optional because stats are typically queried
 * in the context of a known game, so the field isn't always fetched.
 */
export interface StatsNode {
  id: number;
  player: PlayerRef;
  game?: GameRef;
}

/**
 * Base interface for all sport stats save inputs.
 * Every stats input requires a player and game reference.
 */
export interface SaveStatsInput {
  playerId: number;
  gameId: number;
}
```

- [ ] **Step 3: Save and move on (no test/build yet — defer until Task F.1 at the end of all phases)**

### Task 1.2: Rename basketball type interfaces

**Files:**
- Modify: `src/lib/types/stats/basketball.ts`

- [ ] **Step 1: Rewrite imports and interfaces**

Replace the file's contents. The structure stays the same; only identifier names change. Use `replace_all` or rewrite the file:

```typescript
import type { StatsNode, SaveStatsInput } from "./base";

/**
 * Basketball stats entry returned from the server.
 */
export interface BasketballStatsNode extends StatsNode {
  points: number | null;
  assists: number | null;
  totalRebounds: number | null;
  offensiveRebounds: number | null;
  defensiveRebounds: number | null;
  steals: number | null;
  blocks: number | null;
  turnovers: number | null;
  personalFouls: number | null;
  fieldGoalsMade: number | null;
  fieldGoalsAttempted: number | null;
  fieldGoalPercentage: number | null;
  threePointersMade: number | null;
  threePointersAttempted: number | null;
  threePointerPercentage: number | null;
  twoPointersMade: number | null;
  twoPointersAttempted: number | null;
  twoPointerPercentage: number | null;
  freeThrowsMade: number | null;
  freeThrowsAttempted: number | null;
  freeThrowPercentage: number | null;
}

/**
 * Input for saving basketball stats.
 * Patch semantics:
 * - Omit a field (undefined) to leave it unchanged
 * - Set to null to clear the value
 * - Set to a number to update
 */
export interface SaveBasketballStatsInput extends SaveStatsInput {
  assists?: number | null;
  steals?: number | null;
  blocks?: number | null;
  turnovers?: number | null;
  personalFouls?: number | null;
  offensiveRebounds?: number | null;
  defensiveRebounds?: number | null;
  threePointersMade?: number | null;
  threePointersAttempted?: number | null;
  twoPointersMade?: number | null;
  twoPointersAttempted?: number | null;
  freeThrowsMade?: number | null;
  freeThrowsAttempted?: number | null;
}

/**
 * Per-player stats data for bulk save (gameId is at parent level).
 * Independent interface mirroring schema — not derived from SaveBasketballStatsInput.
 */
export interface SaveBasketballStatsData {
  playerId: number;
  assists?: number | null;
  steals?: number | null;
  blocks?: number | null;
  turnovers?: number | null;
  personalFouls?: number | null;
  offensiveRebounds?: number | null;
  defensiveRebounds?: number | null;
  threePointersMade?: number | null;
  threePointersAttempted?: number | null;
  twoPointersMade?: number | null;
  twoPointersAttempted?: number | null;
  freeThrowsMade?: number | null;
  freeThrowsAttempted?: number | null;
}
```

### Task 1.3: Rename pickleball type interfaces

**Files:**
- Modify: `src/lib/types/stats/pickleball.ts`

- [ ] **Step 1: Rewrite the file**

Replace the entire file with:

```typescript
import type { StatsNode, SaveStatsInput } from "./base";

/**
 * Pickleball stats entry returned from the server.
 */
export interface PickleballStatsNode extends StatsNode {
  aces: number | null;
  faults: number | null;
  doubleFaults: number | null;
  pointsWon: number | null;
  winners: number | null;
  unforcedErrors: number | null;
  forcedErrors: number | null;
  dinks: number | null;
  drives: number | null;
  drops: number | null;
  lobs: number | null;
  volleys: number | null;
  overheads: number | null;
}

/**
 * Input for saving Pickleball stats.
 * Patch semantics:
 * - Omit a field (undefined) to leave it unchanged
 * - Set to null to clear the value
 * - Set to a number to update
 */
export interface SavePickleballStatsInput extends SaveStatsInput {
  aces?: number | null;
  faults?: number | null;
  doubleFaults?: number | null;
  pointsWon?: number | null;
  winners?: number | null;
  unforcedErrors?: number | null;
  forcedErrors?: number | null;
  dinks?: number | null;
  drives?: number | null;
  drops?: number | null;
  lobs?: number | null;
  volleys?: number | null;
  overheads?: number | null;
}

/**
 * Per-player stats data for bulk save (gameId is at parent level).
 * Independent interface mirroring schema — not derived from SavePickleballStatsInput.
 */
export interface SavePickleballStatsData {
  playerId: number;
  aces?: number | null;
  faults?: number | null;
  doubleFaults?: number | null;
  pointsWon?: number | null;
  winners?: number | null;
  unforcedErrors?: number | null;
  forcedErrors?: number | null;
  dinks?: number | null;
  drives?: number | null;
  drops?: number | null;
  lobs?: number | null;
  volleys?: number | null;
  overheads?: number | null;
}
```

### Task 1.4: Rename tennis type interfaces

**Files:**
- Modify: `src/lib/types/stats/tennis.ts`

- [ ] **Step 1: Rewrite the file**

Replace with:

```typescript
import type { StatsNode, SaveStatsInput } from "./base";

/**
 * Tennis match stats entry returned from the server.
 */
export interface TennisStatsNode extends StatsNode {
  aces: number | null;
  doubleFaults: number | null;
  firstServesIn: number | null;
  firstServeAttempts: number | null;
  firstServePointsWon: number | null;
  firstServePointsPlayed: number | null;
  secondServePointsWon: number | null;
  secondServePointsPlayed: number | null;
  breakPointsConverted: number | null;
  breakPointsFaced: number | null;
  returnPointsWon: number | null;
  returnPointsPlayed: number | null;
  winners: number | null;
  unforcedErrors: number | null;
  totalPointsWon: number | null;
}

/**
 * Input for saving tennis stats.
 * Patch semantics:
 * - Omit a field (undefined) to leave it unchanged
 * - Set to null to clear the value
 * - Set to a number to update
 */
export interface SaveTennisStatsInput extends SaveStatsInput {
  aces?: number | null;
  doubleFaults?: number | null;
  firstServesIn?: number | null;
  firstServeAttempts?: number | null;
  firstServePointsWon?: number | null;
  firstServePointsPlayed?: number | null;
  secondServePointsWon?: number | null;
  secondServePointsPlayed?: number | null;
  breakPointsConverted?: number | null;
  breakPointsFaced?: number | null;
  returnPointsWon?: number | null;
  returnPointsPlayed?: number | null;
  winners?: number | null;
  unforcedErrors?: number | null;
  totalPointsWon?: number | null;
}

/**
 * Per-player stats data for bulk save (gameId is at parent level).
 * Independent interface mirroring schema — not derived from SaveTennisStatsInput.
 */
export interface SaveTennisStatsData {
  playerId: number;
  aces?: number | null;
  doubleFaults?: number | null;
  firstServesIn?: number | null;
  firstServeAttempts?: number | null;
  firstServePointsWon?: number | null;
  firstServePointsPlayed?: number | null;
  secondServePointsWon?: number | null;
  secondServePointsPlayed?: number | null;
  breakPointsConverted?: number | null;
  breakPointsFaced?: number | null;
  returnPointsWon?: number | null;
  returnPointsPlayed?: number | null;
  winners?: number | null;
  unforcedErrors?: number | null;
  totalPointsWon?: number | null;
}
```

### Task 1.5: Rename volleyball type interfaces

**Files:**
- Modify: `src/lib/types/stats/volleyball.ts`

- [ ] **Step 1: Rewrite the file**

Replace with:

```typescript
import type { StatsNode, SaveStatsInput } from "./base";

/**
 * Volleyball stats entry returned from the server.
 */
export interface VolleyballStatsNode extends StatsNode {
  kills: number | null;
  attackErrors: number | null;
  attackAttempts: number | null;
  aces: number | null;
  serviceErrors: number | null;
  blocks: number | null;
  blockErrors: number | null;
  digs: number | null;
  receptionErrors: number | null;
  assists: number | null;
  points: number | null;
}

/**
 * Input for saving volleyball stats.
 * Patch semantics:
 * - Omit a field (undefined) to leave it unchanged
 * - Set to null to clear the value
 * - Set to a number to update
 */
export interface SaveVolleyballStatsInput extends SaveStatsInput {
  kills?: number | null;
  attackErrors?: number | null;
  attackAttempts?: number | null;
  aces?: number | null;
  serviceErrors?: number | null;
  blocks?: number | null;
  blockErrors?: number | null;
  digs?: number | null;
  receptionErrors?: number | null;
  assists?: number | null;
}

/**
 * Per-player stats data for bulk save (gameId is at parent level).
 * Independent interface mirroring schema — not derived from SaveVolleyballStatsInput.
 */
export interface SaveVolleyballStatsData {
  playerId: number;
  kills?: number | null;
  attackErrors?: number | null;
  attackAttempts?: number | null;
  aces?: number | null;
  serviceErrors?: number | null;
  blocks?: number | null;
  blockErrors?: number | null;
  digs?: number | null;
  receptionErrors?: number | null;
  assists?: number | null;
}
```

### Task 1.6: Update football type extends clauses

**Files:**
- Modify: `src/lib/types/stats/football.ts`

- [ ] **Step 1: Update the import line and extends clauses**

The football types already use `*Stats` naming (no schema rename needed). Only the base type imports change.

Run a `replace_all` Edit on the file:
- `import type { BoxScoreNode, SaveBoxScoreInput } from "./base";` → `import type { StatsNode, SaveStatsInput } from "./base";`

Then individual `replace_all` Edits for each occurrence:
- `extends BoxScoreNode` → `extends StatsNode`
- `extends SaveBoxScoreInput` → `extends SaveStatsInput`

These should each replace 3 occurrences (offensive, defensive, special teams).

### Task 1.7: Update baseball type extends clauses

**Files:**
- Modify: `src/lib/types/stats/baseball.ts`

- [ ] **Step 1: Same pattern as football**

Run a `replace_all` Edit:
- `import type { BoxScoreNode, SaveBoxScoreInput } from "./base";` → `import type { StatsNode, SaveStatsInput } from "./base";`
- `extends BoxScoreNode` → `extends StatsNode` (3 occurrences: batting, pitching, fielding)
- `extends SaveBoxScoreInput` → `extends SaveStatsInput` (3 occurrences)

### Task 1.8: Rename `BoxScoreSavedEvent` in `game-event.ts`

**Files:**
- Modify: `src/lib/types/game-event.ts`

- [ ] **Step 1: Open the file**

Read `src/lib/types/game-event.ts`. Identify the import line for `BasketballBoxScoreNode`, the `BoxScoreSavedEvent` interface (lines ~73-76), the `KnownGameEvent` union member (line ~88), and the `isKnownGameEventType` discriminator (line ~111).

- [ ] **Step 2: Apply edits**

Apply these replacements:

1. Replace the import line:
```typescript
import type { BasketballBoxScoreNode } from "@/lib/types/stats/basketball";
```
with:
```typescript
import type { BasketballStatsNode } from "@/lib/types/stats/basketball";
```

2. Replace the interface definition:
```typescript
/** A basketball box score has been saved */
export interface BoxScoreSavedEvent extends GameEventBase {
  __typename: "BoxScoreSavedEvent";
  basketballBoxScores: BasketballBoxScoreNode[];
}
```
with:
```typescript
/** Basketball stats have been saved */
export interface BasketballStatsSavedEvent extends GameEventBase {
  __typename: "BasketballStatsSavedEvent";
  basketballStats: BasketballStatsNode[];
}
```

3. Replace `| BoxScoreSavedEvent;` (in the `KnownGameEvent` union) with `| BasketballStatsSavedEvent;`.

4. Replace `e.__typename === "BoxScoreSavedEvent"` (in `isKnownGameEventType`) with `e.__typename === "BasketballStatsSavedEvent"`.

Phase 1 complete. Proceed to phase 2. Do not commit or run build/test yet — the project will not compile at this point.

---

## Phase 2 — Schema alignment (queries, mutations, subscriptions, action result types)

**Goal:** Update every wire-level GraphQL identifier (field names, mutation names, type literals, union `__typeName`s) to match the new schema. Unify the action result interfaces across all sports. After this phase the project should compile and run against the new backend (tests will run at the very end of phase 6).

### Task 2.1: Rename `box-score-actions.ts` → `basketball-stats-actions.ts` and rewrite contents

**Files:**
- Delete: `src/app/[locale]/game/box-score-actions.ts`
- Create: `src/app/[locale]/game/basketball-stats-actions.ts`

- [ ] **Step 1: Create the new file**

Use Write to create `src/app/[locale]/game/basketball-stats-actions.ts` with the following contents. This is a near-rewrite — every identifier changes.

```typescript
"use server";

import { errorFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";
import type { SaveBasketballStatsData, SaveBasketballStatsInput } from "@/lib/types/stats/basketball";
import { revalidatePath } from "next/cache";

interface BasketballStatsActionResult {
  success: boolean;
  statsId?: string;
  statsIds?: string[];
  errorType?: string;
  message?: string;
}

const STAT_FIELDS = [
  "assists",
  "steals",
  "blocks",
  "turnovers",
  "personalFouls",
  "offensiveRebounds",
  "defensiveRebounds",
  "threePointersMade",
  "threePointersAttempted",
  "twoPointersMade",
  "twoPointersAttempted",
  "freeThrowsMade",
  "freeThrowsAttempted",
] as const;

/**
 * Build a mutation input record from a stats data object.
 * Only includes stat fields that are explicitly provided (not undefined),
 * preserving PATCH semantics where undefined means "leave unchanged".
 */
function buildStatFields(
  data: SaveBasketballStatsData,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of STAT_FIELDS) {
    if (data[field] !== undefined) {
      result[field] = data[field];
    }
  }
  return result;
}

const RESPONSE_FIELDS = {
  id: true,
  player: { id: true, user: { displayName: true } },
  points: true,
  assists: true,
  totalRebounds: true,
  offensiveRebounds: true,
  defensiveRebounds: true,
  steals: true,
  blocks: true,
  turnovers: true,
  personalFouls: true,
  fieldGoalsMade: true,
  fieldGoalsAttempted: true,
  fieldGoalPercentage: true,
  threePointersMade: true,
  threePointersAttempted: true,
  threePointerPercentage: true,
  twoPointersMade: true,
  twoPointersAttempted: true,
  twoPointerPercentage: true,
  freeThrowsMade: true,
  freeThrowsAttempted: true,
  freeThrowPercentage: true,
} as const;

/**
 * Save basketball stats for a single player
 */
export async function saveBasketballStats(
  input: SaveBasketballStatsInput,
): Promise<BasketballStatsActionResult> {
  try {
    const mutationInput: Record<string, unknown> = {
      playerId: input.playerId,
      gameId: input.gameId,
      ...buildStatFields(input),
    };

    const response = await authMutate({
      saveBasketballStats: {
        __args: { input: mutationInput },
        __typename: true,
        __on: [
          {
            __typeName: "SaveBasketballStatsResponse",
            basketballStats: RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.saveBasketballStats, "SaveBasketballStatsResponse");
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsId: result.data.basketballStats.id };
  } catch (error) {
    console.error("Failed to save basketball stats:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save basketball stats" };
  }
}

/**
 * Save basketball stats for multiple players
 */
export async function saveBasketballStatsBulk(
  gameId: number,
  scores: SaveBasketballStatsData[],
): Promise<BasketballStatsActionResult> {
  try {
    if (scores.length === 0) {
      return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: "No stats provided" };
    }

    const stats = scores.map((score) => ({
      playerId: score.playerId,
      ...buildStatFields(score),
    }));

    const response = await authMutate({
      saveBasketballStatsBulk: {
        __args: { input: { gameId, stats } },
        __typename: true,
        __on: [
          {
            __typeName: "SaveBasketballStatsBulkResponse",
            stats: RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.saveBasketballStatsBulk, "SaveBasketballStatsBulkResponse");
    if (!result.success) return result;

    const statsIds = result.data.stats.map(
      (entry: { id: string }) => entry.id,
    );

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsIds };
  } catch (error) {
    console.error("Failed to save basketball stats bulk:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save basketball stats" };
  }
}
```

- [ ] **Step 2: Delete the old file**

```bash
git rm src/app/[locale]/game/box-score-actions.ts
```

### Task 2.2: Rewrite `pickleball-stats-actions.ts`

**Files:**
- Modify: `src/app/[locale]/game/pickleball-stats-actions.ts`

- [ ] **Step 1: Read the existing file** to confirm structure (`STAT_FIELDS` const, `RESPONSE_FIELDS`, `savePickleballStatistics`, `savePickleballStatisticsBulk`).

- [ ] **Step 2: Apply renames via targeted Edits**

Use `replace_all` Edits in this order (the action result interface field names use `statisticsId/Ids` and must change to `statsId/Ids`):

1. Type import line:
```typescript
import type { SavePickleballStatisticsData, SavePickleballStatisticsInput } from "@/lib/types/stats/pickleball";
```
→
```typescript
import type { SavePickleballStatsData, SavePickleballStatsInput } from "@/lib/types/stats/pickleball";
```

2. `replace_all`: `statisticsId` → `statsId`
3. `replace_all`: `statisticsIds` → `statsIds`
4. `replace_all`: `SavePickleballStatisticsData` → `SavePickleballStatsData`
5. `replace_all`: `SavePickleballStatisticsInput` → `SavePickleballStatsInput`
6. `replace_all`: `SavePickleballStatisticsResponse` → `SavePickleballStatsResponse`
7. `replace_all`: `SavePickleballStatisticsBulkResponse` → `SavePickleballStatsBulkResponse`
8. `replace_all`: `savePickleballStatistics` → `savePickleballStats` (this catches both the function definition and the mutation key — they use the same name)
9. `replace_all`: `savePickleballStatsBulk` is already covered by the previous step (because `savePickleballStatisticsBulk` → `savePickleballStatsBulk`)
10. Single Edit on the `pickleballStatistics` field name in the success branch (note: the source field name is lowercase `p` — do NOT use uppercase `P`):
```typescript
            __typeName: "SavePickleballStatsResponse",
            pickleballStatistics: RESPONSE_FIELDS,
```
→
```typescript
            __typeName: "SavePickleballStatsResponse",
            pickleballStats: RESPONSE_FIELDS,
```
11. Single Edit on the success-data field access (again, lowercase `p`):
```typescript
    return { success: true, statsId: result.data.pickleballStatistics.id };
```
→
```typescript
    return { success: true, statsId: result.data.pickleballStats.id };
```
12. Single Edit on the bulk save input field:
```typescript
        __args: { input: { gameId, statistics: statisticsInput } },
```
→
```typescript
        __args: { input: { gameId, stats: statsInput } },
```
13. Single Edit on the bulk response field selection:
```typescript
            __typeName: "SavePickleballStatsBulkResponse",
            statistics: RESPONSE_FIELDS,
```
→
```typescript
            __typeName: "SavePickleballStatsBulkResponse",
            stats: RESPONSE_FIELDS,
```
14. Single Edit on the bulk-save local var rename inside `savePickleballStatsBulk`:
```typescript
    const statisticsInput = statistics.map((stat) => ({
```
→
```typescript
    const statsInput = stats.map((stat) => ({
```
15. Single Edit on the bulk-save function parameter name:
```typescript
export async function savePickleballStatsBulk(
  gameId: number,
  statistics: SavePickleballStatsData[],
): Promise<PickleballStatsActionResult> {
  try {
    if (statistics.length === 0) {
      return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: "No statistics provided" };
    }
```
→
```typescript
export async function savePickleballStatsBulk(
  gameId: number,
  stats: SavePickleballStatsData[],
): Promise<PickleballStatsActionResult> {
  try {
    if (stats.length === 0) {
      return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: "No stats provided" };
    }
```
16. Single Edit on the result data extraction:
```typescript
    const statsIds = result.data.statistics.map(
      (stat: { id: string }) => stat.id,
    );
```
→
```typescript
    const statsIds = result.data.stats.map(
      (stat: { id: string }) => stat.id,
    );
```
17. Single Edit on the error log strings:
```typescript
    console.error("Failed to save pickleball statistics:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save pickleball statistics" };
```
→
```typescript
    console.error("Failed to save pickleball stats:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save pickleball stats" };
```
And:
```typescript
    console.error("Failed to save pickleball statistics bulk:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save pickleball statistics" };
```
→
```typescript
    console.error("Failed to save pickleball stats bulk:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save pickleball stats" };
```

### Task 2.3: Rewrite `tennis-stats-actions.ts`

**Files:**
- Modify: `src/app/[locale]/game/tennis-stats-actions.ts`

- [ ] **Step 1: Apply the same pattern as Task 2.2 with `Tennis`/`tennis` substituted.** Spelled out explicitly to avoid the case ambiguity that caused bugs in the pickleball version.

1. Type import line — Edit:
```typescript
import type { SaveTennisStatisticsData, SaveTennisStatisticsInput } from "@/lib/types/stats/tennis";
```
→
```typescript
import type { SaveTennisStatsData, SaveTennisStatsInput } from "@/lib/types/stats/tennis";
```

2. `replace_all`: `statisticsId` → `statsId`
3. `replace_all`: `statisticsIds` → `statsIds`
4. `replace_all`: `SaveTennisStatisticsData` → `SaveTennisStatsData`
5. `replace_all`: `SaveTennisStatisticsInput` → `SaveTennisStatsInput`
6. `replace_all`: `SaveTennisStatisticsResponse` → `SaveTennisStatsResponse`
7. `replace_all`: `SaveTennisStatisticsBulkResponse` → `SaveTennisStatsBulkResponse`
8. `replace_all`: `saveTennisStatistics` → `saveTennisStats` (also handles the bulk variant `saveTennisStatisticsBulk` → `saveTennisStatsBulk` because the trailing `Bulk` is not a character that collides with the replacement's final `s`)
9. Single Edit on the single-save response field name (lowercase `t`):
```typescript
            __typeName: "SaveTennisStatsResponse",
            tennisStatistics: RESPONSE_FIELDS,
```
→
```typescript
            __typeName: "SaveTennisStatsResponse",
            tennisStats: RESPONSE_FIELDS,
```
10. Single Edit on the success-data field access (lowercase `t`):
```typescript
    return { success: true, statsId: result.data.tennisStatistics.id };
```
→
```typescript
    return { success: true, statsId: result.data.tennisStats.id };
```
11. Single Edit on the bulk save input field:
```typescript
        __args: { input: { gameId, statistics: statisticsInput } },
```
→
```typescript
        __args: { input: { gameId, stats: statsInput } },
```
12. Single Edit on the bulk response field selection:
```typescript
            __typeName: "SaveTennisStatsBulkResponse",
            statistics: RESPONSE_FIELDS,
```
→
```typescript
            __typeName: "SaveTennisStatsBulkResponse",
            stats: RESPONSE_FIELDS,
```
13. Single Edit on the bulk-save local var rename:
```typescript
    const statisticsInput = statistics.map((stat) => ({
```
→
```typescript
    const statsInput = stats.map((stat) => ({
```
14. Single Edit on the bulk-save function parameter name and validation message:
```typescript
export async function saveTennisStatsBulk(
  gameId: number,
  statistics: SaveTennisStatsData[],
): Promise<TennisStatsActionResult> {
  try {
    if (statistics.length === 0) {
      return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: "No statistics provided" };
    }
```
→
```typescript
export async function saveTennisStatsBulk(
  gameId: number,
  stats: SaveTennisStatsData[],
): Promise<TennisStatsActionResult> {
  try {
    if (stats.length === 0) {
      return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: "No stats provided" };
    }
```
15. Single Edit on the result data extraction:
```typescript
    const statsIds = result.data.statistics.map(
      (stat: { id: string }) => stat.id,
    );
```
→
```typescript
    const statsIds = result.data.stats.map(
      (stat: { id: string }) => stat.id,
    );
```
16. Edit the error log strings (two occurrences):
```typescript
    console.error("Failed to save tennis statistics:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save tennis statistics" };
```
→
```typescript
    console.error("Failed to save tennis stats:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save tennis stats" };
```
And:
```typescript
    console.error("Failed to save tennis statistics bulk:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save tennis statistics" };
```
→
```typescript
    console.error("Failed to save tennis stats bulk:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save tennis stats" };
```

### Task 2.4: Rewrite `volleyball-stats-actions.ts`

**Files:**
- Modify: `src/app/[locale]/game/volleyball-stats-actions.ts`

- [ ] **Step 1: Apply the same pattern as Task 2.3 with `Volleyball`/`volleyball` substituted.** Spelled out explicitly.

1. Type import line — Edit:
```typescript
import type { SaveVolleyballStatisticsData, SaveVolleyballStatisticsInput } from "@/lib/types/stats/volleyball";
```
→
```typescript
import type { SaveVolleyballStatsData, SaveVolleyballStatsInput } from "@/lib/types/stats/volleyball";
```

2. `replace_all`: `statisticsId` → `statsId`
3. `replace_all`: `statisticsIds` → `statsIds`
4. `replace_all`: `SaveVolleyballStatisticsData` → `SaveVolleyballStatsData`
5. `replace_all`: `SaveVolleyballStatisticsInput` → `SaveVolleyballStatsInput`
6. `replace_all`: `SaveVolleyballStatisticsResponse` → `SaveVolleyballStatsResponse`
7. `replace_all`: `SaveVolleyballStatisticsBulkResponse` → `SaveVolleyballStatsBulkResponse`
8. `replace_all`: `saveVolleyballStatistics` → `saveVolleyballStats`
9. Single Edit on the single-save response field name (lowercase `v`):
```typescript
            __typeName: "SaveVolleyballStatsResponse",
            volleyballStatistics: RESPONSE_FIELDS,
```
→
```typescript
            __typeName: "SaveVolleyballStatsResponse",
            volleyballStats: RESPONSE_FIELDS,
```
10. Single Edit on the success-data field access (lowercase `v`):
```typescript
    return { success: true, statsId: result.data.volleyballStatistics.id };
```
→
```typescript
    return { success: true, statsId: result.data.volleyballStats.id };
```
11. Single Edit on the bulk save input field:
```typescript
        __args: { input: { gameId, statistics: statisticsInput } },
```
→
```typescript
        __args: { input: { gameId, stats: statsInput } },
```
12. Single Edit on the bulk response field selection:
```typescript
            __typeName: "SaveVolleyballStatsBulkResponse",
            statistics: RESPONSE_FIELDS,
```
→
```typescript
            __typeName: "SaveVolleyballStatsBulkResponse",
            stats: RESPONSE_FIELDS,
```
13. Single Edit on the bulk-save local var rename:
```typescript
    const statisticsInput = statistics.map((stat) => ({
```
→
```typescript
    const statsInput = stats.map((stat) => ({
```
14. Single Edit on the bulk-save function parameter name and validation message:
```typescript
export async function saveVolleyballStatsBulk(
  gameId: number,
  statistics: SaveVolleyballStatsData[],
): Promise<VolleyballStatsActionResult> {
  try {
    if (statistics.length === 0) {
      return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: "No statistics provided" };
    }
```
→
```typescript
export async function saveVolleyballStatsBulk(
  gameId: number,
  stats: SaveVolleyballStatsData[],
): Promise<VolleyballStatsActionResult> {
  try {
    if (stats.length === 0) {
      return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: "No stats provided" };
    }
```
15. Single Edit on the result data extraction:
```typescript
    const statsIds = result.data.statistics.map(
      (stat: { id: string }) => stat.id,
    );
```
→
```typescript
    const statsIds = result.data.stats.map(
      (stat: { id: string }) => stat.id,
    );
```
16. Edit the error log strings (two occurrences):
```typescript
    console.error("Failed to save volleyball statistics:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save volleyball statistics" };
```
→
```typescript
    console.error("Failed to save volleyball stats:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save volleyball stats" };
```
And:
```typescript
    console.error("Failed to save volleyball statistics bulk:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save volleyball statistics" };
```
→
```typescript
    console.error("Failed to save volleyball stats bulk:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save volleyball stats" };
```

### Task 2.5: Update `page.tsx` queries and prop name

**Files:**
- Modify: `src/app/[locale]/game/[id]/page.tsx`

- [ ] **Step 1: Type imports**

Apply Edits:

1. Replace import:
```typescript
import type { BasketballBoxScoreNode } from "@/lib/types/stats/basketball";
```
→
```typescript
import type { BasketballStatsNode } from "@/lib/types/stats/basketball";
```

2. Replace import:
```typescript
import type { PickleballStatisticsNode } from "@/lib/types/stats/pickleball";
import type { TennisStatisticsNode } from "@/lib/types/stats/tennis";
```
→
```typescript
import type { PickleballStatsNode } from "@/lib/types/stats/pickleball";
import type { TennisStatsNode } from "@/lib/types/stats/tennis";
```

3. Replace import:
```typescript
import type { VolleyballStatisticsNode } from "@/lib/types/stats/volleyball";
```
→
```typescript
import type { VolleyballStatsNode } from "@/lib/types/stats/volleyball";
```

- [ ] **Step 2: Rename the basketball local variable**

Edit:
```typescript
  // Sport-specific stats (only fetched for authenticated users)
  let initialBoxScores: { node: BasketballBoxScoreNode }[] = [];
  let initialPickleballStats: { node: PickleballStatisticsNode }[] = [];
  let initialTennisStats: { node: TennisStatisticsNode }[] = [];
```
→
```typescript
  // Sport-specific stats (only fetched for authenticated users)
  let initialBasketballStats: { node: BasketballStatsNode }[] = [];
  let initialPickleballStats: { node: PickleballStatsNode }[] = [];
  let initialTennisStats: { node: TennisStatsNode }[] = [];
```

And:
```typescript
  let initialVolleyballStats: { node: VolleyballStatisticsNode }[] = [];
```
→
```typescript
  let initialVolleyballStats: { node: VolleyballStatsNode }[] = [];
```

- [ ] **Step 3: Update the basketball query block**

Edit:
```typescript
      const boxScoreResponse = await authQuery({
        basketballBoxScores: {
          __args: { input: { gameIds: [game.id] }, first: 50 },
```
→
```typescript
      const basketballStatsResponse = await authQuery({
        basketballStats: {
          __args: { input: { gameIds: [game.id] }, first: 50 },
```

And:
```typescript
      initialBoxScores =
        boxScoreResponse.data?.basketballBoxScores?.edges ?? [];
```
→
```typescript
      initialBasketballStats =
        basketballStatsResponse.data?.basketballStats?.edges ?? [];
```

- [ ] **Step 4: Update the pickleball query block** (source field name is lowercase `p` — use `pickleballStatistics:`, not `PickleballStatistics:`)

Edit:
```typescript
      const statsResponse = await authQuery({
        pickleballStatistics: {
```
→
```typescript
      const statsResponse = await authQuery({
        pickleballStats: {
```

And:
```typescript
      initialPickleballStats =
        statsResponse.data?.pickleballStatistics?.edges ?? [];
```
→
```typescript
      initialPickleballStats =
        statsResponse.data?.pickleballStats?.edges ?? [];
```

- [ ] **Step 5: Update the volleyball query block**

Edit:
```typescript
      const volleyballStatsResponse = await authQuery({
        volleyballStatistics: {
```
→
```typescript
      const volleyballStatsResponse = await authQuery({
        volleyballStats: {
```

And:
```typescript
      initialVolleyballStats =
        volleyballStatsResponse.data?.volleyballStatistics?.edges ?? [];
```
→
```typescript
      initialVolleyballStats =
        volleyballStatsResponse.data?.volleyballStats?.edges ?? [];
```

- [ ] **Step 6: Update the tennis query block**

Edit:
```typescript
      const tennisStatsResponse = await authQuery({
        tennisStatistics: {
```
→
```typescript
      const tennisStatsResponse = await authQuery({
        tennisStats: {
```

And:
```typescript
      initialTennisStats =
        tennisStatsResponse.data?.tennisStatistics?.edges ?? [];
```
→
```typescript
      initialTennisStats =
        tennisStatsResponse.data?.tennisStats?.edges ?? [];
```

- [ ] **Step 7: Update `<GameDetailClient>` prop name**

Edit:
```typescript
      <GameDetailClient
        game={game}
        initialBoxScores={initialBoxScores}
```
→
```typescript
      <GameDetailClient
        game={game}
        initialBasketballStats={initialBasketballStats}
```

### Task 2.6: Update `game-detail-client.tsx`

**Files:**
- Modify: `src/components/game/live/game-detail-client.tsx`

- [ ] **Step 1: Type imports**

Apply Edits:

1. ```typescript
import type { BasketballBoxScoreNode } from "@/lib/types/stats/basketball";
```
→
```typescript
import type { BasketballStatsNode } from "@/lib/types/stats/basketball";
```

2. ```typescript
import type { PickleballStatisticsNode } from "@/lib/types/stats/pickleball";
import type { TennisStatisticsNode } from "@/lib/types/stats/tennis";
```
→
```typescript
import type { PickleballStatsNode } from "@/lib/types/stats/pickleball";
import type { TennisStatsNode } from "@/lib/types/stats/tennis";
```

3. ```typescript
import type { VolleyballStatisticsNode } from "@/lib/types/stats/volleyball";
```
→
```typescript
import type { VolleyballStatsNode } from "@/lib/types/stats/volleyball";
```

- [ ] **Step 2: Update the props interface**

Edit:
```typescript
interface GameDetailClientProps {
  game: GameDetail;
  initialBoxScores: { node: BasketballBoxScoreNode }[];
  initialPickleballStats?: { node: PickleballStatisticsNode }[];
  initialFootballOffensiveStats?: { node: FootballOffensiveStatsNode }[];
  initialFootballDefensiveStats?: { node: FootballDefensiveStatsNode }[];
  initialFootballSpecialTeamsStats?: { node: FootballSpecialTeamsStatsNode }[];
  initialTennisStats?: { node: TennisStatisticsNode }[];
  initialBaseballBattingStats?: { node: BaseballBattingStatsNode }[];
  initialBaseballPitchingStats?: { node: BaseballPitchingStatsNode }[];
  initialBaseballFieldingStats?: { node: BaseballFieldingStatsNode }[];
  initialVolleyballStats?: { node: VolleyballStatisticsNode }[];
```
→
```typescript
interface GameDetailClientProps {
  game: GameDetail;
  initialBasketballStats: { node: BasketballStatsNode }[];
  initialPickleballStats?: { node: PickleballStatsNode }[];
  initialFootballOffensiveStats?: { node: FootballOffensiveStatsNode }[];
  initialFootballDefensiveStats?: { node: FootballDefensiveStatsNode }[];
  initialFootballSpecialTeamsStats?: { node: FootballSpecialTeamsStatsNode }[];
  initialTennisStats?: { node: TennisStatsNode }[];
  initialBaseballBattingStats?: { node: BaseballBattingStatsNode }[];
  initialBaseballPitchingStats?: { node: BaseballPitchingStatsNode }[];
  initialBaseballFieldingStats?: { node: BaseballFieldingStatsNode }[];
  initialVolleyballStats?: { node: VolleyballStatsNode }[];
```

- [ ] **Step 3: Update destructure**

Edit:
```typescript
export function GameDetailClient({
  game,
  initialBoxScores,
  initialPickleballStats,
```
→
```typescript
export function GameDetailClient({
  game,
  initialBasketballStats,
  initialPickleballStats,
```

- [ ] **Step 4: Update reducer wiring**

Edit:
```typescript
  const [state, dispatch] = useReducer(
    gameLiveReducer,
    null,
    () => createInitialState(game, initialBoxScores),
  );

  const prevGameRef = useRef(game);
  useEffect(() => {
    if (prevGameRef.current !== game) {
      prevGameRef.current = game;
      dispatch({ type: "SYNC_FROM_SERVER", game, boxScores: initialBoxScores });
    }
  }, [game, initialBoxScores]);
```
→
```typescript
  const [state, dispatch] = useReducer(
    gameLiveReducer,
    null,
    () => createInitialState(game, initialBasketballStats),
  );

  const prevGameRef = useRef(game);
  useEffect(() => {
    if (prevGameRef.current !== game) {
      prevGameRef.current = game;
      dispatch({ type: "SYNC_FROM_SERVER", game, basketballStats: initialBasketballStats });
    }
  }, [game, initialBasketballStats]);
```

- [ ] **Step 5: Update the `<GameBoxScores>` JSX call**

The prop NAME on the child (`GameBoxScoresProps.boxScores?`) does NOT change in phase 2 — it's renamed to `basketballStats` in phase 3 (Task 3.15) atomically with the file rename. To keep the intermediate state type-safe, pass the renamed state field through the UNCHANGED prop name:

Edit:
```typescript
        <GameBoxScores
          game={state.game}
          boxScores={state.boxScores}
          pickleballStats={initialPickleballStats}
```
→
```typescript
        <GameBoxScores
          game={state.game}
          boxScores={state.basketballStats}
          pickleballStats={initialPickleballStats}
```

**Why:** In phase 2, `GameBoxScoresProps` still has the prop named `boxScores`. Renaming it to `basketballStats` here without renaming the interface in the same phase would produce an "unknown prop" TypeScript error because of excess-property checking. The prop name rename happens in phase 3 Task 3.15 (interface + internal refs) together with Task 3.16 (JSX call-site).

(The component import name `GameBoxScores` and component file name will also be renamed in phase 3.)

### Task 2.7: Update `game-live-reducer.ts`

**Files:**
- Modify: `src/components/game/live/game-live-reducer.ts`

- [ ] **Step 1: Rewrite the file**

Replace the entire file contents with:

```typescript
import type { KnownGameEvent } from "@/lib/types/game-event";
import type { GameDetail } from "@/lib/types/game";
import type { BasketballStatsNode } from "@/lib/types/stats/basketball";

export interface LiveGameState {
  game: GameDetail;
  basketballStats: { node: BasketballStatsNode }[];
  isConnected: boolean;
}

export type LiveGameAction =
  | { type: "GAME_EVENT"; event: KnownGameEvent }
  | { type: "CONNECTION_LOST" }
  | { type: "RECONNECTED" }
  | { type: "SYNC_FROM_SERVER"; game: GameDetail; basketballStats: { node: BasketballStatsNode }[] };

export function createInitialState(
  game: GameDetail,
  basketballStats: { node: BasketballStatsNode }[]
): LiveGameState {
  return {
    game,
    basketballStats,
    isConnected: true,
  };
}

export function gameLiveReducer(
  state: LiveGameState,
  action: LiveGameAction
): LiveGameState {
  switch (action.type) {
    case "GAME_EVENT": {
      const { event } = action;

      const mergedGame: GameDetail = {
        ...state.game,
        gameStatus: event.game.gameStatus,
        viewerGameRole: event.game.viewerGameRole,
        visibility: event.game.visibility,
        participants: {
          ...state.game.participants,
          edges: event.game.participants.edges,
        },
        metadata: event.game.metadata,
      };

      if (event.__typename === "BasketballStatsSavedEvent") {
        const incomingByPlayerId = new Map(
          event.basketballStats.map((bs) => [bs.player.id, bs])
        );

        const updated = state.basketballStats.map((entry) => {
          const replacement = incomingByPlayerId.get(entry.node.player.id);
          return replacement ? { node: replacement } : entry;
        });

        const existingPlayerIds = new Set(
          state.basketballStats.map((entry) => entry.node.player.id)
        );
        const appended = event.basketballStats
          .filter((bs) => !existingPlayerIds.has(bs.player.id))
          .map((bs) => ({ node: bs }));

        return {
          ...state,
          game: mergedGame,
          basketballStats: [...updated, ...appended],
        };
      }

      return { ...state, game: mergedGame };
    }

    case "CONNECTION_LOST":
      return { ...state, isConnected: false };

    case "RECONNECTED":
      return { ...state, isConnected: true };

    case "SYNC_FROM_SERVER":
      return {
        ...state,
        game: action.game,
        basketballStats: action.basketballStats,
        isConnected: true,
      };
  }
}
```

### Task 2.8: Update `use-game-subscription.ts`

**Files:**
- Modify: `src/hooks/use-game-subscription.ts`

- [ ] **Step 1: Update the `__on` array entry**

Edit:
```typescript
              {
                __typeName: "BoxScoreSavedEvent",
                basketballBoxScores: {
                  id: true,
                  player: playerRefFragment,
                  points: true,
                  assists: true,
```
→
```typescript
              {
                __typeName: "BasketballStatsSavedEvent",
                basketballStats: {
                  id: true,
                  player: playerRefFragment,
                  points: true,
                  assists: true,
```

The rest of the selection set fields stay the same — they are properties on the basketball stats node, not the event itself.

### Task 2.9: Update `game-live-reducer.test.ts` (compile-only changes)

**Files:**
- Modify: `__tests__/components/game/live/game-live-reducer.test.ts`

The test must continue compiling after the type rename. We will rename test identifiers for cosmetic consistency in phase 3, but for now the minimum viable changes to keep the file compiling:

- [ ] **Step 1: Update type imports**

Edit:
```typescript
import type {
  BoxScoreSavedEvent,
  GameEventGame,
```
→
```typescript
import type {
  BasketballStatsSavedEvent,
  GameEventGame,
```

And:
```typescript
import type { BasketballBoxScoreNode } from "@/lib/types/stats/basketball";
```
→
```typescript
import type { BasketballStatsNode } from "@/lib/types/stats/basketball";
```

- [ ] **Step 2: Update the helper return type**

Edit:
```typescript
function makeBoxScore(playerId: number, points: number): BasketballBoxScoreNode {
```
→
```typescript
function makeBoxScore(playerId: number, points: number): BasketballStatsNode {
```

(Helper name `makeBoxScore` will be renamed to `makeStats` in phase 3 to match the rest of the rename — keep it for now.)

- [ ] **Step 3: Update the state field assertions**

Edit (in the `createInitialState` test):
```typescript
  it("creates state with the given game, boxScores, and isConnected: true", () => {
    const game = makeGameDetail();
    const boxScores = [{ node: makeBoxScore(1, 10) }];

    const state = createInitialState(game, boxScores);

    expect(state.game).toBe(game);
    expect(state.boxScores).toBe(boxScores);
    expect(state.isConnected).toBe(true);
  });
```
→
```typescript
  it("creates state with the given game, basketballStats, and isConnected: true", () => {
    const game = makeGameDetail();
    const basketballStats = [{ node: makeBoxScore(1, 10) }];

    const state = createInitialState(game, basketballStats);

    expect(state.game).toBe(game);
    expect(state.basketballStats).toBe(basketballStats);
    expect(state.isConnected).toBe(true);
  });
```

- [ ] **Step 4: Update the upsert event type and field**

Edit:
```typescript
      const event: BoxScoreSavedEvent = {
        __typename: "BoxScoreSavedEvent",
        occurredAt: "2026-03-16T11:20:00Z",
        game: makeGameEventGame(),
        basketballBoxScores: [updatedBoxScore, newBoxScore],
      };
```
→
```typescript
      const event: BasketballStatsSavedEvent = {
        __typename: "BasketballStatsSavedEvent",
        occurredAt: "2026-03-16T11:20:00Z",
        game: makeGameEventGame(),
        basketballStats: [updatedBoxScore, newBoxScore],
      };
```

- [ ] **Step 5: Update the upsert assertion**

Edit:
```typescript
      expect(nextState.boxScores).toHaveLength(2);

      const player1Entry = nextState.boxScores.find(
        (e) => e.node.player.id === 1
      )!;
      const player2Entry = nextState.boxScores.find(
        (e) => e.node.player.id === 2
      )!;
```
→
```typescript
      expect(nextState.basketballStats).toHaveLength(2);

      const player1Entry = nextState.basketballStats.find(
        (e) => e.node.player.id === 1
      )!;
      const player2Entry = nextState.basketballStats.find(
        (e) => e.node.player.id === 2
      )!;
```

- [ ] **Step 6: Update the SYNC_FROM_SERVER test**

Edit:
```typescript
    it("replaces game and boxScores fully and sets isConnected to true", () => {
      const originalGame = makeGameDetail({ description: "original" });
      const initialState: LiveGameState = {
        ...createInitialState(originalGame, [{ node: makeBoxScore(1, 5) }]),
        isConnected: false,
      };

      const newGame = makeGameDetail({ description: "synced" });
      const newBoxScores = [
        { node: makeBoxScore(1, 20) },
        { node: makeBoxScore(2, 18) },
      ];

      const nextState = gameLiveReducer(initialState, {
        type: "SYNC_FROM_SERVER",
        game: newGame,
        boxScores: newBoxScores,
      });

      expect(nextState.game).toBe(newGame);
      expect(nextState.boxScores).toBe(newBoxScores);
      expect(nextState.isConnected).toBe(true);
    });
```
→
```typescript
    it("replaces game and basketballStats fully and sets isConnected to true", () => {
      const originalGame = makeGameDetail({ description: "original" });
      const initialState: LiveGameState = {
        ...createInitialState(originalGame, [{ node: makeBoxScore(1, 5) }]),
        isConnected: false,
      };

      const newGame = makeGameDetail({ description: "synced" });
      const newBasketballStats = [
        { node: makeBoxScore(1, 20) },
        { node: makeBoxScore(2, 18) },
      ];

      const nextState = gameLiveReducer(initialState, {
        type: "SYNC_FROM_SERVER",
        game: newGame,
        basketballStats: newBasketballStats,
      });

      expect(nextState.game).toBe(newGame);
      expect(nextState.basketballStats).toBe(newBasketballStats);
      expect(nextState.isConnected).toBe(true);
    });
```

### Task 2.10: Compile-fix `box-score-actions.test.ts` import path (file rename happens in phase 3)

**Files:**
- Modify: `__tests__/[locale]/game/box-score-actions.test.ts`

- [ ] **Step 1: Update the import path and function names**

The action file is now `basketball-stats-actions.ts`. Update the import:

Edit:
```typescript
import { saveBasketballBoxScore, saveBasketballBoxScores } from "@/app/[locale]/game/box-score-actions";
```
→
```typescript
import { saveBasketballStats, saveBasketballStatsBulk } from "@/app/[locale]/game/basketball-stats-actions";
```

- [ ] **Step 2: Update the type imports**

Edit:
```typescript
import type { SaveBasketballBoxScoreInput, SaveBasketballBoxScoreData } from "@/lib/types/stats/basketball";
```
→
```typescript
import type { SaveBasketballStatsInput, SaveBasketballStatsData } from "@/lib/types/stats/basketball";
```

- [ ] **Step 3: Update mock helpers and assertions to match the new field/type/key names**

The test currently uses `basketballBoxScore`, `basketballBoxScores`, `boxScoreId`, `boxScoreIds`, `SaveBasketballBoxScoreResponse`, `SaveBasketballBoxScoresResponse`, `saveBasketballBoxScore`, `saveBasketballBoxScores`, `BoxScoreNotFoundError`, `SaveBasketballBoxScoreInput`, `SaveBasketballBoxScoreData`. Apply `replace_all` Edits in this order:

1. `replace_all`: `SaveBasketballBoxScoreData` → `SaveBasketballStatsData`
2. `replace_all`: `SaveBasketballBoxScoreInput` → `SaveBasketballStatsInput`
3. `replace_all`: `SaveBasketballBoxScoreResponse` → `SaveBasketballStatsResponse`
4. `replace_all`: `SaveBasketballBoxScoresResponse` → `SaveBasketballStatsBulkResponse`
5. Use two targeted edits in this order (not the other way around — order matters):
   - `replace_all`: `saveBasketballBoxScores` → `saveBasketballStatsBulk`
   - `replace_all`: `saveBasketballBoxScore` → `saveBasketballStats`

   **Order-matters rule (applies to steps 5 AND 8/9 below):** When the plural form is a prefix of the singular with only a trailing `s`, and the replacement for the plural ends in a character that DOES match the singular's replacement, you MUST do the plural replacement FIRST. Otherwise the singular replace_all will rewrite part of the plural into a corrupted form. In step 5, the plural replacement is `saveBasketballStatsBulk` (ending in `k`), so plural-first is safe. In steps 8/9 the replacement also involves `Stats` ending in `s`, so we must do plural first there too.

6. `replace_all`: `boxScoreId` → `statsId`
7. `replace_all`: `boxScoreIds` → `statsIds`
8. `replace_all`: `basketballBoxScores` → `stats` (PLURAL FIRST — in `makeBoxScoresFields` helper and in the bulk-input assertion on line 278. The bulk schema's success-response field is now named `stats`, not `basketballStats`. Verify this matches the schema by re-reading `schema.graphqls` `SaveBasketballStatsBulkResponse` — its field is `stats: [BasketballStats!]!`.)
9. `replace_all`: `basketballBoxScore` → `basketballStats` (SINGULAR SECOND — in `makeBoxScoreFields` helper return value. At this point `basketballBoxScores` no longer exists in the file because step 8 replaced it wholesale into `stats`, so this step only touches the singular form without corruption.)
10. Targeted Edit on the union-error sentinel:
```typescript
    mockMutateUnionError("saveBasketballStats", "BoxScoreNotFoundError", "Box score not found");
```
→
```typescript
    mockMutateUnionError("saveBasketballStats", "BasketballStatsNotFoundError", "Stats not found");
```
And:
```typescript
    expect(result).toEqual({
      success: false,
      errorType: "BoxScoreNotFoundError",
      message: "Box score not found",
    });
```
→
```typescript
    expect(result).toEqual({
      success: false,
      errorType: "BasketballStatsNotFoundError",
      message: "Stats not found",
    });
```
11. Targeted Edit on the validation-error message assertion:
```typescript
    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.VALIDATION_ERROR,
      message: "No box scores provided",
    });
```
→
```typescript
    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.VALIDATION_ERROR,
      message: "No stats provided",
    });
```
12. Targeted Edit on the unexpected-error message assertions (two occurrences):
```typescript
      message: "Failed to save basketball box score",
```
→
```typescript
      message: "Failed to save basketball stats",
```
And:
```typescript
      message: "Failed to save basketball box scores",
```
→
```typescript
      message: "Failed to save basketball stats",
```
(Yes, both single and bulk error messages now use the same string — that matches the new action file in Task 2.1.)

13. Verify the bulk-test mutation input access. After step 8, the line that previously read `mutationInput.basketballBoxScores` should now read `mutationInput.stats`. If a remaining `basketballBoxScores` reference exists anywhere in the file, fix it manually — the order-matters reasoning in step 5/8 is designed to prevent this, but verify anyway.

### Task 2.11: Update consumer files for the action import path

**Files:**
- Modify: `src/components/game/basketball-box-score-form.tsx`
- Modify: `src/components/game/basketball-box-score-table.tsx`

These two files still import from `@/app/[locale]/game/box-score-actions` and use the old function name `saveBasketballBoxScore`. The component renames happen in phase 3, but the imports must be fixed now or the TypeScript state is inconsistent.

- [ ] **Step 1: Fix the form's import**

In `src/components/game/basketball-box-score-form.tsx`, edit:
```typescript
import { saveBasketballBoxScore } from "@/app/[locale]/game/box-score-actions";
```
→
```typescript
import { saveBasketballStats } from "@/app/[locale]/game/basketball-stats-actions";
```

Then `replace_all`: `saveBasketballBoxScore(input)` → `saveBasketballStats(input)`. There is exactly one call site.

Then update type imports:
```typescript
import type {
  BasketballBoxScoreNode,
  SaveBasketballBoxScoreInput,
} from "@/lib/types/stats/basketball";
```
→
```typescript
import type {
  BasketballStatsNode,
  SaveBasketballStatsInput,
} from "@/lib/types/stats/basketball";
```

Then `replace_all`: `BasketballBoxScoreNode` → `BasketballStatsNode` and `SaveBasketballBoxScoreInput` → `SaveBasketballStatsInput`.

- [ ] **Step 2: Fix the table's import**

In `src/components/game/basketball-box-score-table.tsx`, edit:
```typescript
import { saveBasketballBoxScore } from "@/app/[locale]/game/box-score-actions";
```
→
```typescript
import { saveBasketballStats } from "@/app/[locale]/game/basketball-stats-actions";
```

`replace_all`: `saveBasketballBoxScore(` → `saveBasketballStats(`.

`replace_all`: `BasketballBoxScoreNode` → `BasketballStatsNode`.

- [ ] **Step 3: Fix the pickleball form action import**

In `src/components/game/pickleball-stats-form.tsx`:
- `replace_all`: `savePickleballStatistics` → `savePickleballStats`
- `replace_all`: `PickleballStatisticsNode` → `PickleballStatsNode`
- `replace_all`: `SavePickleballStatisticsInput` → `SavePickleballStatsInput`

- [ ] **Step 4: Fix the pickleball table action import**

In `src/components/game/pickleball-stats-table.tsx`:
- `replace_all`: `savePickleballStatistics` → `savePickleballStats`
- `replace_all`: `PickleballStatisticsNode` → `PickleballStatsNode`

- [ ] **Step 5: Fix the tennis form**

In `src/components/game/tennis-stats-form.tsx`:
- `replace_all`: `saveTennisStatistics` → `saveTennisStats`
- `replace_all`: `TennisStatisticsNode` → `TennisStatsNode`
- `replace_all`: `SaveTennisStatisticsInput` → `SaveTennisStatsInput`

- [ ] **Step 6: Fix the tennis table**

In `src/components/game/tennis-stats-table.tsx`:
- `replace_all`: `saveTennisStatistics` → `saveTennisStats`
- `replace_all`: `TennisStatisticsNode` → `TennisStatsNode`

- [ ] **Step 7: Fix the volleyball form**

In `src/components/game/volleyball-stats-form.tsx`:
- `replace_all`: `saveVolleyballStatistics` → `saveVolleyballStats`
- `replace_all`: `VolleyballStatisticsNode` → `VolleyballStatsNode`
- `replace_all`: `SaveVolleyballStatisticsInput` → `SaveVolleyballStatsInput`

- [ ] **Step 8: Fix the volleyball table**

In `src/components/game/volleyball-stats-table.tsx`:
- `replace_all`: `saveVolleyballStatistics` → `saveVolleyballStats`
- `replace_all`: `VolleyballStatisticsNode` → `VolleyballStatsNode`

- [ ] **Step 9: Fix `game-box-scores.tsx` type imports**

In `src/components/game/game-box-scores.tsx`:
- `replace_all`: `BasketballBoxScoreNode` → `BasketballStatsNode`
- `replace_all`: `PickleballStatisticsNode` → `PickleballStatsNode`
- `replace_all`: `TennisStatisticsNode` → `TennisStatsNode`
- `replace_all`: `VolleyballStatisticsNode` → `VolleyballStatsNode`
- Then update import lines:
  ```typescript
  import type { BoxScoreNode } from "@/lib/types/stats/base";
  ```
  →
  ```typescript
  import type { StatsNode } from "@/lib/types/stats/base";
  ```
- `replace_all`: `BoxScoreNode` → `StatsNode` (catches the generic constraints `T extends BoxScoreNode`)

(Other refactoring of this file — the prop name `boxScores` → `basketballStats` and `boxScores` → `stats` on internal types — happens in phase 3.)

### Task 2.12: Update `tests/fixtures/mock-data/games.ts` and `graphql-handlers.ts` for schema field names

**Files:**
- Modify: `tests/fixtures/mock-data/games.ts`
- Modify: `tests/fixtures/graphql-handlers.ts`

The MSW handlers use field-name routing — they must match the new schema. The full helper rename happens in phase 5, but we need the field names aligned now to keep tests green at the end.

- [ ] **Step 1: Update `mock-data/games.ts`**

Edit:
```typescript
export function mockBasketballBoxScoresResponse() {
  return { data: { basketballBoxScores: [] } };
}
```
→
```typescript
export function mockBasketballBoxScoresResponse() {
  return { data: { basketballStats: [] } };
}
```

(The function name itself is renamed in phase 5.)

- [ ] **Step 2: Update `graphql-handlers.ts`**

The `EMPTY_STAT_FIELDS` array entries must match the new query field names so the handler routes correctly.

Edit (source strings are lowercase `p`):
```typescript
const EMPTY_STAT_FIELDS = [
  "pickleballStatistics",
  "tennisStatistics",
  "footballOffensiveStats",
  "footballDefensiveStats",
  "footballSpecialTeamsStats",
  "baseballBattingStats",
  "baseballPitchingStats",
  "baseballFieldingStats",
] as const;
```
→
```typescript
const EMPTY_STAT_FIELDS = [
  "pickleballStats",
  "tennisStats",
  "volleyballStats",
  "footballOffensiveStats",
  "footballDefensiveStats",
  "footballSpecialTeamsStats",
  "baseballBattingStats",
  "baseballPitchingStats",
  "baseballFieldingStats",
] as const;
```

Edit the `defaultResponses` map:
```typescript
  basketballBoxScores: mockBasketballBoxScoresResponse(),
```
→
```typescript
  basketballStats: mockBasketballBoxScoresResponse(),
```

(The mock helper function name is still `mockBasketballBoxScoresResponse` but its return shape now has `basketballStats: []`. The function rename happens in phase 5.)

Phase 2 complete. Proceed to phase 3. Do not run build/tests yet — the prop rename on `GameBoxScoresProps` still needs to land in phase 3 before the build is green.

---

## Phase 3 — Component identifier consistency rename

**Goal:** Rename component files, exported component names, internal `boxScoreT`/`editingScore`/`TeamBoxScoreGroup` identifiers, and inner table prop `boxScores` → `stats`. Update i18n key strings *referenced from code* (the keys are renamed in `messages/en.json` in phase 4).

### Task 3.1: Rename `collapsible-box-score.tsx`

**Files:**
- Delete: `src/components/game/collapsible-box-score.tsx`
- Create: `src/components/game/collapsible-stats.tsx`

- [ ] **Step 1: Create the new file**

Use Write to create `src/components/game/collapsible-stats.tsx`:

```typescript
"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

interface CollapsibleStatsProps {
  teamName: string;
  playerCount: number;
  defaultOpen: boolean;
  children: ReactNode;
}

export function CollapsibleStats({
  teamName,
  playerCount,
  defaultOpen,
  children,
}: CollapsibleStatsProps) {
  const t = useTranslations("game.stats");

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger
        className={cn(
          "group flex w-full items-center justify-between rounded-lg px-4 py-3",
          "bg-card shadow-card hover:bg-muted/50 transition-colors",
          "min-h-11 cursor-pointer",
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold tracking-tight font-heading">
            {teamName}
          </span>
          <span className="text-sm text-muted-foreground">
            {t("playerCount", { count: playerCount })}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-muted-foreground",
            "transition-transform duration-200 motion-reduce:duration-0",
            "group-data-[panel-open]:rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}
```

- [ ] **Step 2: Delete the old file**

```bash
git rm src/components/game/collapsible-box-score.tsx
```

### Task 3.2: Rename `game-box-scores-skeleton.tsx`

**Files:**
- Delete: `src/components/game/game-box-scores-skeleton.tsx`
- Create: `src/components/game/game-stats-skeleton.tsx`

- [ ] **Step 1: Create the new file**

Use Write to create `src/components/game/game-stats-skeleton.tsx`:

```typescript
import { Skeleton } from "@/components/ui/skeleton";

export function GameStatsSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg bg-card px-4 py-3 shadow-card"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="size-5 rounded" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Delete the old file**

```bash
git rm src/components/game/game-box-scores-skeleton.tsx
```

### Task 3.3: Rename `basketball-box-score-form.tsx`

**Files:**
- Delete: `src/components/game/basketball-box-score-form.tsx`
- Create: `src/components/game/basketball-stats-form.tsx`

- [ ] **Step 1: Read the current file** (already updated in Task 2.11 for schema-aligned imports/types)

Read `src/components/game/basketball-box-score-form.tsx`. Note the props interface name `BasketballBoxScoreFormProps` and exported function `BasketballBoxScoreForm` — these still need renaming. Note all `useTranslations` calls that reference `game.boxScore.*` and `game.success.boxScoresSaved`/`game.errors.boxScoreError`.

- [ ] **Step 2: Create the new file**

Use Write to create `src/components/game/basketball-stats-form.tsx` with the same contents as the current `basketball-box-score-form.tsx` but with these substitutions applied throughout:

| Old | New |
|---|---|
| `BasketballBoxScoreFormProps` | `BasketballStatsFormProps` |
| `BasketballBoxScoreForm` | `BasketballStatsForm` |
| `t("game.boxScore.editBoxScores")` | `t("game.stats.editStats")` |
| `t("game.boxScore.basketball.assists")` | `t("game.stats.basketball.assists")` |
| `t("game.boxScore.basketball.steals")` | `t("game.stats.basketball.steals")` |
| `t("game.boxScore.basketball.blocks")` | `t("game.stats.basketball.blocks")` |
| `t("game.boxScore.basketball.turnovers")` | `t("game.stats.basketball.turnovers")` |
| `t("game.boxScore.basketball.personalFouls")` | `t("game.stats.basketball.personalFouls")` |
| `t("game.boxScore.basketball.offensiveRebounds")` | `t("game.stats.basketball.offensiveRebounds")` |
| `t("game.boxScore.basketball.defensiveRebounds")` | `t("game.stats.basketball.defensiveRebounds")` |
| `t("game.boxScore.basketball.threePointers")` | `t("game.stats.basketball.threePointers")` |
| `t("game.boxScore.basketball.twoPointers")` | `t("game.stats.basketball.twoPointers")` |
| `t("game.boxScore.basketball.freeThrows")` | `t("game.stats.basketball.freeThrows")` |
| `t("game.success.boxScoresSaved")` | `t("game.success.statsSaved")` |
| `t("game.errors.boxScoreError")` | `t("game.errors.statsError")` |

- [ ] **Step 3: Delete the old file**

```bash
git rm src/components/game/basketball-box-score-form.tsx
```

### Task 3.4: Rename `basketball-box-score-table.tsx`

**Files:**
- Delete: `src/components/game/basketball-box-score-table.tsx`
- Create: `src/components/game/basketball-stats-table.tsx`

- [ ] **Step 1: Read the current file**

Note: It already imports the renamed action from Task 2.11 step 2. The pending renames are component name, internal vars, prop name, i18n keys, and the import of the renamed form.

- [ ] **Step 2: Create the new file**

Use Write to create `src/components/game/basketball-stats-table.tsx` with the contents copied from the current file, applying these substitutions:

| Old | New |
|---|---|
| `import { BasketballBoxScoreForm } from "./basketball-box-score-form";` | `import { BasketballStatsForm } from "./basketball-stats-form";` |
| `BasketballBoxScoreTableProps` | `BasketballStatsTableProps` |
| `BasketballBoxScoreTable` (function name) | `BasketballStatsTable` |
| `boxScores: { node: BasketballStatsNode }[];` (prop type) | `stats: { node: BasketballStatsNode }[];` |
| `boxScores,` (destructure) | `stats,` |
| `useTranslations("game.boxScore.basketball")` | `useTranslations("game.stats.basketball")` |
| `useTranslations("game.boxScore")` (the `boxScoreT` line) | `useTranslations("game.stats")` |
| `boxScoreT` (variable name) | `statsT` |
| `editingScore` (state name) | `editingStats` |
| `setEditingScore` | `setEditingStats` |
| `boxScores.map(` (in the existing player IDs memo) | `stats.map(` |
| `[boxScores]` (deps array) | `[stats]` |
| `boxScores.map((edge) => edge.node)` (data memo) | `stats.map((edge) => edge.node)` |
| `[boxScores]` (data memo deps) | `[stats]` |
| `boxScoreT("playerStatsAdded")` | `statsT("playerStatsAdded")` |
| `boxScoreT("playerStatsError")` | `statsT("playerStatsError")` |
| `boxScoreT("selectPlayer")` | `statsT("selectPlayer")` |
| `boxScoreT("addPlayerStats")` | `statsT("addPlayerStats")` |
| `boxScoreT("noBoxScores")` | `statsT("noStats")` |
| `<BasketballBoxScoreForm` (JSX) | `<BasketballStatsForm` |

(The reducer hook deps `[t, format, canEdit, maxStats, data.length]` does not need updating because `boxScoreT` was not in the deps — verify before saving.)

- [ ] **Step 3: Delete the old file**

```bash
git rm src/components/game/basketball-box-score-table.tsx
```

### Task 3.5: Update `pickleball-stats-form.tsx` for component-internal renames

**Files:**
- Modify: `src/components/game/pickleball-stats-form.tsx`

- [ ] **Step 1: Apply edits**

Run targeted edits for the i18n keys:

1. Edit:
```typescript
            label={t(`game.boxScore.pickleball.${field}`)}
```
→
```typescript
            label={t(`game.stats.pickleball.${field}`)}
```

2. Edit:
```typescript
            {t("game.boxScore.editBoxScores")} - {playerName}
```
→
```typescript
            {t("game.stats.editStats")} - {playerName}
```

3. Edit:
```typescript
          toast.success(t("game.success.boxScoresSaved"));
```
→
```typescript
          toast.success(t("game.success.statsSaved"));
```

4. Edit:
```typescript
          setError(result.message || t("game.errors.boxScoreError"));
          toast.error(result.message || t("game.errors.boxScoreError"));
```
→
```typescript
          setError(result.message || t("game.errors.statsError"));
          toast.error(result.message || t("game.errors.statsError"));
```

### Task 3.6: Update `pickleball-stats-table.tsx`

**Files:**
- Modify: `src/components/game/pickleball-stats-table.tsx`

- [ ] **Step 1: Apply edits**

1. Prop rename — Edit:
```typescript
interface PickleballStatsTableProps {
  gameId: number;
  teamName: string;
  boxScores: { node: PickleballStatsNode }[];
  gameStatus: GameStatus;
```
→
```typescript
interface PickleballStatsTableProps {
  gameId: number;
  teamName: string;
  stats: { node: PickleballStatsNode }[];
  gameStatus: GameStatus;
```

2. Destructure rename — Edit:
```typescript
export function PickleballStatsTable({
  gameId,
  teamName,
  boxScores,
  gameStatus,
```
→
```typescript
export function PickleballStatsTable({
  gameId,
  teamName,
  stats,
  gameStatus,
```

3. `replace_all`: `boxScores.map` → `stats.map`
4. `replace_all`: `[boxScores]` → `[stats]`
5. `replace_all`: `useTranslations("game.boxScore.pickleball")` → `useTranslations("game.stats.pickleball")`
6. `replace_all`: `useTranslations("game.boxScore")` → `useTranslations("game.stats")`
7. `replace_all`: `boxScoreT(` → `statsT(`
8. `replace_all`: `boxScoreT,` → `statsT,` (in the useMemo deps array)
9. `replace_all`: `const boxScoreT` → `const statsT`
10. Replace `statsT("noBoxScores")` → `statsT("noStats")` (after step 7 transformed `boxScoreT("noBoxScores")` → `statsT("noBoxScores")`)
11. (Variable `editingStat` already uses correct naming — no change.)

### Task 3.7: Update `tennis-stats-form.tsx`

**Files:**
- Modify: `src/components/game/tennis-stats-form.tsx`

- [ ] **Step 1: Apply edits**

1. `replace_all`: `useTranslations("game.boxScore.tennis")` → `useTranslations("game.stats.tennis")`
2. Edit:
```typescript
            {t("game.boxScore.editBoxScores")} - {playerName}
```
→
```typescript
            {t("game.stats.editStats")} - {playerName}
```
3. Edit:
```typescript
          toast.success(t("game.success.boxScoresSaved"));
```
→
```typescript
          toast.success(t("game.success.statsSaved"));
```
4. Edit:
```typescript
          setError(result.message || t("game.errors.boxScoreError"));
          toast.error(result.message || t("game.errors.boxScoreError"));
```
→
```typescript
          setError(result.message || t("game.errors.statsError"));
          toast.error(result.message || t("game.errors.statsError"));
```

### Task 3.8: Update `tennis-stats-table.tsx`

**Files:**
- Modify: `src/components/game/tennis-stats-table.tsx`

- [ ] **Step 1: Apply edits**

1. Prop rename — Edit:
```typescript
interface TennisStatsTableProps {
  gameId: number;
  teamName: string;
  boxScores: { node: TennisStatsNode }[];
  gameStatus: GameStatus;
```
→
```typescript
interface TennisStatsTableProps {
  gameId: number;
  teamName: string;
  stats: { node: TennisStatsNode }[];
  gameStatus: GameStatus;
```

2. Destructure — Edit:
```typescript
export function TennisStatsTable({
  gameId,
  teamName,
  boxScores,
  gameStatus,
```
→
```typescript
export function TennisStatsTable({
  gameId,
  teamName,
  stats,
  gameStatus,
```

3. `replace_all`: `boxScores.map` → `stats.map`
4. `replace_all`: `[boxScores]` → `[stats]`
5. `replace_all`: `useTranslations("game.boxScore.tennis.columns")` → `useTranslations("game.stats.tennis.columns")`
6. `replace_all`: `useTranslations("game.boxScore.tennis")` → `useTranslations("game.stats.tennis")`
7. `replace_all`: `useTranslations("game.boxScore")` → `useTranslations("game.stats")`
8. `replace_all`: `const boxScoreT` → `const statsT`
9. `replace_all`: `boxScoreT(` → `statsT(`
10. `replace_all`: `boxScoreT,` → `statsT,` (in `useMemo` deps)
11. After step 9, `statsT("noBoxScores")` exists — Edit it to `statsT("noStats")`.

### Task 3.9: Update `volleyball-stats-form.tsx`

**Files:**
- Modify: `src/components/game/volleyball-stats-form.tsx`

- [ ] **Step 1: Apply edits**

1. Edit:
```typescript
            label={t(`game.boxScore.volleyball.${field}`)}
```
→
```typescript
            label={t(`game.stats.volleyball.${field}`)}
```

2. Edit:
```typescript
            {t("game.boxScore.editBoxScores")} - {playerName}
```
→
```typescript
            {t("game.stats.editStats")} - {playerName}
```

3. Edit:
```typescript
          toast.success(t("game.success.boxScoresSaved"));
```
→
```typescript
          toast.success(t("game.success.statsSaved"));
```

4. Edit:
```typescript
          setError(result.message || t("game.errors.boxScoreError"));
          toast.error(result.message || t("game.errors.boxScoreError"));
```
→
```typescript
          setError(result.message || t("game.errors.statsError"));
          toast.error(result.message || t("game.errors.statsError"));
```

### Task 3.10: Update `volleyball-stats-table.tsx`

**Files:**
- Modify: `src/components/game/volleyball-stats-table.tsx`

- [ ] **Step 1: Apply edits**

1. Prop rename — Edit:
```typescript
interface VolleyballStatsTableProps {
  gameId: number;
  teamName: string;
  boxScores: { node: VolleyballStatsNode }[];
  gameStatus: GameStatus;
```
→
```typescript
interface VolleyballStatsTableProps {
  gameId: number;
  teamName: string;
  stats: { node: VolleyballStatsNode }[];
  gameStatus: GameStatus;
```

2. Destructure — Edit:
```typescript
export function VolleyballStatsTable({
  gameId,
  teamName,
  boxScores,
  gameStatus,
```
→
```typescript
export function VolleyballStatsTable({
  gameId,
  teamName,
  stats,
  gameStatus,
```

3. `replace_all`: `boxScores.map` → `stats.map`
4. `replace_all`: `[boxScores]` → `[stats]`
5. `replace_all`: `useTranslations("game.boxScore.volleyball")` → `useTranslations("game.stats.volleyball")`
6. `replace_all`: `useTranslations("game.boxScore")` → `useTranslations("game.stats")`
7. `replace_all`: `const boxScoreT` → `const statsT`
8. `replace_all`: `boxScoreT(` → `statsT(`
9. `replace_all`: `boxScoreT,` → `statsT,`
10. `statsT("noBoxScores")` → `statsT("noStats")` after step 8.

### Task 3.11: Update `football-offensive-stats-form.tsx`

**Files:**
- Modify: `src/components/game/football-offensive-stats-form.tsx`

- [ ] **Step 1: Apply edits**

(The football files already use `*Stats` types — only i18n key strings and the `boxScoreT` var name need updating. The schema for football was unchanged, so no GraphQL field renames are needed.)

Run targeted edits:

1. `replace_all`: `useTranslations("game.boxScore.football.offensive")` → `useTranslations("game.stats.football.offensive")`
2. `replace_all`: `useTranslations("game.boxScore.football")` → `useTranslations("game.stats.football")`
3. `replace_all`: `useTranslations("game.boxScore")` → `useTranslations("game.stats")`
4. `replace_all`: `const boxScoreT` → `const statsT` (if present)
5. `replace_all`: `boxScoreT(` → `statsT(`
6. Specific edits for `t("game.boxScore.football.offensive.*")` substring patterns: `replace_all` `t("game.boxScore.` → `t("game.stats.`
7. `replace_all`: `t("game.success.boxScoresSaved")` → `t("game.success.statsSaved")`
8. `replace_all`: `t("game.errors.boxScoreError")` → `t("game.errors.statsError")`

### Task 3.12: Update `football-offensive-stats-table.tsx`

**Files:**
- Modify: `src/components/game/football-offensive-stats-table.tsx`

- [ ] **Step 1: Apply edits**

1. Prop rename — find the props interface and Edit:
```typescript
  boxScores: { node: FootballOffensiveStatsNode }[];
```
→
```typescript
  stats: { node: FootballOffensiveStatsNode }[];
```

2. Destructure — Edit:
```typescript
  boxScores,
  gameStatus,
```
→
```typescript
  stats,
  gameStatus,
```

3. `replace_all`: `boxScores.map` → `stats.map`
4. `replace_all`: `[boxScores]` → `[stats]`
5. `replace_all`: `useTranslations("game.boxScore.football.offensive")` → `useTranslations("game.stats.football.offensive")`
6. `replace_all`: `useTranslations("game.boxScore")` → `useTranslations("game.stats")`
7. `replace_all`: `const boxScoreT` → `const statsT`
8. `replace_all`: `boxScoreT(` → `statsT(`
9. `replace_all`: `boxScoreT,` → `statsT,` (deps array)
10. `statsT("noBoxScores")` → `statsT("noStats")`

### Task 3.13: Update remaining football table & form files

**Files:**
- Modify: `src/components/game/football-defensive-stats-form.tsx`
- Modify: `src/components/game/football-defensive-stats-table.tsx`
- Modify: `src/components/game/football-special-teams-stats-form.tsx`
- Modify: `src/components/game/football-special-teams-stats-table.tsx`

- [ ] **Step 1: Apply the same edit patterns from Tasks 3.11 and 3.12** to each of these four files. The form files only need i18n key updates and `boxScoreT` → `statsT`. The table files need the prop rename (`boxScores` → `stats`) plus i18n updates.

For each form file:
- `replace_all` for any nested namespaces (e.g., `useTranslations("game.boxScore.football.defensive")` → `useTranslations("game.stats.football.defensive")`)
- `replace_all`: `t("game.boxScore.` → `t("game.stats.`
- `replace_all`: `t("game.success.boxScoresSaved")` → `t("game.success.statsSaved")`
- `replace_all`: `t("game.errors.boxScoreError")` → `t("game.errors.statsError")`

For each table file:
- Apply the prop/destructure/`boxScores.map`/`[boxScores]` rename
- Apply the `useTranslations` namespace updates
- Apply `const boxScoreT` → `const statsT`
- Apply `boxScoreT(` → `statsT(`
- `replace_all`: `boxScoreT,` → `statsT,`
- `statsT("noBoxScores")` → `statsT("noStats")`

### Task 3.14: Update baseball form & table files

**Files:**
- Modify: `src/components/game/baseball-batting-stats-form.tsx`
- Modify: `src/components/game/baseball-batting-stats-table.tsx`
- Modify: `src/components/game/baseball-pitching-stats-form.tsx`
- Modify: `src/components/game/baseball-pitching-stats-table.tsx`
- Modify: `src/components/game/baseball-fielding-stats-form.tsx`
- Modify: `src/components/game/baseball-fielding-stats-table.tsx`

- [ ] **Step 1: Apply the same patterns from Tasks 3.11, 3.12, 3.13 to each baseball file.**

Each form file has many `t("game.boxScore.baseball.{category}.{field}")` references. Use `replace_all` on `t("game.boxScore.` → `t("game.stats.` to handle all of them in one shot per file.

Each table file has the same structure as the football tables — apply the prop rename and i18n updates.

Note: baseball table files use `editingScore` for the state variable. Apply `replace_all`: `editingScore` → `editingStats` and `setEditingScore` → `setEditingStats`. And `boxScores.map` → `stats.map`, etc.

### Task 3.15: Rename `game-box-scores.tsx` → `game-stats.tsx`

**Files:**
- Delete: `src/components/game/game-box-scores.tsx`
- Create: `src/components/game/game-stats.tsx`

- [ ] **Step 1: Read the current file** (already updated for type imports in Task 2.11 step 9)

Note the structure: `GameBoxScoresProps` interface, `TeamBoxScoreGroup<T>` internal type, `groupByTeam<T>` helper, `GameBoxScores` exported function, `getStatsForSport()` helper, the `t("game.boxScore.title")` fallback name, and the per-sport `t("game.boxScore.{sport}.sections.*")` headers.

- [ ] **Step 2: Create the new file**

Use Write to create `src/components/game/game-stats.tsx`. The contents are the same file with these substitutions applied throughout:

| Old | New |
|---|---|
| `import { BasketballBoxScoreTable } from "@/components/game/basketball-box-score-table";` | `import { BasketballStatsTable } from "@/components/game/basketball-stats-table";` |
| `import { CollapsibleBoxScore } from "@/components/game/collapsible-box-score";` | `import { CollapsibleStats } from "@/components/game/collapsible-stats";` |
| `interface GameBoxScoresProps {` | `interface GameStatsProps {` |
| `boxScores?: { node: BasketballStatsNode }[];` (the basketball-specific outer prop) | `basketballStats?: { node: BasketballStatsNode }[];` |
| `interface TeamBoxScoreGroup<T extends StatsNode>` | `interface TeamStatsGroup<T extends StatsNode>` |
| `boxScores: { node: T }[];` (in the group interface) | `stats: { node: T }[];` |
| `allBoxScores: { node: T }[]` (param in `groupByTeam`) | `allStats: { node: T }[]` |
| `): TeamBoxScoreGroup<T>[]` (return type of `groupByTeam`) | `): TeamStatsGroup<T>[]` |
| `boxScores: allBoxScores,` (in fallback group) | `stats: allStats,` |
| `boxScores: allBoxScores.filter((edge) =>` | `stats: allStats.filter((edge) =>` |
| `export function GameBoxScores({` | `export function GameStats({` |
| `boxScores,` (destructure in `GameBoxScores`) | `basketballStats,` |
| `t("game.boxScore.title")` | `t("game.stats.title")` |
| `t("game.boxScore.football.sections.offensive")` | `t("game.stats.football.sections.offensive")` |
| `t("game.boxScore.football.sections.defensive")` | `t("game.stats.football.sections.defensive")` |
| `t("game.boxScore.football.sections.specialTeams")` | `t("game.stats.football.sections.specialTeams")` |
| `t("game.boxScore.baseball.sections.batting")` | `t("game.stats.baseball.sections.batting")` |
| `t("game.boxScore.baseball.sections.pitching")` | `t("game.stats.baseball.sections.pitching")` |
| `t("game.boxScore.baseball.sections.fielding")` | `t("game.stats.baseball.sections.fielding")` |
| `<CollapsibleBoxScore` | `<CollapsibleStats` |
| `</CollapsibleBoxScore>` | `</CollapsibleStats>` |
| `<BasketballBoxScoreTable` | `<BasketballStatsTable` |
| `function renderTable(group: TeamBoxScoreGroup<StatsNode>)` | `function renderTable(group: TeamStatsGroup<StatsNode>)` |
| `function getStatsForSport(): { node: StatsNode }[] {` | (unchanged signature) |

**Additional substitutions (apply as `replace_all`s across the whole file):**
- `replace_all`: `group.boxScores` → `group.stats` (catches every `playerCount={group.boxScores.length || group.players.length}`, `boxScores={group.boxScores}` prop pass, `boxScores={group.boxScores as { node: PickleballStatsNode }[]}` type-cast variant, etc.)
- `replace_all`: `boxScores={` → `stats={` (renames the prop name on every `<XxxStatsTable>` call site, regardless of whether the value is cast or plain)

After the two replace_alls above, the basketball-specific outer-prop branch `return boxScores ?? [];` in `getStatsForSport()` will STILL read `return boxScores ?? [];` (because `boxScores` at the end of a line, without `={` or `.` following, is not matched by either pattern). Apply this targeted Edit:

```typescript
    return boxScores ?? [];
```
→
```typescript
    return basketballStats ?? [];
```

And the top-level `GameBoxScoresProps` interface line:
```typescript
interface GameBoxScoresProps {
```
→
```typescript
interface GameStatsProps {
```

And the basketball-specific optional prop on the props interface:
```typescript
  boxScores?: { node: BasketballStatsNode }[];
```
→
```typescript
  basketballStats?: { node: BasketballStatsNode }[];
```
(Note: the `?` marking it optional is preserved.)

The other sport-specific props (`pickleballStats?`, `tennisStats?`, etc.) are already correctly named from Task 2.11 step 9 — no change needed.

- [ ] **Step 3: Delete the old file**

```bash
git rm src/components/game/game-box-scores.tsx
```

### Task 3.16: Update `game-detail-client.tsx` import path for `GameBoxScores` → `GameStats`

**Files:**
- Modify: `src/components/game/live/game-detail-client.tsx`

- [ ] **Step 1: Update import**

Edit:
```typescript
import { GameBoxScores } from "@/components/game/game-box-scores";
```
→
```typescript
import { GameStats } from "@/components/game/game-stats";
```

- [ ] **Step 2: Update JSX usage**

This step renames both the component (`<GameBoxScores>` → `<GameStats>`) AND the basketball-specific prop (`boxScores={state.basketballStats}` → `basketballStats={state.basketballStats}`) in one edit. The interface rename on `GameStatsProps` in Task 3.15 and this call-site rename must land in the same commit.

Edit:
```typescript
        <GameBoxScores
          game={state.game}
          boxScores={state.basketballStats}
```
→
```typescript
        <GameStats
          game={state.game}
          basketballStats={state.basketballStats}
```

And:
```typescript
        </GameBoxScores>
```
→
```typescript
        </GameStats>
```

(If there is no closing tag — i.e., self-closing — only the opening tag needs updating. Verify by reading the file.)

### Task 3.17: Update `loading.tsx` comment

**Files:**
- Modify: `src/app/[locale]/game/[id]/loading.tsx`

- [ ] **Step 1: Update the comment block**

Edit:
```typescript
      {/* Box scores skeleton -- rendered inline since the Suspense boundary
          with GameBoxScoresSkeleton only fires after page data loads */}
```
→
```typescript
      {/* Stats skeleton -- rendered inline since the Suspense boundary
          with GameStatsSkeleton only fires after page data loads */}
```

### Task 3.18: Rename test file `box-score-actions.test.ts` → `basketball-stats-actions.test.ts`

**Files:**
- Delete: `__tests__/[locale]/game/box-score-actions.test.ts`
- Create: `__tests__/[locale]/game/basketball-stats-actions.test.ts`

- [ ] **Step 1: Read the current test file**

It was already updated in Task 2.10 for the schema-aligned imports/types/field names. Note the helper names `makeBoxScoreFields`, `makeBoxScoresFields` — these need a final cosmetic rename.

- [ ] **Step 2: Create the new file**

Use Write to create `__tests__/[locale]/game/basketball-stats-actions.test.ts` with the same contents as the current file but with these final renames applied:

| Old | New |
|---|---|
| `makeBoxScoreFields` | `makeStatsFields` |
| `makeBoxScoresFields` | `makeStatsBulkFields` |
| `describe("saveBasketballStats"` | (unchanged — already correct) |

- [ ] **Step 3: Delete the old file**

```bash
git rm __tests__/[locale]/game/box-score-actions.test.ts
```

### Task 3.19: Polish reducer test names

**Files:**
- Modify: `__tests__/components/game/live/game-live-reducer.test.ts`

- [ ] **Step 1: Apply cosmetic renames**

These renames don't change behavior but match the rest of the rename. Use `replace_all`:

1. `replace_all`: `makeBoxScore` → `makeStats` (helper function name, ~11 occurrences)
2. Edit the `describe` heading:
```typescript
  describe("GAME_EVENT — box score saved", () => {
```
→
```typescript
  describe("GAME_EVENT — basketball stats saved", () => {
```
3. Edit the `it` description:
```typescript
    it("upserts box scores: updates existing entry and appends new entry", () => {
```
→
```typescript
    it("upserts basketball stats: updates existing entry and appends new entry", () => {
```
4. Local variables `existingBoxScore`, `updatedBoxScore`, `newBoxScore` → `existingStats`, `updatedStats`, `newStats`. Apply targeted edits:
   - `replace_all`: `existingBoxScore` → `existingStats`
   - `replace_all`: `updatedBoxScore` → `updatedStats`
   - `replace_all`: `newBoxScore` → `newStats`
   - The variable name `newBoxScores` was renamed in Task 2.9 to `newBasketballStats` — verify and leave it.

Phase 3 complete. Proceed to phase 4. Do not run build/tests yet — the i18n key references in code now point to keys that don't yet exist in `messages/en.json`. Phase 4 fixes this.

---

## Phase 4 — i18n key rename

**Goal:** Rename the `game.boxScore.*` namespace and leaf keys in `messages/en.json`. Change the `title` value to `"Stats"`.

### Task 4.1: Rename the `game.boxScore` namespace and update key names

**Files:**
- Modify: `messages/en.json`

- [ ] **Step 1: Read the relevant section**

Read `messages/en.json` lines 320–745 to confirm the structure: `"boxScore": { ... }`, the nested sport namespaces, and the success/errors entries.

- [ ] **Step 2: Apply the namespace rename**

The cleanest approach is a series of targeted edits. Apply in this order:

1. Edit the namespace open (this single Edit captures the entire intro block including the renamed leaf keys):
```json
    "boxScore": {
      "title": "Box Scores",
      "noBoxScores": "No box scores recorded yet",
      "playerCount": "{count, plural, one {# player} other {# players}}",
      "selectPlayer": "Select player...",
      "addPlayerStats": "Add Player Stats",
      "playerStatsAdded": "Player stats row added",
      "playerStatsError": "Failed to add player stats",
      "addBoxScores": "Add Box Scores",
      "editBoxScores": "Edit Box Scores",
      "saveBoxScores": "Save Box Scores",
      "player": "Player",
```
→
```json
    "stats": {
      "title": "Stats",
      "noStats": "No stats recorded yet",
      "playerCount": "{count, plural, one {# player} other {# players}}",
      "selectPlayer": "Select player...",
      "addPlayerStats": "Add Player Stats",
      "playerStatsAdded": "Player stats row added",
      "playerStatsError": "Failed to add player stats",
      "addStats": "Add Stats",
      "editStats": "Edit Stats",
      "saveStats": "Save Stats",
      "player": "Player",
```

2. Edit the success entry:
```json
      "boxScoresSaved": "Box scores saved",
```
→
```json
      "statsSaved": "Stats saved",
```

3. Edit the errors entry:
```json
      "boxScoreError": "Failed to save box scores",
```
→
```json
      "statsError": "Failed to save stats",
```

The nested namespaces (`tennis`, `pickleball`, `basketball`, `football`, `baseball`, `volleyball`) and their leaf keys do not need any other changes — they're scoped under the renamed parent.

Phase 4 complete. Proceed to phase 5.

---

## Phase 5 — Test fixtures rename

**Goal:** Rename `mockBasketballBoxScoresResponse` → `mockBasketballStatsResponse` in mock data and update the import in `graphql-handlers.ts`.

### Task 5.1: Rename the mock helper

**Files:**
- Modify: `tests/fixtures/mock-data/games.ts`

- [ ] **Step 1: Apply the rename**

Edit:
```typescript
export function mockBasketballBoxScoresResponse() {
  return { data: { basketballStats: [] } };
}
```
→
```typescript
export function mockBasketballStatsResponse() {
  return { data: { basketballStats: [] } };
}
```

### Task 5.2: Update the import in `graphql-handlers.ts`

**Files:**
- Modify: `tests/fixtures/graphql-handlers.ts`

- [ ] **Step 1: Apply the rename**

Edit:
```typescript
import {
  mockGamesListResponse,
  mockGameDetailResponse,
  mockBasketballBoxScoresResponse,
} from "./mock-data/games";
```
→
```typescript
import {
  mockGamesListResponse,
  mockGameDetailResponse,
  mockBasketballStatsResponse,
} from "./mock-data/games";
```

And:
```typescript
  basketballStats: mockBasketballBoxScoresResponse(),
```
→
```typescript
  basketballStats: mockBasketballStatsResponse(),
```

Phase 5 complete. Proceed to phase 6.

---

## Phase 6 — Developer-facing skill docs

**Goal:** Update `.claude/skills/add-sport-type/SKILL.md` so future Claude sessions adding a sport reference the post-rename codebase.

### Task 6.1: Update the skill doc

**Files:**
- Modify: `.claude/skills/add-sport-type/SKILL.md`

- [ ] **Step 1: Frontmatter description**

Edit:
```markdown
description: Step-by-step guide for adding a new sport type to the Playground app. Use this skill whenever the user wants to add a new sport (e.g., volleyball, wiffleball, soccer, track & field, swimming) or asks about what's involved in supporting a new sport. Also trigger when the user mentions "new sport", "add sport", "sport type", or discusses expanding the app to cover additional sports. This includes adding box scores / per-player statistics for an existing sport.
```
→
```markdown
description: Step-by-step guide for adding a new sport type to the Playground app. Use this skill whenever the user wants to add a new sport (e.g., volleyball, wiffleball, soccer, track & field, swimming) or asks about what's involved in supporting a new sport. Also trigger when the user mentions "new sport", "add sport", "sport type", or discusses expanding the app to cover additional sports. This includes adding per-player stats for an existing sport.
```

- [ ] **Step 2: Pre-flight check section**

Edit:
```markdown
Before starting, determine what already exists for this sport. Many sports have partial support — the backend schema may already define the types, or basic game support may be in place without box scores.
```
→
```markdown
Before starting, determine what already exists for this sport. Many sports have partial support — the backend schema may already define the types, or basic game support may be in place without stats.
```

And:
```markdown
8. Check `src/components/game/game-box-scores.tsx` — does it handle this sport?
```
→
```markdown
8. Check `src/components/game/game-stats.tsx` — does it handle this sport?
```

- [ ] **Step 3: Box score stats listing**

Edit:
```markdown
10. **Box score stats** — what per-player statistics should be tracked? This may not exist yet in the schema — check and ask.
```
→
```markdown
10. **Per-player stats** — what stats should be tracked per player? This may not exist yet in the schema — check and ask.
```

- [ ] **Step 4: Schema checklist line**

Edit:
```markdown
- [ ] If box scores exist: add stat types, filter input, connection types, save input, and mutations
```
→
```markdown
- [ ] If stats exist: add stat types, filter input, connection types, save input, and mutations
```

- [ ] **Step 5: Translations checklist**

Edit:
```markdown
- [ ] If box scores exist: add stat abbreviation keys under `game.boxScore.{sport}`
```
→
```markdown
- [ ] If stats exist: add stat abbreviation keys under `game.stats.{sport}`
```

- [ ] **Step 6: Box scores commit section header & intro**

Edit:
```markdown
## Commit 5: Box scores (if applicable)

Per-player statistics are a standalone feature that not all sports need. Keep this in its own commit so it can be skipped or deferred.
```
→
```markdown
## Commit 5: Stats (if applicable)

Per-player stats are a standalone feature that not all sports need. Keep this in its own commit so it can be skipped or deferred.
```

- [ ] **Step 7: Type checklist**

Edit:
```markdown
- [ ] `*Node extends BoxScoreNode` — response type, stat fields `number | null`
- [ ] `Save*Input extends SaveBoxScoreInput` — single-save, stat fields `number | null` optional
```
→
```markdown
- [ ] `*Node extends StatsNode` — response type, stat fields `number | null`
- [ ] `Save*Input extends SaveStatsInput` — single-save, stat fields `number | null` optional
```

- [ ] **Step 8: Server actions section**

Edit:
```markdown
### 13b. Server Actions — `src/app/[locale]/game/{sport}-stats-actions.ts`

Create a **separate file** for the sport's box score actions (do NOT add to `actions.ts`). Follow existing `*-stats-actions.ts` or `box-score-actions.ts` patterns.
```
→
```markdown
### 13b. Server Actions — `src/app/[locale]/game/{sport}-stats-actions.ts`

Create a **separate file** for the sport's stats actions (do NOT add to `actions.ts`). Follow existing `*-stats-actions.ts` patterns (e.g., `basketball-stats-actions.ts`).
```

- [ ] **Step 9: Translation key keys section**

Edit:
```markdown
### 13c. Translation Keys — `messages/en.json`

- [ ] Add stat abbreviation keys under `game.boxScore.{sport}`
- [ ] For multi-category sports, add section label keys under `game.boxScore.{sport}.sections`
```
→
```markdown
### 13c. Translation Keys — `messages/en.json`

- [ ] Add stat abbreviation keys under `game.stats.{sport}`
- [ ] For multi-category sports, add section label keys under `game.stats.{sport}.sections`
```

- [ ] **Step 10: Orchestrator section heading**

Edit:
```markdown
### 13f. Orchestrator — `src/components/game/game-box-scores.tsx`

This component gates which sports show box scores. Read the current implementation to understand the existing guard condition and rendering pattern.

- [ ] Add the new sport to the allowed sports guard
- [ ] Add optional props for the new sport's stat arrays
- [ ] For multi-category sports: render category sections with `TypographyH4` headers, **hiding sections when no stats exist** (`stats && stats.length > 0`) to avoid empty-state noise
- [ ] Ensure `boxScores` prop is optional (with `?? []` fallback) — it's basketball-specific and shouldn't be required for other sports
- [ ] Use `groupByTeam()` to group stats by team
```
→
```markdown
### 13f. Orchestrator — `src/components/game/game-stats.tsx`

This component gates which sports show stats. Read the current implementation to understand the existing guard condition and rendering pattern.

- [ ] Add the new sport to the allowed sports guard
- [ ] Add optional props for the new sport's stat arrays
- [ ] For multi-category sports: render category sections with `TypographyH4` headers, **hiding sections when no stats exist** (`stats && stats.length > 0`) to avoid empty-state noise
- [ ] Ensure `basketballStats` prop is optional (with `?? []` fallback) — it's basketball-specific and shouldn't be required for other sports
- [ ] Use `groupByTeam()` to group stats by team
```

- [ ] **Step 11: Client wrapper section**

Edit:
```markdown
- [ ] Pass them through to `<GameBoxScores>`
```
→
```markdown
- [ ] Pass them through to `<GameStats>`
```

And:
```markdown
**Note:** Box score stats are static props, not managed by the live reducer. The existing `initialBoxScores` prop feeds the basketball WebSocket live reducer — it will be `[]` for non-basketball games. No reducer changes needed.
```
→
```markdown
**Note:** Stats are static props, not managed by the live reducer. The existing `initialBasketballStats` prop feeds the basketball WebSocket live reducer — it will be `[]` for non-basketball games. No reducer changes needed.
```

- [ ] **Step 12: Commit message template**

Edit:
```markdown
**Commit message:** `feat: add {sport} box scores — types, table, form, actions, page wiring`
```
→
```markdown
**Commit message:** `feat: add {sport} stats — types, table, form, actions, page wiring`
```

- [ ] **Step 13: Architecture notes section**

Edit:
```markdown
**Box score action file convention:**
Each sport gets its own server action file for box scores (e.g., `{sport}-stats-actions.ts`), NOT added to the main `actions.ts`. This keeps files focused and avoids one massive file.

**Multi-category box scores:**
Sports with multiple independent stat categories (like football's offensive/defensive/special teams) get one table + form per category. The orchestrator renders each category as a collapsible section with a heading, hiding empty sections. Each category has its own pair of server action functions (save single + bulk).
```
→
```markdown
**Stats action file convention:**
Each sport gets its own server action file for stats (e.g., `{sport}-stats-actions.ts`), NOT added to the main `actions.ts`. This keeps files focused and avoids one massive file.

**Multi-category stats:**
Sports with multiple independent stat categories (like football's offensive/defensive/special teams) get one table + form per category. The orchestrator renders each category as a collapsible section with a heading, hiding empty sections. Each category has its own pair of server action functions (save single + bulk).
```

### Task 6.2: Verify SKILL.md has no stale references

- [ ] **Step 1: Re-read the file end-to-end**

Read `.claude/skills/add-sport-type/SKILL.md` from start to finish. Confirm there are no remaining `boxScore`, `BoxScore`, or `box-score` references.

- [ ] **Step 2: Run grep verification**

```bash
grep -nE 'boxScore|BoxScore|box-score' .claude/skills/add-sport-type/SKILL.md
```

Expected: zero matches.

Phase 6 complete. All phases finished. Proceed to Final verification.

---

## Final verification

### Task F.1: Run the full verification suite

- [ ] **Step 1: Build, lint, unit tests, integration tests**

```bash
npm run lint 2>&1 | tee /tmp/stats-rename-final-lint.txt
npm run build 2>&1 | tee /tmp/stats-rename-final-build.txt
npm test 2>&1 | tee /tmp/stats-rename-final-vitest.txt
npx playwright test --project=chromium 2>&1 | tee /tmp/stats-rename-final-pw.txt
```

Expected: all PASS. Read each file if errors.

- [ ] **Step 2: Grep for residual old names**

```bash
grep -rnE 'BoxScore|boxScore|box-score' src/ __tests__/ tests/ messages/ .claude/
```

Expected: zero matches (excluding `showStatistics` in settings, which is unrelated and out of scope).

```bash
grep -rnEi '(pickleball|tennis|volleyball)Statistics' src/ __tests__/ tests/
```

Case-insensitive so it catches leftover lowercase (`pickleballStatistics:`) forms too. Expected: zero matches.

```bash
grep -rnE '"BoxScoreSavedEvent"' src/ __tests__/
```

Expected: zero matches.

```bash
grep -rnE 'game\.boxScore' src/ messages/
```

Expected: zero matches.

- [ ] **Step 3: Manual smoke test (OPTIONAL — defer to reviewer if needed)**

Per the spec's verification checklist:
1. Start the dev server (`npm run dev`).
2. Open a basketball game detail page authenticated. Verify the stats table loads.
3. Add a player via "Add Player Stats" — verify success toast and row appears.
4. Click the edit pencil — verify the form opens with the dialog title `"Edit Stats - {playerName}"`.
5. Save changes — verify success toast `"Stats saved"`.
6. Open a tennis or pickleball singles game — verify the team-group header reads `"Stats"` (not `"Box Scores"`).
7. Optional: subscribe to a live basketball game and save stats from another session — verify the reducer upserts without a page reload.

### Task F.2: Single commit

- [ ] **Step 1: Review git status**

```bash
git status
```

Expected: deleted files (`box-score-actions.ts`, `basketball-box-score-form.tsx`, `basketball-box-score-table.tsx`, `collapsible-box-score.tsx`, `game-box-scores.tsx`, `game-box-scores-skeleton.tsx`, `box-score-actions.test.ts`) are already staged by the `git rm` commands run during phases 2 and 3. All other modified/new files are unstaged.

- [ ] **Step 2: Stage everything and commit**

```bash
git add src/lib/types/stats/ \
        src/lib/types/game-event.ts \
        src/app/[locale]/game/basketball-stats-actions.ts \
        src/app/[locale]/game/pickleball-stats-actions.ts \
        src/app/[locale]/game/tennis-stats-actions.ts \
        src/app/[locale]/game/volleyball-stats-actions.ts \
        src/app/[locale]/game/[id]/page.tsx \
        src/app/[locale]/game/[id]/loading.tsx \
        src/components/game/ \
        src/hooks/use-game-subscription.ts \
        __tests__/[locale]/game/basketball-stats-actions.test.ts \
        __tests__/components/game/live/game-live-reducer.test.ts \
        tests/fixtures/mock-data/games.ts \
        tests/fixtures/graphql-handlers.ts \
        messages/en.json \
        .claude/skills/add-sport-type/SKILL.md

git commit -m "$(cat <<'EOF'
fix(stats): align frontend with renamed stats schema

Align every frontend reference with the renamed GraphQL schema
(BoxScore/Statistics → Stats) and propagate the new convention
through every internal identifier, file name, prop, i18n key, test
fixture, and developer-facing skill doc in the stats package.

Schema alignment (bug fixes — stats save/fetch/subscribe were
broken on basketball/pickleball/tennis/volleyball):
- query basketballBoxScores → basketballStats
- query pickleballStatistics → pickleballStats (and tennis/volleyball)
- mutation saveBasketballBoxScore → saveBasketballStats
- mutation saveBasketballBoxScores → saveBasketballStatsBulk
- mutation savePickleballStatistics → savePickleballStats (and bulk
  variants for tennis/volleyball)
- bulk save input field basketballBoxScores → stats (and pickleball/
  tennis/volleyball statistics → stats)
- single response field basketballBoxScore → basketballStats (and
  pickleballStatistics → pickleballStats, etc.)
- subscription event BoxScoreSavedEvent → BasketballStatsSavedEvent
  with field basketballBoxScores → basketballStats

Type and identifier renames:
- BoxScoreNode → StatsNode, SaveBoxScoreInput → SaveStatsInput
- BasketballBoxScoreNode → BasketballStatsNode and Save* variants
- PickleballStatisticsNode → PickleballStatsNode (and tennis/volleyball)
- LiveGameState.boxScores → basketballStats; SYNC_FROM_SERVER field
  renamed to match
- *ActionResult interfaces unified to statsId/statsIds across
  basketball, pickleball, tennis, volleyball (football and baseball
  already conformed)

File renames:
- src/app/[locale]/game/box-score-actions.ts → basketball-stats-actions.ts
- src/components/game/basketball-box-score-{form,table}.tsx →
  basketball-stats-{form,table}.tsx
- src/components/game/collapsible-box-score.tsx → collapsible-stats.tsx
- src/components/game/game-box-scores.tsx → game-stats.tsx
- src/components/game/game-box-scores-skeleton.tsx →
  game-stats-skeleton.tsx
- __tests__/[locale]/game/box-score-actions.test.ts →
  basketball-stats-actions.test.ts

Component identifier renames:
- BasketballBoxScoreForm/Table → BasketballStatsForm/Table
- CollapsibleBoxScore → CollapsibleStats
- GameBoxScores → GameStats
- GameBoxScoresSkeleton → GameStatsSkeleton
- Sport-table inner prop boxScores → stats (generic)
- boxScoreT → statsT, editingScore → editingStats
- TeamBoxScoreGroup<T> → TeamStatsGroup<T>

i18n rename:
- game.boxScore.* namespace → game.stats.*
- leaf keys noBoxScores → noStats, editBoxScores → editStats, etc.
- user-facing label "Box Scores" → "Stats" on game.stats.title
  (rendered on singles games where "Box Scores" was the wrong term)

Test fixtures:
- mockBasketballBoxScoresResponse → mockBasketballStatsResponse
- EMPTY_STAT_FIELDS: new field names + add missing volleyballStats

Docs:
- Update .claude/skills/add-sport-type/SKILL.md for the post-rename
  codebase so future sport additions reference the correct files,
  types, props, and i18n keys.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Verify the commit**

```bash
git status          # should be clean
git log -1 --stat   # review the staged changes
```

Expected: clean working tree, single commit with ~40 files changed.

---

## Self-Review Notes

**Spec coverage check:** Every row in the spec's "Naming Conventions (Decisions)" table maps to at least one task above. Specifically:

- Spec rows 1, 2 (base type rename) → Task 1.1
- Spec rows 3, 4 (action file + test file rename) → Tasks 2.1, 3.18
- Spec rows 5, 6, 7 (orchestrator/collapsible/skeleton rename) → Tasks 3.15, 3.1, 3.2
- Spec row 8 (basketball form/table rename) → Tasks 3.3, 3.4
- Spec row 9 (inner prop `stats`) → Tasks 3.4, 3.6, 3.8, 3.10, 3.12, 3.13, 3.14, 3.15
- Spec row 10 (`initialBoxScores` → `initialBasketballStats`) → Tasks 2.5 step 7, 2.6
- Spec row 11 (reducer state field) → Task 2.7
- Spec row 12 (`boxScoreT` → `statsT`) → Tasks 3.4, 3.6, 3.8, 3.10, 3.11–3.14
- Spec row 13 (`editingScore` → `editingStats`) → Tasks 3.4, 3.14
- Spec row 14 (action result interfaces unified) → Tasks 2.1, 2.2, 2.3, 2.4
- Spec rows 15, 16 (i18n namespace + leaf keys) → Task 4.1
- Spec row 17 (label `"Stats"`) → Task 4.1
- Spec row 18 (mock helper rename) → Task 5.1
- Spec row 19 (`TeamBoxScoreGroup` rename) → Task 3.15
- Spec row 20 (`boxScoreResponse` → `basketballStatsResponse`) → Task 2.5 step 3
- Spec row 21 (`EMPTY_STAT_FIELDS` + add volleyball) → Task 2.12 step 2
- SKILL.md updates → Task 6.1

**Type consistency check:** The reducer state shape `LiveGameState.basketballStats` matches the action payload `SYNC_FROM_SERVER.basketballStats` matches the prop name `initialBasketballStats` matches the page.tsx local var `initialBasketballStats`. The schema bulk-save input field `stats: [...]` matches the action's local var name in `basketball-stats-actions.ts` (`stats`), `pickleball-stats-actions.ts` (`stats: statsInput`), tennis, and volleyball.

**Placeholder scan:** No "TBD", "TODO", "implement later", or open-ended directions. Every step shows the actual code substitution or command to run.

**Order of operations:** Type-layer first (phase 1) intentionally breaks the build. Schema alignment (phase 2) restores it. Both phases land in the same single commit at the end. This is the only way to do a discriminated-union rename atomically with the wire-level field rename — they must move together.
