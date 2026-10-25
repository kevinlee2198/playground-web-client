# Adversarial Review: 0104 API/Client Alignment — Web Client Implementation Plan (C0–C3)

Reviewed: `.claudedoc/0104-api-client-alignment/implementation.md`
Against: backend `design.md` (§2 C1/C3/C6/C10, §3 Client paragraphs, §3a, §4 C0–C3), `plan-backend-B1-B3.md`, `plan-backend-B4-B6.md`, the client source on `main` (plus the uncommitted `schema.graphqls`), `node_modules/json-to-graphql-query/lib/jsonToGraphQLQuery.js`, and the Cerbos policies in `../playground-backend/cerbos/policies/`.

Scope: the plan, not the design. Settled design decisions (I1, N1, §5) are not reopened. Every issue below was checked against code and is at ≥70% confidence.

What checks out (verified, no action needed):
- **Paths and line ranges:** every file, line range, fragment, type, test file and fixture the plan names exists as described, e.g. `settings/actions.ts:121-133`, `constants.ts:185-190/238-262`, `types/game.ts:279-299/656-668`, `game-event.ts:11-20,78-113`, `use-game-subscription.ts:49-66`, `game-live-reducer.ts:36-46`, `graphql-fragments.ts:224-233/559`, `member-list-panel.tsx:54-74/236-330`, `conversation-view.tsx:218-223/293-296/580-582`, `chat-layout.tsx:315-328`, `tests/fixtures/mock-data/games.ts:16`, `game-media.spec.ts:125…243`, `chat.ts:98-150`, and `actions.test.ts:601`.
- **Schema names:** every SDL name selected in C1–C3 exists in the backend PR it waits on. `UpdateUserPreferencesResult | InvalidInputError` and the `CreateInviteLinkResult` members come from B3.3/B3.6. The 20 `GameViewerCan` fields come from B6.2/B6.3. The 6 `ChatRoomViewerCan` fields come from B6.5. `GameCancelledEvent { game occurredAt }` comes from B5.3. `ManagedChatRoomError` in the five chat unions comes from B2.9. Nothing is selected before its backend PR deploys, and `authorizationErrorFragment` is spread only in a test, into a union that has AuthorizationError members.
- **C0 drift fixes are real bugs:**
  - The Zod enum lacks VOLLEYBALL while the form offers it (`actions.ts:20-22`).
  - My Games silently drops `?gameStatus=FINALIZED` (`games/page.tsx:281-289`).
  - `"constructor" in GameStatus` is true (`games/page.tsx:104`, `page.tsx:157`).
  - `?sortField=END_DATE` passes the URL whitelist (`games/page.tsx:315`) but fails validation on the server.
  - The `"ORGANIZER"` fixture is not a valid GameRole.
  - The `endAfter`/`endBefore` lines are dead code (nothing sets them). Harmless to remove, but this one is a cleanup, not a live bug.
- **C3 role-composition coverage:** grepping `viewerGameRole`, `GameRole.`, `GameVisibility.PUBLIC`, `GameInvitationStatus.ACCEPTED` and `canMessage` finds every gating site in the C3 tasks: game-detail-actions, team-card, individual-participant-list, game-participants, all 10 stats tables (including `game-stats.tsx:304` `sharedProps`), game-stats `defaultOpen`, game-score-block, game-detail-client `canContribute`, game-media-section/gallery, conversation-view, member-list-panel and `chatRoomInlineFragments`. `manage-editors-dialog.tsx` reads *member* roles for display, not the viewer's, so it correctly stays.
- **Live updates:** the subscription and the detail query share one `gameViewerCanFragment`, the reducer replaces `viewerCan` wholesale, and `GameScoreBlock` reads `liveContext.game`. Live updates will not drop or go stale on the game page.
- **graphql-js and `@oneOf`:** `graphql@16.12` lists `@oneOf` in `specifiedDirectives`, so `buildSchema(schema.graphqls)` will not throw on the 16 `@oneOf` inputs.
- **Process requirements:** tee'd test output, the bare three-browser Playwright run in every ready gate, the content-visibility guard, `fireEvent` only with no new test packages, Step 0 skill invocations, `T | null` response types and `@/i18n/navigation` are all covered.

