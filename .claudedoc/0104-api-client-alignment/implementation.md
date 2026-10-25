# 0104 API/Client Alignment: Web Client Implementation Plan (C0–C3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `playground-web-client` in line with the ratified 0104 GraphQL contract: fix existing contract drift now (C0), sync the schema after the I1 hotfix (C1), adopt typed mutation errors (C2), and replace client-side role composition with server `viewerCan` capabilities (C3).

**Architecture:** Four sequential PRs, each gated on a deployed backend PR (C10). Queries stay `json-to-graphql-query` objects; a new Vitest schema-contract helper validates selections against the **committed** `schema.graphqls` (`git show HEAD:schema.graphqls`) with `graphql-js`, so the bug class behind I6 (a fragment the union cannot contain) and removed fields fail in unit tests instead of production, identically locally and in CI. Gating moves from `viewerGameRole`/`currentUserRole` arithmetic to boolean flags that components receive as props.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, json-to-graphql-query, graphql 16 (`buildSchema`/`validate`), TanStack Form, Zod v4, next-intl, Vitest + @testing-library/react (jsdom), Playwright with Next testProxy + MSW.

**Spec:** `/home/kevinlee/workspace/playground/playground-backend/.claudedoc/0104-api-client-alignment/design.md` (§2 C1/C3/C6/C10, §3 "Client." paragraphs of I1, I2, I6, N3, N6, N10, §4 rows C0–C3), plus the backend B6 amendments recorded in this plan's C3 Consumes blocks (`enterOwnStats`; CANCELLED/FORFEITED state guards). Review applied: `plan-review.md` #1–#13.

## Global Constraints

- PR order and gates (§4): **C0** no dependency → **C1** after **B1 deployed** → **C2** after **B3 deployed** → **C3** after **B6 deployed** (B6 depends on B4, B5; B2 ships `ManagedChatRoomError`, B5 ships `GameCancelledEvent`). C3 must deploy before backend B6b removes `canMessage`.
- Branch names follow `NNNN-feature`: `0104-c0-client-drift`, `0104-c1-schema-sync`, `0104-c2-typed-mutation-errors`, `0104-c3-viewer-can`. Branch from up-to-date `main`.
- `schema.graphqls` is committed **only** in C1, C2, C3, after the paired backend PR is deployed (C10), and always as that PR's **first commit** (`chore(schema): …`), because the contract helper reads `HEAD:schema.graphqls`. In C0 never stage it (the working tree holds an uncommitted regeneration with the bad I1 retype; the helper ignores it). Stage explicit paths; never `git add -A`/`git add .`.
- Schema regeneration recipe (verified byte-identical 2026-10-21), from the client root, with the backend checked out at the **deployed** commit and `git -C ../playground-backend status --porcelain src/main/resources/graphql` empty: `BK=../playground-backend; git -C $BK ls-files src/main/resources/graphql | LC_ALL=C sort | while read f; do cat "$BK/$f"; done > schema.graphqls && npx -y prettier@3.5.3 --parser graphql --write schema.graphqls`. From C1 on: `npm run schema:sync`.
- SDL names are used exactly as the design (and the B6 amendments) define them; every consumed element is listed under the task's **Interfaces → Consumes**.
- Response types: `field: T | null`, never optional; `viewerCan` objects are non-null with all-`boolean` members (C6). Inputs/action results use `field?: T`.
- `viewerCan` is selected **only** in the game detail query, the `gameEvents` subscription, and `loadChatRoom`; never in list/feed queries, `generateMetadata`, `chatRoomInlineFragments`, or the room list / `chatEvents` payload (I2 step 9). Never wrap a `viewerCan`/`viewer*` selection in `unstable_cache`, `force-cache` or an LRU; per-request `React.cache` only (C3 client caching rule).
- Capability flags are trusted as given: the client never re-derives what the backend's state guards already encode (B6 makes `join`, `update`, `delete`, `addParticipants`, `invite`, `enterStats`, `enterOwnStats`, `addMedia` false on CANCELLED/FORFEITED). Pre-existing UX status guards that are not duplications of those (stats/score/media editable only IN_PROGRESS or COMPLETE; Invite hidden on COMPLETE/FINALIZED) stay unchanged.
- Error fragments (`errorFragment`, `authorizationErrorFragment`, `invalidInputErrorFragment`) are spread only into unions whose SDL lists a matching member; never into a shared default selection (I6 spread rule).
- Inline fragments with more than one arm use the `__on: [...]` array form (json-to-graphql-query skill). json-to-graphql-query drops an inline-fragment arm with no fields (`dropEmptyObjects`), so every arm that must reach the wire selects at least one field. Non-pretty output separates tokens with single spaces (`... on X { a b }`); string assertions use that form.
- All visible text via next-intl (`messages/en.json`) and Typography components; navigation imports from `@/i18n/navigation`; no barrel files.
- Unit tests: Vitest in `__tests__/`, `.test.ts(x)`, `fireEvent` (no `user-event`), no new test packages. Run single files with `npx vitest run "<path>"` (quote paths containing `[locale]`; unquoted brackets are globs and fail in zsh).
- Playwright: dev loop `npx playwright test --project=chromium <spec> 2>&1 | tee /tmp/pw-<name>.txt`; read the file, never re-run to grep. A chromium run is never "the full suite". Each PR's ready task runs bare `npx playwright test 2>&1 | tee /tmp/pw-full.txt` (348+ tests, chromium + firefox + webkit). Engine traps: Firefox ignores synthesized `mouse.wheel` for React `onWheel` (use a focused `Home` keypress); WebKit gives a broken `<img>` a 0x0 box (use real `data:` URIs in mocks).
- Do not add `content-visibility` to `MessageScrollerItem` and do not re-run `npx shadcn add message-scroller` (memory: breaks chat scroll-restore in Firefox/WebKit; guarded by `tests/pages/chat.spec.ts` "loading older same-day history preserves scroll position").
- Skills: every task touching React/Next code first invokes `/vercel-react-best-practices`; every task touching UI first invokes `/web-design-guidelines`; every task touching query/mutation objects first reads `.claude/skills/json-to-graphql-query-guidelines/SKILL.md`. These are explicit Step 0s below.
- Commits: one logical commit per task (plus the schema commit in C1–C3), conventional style seen in `git log` (`fix(settings): …`, `feat(game): …`, `test(game): …`, `chore(schema): …`). Before each code commit run `pr-review-toolkit:code-simplifier` then `pr-review-toolkit:code-reviewer` on the task diff (user preference). Commit messages end with the `Co-Authored-By` trailer from the session's attribution reminder; PR descriptions end with the session's Claude Code attribution line.

## Review Focus

1. **Viewer with no GameRole but true flags** (group/league admin): must see Start/End/Edit and the overflow menu. The old `viewerGameRole == null` early return is exactly the I2 bug. Test: C3-2 `"renders actions for a viewer with no GameRole when viewerCan.start is true"` + Playwright in C3-6.
2. **Anonymous or all-false viewer**: page renders, no action UI, no join/add/remove/moderate controls, no crash from a missing `viewerCan`. Test: C3-2 `"renders nothing when every flag is false"`; C3-6 anonymous spec.
3. **Overflow menu with zero visible items** (e.g. only `start` true): the "More options" trigger must not render an empty menu. Test: C3-2 `"hides the overflow trigger when no menu item is allowed"`.
4. **Live event changes capabilities mid-session.** `viewerCan` is replaced wholesale from each event. On a start the Start button becomes End; on a cancel the server's flags (B6 guards) remove Join, Edit, Delete, Invite, Add Team, stat entry and media upload without reload, and the stats section is hidden; only controls the backend still grants on a cancelled game (e.g. Manage Editors, media moderation) remain. Tests: C3-1 reducer cases; C3-2 `"swaps Start for End when flags change"` and `"shows only server-granted controls on a cancelled game"`; C3-3 `"hides Join when the cancelled-game flags arrive"`.
5. **Server field error the form cannot show** (`InvalidInputError.field` null or not a form field): the user still gets the save-error toast; an inline error appears only on a known field and clears when the user edits it. Tests: C2-2 form cases and `setServerFieldError` unit cases.

