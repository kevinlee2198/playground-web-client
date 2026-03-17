# Tennis Box Scores Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-player tennis match statistics (serving, returning, general) to the game detail page, following the same single-category pattern used by pickleball box scores.

**Architecture:** Tennis has a single stat category per player per game covering serving, returning, and general play. This follows the pickleball pattern exactly: a `TennisStatisticsNode` response type, `SaveTennisStatisticsInput` / `SaveTennisStatisticsData` input types, a `TennisStatsTable` component with TanStack Table + sortable columns + sticky player column + leader highlighting, a `TennisStatsForm` dialog for editing, and server actions wrapping `authMutate`. The `GameBoxScores` orchestrator adds tennis to its sport guard and renders the table in collapsible team sections. The game detail page fetches tennis stats and passes them through the client wrapper.

**Tech Stack:** TypeScript, React, Next.js App Router, TanStack Table, TanStack Form, json-to-graphql-query, Vitest

**Key design notes:**
- Tennis is individual (Singles) or team-of-2 (Doubles), so the table shows 2 or 4 players.
- **`groupByTeam()` bug for Singles:** The existing `groupByTeam()` function in `game-box-scores.tsx` only handles `TeamInstance` participants. For tennis Singles, participants are `IndividualParticipant` nodes, so the function returns an empty array and no stats render. This must be fixed as part of Task 6.
- Stats have made/attempted pairs for serving and returning: `firstServesIn/firstServeAttempts`, `firstServePointsWon/firstServePointsPlayed`, `secondServePointsWon/secondServePointsPlayed`, `breakPointsConverted/breakPointsFaced`, `returnPointsWon/returnPointsPlayed`.
- Computed columns (1st serve %, 1st serve pts won %, 2nd serve pts won %, break pts %, return pts won %) do NOT exist in the schema. They must be **client-side computed** using TanStack Table's `id` + custom `cell` pattern (not `accessorKey`). Always guard division-by-zero. All computed/combined columns must set `enableSorting: false`.
- Server action mutations use `*Response` as `__typeName` in `__on` fragments and as the `successTypeName` arg to `extractMutationResult`. Do NOT confuse with `*Result` (the union type name).
- Tennis stats are static props (like pickleball), not managed by the live reducer. `initialBoxScores` will be `[]` for tennis games -- no reducer changes needed.
- The form groups fields into 3 sections: Serving, Returning, General.
- **Translation key split:** The table uses abbreviated combined-column headers (e.g., `"1ST IN"` for firstServesIn/firstServeAttempts), while the form needs keys for every individual raw schema field. Both are under `game.boxScore.tennis` -- table columns use keys like `firstServeIn` (combined header), while the form uses keys like `firstServesIn`, `firstServeAttempts` (individual raw field names).

**Reference files (follow these patterns exactly):**
- Types: `src/lib/types/stats/pickleball.ts`
- Table: `src/components/game/pickleball-stats-table.tsx`
- Form: `src/components/game/pickleball-stats-form.tsx`
- Actions: `src/app/[locale]/game/pickleball-stats-actions.ts`
- Orchestrator: `src/components/game/game-box-scores.tsx`
- Page: `src/app/[locale]/game/[id]/page.tsx`
- Client wrapper: `src/components/game/live/game-detail-client.tsx`

**Schema reference:** Tennis statistics are defined in `schema.graphqls` under the "Tennis Statistics" section (~line 3236). Key GraphQL types:
- Query: `tennisStatistics(input: TennisStatisticsFilterInput!, sort: [TennisStatisticsSortInput!], first: Int, after: String, last: Int, before: String): TennisStatisticsConnection!`
- Mutations: `saveTennisStatistics(input: SaveTennisStatisticsInput!): SaveTennisStatisticsResult!` and `saveTennisStatisticsBulk(input: SaveTennisStatisticsBulkInput!): SaveTennisStatisticsBulkResult!`
- Response types: `SaveTennisStatisticsResponse` (field: `tennisStatistics`), `SaveTennisStatisticsBulkResponse` (field: `statistics`)
- Error union members: `GameNotFoundError`, `InvalidSportTypeError`