---

## High Issues

### 1. C2 Task C2-1: the richer `MutationError` breaks 41 existing assertions; the plan says no suite breaks (HIGH, Confidence: 95%)

**Problem:** C2-1 adds `isAuthorizationError`, `field` and `code` to every error that `extractMutationResult` returns. Server actions pass that object straight through, e.g. `src/app/[locale]/chat/actions.ts:286-287`: `const result = extractMutationResult(...); if (!result.success) return result;`. Existing tests then assert the exact shape with `toEqual({ success: false, errorType: "XxxError", message: "..." })`. The new keys hold `false` and `null`, which `toEqual` does not ignore. A multiline grep finds 41 such assertions:

| Test file | Assertions |
| --- | --- |
| `__tests__/[locale]/chat/actions.test.ts` | 10 |
| `__tests__/[locale]/game/actions.test.ts` | 8 |
| `__tests__/[locale]/game/participant-actions.test.ts` | 8 |
| `__tests__/[locale]/upload/actions.test.ts` | 7 |
| `__tests__/[locale]/user/[username]/actions.test.ts` | 5 |
| `__tests__/[locale]/game/basketball-stats-actions.test.ts` | 1 |
| `__tests__/lib/graphql-result.test.ts` | 2 (already covered by the plan) |

C2-1 Step 4 says the opposite: "`npx vitest run` (no other suite should break: callers only pass the result through)". Passing the result through is exactly what breaks them.

**Impact:** C2-1 cannot reach green as written. An implementer will either loosen assertions ad hoc or stall, and the C2-3 gate fails.

**Fix:** In C2-1 Step 1, list the six files and update each error-path expectation to include `isAuthorizationError: false, field: null, code: null`. To avoid repeating the literal 41 times, add a small builder (`mutationErrorShape(errorType, message)`) in `__tests__/helpers/`. Correct the Step 4 note.

### 2. C2 Tasks C2-1/C2-2: `graphql-result.ts` importing `ErrorClassification` from `./graphql-request` breaks the existing mocks and pulls in server-only modules (HIGH, Confidence: 85%)

**Problem:** C2-1 Step 3 says "import `ErrorClassification`, `GraphQLError` from `./graphql-request`". `ErrorClassification` is a runtime enum (`graphql-request.ts:124`), so the import is not type-only. Two consequences:
1. Every action test mocks that module with a factory that omits the enum. `__tests__/[locale]/settings/actions.test.ts:8-11` exports only `authQuery`/`authMutate`. When C2-2 routes the GraphQL-errors branch through `mutationErrorFromGraphQLErrors`, the access to `ErrorClassification.FORBIDDEN` throws Vitest's "No "ErrorClassification" export is defined on the mock". `updatePreferences`'s `catch` swallows it and returns `UNEXPECTED_ERROR`. So the existing test at `settings/actions.test.ts:233-239` (expects `GRAPHQL_ERROR`) and the new "marks top-level FORBIDDEN as an authorization error" test both fail for a reason unrelated to the code under test.
2. `graphql-result.ts` would now import, at module load, the chain `graphql-request.ts` → `next/headers`, `./auth` (`betterAuth(...)` at import), `./env`. Today `__tests__/lib/graphql-result.test.ts` imports a pure module.

**Impact:** C2-2 Step 4 fails in a confusing way, and every future action test that hits the GraphQL-errors path needs `importOriginal`.

**Fix:** Move the `ErrorClassification` enum into a dependency-free module, e.g. `src/lib/graphql-error-classification.ts`. `graphql-request.ts` imports it from there and keeps exporting it as today. That is a direct import, not a barrel. `graphql-result.ts` imports the enum from the new module and uses `import type { GraphQLError } from "./graphql-request"`. Put the file and the reason in C2-1's Files list.

