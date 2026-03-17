# Football Box Scores Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-player football statistics (offensive, defensive, special teams) to the game detail page, following the same patterns used by basketball and pickleball box scores.

**Architecture:** Football has 3 stat categories (offensive, defensive, special teams), each with its own GraphQL query, mutation, types, table component, form component, and server action. Each category follows the same pattern as pickleball stats: a `*Node` response type, `Save*Input` / `Save*Data` input types, a `*StatsTable` component with TanStack Table + sortable columns + sticky player column, a `*StatsForm` dialog for editing, and server actions wrapping `authMutate`. The `GameBoxScores` component orchestrates all 3 tables with collapsible team sections. The game detail page fetches all 3 stat types in parallel.

**Tech Stack:** TypeScript, React, Next.js App Router, TanStack Table, TanStack Form, json-to-graphql-query, Vitest

**Key design notes:**
- Computed columns (CMP%, FG%, punt avg, total tackles) do NOT exist in the schema. They must be **client-side computed** using TanStack Table's `id` + custom `cell` pattern (not `accessorKey`). Always guard division-by-zero.
- Server action mutations use `*Response` as `__typeName` in `__on` fragments and as the `successTypeName` arg to `extractMutationResult`. Do NOT confuse with `*Result` (the union type name).
- `GameBoxScoresProps.boxScores` is currently required and basketball-typed. Make it optional when adding football support.
- Football stats are static props (like pickleball), not managed by the live reducer. `initialBoxScores` will be `[]` for football games -- no reducer changes needed.
- Offensive table has duplicate stat concepts (yards, TDs) across passing/rushing/receiving. Use disambiguated abbreviations (e.g., "PASS YDS", "RUSH YDS", "REC YDS").
- Hide entire category sections when no stats exist across all teams (avoid empty-state noise).

**Reference files (follow these patterns exactly):**
- Types: `src/lib/types/stats/pickleball.ts`
- Table: `src/components/game/pickleball-stats-table.tsx`
- Form: `src/components/game/pickleball-stats-form.tsx`
- Actions: `src/app/[locale]/game/pickleball-stats-actions.ts`
- Orchestrator: `src/components/game/game-box-scores.tsx`
- Page: `src/app/[locale]/game/[id]/page.tsx`
- Client wrapper: `src/components/game/live/game-detail-client.tsx`

---

## File Map

### New files
| File | Responsibility |
|------|----------------|
| `src/lib/types/stats/football.ts` | Node + save input types for all 3 stat categories |
| `src/app/[locale]/game/football-stats-actions.ts` | Server actions: save single + bulk for each category |
| `src/components/game/football-offensive-stats-table.tsx` | TanStack Table for offensive stats with edit form trigger |
| `src/components/game/football-defensive-stats-table.tsx` | TanStack Table for defensive stats with edit form trigger |
| `src/components/game/football-special-teams-stats-table.tsx` | TanStack Table for special teams stats with edit form trigger |
| `src/components/game/football-offensive-stats-form.tsx` | Dialog form for editing a player's offensive stats |
| `src/components/game/football-defensive-stats-form.tsx` | Dialog form for editing a player's defensive stats |
| `src/components/game/football-special-teams-stats-form.tsx` | Dialog form for editing a player's special teams stats |

### Modified files
| File | Change |
|------|--------|
| `messages/en.json` | Add `game.boxScore.football.offensive.*`, `game.boxScore.football.defensive.*`, `game.boxScore.football.specialTeams.*` keys |
| `src/components/game/game-box-scores.tsx` | Add football handling: accept 3 football stat props, render category-specific tables |
| `src/app/[locale]/game/[id]/page.tsx` | Fetch football offensive/defensive/special teams stats, pass to client |
| `src/components/game/live/game-detail-client.tsx` | Accept + pass through 3 football stat props |

---

## Task 1: TypeScript types

**Files:**
- Create: `src/lib/types/stats/football.ts`

- [ ] **Step 1: Create football stat types**

Follow `src/lib/types/stats/pickleball.ts` pattern exactly. Create interfaces for all 3 categories.