**GitHub Issue:** https://github.com/kevinlee2198/playground-web-client/issues/64

---

## File Map

### New files
| File | Responsibility |
|------|----------------|
| `src/lib/types/stats/tennis.ts` | Node + save input types for tennis statistics |
| `src/app/[locale]/game/tennis-stats-actions.ts` | Server actions: save single + bulk |
| `src/components/game/tennis-stats-table.tsx` | TanStack Table for tennis stats with edit form trigger |
| `src/components/game/tennis-stats-form.tsx` | Dialog form for editing a player's tennis stats |

### Modified files
| File | Change |
|------|--------|
| `messages/en.json` | Add `game.boxScore.tennis.*` keys for stat abbreviations and section labels |
| `src/components/game/game-box-scores.tsx` | Add `SportType.TENNIS` to guard, accept tennis stat prop, render table |
| `src/app/[locale]/game/[id]/page.tsx` | Fetch tennis stats, pass to client |
| `src/components/game/live/game-detail-client.tsx` | Accept + pass through tennis stat prop |

---

## Task 1: TypeScript types

**Files:**
- Create: `src/lib/types/stats/tennis.ts`

- [ ] **Step 1: Create tennis stat types**

Follow `src/lib/types/stats/pickleball.ts` pattern exactly. Create 3 interfaces for the single stat category.

```ts
import type { BoxScoreNode, SaveBoxScoreInput } from "./base";

/**
 * Tennis match statistics entry returned from the server.
 */
export interface TennisStatisticsNode extends BoxScoreNode {
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
 * Input for saving tennis statistics.
 * Patch semantics:
 * - Omit a field (undefined) to leave it unchanged
 * - Set to null to clear the value
 * - Set to a number to update
 */
export interface SaveTennisStatisticsInput extends SaveBoxScoreInput {
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
 * Per-player statistics data for bulk save (gameId is at parent level).
 * Independent interface mirroring schema -- not derived from SaveTennisStatisticsInput.
 */
export interface SaveTennisStatisticsData {
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

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: no errors related to tennis types

- [ ] **Step 3: Commit**

```
feat: add tennis stats TypeScript types
```

---

## Task 2: Translations

**Files:**
- Modify: `messages/en.json`

- [ ] **Step 1: Add tennis stat abbreviation keys**

Add under `game.boxScore.tennis` with stat abbreviations and section labels. Insert after the existing `pickleball` block (after line 315) and before the `basketball` block.

```json
"tennis": {
  "aces": "ACE",
  "doubleFaults": "DF",
  "winners": "WIN",
  "unforcedErrors": "UE",
  "totalPointsWon": "PTS",
  "firstServesIn": "1st In",
  "firstServeAttempts": "1st Att",
  "firstServePointsPlayed": "1st Pts Played",
  "secondServePointsPlayed": "2nd Pts Played",
  "breakPointsFaced": "BP Faced",
  "returnPointsPlayed": "Ret Played",
  "columns": {
    "firstServeIn": "1ST IN",
    "firstServePercentage": "1ST%",
    "firstServePointsWon": "1ST W",
    "firstServePointsWonPercentage": "1ST W%",
    "secondServePointsWon": "2ND W",
    "secondServePointsWonPercentage": "2ND W%",
    "breakPointsConverted": "BP WON",
    "breakPointsPercentage": "BP%",
    "returnPointsWon": "RET W",
    "returnPointsWonPercentage": "RET W%"
  },
  "firstServePointsWon": "1st Serve W",
  "secondServePointsWon": "2nd Serve W",
  "breakPointsConverted": "BP Won",
  "returnPointsWon": "Ret Won",
  "sections": {
    "serving": "Serving",
    "returning": "Returning",
    "general": "General"
  }
}
```

Translation key structure:
- **Top-level keys** (`aces`, `doubleFaults`, `firstServesIn`, `firstServeAttempts`, etc.) -- used by the **form** as individual field labels. All 15 raw schema field names must have keys here.
- **`columns.*` keys** -- used by the **table** for combined column headers (e.g., `columns.firstServeIn` = "1ST IN" for the combined firstServesIn/firstServeAttempts column) and computed percentage column headers.
- Keys like `aces`, `doubleFaults`, `winners`, `unforcedErrors`, `totalPointsWon` are shared between table and form since they represent the same single field in both contexts.
- Keys like `firstServePointsWon` appear at both top level ("1st Serve W" for form label) and under `columns` ("1ST W" for table header) because they serve different display purposes.

- [ ] **Step 2: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json', 'utf8')); console.log('Valid JSON')"`
Expected: "Valid JSON"