### 3. C3 Task C3-4: `enterStats` gives SELF_REPORT participants edit controls for every player's row (HIGH, Confidence: 80%)

**Problem:** B6.1 computes `enterStats` from the per-sport stat resource with `targetUserId = viewer`. Under `P:basketball_stats.yaml:39-52` (the stats policies are identical) a `game_participant` in `SELF_REPORT` mode gets **true**, but only for their own stats. C3-4 maps the flag straight onto the table: `canEdit = canEnterStats && (IN_PROGRESS || COMPLETE)`. In `basketball-stats-table.tsx:106-118`, `canEdit` gates the "add stats for user" picker over `availableUsers` (every roster member) and the per-row edit. Today only owners and editors see these controls (`viewerGameRole != null`). After C3, every SELF_REPORT participant also sees them for every teammate and opponent, and the server denies every save except their own. The `game-stats.tsx` `defaultOpen` change has the same widening.

**Impact:** In every SELF_REPORT game, each participant sees edit and add buttons that fail with an error toast for all rows but one. OPEN mode is correct, since participants may edit anyone there.

**Fix:** Pass `statEntryMode` and `currentUserId` into the tables and scope by row:
```ts
const editableStatus = gameStatus === GameStatus.IN_PROGRESS || gameStatus === GameStatus.COMPLETE;
// owner/editor are the only roles that may target others in SELF_REPORT (P:*_stats.yaml:16-23)
const canEditOthers = canEnterStats && editableStatus &&
  (statEntryMode !== StatEntryMode.SELF_REPORT || viewerGameRole != null);
const canEditRow = (userId: number) => canEditOthers || (canEnterStats && editableStatus && userId === currentUserId);
// add-stats picker: canEditOthers ? usersWithoutStats : usersWithoutStats.filter(u => u.id === currentUserId)
```
Add the test `"SELF_REPORT participant sees edit only on their own row"` to `basketball-stats-table.test.tsx`. Record this in "Open issues for the design": the clean fix is a second backend flag for entering stats on other players. Until that exists, `viewerGameRole` is the only signal (it stays "Display/legacy gating" per I1).

### 4. C3 Task C3-5: Leave disappears after the owner transfers ownership (HIGH, Confidence: 85%)

**Problem:** C3-5 gates Leave on `viewerCan.leave && currentUserRole !== OWNER`. B6.5 defines `leave = LEAVE ∧ viewer role ≠ OWNER`, so the room-level flag is `false` for the owner when the room loads. The flow the UI tells owners to follow is "Transfer ownership before leaving" (`messages/en.json:936`, `member-list-panel.tsx:225-226`):
1. The owner transfers ownership.
2. `handleConfirmTransfer` (`member-list-panel.tsx:189-212`) updates `members` locally, so `currentUserRole` becomes MEMBER.
3. Nothing reloads the room, so `activeRoom.viewerCan.leave` stays `false`.

Today Leave appears right after the transfer. After C3 it stays hidden until the user switches rooms or reconnects. Open issue 6 says generally that flags go stale, but it misses that this breaks the one flow the copy prescribes.

**Impact:** A former owner cannot leave without reloading. This is a regression on the documented path.

**Fix:** After a successful role change or transfer, re-fetch the room. Add `onRoomRefresh: () => void` to `MemberListPanel`. In `chat-layout.tsx`, wire it to `loadChatRoom(selectedRoomId).then((r) => r && handleRoomLoaded(r))`, which also corrects the other stale flags. Add the test `"shows Leave after transferring ownership"` to `member-list-panel.test.tsx` (mock `updateMemberRole` success, then assert the refresh callback runs). Also add a Playwright case to C3-6.

---

## Medium Issues

### 5. C3 Task C3-1: `{ __typeName: "GameCancelledEvent" }` is dropped from the query, so the new subscription test can never pass (MEDIUM, Confidence: 95%)

