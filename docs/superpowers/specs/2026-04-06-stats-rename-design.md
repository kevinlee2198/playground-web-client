# Stats Package Rename — Implementation Doc

**Date:** 2026-04-06
**Status:** Draft

## Goal

Align the frontend with the renamed GraphQL schema (`schema.graphqls` diff) and make every identifier in the stats package — including internal/private names — consistent with the new convention.

**This is a bugfix, not just a refactor.** The frontend's runtime queries and mutations currently reference schema fields and types that no longer exist:

- `page.tsx` queries `basketballBoxScores`, `pickleballStatistics`, `tennisStatistics`, `volleyballStatistics` — all gone.
- `box-score-actions.ts` mutates `saveBasketballBoxScore` / `saveBasketballBoxScores` — gone.
- `pickleball-stats-actions.ts`, `tennis-stats-actions.ts`, `volleyball-stats-actions.ts` all mutate `save*Statistics` / `save*StatisticsBulk` with the `statistics: [...]` input field — gone.
- `use-game-subscription.ts` subscribes to `BoxScoreSavedEvent` with field `basketballBoxScores` — gone.

Stats save/fetch/subscribe are 100% broken on basketball/pickleball/tennis/volleyball until this lands. Baseball and football already use the target naming and keep working.

**Out of scope** (explicitly excluded):
- Live docs: `docs/authorization.md` — not updated in this PR.
- Historical specs under `.claudedoc/` and `docs/superpowers/specs|plans/` — they are snapshots in time.
- Settings `showStatistics` field (user privacy preference — unrelated to stats package).

**In scope but worth calling out**:
- `.claude/skills/add-sport-type/SKILL.md` — the developer-facing skill that future Claude sessions use when adding a sport. It has 11 stale references to box scores / `BoxScoreNode` / `game.boxScore.{sport}` / `initialBoxScores` / `box-score-actions.ts` / `game-box-scores.tsx`. If we don't update it, the skill will misdirect the next person to add a sport.

## Schema Changes (Recap)

Run `git diff schema.graphqls` for the full view. Summary of the renames we must propagate:

### Basketball (`BoxScore` → `Stats`)

| Old | New |
|---|---|
| `BasketballBoxScore` (+Edge/Connection/FilterInput/SortField/SortInput) | `BasketballStats` (+Edge/Connection/FilterInput/SortField/SortInput) |
| `BoxScoreSavedEvent` | `BasketballStatsSavedEvent` |
| Query `basketballBoxScores(...)` | `basketballStats(...)` |
| Mutation `saveBasketballBoxScore` | `saveBasketballStats` |
| Mutation `saveBasketballBoxScores` | `saveBasketballStatsBulk` (note new `Bulk` suffix) |
| `SaveBasketballBoxScoreInput` / `Data` / `Response` / `Result` | `SaveBasketballStatsInput` / `Data` / `Response` / `Result` |
| `SaveBasketballBoxScoresInput` / `Response` / `Result` | `SaveBasketballStatsBulkInput` / `Response` / `Result` |
| Bulk-save input field `basketballBoxScores: [...]` | `stats: [...]` |
| Bulk-save response field `basketballBoxScores: [...]` | `stats: [...]` |
| Single-save response field `basketballBoxScore` | `basketballStats` |
| Event field `basketballBoxScores: [BasketballBoxScore!]!` | `basketballStats: [BasketballStats!]!` |

### Pickleball / Tennis / Volleyball (`Statistics` → `Stats`)

Same pattern for each sport. Using Pickleball as example:

| Old | New |
|---|---|
| `PickleballStatistics` (+Edge/Connection/FilterInput/SortField/SortInput) | `PickleballStats` (+Edge/Connection/FilterInput/SortField/SortInput) |
| Query `pickleballStatistics(...)` | `pickleballStats(...)` |
| Mutation `savePickleballStatistics` | `savePickleballStats` |
| Mutation `savePickleballStatisticsBulk` | `savePickleballStatsBulk` |
| `SavePickleballStatisticsInput` / `Data` / `Response` / `Result` | `SavePickleballStatsInput` / `Data` / `Response` / `Result` |
| `SavePickleballStatisticsBulkInput` / `Response` / `Result` | `SavePickleballStatsBulkInput` / `Response` / `Result` |
| Bulk-save input/response field `statistics: [...]` | `stats: [...]` |
| Single-save response field `pickleballStatistics` | `pickleballStats` |

Tennis and volleyball are identical patterns with `tennis`/`volleyball` substituted.

### Not renamed in the schema

Baseball (`baseball*Stats`) and football (`football*Stats`) were already using `*Stats`. The frontend still has shared internals (`BoxScoreNode` base type, `boxScores` prop name, `game.boxScore.*` i18n namespace, `boxScoreT` var) that these sports transitively depend on — those come along for the ride in this PR.

## Naming Conventions (Decisions)