```ts
import type { BoxScoreNode, SaveBoxScoreInput } from "./base";

// -- Offensive Stats --

export interface FootballOffensiveStatsNode extends BoxScoreNode {
  completions: number | null;
  passAttempts: number | null;
  passingYards: number | null;
  passingTouchdowns: number | null;
  interceptionsThrown: number | null;
  sacksTaken: number | null;
  sackYardsLost: number | null;
  rushAttempts: number | null;
  rushingYards: number | null;
  rushingTouchdowns: number | null;
  fumbles: number | null;
  fumblesLost: number | null;
  receptions: number | null;
  targets: number | null;
  receivingYards: number | null;
  receivingTouchdowns: number | null;
}

export interface SaveFootballOffensiveStatsInput extends SaveBoxScoreInput {
  completions?: number | null;
  passAttempts?: number | null;
  passingYards?: number | null;
  passingTouchdowns?: number | null;
  interceptionsThrown?: number | null;
  sacksTaken?: number | null;
  sackYardsLost?: number | null;
  rushAttempts?: number | null;
  rushingYards?: number | null;
  rushingTouchdowns?: number | null;
  fumbles?: number | null;
  fumblesLost?: number | null;
  receptions?: number | null;
  targets?: number | null;
  receivingYards?: number | null;
  receivingTouchdowns?: number | null;
}

export interface SaveFootballOffensiveStatsData {
  playerId: number;
  completions?: number | null;
  passAttempts?: number | null;
  passingYards?: number | null;
  passingTouchdowns?: number | null;
  interceptionsThrown?: number | null;
  sacksTaken?: number | null;
  sackYardsLost?: number | null;
  rushAttempts?: number | null;
  rushingYards?: number | null;
  rushingTouchdowns?: number | null;
  fumbles?: number | null;
  fumblesLost?: number | null;
  receptions?: number | null;
  targets?: number | null;
  receivingYards?: number | null;
  receivingTouchdowns?: number | null;
}

// -- Defensive Stats --

export interface FootballDefensiveStatsNode extends BoxScoreNode {
  soloTackles: number | null;
  assistedTackles: number | null;
  sacks: number | null;
  tacklesForLoss: number | null;
  passesDefended: number | null;
  interceptions: number | null;
  interceptionReturnYards: number | null;
  interceptionReturnTouchdowns: number | null;
  forcedFumbles: number | null;
  fumbleRecoveries: number | null;
  fumbleReturnYards: number | null;
  fumbleReturnTouchdowns: number | null;
  safeties: number | null;
}

export interface SaveFootballDefensiveStatsInput extends SaveBoxScoreInput {
  soloTackles?: number | null;
  assistedTackles?: number | null;
  sacks?: number | null;
  tacklesForLoss?: number | null;
  passesDefended?: number | null;
  interceptions?: number | null;
  interceptionReturnYards?: number | null;
  interceptionReturnTouchdowns?: number | null;
  forcedFumbles?: number | null;
  fumbleRecoveries?: number | null;
  fumbleReturnYards?: number | null;
  fumbleReturnTouchdowns?: number | null;
  safeties?: number | null;
}

export interface SaveFootballDefensiveStatsData {
  playerId: number;
  soloTackles?: number | null;
  assistedTackles?: number | null;
  sacks?: number | null;
  tacklesForLoss?: number | null;
  passesDefended?: number | null;
  interceptions?: number | null;
  interceptionReturnYards?: number | null;
  interceptionReturnTouchdowns?: number | null;
  forcedFumbles?: number | null;
  fumbleRecoveries?: number | null;
  fumbleReturnYards?: number | null;
  fumbleReturnTouchdowns?: number | null;
  safeties?: number | null;
}

// -- Special Teams Stats --

export interface FootballSpecialTeamsStatsNode extends BoxScoreNode {
  fieldGoalsMade: number | null;
  fieldGoalsAttempted: number | null;
  longestFieldGoal: number | null;
  extraPointsMade: number | null;
  extraPointsAttempted: number | null;
  punts: number | null;
  puntYards: number | null;
  longestPunt: number | null;
  puntReturns: number | null;
  puntReturnYards: number | null;
  puntReturnTouchdowns: number | null;
  kickReturns: number | null;
  kickReturnYards: number | null;
  kickReturnTouchdowns: number | null;
}

export interface SaveFootballSpecialTeamsStatsInput extends SaveBoxScoreInput {
  fieldGoalsMade?: number | null;
  fieldGoalsAttempted?: number | null;
  longestFieldGoal?: number | null;
  extraPointsMade?: number | null;
  extraPointsAttempted?: number | null;
  punts?: number | null;
  puntYards?: number | null;
  longestPunt?: number | null;
  puntReturns?: number | null;
  puntReturnYards?: number | null;
  puntReturnTouchdowns?: number | null;
  kickReturns?: number | null;
  kickReturnYards?: number | null;
  kickReturnTouchdowns?: number | null;
}

export interface SaveFootballSpecialTeamsStatsData {
  playerId: number;
  fieldGoalsMade?: number | null;
  fieldGoalsAttempted?: number | null;
  longestFieldGoal?: number | null;
  extraPointsMade?: number | null;
  extraPointsAttempted?: number | null;
  punts?: number | null;
  puntYards?: number | null;
  longestPunt?: number | null;
  puntReturns?: number | null;
  puntReturnYards?: number | null;
  puntReturnTouchdowns?: number | null;
  kickReturns?: number | null;
  kickReturnYards?: number | null;
  kickReturnTouchdowns?: number | null;
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: no errors related to football types

- [ ] **Step 3: Commit**

```
feat: add football stats TypeScript types -- offensive, defensive, special teams
```

---

## Task 2: Translations

**Files:**
- Modify: `messages/en.json`

- [ ] **Step 1: Add football stat abbreviation keys**

Add under `game.boxScore.football` with 3 sub-objects. Also add a shared `"player": "Player"` key under `game.boxScore` (fixes an existing bug where pickleball table uses `boxScoreT("player")` but the key is missing).

Use disambiguated abbreviations for stats that repeat across passing/rushing/receiving:

```json
"player": "Player",
"football": {
  "offensive": {
    "completions": "CMP",
    "passAttempts": "ATT",
    "completionPercentage": "CMP%",
    "passingYards": "PASS YDS",
    "passingTouchdowns": "PASS TD",
    "interceptionsThrown": "INT",
    "sacksTaken": "SCK",
    "sackYardsLost": "SCK YDS",
    "rushAttempts": "CAR",
    "rushingYards": "RUSH YDS",
    "rushingTouchdowns": "RUSH TD",
    "fumbles": "FUM",
    "fumblesLost": "LOST",
    "receptions": "REC",
    "targets": "TGT",
    "receivingYards": "REC YDS",
    "receivingTouchdowns": "REC TD"
  },
  "defensive": {
    "soloTackles": "SOLO",
    "assistedTackles": "AST",
    "totalTackles": "TOT",
    "sacks": "SCK",
    "tacklesForLoss": "TFL",
    "passesDefended": "PD",
    "interceptions": "INT",
    "interceptionReturnYards": "INT YDS",
    "interceptionReturnTouchdowns": "INT TD",
    "forcedFumbles": "FF",
    "fumbleRecoveries": "FR",
    "fumbleReturnYards": "FR YDS",
    "fumbleReturnTouchdowns": "FR TD",
    "safeties": "SAF"
  },
  "specialTeams": {
    "fieldGoalsMade": "FGM",
    "fieldGoalsAttempted": "FGA",
    "fieldGoalPercentage": "FG%",
    "longestFieldGoal": "LNG",
    "extraPointsMade": "XPM",
    "extraPointsAttempted": "XPA",
    "punts": "PUNTS",
    "puntYards": "YDS",
    "puntAverage": "AVG",
    "longestPunt": "LNG",
    "puntReturns": "PR",
    "puntReturnYards": "PR YDS",
    "puntReturnTouchdowns": "PR TD",
    "kickReturns": "KR",
    "kickReturnYards": "KR YDS",
    "kickReturnTouchdowns": "KR TD"
  },
  "sections": {
    "passing": "Passing",
    "rushing": "Rushing",
    "receiving": "Receiving",
    "kicking": "Kicking",
    "punting": "Punting",
    "returns": "Returns",
    "offensive": "Offense",
    "defensive": "Defense",
    "specialTeams": "Special Teams"
  }
}
```

Note: `"player"` goes as a sibling of `"football"` inside `game.boxScore`, not nested under football.

- [ ] **Step 2: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json', 'utf8')); console.log('Valid JSON')"`
Expected: "Valid JSON"