**Problem:** json-to-graphql-query removes empty selection sets. `dropEmptyObjects` (`node_modules/json-to-graphql-query/lib/jsonToGraphQLQuery.js:197-247`) pops any `{ … }` context that has no contents, so a fieldless inline fragment never reaches the output. The four existing status arms (`use-game-subscription.ts:63-66`) are already silently dropped today. Events still arrive because `__typename`, `occurredAt` and `game` are selected at the interface level. C3-1's test asserts that `payload.query` contains `GameCancelledEvent`, which can never be true.

**Impact:** C3-1 Step 4 cannot go green. The design's "add to the `__on` list" has no runtime effect, which is fine, but the test as written is unsatisfiable.

**Fix:** Either drop the `contains("GameCancelledEvent")` assertion and rely on `validateDocument(payload.query) → []` plus the `isKnownGameEventType` and reducer tests, or give the arm a field so it renders and the schema check covers the type name: `{ __typeName: "GameCancelledEvent", __typename: true }`. Add a comment that fieldless arms are dropped.

### 6. C3 Task C3-3: "Add Team" gated on `join || addParticipants` keeps showing a control that non-managers cannot use (MEDIUM, Confidence: 90%)

**Problem:** Add Team opens `AddTeamForm`. That form calls `addGameParticipant(teamInstance)` (`participant-actions.ts:36-41`), and the backend checks `team-instance:create` (`GameParticipantServiceImpl.java:303-309`). `P:team_instance.yaml:16-35` grants `create` only to game_owner, game_editor and game_group_admin (plus game_league_admin after B5). B6 O10 defines `addParticipants = team-instance:create` and `join = team-instance:add_user` (self-join; any user on a PUBLIC game). With `join || addParticipants`, every signed-in stranger on a PUBLIC team game sees Add Team, fills in the form, and is denied. That reproduces today's drift (`game-participants.tsx:62-66`), which I2 says the flags exist to remove.

**Impact:** A visible control that always fails for most viewers of PUBLIC team games.

**Fix:** Add Team should be `isTeamBased && !atParticipantLimit && game.viewerCan.addParticipants`. Self-join on an existing team stays on `TeamCard` (`canJoin`). Update open issue 3 to match. Add a game-participants test or a C3-6 Playwright case: "PUBLIC non-manager with join=true sees no Add Team".

### 7. C3 Tasks C3-2/C3-3 and Review Focus 4: a cancelled or forfeited game does not "drop all actions" (MEDIUM, Confidence: 80%)

**Problem:** Review Focus 4 states "a cancelled game drops all actions and stats". The B6.1 state guards say otherwise:
- `join ⇐ not FINALIZED ∧ not already a participant`, so `join` stays true on CANCELLED and FORFEITED games. The Cerbos self-join rules (`team_instance.yaml:44-55`, `individual_participant.yaml:31-42`) only exclude FINALIZED.
- `update`, `delete` and `manageEditors` carry no state term at all.

C3-3 drops the client's own status check for Join (`canJoin` comes straight from the flag). So the Join button renders on a cancelled PUBLIC game, and Edit, Delete and Manage Editors stay in the overflow menu. The C3 tests only cover Invite on a cancelled game.

**Impact:** Users can join cancelled or forfeited games, and the stated review focus would pass review without being true.

**Fix:** Either raise it as a B6 open issue (AND `gameStatus ∉ {CANCELLED, FORFEITED}` into `join`, as B6.1 already does for `addParticipants`), or keep a client guard until the backend does: `canJoin && gameStatus !== GameStatus.CANCELLED && gameStatus !== GameStatus.FORFEITED`. Add the tests `"hides Join on a CANCELLED game even when join is true"` (individual list and team card). Reword Review Focus 4 to state which controls actually remain for managers on a cancelled game, or list that as an open product question.

### 8. C0 Task C0-1: the contract helper validates against the uncommitted working-tree schema, not the committed one (MEDIUM, Confidence: 80%)