| # | Concern | Decision | Reason |
|---|---|---|---|
| 1 | Shared base type `BoxScoreNode` | `StatsNode` | Used by all 6 sports; base name must be sport-neutral |
| 2 | Shared base input `SaveBoxScoreInput` | `SaveStatsInput` | Same rationale |
| 3 | File `box-score-actions.ts` | `basketball-stats-actions.ts` | Matches sibling files (`pickleball-stats-actions.ts`, etc.) |
| 4 | Test file `box-score-actions.test.ts` | `basketball-stats-actions.test.ts` | Mirror |
| 5 | Component `GameBoxScores` + file | `GameStats` / `game-stats.tsx` | Orchestrator is sport-agnostic |
| 6 | Component `CollapsibleBoxScore` + file | `CollapsibleStats` / `collapsible-stats.tsx` | Wraps any sport's table |
| 7 | Component `GameBoxScoresSkeleton` + file | `GameStatsSkeleton` / `game-stats-skeleton.tsx` | Currently dead code, but rename for consistency |
| 8 | Component `BasketballBoxScoreForm/Table` + files | `BasketballStatsForm/Table` / `basketball-stats-form.tsx`, `basketball-stats-table.tsx` | Basketball-specific |
| 9 | **Inner** table prop (on every sport's stat table) | `stats` (generic) | Preserves `sharedProps` spread in `renderTable()`; call sites already carry sport name via component name; matches schema bulk-save `stats: [...]` field |
| 10 | `GameDetailClient` prop `initialBoxScores` | `initialBasketballStats` | Matches existing `initialPickleballStats`/`initialTennisStats`/etc. |
| 11 | `LiveGameState` field `boxScores` | `basketballStats` | Reducer only handles basketball events today; YAGNI on speculative discriminated union |
| 12 | Local var `boxScoreT = useTranslations("game.boxScore")` | `statsT = useTranslations("game.stats")` | Scope is 22 files (table + form for each sport, plus orchestrator and collapsible) |
| 13 | Local var `editingScore` in basketball table | `editingStats` | Consistency |
| 14 | `BoxScoreActionResult` + `boxScoreId`/`boxScoreIds`; `PickleballStatsActionResult` / `TennisStatsActionResult` / `VolleyballStatsActionResult` with `statisticsId`/`statisticsIds` | Unify all to `statsId` / `statsIds`. Rename `BoxScoreActionResult` → `BasketballStatsActionResult`. | Basketball and 3 others are the nonconforming holdouts; baseball and football already use `statsId/statsIds`. All interfaces are file-local (not exported) — zero blast radius. |
| 15 | i18n namespace `game.boxScore.*` | `game.stats.*` | Affects nested `.basketball`/`.football`/`.baseball`/`.pickleball`/`.tennis`/`.volleyball` subkeys too |
| 16 | i18n keys `noBoxScores`/`addBoxScores`/`editBoxScores`/`saveBoxScores`/`boxScoresSaved`/`boxScoreError` | `noStats`/`addStats`/`editStats`/`saveStats`/`statsSaved`/`statsError` | Namespace + key rename |
| 17 | i18n label `"Box Scores"` on `game.boxScore.title` | `"Stats"` on `game.stats.title` | Only consumer is `game-stats.tsx:141` as `fallbackGroupName` — rendered as the team header on **singles** games (tennis, pickleball singles), where "Box Scores" is wrong. "Stats" is the correct generic UX label. |
| 18 | Mock helper `mockBasketballBoxScoresResponse` | `mockBasketballStatsResponse` | Test fixture |
| 19 | Internal type `TeamBoxScoreGroup<T>` + field `boxScores` + helper `groupByTeam` param `allBoxScores` (in `game-box-scores.tsx`) | `TeamStatsGroup<T>` / field `stats` / param `allStats` | Internal to orchestrator — must match the rest of the rename |
| 20 | Local var `boxScoreResponse` in `page.tsx` | `basketballStatsResponse` | Matches query rename |
| 21 | `EMPTY_STAT_FIELDS` array in `graphql-handlers.ts`: missing `volleyballStatistics` entirely | Use new names **and** add `volleyballStats` | The missing volleyball entry is a pre-existing hole — MSW falls back to `{ data: {} }` which optional-chains to `[]` in the page code, masking bugs. Fix while we're here. |

## File Inventory

All paths relative to `/home/kevinlee/workspace/playground/playground-web-client`.

### Types (`src/lib/types/`)

| File | Changes |
|---|---|
| `src/lib/types/stats/base.ts` | `BoxScoreNode` → `StatsNode`; `SaveBoxScoreInput` → `SaveStatsInput`; doc comments (`box score` → `stats`) |
| `src/lib/types/stats/basketball.ts` | `BasketballBoxScoreNode` → `BasketballStatsNode`; `SaveBasketballBoxScoreInput` → `SaveBasketballStatsInput`; `SaveBasketballBoxScoreData` → `SaveBasketballStatsData`; `extends BoxScoreNode` → `extends StatsNode`; `extends SaveBoxScoreInput` → `extends SaveStatsInput`; doc comments |
| `src/lib/types/stats/pickleball.ts` | `PickleballStatisticsNode` → `PickleballStatsNode`; `SavePickleballStatisticsInput` → `SavePickleballStatsInput`; `SavePickleballStatisticsData` → `SavePickleballStatsData`; base extends; doc comments |
| `src/lib/types/stats/tennis.ts` | `TennisStatisticsNode` → `TennisStatsNode`; `SaveTennisStatisticsInput` → `SaveTennisStatsInput`; `SaveTennisStatisticsData` → `SaveTennisStatsData`; base extends; doc comments |
| `src/lib/types/stats/volleyball.ts` | `VolleyballStatisticsNode` → `VolleyballStatsNode`; `SaveVolleyballStatisticsInput` → `SaveVolleyballStatsInput`; `SaveVolleyballStatisticsData` → `SaveVolleyballStatsData`; base extends; doc comments |
| `src/lib/types/stats/football.ts` | `extends BoxScoreNode` → `extends StatsNode`; `extends SaveBoxScoreInput` → `extends SaveStatsInput` (on three interfaces each) |
| `src/lib/types/stats/baseball.ts` | Same pattern as football |
| `src/lib/types/game-event.ts` | Import `BasketballStatsNode`; rename `BoxScoreSavedEvent` → `BasketballStatsSavedEvent`; field `basketballBoxScores: BasketballBoxScoreNode[]` → `basketballStats: BasketballStatsNode[]`; type literal `"BoxScoreSavedEvent"` → `"BasketballStatsSavedEvent"`; update `isKnownGameEventType` discriminator |

### Server Actions (`src/app/[locale]/game/`)

| File | Changes |
|---|---|
| `src/app/[locale]/game/box-score-actions.ts` **→ `basketball-stats-actions.ts`** | Rename file. `BoxScoreActionResult` → `BasketballStatsActionResult`; `boxScoreId/boxScoreIds` → `statsId/statsIds`; type imports `SaveBasketballBoxScore*` → `SaveBasketballStats*`; function `saveBasketballBoxScore` → `saveBasketballStats`; function `saveBasketballBoxScores` → `saveBasketballStatsBulk`; mutation key `saveBasketballBoxScore` → `saveBasketballStats`; union `__typeName: "SaveBasketballBoxScoreResponse"` → `"SaveBasketballStatsResponse"`; response field `basketballBoxScore` → `basketballStats`; mutation key `saveBasketballBoxScores` → `saveBasketballStatsBulk`; union `__typeName: "SaveBasketballBoxScoresResponse"` → `"SaveBasketballStatsBulkResponse"`; **bulk input field** `{ gameId, basketballBoxScores }` → `{ gameId, stats }`; bulk response field `basketballBoxScores` → `stats`; local var `basketballBoxScores` → `stats`; error messages ("Failed to save basketball box score", "No box scores provided", etc.) → stats-worded equivalents. |
| `src/app/[locale]/game/pickleball-stats-actions.ts` | `statisticsId/statisticsIds` → `statsId/statsIds`; type imports `SavePickleballStatistics*` → `SavePickleballStats*`; function `savePickleballStatistics` → `savePickleballStats`; function `savePickleballStatisticsBulk` → `savePickleballStatsBulk`; mutation keys + union `__typeName`s; single-response field `pickleballStatistics` → `pickleballStats`; **bulk input field** `statistics: statisticsInput` → `stats: statsInput`; bulk response field `statistics` → `stats`; local vars `statisticsInput`/`statistics` → `statsInput`/`stats`; error messages |
| `src/app/[locale]/game/tennis-stats-actions.ts` | Same pattern with `Tennis` substitution |
| `src/app/[locale]/game/volleyball-stats-actions.ts` | Same pattern with `Volleyball` substitution |
| `src/app/[locale]/game/football-stats-actions.ts` | No schema-level changes (football unaffected); no action-result interface changes (already uses `statsId/statsIds`). Only touched if it imports from `box-score-actions.ts` — verify no cross-file refs before commit. |
| `src/app/[locale]/game/baseball-stats-actions.ts` | Same as football |

### Page & Live State

| File | Changes |
|---|---|
| `src/app/[locale]/game/[id]/page.tsx` | Import `BasketballStatsNode`, `PickleballStatsNode`, `TennisStatsNode`, `VolleyballStatsNode`. Rename local `initialBoxScores: { node: BasketballStatsNode }[]` → `initialBasketballStats`. Query field `basketballBoxScores` → `basketballStats`. Query field `pickleballStatistics` → `pickleballStats`. Query field `tennisStatistics` → `tennisStats`. Query field `volleyballStatistics` → `volleyballStats`. Rename local `boxScoreResponse` → `basketballStatsResponse`. Rename prop on `<GameDetailClient initialBoxScores={...}>` → `initialBasketballStats`. |
| `src/components/game/live/game-detail-client.tsx` | Type imports. `GameDetailClientProps.initialBoxScores` → `initialBasketballStats`. Destructure rename. `createInitialState(game, initialBoxScores)` → `createInitialState(game, initialBasketballStats)`. `SYNC_FROM_SERVER` dispatch: `boxScores: initialBoxScores` → `basketballStats: initialBasketballStats`. `useEffect` deps. `<GameStats>` child: prop name `boxScores={state.boxScores}` → `basketballStats={state.basketballStats}`. Also the import `import { GameBoxScores }` → `import { GameStats }` (new file name). |
| `src/components/game/live/game-live-reducer.ts` | Type imports (`BasketballStatsNode`). `LiveGameState.boxScores` → `basketballStats`. `LiveGameAction.SYNC_FROM_SERVER.boxScores` → `basketballStats`. `createInitialState(game, boxScores)` param → `basketballStats`. Event discriminator `"BoxScoreSavedEvent"` → `"BasketballStatsSavedEvent"`. Field access `event.basketballBoxScores` → `event.basketballStats`. Local var `updated` / `appended` logic unchanged, just reads from the new field name. |
| `src/hooks/use-game-subscription.ts` | In the subscription query `__on` array: `__typeName: "BoxScoreSavedEvent"` → `"BasketballStatsSavedEvent"`; selection field `basketballBoxScores: { ... }` → `basketballStats: { ... }`. |
| `src/app/[locale]/game/[id]/loading.tsx` | Comment "Box scores skeleton" → "Stats skeleton"; "GameBoxScoresSkeleton" → "GameStatsSkeleton" (in the comment). |

### Components (Sport Tables, Forms, Orchestrator)

| File | Changes |
|---|---|
| `src/components/game/basketball-box-score-form.tsx` **→ `basketball-stats-form.tsx`** | Rename file. Import `saveBasketballStats` from new action file. Type imports `BasketballStatsNode`, `SaveBasketballStatsInput`. Interface `BasketballBoxScoreFormProps` → `BasketballStatsFormProps`. Export `BasketballBoxScoreForm` → `BasketballStatsForm`. All call sites to the action. i18n keys `game.success.boxScoresSaved` → `game.success.statsSaved`, `game.errors.boxScoreError` → `game.errors.statsError`, `game.boxScore.editBoxScores` → `game.stats.editStats`, `game.boxScore.basketball.*` → `game.stats.basketball.*`. |
| `src/components/game/basketball-box-score-table.tsx` **→ `basketball-stats-table.tsx`** | Rename file. Import from new action + form files. Interface `BasketballBoxScoreTableProps` → `BasketballStatsTableProps`. Prop `boxScores: { node: BasketballBoxScoreNode }[]` → `stats: { node: BasketballStatsNode }[]`. Export `BasketballBoxScoreTable` → `BasketballStatsTable`. `useTranslations("game.boxScore.basketball")` → `useTranslations("game.stats.basketball")`. `boxScoreT = useTranslations("game.boxScore")` → `statsT = useTranslations("game.stats")`. All `boxScoreT(...)` calls use new keys (`noBoxScores` → `noStats`, etc.). `editingScore` → `editingStats`. `BasketballBoxScoreNode` → `BasketballStatsNode` (all uses). `computeMaxStats` / column defs typed as `BasketballStatsNode`. `<BasketballStatsForm>` (was `BasketballBoxScoreForm`). All `boxScores` destructure/local refs → `stats`. |
| `src/components/game/collapsible-box-score.tsx` **→ `collapsible-stats.tsx`** | Rename file. `CollapsibleBoxScoreProps` → `CollapsibleStatsProps`. `CollapsibleBoxScore` → `CollapsibleStats`. `useTranslations("game.boxScore")` → `useTranslations("game.stats")`. |
| `src/components/game/game-box-scores.tsx` **→ `game-stats.tsx`** | Rename file. Imports: `BasketballStatsTable`, `CollapsibleStats`, sport-specific `*StatsNode` types. Interface `GameBoxScoresProps` → `GameStatsProps`. Props: `boxScores?: { node: BasketballStatsNode }[]` → `basketballStats?: { node: BasketballStatsNode }[]`; `pickleballStats?: { node: PickleballStatsNode }[]`; `tennisStats?: { node: TennisStatsNode }[]`; `volleyballStats?: { node: VolleyballStatsNode }[]`. Function `GameBoxScores` → `GameStats`. Internal type `TeamBoxScoreGroup<T extends BoxScoreNode>` → `TeamStatsGroup<T extends StatsNode>` with field `stats: { node: T }[]`. Helper `groupByTeam<T extends BoxScoreNode>(game, allBoxScores, ...)` → `groupByTeam<T extends StatsNode>(game, allStats, ...)`. `fallbackGroupName = t("game.boxScore.title")` → `t("game.stats.title")`. All `t("game.boxScore.football.sections.*")` / `t("game.boxScore.baseball.sections.*")` → `t("game.stats.*.sections.*")`. `<CollapsibleBoxScore>` → `<CollapsibleStats>`. All `boxScores={group.boxScores}` → `stats={group.stats}` when passing to sport tables. Destructure rename in props. `getStatsForSport()` return type is `{ node: StatsNode }[]`; body `return boxScores ?? []` → `return basketballStats ?? []`. `renderTable(group)` still uses `sharedProps` spread + inner `stats` field (the unification point). |
| `src/components/game/game-box-scores-skeleton.tsx` **→ `game-stats-skeleton.tsx`** | Rename file. Export `GameBoxScoresSkeleton` → `GameStatsSkeleton`. (Component is currently unused — see Gotchas.) |
| `src/components/game/pickleball-stats-form.tsx` | Import `savePickleballStats` from action. Type imports `PickleballStatsNode`, `SavePickleballStatsInput`. All `PickleballStatisticsNode` → `PickleballStatsNode`, `SavePickleballStatisticsInput` → `SavePickleballStatsInput`. `savePickleballStatistics(input)` → `savePickleballStats(input)`. i18n keys updated. |
| `src/components/game/pickleball-stats-table.tsx` | Type imports. Prop `boxScores` → `stats`. All `PickleballStatisticsNode` → `PickleballStatsNode`. `savePickleballStatistics` → `savePickleballStats`. `boxScoreT` → `statsT`. i18n namespace. Local state var. |
| `src/components/game/tennis-stats-form.tsx` | Same pattern with `Tennis` |
| `src/components/game/tennis-stats-table.tsx` | Same pattern with `Tennis` |
| `src/components/game/volleyball-stats-form.tsx` | Same pattern with `Volleyball` |
| `src/components/game/volleyball-stats-table.tsx` | Same pattern with `Volleyball` |
| `src/components/game/football-offensive-stats-form.tsx` | i18n keys (`game.boxScore.*` → `game.stats.*`); `boxScoreT` → `statsT` (if present); any `"game.boxScoresSaved"` / `"game.errors.boxScoreError"` labels |
| `src/components/game/football-offensive-stats-table.tsx` | Prop `boxScores` → `stats`. `boxScoreT` → `statsT`. i18n keys. Local refs `boxScores.map` → `stats.map`, etc. |
| `src/components/game/football-defensive-stats-form.tsx` | Same as offensive form |
| `src/components/game/football-defensive-stats-table.tsx` | Same as offensive table |
| `src/components/game/football-special-teams-stats-form.tsx` | Same |
| `src/components/game/football-special-teams-stats-table.tsx` | Same |
| `src/components/game/baseball-batting-stats-form.tsx` | i18n keys + any `boxScoreT` var |
| `src/components/game/baseball-batting-stats-table.tsx` | Prop `boxScores` → `stats`. `boxScoreT` → `statsT`. i18n. |
| `src/components/game/baseball-pitching-stats-form.tsx` | Same as batting form |
| `src/components/game/baseball-pitching-stats-table.tsx` | Same as batting table |
| `src/components/game/baseball-fielding-stats-form.tsx` | Same |
| `src/components/game/baseball-fielding-stats-table.tsx` | Same |

### Tests & Fixtures

| File | Changes |
|---|---|
| `__tests__/[locale]/game/box-score-actions.test.ts` **→ `basketball-stats-actions.test.ts`** | Rename file. Import `saveBasketballStats` / `saveBasketballStatsBulk` from new action path. Type imports. Helpers `makeBoxScoreFields` → `makeStatsFields`; `makeBoxScoresFields` → `makeStatsBulkFields`. The helper returns `{ basketballBoxScore: {...} }` → `{ basketballStats: {...} }` for single, `{ basketballBoxScores: [...] }` → `{ stats: [...] }` for bulk (matches schema). `describe("saveBasketballBoxScore")` → `describe("saveBasketballStats")`. `mockMutateSuccess("saveBasketballBoxScore", "SaveBasketballBoxScoreResponse", ...)` → `mockMutateSuccess("saveBasketballStats", "SaveBasketballStatsResponse", ...)`. Same for bulk: `"saveBasketballBoxScores" / "SaveBasketballBoxScoresResponse"` → `"saveBasketballStatsBulk" / "SaveBasketballStatsBulkResponse"`. Assertion `result.boxScoreId` → `result.statsId`, `result.boxScoreIds` → `result.statsIds`. Error message assertions: `"Failed to save basketball box score"` → matches the new error string in the action; `"No box scores provided"` → matches the new string. `mockMutateUnionError("saveBasketballBoxScore", "BoxScoreNotFoundError", ...)` — the `BoxScoreNotFoundError` string is a made-up error name used only for this test's negative-path assertion; keep the test but rename the string to something generic like `"BasketballStatsNotFoundError"` for naming consistency (it doesn't need to correspond to a real schema type). Bulk test: `mutationInput.basketballBoxScores` → `mutationInput.stats`. |
| `__tests__/components/game/live/game-live-reducer.test.ts` | Type imports: `BasketballStatsNode`, `BasketballStatsSavedEvent`. `makeBoxScore` helper → `makeStats`. `BasketballBoxScoreNode` → `BasketballStatsNode`. `describe("createInitialState")` state field assertion `state.boxScores` → `state.basketballStats`. `describe("GAME_EVENT — box score saved")` → `describe("GAME_EVENT — basketball stats saved")`. Event type `BoxScoreSavedEvent` → `BasketballStatsSavedEvent`. `__typename: "BoxScoreSavedEvent"` → `"BasketballStatsSavedEvent"`. Event field `basketballBoxScores: [updatedBoxScore, newBoxScore]` → `basketballStats: [updatedStats, newStats]`. All local vars (`existingBoxScore`, `updatedBoxScore`, `newBoxScore`, `newBoxScores`) → `Stats` variants. State access `nextState.boxScores` → `nextState.basketballStats`. `SYNC_FROM_SERVER` test: `boxScores: newBoxScores` → `basketballStats: newBasketballStats`. |
| `tests/fixtures/mock-data/games.ts` | Rename export `mockBasketballBoxScoresResponse` → `mockBasketballStatsResponse`. Response shape `{ data: { basketballBoxScores: [] } }` → `{ data: { basketballStats: [] } }`. |
| `tests/fixtures/graphql-handlers.ts` | Update import name `mockBasketballStatsResponse`. `EMPTY_STAT_FIELDS`: rename `pickleballStatistics` → `pickleballStats`, `tennisStatistics` → `tennisStats`, **add** `volleyballStats` (fixing pre-existing hole). Update `defaultResponses` key `basketballBoxScores` → `basketballStats`. |