- [ ] **Step 3: Commit**

```
feat: add football stats translation keys
```

---

## Task 3: Server actions

**Files:**
- Create: `src/app/[locale]/game/football-stats-actions.ts`

- [ ] **Step 1: Create server actions for all 3 stat categories**

Follow `src/app/[locale]/game/pickleball-stats-actions.ts` pattern exactly. Each category needs:
- A `STAT_FIELDS` const array
- A `buildStatFields()` helper
- A `RESPONSE_FIELDS` const for the GraphQL selection
- A `save*` single-record function
- A `save*Bulk` bulk function

The GraphQL mutation names (from schema) are:
- `saveFootballOffensiveStats` / `saveFootballOffensiveStatsBulk`
- `saveFootballDefensiveStats` / `saveFootballDefensiveStatsBulk`
- `saveFootballSpecialTeamsStats` / `saveFootballSpecialTeamsStatsBulk`

The response type names (from schema) are:
- `SaveFootballOffensiveStatsResponse` (field: `footballOffensiveStats`)
- `SaveFootballOffensiveStatsBulkResponse` (field: `offensiveStats`)
- `SaveFootballDefensiveStatsResponse` (field: `footballDefensiveStats`)
- `SaveFootballDefensiveStatsBulkResponse` (field: `defensiveStats`)
- `SaveFootballSpecialTeamsStatsResponse` (field: `footballSpecialTeamsStats`)
- `SaveFootballSpecialTeamsStatsBulkResponse` (field: `specialTeamsStats`)