**Problem:** The helper reads `path.resolve(process.cwd(), "schema.graphqls")`, which is the working-tree file. Global Constraints keep the uncommitted regeneration in the working tree throughout C0 ("never stage it"). That file holds the unmerged-branch SDL (it already has `CANCELLED`/`FORFEITED` at line 1271 and `GameViewerRole` at line 1237). The plan meanwhile reasons as if tests ran against the committed file. C0-3 says "the committed client `schema.graphqls` still lacks the two values until C1, so no contract test sends them". Local runs therefore validate against a different SDL than CI checks out, and green locally does not imply green in CI, or vice versa.

**Impact:** Results differ between local and CI for every C0 contract test. The mismatch grows as more contract tests are added.

**Fix:** At the start of C0, park the regeneration outside the tree so local matches CI: `cp schema.graphqls <scratchpad>/schema.regen.graphqls && git checkout -- schema.graphqls`. It has no lasting value, since C1 regenerates from the deployed B1 commit. Change C0-5's last check from "still shows ` M`" to "`git status --short schema.graphqls` is empty". Alternatively, let the helper honour a `SCHEMA_PATH` override, but parking the file is simpler.

### 9. C2 Tasks C2-1/C2-2: the expected rendered strings do not match json-to-graphql-query's output (MEDIUM, Confidence: 85%)

**Problem:** Non-pretty output joins lines with a single space (`jsonToGraphQLQuery.js:187-191`), so `{ x: { __on: [authorizationErrorFragment] } }` renders as `x { ... on AuthorizationError { authorizationErrorType: __typename } }`. C2-1 expects to find `... on AuthorizationError {authorizationErrorType: __typename}`, and C2-2 expects `... on InvalidInputError {field code}`, both without the inner spaces. `toContain` fails even when the code is correct. The design's own text (I6 Client) shows the spaced form.

**Fix:** Use `... on AuthorizationError { authorizationErrorType: __typename }` and `... on InvalidInputError { field code }`.

---

## Low Issues

### 10. C2 Task C2-2: `AnyFormApi` imported from a transitive dependency (LOW, Confidence: 80%)
`@tanstack/form-core` is not in `package.json`. `@tanstack/react-form` re-exports it (`dist/esm/index.d.ts:1`: `export * from '@tanstack/form-core'`). **Fix:** `import type { AnyFormApi } from "@tanstack/react-form"`.

### 11. C2 Task C2-2: the "clears the server error when the field changes" test has no working pattern for a BaseUI Select in jsdom (LOW, Confidence: 70%)
`measurementUnit` is a `FormSelectField` (BaseUI Select, rendered in a portal). No `__tests__` file drives a Select (`getByRole("combobox"/"option")` finds nothing), and `fireEvent.change` does not apply. **Fix:** Trigger the submit by toggling a sport (`fireEvent.click` on a `Toggle`), which works today, and assert the measurement-unit inline error. For the clear-on-change case, call `form.setFieldValue("measurementUnit", …)` through the field listener path, or move that assertion to a `setServerFieldError` unit test.

### 12. C2 Task C2-2: the inline-field path cannot be reached from this client (LOW, Confidence: 85%; informational, not reopening the design)
`InvalidInputError` on preferences is raised only for explicit `null` (`NULL_NOT_ALLOWED`, B3.2/B3.3). The client's Zod schema is `.optional()` and rejects null (`actions.ts:12-23`), and every form field always has a value. The `measurementUnit` + `NULL_NOT_ALLOWED` fixture is synthetic. Keep the helper small and do not add more call sites until a mutation can return a reachable `field`.

### 13. C0 Task C0-4; C1 Task C1-1; C3 Task C3-7: TDD and shell nits (LOW, Confidence: 90%)
- **C0-4:** the new Playwright test never fails first, because C0-3 already landed. Step 3 acknowledges this, but Step 1 is still titled "Write the failing test". Either move it before C0-3's implementation or relabel it as a regression test.
- **C1-1 Step 4 and C3-7:** unquoted `__tests__/[locale]/…` and `src/app/[locale]/games` are bracket globs. They pass through literally in bash and error in zsh ("no matches found"). Quote them, as the other commands in the plan already do.