### i18n

| File | Changes |
|---|---|
| `messages/en.json` | Rename namespace `game.boxScore` → `game.stats` (all nested keys come with it: `basketball`, `football`, `baseball`, `pickleball`, `tennis`, `volleyball`, and their sub-namespaces). Rename leaf keys: `noBoxScores` → `noStats`, `addBoxScores` → `addStats`, `editBoxScores` → `editStats`, `saveBoxScores` → `saveStats`. **Change the value** of `game.stats.title` from `"Box Scores"` to `"Stats"` (it's used as the fallback group header on singles games). `game.success.boxScoresSaved` → `game.success.statsSaved`, with value `"Box scores saved"` → `"Stats saved"`. `game.errors.boxScoreError` → `game.errors.statsError`, with value `"Failed to save box scores"` → `"Failed to save stats"`. |

### Developer-facing skill docs

| File | Changes |
|---|---|
| `.claude/skills/add-sport-type/SKILL.md` | **Frontmatter `description` (line 3):** "adding box scores / per-player statistics" → "adding per-player stats". **Line 12:** "may already define the types, or basic game support may be in place without box scores" → "...without stats". **Line 22:** "Check `src/components/game/game-box-scores.tsx`" → "Check `src/components/game/game-stats.tsx`". **Line 39:** "Box score stats" → "Per-player stats". **Line 72:** "If box scores exist: add stat types..." → "If stats exist: add stat types...". **Line 122:** "If box scores exist: add stat abbreviation keys under `game.boxScore.{sport}`" → "If stats exist: add stat abbreviation keys under `game.stats.{sport}`". **Line 194:** keep prose intact (already says "per-player statistics"); change to "per-player stats" for consistency. **Line 208:** "`*Node extends BoxScoreNode`" → "`*Node extends StatsNode`". **Line 209:** "`Save*Input extends SaveBoxScoreInput`" → "`Save*Input extends SaveStatsInput`". **Line 214:** "Create a **separate file** for the sport's box score actions ... `box-score-actions.ts` patterns" → "Create a **separate file** for the sport's stats actions ... `basketball-stats-actions.ts` patterns" (the canonical reference is the renamed basketball file). **Line 227:** "Add stat abbreviation keys under `game.boxScore.{sport}`" → "...under `game.stats.{sport}`". **Line 228:** "section label keys under `game.boxScore.{sport}.sections`" → "...under `game.stats.{sport}.sections`". **Line 270:** "### 13f. Orchestrator — `src/components/game/game-box-scores.tsx`" → "### 13f. Orchestrator — `src/components/game/game-stats.tsx`". **Line 272:** "This component gates which sports show box scores." → "This component gates which sports show stats." **Line 277:** "Ensure `boxScores` prop is optional ... it's basketball-specific" → "Ensure `basketballStats` prop is optional ... it's basketball-specific" (the orchestrator's basketball-specific prop is now `basketballStats`, not `boxScores`). **Line 292:** "Pass them through to `<GameBoxScores>`" → "Pass them through to `<GameStats>`". **Line 294:** "Box score stats are static props ... `initialBoxScores` prop feeds the basketball WebSocket live reducer" → "Stats are static props ... `initialBasketballStats` prop feeds the basketball WebSocket live reducer". **Line 296:** commit message template `feat: add {sport} box scores — types, table, form, actions, page wiring` → `feat: add {sport} stats — types, table, form, actions, page wiring`. **Line 331:** "Each sport gets its own server action file for box scores" → "Each sport gets its own server action file for stats". **Line 333:** "Multi-category box scores:" → "Multi-category stats:". |

## Order of Operations

Do this as a single PR, split into logically grouped commits. Between commits 2 and 3, run `npm run lint && npm run build && npm test` to verify the schema-alignment fix works in isolation.

### Commit 1 — Type model rename

Touches: all of `src/lib/types/stats/*.ts`, `src/lib/types/game-event.ts`.

Changes:
- `BoxScoreNode` → `StatsNode`; `SaveBoxScoreInput` → `SaveStatsInput` in `base.ts`.
- All sport type files swap their interface names and base type extensions.
- `game-event.ts`: `BoxScoreSavedEvent` → `BasketballStatsSavedEvent`, field rename, discriminator update, `isKnownGameEventType` literal.
- Doc comments updated ("box score" → "stats").

After this commit the project won't compile. That's expected. **Don't push yet.**

### Commit 2 — Schema alignment (wire queries, mutations, subscription)

Touches: `page.tsx`, `box-score-actions.ts` → `basketball-stats-actions.ts`, `pickleball-stats-actions.ts`, `tennis-stats-actions.ts`, `volleyball-stats-actions.ts`, `use-game-subscription.ts`, `game-live-reducer.ts`.

Changes:
- Every query field name, mutation name, mutation input field, response field, union `__typeName`, and type literal string updated to match the new schema.
- `LiveGameState.boxScores` → `basketballStats` (and `LiveGameAction.SYNC_FROM_SERVER` field).
- `*ActionResult` interfaces unified to `statsId/statsIds`.
- `BoxScoreActionResult` → `BasketballStatsActionResult`.
- Function renames (`saveBasketballBoxScore` → `saveBasketballStats`, etc.).
- Action file rename: `box-score-actions.ts` → `basketball-stats-actions.ts`. Update imports on consumers (just `basketball-box-score-table.tsx` and `basketball-box-score-form.tsx`, which will get their own rename in commit 3 — for this commit just fix the import path).

**After this commit the build should succeed and the app should run correctly against the new backend.** Run the full test suite.

### Commit 3 — Component/identifier consistency rename

Touches: all component files, `game-detail-client.tsx`, test files.

Changes:
- File renames: `basketball-box-score-form.tsx` → `basketball-stats-form.tsx`; `basketball-box-score-table.tsx` → `basketball-stats-table.tsx`; `game-box-scores.tsx` → `game-stats.tsx`; `game-box-scores-skeleton.tsx` → `game-stats-skeleton.tsx`; `collapsible-box-score.tsx` → `collapsible-stats.tsx`.
- Test file rename: `__tests__/[locale]/game/box-score-actions.test.ts` → `basketball-stats-actions.test.ts`.
- Component exports: `BasketballBoxScoreForm` → `BasketballStatsForm`; `BasketballBoxScoreTable` → `BasketballStatsTable`; `GameBoxScores` → `GameStats`; `GameBoxScoresSkeleton` → `GameStatsSkeleton`; `CollapsibleBoxScore` → `CollapsibleStats`.
- Prop renames: every sport's `boxScores` → `stats` (inner table prop). `initialBoxScores` → `initialBasketballStats` on `GameDetailClient`. Orchestrator: `boxScores` prop → `basketballStats` prop. Internal `TeamBoxScoreGroup` → `TeamStatsGroup` with field `stats`. Helper param `allBoxScores` → `allStats`.
- Local var renames: `boxScoreT` → `statsT` across 22 files. `editingScore` → `editingStats` in basketball table. `boxScoreResponse` → `basketballStatsResponse` in page.tsx.
- Mechanical rename of `useTranslations("game.boxScore...")` → `useTranslations("game.stats...")` — keys are renamed in commit 4.

**NB:** This commit changes i18n key strings used by code but the `messages/en.json` file is updated in commit 4. The runtime will emit "missing translation" warnings between commits 3 and 4 — that's fine, don't push between them.

### Commit 4 — i18n rename

Touches: `messages/en.json`, basketball stats actions (error message strings if they're user-facing translations — they're not, they go to `result.message` which flows to `toast.error`, so leave the English strings as raw text with the word "stats" updated).

Changes:
- Namespace `game.boxScore` → `game.stats`.
- Leaf keys renamed.
- `game.stats.title` value changed to `"Stats"`.
- `statsSaved` / `statsError` values updated.

### Commit 5 — Test fixtures

Touches: `tests/fixtures/graphql-handlers.ts`, `tests/fixtures/mock-data/games.ts`.

Changes:
- `mockBasketballBoxScoresResponse` → `mockBasketballStatsResponse`; response shape.
- `defaultResponses` key rename.
- `EMPTY_STAT_FIELDS`: rename entries to new names, **add `volleyballStats`** (previously missing).

Run: `npm test` and `npx playwright test --project=chromium 2>&1 | tee /tmp/pw-results.txt` — capture to file per CLAUDE.md rule.

### Commit 6 — Developer-facing skill docs

Touches: `.claude/skills/add-sport-type/SKILL.md`.

Changes per the row in the file inventory above. Pure text update — no code touched. Verify by re-reading the skill end-to-end and asking: if a fresh Claude session loads this skill to add a new sport, will every code reference, file path, type name, prop name, and i18n key resolve in the post-rename codebase? No grep should produce a `boxScore` / `BoxScore` / `box-score` hit in the file after this commit.

## Gotchas & Footguns

1. **`BoxScoreSavedEvent` is 4 coordinated updates.** The discriminator rename must land atomically across: (a) the `__typeName` string in the subscription query (`use-game-subscription.ts:90`), (b) the selection set field name inside that block (`basketballBoxScores` → `basketballStats`), (c) the TypeScript union tag (`game-event.ts`), (d) the reducer switch arm (`game-live-reducer.ts:48`). If you miss any one, the branch type-narrows to `never` (caught at build) **or** compiles but silently never matches at runtime (not caught — MSW returns empty arrays so tests pass). This belongs in commit 2.

2. **`extractOperationField` regex in `graphql-handlers.ts`** matches the first field inside the outer braces. If a test's `defaultResponses` key no longer matches the new query field name (e.g., `basketballStats` vs. `basketballBoxScores`), the handler silently returns `{ data: {} }`, and the page code's `?? []` fallback masks the missing response. Catch this by (a) grepping every `defaultResponses` entry against page.tsx queries after commit 5, (b) adding the missing `volleyballStats` entry so volleyball isn't relying on the catch-all anymore.

3. **`game.stats.title` is actually rendered** in `game-stats.tsx:141` as the team header on individual-sport games (tennis singles, pickleball singles). The current value `"Box Scores"` is already wrong for a tennis page. Changing it to `"Stats"` is a UX fix, not just a rename.

4. **`json-to-graphql-query` string literals are compile-time strings with zero type checking against the schema.** Every `__typeName: "..."` / mutation-key / field-name is stringly-typed. Misspelled literals result in runtime-null responses. After commit 2, grep every `"Save...Response"` / `"Save...BulkResponse"` and verify character-for-character against the schema.

5. **File-local interfaces are NOT exported** (verified). `BoxScoreActionResult`, `PickleballStatsActionResult`, etc. have no cross-file consumers. Unifying their field names (`statsId/statsIds`) has zero blast radius — safe to do in commit 2.

6. **`game-box-scores-skeleton.tsx` is dead code.** The file is never imported; `loading.tsx` duplicates the skeleton markup inline. We still rename it for consistency. A follow-up PR can delete it or wire it into `loading.tsx` (out of scope here).

7. **`boxScoreT` scope is 22 files, not 7.** Both the `-table.tsx` and `-form.tsx` variant of every sport's stat component declare the variable. A project-wide find/replace on `boxScoreT` → `statsT` and `useTranslations("game.boxScore"` → `useTranslations("game.stats"` is safe — there are no other consumers of the name.

8. **Test assertion error-message strings** in `basketball-stats-actions.test.ts` (née `box-score-actions.test.ts`) assert exact strings like `"Failed to save basketball box score"` and `"No box scores provided"`. If commit 2 changes these to `"Failed to save basketball stats"` / `"No stats provided"`, the test must move in lockstep. Keep test and action in the same commit.

9. **`mockMutateUnionError` test case uses `"BoxScoreNotFoundError"` as a made-up error type name** (no such type exists in the schema — it's a negative-path sentinel). Rename to `"BasketballStatsNotFoundError"` for naming consistency; it remains a made-up string and doesn't need to correspond to a real schema type.

10. **Revalidation paths don't change.** `revalidatePath("/[locale]/game/[id]", "page")` — the route segment is `[id]`, not box-score. No updates needed.

## Verification Checklist

After all commits, run:

```bash
npm run lint 2>&1 | tee /tmp/lint.txt
npm run build 2>&1 | tee /tmp/build.txt
npm test 2>&1 | tee /tmp/vitest.txt
npx playwright test --project=chromium 2>&1 | tee /tmp/pw.txt
```

Then:

- [ ] `grep -rn 'BoxScore\|boxScore\|box-score' src/ __tests__/ tests/ messages/` returns 0 matches (excluding `showStatistics` in settings — out of scope).
- [ ] `grep -rn 'Statistics\|statistics' src/lib/types/stats/ src/components/game/ src/app/[locale]/game/` returns 0 matches for type/function/variable names (only user-facing label text if any).
- [ ] `grep -rn 'game\.boxScore' src/ messages/` returns 0 matches.
- [ ] `grep -rn 'BoxScoreSavedEvent' src/ __tests__/` returns 0 matches.
- [ ] `grep -rn 'basketballBoxScores\|pickleballStatistics\|tennisStatistics\|volleyballStatistics' src/ __tests__/ tests/` returns 0 matches.
- [ ] Manually load a basketball game detail page against the live backend. Verify stats table loads, adding a player via the "Add Player Stats" control works, editing a row works.
- [ ] Manually load a pickleball/tennis/volleyball game detail page and verify the stats table loads and the header says "Stats" (not "Box Scores") for singles.
- [ ] Subscribe to a live basketball game — save a box score and verify the reducer upserts correctly without reloading.

## Explicitly Out of Scope

- `docs/authorization.md` — per user direction, not updated.
- `.claudedoc/` historical specs and `docs/superpowers/specs|plans/*.md` historical specs — snapshots in time, intentionally frozen.
- Settings `showStatistics` (user privacy preference) — unrelated schema field.
- Deleting the dead `game-box-scores-skeleton.tsx` — renamed for consistency, deletion is a follow-up.