The bulk input structures (from schema) are:
- `SaveFootballOffensiveStatsBulkInput { gameId, offensiveStats: [SaveFootballOffensiveStatsData!]! }`
- `SaveFootballDefensiveStatsBulkInput { gameId, defensiveStats: [SaveFootballDefensiveStatsData!]! }`
- `SaveFootballSpecialTeamsStatsBulkInput { gameId, specialTeamsStats: [SaveFootballSpecialTeamsStatsData!]! }`

**Important:** Each category has its own `STAT_FIELDS`, `buildStatFields`, and `RESPONSE_FIELDS`. Name them with category prefixes to avoid collision (e.g., `OFFENSIVE_STAT_FIELDS`, `buildOffensiveStatFields`, `OFFENSIVE_RESPONSE_FIELDS`).

The result interface is shared across all 3 categories:

```ts
interface FootballStatsActionResult {
  success: boolean;
  statsId?: string;
  statsIds?: string[];
  errorType?: string;
  message?: string;
}
```

**Concrete example for `saveFootballOffensiveStats`** (use `*Response` not `*Result` for `__typeName` and `extractMutationResult`):

```ts
export async function saveFootballOffensiveStats(
  input: SaveFootballOffensiveStatsInput,
): Promise<FootballStatsActionResult> {
  try {
    const mutationInput: Record<string, unknown> = {
      playerId: input.playerId,
      gameId: input.gameId,
      ...buildOffensiveStatFields(input),
    };

    const response = await authMutate({
      saveFootballOffensiveStats: {
        __args: { input: mutationInput },
        __typename: true,
        __on: [
          {
            __typeName: "SaveFootballOffensiveStatsResponse", // Response, NOT Result
            footballOffensiveStats: OFFENSIVE_RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(
      response.data.saveFootballOffensiveStats,
      "SaveFootballOffensiveStatsResponse" // Must match __typeName exactly
    );
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsId: result.data.footballOffensiveStats.id };
  } catch (error) {
    console.error("Failed to save football offensive stats:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save football offensive stats" };
  }
}
```

Apply the same pattern for all 6 functions (single + bulk for each category).

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: no errors

- [ ] **Step 3: Commit**

```
feat: add football stats server actions -- offensive, defensive, special teams
```

---

## Task 4: Offensive stats form + table

**Files:**
- Create: `src/components/game/football-offensive-stats-form.tsx`
- Create: `src/components/game/football-offensive-stats-table.tsx`

- [ ] **Step 1: Create the offensive stats edit form**

Follow `src/components/game/pickleball-stats-form.tsx` pattern exactly.

Key differences:
- Import `saveFootballOffensiveStats` from the football actions
- Import `FootballOffensiveStatsNode` and `SaveFootballOffensiveStatsInput` from football types
- `STAT_FIELDS` array has the 16 offensive stat field names
- Translation keys: `game.boxScore.football.offensive.{field}`
- Group fields into sections using `<div className="space-y-2">` with `<h4>` headers for "Passing", "Rushing", "Receiving" using `t("game.boxScore.football.sections.passing")` etc.
  - Passing: completions, passAttempts, passingYards, passingTouchdowns, interceptionsThrown, sacksTaken, sackYardsLost
  - Rushing: rushAttempts, rushingYards, rushingTouchdowns, fumbles, fumblesLost
  - Receiving: receptions, targets, receivingYards, receivingTouchdowns