---

## PR C0 — Client drift fixes and N10

**Branch:** `0104-c0-client-drift` · **Backend PR that must be deployed first:** none · **Do not commit `schema.graphqls`.**

### Task C0-1: Schema-contract helper; preferences save (I6 hotfix) and VOLLEYBALL

**Files:**
- Create: `__tests__/helpers/schema-contract.ts`
- Modify: `src/app/[locale]/settings/actions.ts:4,20-22,121-133`
- Test: `__tests__/[locale]/settings/actions.test.ts`

**Interfaces:**
- Consumes (existing SDL, committed schema): `Mutation.updateUserPreferences(input: UpdateUserPreferencesInput!): UpdateUserPreferencesResult!`, `union UpdateUserPreferencesResult = UpdateUserPreferencesResponse` (no Error member), `UpdateUserPreferencesResponse.preferences`, `enum SportType { BASEBALL BASKETBALL FOOTBALL TENNIS PICKLEBALL VOLLEYBALL }`.
- Produces: `validateOperation(kind: "query" | "mutation" | "subscription", selection: Record<string, unknown>): string[]` and `validateDocument(document: string): string[]` (return `GraphQLError.message`s; `[]` = valid). The schema is `buildSchema(execFileSync("git", ["show", "HEAD:schema.graphqls"], { encoding: "utf8" }))`, built once per module: the committed file, never the working tree, so local runs and CI (`actions/checkout` has HEAD) validate the same SDL. Not a `.test.ts` file, so Vitest does not collect it.

- [ ] **Step 0:** Read `.claude/skills/json-to-graphql-query-guidelines/SKILL.md`; invoke `/vercel-react-best-practices` (server action rules: `server-auth-actions`).
- [ ] **Step 0a (precondition): check the committed schema** the helper will read: `git show HEAD:schema.graphqls | grep -n "union UpdateUserPreferencesResult\|enum GameSortField\|viewerFollowingUsers\|myGames\|nearLocation\|distance"`. Expected (verified 2026-10-21 on `main` 4ec3e36): `union UpdateUserPreferencesResult = UpdateUserPreferencesResponse` (no Error member), `enum GameSortField` without `END_DATE`, and `viewerFollowingUsers`, `distance`, `myGames`, `nearLocation` all present. If anything is missing, the committed schema lags in a way C0 cannot fix (C0 may not commit it): drop that contract test from C0 and add it in C1-1 instead.
- [ ] **Step 1: Write the failing tests** in `__tests__/[locale]/settings/actions.test.ts` under `describe("updatePreferences")`:
  - `"sends a mutation that validates against the schema"`: call `updatePreferences({ showStatistics: true })` with the success mock, then `expect(validateOperation("mutation", mockAuthMutate.mock.calls[0][0])).toEqual([])`.
  - `"accepts VOLLEYBALL in preferredSports"`: `updatePreferences({ preferredSports: ["VOLLEYBALL"] })` → `result.success === true` and the captured input's `preferredSports[0]` is an `EnumType` with `value === "VOLLEYBALL"`.
- [ ] **Step 2: Run** `npx vitest run "__tests__/[locale]/settings/actions.test.ts"`. Expected: FAIL — first with `Fragment cannot be spread here as objects of type "UpdateUserPreferencesResult" can never be of type "Error".`, second with a Zod parse failure surfaced as `UNEXPECTED_ERROR`.
- [ ] **Step 3: Implement.** Remove `errorFragment` from the `__on` list (and its now-unused import); keep `__typename` and the `UpdateUserPreferencesResponse` arm. Replace the hardcoded sport list with `z.array(z.enum(SportType))` (precedent: `src/components/game/game-form-fields.tsx:26`).
- [ ] **Step 4: Run** the same command. Expected: PASS (all existing cases too).
- [ ] **Step 5: Commit** `fix(settings): stop spreading Error into the preferences result; accept VOLLEYBALL` (stage `__tests__/helpers/schema-contract.ts`, the actions file, the test).

### Task C0-2: Game list filter/sort drift

**Files:**
- Modify: `src/lib/types/game.ts:656-668` (drop `endAfter`, `endBefore` from `GameFilterParams`)
- Modify: `src/app/[locale]/game/actions.ts:501-502`
- Modify: `src/lib/constants.ts:185-190` (drop `GameSortField.END_DATE`; add `isGameStatus`)
- Modify: `src/app/[locale]/games/page.tsx:101-104,280-288`, `src/app/[locale]/page.tsx:155-158`
- Test: `__tests__/[locale]/game/actions.test.ts` (line ~601 uses `END_DATE`), Create `__tests__/lib/constants.test.ts`

**Interfaces:**
- Consumes (existing SDL): `input GameFilterInput` (no `endAfter`/`endBefore`), `enum GameSortField { START_DATE GAME_STATUS DISTANCE }`, `enum GameStatus`.
- Produces: `isGameStatus(value: unknown): value is GameStatus` in `src/lib/constants.ts` (`typeof value === "string" && Object.values(GameStatus).includes(value as GameStatus)`).

- [ ] **Step 0:** Read the json-to-graphql skill; invoke `/vercel-react-best-practices`.
- [ ] **Step 1: Write the failing tests.**
  - `__tests__/[locale]/game/actions.test.ts`: `it.each(Object.values(GameSortField))("loadMoreGames sort %s validates against the schema", …)` — call `loadMoreGames({ sportType: SportType.BASKETBALL, startAfter: "2026-01-01T00:00:00Z" }, { field, direction: SortDirection.ASC }, "")`, capture the arg passed to the mocked `query`/`authQuery`, assert `validateOperation("query", arg)` is `[]`. Change the existing line-601 case from `END_DATE` to `START_DATE`.
  - `__tests__/lib/constants.test.ts`: `isGameStatus("FINALIZED") === true`, `isGameStatus("SCHEDULED") === true`, `isGameStatus("END_DATE") === false`, `isGameStatus(undefined) === false`, `isGameStatus("constructor") === false` (the `in`-operator copies return true for prototype keys).
- [ ] **Step 2: Run** `npx vitest run "__tests__/[locale]/game/actions.test.ts" __tests__/lib/constants.test.ts`. Expected: FAIL — `END_DATE` case reports `Value "END_DATE" does not exist in "GameSortField" enum.`; `isGameStatus` not exported.
- [ ] **Step 3: Implement.** Remove the two `endAfter`/`endBefore` lines and type fields (dead code; cleanup); remove `END_DATE` (the `games/page.tsx:315` URL whitelist then rejects it automatically); add `isGameStatus` and use it for all three URL `gameStatus` parses (`games/page.tsx` discover + My Games, `page.tsx`), which fixes the My Games tab dropping `FINALIZED` and the `"constructor" in GameStatus` hole.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `fix(game): drop removed endAfter/endBefore and END_DATE; accept every GameStatus from the URL`.

### Task C0-3: N10 — CANCELLED and FORFEITED

**Files:**
- Modify: `src/lib/constants.ts:17-22` (enum), `:238-262` (`GameStatusBadgeVariant`, `GameStatusLabelKey`, `GameStatusAriaLabelKey`)
- Modify: `src/components/game/game-status-badge.tsx:6-11`, `src/components/game/discover-feed.tsx:35-40`, `src/components/game/game-stats.tsx:141`
- Modify: `messages/en.json` (`game.status`, `game.status.ariaLabel`, `game.discover`)
- Create: `__tests__/lib/game-status-maps.test.ts`, `__tests__/components/game/game-stats.test.tsx`