- [ ] **Step 3: Commit**

```
feat: add tennis stats translation keys
```

---

## Task 3: Server actions

**Files:**
- Create: `src/app/[locale]/game/tennis-stats-actions.ts`

- [ ] **Step 1: Create server actions**

Follow `src/app/[locale]/game/pickleball-stats-actions.ts` pattern exactly.

The GraphQL mutation names (from schema) are:
- `saveTennisStatistics` / `saveTennisStatisticsBulk`

The response type names (from schema) are:
- `SaveTennisStatisticsResponse` (field: `tennisStatistics`)
- `SaveTennisStatisticsBulkResponse` (field: `statistics`)

The bulk input structure (from schema) is:
- `SaveTennisStatisticsBulkInput { gameId, statistics: [SaveTennisStatisticsData!]! }`

```ts
"use server";

import { errorFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";
import type { SaveTennisStatisticsData, SaveTennisStatisticsInput } from "@/lib/types/stats/tennis";
import { revalidatePath } from "next/cache";

interface TennisStatsActionResult {
  success: boolean;
  statisticsId?: string;
  statisticsIds?: string[];
  errorType?: string;
  message?: string;
}

const STAT_FIELDS = [
  "aces",
  "doubleFaults",
  "firstServesIn",
  "firstServeAttempts",
  "firstServePointsWon",
  "firstServePointsPlayed",
  "secondServePointsWon",
  "secondServePointsPlayed",
  "breakPointsConverted",
  "breakPointsFaced",
  "returnPointsWon",
  "returnPointsPlayed",
  "winners",
  "unforcedErrors",
  "totalPointsWon",
] as const;

function buildStatFields(
  data: SaveTennisStatisticsData,
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
  aces: true,
  doubleFaults: true,
  firstServesIn: true,
  firstServeAttempts: true,
  firstServePointsWon: true,
  firstServePointsPlayed: true,
  secondServePointsWon: true,
  secondServePointsPlayed: true,
  breakPointsConverted: true,
  breakPointsFaced: true,
  returnPointsWon: true,
  returnPointsPlayed: true,
  winners: true,
  unforcedErrors: true,
  totalPointsWon: true,
} as const;

/**
 * Save a single set of tennis statistics
 */
export async function saveTennisStatistics(
  input: SaveTennisStatisticsInput,
): Promise<TennisStatsActionResult> {
  try {
    const mutationInput: Record<string, unknown> = {
      playerId: input.playerId,
      gameId: input.gameId,
      ...buildStatFields(input),
    };

    const response = await authMutate({
      saveTennisStatistics: {
        __args: { input: mutationInput },
        __typename: true,
        __on: [
          {
            __typeName: "SaveTennisStatisticsResponse",
            tennisStatistics: RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.saveTennisStatistics, "SaveTennisStatisticsResponse");
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statisticsId: result.data.tennisStatistics.id };
  } catch (error) {
    console.error("Failed to save tennis statistics:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save tennis statistics" };
  }
}

/**
 * Save multiple sets of tennis statistics
 */
export async function saveTennisStatisticsBulk(
  gameId: number,
  statistics: SaveTennisStatisticsData[],
): Promise<TennisStatsActionResult> {
  try {
    if (statistics.length === 0) {
      return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: "No statistics provided" };
    }

    const statisticsInput = statistics.map((stat) => ({
      playerId: stat.playerId,
      ...buildStatFields(stat),
    }));

    const response = await authMutate({
      saveTennisStatisticsBulk: {
        __args: { input: { gameId, statistics: statisticsInput } },
        __typename: true,
        __on: [
          {
            __typeName: "SaveTennisStatisticsBulkResponse",
            statistics: RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.saveTennisStatisticsBulk, "SaveTennisStatisticsBulkResponse");
    if (!result.success) return result;

    const statisticsIds = result.data.statistics.map(
      (stat: { id: string }) => stat.id,
    );

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statisticsIds };
  } catch (error) {
    console.error("Failed to save tennis statistics bulk:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save tennis statistics" };
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: no errors

- [ ] **Step 3: Commit**

```
feat: add tennis stats server actions
```

---

## Task 4: Tennis stats form

**Files:**
- Create: `src/components/game/tennis-stats-form.tsx`

- [ ] **Step 1: Create the tennis stats edit form**

Follow `src/components/game/pickleball-stats-form.tsx` pattern exactly.

Key differences from pickleball:
- Import `saveTennisStatistics` from the tennis actions
- Import `TennisStatisticsNode` and `SaveTennisStatisticsInput` from tennis types
- `STAT_FIELDS` array has the 15 tennis stat field names
- Group fields into 3 sections with `TypographySmall` headers using `tennisT("sections.serving")` etc:
  - **Serving**: aces, doubleFaults, firstServesIn, firstServeAttempts, firstServePointsWon, firstServePointsPlayed, secondServePointsWon, secondServePointsPlayed
  - **Returning**: breakPointsConverted, breakPointsFaced, returnPointsWon, returnPointsPlayed
  - **General**: winners, unforcedErrors, totalPointsWon

```tsx
"use client";