- [ ] **Step 2: Create the offensive stats table**

Follow `src/components/game/pickleball-stats-table.tsx` pattern exactly.

Key differences:
- Import `saveFootballOffensiveStats` from the football actions
- Import `FootballOffensiveStatsNode` from football types
- `HIGHLIGHTABLE_STATS`: `["passingYards", "rushingYards", "receivingYards", "passingTouchdowns", "rushingTouchdowns", "receivingTouchdowns"]`
- Default sort: `{ id: "passingYards", desc: true }`
- Add a `madeAttemptedColumn` helper (like basketball's) for `completions/passAttempts` showing as "CMP/ATT"
- Add a **client-side computed** CMP% column (NOT from schema). Use `id` not `accessorKey`:

```tsx
{
  id: "completionPercentage",
  header: t("completionPercentage"),
  cell: ({ row }) => {
    const comp = row.original.completions;
    const att = row.original.passAttempts;
    if (comp == null || att == null || att === 0) {
      return <span className="tabular-nums">-</span>;
    }
    return (
      <span className="tabular-nums">
        {format.number(comp / att, { style: "percent", maximumFractionDigits: 1 })}
      </span>
    );
  },
}
```

- Column order: Player, CMP/ATT, CMP%, PASS YDS, PASS TD, INT, SCK, SCK YDS, CAR, RUSH YDS, RUSH TD, FUM, LOST, REC, TGT, REC YDS, REC TD, [Edit]
- Translation keys: `game.boxScore.football.offensive.{field}`
- Import `useFormatter` from `next-intl` for percentage formatting
- Import and render `FootballOffensiveStatsForm` when editing

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: no errors

- [ ] **Step 4: Commit**

```
feat: add football offensive stats table and form
```

---

## Task 5: Defensive stats form + table

**Files:**
- Create: `src/components/game/football-defensive-stats-form.tsx`
- Create: `src/components/game/football-defensive-stats-table.tsx`

- [ ] **Step 1: Create the defensive stats edit form**

Same pattern as offensive form. Key differences:
- Import `saveFootballDefensiveStats` from the football actions
- Import `FootballDefensiveStatsNode` and `SaveFootballDefensiveStatsInput` from football types
- `STAT_FIELDS` array has the 13 defensive stat field names
- Translation keys: `game.boxScore.football.defensive.{field}`
- All fields in one group (no sub-sections needed -- they're all defensive stats)

- [ ] **Step 2: Create the defensive stats table**

Same pattern as offensive table. Key differences:
- Import `saveFootballDefensiveStats` from the football actions
- `HIGHLIGHTABLE_STATS`: `["soloTackles", "sacks", "interceptions", "forcedFumbles"]`
- Default sort: `{ id: "soloTackles", desc: true }`
- Add a **client-side computed** totalTackles column (NOT from schema). Use `id` not `accessorKey`:

```tsx
{
  id: "totalTackles",
  header: t("totalTackles"),
  cell: ({ row }) => {
    const solo = row.original.soloTackles;
    const ast = row.original.assistedTackles;
    if (solo == null && ast == null) return <span className="tabular-nums">-</span>;
    return <span className="tabular-nums">{(solo ?? 0) + (ast ?? 0)}</span>;
  },
}
```

- Column order: Player, TOT, SOLO, AST, SCK, TFL, PD, INT, INT YDS, INT TD, FF, FR, FR YDS, FR TD, SAF, [Edit]
- Translation keys: `game.boxScore.football.defensive.{field}`
- Import and render `FootballDefensiveStatsForm` when editing

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: no errors

- [ ] **Step 4: Commit**

```
feat: add football defensive stats table and form
```

---

## Task 6: Special teams stats form + table

**Files:**
- Create: `src/components/game/football-special-teams-stats-form.tsx`
- Create: `src/components/game/football-special-teams-stats-table.tsx`

- [ ] **Step 1: Create the special teams stats edit form**

Same pattern. Key differences:
- Import `saveFootballSpecialTeamsStats` from the football actions
- Import `FootballSpecialTeamsStatsNode` and `SaveFootballSpecialTeamsStatsInput` from football types
- `STAT_FIELDS` array has the 14 special teams stat field names
- Translation keys: `game.boxScore.football.specialTeams.{field}`
- Group fields into sections: "Kicking" (FG, XP), "Punting" (punts), "Returns" (punt returns, kick returns)

- [ ] **Step 2: Create the special teams stats table**

Same pattern. Key differences:
- Import `saveFootballSpecialTeamsStats` from the football actions
- `HIGHLIGHTABLE_STATS`: `["fieldGoalsMade", "puntReturnTouchdowns", "kickReturnTouchdowns"]`
- Default sort: `{ id: "fieldGoalsMade", desc: true }`
- Add `madeAttemptedColumn` for fieldGoals (FGM/FGA) and extraPoints (XPM/XPA)
- Add **client-side computed** FG% column (NOT from schema):

```tsx
{
  id: "fieldGoalPercentage",
  header: t("fieldGoalPercentage"),
  cell: ({ row }) => {
    const made = row.original.fieldGoalsMade;
    const att = row.original.fieldGoalsAttempted;
    if (made == null || att == null || att === 0) return <span className="tabular-nums">-</span>;
    return (
      <span className="tabular-nums">
        {format.number(made / att, { style: "percent", maximumFractionDigits: 1 })}
      </span>
    );
  },
}
```

- Add **client-side computed** punt average column (NOT from schema):

```tsx
{
  id: "puntAverage",
  header: t("puntAverage"),
  cell: ({ row }) => {
    const punts = row.original.punts;
    const yards = row.original.puntYards;
    if (punts == null || yards == null || punts === 0) return <span className="tabular-nums">-</span>;
    return <span className="tabular-nums">{(yards / punts).toFixed(1)}</span>;
  },
}
```

- Column order: Player, FGM/FGA, FG%, LNG, XPM/XPA, PUNTS, YDS, AVG, LNG, PR, PR YDS, PR TD, KR, KR YDS, KR TD, [Edit]
- Import `useFormatter` from `next-intl` for percentage formatting
- Translation keys: `game.boxScore.football.specialTeams.{field}`
- Import and render `FootballSpecialTeamsStatsForm` when editing

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: no errors

- [ ] **Step 4: Commit**

```
feat: add football special teams stats table and form
```

---

## Task 7: Wire up GameBoxScores + game detail page

**Files:**
- Modify: `src/components/game/game-box-scores.tsx`
- Modify: `src/app/[locale]/game/[id]/page.tsx`
- Modify: `src/components/game/live/game-detail-client.tsx`

- [ ] **Step 1: Update `game-box-scores.tsx`**

Current code guards with `if (game.sportType !== SportType.BASKETBALL && game.sportType !== SportType.PICKLEBALL) return null`. Changes:

1. Add `SportType.FOOTBALL` to the allowed sports check
2. **Make `boxScores` optional** in `GameBoxScoresProps`: `boxScores?: { node: BasketballBoxScoreNode }[]`. Update basketball rendering to default to `[]`.
3. Add 3 new optional props: `footballOffensiveStats`, `footballDefensiveStats`, `footballSpecialTeamsStats` -- each typed as `{ node: Football*StatsNode }[]`
4. For football, render 3 separate sections (one per stat category). Each section has its own `CollapsibleBoxScore` wrapping its category-specific table
5. **Hide entire category sections when no stats exist** (avoid empty-state noise)
6. Use `groupByTeam()` for each category separately
7. Import the 3 football table components

The football section should render like:

```tsx
if (game.sportType === SportType.FOOTBALL) {
  return (
    <div className="space-y-6">
      {footballOffensiveStats && footballOffensiveStats.length > 0 && (
        <div className="space-y-4 [content-visibility:auto] [contain-intrinsic-size:0_200px]">
          <TypographyH4>{t("game.boxScore.football.sections.offensive")}</TypographyH4>
          {groupByTeam(game, footballOffensiveStats).map(group => (
            <CollapsibleBoxScore key={group.teamName} teamName={group.teamName} ...>
              <FootballOffensiveStatsTable ... />
            </CollapsibleBoxScore>
          ))}
        </div>
      )}
      {footballDefensiveStats && footballDefensiveStats.length > 0 && (
        /* same pattern for defensive */
      )}
      {footballSpecialTeamsStats && footballSpecialTeamsStats.length > 0 && (
        /* same pattern for special teams */
      )}
    </div>
  );
}
```

Add `TypographyH4` import from `@/components/ui/typography`.

- [ ] **Step 2: Update `game-detail-client.tsx`**

1. Add 3 new optional props to `GameDetailClientProps`: `initialFootballOffensiveStats`, `initialFootballDefensiveStats`, `initialFootballSpecialTeamsStats`
2. Import the 3 football node types
3. Pass them through to `<GameBoxScores>` as `footballOffensiveStats`, `footballDefensiveStats`, `footballSpecialTeamsStats`

Note: Football stats do NOT need live reducer support (no WebSocket events for football stats yet). They're passed as static initial data, same as pickleball stats. For football games, `initialBoxScores` will be `[]` (the existing default from page.tsx). No changes needed to the reducer or `SYNC_FROM_SERVER` action.

- [ ] **Step 3: Update `page.tsx`**

Add 3 parallel fetch blocks for football (same pattern as the basketball/pickleball blocks):

```tsx
let initialFootballOffensiveStats: { node: FootballOffensiveStatsNode }[] = [];
let initialFootballDefensiveStats: { node: FootballDefensiveStatsNode }[] = [];
let initialFootballSpecialTeamsStats: { node: FootballSpecialTeamsStatsNode }[] = [];

if (
  game.sportType === SportType.FOOTBALL &&
  game.gameStatus !== GameStatus.SCHEDULED
) {
  const [offResponse, defResponse, stResponse] = await Promise.all([
    authQuery({
      footballOffensiveStats: {
        __args: { input: { gameIds: [game.id] }, first: 50 },
        edges: {
          node: {
            id: true,
            player: playerRefFragment,
            completions: true,
            passAttempts: true,
            passingYards: true,
            passingTouchdowns: true,
            interceptionsThrown: true,
            sacksTaken: true,
            sackYardsLost: true,
            rushAttempts: true,
            rushingYards: true,
            rushingTouchdowns: true,
            fumbles: true,
            fumblesLost: true,
            receptions: true,
            targets: true,
            receivingYards: true,
            receivingTouchdowns: true,
          },
        },
      },
    }),
    authQuery({
      footballDefensiveStats: {
        __args: { input: { gameIds: [game.id] }, first: 50 },
        edges: {
          node: {
            id: true,
            player: playerRefFragment,
            soloTackles: true,
            assistedTackles: true,
            sacks: true,
            tacklesForLoss: true,
            passesDefended: true,
            interceptions: true,
            interceptionReturnYards: true,
            interceptionReturnTouchdowns: true,
            forcedFumbles: true,
            fumbleRecoveries: true,
            fumbleReturnYards: true,
            fumbleReturnTouchdowns: true,
            safeties: true,
          },
        },
      },
    }),
    authQuery({
      footballSpecialTeamsStats: {
        __args: { input: { gameIds: [game.id] }, first: 50 },
        edges: {
          node: {
            id: true,
            player: playerRefFragment,
            fieldGoalsMade: true,
            fieldGoalsAttempted: true,
            longestFieldGoal: true,
            extraPointsMade: true,
            extraPointsAttempted: true,
            punts: true,
            puntYards: true,
            longestPunt: true,
            puntReturns: true,
            puntReturnYards: true,
            puntReturnTouchdowns: true,
            kickReturns: true,
            kickReturnYards: true,
            kickReturnTouchdowns: true,
          },
        },
      },
    }),
  ]);

  initialFootballOffensiveStats = offResponse.data?.footballOffensiveStats?.edges ?? [];
  initialFootballDefensiveStats = defResponse.data?.footballDefensiveStats?.edges ?? [];
  initialFootballSpecialTeamsStats = stResponse.data?.footballSpecialTeamsStats?.edges ?? [];
}
```

Pass all 3 to `<GameDetailClient>`.

**IMPORTANT:** The `stResponse` variable must be used for special teams (not `defResponse` -- watch for copy-paste errors).

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: no errors

- [ ] **Step 5: Commit**

```
feat: wire up football stats -- box scores, game detail, client wrapper
```

---

## Task 8: Build + lint verification

- [ ] **Step 1: Run build**

Run: `npm run build`
Expected: successful build, no TypeScript errors

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no lint errors (or only pre-existing ones)

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: all existing tests pass

- [ ] **Step 4: Commit (if any lint fixes were needed)**

```
chore: fix lint issues from football stats integration
```