**Interfaces:**
- Consumes (backend SDL, `G:game.graphqls:46-53`): `enum GameStatus { SCHEDULED IN_PROGRESS COMPLETE FINALIZED CANCELLED FORFEITED }`. The committed client `schema.graphqls` lacks the two values until C1, so no C0 contract test sends them.
- Produces: `GameStatus.CANCELLED = "CANCELLED"`, `GameStatus.FORFEITED = "FORFEITED"`; `GameStatusBadgeVariant` typed `satisfies Record<GameStatus, "default" | "secondary" | "outline" | "destructive">` with `CANCELLED: "destructive"`, `FORFEITED: "outline"`.
- i18n keys (exact copy): `game.status.cancelled` "Cancelled", `game.status.forfeited` "Forfeited", `game.status.ariaLabel.cancelled` "Game cancelled", `game.status.ariaLabel.forfeited` "Game forfeited", `game.discover.cancelled` "Cancelled", `game.discover.forfeited` "Forfeited". Map values: `GameStatusLabelKey` → `game.status.cancelled|forfeited`; aria → `game.status.ariaLabel.cancelled|forfeited`; badge component → `"cancelled"|"forfeited"`; discover → `"cancelled"|"forfeited"`. `game-list-filters.tsx:134-143` needs no code change (it derives `game.status.<camel>`).

- [ ] **Step 0:** Invoke `/vercel-react-best-practices` and `/web-design-guidelines`.
- [ ] **Step 1: Write the failing tests.**
  - `game-status-maps.test.ts`: for every `Object.values(GameStatus)`: `GameStatusBadgeVariant[s]`, `GameStatusLabelKey[s]`, `GameStatusAriaLabelKey[s]` are defined; each label/aria key resolves to a string in `messages/en.json` (walk the dotted path); `game.status.${snakeToCamel(s.toLowerCase())}` resolves (filter labels). Also `expect(Object.values(GameStatus)).toEqual(["SCHEDULED","IN_PROGRESS","COMPLETE","FINALIZED","CANCELLED","FORFEITED"])`.
  - `game-stats.test.tsx`: `it.each(["SCHEDULED","CANCELLED"])("renders nothing for %s", …)` — render `<GameStats game={…basketball game with that status…} />` (mock `next-intl`), assert `container.firstChild` is `null`.
- [ ] **Step 2: Run** `npx vitest run __tests__/lib/game-status-maps.test.ts __tests__/components/game/game-stats.test.tsx`. Expected: FAIL on the enum list and the CANCELLED render.
- [ ] **Step 3: Implement** the enum, maps, i18n keys, and `if (game.gameStatus === GameStatus.SCHEDULED || game.gameStatus === GameStatus.CANCELLED) return null;` (display rule from N10, not a capability). `npx tsc --noEmit` must report no missing `Record<GameStatus, …>` keys.
- [ ] **Step 4: Run** the Step 2 command and `npx tsc --noEmit`. Expected: PASS, 0 type errors.
- [ ] **Step 5: Commit** `feat(game): support CANCELLED and FORFEITED game statuses (N10)`.

### Task C0-4: MSW fixtures — valid GameRole and a cancelled game

**Files:**
- Modify: `tests/fixtures/mock-data/games.ts:16`, `tests/pages/game-media.spec.ts:125,168,188,213,243`
- Modify: `tests/pages/games-list.spec.ts`

**Interfaces:**
- Consumes: `enum GameRole { OWNER EDITOR }`, `GameStatus.CANCELLED`.
- Produces: fixtures use `viewerGameRole: "OWNER"` (replacing the invalid `"ORGANIZER"`, which kept manager UI on only because the client checks `!= null`).

- [ ] **Step 0:** Invoke `/web-design-guidelines` (the new spec asserts accessible names).
- [ ] **Step 1: Add the regression test** (it passes on arrival because C0-3 already landed; it pins N10 end to end) in `games-list.spec.ts`: `"authenticated: cancelled game card shows Cancelled status"` — `msw.use(withMeGuard(() => mockGamesListResponse([mockGame({ gameStatus: "CANCELLED" })])))`, go to `/en/games`, `expect(page.getByLabel("Game cancelled")).toBeVisible()`.
- [ ] **Step 2: Replace** `"ORGANIZER"` with `"OWNER"` in both files.
- [ ] **Step 3: Run** `npx playwright test --project=chromium tests/pages/games-list.spec.ts tests/pages/game-media.spec.ts tests/pages/game-detail.spec.ts 2>&1 | tee /tmp/pw-c0.txt`. Expected: all pass; on failure read the trace before changing code.
- [ ] **Step 4: Commit** `test(game): use a valid GameRole in fixtures; cover cancelled game cards`.

### Task C0-5: Ready gate

- [ ] `npm run lint 2>&1 | tee /tmp/lint-c0.txt` → 0 errors.
- [ ] `npm run build 2>&1 | tee /tmp/build-c0.txt` → succeeds (type-checks `__tests__` too).
- [ ] `npx vitest run 2>&1 | tee /tmp/vitest-c0.txt` → all pass.
- [ ] `npx playwright test 2>&1 | tee /tmp/pw-full.txt` (bare, three browsers) → all pass; report the count from the file.
- [ ] `git diff --name-only main...HEAD` does not list `schema.graphqls`. Push and open the PR; the description states it must deploy before backend B5 (N3).

---

## PR C1 — Schema sync after the I1 hotfix

**Branch:** `0104-c1-schema-sync` · **Backend PR that must be deployed first:** **B1** (I1 restore + N2a).

### Task C1-1: `schema:sync` script and regenerated schema

**Files:**
- Modify: `package.json` (`scripts`)
- Modify: `schema.graphqls`

**Interfaces:**
- Consumes (B1 SDL): `Game.viewerGameRole: GameRole` (restored), `enum LeagueGameRole { ADMIN CAPTAIN PARTICIPANT }`, `Game.viewerLeagueRole: LeagueGameRole` (not selected by the client), removal of `enum GameViewerRole` and `Game.viewerManagementRole`.
- Produces: `npm run schema:sync` = the Global Constraints recipe (JSON-escaped). It reads `../playground-backend`'s working tree, so the backend must be clean at the deployed commit.

- [ ] **Step 1:** Check out the deployed B1 commit in `../playground-backend`; confirm `git -C ../playground-backend status --porcelain src/main/resources/graphql` is empty.
- [ ] **Step 2:** Add the script; run `npm run schema:sync`.
- [ ] **Step 3: Verify** `grep -c "enum GameViewerRole\|viewerManagementRole" schema.graphqls` → `0`; `grep -n "viewerGameRole: GameRole" schema.graphqls` → one match; `grep -n "CANCELLED" schema.graphqls` shows it inside `enum GameStatus`.
- [ ] **Step 4: Commit** `chore(schema): sync schema.graphqls with backend after B1; add schema:sync script` (the contract helper reads HEAD, so commit before testing).
- [ ] **Step 5: Run** `npx vitest run "__tests__/[locale]/settings/actions.test.ts" "__tests__/[locale]/game/actions.test.ts"`. Expected: PASS against the new committed schema. On failure fix forward in a follow-up commit.

### Task C1-2: Ready gate

- [ ] `npm run lint`, `npm run build`, `npx vitest run` (each `| tee /tmp/<name>-c1.txt`) → all pass.
- [ ] `npx playwright test 2>&1 | tee /tmp/pw-full.txt` → all pass (no runtime change expected; the run confirms it). Push and open the PR.

---

## PR C2 — Typed mutation errors

**Branch:** `0104-c2-typed-mutation-errors` · **Backend PR that must be deployed first:** **B3** (I6).

### Task C2-1: Error fragments and `MutationError`

**Files:**
- Modify: `schema.graphqls` (via `npm run schema:sync` at the deployed B3 commit; own first commit)
- Create: `src/lib/graphql-error-classification.ts` (dependency-free home for the `ErrorClassification` enum)
- Modify: `src/lib/graphql-request.ts:124-130` (import the enum from the new module; keep exporting it)
- Modify: `src/lib/graphql-fragments.ts:552-559` (add two fragments after `errorFragment`)
- Modify: `src/lib/graphql-result.ts`
- Create: `__tests__/helpers/mutation-error.ts`, `__tests__/lib/graphql-fragments.test.ts`
- Test (assertion updates): `__tests__/lib/graphql-result.test.ts` (2), `__tests__/[locale]/chat/actions.test.ts` (10), `__tests__/[locale]/game/actions.test.ts` (8), `__tests__/[locale]/game/participant-actions.test.ts` (8), `__tests__/[locale]/upload/actions.test.ts` (3: lines ~342, 422, 435; the FileTooLarge/UnsupportedFileType/ChatRoomNotFound/ResourceNotFound cases at ~104, 186, 268, 491 keep their shape because `requestUpload`/`deleteResource` rebuild the error by hand), `__tests__/[locale]/user/[username]/actions.test.ts` (5), `__tests__/[locale]/game/basketball-stats-actions.test.ts` (1)