---

## Summary

| # | PR / Task | Issue | Severity | Confidence | Impact |
|---|-----------|-------|----------|------------|--------|
| 1 | C2 / C2-1 | Richer `MutationError` breaks 41 existing `toEqual` assertions in 6 suites; plan says none break | High | 95% | C2-1/C2-3 gates fail |
| 2 | C2 / C2-1, C2-2 | Runtime `ErrorClassification` import from `graphql-request` breaks existing `vi.mock` factories (settings test :233-239) and pulls in auth/env | High | 85% | C2-2 tests fail as `UNEXPECTED_ERROR` |
| 3 | C3 / C3-4 | `enterStats` shows SELF_REPORT participants edit/add controls for every player | High | 80% | Broken controls in every SELF_REPORT game |
| 4 | C3 / C3-5 | Stale `viewerCan.leave` hides Leave after ownership transfer | High | 85% | Regression on the documented "transfer then leave" flow |
| 5 | C3 / C3-1 | Empty `GameCancelledEvent` arm is dropped by json-to-graphql-query; "contains" test can't pass | Medium | 95% | C3-1 cannot go green |
| 6 | C3 / C3-3 | Add Team on `join \|\| addParticipants` shows a manager-only control to non-managers | Medium | 90% | Failing control on PUBLIC team games |
| 7 | C3 / C3-2, C3-3, Review Focus 4 | `join`/`update`/`delete` are not status-guarded; Join renders on CANCELLED/FORFEITED games | Medium | 80% | Joining cancelled games; review focus untrue |
| 8 | C0 / C0-1 | Contract helper reads the uncommitted working-tree schema in C0 | Medium | 80% | Local and CI results differ |
| 9 | C2 / C2-1, C2-2 | Expected rendered strings lack the spaces the library emits | Medium | 85% | Correct code fails `toContain` |
| 10 | C2 / C2-2 | `AnyFormApi` imported from transitive `@tanstack/form-core` | Low | 80% | Phantom dependency |
| 11 | C2 / C2-2 | No working jsdom pattern for a BaseUI Select change | Low | 70% | Test may not be writable as specified |
| 12 | C2 / C2-2 | Inline field path cannot be reached from this client (informational) | Low | 85% | Synthetic test only |
| 13 | C0-4, C1-1, C3-7 | Not red-first; unquoted `[locale]` globs | Low | 90% | Process nits |