import { saveTennisStatistics } from "@/app/[locale]/game/tennis-stats-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { FormTextField } from "@/components/ui/form-field";
import { TypographySmall } from "@/components/ui/typography";
import type {
  TennisStatisticsNode,
  SaveTennisStatisticsInput,
} from "@/lib/types/stats/tennis";
import { nullToUndefined, undefinedToNull } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

const SERVING_FIELDS = [
  "aces",
  "doubleFaults",
  "firstServesIn",
  "firstServeAttempts",
  "firstServePointsWon",
  "firstServePointsPlayed",
  "secondServePointsWon",
  "secondServePointsPlayed",
] as const;

const RETURNING_FIELDS = [
  "breakPointsConverted",
  "breakPointsFaced",
  "returnPointsWon",
  "returnPointsPlayed",
] as const;

const GENERAL_FIELDS = [
  "winners",
  "unforcedErrors",
  "totalPointsWon",
] as const;

const STAT_FIELDS = [
  ...SERVING_FIELDS,
  ...RETURNING_FIELDS,
  ...GENERAL_FIELDS,
] as const;

type StatField = (typeof STAT_FIELDS)[number];

interface TennisStatsFormProps {
  gameId: number;
  initialData: TennisStatisticsNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function buildDefaultValues(
  data: TennisStatisticsNode,
): Record<StatField, number | undefined> {
  const result = {} as Record<StatField, number | undefined>;
  for (const field of STAT_FIELDS) {
    result[field] = nullToUndefined(data[field]);
  }
  return result;
}

function buildInput(
  value: Record<StatField, number | undefined>,
  playerId: number,
  gameId: number,
): SaveTennisStatisticsInput {
  const input: SaveTennisStatisticsInput = { playerId, gameId };
  for (const field of STAT_FIELDS) {
    input[field] = undefinedToNull(value[field]);
  }
  return input;
}

export function TennisStatsForm({
  gameId,
  initialData,
  open,
  onOpenChange,
}: TennisStatsFormProps) {
  const t = useTranslations();
  const tennisT = useTranslations("game.boxScore.tennis");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: buildDefaultValues(initialData),
    onSubmit: async ({ value }) => {
      setError(null);

      startTransition(async () => {
        const input = buildInput(value, initialData.player.id, gameId);
        const result = await saveTennisStatistics(input);

        if (result.success) {
          toast.success(t("game.success.boxScoresSaved"));
          onOpenChange(false);
        } else {
          setError(result.message || t("game.errors.boxScoreError"));
          toast.error(result.message || t("game.errors.boxScoreError"));
        }
      });
    },
  });

  const playerName = initialData.player.user.displayName;

  function renderFieldGroup(fields: readonly StatField[]) {
    return (
      <FieldGroup className="sm:grid sm:grid-cols-2">
        {fields.map((field) => (
          <form.Field key={field} name={field}>
            {(fieldApi) => (
              <FormTextField
                field={fieldApi}
                label={tennisT(field)}
                type="number"
                disabled={isPending}
                placeholder="0"
              />
            )}
          </form.Field>
        ))}
      </FieldGroup>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("game.boxScore.editBoxScores")} - {playerName}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <TypographySmall>{tennisT("sections.serving")}</TypographySmall>
            {renderFieldGroup(SERVING_FIELDS)}
          </div>

          <div className="space-y-2">
            <TypographySmall>{tennisT("sections.returning")}</TypographySmall>
            {renderFieldGroup(RETURNING_FIELDS)}
          </div>

          <div className="space-y-2">
            <TypographySmall>{tennisT("sections.general")}</TypographySmall>
            {renderFieldGroup(GENERAL_FIELDS)}
          </div>

          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("game.actions.saving") : t("actions.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: no errors

- [ ] **Step 3: Commit**

```
feat: add tennis stats form
```

---

## Task 5: Tennis stats table

**Files:**
- Create: `src/components/game/tennis-stats-table.tsx`

- [ ] **Step 1: Create the tennis stats table**

Follow `src/components/game/pickleball-stats-table.tsx` pattern exactly.

Key differences from pickleball:
- Import `saveTennisStatistics` from the tennis actions
- Import `TennisStatisticsNode` from tennis types
- `HIGHLIGHTABLE_STATS`: `["aces", "totalPointsWon", "winners"]` (as specified in the issue)
- Default sort: `{ id: "totalPointsWon", desc: true }`
- Translation namespace: `game.boxScore.tennis`
- Import `useFormatter` from `next-intl` for percentage formatting
- Import and render `TennisStatsForm` when editing

**Column layout** -- tennis stats have many made/attempted pairs that should use combined columns showing "X/Y" format, plus client-side computed percentage columns:

1. **Player** (sticky first column)
2. **ACE** -- highlightable, sortable (`aces`)
3. **DF** -- plain stat (`doubleFaults`)
4. **1ST IN** -- combined `firstServesIn/firstServeAttempts` (e.g., "45/60")
5. **1ST%** -- computed: `firstServesIn / firstServeAttempts`
6. **1ST W** -- combined `firstServePointsWon/firstServePointsPlayed` (e.g., "30/45")
7. **1ST W%** -- computed: `firstServePointsWon / firstServePointsPlayed`
8. **2ND W** -- combined `secondServePointsWon/secondServePointsPlayed`
9. **2ND W%** -- computed: `secondServePointsWon / secondServePointsPlayed`
10. **BP WON** -- combined `breakPointsConverted/breakPointsFaced`
11. **BP%** -- computed: `breakPointsConverted / breakPointsFaced`
12. **RET W** -- combined `returnPointsWon/returnPointsPlayed`
13. **RET W%** -- computed: `returnPointsWon / returnPointsPlayed`
14. **WIN** -- highlightable, sortable (`winners`)
15. **UE** -- plain stat (`unforcedErrors`)
16. **PTS** -- highlightable, sortable (`totalPointsWon`)
17. **[Edit]** -- pencil icon (only if canEdit)

**Add player functionality:** The table must include `handleAddPlayerStats`, `addPlayerControls`, `selectedPlayerId` state, and `playersWithoutStats` memo -- all adapted from the pickleball table to call `saveTennisStatistics` instead of `savePickleballStatistics`. The "add player stats" dropdown allows adding an empty row for a player who doesn't have stats yet. Copy the full pattern from `pickleball-stats-table.tsx` lines 112-280.

**Translation keys for column headers:** The table uses `useTranslations("game.boxScore.tennis.columns")` (scoped to `columns` sub-namespace) for combined/computed column headers, and `useTranslations("game.boxScore.tennis")` for simple stat columns (`aces`, `doubleFaults`, `winners`, `unforcedErrors`, `totalPointsWon`).

**Made/attempted combined column helper** (define inside the `useMemo` columns callback):

```tsx
function madeAttemptedColumn(
  headerKey: string,
  madeKey: keyof TennisStatisticsNode & string,
  attemptedKey: keyof TennisStatisticsNode & string,
): ColumnDef<TennisStatisticsNode> {
  return {
    id: headerKey,
    header: colT(headerKey),
    enableSorting: false,
    cell: ({ row }) => {
      const made = row.original[madeKey] as number | null;
      const attempted = row.original[attemptedKey] as number | null;
      if (made == null && attempted == null) {
        return <span className="tabular-nums">-</span>;
      }
      return (
        <span className="tabular-nums">
          {made ?? 0}/{attempted ?? 0}
        </span>
      );
    },
  };
}
```

**Computed percentage column helper** (define inside the `useMemo` columns callback):

```tsx
function percentageColumn(
  id: string,
  headerKey: string,
  madeKey: keyof TennisStatisticsNode & string,
  attemptedKey: keyof TennisStatisticsNode & string,
): ColumnDef<TennisStatisticsNode> {
  return {
    id,
    header: colT(headerKey),
    enableSorting: false,
    cell: ({ row }) => {
      const made = row.original[madeKey] as number | null;
      const attempted = row.original[attemptedKey] as number | null;
      if (made == null || attempted == null || attempted === 0) {
        return <span className="tabular-nums">-</span>;
      }
      return (
        <span className="tabular-nums">
          {format.number(made / attempted, { style: "percent", maximumFractionDigits: 1 })}
        </span>
      );
    },
  };
}
```

Note: `colT` is `useTranslations("game.boxScore.tennis.columns")` while `t` is `useTranslations("game.boxScore.tennis")`.

The full column array:

```tsx
return [
  // Player column (sticky)
  {
    accessorKey: "player",
    header: boxScoreT("player"),
    cell: ({ row }) => {
      const player = row.original.player;
      return (
        <div className="flex items-center gap-2">
          <PlayerAvatar player={player} size="sm" loading="lazy" />
          <span className="truncate">{player.user.displayName}</span>
        </div>
      );
    },
    enableSorting: false,
  },
  // Serving
  highlightableStatColumn("aces"),
  plainStatColumn("doubleFaults"),
  madeAttemptedColumn("firstServeIn", "firstServesIn", "firstServeAttempts"),          // uses colT
  percentageColumn("firstServePercentage", "firstServePercentage", "firstServesIn", "firstServeAttempts"),
  madeAttemptedColumn("firstServePointsWon", "firstServePointsWon", "firstServePointsPlayed"),
  percentageColumn("firstServePointsWonPercentage", "firstServePointsWonPercentage", "firstServePointsWon", "firstServePointsPlayed"),
  madeAttemptedColumn("secondServePointsWon", "secondServePointsWon", "secondServePointsPlayed"),
  percentageColumn("secondServePointsWonPercentage", "secondServePointsWonPercentage", "secondServePointsWon", "secondServePointsPlayed"),
  // Returning
  madeAttemptedColumn("breakPointsConverted", "breakPointsConverted", "breakPointsFaced"),
  percentageColumn("breakPointsPercentage", "breakPointsPercentage", "breakPointsConverted", "breakPointsFaced"),
  madeAttemptedColumn("returnPointsWon", "returnPointsWon", "returnPointsPlayed"),
  percentageColumn("returnPointsWonPercentage", "returnPointsWonPercentage", "returnPointsWon", "returnPointsPlayed"),
  // General
  highlightableStatColumn("winners"),
  plainStatColumn("unforcedErrors"),
  highlightableStatColumn("totalPointsWon"),
  // Edit action
  ...(canEdit ? [{ id: "actions", header: "", cell: ({ row }: { row: { original: TennisStatisticsNode } }) => (
    <Button variant="ghost" size="icon" onClick={() => setEditingStat(row.original)}>
      <Pencil className="h-4 w-4" />
      <span className="sr-only">Edit</span>
    </Button>
  ) }] : []),
];
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: no errors

- [ ] **Step 3: Commit**

```
feat: add tennis stats table with sortable columns and leader highlighting
```

---

## Task 6: Wire up GameBoxScores + game detail page + client wrapper

**Files:**
- Modify: `src/components/game/game-box-scores.tsx`
- Modify: `src/app/[locale]/game/[id]/page.tsx`
- Modify: `src/components/game/live/game-detail-client.tsx`

- [ ] **Step 1: Fix `groupByTeam()` to handle individual participants**

**This is critical for tennis Singles support.** The existing `groupByTeam()` function (lines 41-69) only handles `TeamInstance` participants. For tennis Singles (and pickleball Singles), participants are `IndividualParticipant` nodes, so the function returns an empty array and no stats render.

Add a fallback after the `TeamInstance` loop to handle individual participants:

```ts
function groupByTeam<T extends BoxScoreNode>(
  game: GameDetail,
  allBoxScores: { node: T }[],
): TeamBoxScoreGroup<T>[] {
  const teams: {
    name: string;
    playerIds: Set<number>;
    players: PlayerRef[];
  }[] = [];

  for (const edge of game.participants.edges) {
    if (edge.node.__typename === "TeamInstance") {
      const team = edge.node as TeamInstanceDetail;
      teams.push({
        name: team.name,
        playerIds: new Set(team.players.map((p) => p.id)),
        players: team.players,
      });
    }
  }

  // Handle individual participants (e.g., tennis/pickleball singles)
  if (teams.length === 0) {
    const individualPlayers: PlayerRef[] = [];
    for (const edge of game.participants.edges) {
      if (edge.node.__typename === "IndividualParticipant") {
        individualPlayers.push((edge.node as IndividualParticipantNode).player);
      }
    }
    if (individualPlayers.length > 0) {
      return [{
        teamName: t("game.boxScore.title"),
        players: individualPlayers,
        boxScores: allBoxScores,
      }];
    }
  }

  return teams.map((team) => ({
    teamName: team.name,
    players: team.players,
    boxScores: allBoxScores.filter((edge) =>
      team.playerIds.has(edge.node.player.id),
    ),
  }));
}
```

Note: `groupByTeam` is not a component, so it doesn't have access to `useTranslations()`. Pass the fallback label as a parameter, or use a constant like `"Players"`, or move the `t()` call to the component and pass the label string in. The simplest approach: add a `fallbackTeamName` parameter:

```ts
function groupByTeam<T extends BoxScoreNode>(
  game: GameDetail,
  allBoxScores: { node: T }[],
  fallbackTeamName: string,
): TeamBoxScoreGroup<T>[] {
```

Then at the call sites, pass `t("game.boxScore.title")`.

Also import `IndividualParticipantNode` from `@/lib/types/game`.

- [ ] **Step 2: Update `game-box-scores.tsx` component**

Current code at line 81-87 guards with:
```ts
if (
  game.sportType !== SportType.BASKETBALL &&
  game.sportType !== SportType.PICKLEBALL &&
  game.sportType !== SportType.FOOTBALL
) {
  return null;
}
```

Changes:
1. Add `SportType.TENNIS` to the allowed sports check (add `&& game.sportType !== SportType.TENNIS`)
2. Add new optional prop: `tennisStats?: { node: TennisStatisticsNode }[]`
3. Import `TennisStatisticsNode` from `@/lib/types/stats/tennis`
4. Import `TennisStatsTable` from `@/components/game/tennis-stats-table`
5. In `renderTable()`, add a case for `SportType.TENNIS` before the basketball fallback:

```tsx
if (game.sportType === SportType.TENNIS) {
  return (
    <TennisStatsTable
      {...sharedProps}
      boxScores={group.boxScores as { node: TennisStatisticsNode }[]}
    />
  );
}
```

6. Update the `teamGroups` logic to handle tennis. Pass `t("game.boxScore.title")` as `fallbackTeamName` to all `groupByTeam()` calls:

```tsx
const fallbackTeamName = t("game.boxScore.title");

const teamGroups =
  game.sportType === SportType.PICKLEBALL && pickleballStats
    ? groupByTeam(game, pickleballStats, fallbackTeamName)
    : game.sportType === SportType.TENNIS && tennisStats
      ? groupByTeam(game, tennisStats, fallbackTeamName)
      : groupByTeam(game, boxScores ?? [], fallbackTeamName);
```

Also update the football section's `groupByTeam()` calls to pass `fallbackTeamName`.

- [ ] **Step 2: Update `game-detail-client.tsx`**

1. Add new optional prop to `GameDetailClientProps`: `initialTennisStats?: { node: TennisStatisticsNode }[]`
2. Import `TennisStatisticsNode` from `@/lib/types/stats/tennis`
3. Pass it through to `<GameBoxScores>` as `tennisStats={initialTennisStats}`

- [ ] **Step 3: Update `page.tsx`**

Add a fetch block for tennis stats (same pattern as the pickleball block):

```tsx
import type { TennisStatisticsNode } from "@/lib/types/stats/tennis";

// ... after the pickleball block ...

let initialTennisStats: { node: TennisStatisticsNode }[] = [];
if (
  game.sportType === SportType.TENNIS &&
  game.gameStatus !== GameStatus.SCHEDULED
) {
  const tennisStatsResponse = await authQuery({
    tennisStatistics: {
      __args: { input: { gameIds: [game.id] }, first: 50 },
      edges: {
        node: {
          id: true,
          player: playerRefFragment,
          aces: true,
          doubleFaults: true,
          firstServesIn: true,
          firstServeAttempts: true,
          firstServePointsWon: true,
          firstServePointsPlayed: true,
          secondServePointsWon: true,
          secondServePointsPlayed: true,
          breakPointsConverted: true,
          breakPointsFaced: true,
          returnPointsWon: true,
          returnPointsPlayed: true,
          winners: true,
          unforcedErrors: true,
          totalPointsWon: true,
        },
      },
    },
  });
  initialTennisStats =
    tennisStatsResponse.data?.tennisStatistics?.edges ?? [];
}
```

Pass to `<GameDetailClient>`:
```tsx
<GameDetailClient
  game={game}
  initialBoxScores={initialBoxScores}
  initialPickleballStats={initialPickleballStats}
  initialFootballOffensiveStats={initialFootballOffensiveStats}
  initialFootballDefensiveStats={initialFootballDefensiveStats}
  initialFootballSpecialTeamsStats={initialFootballSpecialTeamsStats}
  initialTennisStats={initialTennisStats}
  playerId={playerId}
  canUpload={canUpload}
>
```

**IMPORTANT:** Only query stat fields that exist in the schema. Do NOT include computed fields (percentages). The query fields must match the `TennisStatistics` type in `schema.graphqls` exactly.

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: no errors

- [ ] **Step 5: Commit**

```
feat: wire up tennis stats -- box scores, game detail, client wrapper
```

---

## Task 7: Build + lint verification

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
chore: fix lint issues from tennis stats integration
```