**Interfaces:**
- Consumes (B3 SDL): `interface Error { message: String! }`, `interface AuthorizationError implements Error { message: String! }`, `type InvalidInputError implements Error { message: String!  field: String  code: String! }`, `InsufficientLeagueRoleError implements Error & AuthorizationError`, `union CreateInviteLinkResult = CreateInviteLinkResponse | InvitationOwnerNotFoundError | InvalidInputError | RateLimitError | InsufficientLeagueRoleError | InsufficientGroupRoleError` (contract-test target only), top-level classification `FORBIDDEN`.
- Produces (fragments exact, from I6):
  ```ts
  /** Spread ONLY into unions that contain an AuthorizationError implementer. */
  export const authorizationErrorFragment = { __typeName: "AuthorizationError", authorizationErrorType: { __aliasFor: "__typename" } };
  /** Spread ONLY into unions that contain InvalidInputError. */
  export const invalidInputErrorFragment = { __typeName: "InvalidInputError", field: true, code: true };
  ```
  - `src/lib/graphql-error-classification.ts`: `export enum ErrorClassification { BAD_REQUEST, FORBIDDEN, INTERNAL_ERROR, NOT_FOUND, UNAUTHORIZED }` (string values equal to names). `graphql-result.ts` imports the enum from here and only `import type { GraphQLError } from "./graphql-request"`, so it stays free of `next/headers`/auth and existing `vi.mock("@/lib/graphql-request", …)` factories keep working.
  - `MutationError = { success: false; errorType: string; message: string; isAuthorizationError: boolean; field: string | null; code: string | null }`.
  - `extractMutationResult<T extends { __typename: string; message?: string; authorizationErrorType?: string | null; field?: string | null; code?: string | null }>(result: T, successTypeName: string): MutationResult<T>` — `isAuthorizationError = result.authorizationErrorType != null`, `field = result.field ?? null`, `code = result.code ?? null`.
  - `mutationErrorFromGraphQLErrors(errors: GraphQLError[]): MutationError` — `errorType: MutationErrorType.GRAPHQL_ERROR`, `message: errors[0].message`, `isAuthorizationError: errors.some(e => e.extensions?.classification === ErrorClassification.FORBIDDEN)`, `field: null`, `code: null`.
  - Test helper `mutationErrorShape(errorType: string, message: string)` → `{ success: false, errorType, message, isAuthorizationError: false, field: null, code: null }`.

- [ ] **Step 0:** Read the json-to-graphql skill; invoke `/vercel-react-best-practices`. Check out the deployed B3 commit in the backend (C1-1 Step 1 checks), run `npm run schema:sync`, commit `chore(schema): sync schema.graphqls with backend after B3`.
- [ ] **Step 1: Write the failing tests.**
  - `graphql-result.test.ts`: the two existing error expectations become `mutationErrorShape(...)`; add `"flags AuthorizationError implementers"` (`{ __typename: "InsufficientLeagueRoleError", message: "m", authorizationErrorType: "InsufficientLeagueRoleError" }` → `isAuthorizationError: true`), `"carries InvalidInputError field and code"` (`field: "measurementUnit", code: "NULL_NOT_ALLOWED"`), `"maps top-level FORBIDDEN to an authorization error"` and `"keeps non-FORBIDDEN top-level errors non-authorization"` for `mutationErrorFromGraphQLErrors`.
  - The 35 pass-through assertions (counts verified by grep 2026-10-21: chat 10, game 8, participant 8, upload 3, user 5, basketball-stats 1) in the six action suites listed under Files: replace each `toEqual({ success: false, errorType: "…", message: … })` that receives an `extractMutationResult` error with `toEqual(mutationErrorShape("…", …))`. Hand-built errors the actions return themselves (`GRAPHQL_ERROR`, `UNEXPECTED_ERROR` literals) keep their current shape.
  - `graphql-fragments.test.ts`: `validateOperation("mutation", { createInviteLink: { __args: { input: { … required CreateInviteLinkInput fields from the committed schema … } }, __typename: true, __on: [{ __typeName: "CreateInviteLinkResponse", __typename: true }, errorFragment, authorizationErrorFragment, invalidInputErrorFragment] } })` → `[]`; and `jsonToGraphQLQuery({ query: { x: { __on: [authorizationErrorFragment] } } })` contains `... on AuthorizationError { authorizationErrorType: __typename }`.
- [ ] **Step 2: Run** `npx vitest run __tests__/lib "__tests__/[locale]"`. Expected: FAIL (fragments, helper fields and new `MutationError` keys missing).
- [ ] **Step 3: Implement** the classification module, the `graphql-request.ts` import, the two fragments and the `graphql-result.ts` changes.
- [ ] **Step 4: Run** the Step 2 command, then `npx vitest run`. Expected: PASS everywhere.
- [ ] **Step 5: Commit** `feat(graphql): authorization/invalid-input error fragments and richer MutationError (I6)`.

### Task C2-2: Preferences — re-add error fragments, map `field` onto the form

**Files:**
- Modify: `src/app/[locale]/settings/actions.ts:86-91,121-141`
- Create: `src/lib/form-server-errors.ts`, `__tests__/lib/form-server-errors.test.ts`
- Modify: `src/app/[locale]/settings/games/games-settings-form.tsx:60-65`, `src/app/[locale]/settings/privacy/privacy-settings-form.tsx:58-63`, `src/app/[locale]/settings/notifications/notifications-settings-form.tsx:48` (submit handlers only; autosave toggles keep toast-only)
- Modify: `messages/en.json` (`settings.invalidField`)
- Test: `__tests__/[locale]/settings/actions.test.ts`, Create `__tests__/[locale]/settings/games-settings-form.test.tsx`

**Interfaces:**
- Consumes: C2-1 `errorFragment`, `invalidInputErrorFragment`, `MutationError`, `mutationErrorFromGraphQLErrors`; B3 SDL `union UpdateUserPreferencesResult = UpdateUserPreferencesResponse | InvalidInputError`, `InvalidInputError.code` `"NULL_NOT_ALLOWED"` (I6 step 4). `authorizationErrorFragment` is **not** spread here (the union has no AuthorizationError member).
- Produces: `UpdatePreferencesResult` gains `field?: string | null; code?: string | null; isAuthorizationError?: boolean`. `setServerFieldError(form: AnyFormApi, field: string | null | undefined, message: string): boolean` (`import type { AnyFormApi } from "@tanstack/react-form"`, which re-exports form-core) — returns `false` and does nothing unless `field` is an own key of `form.state.values`; otherwise `form.setFieldMeta(field, prev => ({ ...prev, isTouched: true, errorMap: { ...prev?.errorMap, onServer: message } }))` and returns `true`. Form-core's change validation runs an `onServer` validator that clears this error when the field changes. i18n: `settings.invalidField` = "This value couldn't be saved. Check it and try again." Note: the server raises `InvalidInputError` here only for an explicit `null`, which this client never sends, so the inline path is defensive; do not add call sites outside the three preferences forms.