**Verdict per PR**
- **C0:** ready with fixes (#8; #13 optional).
- **C1:** ready.
- **C2:** ready with fixes (#1, #2, #9).
- **C3:** ready with fixes (#3, #4, #5, #6, #7).

## Recommended Fixes (Critical/High)

**#1 (C2-1):** add to Files: `__tests__/[locale]/{chat,game,upload,user/[username]}/actions.test.ts`, `__tests__/[locale]/game/participant-actions.test.ts`, `__tests__/[locale]/game/basketball-stats-actions.test.ts`. Add a helper:
```ts
// __tests__/helpers/mutation-error.ts
export const mutationErrorShape = (errorType: string, message: string) => ({
  success: false, errorType, message, isAuthorizationError: false, field: null, code: null,
});
```
and replace each `toEqual({ success: false, errorType: "…Error", message })` with `toEqual(mutationErrorShape("…Error", message))`.

**#2 (C2-1):**
```ts
// src/lib/graphql-error-classification.ts  (new, dependency-free)
export enum ErrorClassification { BAD_REQUEST = "BAD_REQUEST", FORBIDDEN = "FORBIDDEN",
  INTERNAL_ERROR = "INTERNAL_ERROR", NOT_FOUND = "NOT_FOUND", UNAUTHORIZED = "UNAUTHORIZED" }

// src/lib/graphql-request.ts: replace the local enum with
import { ErrorClassification } from "./graphql-error-classification";   // keep exporting it

// src/lib/graphql-result.ts
import { ErrorClassification } from "./graphql-error-classification";
import type { GraphQLError } from "./graphql-request";
```

**#3 (C3-4):** the row-scoped `canEditOthers` / `canEditRow` in issue 3. The tables gain `statEntryMode`, `currentUserId` and `viewerGameRole` (the last for SELF_REPORT scoping only), plus a new open issue asking the backend for a flag that covers entering stats on other players.

**#4 (C3-5):**
```tsx
// chat-layout.tsx
const refreshActiveRoom = useCallback(async () => {
  const id = selectedRoomIdRef.current; if (!id) return;
  const room = await loadChatRoom(id);
  if (room && id === selectedRoomIdRef.current) handleRoomLoaded(room);
}, [handleRoomLoaded]);
// <MemberListPanel … onRoomRefresh={refreshActiveRoom} />
// member-list-panel.tsx: call onRoomRefresh() after successful handleRoleChange / handleConfirmTransfer
```

---

## Re-review (round 2)

Re-checked the revised `implementation.md` against the client code, `plan-backend-B1-B3.md` and `plan-backend-B4-B6.md` (B4.8a, B6.1, B6.2, B6.5). This round looks only at changed tasks and at new problems the fixes introduced.

### Round-1 findings: all 13 resolved

| # | Status | Verified against |
| --- | --- | --- |
| 1 | Fixed. Each pass-through assertion becomes `mutationErrorShape(...)`; hand-built errors keep their shape. See R2-1 for a count correction. | `if (!result.success) return result` in the chat, game, participant, user and upload actions |
| 2 | Fixed. The enum moves to `graphql-error-classification.ts`, and `graphql-result.ts` imports only the type from `graphql-request`. | `ErrorClassification` is referenced only inside `graphql-request.ts` (:124-145), so nothing else needs updating, and existing `vi.mock` factories stay valid. |
| 3 | Fixed, per the coordinator's override. Rows are editable iff `editableStatus && (canEnterStats \|\| (canEnterOwnStats && userId === currentUserId))`; `defaultOpen` uses `enterStats` only. | B6.1 lines 913-926 and B6.2 SDL lines 979-982 |
| 4 | Fixed. `onRoomRefresh` runs after every successful role change or transfer. `refreshActiveRoom` checks that the response still belongs to the selected room before `handleRoomLoaded`. Leave is gated on `viewerCan.leave` alone. | B6.5 `leave = LEAVE ∧ role ≠ OWNER`, recomputed per request; `selectedRoomIdRef` exists at `chat-layout.tsx:88` |
| 5 | Fixed. Each new arm now selects `occurredAt: true`, and the assertions use the spaced form. | `jsonToGraphQLQuery.js:197-247` |
| 6 | Fixed. Add Team is gated on `addParticipants` alone, with a unit test and a Playwright case. | — |
| 7 | Fixed, per the coordinator's override. Client duplication is removed. Review Focus 4 and the C3-2 cancelled-game test match the B6.1 guard list: `manageEditors` and `moderateMedia` carry no state term. | B6.1 lines 919-925 |
| 8 | Fixed. The helper reads the committed schema with `git show HEAD:schema.graphqls`. | `test.yaml` uses `actions/checkout@v4` (the merge commit at HEAD), so CI sees the same file. The Docker build excludes `.git` but only runs `next build`, which type-checks the helper without executing it. Schema commits come first in C1–C3. |
| 9 | Fixed. | — |
| 10 | Fixed. | — |
| 11 | Fixed. The test toggles a sport, and the clear-on-change case moved to a unit test of `setServerFieldError`. | Default form-core validation logic does run the server validator on `change`, which clears `errorMap.onServer`. Its function returns `undefined` (`ValidationLogic.js:60,91-95`; `FieldApi.js:201-231`), so the plan's claim holds. |
| 12 | Fixed, now recorded as open issue 13. | — |
| 13 | Fixed. | — |

New scope also checks out:
- **GameViewerCan has 21 fields:** 15 core, including `enterOwnStats`, plus 6 league, matching the B6.2 SDL.
- **`manageEditors`** is `game:add_editor`.
- **`GameResultChangedEvent { game occurredAt }`** (B4.8a) ships before C3's gate, through B6 ← B4.
- **The reducer needs no per-type branch** for the new events. The shared `game` merge carries `viewerCan` and `gameStatus`, and the throttle keeps the latest event, which is safe because `viewerCan` is replaced wholesale.
- **The C3-6 default fixture** equals B6.2's `owner_scheduledCasualGame` case.

### New issues

#### R2-1. C2 Task C2-1: the per-file assertion counts are wrong for the upload suite, and my round-1 total of 41 was too high (LOW, Confidence: 90%)
`requestUpload` (`upload/actions.ts:64-66`) and `deleteResource` (`:199-201`) rebuild `{ success, errorType, message }` by hand, so they never return the new keys. That means 4 of the 7 upload assertions keep their current shape: `upload/actions.test.ts:104` (FileTooLarge), `:186` (UnsupportedFileType), `:268` (ChatRoomNotFound) and `:491` (ResourceNotFound). Only `:342`, `:422` and `:435` change. The plan's rule ("only assertions that receive an `extractMutationResult` error") is correct, but "upload (7)" and "39" will mislead anyone who follows the counts. **Fix:** change the upload count to 3 and the total to 35, or drop the counts and keep the rule.

#### R2-2. C3 Task C3-4: `GameStats` has no `currentUserId` to pass to the tables (LOW, Confidence: 90%)
`GameStats` should pass `currentUserId` to every table, but its props (`game-stats.tsx:40-52`) do not include it. The Files list also changes only `game-detail-client.tsx:180-183,227` (media), not the `<GameStats …>` call at `:233-245`. **Fix:** add a `currentUserId: number | null` prop to `GameStats` and pass `currentUserId` at `game-detail-client.tsx:233`. List both in C3-4 Files and update the `game-stats.test.tsx` renders. `tsc` would catch the gap, but the plan should name it.

#### R2-3. C3 Task C3-6: the "transfer then Leave" Playwright spec cannot be built with `withMeGuardMap` (LOW, Confidence: 85%)
`withMeGuardMap` returns a fixed map (`tests/fixtures/test-fixtures.ts:61-76`), so it cannot be "stateful". Also, the `chatRoom` top-level field serves both `loadChatRoom` and `loadMessages` (`tests/fixtures/mock-data/chat.ts:127-130`). **Fix:** write a custom `http.post("*/graphql")` handler. It sets a flag once it sees an `updateChatRoomMemberRole` request, returns `mockChatRoomDetail` with `viewerCan.leave: true` and the viewer's role set to MEMBER for every later `chatRoom` request, and keeps the `me` guard. Assert that the Leave button is visible after the toast.

#### R2-4. C0 Task C0-1: check the committed schema before relying on the red/green expectations (LOW, Confidence: 70%)
The helper now uses `HEAD:schema.graphqls`, and I could not read that file from git objects in this review. C0-1 assumes it contains `UpdateUserPreferencesResult` without an Error member. C0-2 assumes `GameSortField` has no `END_DATE` and that it contains every field `loadMoreGames` selects (`viewerFollowingUsers`, `distance`, `myGames`, `nearLocation`). If the committed file lags behind in another way, these tests fail for reasons C0 cannot fix, because C0 may not commit the schema. **Fix:** as C0-1 Step 0, run `git show HEAD:schema.graphqls | grep -n "union UpdateUserPreferencesResult\|enum GameSortField\|viewerFollowingUsers\|myGames"` and record the result. If anything is missing, limit that contract test to C1.

### Round-2 verdicts
- **C0:** ready. R2-4 is a one-line precondition check.
- **C1:** ready.
- **C2:** ready. Fix R2-1's counts.
- **C3:** ready with minor fixes (R2-2, R2-3).
