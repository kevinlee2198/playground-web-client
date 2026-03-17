# Adversarial Review: Football Box Scores Implementation Plan

## Critical Issues

### 1. Computed columns reference fields that do not exist in the GraphQL schema (CRITICAL, Confidence: 98%)

**Problem:** The plan calls for computed columns "completionPercentage" (CMP%), "fieldGoalPercentage" (FG%), "puntAverage" (AVG), and "totalTackles" (TOT) in the table components. The plan's translation keys in Task 2 include `completionPercentage`, `fieldGoalPercentage`, `puntAverage`, and `totalTackles`. These fields do not exist on the `FootballOffensiveStats`, `FootballDefensiveStats`, or `FootballSpecialTeamsStats` schema types.

For basketball, `fieldGoalPercentage`, `threePointerPercentage`, etc. are server-computed fields that exist on the `BasketballBoxScore` type (schema lines 2646-2655). For football, the schema has no such computed fields anywhere in the offensive, defensive, or special teams types (schema lines 2762-2782, 2891-2908, 3011-3029).

**Impact:** If the implementation tries to fetch these fields from the server, the GraphQL query will fail. If it tries to display them as accessor columns (like `accessorKey: "completionPercentage"`), the value will always be undefined because the node type doesn't have that field.

The plan is ambiguous about whether these are client-side computed columns vs. server fields. Task 4 Step 2 mentions a `madeAttemptedColumn` helper for `completions/passAttempts`, Task 5 Step 2 mentions "a computed totalTackles column: soloTackles + assistedTackles", and Task 6 Step 2 mentions "computed FG% and punt average columns." These all need to be explicitly implemented as client-side computed columns (using TanStack Table's `id` + custom cell renderer pattern, not `accessorKey`), and they must NOT be included in the GraphQL queries in Task 7.

**Fix:**
1. The plan should explicitly state that `completionPercentage`, `fieldGoalPercentage`, `puntAverage`, and `totalTackles` are client-side computed columns. They should use the `id` property (not `accessorKey`) and a custom `cell` renderer that performs the calculation, e.g.:
```ts
{
  id: "completionPercentage",
  header: t("completionPercentage"),
  cell: ({ row }) => {
    const comp = row.original.completions;
    const att = row.original.passAttempts;
    if (comp == null || att == null || att === 0) return "-";
    return format.number(comp / att, { style: "percent", maximumFractionDigits: 1 });
  },
}
```
2. Division-by-zero must be guarded (when attempts === 0).
3. These fields must NOT appear in the `RESPONSE_FIELDS` of the server actions or the page queries.

---

### 2. Plan references `SaveFootballOffensiveStatsResponse` as the `__typeName` but the schema mutation returns `SaveFootballOffensiveStatsResult` union (CRITICAL, Confidence: 95%)

**Problem:** In Task 3, the plan states:

> The response type names (from schema) are:
> - `SaveFootballOffensiveStatsResponse` (field: `footballOffensiveStats`)

This is correct for the `__typeName` inside the `__on` inline fragment, but the plan never explicitly shows the `__on` structure for the server actions. The implementer needs to use the `SaveFootballOffensiveStatsResponse` as the `__typeName` in the `__on` fragment (matching the existing pattern in `pickleball-stats-actions.ts` line 82), and `"SaveFootballOffensiveStatsResponse"` as the second argument to `extractMutationResult`. This is a documentation clarity issue rather than a strict error -- the existing pattern does this correctly and the plan says "follow pattern exactly." However, the plan lists these names under "response type names" without showing their usage, which risks confusion with the `*Result` union type names.

**Impact:** If the implementer confuses `SaveFootballOffensiveStatsResult` (the union) with `SaveFootballOffensiveStatsResponse` (the success member) and uses the wrong name in `extractMutationResult`, the mutation will always report failure.

**Fix:** The plan should include a concrete code example for at least one server action function (e.g., `saveFootballOffensiveStats`) showing the full `__on` structure and `extractMutationResult` call, just as the existing actions files do. Alternatively, add a note: "Use `*Response` (not `*Result`) as the `__typeName` in inline fragments and as the `successTypeName` argument to `extractMutationResult`."

---

## High Issues

### 3. `GameBoxScoresProps` interface needs `boxScores` to become optional or restructured (HIGH, Confidence: 95%)

**Problem:** The current `GameBoxScoresProps` interface (file: `/home/kevinlee/workspace/playground/playground-web-client/src/components/game/game-box-scores.tsx`, line 16-20) requires `boxScores: { node: BasketballBoxScoreNode }[]` as a mandatory prop:

```ts
interface GameBoxScoresProps {
  game: GameDetail;
  boxScores: { node: BasketballBoxScoreNode }[];
  pickleballStats?: { node: PickleballStatisticsNode }[];
}
```

The plan (Task 7 Step 1) says to add 3 new optional props for football but does not mention making `boxScores` optional or restructuring the interface. When calling `<GameBoxScores>` for a football game from `game-detail-client.tsx`, the caller will still need to pass `boxScores` even though it is irrelevant for football. Currently, `game-detail-client.tsx` always passes `state.boxScores` (line 176), which comes from the live reducer initialized with basketball box scores. For a football game, `initialBoxScores` will be an empty array (since the page only fetches basketball data for basketball games), so it will technically work -- but this is fragile and confusing.

**Impact:** The current design "works" because `boxScores` defaults to `[]` for non-basketball games, and the `game-box-scores.tsx` component checks `game.sportType` before rendering. But it makes the interface dishonest -- requiring a basketball-specific prop for all sports. As more sports are added, this becomes increasingly messy.

**Fix:** The plan should either:
1. Make `boxScores` optional: `boxScores?: { node: BasketballBoxScoreNode }[]` and update the usage to default to `[]`, OR
2. Document explicitly that `boxScores` will receive `[]` for non-basketball games and why this is acceptable.

---

### 4. Ambiguous "YDS"/"TD" column headers appear 3 times each in offensive table (HIGH, Confidence: 92%)

**Problem:** In the plan's Task 2, the offensive stats translations have multiple keys that map to the same abbreviation:

- `passingYards: "YDS"`, `rushingYards: "YDS"`, `receivingYards: "YDS"` -- all map to "YDS"
- `passingTouchdowns: "TD"`, `rushingTouchdowns: "TD"`, `receivingTouchdowns: "TD"` -- all map to "TD"

While this is technically valid for i18n (duplicate values are fine; keys are distinct), this means the column headers in the offensive stats table will show multiple columns with identical "YDS" or "TD" headers, making it impossible for users to distinguish them without context.

In the existing basketball pattern, each field has a unique abbreviation (PTS, AST, REB, STL, BLK, etc.). Football's structure is fundamentally different because it groups stats by phase (passing/rushing/receiving), and the same stat concept (yards, touchdowns) appears multiple times.

**Impact:** Users will see a table with 3 columns labeled "YDS" and 3 columns labeled "TD" and will not know which is which. This is a UX problem, not a runtime error.

**Fix:** Use disambiguated abbreviations:
- `passingYards: "PASS YDS"`, `rushingYards: "RUSH YDS"`, `receivingYards: "REC YDS"`
- `passingTouchdowns: "PASS TD"`, `rushingTouchdowns: "RUSH TD"`, `receivingTouchdowns: "REC TD"`

Alternatively, if the table will use sub-sectioned column group headers (Passing / Rushing / Receiving), then "YDS" and "TD" are fine within each group. But the plan's table design (Task 4 Step 2) does not mention column group headers -- it describes a flat TanStack Table. The sub-sections with `<h4>` headers are only in the form component (Task 4 Step 1).

---

## Medium Issues

### 5. Missing `"player"` translation key under `game.boxScore` (MEDIUM, Confidence: 85%)

**Problem:** The existing table uses `boxScoreT("player")` (file: `/home/kevinlee/workspace/playground/playground-web-client/src/components/game/pickleball-stats-table.tsx`, line 198) for the player column header. However, there is no `"player"` key under `game.boxScore` in `messages/en.json` (lines 290-335). This is an existing bug that the football table components will inherit if they follow the same pattern.

Basketball's table uses a hardcoded `"Player"` string instead (file: `/home/kevinlee/workspace/playground/playground-web-client/src/components/game/basketball-box-score-table.tsx`, line 253).

**Impact:** `next-intl` may render the raw key path or an error indicator instead of "Player" as the column header. The football tables will have the same issue if they follow the pattern.

**Fix:** Add `"player": "Player"` under `game.boxScore` in `messages/en.json` alongside the other shared keys. This fixes the existing bug and ensures football tables work correctly. The plan's Task 2 should include this key.

---

### 6. Plan does not address empty-state rendering for individual football categories (MEDIUM, Confidence: 80%)

**Problem:** For football, a player might have offensive stats but no defensive stats. The plan renders 3 separate sections with `groupByTeam` for each. If a team has no defensive stats (e.g., the `defGroups` array has entries but each team's `boxScores` is empty), each team section will render the table component's "No box scores recorded yet" empty state.

This means for a game where only offensive stats are entered, users will see:
- **Offense**: [table with data]
- **Defense**: Team A: "No box scores recorded yet", Team B: "No box scores recorded yet"
- **Special Teams**: Team A: "No box scores recorded yet", Team B: "No box scores recorded yet"

This is visually noisy.

**Impact:** Not a crash, but a poor UX with redundant empty states for categories that have not been used.

**Fix:** Consider hiding entire category sections when no stats exist across all teams, e.g.:
```ts
{footballOffensiveStats && footballOffensiveStats.length > 0 && (
  /* render offensive section */
)}
```

---

### 7. Ambiguity about CMP% as separate column vs. part of CMP/ATT (MEDIUM, Confidence: 88%)

**Problem:** The plan adds a translation key `game.boxScore.football.offensive.completionPercentage: "CMP%"` in Task 2, and Task 4 Step 2 references a `madeAttemptedColumn` helper for showing "CMP/ATT" together. But the plan does not explicitly state whether the table should show both a combined "CMP/ATT" column AND a separate "CMP%" column, or just one of them.

**Impact:** The implementer might not know whether to include a separate CMP% column, include it as part of the CMP/ATT column, or skip it entirely.

**Fix:** Clarify in Task 4 Step 2 whether the table should show: (a) a "CMP/ATT" column AND a separate "CMP%" computed column, or (b) only the combined "CMP/ATT" column.

---

### 8. Plan does not mention the `game-live-reducer` implications for football (MEDIUM, Confidence: 85%)

**Problem:** The `GameDetailClient` component (file: `/home/kevinlee/workspace/playground/playground-web-client/src/components/game/live/game-detail-client.tsx`, lines 52-56) passes `initialBoxScores` to `createInitialState`:

```ts
const [state, dispatch] = useReducer(
  gameLiveReducer,
  null,
  () => createInitialState(game, initialBoxScores),
);
```

And on line 62, it syncs:
```ts
dispatch({ type: "SYNC_FROM_SERVER", game, boxScores: initialBoxScores });
```

For football, there are 3 stat arrays instead of 1 `boxScores` array. The plan says football stats "do NOT need live reducer support" and are "passed as static initial data, same as pickleball stats." This is fine, but the plan should note that `initialBoxScores` will still be passed as an empty `[]` for football games, and the reducer will initialize with empty box scores. The plan (Task 7 Step 2) says to add 3 new props to `GameDetailClientProps` and pass them through, but does not discuss the `initialBoxScores` prop.

**Impact:** Low risk of runtime failure. A future developer might wonder why `initialBoxScores` is required for football games or try to remove it, breaking basketball.

**Fix:** Add a note in Task 7 Step 2: "For football games, `initialBoxScores` will be `[]` (the existing default from page.tsx). No changes needed to the reducer or SYNC_FROM_SERVER action."

---

## Summary

| # | Issue | Severity | Confidence | Impact |
|---|-------|----------|------------|--------|
| 1 | Computed columns (CMP%, FG%, punt AVG, total tackles) are not server fields -- need client-side computation and division-by-zero guards | Critical | 98% | Queries will fail or columns show undefined |
| 2 | `*Response` vs `*Result` naming confusion in server actions | Critical | 95% | Mutations always report failure if wrong name used |
| 3 | `GameBoxScoresProps.boxScores` is a required prop typed to basketball | High | 95% | Fragile interface; works only because empty array fallthrough |
| 4 | Ambiguous "YDS"/"TD" column headers appear 3 times each in offensive table | High | 92% | Users cannot distinguish passing/rushing/receiving yards or TDs |
| 5 | Missing `"player"` translation key under `game.boxScore` | Medium | 85% | Column header renders raw key |
| 6 | Empty categories show redundant empty states | Medium | 80% | Visual noise |
| 7 | Ambiguity about CMP% as separate column vs. part of CMP/ATT | Medium | 88% | Implementer confusion |
| 8 | `game-live-reducer` implications undocumented for football | Medium | 85% | Future developer confusion |

## Recommended Fixes

### For Critical Issue #1: Computed Columns

Add to Task 4 Step 2, Task 5 Step 2, and Task 6 Step 2 an explicit code pattern for computed columns. Example for offensive `completionPercentage`:

```ts
// This is a CLIENT-SIDE computed column. It does NOT exist in the schema.
{
  id: "completionPercentage",
  header: t("completionPercentage"),
  cell: ({ row }) => {
    const completions = row.original.completions;
    const attempts = row.original.passAttempts;
    if (completions == null || attempts == null || attempts === 0) {
      return <span className="tabular-nums">-</span>;
    }
    return (
      <span className="tabular-nums">
        {format.number(completions / attempts, {
          style: "percent",
          maximumFractionDigits: 1,
        })}
      </span>
    );
  },
}
```

Same pattern for defensive `totalTackles` (sum, not percentage), special teams `fieldGoalPercentage` and `puntAverage`.

### For Critical Issue #2: Server Action Template

Add a concrete code example in Task 3 for one of the server actions, showing the full mutation structure:

```ts
const response = await authMutate({
  saveFootballOffensiveStats: {
    __args: { input: mutationInput },
    __typename: true,
    __on: [
      {
        __typeName: "SaveFootballOffensiveStatsResponse", // <-- the Response, not Result
        footballOffensiveStats: OFFENSIVE_RESPONSE_FIELDS,
      },
      errorFragment,
    ],
  },
});

const result = extractMutationResult(
  response.data.saveFootballOffensiveStats,
  "SaveFootballOffensiveStatsResponse" // <-- must match __typeName exactly
);
```

### For High Issue #4: Disambiguate Column Headers

Update Task 2 translations to use disambiguated abbreviations:

```json
"offensive": {
  "passingYards": "PASS YDS",
  "rushingYards": "RUSH YDS",
  "receivingYards": "REC YDS",
  "passingTouchdowns": "PASS TD",
  "rushingTouchdowns": "RUSH TD",
  "receivingTouchdowns": "REC TD"
}
```