- [ ] **Step 0:** Invoke `/vercel-react-best-practices` and `/web-design-guidelines`; read the json-to-graphql skill.
- [ ] **Step 1: Write the failing tests.**
  - actions test: `"selects Error and InvalidInputError on the preferences result"` — captured mutation validates (`validateOperation` → `[]`) and `jsonToGraphQLQuery({ mutation: captured })` contains `... on InvalidInputError { field code }`; `"returns field and code from InvalidInputError"` — mock `{ __typename: "InvalidInputError", message: "m", field: "measurementUnit", code: "NULL_NOT_ALLOWED" }` → result includes `{ success: false, errorType: "InvalidInputError", field: "measurementUnit", code: "NULL_NOT_ALLOWED" }`; `"marks top-level FORBIDDEN as an authorization error"`; the existing `"returns GraphQL error on mutation errors"` case keeps passing (no mock change needed after C2-1).
  - `form-server-errors.test.ts` (real `FormApi`/`FieldApi` from `@tanstack/react-form`, `form.mount()`, `field.mount()` for `measurementUnit`): `"sets an onServer error on a known field"` (returns `true`, `form.getFieldMeta("measurementUnit")?.errorMap.onServer === "x"`); `"ignores a null field"` and `"ignores a field the form does not have"` (return `false`, no meta change); `"is cleared when the field value changes"` (`field.handleChange("IMPERIAL")` → `onServer` undefined).
  - `games-settings-form.test.tsx` (mock `../actions` `updatePreferences`, `next-intl`, `@/components/ui/toast`): trigger a save by toggling a sport (`fireEvent.click` on a sport `Toggle`, then `fireEvent.submit` the form; BaseUI Select is not drivable in jsdom), mocked result `{ success: false, errorType: "InvalidInputError", message: "m", field: "measurementUnit", code: "NULL_NOT_ALLOWED" }` → `await screen.findByText(<what the mocked t returns for "invalidField">)` rendered by the measurement-unit `FieldError`, and `toast.add` called with the save-error title; `"falls back to toast only when field is null"` → no inline error.
- [ ] **Step 2: Run** `npx vitest run "__tests__/[locale]/settings" __tests__/lib/form-server-errors.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Selection `__on: [{ __typeName: "UpdateUserPreferencesResponse", preferences: preferencesSelection }, errorFragment, invalidInputErrorFragment]`; the GraphQL-errors branch returns `mutationErrorFromGraphQLErrors(response.errors)`; the union branch returns `result` (now carrying `field`/`code`). Each submit handler keeps its toast and additionally calls `setServerFieldError(form, result.field, t("invalidField"))` on failure.
- [ ] **Step 4: Run** the Step 2 command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(settings): restore typed preferences errors and map InvalidInputError onto form fields (I6)`.

### Task C2-3: Ready gate

- [ ] `npm run lint`, `npm run build`, `npx vitest run` (tee each) → pass.
- [ ] `npx playwright test --project=chromium tests/pages/settings.spec.ts 2>&1 | tee /tmp/pw-c2.txt` → pass, then bare `npx playwright test 2>&1 | tee /tmp/pw-full.txt` → pass. Push and open the PR.

---

## PR C3 — `viewerCan` capabilities, chat flags, live game events

**Branch:** `0104-c3-viewer-can` · **Backend PR that must be deployed first:** **B6** (I2 phase 1; implies B2 `ManagedChatRoomError`, B4, B5 `GameCancelledEvent`). Must deploy before **B6b**.

### Task C3-1: `GameViewerCan` type, shared fragment, detail query, subscription, reducer, live events

**Files:**
- Modify: `schema.graphqls` (`npm run schema:sync` at the deployed B6 commit; own first commit)
- Modify: `src/lib/graphql-fragments.ts` (add `gameViewerCanFragment`)
- Modify: `src/lib/types/game.ts:279-299` (`GameViewerCan`; `GameDetail.viewerCan`)
- Modify: `src/lib/types/game-event.ts:11-20,78-113`
- Modify: `src/app/[locale]/game/[id]/page.tsx:79-107` (`gameQueryFields`), `src/hooks/use-game-subscription.ts:49-66`
- Modify: `src/components/game/live/game-live-reducer.ts:36-46`, `src/components/game/live/game-detail-client.tsx:111-120` (announcer)
- Modify: `messages/en.json` (`game.live.gameCancelled`)
- Create: `__tests__/helpers/game-viewer-can.ts`
- Test: `__tests__/components/game/live/game-live-reducer.test.ts`, `__tests__/hooks/use-game-subscription.test.ts`, `__tests__/lib/graphql-fragments.test.ts`; update every test that builds a `GameDetail`/`GameEventGame` (`game-detail-actions`, `game-detail-hero`, `game-score-block`, `game-stats` from C0-3, `game-card` if typed as `GameDetail`) to include `viewerCan`.

**Interfaces:**
- Consumes (B6/B5 SDL, with the B6 amendments):
  - `type GameViewerCan { update delete start end cancel finalizeResults unfinalizeResults manageEditors invite enterStats enterOwnStats join addParticipants addMedia moderateMedia: Boolean! }` (15 core fields, matching `plan-backend-B4-B6.md` B6 SDL) — `enterStats` = may enter/edit stats for ANY player (owner/editor, or participant in OPEN mode while not FINALIZED); `enterOwnStats` = may enter/edit the viewer's OWN row (participant, SELF_REPORT or OPEN, not FINALIZED); a row for user U is editable iff `enterStats || (enterOwnStats && U == viewer)`. `manageEditors` = `game:add_editor` (owner only). B6 makes `update delete invite addParticipants addMedia enterStats enterOwnStats join` false on CANCELLED/FORFEITED, and `join` also false on FINALIZED. Group/league admins' `enterStats` stays false pending design §5 Q3; the client does not special-case it.
  - League `extend type GameViewerCan { reportResult confirmResult disputeResult voidResult reschedule forfeit: Boolean! }`.
  - `Game.viewerCan: GameViewerCan!`; `Game.viewerGameRole: GameRole` (kept for display); `Subscription.gameEvents(gameId: ID!): GameEvent!`; `type GameCancelledEvent implements GameEvent { game: Game!  occurredAt: DateTime! }`; `GameStatus.CANCELLED`.
  - B4.8a: `type GameResultChangedEvent implements GameEvent { game: Game!  occurredAt: DateTime! }`, published on `gameEvents` for league result report, re-report and dispute, so `confirmResult`/`disputeResult`/`reportResult` flip live through the shared `game.viewerCan` selection.
- Produces:
  - `export interface GameViewerCan` with exactly those 21 `boolean` fields; `GameDetail.viewerCan: GameViewerCan`; `GameEventGame.viewerCan: GameViewerCan`.
  - `export const gameViewerCanFragment` = the 21 field names, each `true`. Spread as `viewerCan: gameViewerCanFragment` in **both** `gameQueryFields` (authenticated and anonymous branches share it) and the `gameEvents.game` selection. Not added to `generateMetadata`, `games/page.tsx`, `feed/actions.ts`, `user/[username]/page.tsx`, `page.tsx`, or `loadMoreGames`.
  - `export interface GameCancelledEvent extends GameEventBase { __typename: "GameCancelledEvent" }` and `export interface GameResultChangedEvent extends GameEventBase { __typename: "GameResultChangedEvent" }`, both added to `KnownGameEvent` and `isKnownGameEventType`. Subscription `__on` arms: `{ __typeName: "GameCancelledEvent", occurredAt: true }` and `{ __typeName: "GameResultChangedEvent", occurredAt: true }` (a field is required or the library drops the arm). The reducer needs no per-type branch: the shared `game` merge carries status and `viewerCan`.
  - Reducer `GAME_EVENT` sets `viewerCan: event.game.viewerCan` (wholesale replace).
  - Test helper `gameViewerCan(overrides?: Partial<GameViewerCan>): GameViewerCan` (all `false` + overrides).
  - i18n `game.live.gameCancelled` = "This game has been cancelled"; announcer branch `state.game.gameStatus === GameStatus.CANCELLED`.

- [ ] **Step 0:** Read the json-to-graphql skill; invoke `/vercel-react-best-practices` (`server-serialization`, `rerender-derived-state`) and `/web-design-guidelines` (live-region announcement). Check out the deployed B6 commit in the backend, run `npm run schema:sync`, confirm `grep -n "type GameViewerCan\|enterOwnStats\|type ChatRoomViewerCan\|type GameCancelledEvent\|type ManagedChatRoomError\|type GameResultChangedEvent" schema.graphqls` finds all six, commit `chore(schema): sync schema.graphqls with backend after B6`.
- [ ] **Step 1: Write the failing tests.**
  - fragments test: `Object.keys(gameViewerCanFragment).sort()` equals the 21 names sorted; `validateOperation("query", { game: { __args: { id: "1" }, viewerCan: gameViewerCanFragment } })` → `[]`.
  - subscription test `"subscribes with the full viewerCan selection and the new event arms"`: `validateDocument(payload.query)` → `[]`; `payload.query` contains `... on GameCancelledEvent { occurredAt }`, `... on GameResultChangedEvent { occurredAt }`, `enterOwnStats`, `unfinalizeResults`, `forfeit`, `moderateMedia`.
  - reducer tests: `"replaces viewerCan wholesale from the event"` (state `start: true`, event `end: true, start: false` → merged equals the event object); `"applies GameCancelledEvent status and capabilities"` (event `gameStatus: "CANCELLED"`, all-false flags → state reflects both); `"applies GameResultChangedEvent capabilities"` (opposing captain: event flips `confirmResult` and `disputeResult` false → true, `gameStatus` unchanged; a second event after a dispute flips them back and `reportResult` true); `isKnownGameEventType` → `true` for both new typenames.
- [ ] **Step 2: Run** `npx vitest run __tests__/lib/graphql-fragments.test.ts __tests__/hooks/use-game-subscription.test.ts __tests__/components/game/live/game-live-reducer.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the type, fragment, selections, event types/guard, reducer line, announcer branch and i18n key; add `viewerCan: gameViewerCan()` to the other tests' fixtures.
- [ ] **Step 4: Run** the Step 2 command, then `npx tsc --noEmit`. Expected: PASS, 0 errors.
- [ ] **Step 5: Commit** `feat(game): select viewerCan on game detail and gameEvents; handle cancel and result-reported events (I2, N3)`.

### Task C3-2: Game detail actions on `viewerCan`

**Files:**
- Modify: `src/components/game/game-detail-actions.tsx:19,42-48,93-167`
- Test: `__tests__/components/game/game-detail-actions.test.tsx`

**Interfaces:**
- Consumes: C3-1 `GameDetail.viewerCan`, `gameViewerCan()`.
- Produces: gating — Start `viewerCan.start`; End `viewerCan.end`; Edit `viewerCan.update`; Invite `viewerCan.invite && gameStatus !== COMPLETE && gameStatus !== FINALIZED` (today's UX guard, unchanged; CANCELLED/FORFEITED come from the flag); Finalize `viewerCan.finalizeResults`; Unfinalize `viewerCan.unfinalizeResults`; Manage Editors `viewerCan.manageEditors`; Delete `viewerCan.delete` (separator only when Delete renders). The `viewerGameRole == null` early return and the `GameRole` import are removed. Render `null` when none of the eight controls is allowed; render the overflow trigger only when at least one menu item is allowed.

- [ ] **Step 0:** Invoke `/vercel-react-best-practices` and `/web-design-guidelines`.
- [ ] **Step 1: Write the failing tests** (replace role-based fixtures with `viewerCan`):
  - `"renders nothing when every flag is false"` (also with `viewerGameRole: "OWNER"` → still nothing; the role no longer gates).
  - `"renders actions for a viewer with no GameRole when viewerCan.start is true"` (`viewerGameRole: null`, `start: true, update: true`) → Start button and More options visible.
  - `"hides the overflow trigger when no menu item is allowed"` (`start: true` only) → Start visible, no "More options" button.
  - `"shows Finalize only when finalizeResults"`, `"shows Unfinalize only when unfinalizeResults"`, `"shows Manage Editors and Delete only from their flags"`.
  - `"swaps Start for End when flags change"` (rerender with `start: false, end: true`).
  - `"shows only server-granted controls on a cancelled game"` (`gameStatus: "CANCELLED"`, flags as B6 sends for an owner: `manageEditors: true`, rest false) → only Manage Editors in the menu; no Edit, Delete, Invite, Start.
- [ ] **Step 2: Run** `npx vitest run __tests__/components/game/game-detail-actions.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** per Produces.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `refactor(game): gate game actions on viewerCan instead of viewerGameRole (I2)`.

### Task C3-3: Participants on `join` / `addParticipants`

**Files:**
- Modify: `src/components/game/team-card.tsx:51-85` (props, `canJoinOrLeave`, `isEditor`)
- Modify: `src/components/game/individual-participant-list.tsx:30-66,165`
- Modify: `src/components/game/game-participants.tsx:62-70,100-125`
- Create: `__tests__/components/game/individual-participant-list.test.tsx`, `__tests__/components/game/game-participants.test.tsx`

**Interfaces:**
- Consumes: `GameDetail.viewerCan.join` (self-join: `individual_participant:create` for self / `team_instance:add_user` for self), `.addParticipants` (`team_instance:create` / participant create for others).
- Produces: `TeamCard` and `IndividualParticipantList` drop `viewerGameRole`, `visibility`, `viewerInvitation` props (now unused) and take `canJoin: boolean; canManageParticipants: boolean`. Team join button: `!isUserOnTeam && !isUserOnAnyTeam && canJoin`; team roster edit controls (`isEditor`): `canManageParticipants`. Individual join: `!atParticipantLimit && !currentUserParticipant && canJoin`; remove-participant button: `canManageParticipants`. Add Team button in `game-participants.tsx`: `isTeamBased && !atParticipantLimit && viewerCan.addParticipants`. No client status checks (B6 sets both flags false on CANCELLED/FORFEITED).

- [ ] **Step 0:** Invoke `/vercel-react-best-practices` and `/web-design-guidelines`.
- [ ] **Step 1: Write the failing tests.**
  - `individual-participant-list.test.tsx` (mock `next-intl`, `@/app/[locale]/game/actions`, toast): `"shows Join only when canJoin"`; `"hides Join at the participant limit even when canJoin"`; `"shows remove buttons only when canManageParticipants"`; `"a PUBLIC game no longer implies Join"` (no `visibility` prop exists; `canJoin: false` → no Join); `"hides Join when the cancelled-game flags arrive"` (rerender `canJoin: true` → `false`).
  - `game-participants.test.tsx`: `"PUBLIC non-manager with join=true sees no Add Team"` (team sport, `join: true, addParticipants: false`); `"manager sees Add Team"` (`addParticipants: true`).
- [ ] **Step 2: Run** `npx vitest run __tests__/components/game/individual-participant-list.test.tsx __tests__/components/game/game-participants.test.tsx`. Expected: FAIL (props do not exist; Add Team still shows for `join`).
- [ ] **Step 3: Implement** per Produces; remove imports made unused (`GameVisibility`, `GameInvitationStatus`, `GameRole`, `ViewerGameInvitation` where orphaned).
- [ ] **Step 4: Run** the same command and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `refactor(game): gate participant join and management on viewerCan (I2)`.

### Task C3-4: Stats, scores and media on `viewerCan`

**Files:**
- Modify: the ten stats tables `src/components/game/{basketball,pickleball,tennis,volleyball,football-offensive,football-defensive,football-special-teams,baseball-batting,baseball-pitching,baseball-fielding}-stats-table.tsx` (props, `canEdit`, row/picker gating; e.g. `basketball-stats-table.tsx:61,93,106-118`)
- Modify: `src/components/game/game-stats.tsx:40-52` (add `currentUserId: number | null` to `GameStatsProps`), `:146-147`, and the table props it passes (incl. `sharedProps` near `:304`)
- Modify: `src/components/game/game-score-block.tsx:33-36`
- Modify: `src/components/game/live/game-detail-client.tsx:180-183,227,233-245` (pass `currentUserId={currentUserId}` to `<GameStats>`; the id is `GameDetailClient`'s existing `currentUserId: number | null` prop, which `src/app/[locale]/game/[id]/page.tsx` fills from the authenticated `me { id }` query, `null` when signed out), `src/components/game/game-media-section.tsx:22,32,131`, `src/components/game/game-media-gallery.tsx:41,63,253-257`
- Test: `__tests__/components/game/game-score-block.test.tsx`, `__tests__/components/game/game-stats.test.tsx`; Create `__tests__/components/game/basketball-stats-table.test.tsx`

**Interfaces:**
- Consumes: `viewerCan.enterStats`, `.enterOwnStats`, `.update`, `.addMedia`, `.moderateMedia`.
- Produces:
  - Stats tables: props `canEnterStats: boolean; canEnterOwnStats: boolean; currentUserId: number | null` replace `viewerGameRole`. With `editableStatus = gameStatus === IN_PROGRESS || gameStatus === COMPLETE` (existing UX guard): `canEditRow(userId) = editableStatus && (canEnterStats || (canEnterOwnStats && userId === currentUserId))`; the add-stats user picker lists every user without stats when `canEnterStats`, only the viewer when only `canEnterOwnStats`, and is hidden otherwise.
  - `GameStats`: `defaultOpen = game.viewerCan.enterStats && game.gameStatus === GameStatus.COMPLETE`; takes the new `currentUserId` prop and passes `canEnterStats`, `canEnterOwnStats`, `currentUserId` to every table.
  - Score block: `canEdit = game.viewerCan.update && (IN_PROGRESS || COMPLETE)` (no dedicated score flag; see Open issues).
  - Media: `canContribute = state.game.viewerCan.addMedia && (IN_PROGRESS || COMPLETE)` (replaces `isParticipant || viewerGameRole`); `GameMediaSection`/`GameMediaGallery` prop `canModerateMedia: boolean` replaces `viewerGameRole`; `canDeleteMedia = canModerateMedia || (currentUserId != null && mediaNode.addedBy.id === currentUserId)`.

- [ ] **Step 0:** Invoke `/vercel-react-best-practices` and `/web-design-guidelines`.
- [ ] **Step 1: Write the failing tests:**
  - `basketball-stats-table.test.tsx`: `"shows edit controls on every row when canEnterStats on an IN_PROGRESS game"`; `"SELF_REPORT participant sees edit only on their own row"` (`canEnterStats: false, canEnterOwnStats: true, currentUserId: 7`, rows for users 7 and 8 → edit on 7 only; picker offers only user 7); `"hides edit controls when both flags are false"`; `"hides edit controls on FINALIZED even when canEnterStats"`.
  - `game-score-block.test.tsx`: `"shows the edit-score button from viewerCan.update"` (`viewerGameRole: null`, `update: true`, IN_PROGRESS → visible) and `"hides it when update is false"` (`viewerGameRole: "OWNER"`, `update: false` → hidden).
  - `game-stats.test.tsx` (every render now passes `currentUserId`, e.g. `7`): `"opens sections by default when enterStats on a COMPLETE game"`; `"keeps sections closed for enterOwnStats only"`.
- [ ] **Step 2: Run** `npx vitest run __tests__/components/game/basketball-stats-table.test.tsx __tests__/components/game/game-score-block.test.tsx __tests__/components/game/game-stats.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** per Produces across all ten tables (identical change each); remove `GameRole` imports made unused.
- [ ] **Step 4: Run** the Step 2 command, `npx tsc --noEmit`, and `grep -rn "viewerGameRole" src/components` → only display/selection uses remain (none gating). Expected: PASS.
- [ ] **Step 5: Commit** `refactor(game): gate stats, scores and media on viewerCan (I2)`.

### Task C3-5: Chat — `viewerCan` in `loadChatRoom`, drop `canMessage`, refresh after role changes, `ManagedChatRoomError`

**Files:**
- Modify: `src/app/[locale]/chat/actions.ts:112-150` (`loadChatRoom`)
- Modify: `src/lib/graphql-fragments.ts:224-233` (remove the `DirectMessageChatRoom` `canMessage` arm; keep the array with the `GroupChatRoom` arm)
- Modify: `src/lib/types/chat.ts:124-146` (`ChatRoomViewerCan`; `ChatRoomDetailBase.viewerCan`; remove `canMessage`)
- Modify: `src/components/chat/conversation-view.tsx:218-223,293-296,580-582`, `src/components/chat/dm-disabled-banner.tsx`
- Modify: `src/components/chat/member-list-panel.tsx:54-74,135-215,236-330`, `src/components/chat/chat-layout.tsx:242-250,315-328`
- Modify: `messages/en.json` (`chat.errors.managedRoom`, `chat.sendDisabled`)
- Test: `__tests__/[locale]/chat/actions.test.ts`, Create `__tests__/components/chat/member-list-panel.test.tsx`

**Interfaces:**
- Consumes (B6/B2 SDL): `type ChatRoomViewerCan { sendMessage addMember removeMember rename leave updateMemberRole: Boolean! }`; `interface ChatRoom { viewerCan: ChatRoomViewerCan! }` (also on `DirectMessageChatRoom`, `GroupChatRoom`); `leave` is false for the room owner (B6.5); `DirectMessageChatRoom.canMessage` (deprecated; no longer selected); `type ManagedChatRoomError implements Error { message: String! }` in `AddChatRoomMemberResult`, `RemoveChatRoomMemberResult`, `LeaveChatRoomResult`, `RenameChatRoomResult`, `UpdateChatRoomMemberRoleResult` (matched by the existing `errorFragment`; the client has no rename UI).
- Produces:
  - `export interface ChatRoomViewerCan` (6 booleans); `ChatRoomDetailBase.viewerCan: ChatRoomViewerCan`.
  - `loadChatRoom` selects `viewerCan: { sendMessage: true, addMember: true, removeMember: true, rename: true, leave: true, updateMemberRole: true }` at the interface level (outside `__on`). Inline in `loadChatRoom` (single use).
  - Conversation send state: `setCanMessage(roomData.viewerCan.sendMessage)` for every room type on load and reconnect. When `!canMessage`: DMs render `<DmDisabledBanner />` (unchanged copy); group rooms render the same banner with `chat.sendDisabled` = "You can't send messages in this conversation." (`DmDisabledBanner` gains optional `message?: string`).
  - `MemberListPanel` props `viewerCan: ChatRoomViewerCan` (from `activeRoom.viewerCan`) and `onRoomRefresh: () => void`. Leave: `viewerCan.leave` (owner exclusion is in the flag); Add: `viewerCan.addMember`; remove button: `viewerCan.removeMember && canRemoveMember(currentUserRole, member.role)`; promote/demote/transfer: `viewerCan.updateMemberRole &&` the existing per-target role checks. After every successful `handleRoleChange` and `handleConfirmTransfer` the panel calls `onRoomRefresh()`, so a former owner sees Leave without reload.
  - `chat-layout.tsx`: `refreshActiveRoom = useCallback(async () => { const id = selectedRoomId; if (!id) return; const room = await loadChatRoom(id); if (room && id === <current selected id, via ref>) handleRoomLoaded(room); }, [...])`, passed as `onRoomRefresh` (the ref guard drops a late response after the user switched rooms).
  - Failure toasts in add/remove/leave/role-change handlers use `tChat("errors.managedRoom")` = "Members of this chat are managed by its league or group." when `result.errorType === "ManagedChatRoomError"`.

- [ ] **Step 0:** Read the json-to-graphql skill; invoke `/vercel-react-best-practices` and `/web-design-guidelines`.
- [ ] **Step 1: Write the failing tests.**
  - actions test: `"loadChatRoom selects viewerCan and validates against the schema"` (`validateOperation("query", mockAuthQuery.mock.calls[0][0])` → `[]`; the rendered query contains `viewerCan { sendMessage` and not `canMessage`); `"chatRooms list query does not select viewerCan"`.
  - `member-list-panel.test.tsx` (mock actions, `@/i18n/navigation`, toast, `next-intl`, the dynamic selector): `"hides Leave and Add for a managed room"` (all flags false, non-DM, MEMBER); `"shows Leave and Add from flags"`; `"hides role controls when updateMemberRole is false even for the owner"`; `"refreshes the room after transferring ownership"` (owner, `updateMemberRole: true`, mock `updateMemberRole` success, confirm transfer → `onRoomRefresh` called once); `"refreshes the room after a promote"`; `"shows the managed-room message on ManagedChatRoomError"` (mock `leaveChat` → `{ success: false, errorType: "ManagedChatRoomError", message: "x" }`, confirm leave → toast title is the `errors.managedRoom` key).
- [ ] **Step 2: Run** `npx vitest run "__tests__/[locale]/chat/actions.test.ts" __tests__/components/chat/member-list-panel.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** per Produces. `handleSendError`'s `MutualFollowRequiredError` path stays.
- [ ] **Step 4: Run** the Step 2 command, `npx vitest run __tests__/hooks/use-chat-subscription.test.ts`, and `grep -rn "canMessage" src` → only the local `canMessage` state in `conversation-view.tsx`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(chat): gate chat controls on ChatRoom.viewerCan; drop canMessage; map ManagedChatRoomError (I2, N6)`.

### Task C3-6: MSW fixtures and Playwright coverage

**Files:**
- Modify: `tests/fixtures/mock-data/games.ts` (`mockGameViewerCan`, default `viewerCan`)
- Modify: `tests/fixtures/mock-data/chat.ts:98-150` (`canMessage` removed; `viewerCan` on detail nodes)
- Modify: `tests/pages/game-detail.spec.ts`, `tests/pages/game-media.spec.ts`, `tests/pages/chat.spec.ts`

**Interfaces:**
- Consumes: C3-1..C3-5 selections.
- Produces: `mockGameViewerCan(overrides?: Record<string, boolean>)` — all 21 flags `false` + overrides. `mockGame` default `viewerCan` = owner-on-SCHEDULED: `update, delete, start, cancel, manageEditors, invite, enterStats, addParticipants, addMedia, moderateMedia` true (exactly B6's `owner_scheduledCasualGame` case; specs that need Join or own-stats override `join`/`enterOwnStats`). Every spec that overrides `gameStatus` for a manager scenario also overrides `viewerCan` with the flags that status implies (e.g. COMPLETE owner: `finalizeResults: true, start: false`; FINALIZED owner: `unfinalizeResults: true`; CANCELLED owner: `manageEditors, moderateMedia` only). `mockChatRoomDetail` default `viewerCan` = DM member `{ sendMessage: true, addMember: false, removeMember: false, rename: false, leave: false, updateMemberRole: false }`; group-room overrides set the group flags. `mockChatRoomListNode` no longer has `canMessage`.

- [ ] **Step 0:** Invoke `/web-design-guidelines` (assertions use roles/accessible names).
- [ ] **Step 1: Write the new specs.**
  - game-detail: `"authenticated: admin without a GameRole sees Start"` (`viewerGameRole: null`, `viewerCan: mockGameViewerCan({ start: true, update: true })`) → `button "Start Game"` visible; `"authenticated: owner role without flags sees no actions"` (`viewerGameRole: "OWNER"`, all false) → no "More options"; `"unauthenticated: public game shows no management controls"` (anonymous, all false); `"authenticated: PUBLIC team game non-manager sees no Add Team"` (`join: true`, `addParticipants: false`).
  - chat: `"group room with no membership flags hides Leave and Add"`; `"DM with sendMessage false shows the disabled banner"`; `"owner sees Leave after transferring ownership"` — needs a per-test handler, because `withMeGuardMap` is a static map and `loadChatRoom` and `loadMessages` both use the top-level `chatRoom` field: `msw.use(http.post("*/graphql", …))` that answers `me` queries with `mockMeResponse()` (same `/\bme\s*\{/` guard as `withMeGuard`), sets a local `transferred = true` when the query contains `updateChatRoomMemberRole` (and returns a success response), and for every `chatRoom` request returns `mockChatRoomDetail` for a group room with the viewer as OWNER and `viewerCan: { …, updateMemberRole: true, leave: false }` before the transfer, and the viewer as MEMBER with `leave: true` after it; the response must also satisfy `loadMessages` (include the `chatMessages` connection as the default fixture does). Open the member panel, transfer ownership, wait for the success toast, then assert the Leave button is visible.
- [ ] **Step 2: Update fixtures** per Produces and fix existing specs that relied on the role.
- [ ] **Step 3: Run** `npx playwright test --project=chromium tests/pages/game-detail.spec.ts tests/pages/game-media.spec.ts tests/pages/chat.spec.ts 2>&1 | tee /tmp/pw-c3.txt`. Expected: all pass; read failures from the file (use the Playwright MCP `browser_snapshot` to inspect DOM rather than re-running).
- [ ] **Step 4: Commit** `test: viewerCan fixtures and capability specs for game detail and chat`.

### Task C3-7: Ready gate

- [ ] `npm run lint`, `npm run build`, `npx vitest run` (tee each) → pass.
- [ ] `grep -rn "viewerCan" "src/app/[locale]/games" "src/app/[locale]/feed" "src/app/[locale]/user" "src/app/[locale]/page.tsx"` → no matches (list pages never select it); `grep -rn "unstable_cache\|force-cache" "src/app/[locale]/game" "src/app/[locale]/chat"` → no new matches.
- [ ] Bare `npx playwright test 2>&1 | tee /tmp/pw-full.txt` (chromium + firefox + webkit) → all pass; report the count from the file. Push and open the PR; the description states B6b may only merge after this PR is deployed.

---

## Open issues for the design

1. **Ten stats tables, not eight.** I2 says "the eight `*-stats-table.tsx` `canEdit` checks"; the code has ten (volleyball and the three baseball tables). The plan migrates all ten.
2. **Role-composition sites missing from the I2 list:** `game-score-block.tsx:33-36` (team score editing) and `game-detail-client.tsx:180-183` (media `canContribute`). The plan maps them to `viewerCan.update` and `viewerCan.addMedia`. No flag names team-score entry (`team_instance:update`); the backend should confirm `update` is equivalent or add a flag.
3. **Team join flag.** The plan relies on B6 O10: `join` = `team_instance:add_user` for self (team sports) or `individual_participant:create` for self; `addParticipants` = create for others. Add Team uses `addParticipants` only. The B6 SDL description for `join` should name both actions.
4. **`manageEditors`: resolved.** B6 maps it to `game:add_editor` (owner only), matching `P:game.yaml:70-75`.
5. **UX status guards kept on the client.** B6 now folds CANCELLED/FORFEITED into the flags, so the client drops that duplication. It keeps the pre-existing guards that are not duplications: stats/score/media editable only IN_PROGRESS or COMPLETE (flags stay true on SCHEDULED/FINALIZED for managers), Invite hidden on COMPLETE/FINALIZED. If the backend wants these as capability semantics, fold them into the flags and drop the client guards.
6. **Chat flags are room-level; role controls are per target.** Promote/demote/transfer/remove still use the target member's role together with the flag. Flags refresh after the viewer's own role changes (C3-5), but not after changes made by someone else until the room reloads; the server stays authoritative.
7. **`authorizationErrorFragment` has no consumer in C2.** No client mutation's union contains an `AuthorizationError` member yet (legacy core keeps top-level FORBIDDEN; there is no cancel UI). The plan adds it as specified, with a contract test only.
8. **N1 Unfinalize copy is unassigned.** "When `game.league != null` and `outcome == CONFIRMED`, the Unfinalize confirmation dialog states that it reopens result confirmation" is in no §4 row. Unfinalize has no confirmation dialog today, and the detail query selects neither `league` nor `outcome`. Recommend C4+ (league game page).
9. **C10 vs §4 wording.** §4 says only C1 regenerates `schema.graphqls`; the plan also regenerates it in C2 and C3 (after B3/B6 deploy) so their contract tests validate the new SDL. The committed schema on `main` is stale today (no `CANCELLED`/`FORFEITED`), so C0 cannot contract-test the new statuses.
10. **CANCELLED/FORFEITED hero.** `game-hero-content.tsx:42` and `game-detail-hero.tsx:84,100` special-case only SCHEDULED, so a cancelled game renders the score layout. N10 does not cover this; it is a follow-up UX decision.
11. **Group-room send-disabled copy.** Before B6a, `sendMessage` is always true for group-room members. The plan adds a generic `chat.sendDisabled` string for the false case; B6a (read-only archived rooms) may want specific copy.
12. **`GameResultChangedEvent` (B4.8a) is outside the design's event list** (backend O20). C3 consumes it; no client UI reads `result`/`outcome` yet, so its only effect today is refreshed `viewerCan` and status.
13. **Inline `InvalidInputError` path is synthetic for preferences.** The server raises it only for explicit `null`, which the client never sends. The helper stays limited to the preferences forms until a mutation can return a reachable `field`.
