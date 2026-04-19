# Leagues — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Leagues / Groups / Seasons / Teams / GameSeries / Score-Reporting / Invitations / Calendar-Sync feature surfaces as specified in `requirements.md` and `design.md`.

**Architecture:** Next.js 16 App Router, Server Components by default, nested-segment tab routing, tag-based revalidation, TanStack Form + Zod v4, json-to-graphql-query queries, one atomic `reportGameResultWithScore` mutation wrapping a two-phase wizard.

**Tech Stack:** Next.js 16, TypeScript strict, Better Auth + Keycloak, GraphQL (json-to-graphql-query), TanStack Form, Zod v4, Tailwind v4, shadcn/ui + BaseUI, next-intl, Vitest + Playwright.

**Source of truth:**
- Requirements: `.claudedoc/0097-leagues/requirements.md`
- Design: `.claudedoc/0097-leagues/design.md`
- Backend contract: `playground-backend/.claudedoc/0102-leagues/design.md` + `requirements.md`
- Conventions: `CLAUDE.md`

---

## How to read this document

This plan is organized as **PRs in dependency order**. Each PR is one shippable unit that is reviewable and revertible on its own.

Within a PR, tasks follow a TDD loop (write failing test → run to see it fail → implement minimal code → run to see pass → commit). Where a PR is large, tasks are grouped into sub-steps.

Every PR has:
- **Scope** — one sentence.
- **Depends on** — prior PRs that must land first.
- **Files** — exact paths to create / modify.
- **Steps** — TDD loop with commit boundaries.
- **Done when** — acceptance criteria (must be objectively verifiable).
- **Skills** — `/vercel-react-best-practices` and `/web-design-guidelines` are mandatory for every UI PR (load before writing code, apply as review criteria).

### PR sizing discipline

A PR that touches more than ~15 files or adds more than ~600 LOC is too big. Split it. The wave layout below respects this by dividing each wave into numbered sub-PRs (W1.1, W1.2, …).

### Commit cadence inside a PR

Commit after every green test-run. One failing-test-then-implementation cycle = one commit. Don't batch unrelated changes across commits.

---

## PR dependency map

```
P0  backend-contract audit
P1  chat refactor (Path A only)   P2  i18n scaffolding
 │        │                               │
 └────────┴───────────────────────────────┘
                │
        ┌───────┴──────────────┐
        ▼                       ▼
  W1.1 Org page read      W1.2 League page read
        │                       │
        │                  W1.3 Season page read
        │                       │
        └──────► W1.4 Game page breadcrumbs + outcome badge (read)
                         │
             ┌───────────┼─────────────────────────────┐
             ▼           ▼                             ▼
        W2.1-W2.2    W2.3 member mgmt              W4.1-W4.2 schedule
          │                │                              │
          │         W2.4 invite accept/decline            │
          │                │                              │
          │         W2.5 seasons CRUD                     │
          │                │                              │
          │         W2.6 teams CRUD                       │
          │                │                              │
          │         W2.7 copy teams                       │
          │                │                              │
          │         W2.8 admin promote/demote/remove      │
          │                                               │
          ▼                                               │
         W3.1 groups CRUD                                 │
          │                                              │
         W3.2-W3.3 members/invites                       │
          │                                              │
         W3.4 game series CRUD ──► W3.5 RSVP ──► W3.6 standing-RSVP ──► W3.7 materialize game
                                                                              │
                                                                              │
                   ┌──────────────────────────────────────────────────────────┘
                   ▼
              W4.3 forfeit
                 │
              W4.4 report wizard Phase A
                 │
              W4.5 report wizard Phase B + submit
                 │
              W4.6 confirm/dispute
                 │
              W4.7 live-refresh hook
                 │
              W5.1-W5.6 chat + calendar + polish
                 │
              W6.1-W6.5 notifications + final audit
```

**Critical path** (shortest MVP): P0 → P2 → W1.1 → W1.2 → W1.3 → W1.4 → W2.1 → W2.2 → W2.5 → W2.6 → W4.1 → W4.3 → W4.4 → **W4.7** → W4.5 → W4.6. Note: W4.7 (live-refresh + NotificationProvider) moved ahead of W4.5 so the wizard can suspend live-refresh from its first ship; shipping W4.5 first would produce a captain-loses-typed-scores regression during the interim. Everything else widens the feature surface.

---

## Shared patterns (reference library)

These appear across many PRs. Define them once, reuse throughout. Each pattern lives in a specific file; later PRs just point to it.

### SP-1: Server action skeleton

Every server action in `src/app/[locale]/<aggregate>/actions.ts` follows this shape (matches existing `src/app/[locale]/game/actions.ts`):

```ts
"use server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { authMutate } from "@/lib/graphql-request";
import { extractMutationResult } from "@/lib/graphql-result";
import { revalidateTag } from "next/cache";

export async function exampleAction(input: ExampleInput): Promise<ActionResult<Example>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { success: false, errorType: "Unauthenticated", message: "Please sign in." };
  }
  const parsed = exampleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errorType: "ValidationError", message: parsed.error.issues[0].message };
  }
  try {
    const result = await authMutate({ /* graphql object */ });
    const extracted = extractMutationResult(result.exampleMutation);
    if (!extracted.success) return extracted;
    revalidateTag(`league:${extracted.data.id}`);
    return { success: true, data: extracted.data };
  } catch (err) {
    return { success: false, errorType: "UnknownError", message: "Something went wrong." };
  }
}
```

### SP-2: ActionResult type

Defined once in `src/lib/action-result.ts` (create if it does not exist; mirrors the pattern in `GameActionResult`):

```ts
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; errorType: string; message: string; fieldPath?: string };
```

### SP-3: Fragment composition

Every fragment lives in `src/lib/graphql-fragments.ts`. Naming: `<entity>Fragment` (full) or `<entity>CardFragment` (lightweight for lists). See existing `gameMediaFragment`, `playerRefFragment` for the established shape.

### SP-4: Revalidation call site

After every mutation, call `revalidateTag(...)` with the tags listed in `design.md §4.5a`. Helper is just a switch — no abstraction layer.

**Object-ref tag derivation:** design.md §4.5a tag strings like `season:{seasonId}:standings` and `league:{leagueId}` were written when we thought Game had scalar ID fields. It doesn't — `Game.league`, `.season`, `.group`, `.sourceSeries` are object refs. Every mutation action that needs these IDs selects them from the mutation response:

```ts
const result = await authMutate({
  forfeitGame: {
    __args: { ... },
    __on: [{ __typeName: "ForfeitGameResponse", game: { id: true, season: { id: true }, league: { id: true } } }],
  },
});
revalidateTag(`game:${result.game.id}`);
revalidateTag(`season:${result.game.season.id}:standings`);
revalidateTag(`league:${result.game.league.id}`);
```

Every mutation's response selection in this plan must include the aggregate-ref IDs required for its §4.5a tag list. When a reviewer sees `game.leagueId` in a tag string, treat it as shorthand for `game.league.id`.

### SP-5: Tagged fetch

Every SC fetch tags its result so mutations can invalidate it.

**Caveat (read before anything else):** Next.js `fetch(..., { next: { tags } })` is only honored for **cached** fetches. By default, non-GET fetches (all of our GraphQL POSTs) and fetches inside dynamic routes are **not** cached, so `revalidateTag(...)` is a no-op against them.

To make tags actually work, `authQuery` must either:

1. Wrap the fetch in `unstable_cache(fn, keyParts, { tags })` from `next/cache` (works for POSTs; cache key is user+query-derived), OR
2. Use a GET-ified GraphQL endpoint for read queries (not supported by our backend today), OR
3. Pair every read with an explicit `next: { revalidate: false, tags }` AND ensure the parent route is statically rendered (not our case — every League page is dynamic).

**Option 1 is the only viable path.** `unstable_cache` wraps the existing `authQuery` / `query` body; keyParts derive from `{ viewerKey, queryHash }` so cache is per-viewer. Anonymous viewers (public Org / public League reads via the unauthenticated `query`) use a literal `"anon"` sentinel so they share a single cache pool.

```ts
import { unstable_cache } from "next/cache";
import { jsonToGraphQLQuery } from "json-to-graphql-query";

// Deterministic query hash. Uses the exact wire-string we'd send — same query
// shape → same hash → cache hit. Collision-prone if two different inputs
// serialize the same, but json-to-graphql-query is deterministic for the same
// object so this is safe.
function hashQuery(q: unknown): string {
  return jsonToGraphQLQuery({ query: q });  // raw string, no crypto needed — acts as cache key
}

export async function authQuery<T>(q, opts?: { tags?: string[] }): Promise<T> {
  if (!opts?.tags) return rawAuthQuery(q);  // no caching when untagged
  const session = await auth.api.getSession({ headers: await headers() });
  const viewerKey = session?.user?.id ?? "anon";
  return unstable_cache(
    async () => rawAuthQuery(q),
    [viewerKey, hashQuery(q)],
    { tags: opts.tags },
  )();
}

export async function query<T>(q, opts?: { tags?: string[] }): Promise<T> {
  if (!opts?.tags) return rawQuery(q);
  return unstable_cache(
    async () => rawQuery(q),
    ["anon", hashQuery(q)],
    { tags: opts.tags },
  )();
}
```

**Tag fan-out note.** `revalidateTag("league:123")` invalidates the tag across **all** per-viewer cache entries — that's correct, and it's intentional. Two signed-in users both looking at League 123 both see their caches invalidated on a mutation. The per-viewer key is for preventing viewer A's view-scoped `viewerIsAdmin=true` from leaking into viewer B's cache, not for isolating invalidation.

**Prove it works before Wave 1:** P0 adds a concrete integration test that (a) tagged `authQuery` is cached on repeat, (b) `revalidateTag` causes the next call to re-fetch. Without that proof, §4.5a is aspirational and every "Done when" that claims tag-based freshness is unverifiable.

**Action item (W1.1 prereq):** extend `src/lib/graphql-request.ts` with the `unstable_cache` wrapper above, and add the integration test described in P0 Step 6.

### SP-6: Form pattern

All forms: TanStack Form + Zod v4. Schemas live in `src/lib/validation/<domain>.ts`. The same schema is imported by the form and the server action. Field errors from the server are wired back via `form.setFieldMeta(fieldPath, meta => ({ ...meta, errors: [translate(message)] }))`.

### SP-7: Test structure

- **Unit tests (Vitest):** `__tests__/` siblings of source files. Naming: `<file>.test.ts(x)`. Use `@testing-library/react` + `fireEvent` (not `user-event`).
- **Integration tests (Playwright):** `tests/<surface>/<spec>.spec.ts`. MSW GraphQL handlers in `tests/fixtures/graphql-handlers.ts`. Auth cookie forging already exists.

### SP-8: Typography + i18n discipline

Every user-facing string goes through `useTranslations` or `getTranslations`. Every text node is wrapped in a `Typography` component. Never mix League and Group copy — they each have their own i18n namespace (`leagues.league.*` vs `leagues.group.*`).

### SP-9a: Typed-confirm values (destructive dialogs)

Every destructive dialog in this plan uses typed-confirm. Values are fixed per-dialog for consistency — do not invent new values in individual PRs:

| Dialog | Typed value | Where |
|---|---|---|
| Archive League | **League name** (case-sensitive) | W2.2 |
| Archive Group | **Group name** (case-sensitive) | W3.1 |
| Archive Organization | N/A — not archivable in v1 | — |
| Rotate iCal token | `rotate` | W5.4 |
| Delete confirmed game result | `delete` | W4.6 |
| Forfeit game | **no typed-confirm; single click confirm dialog** | W4.3 |
| Delete Season (with games) | blocked server-side; no dialog | W2.5 |
| Remove another member | **no typed-confirm; click confirm dialog** | W2.8 |
| Leave aggregate (self) | **no typed-confirm; click confirm** | W2.8 |
| End GameSeries | `end` | W3.4 |
| Revoke invite link | **no typed-confirm; click confirm** | W2.3 |

Rationale: typed-confirm is reserved for actions that are either (a) impossible to undo, or (b) have surprising blast radius (token rotation breaks all 5 calendars; archive is terminal). One-click confirm is enough for actions with localized effect.

### SP-9: Accessibility checklist per UI PR

Before opening PR:
- Heading hierarchy check (no skipped levels).
- Keyboard path: tab into every interactive surface.
- `prefers-reduced-motion` respected on any transition.
- Touch target ≥ 44×44.
- Status/role not color-only.
- `aria-current="page"` on active nav.
- All forms: `aria-invalid`, `aria-describedby` via TanStack Form.

---

# Pre-work

Three prep PRs that unblock Wave 1.

## P0: Backend contract audit

**Scope:** Verify every backend field, mutation, and enum we depend on is actually shipped. Produce a contract-verified checklist.

**Depends on:** nothing.

**Deliverables:**

- [ ] **Step 1: Inventory the fields used by design.md.**

  Grep `design.md` for every identifier of shape `Xxx.yyyField` or `XxxMutation`. Produce a table:

  | Field or mutation | Used in | Verified on backend? | Fallback if missing |
  |---|---|---|---|

  Write the table to `.claudedoc/0097-leagues/contract-audit.md`.

- [ ] **Step 2: Cross-check each entry against** `playground-backend/.claudedoc/0102-leagues/design.md` **and the backend GraphQL schema** (SDL file if committed; otherwise introspect).

  For each entry not found, flag as a blocker or fallback-acceptable.

- [ ] **Step 3: Confirm the two outstanding gaps from design.md §17:**
  - Reverse-cursor pagination on `ScrollSubrange`. Run a scratch query against backend dev against a List sorted ASC with `last`/`before` args and verify response shape.
  - `lastEditedBy` / `lastEditedAt` — deferred; confirm not needed for v1.

- [ ] **Step 4: Confirm chat typename choice** (§7.6): `LeagueChatRoom` and `CasualGroupChatRoom` as separate types. Grep backend repo for their declarations.

- [ ] **Step 5: Confirm the Game aggregate-ref shape.**

  Verify in the backend schema that `Game` exposes **object refs** (`Game.league: League`, `Game.season: Season`, `Game.group: Group`, `Game.sourceSeries: GameSeries`), not scalar IDs. Every downstream query that reads the league/season/group/series from a Game must select `{ id }` on the object ref and branch on `game.league != null` (not `game.leagueId != null`). Document the confirmed schema in the audit.

- [ ] **Step 6: Prove Next.js tag-based revalidation actually works.**

  **This must be a Playwright spec**, not a Vitest. `unstable_cache` depends on Next's request context and the production build pipeline; it does not behave faithfully under Vitest. Write `tests/infrastructure/tag-revalidation.spec.ts`:

  1. Stand up a throwaway Next route (e.g., `/api/__test/tag-probe`) that calls `authQuery` with a fixed tag and counts endpoint hits (via MSW).
  2. Navigate to the route — assert counter = 1.
  3. Navigate again — assert counter still = 1 (cached).
  4. Hit another throwaway route that calls `revalidateTag("test:1")`.
  5. Navigate to the first route — assert counter = 2 (invalidated).

  If this test is red after implementing the SP-5 `unstable_cache` wrapper, the entire §4.5a tag matrix is unusable. Escalation path: fall back to `router.refresh()` everywhere (coarse but correct) or switch to a different caching primitive. Either way, Wave 1 is blocked until P0 Step 6 is green.

- [ ] **Step 7: Confirm P0-level blockers for specific backend features.**

  Explicit checklist:
  - `Game.outcome: GameOutcome!` enum + 6 values.
  - `reportGameResultWithScore` with `@oneOf` sport input + union return type.
  - `Game.viewerCanReportResult`, `Game.viewerCanConfirmResult`, `Game.viewerGameRole`.
  - `Game.winner: TeamInstance` — if **not** shipped, flag as either (a) promote to blocker and ask backend to add, or (b) scope "per-sport winner derivation" as an explicit task in W1.4.
  - `Game.viewerIsTeamCaptain: Boolean!` OR `CAPTAIN` in `GameRole` enum — required for UX9 captain-swap copy.
  - `copyTeamsFromPreviousSeason(dryRun: Boolean)` — verify the dryRun argument shape.
  - `createScheduledGames` batch mutation with per-row error array + partial-success handling.
  - `User.icalToken: String!` with lazy-create semantics.
  - Invite resolve query: confirm the operation is named `resolveInvite` (not `invitePreview`), returns non-null `InvitePreview!`, and `InvitePreview.status: InviteStatus!` enum values (expected: `PENDING | EXPIRED | REVOKED | FULL | ACCEPTED`).
  - `InvitePreview.redeemedByViewer: Boolean` scalar (optional, affects ACCEPTED-state redirect) — if absent, frontend treats ACCEPTED as "someone redeemed" for all viewers.
  - **iCal URL shape conflict:** backend requirements.md:716 says `/ical/league/{slug}.ics` (single slug); backend design.md:1605 says `/ical/league/{orgSlug}/{leagueSlug}.ics` (two slugs). These disagree. Pick the winner in P0 and update `IcalFeedController` + W5.3 accordingly.
  - `NotificationGame` payload shape: does it carry aggregate refs (`league.id`, `season.id`, `group.id`) for `useSeasonLiveRefresh` predicate filtering? Current type at `src/lib/types/notification.ts` only has `{id, sportType}`. If refs aren't on the payload, W4.7 + W6.2 must either (a) request backend extend `NotificationGame` with aggregate refs, or (b) change strategy — fan events through a best-effort "refresh any game page with this id" pattern only.
  - `@oneOf` input validation behavior — backend must return a mapped union-member error, not a 500.
  - Reverse-cursor pagination on `ScrollSubrange`.

- [ ] **Step 8: Commit the audit.**

  ```bash
  git add .claudedoc/0097-leagues/contract-audit.md
  git commit -m "docs(leagues): backend contract audit for leagues feature"
  ```

**Done when:** the audit table is committed, the tag-revalidation integration test is committed and green, and every W1-W4 planned query/mutation is either green (verified) or has a documented fallback.

---

## P1: Chat module refactor — `<EmbeddedConversation>` extraction

**Scope:** Extract an embeddable `EmbeddedConversation` component from the existing `ChatLayout`, so League and Group chat tabs can mount chat without re-implementing the subscription wiring. (Design §7.2, Path A.)

**Depends on:** nothing.

**Skip this PR** if product chooses Path B (link-out to `/chat`). In that case W5.1 wires an `OpenChatButton` instead of embedding.

**Files:**
- Create: `src/components/chat/embedded-conversation.tsx`
- Modify: `src/components/chat/chat-layout.tsx` — replace inline subscription wiring with `<EmbeddedConversation>` usage.
- Modify: `src/components/chat/conversation-view.tsx` — only simplify props once ownership moves; see Step 1.
- Create: `src/components/chat/__tests__/embedded-conversation.test.tsx`

**Steps:**

- [ ] **Step 1: Caller audit — do NOT delete props until this is complete.**

  Before touching anything, build a table of every prop currently passed to `ConversationView` with its call sites and the state each callback feeds:

  | Prop | Call site | What it feeds |
  |---|---|---|
  | `onLastMessageUpdate` | `ChatLayout.tsx:...` | Room-list preview / unread badge |
  | `onRoomLoaded` | ... | ... |
  | `incomingEventVersion` | ... | ... |
  | `getIncomingEvent` | ... | ... |
  | `reconnectCounter` | ... | ... |
  | `onBack` | ... | Mobile-view back button |
  | `onToggleMembers` | ... | Members-sidebar toggle |

  Commit this table to `.claudedoc/0097-leagues/chat-refactor-audit.md`. **Do not drop any callback** without a replacement plan. For example, `onLastMessageUpdate` almost certainly drives the room-list preview — if `EmbeddedConversation` stops emitting it, the full `/chat` page's room list will freeze on the last-known preview.

  Rule: **every prop that currently crosses from `ConversationView` → `ChatLayout` must either (a) be preserved on `EmbeddedConversation` as a pass-through, or (b) have an explicit replacement documented in this audit.** "Simplify" is not a plan.

- [ ] **Step 2: Write failing test for `<EmbeddedConversation>`.**

  Render `<EmbeddedConversation roomId="room-1" currentUser={...} />` with MSW mocking the subscription + `getChatRoom` query. Assert the conversation renders without `ChatLayout` in the tree.

  ```bash
  npm test -- src/components/chat/__tests__/embedded-conversation.test.tsx
  ```
  Expected: fail with "file does not exist" or "render empty".

- [ ] **Step 3: Write `EmbeddedConversation`.**

  The component owns:
  - A `useChatSubscription` call scoped to the `roomId` prop.
  - Local `incomingEventVersion` + `getIncomingEvent` state.
  - Local `reconnectCounter` state.
  - Renders `<ConversationView>` with the right props.
  - Exposes `disabled` + `disabledReason` props that pass through to the compose bar.
  - **Preserves every prop flagged in Step 1's audit as "has a real consumer"** — e.g., `onLastMessageUpdate`, `onRoomLoaded`, `onBack`, `onToggleMembers` — so `ChatLayout` can keep its room-list and sidebar behavior unchanged.

- [ ] **Step 4: Run the test. PASS.**

- [ ] **Step 5: Rewrite `ChatLayout` to use `EmbeddedConversation`.**

  Now `ChatLayout` only handles room-list navigation + URL routing. The conversation area is one `<EmbeddedConversation roomId={activeRoomId} currentUser={...} />`.

- [ ] **Step 6: Run existing chat tests + lint + typecheck.**

  ```bash
  npm test
  npm run lint
  npm run build
  ```
  Expected: all pass.

- [ ] **Step 7: Integration test — full chat page still works.**

  ```bash
  npx playwright test --project=chromium tests/chat/ 2>&1 | tee /tmp/pw-chat.txt
  ```
  Expected: no regression.

- [ ] **Step 8: Commit.**

  ```bash
  git add src/components/chat/
  git commit -m "refactor(chat): extract EmbeddedConversation for tab embedding"
  ```

**Done when:** `ChatLayout` uses `EmbeddedConversation` internally, tests pass, no regression on `/chat`.

---

## P2: i18n scaffolding

**Scope:** Seed `messages/en.json` with every key defined in `design.md §10`, even if values are empty strings. Wave PRs can then fill values incrementally without the i18n loader barking.

**Depends on:** nothing.

**Files:**
- Modify: `messages/en.json`

**Steps:**

- [ ] **Step 1: Create a new top-level `leagues` object.**

  Add the root namespace to `messages/en.json`. Structure:

  ```json
  {
    "leagues": {
      "organization": {},
      "league": { "archive": {}, "schedule": {}, "errors": {} },
      "season": {},
      "team": {},
      "group": { "archive": {}, "schedule": {} },
      "series": { "recurrence": {} },
      "rsvp": {},
      "invitation": {},
      "invitePreview": {},
      "placeholder": {},
      "report": { "disputedBy": {} },
      "forfeit": {},
      "chat": {},
      "calendar": {},
      "notifications": {},
      "errors": {},
      "empty": {},
      "roles": {},
      "status": { "season": {}, "league": {}, "group": {}, "invitation": {}, "rsvp": {} },
      "emailInvite": {}
    }
  }
  ```

- [ ] **Step 2: Add all status-enum string keys** from design.md §10.3.

  ```json
  "status": {
    "season": { "ACTIVE": "Active", "COMPLETED": "Completed" },
    "league": { "ACTIVE": "Active", "ARCHIVED": "Archived" },
    "group":  { "ACTIVE": "Active", "ARCHIVED": "Archived" },
    "invitation": { "SENT": "Sent", "ACCEPTED": "Accepted", "EXPIRED": "Expired", "REVOKED": "Revoked" },
    "rsvp": { "YES": "Yes", "NO": "No", "MAYBE": "Maybe", "WAITLIST": "Waitlist" }
  }
  ```

- [ ] **Step 3: Add all error keys** from `requirements.md §9` (one key per bullet point). Use the keys listed in design.md §10.6.

- [ ] **Step 4: Add recurrence composition keys** from design.md §10.4.

- [ ] **Step 5: Add score-report copy keys** from design.md §10.5.

- [ ] **Step 6: Verify JSON parses and no duplicate keys.**

  ```bash
  npx --yes json5 -c messages/en.json > /dev/null
  # or
  node -e "JSON.parse(require('fs').readFileSync('messages/en.json'))"
  ```

- [ ] **Step 7: Commit.**

  ```bash
  git add messages/en.json
  git commit -m "feat(i18n): scaffold leagues namespace with status and error keys"
  ```

**Done when:** every key referenced in design.md §10 is present, the JSON is valid, and `npm run lint` / `npm run build` succeed.

---

# Wave 1 — Read-only Organization + League + Season + Game

Read surfaces only — no mutations. Sets up routing, fragments, tagged fetches, and the tab-bar pattern that W2+ builds on. Each of W1.1-W1.4 can land independently within the wave.

---

## W1.1: Organization public page + graphql-request tag threading

**Scope:** Public `/org/[orgSlug]` page (header, admin list, Leagues-under-Org list). Add `tags` support to `graphql-request.ts` so all subsequent fetches can be tagged.

**Depends on:** P0, P2.

**Files:**
- Modify: `src/lib/graphql-request.ts` — add `tags?: string[]` option on `query` and `authQuery`, thread through `fetch(..., { next: { tags } })`.
- Modify: `src/lib/graphql-fragments.ts` — add `organizationCardFragment`, `organizationFragment`, `leagueCardFragment` (without trying to full-scope organization yet).
- Create: `src/app/[locale]/org/[orgSlug]/page.tsx`
- Create: `src/app/[locale]/org/[orgSlug]/loading.tsx`
- Create: `src/app/[locale]/org/[orgSlug]/error.tsx`
- Create: `src/app/[locale]/org/[orgSlug]/not-found.tsx`
- Create: `src/components/leagues/organization/org-header.tsx`
- Create: `src/components/leagues/organization/org-admin-list.tsx`
- Create: `src/components/leagues/organization/leagues-under-org.tsx`
- Create: `src/components/leagues/organization/league-card.tsx`
- Create: `src/lib/types/organization.ts`, `src/lib/types/league.ts`
- Create: `__tests__/` sibling tests for each new component.

**Steps:**

- [ ] **Step 1: Extend `graphql-request.ts` — write failing test.**

  Create `src/lib/__tests__/graphql-request.test.ts` that stubs `global.fetch` and asserts `fetch` is called with `next: { tags: ["league:1"] }` when `authQuery(q, { tags: ["league:1"] })` is used.

  Run: `npm test -- src/lib/__tests__/graphql-request.test.ts` → expected FAIL.

- [ ] **Step 2: Implement `tags` option.**

  In `graphql-request.ts`, extend `query` and `authQuery` signatures to accept an options object and forward `next.tags` to `fetch`. Keep backward compat: no options → no `next.tags`.

  Run test → PASS.

- [ ] **Step 3: Commit.**

  ```bash
  git add src/lib/graphql-request.ts src/lib/__tests__/graphql-request.test.ts
  git commit -m "feat(graphql): thread next.tags through query and authQuery"
  ```

- [ ] **Step 4: Write failing test for `OrgHeader`.**

  `OrgHeader` renders name, logo, description, admin-count badge. Feed a mock Organization. Render and assert text nodes.

  Run: `npm test -- src/components/leagues/organization/__tests__/org-header.test.tsx` → FAIL.

- [ ] **Step 5: Implement `OrgHeader`.**

  Server Component. Props: `{ organization: Organization }`. Uses `Typography` for all text. Logo via `next/image` with `sizes`. Admin count as a pill.

- [ ] **Step 6: Run test → PASS. Commit.**

- [ ] **Step 7: Write failing test for `OrgAdminList`.**

  Renders avatar row; overflow opens a CC dialog. Test the visual row and the overflow trigger.

- [ ] **Step 8: Implement `OrgAdminList`. Commit.**

- [ ] **Step 9: Write failing test for `LeaguesUnderOrg`.**

  Paginated list of Leagues. Test: first page renders 20, "Load more" button present when `hasNextPage`.

- [ ] **Step 10: Implement `LeaguesUnderOrg` + `LeagueCard`. Commit.**

- [ ] **Step 11: Implement the page `/org/[orgSlug]/page.tsx`.**

  - Server Component.
  - Fetches `organization(idOrSlug)` + nested `leagues(first: 20)` + admins.
  - Calls via `authQuery` if session exists, else `query` (unauthenticated viewers see public orgs).
  - Tags: `[\`org:${id}\`, \`org:${id}:leagues\`]`.
  - If null → `notFound()`.
  - Renders `<OrgHeader/>`, `<OrgAdminList/>`, `<LeaguesUnderOrg/>`.

- [ ] **Step 12: Implement `loading.tsx` + `error.tsx` + `not-found.tsx`.**

  `error.tsx` is a Client Component per CLAUDE.md. `not-found.tsx` renders a neutral "Organization not found" message.

- [ ] **Step 13: Implement `generateMetadata`** with `cache()` from `react` so the metadata query reuses the page's fetch.

- [ ] **Step 14: Integration test.**

  `tests/pages/org-public.spec.ts` — MSW handler returning a mock Organization, Playwright visits `/en/org/dugout-bar`, asserts header renders and League cards are visible. Visit as signed-out user.

  Run:
  ```bash
  npx playwright test --project=chromium tests/pages/org-public.spec.ts 2>&1 | tee /tmp/pw-org.txt
  ```

- [ ] **Step 15: Final run — lint + build + tests.**

  ```bash
  npm run lint && npm run build && npm test
  ```

- [ ] **Step 16: Final commit + PR.**

  ```bash
  git add -A
  git commit -m "feat(leagues): public Organization page with read-only surfaces"
  ```

**Done when:** a signed-out visitor can load `/en/org/<slug>` and see the org header, admin list, and up to 20 leagues, with a working "Load more" button, correct heading hierarchy, and no console errors.

---

## W1.2: League page shell + fetchLeagueForViewer + tab routing

**Scope:** League page with layout + nested-segment tabs (overview, members read-only, teams read-only, chat placeholder, schedule read-only, standings read-only). No admin affordances. No mutations.

**Depends on:** W1.1 (the `graphql-request tags` option lands there).

**Files:**
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/layout.tsx`
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/page.tsx` — redirects to `./overview`.
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/overview/page.tsx`
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/members/page.tsx`
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/teams/page.tsx`
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/chat/page.tsx` (placeholder — link to `/chat?room=X` until W5.1)
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/schedule/page.tsx`
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/standings/page.tsx`
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/loading.tsx`, `error.tsx`, `not-found.tsx`
- Create: `src/lib/data/league.ts` — home of `fetchLeagueForViewer`.
- Create: `src/lib/graphql-fragments.ts` extensions — `leagueFragment`, `leagueMembershipFragment`, `leaguePlayerFragment`, `seasonFragment`, `standingRowFragment`.
- Create: `src/components/leagues/league/league-header.tsx`
- Create: `src/components/leagues/league/league-tab-bar.tsx` (CC)
- Create: `src/components/leagues/league/archive-banner.tsx`
- Create: `src/components/leagues/season/seasons-list.tsx` (SC)
- Create: `src/components/leagues/member/member-list.tsx` (SC shell) + `member-row.tsx` (SC) + `placeholder-badge.tsx` (SC)
- Create: `src/components/leagues/team/teams-preview.tsx` (SC)

**Steps:**

- [ ] **Step 1: Write fragments** in `graphql-fragments.ts`. Commit as their own mini-step.

  ```ts
  export const leagueCardFragment = { id: true, slug: true, name: true, /* ... */ };
  export const leagueFragment = { ...leagueCardFragment, viewerIsAdmin: true, viewerMembership: membershipFragment, /* ... */ };
  export const membershipFragment = { id: true, role: true, joinedDate: true, /* ... */ };
  export const leaguePlayerFragment = { id: true, displayName: true, status: true, user: playerRefFragment };
  export const seasonFragment = { id: true, name: true, status: true, startDate: true, endDate: true };
  export const standingRowFragment = { rank: true, team: teamFragment, gamesPlayed: true, wins: true, losses: true, draws: true, winPct: true };
  ```

- [ ] **Step 2: Write failing test for `fetchLeagueForViewer`.**

  Mock `authQuery` and `query`. Test:
  - Signed-in viewer → uses `authQuery`.
  - Signed-out viewer → uses `query`.
  - Backend returns null → function returns null.
  - Backend returns League → function returns `{ league, viewer }`.
  - Cached: calling twice in same request uses one query (use `cache()` from `react` and test with a counter spy).

- [ ] **Step 3: Implement `fetchLeagueForViewer`.**

  ```ts
  import { cache } from "react";
  import { headers } from "next/headers";
  import { auth } from "@/lib/auth";
  import { authQuery, query } from "@/lib/graphql-request";
  import { leagueFragment } from "@/lib/graphql-fragments";

  export const fetchLeagueForViewer = cache(async (idOrSlug: string) => {
    const session = await auth.api.getSession({ headers: await headers() });
    const q = session?.user ? authQuery : query;
    const { league } = await q(
      { league: { __args: { idOrSlug }, ...leagueFragment } },
      { tags: [`league:${idOrSlug}`] },
    );
    return league ? { league, viewer: session?.user ?? null } : null;
  });
  ```

- [ ] **Step 4: Run tests → PASS. Commit.**

- [ ] **Step 5: Write failing test for `LeagueHeader`.**

  Renders name, logo, sport pill, visibility pill, timezone, archive banner (when archived).

- [ ] **Step 6: Implement `LeagueHeader`. Commit.**

- [ ] **Step 7: Write failing test for `LeagueTabBar`.**

  Test:
  - Renders tabs per `design.md §3.2`.
  - `aria-current="page"` on active tab based on `usePathname()`.
  - Admin tabs (Settings, Invitations) rendered only when `isAdmin={true}`.

- [ ] **Step 8: Implement `LeagueTabBar`.**

  ```tsx
  "use client";
  import { Link, usePathname } from "@/i18n/navigation"; // named exports — both wrapped by next-intl

  const tabs = [
    { href: "overview", labelKey: "leagues.league.tabs.overview" },
    { href: "members", labelKey: "leagues.league.tabs.members" },
    { href: "teams", labelKey: "leagues.league.tabs.teams" },
    { href: "chat", labelKey: "leagues.league.tabs.chat" },
    { href: "schedule", labelKey: "leagues.league.tabs.schedule" },
    { href: "standings", labelKey: "leagues.league.tabs.standings" },
  ];
  const adminTabs = [
    { href: "invitations", labelKey: "leagues.league.tabs.invitations" },
    { href: "settings", labelKey: "leagues.league.tabs.settings" },
  ];
  ```

- [ ] **Step 9: Commit.**

- [ ] **Step 10: Implement the shared `layout.tsx`.**

  - Server Component.
  - Calls `fetchLeagueForViewer(`${orgSlug}/${leagueSlug}`)`.
  - Returns `notFound()` if null.
  - Renders `<LeagueHeader>`, `<ArchiveBanner>` (conditional), `<LeagueTabBar isAdmin={league.viewerIsAdmin}/>`, then `{children}`.

- [ ] **Step 11: Implement the default `page.tsx`** — `redirect("./overview")` using `@/i18n/navigation` redirect.

- [ ] **Step 12: Implement `overview/page.tsx`.**

  Fetches seasons list (paginated) and renders `<SeasonsList>`. Tags: `[\`league:${id}:seasons\`]`.

- [ ] **Step 13: Implement `members/page.tsx`.**

  Fetches members. SC renders `<MemberList>` read-only. Tags: `[\`league:${id}:members\`]`. No admin affordances yet (W2 adds those).

- [ ] **Step 14: Implement `teams/page.tsx`.**

  Fetches current Season's teams (read-only). Tags: `[\`league:${id}:current-season\`, \`season:${currentSeasonId}\`]`.

- [ ] **Step 15: Implement `schedule/page.tsx`** and `standings/page.tsx` as stubs that delegate to the current Season's route or render an empty state if no active Season.

- [ ] **Step 16: Implement `chat/page.tsx`** as a placeholder card that links to `/chat?room=...` (even if Path A chat refactor ships later; W5.1 swaps the placeholder for the embedded conversation).

- [ ] **Step 17: Implement `loading.tsx`, `error.tsx`, `not-found.tsx`** per CLAUDE.md patterns.

- [ ] **Step 18: Integration test.**

  `tests/pages/league-public.spec.ts` — MSW mock returns a PUBLIC League. Navigate to each tab and verify content renders without a full-page reload (check that the layout header stays mounted).

  Run: `npx playwright test --project=chromium tests/pages/league-public.spec.ts 2>&1 | tee /tmp/pw-league.txt`.

- [ ] **Step 19: Verify unauthenticated + signed-in paths.**

  Two Playwright tests: (a) signed-out user on PUBLIC League, (b) signed-in non-member on PUBLIC League, (c) signed-out on UNLISTED League → 404.

- [ ] **Step 20: Lint + build + commit PR.**

**Done when:** navigating to `/en/league/<orgSlug>/<leagueSlug>` renders the header and every tab routes correctly; UNLISTED Leagues 404 for non-members; tab switching preserves layout; no admin UI visible to non-admins.

---

## W1.3: Season page read surfaces (standings + schedule + history)

**Scope:** Season page with three sibling Suspense panels (Standings / Schedule / History), each streamed independently. Read-only.

**Depends on:** W1.2.

**Files:**
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/season/[seasonId]/layout.tsx`
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/season/[seasonId]/page.tsx` — redirects to `./standings`.
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/season/[seasonId]/standings/page.tsx`
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/season/[seasonId]/schedule/page.tsx`
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/season/[seasonId]/history/page.tsx`
- Create: `src/components/leagues/season/season-header.tsx`
- Create: `src/components/leagues/season/season-tab-bar.tsx` (CC)
- Create: `src/components/leagues/season/standings-table.tsx` (CC)
- Create: `src/components/leagues/season/schedule-grid.tsx` (SC shell + CC row)
- Create: `src/components/leagues/season/history-list.tsx` (SC)
- Create: `src/components/leagues/shared/game-row.tsx` (reusable SC)

**Steps:**

- [ ] **Step 1: Write failing test for `StandingsTable`.**

  Render a list of `StandingRow`. Assert:
  - Sortable columns (W, L, Draw, Win%, Rank).
  - `aria-sort` updates correctly.
  - Empty state ("No games played yet") when all rows are 0-0.
  - Team color swatches are `aria-hidden="true"`; team name is the accessible label.

- [ ] **Step 2: Implement `StandingsTable`.**

  Use a native `<table>` with `<thead>` sort buttons (`aria-pressed`, `aria-sort`). Row cells use `Typography`. Per design.md §12.2 standings cap ~32 teams, no virtualization.

- [ ] **Step 3: Commit.**

- [ ] **Step 4: Write failing test for `ScheduleGrid`.**

  Renders games grouped by date. Assert grouping logic and ASC ordering.

- [ ] **Step 5: Implement `ScheduleGrid`.**

  Fetches `Season.games(sort: SCHEDULED_AT_ASC, first: 50)`. Groups by `startDate` in the Season's timezone.

- [ ] **Step 6: Implement `HistoryList`** — same game-row component, sort DESC.

- [ ] **Step 7: Implement `season/[seasonId]/layout.tsx`.**

  Fetches `seasonFragment`. Renders `<SeasonHeader>` + `<SeasonTabBar>` + `{children}`.

  Tags: `[\`season:${id}\`]`.

- [ ] **Step 8: Implement `standings/page.tsx`.**

  ```tsx
  import { authQuery } from "@/lib/graphql-request";
  export default async function StandingsPage({ params }: { params: Promise<{ seasonId: string }> }) {
    const { seasonId } = await params;
    const { season } = await authQuery(
      { season: { __args: { id: seasonId }, standings: standingRowFragment } },
      { tags: [`season:${seasonId}:standings`] },
    );
    return <StandingsTable rows={season.standings} />;
  }
  ```

  Note: `Season.standings` is `[StandingRow!]!` — **plain list**, not Connection. Consume as `.standings.map()`.

- [ ] **Step 9: Implement `schedule/page.tsx` and `history/page.tsx`** with sort variant (`SCHEDULED_AT_ASC` vs `SCHEDULED_AT_DESC`). Tag `:schedule` and `:history` respectively.

- [ ] **Step 10: Sibling-Suspense composition on the Season default page.**

  If the default Season page doesn't redirect (only fires on `/season/[id]` without a subtab), wrap each panel in its own `<Suspense>` so they stream.

- [ ] **Step 11: Accessibility audit — run the skill.**

  Invoke `/web-design-guidelines`, walk through StandingsTable keyboard paths. Fix issues inline.

- [ ] **Step 12: Integration test.**

  `tests/pages/season-standings.spec.ts` — mock season with 6 teams, assert sortable headers work. Keyboard-navigate via Tab.

- [ ] **Step 13: Commit + PR.**

**Done when:** `/en/league/<org>/<league>/season/<id>/standings` renders a sortable table with correct a11y; `/schedule` and `/history` list games in the right order; tab switching preserves the layout; empty-state copy renders for a new Season.

---

## W1.4: Game page breadcrumbs + `GameResultBadge`

**Scope:** Add breadcrumb (league/season or group) and read-only `GameResultBadge` to the existing game page. Reads `Game.outcome` and `Game.result`.

**Depends on:** W1.2 (League routes exist), P0 (verified `Game.outcome` is shipped, `Game.league`/`Game.season`/`Game.group`/`Game.sourceSeries` are object refs).

**Important schema shape:** Backend exposes `Game.league: League`, `Game.season: Season`, `Game.group: Group`, `Game.sourceSeries: GameSeries` as **object refs** (batch-mapped), **not scalar IDs**. Every query selects `league { id }` / `group { id }` etc.; every branch is `game.league != null` (not `game.leagueId != null`). Every tag uses `game.league.id` / `game.season.id` / `game.group.id`.

**Files:**
- Modify: `src/app/[locale]/game/[id]/page.tsx` (or the equivalent server component that renders the game detail) — add selections for `league { id, slug, name, organization { slug, name } }`, `season { id, name }`, `group { id, slug, name }`, `sourceSeries { id, name }`, `outcome`, `result`, `viewerGameRole`, `sportAllowsDraws`, and (if backend shipped it) `winner { id }`.
- Create: `src/components/leagues/game-affordances/league-season-breadcrumb.tsx` (SC)
- Create: `src/components/leagues/game-affordances/group-breadcrumb.tsx` (SC)
- Create: `src/components/leagues/game-affordances/game-result-badge.tsx` (SC)
- Modify: `src/lib/graphql-fragments.ts` — add `gameResultFragment`, `viewerCapabilitiesFragment`, `gameAggregateRefsFragment` (selecting `league/season/group/sourceSeries` with slugs + names).
- Modify: `src/lib/types/game.ts` — add the new object-ref fields.

**Steps:**

- [ ] **Step 1: Write failing test for `GameResultBadge`.**

  Test six outcome states render distinctly:
  - `NOT_REPORTED` → "Score not entered"
  - `SCORE_ENTERED` → "Score entered · Not reported"
  - `REPORTED_AWAITING_CONFIRM` → "Reported — waiting for {captain} to confirm"
  - `CONFIRMED_WIN` → "{team} won"
  - `CONFIRMED_DRAW` → "Draw" (only when `sportAllowsDraws`)
  - `FORFEITED` → "W/L (forfeit)"

  Plus a text+icon (not color-only) assertion.

- [ ] **Step 2: Implement `GameResultBadge`.**

  ```tsx
  export function GameResultBadge({ game }: { game: GameWithOutcome }) {
    switch (game.outcome) {
      case "NOT_REPORTED":           return <Pill icon={…} text={t("leagues.report.state.notReported")} />;
      case "SCORE_ENTERED":          return <Pill icon={…} text={t("leagues.report.state.scoreEntered")} />;
      case "REPORTED_AWAITING_CONFIRM": return <Pill icon={…} text={t("leagues.report.state.awaitingConfirm", { captain: game.result.opposingCaptain.displayName })} />;
      case "CONFIRMED_WIN":          return <Pill icon={…} text={t("leagues.report.state.confirmedWin", { team: winnerName })} />;
      case "CONFIRMED_DRAW":         return <Pill icon={…} text={t("leagues.report.state.draw")} />;
      case "FORFEITED":              return <Pill icon={…} text={t("leagues.report.state.forfeit", { outcome: viewerSide })} />;
    }
  }
  ```

  Winner rendering: use `Game.winner` field if backend exposed it (design.md §6.2 recommended ask); otherwise derive from team metadata per sport.

- [ ] **Step 3: Commit.**

- [ ] **Step 3a: Implement winner derivation** — required if backend did **not** ship `Game.winner`.

  If P0 Step 7 confirmed `Game.winner: TeamInstance` is shipped, skip — just read `game.winner`. Otherwise write `src/components/leagues/game-affordances/derive-winner.ts`:

  ```ts
  // Input: Game with teamInstances + sport-specific score metadata.
  // Output: TeamInstance id, or null for draw / unresolved.
  export function deriveWinner(game: GameWithScores): string | null {
    switch (game.sport) {
      case "BASKETBALL": /* compare total points */ break;
      case "BASEBALL":   /* compare runs */ break;
      // ... one case per sport
    }
  }
  ```

  Add unit tests covering each sport's scoring shape. This file is required by `GameResultBadge`'s `CONFIRMED_WIN` state and must exist before W1.4 can ship. Commit as its own step.

- [ ] **Step 4: Implement `LeagueSeasonBreadcrumb`** — renders `Org / League / Season` path when `game.league != null` and `game.season != null`. Uses `game.league.organization.slug`, `game.league.slug`, `game.season.name` (object refs, not scalars).

- [ ] **Step 5: Implement `GroupBreadcrumb`** — renders `Group / Series (optional)` when `game.group != null`. Includes back-link to series when `game.sourceSeries != null`. Uses `game.group.slug`, `game.sourceSeries.id` + `.name`.

- [ ] **Step 6: Mount breadcrumb + badge on the existing game page.**

  Read existing `src/app/[locale]/game/[id]/page.tsx` and find a clean insertion point near the hero. Gate the components on `game.league != null` or `game.group != null` (object-ref presence, not scalar IDs).

- [ ] **Step 7: Extend the game page's query** to select the new fields via `gameAggregateRefsFragment` + `viewerCapabilitiesFragment` + `gameResultFragment`.

- [ ] **Step 8: Integration test.**

  `tests/pages/game-league-breadcrumb.spec.ts` — mock a League game (`league: {id, slug, name, organization: {...}}, season: {...}`), assert breadcrumb renders; mock a Group game (`group: {...}, sourceSeries: {...}`), assert breadcrumb + series-back-link; mock a standalone game (`league: null, group: null`) and assert no breadcrumb.

- [ ] **Step 9: Commit + PR.**

**Done when:** viewing a game that belongs to a League or Group shows the correct breadcrumb and the appropriate badge for all six outcome states; standalone games render unchanged.

---

# Wave 2 — Organization + League mutations

This wave unlocks "Rick can run a League" end-to-end except score reporting (which lands in W4).

## W2.1: Create/edit Organization + admin management

**Scope:** Create Org form, edit Org form, add/remove Org admins.

**Depends on:** W1.1.

**Files:**
- Create: `src/app/[locale]/org/new/page.tsx` (CC wrapped in SC)
- Create: `src/app/[locale]/org/[orgSlug]/settings/page.tsx`
- Create: `src/app/[locale]/org/actions.ts`
- Create: `src/components/leagues/organization/create-org-form.tsx` (CC)
- Create: `src/components/leagues/organization/edit-org-form.tsx` (CC)
- Create: `src/components/leagues/organization/org-admins-panel.tsx` (CC)
- Create: `src/lib/validation/organization.ts`

**Steps:**

- [ ] **Step 1: Write Zod schemas.**

  ```ts
  // src/lib/validation/organization.ts
  import { z } from "zod";
  export const orgCreateSchema = z.object({
    name: z.string().min(2).max(100, { error: "leagues.errors.orgNameTooLong" }),
    description: z.string().max(1000).optional(),
    logoResourceId: z.string().optional(),
    slug: z.string().regex(/^[a-z0-9-]+$/, { error: "leagues.errors.slugInvalid" }).optional(),
  });
  export type OrgCreateInput = z.infer<typeof orgCreateSchema>;
  ```

- [ ] **Step 2: Write server-action tests.**

  Mock `authMutate` and `auth.api.getSession`. Cover:
  - Unauthenticated → returns `Unauthenticated` error.
  - Zod invalid → returns `ValidationError`.
  - Slug conflict → returns `SlugUnavailableError` with `fieldPath: "slug"`.
  - Success → calls `revalidateTag("user:${userId}:leagues")` … plus returns `{ success: true, data }`.

- [ ] **Step 3: Implement `createOrganizationAction` + `updateOrganizationAction`.**

  Follow SP-1. Use `extractMutationResult()` for the union types.

- [ ] **Step 4: Commit.**

- [ ] **Step 5: Write failing test for `CreateOrgForm`.**

  TanStack Form + Zod v4. Test:
  - Invalid name → inline error below field.
  - Server returns `SlugUnavailableError` → inline error on `slug` field (via `form.setFieldMeta`).
  - Success → navigates to `/org/[slug]`.

- [ ] **Step 6: Implement `CreateOrgForm`.**

  Use existing form patterns from `src/components/game/create-game-form.tsx` as reference. Slug field has live-preview based on name, with a "change" toggle.

- [ ] **Step 7: Commit.**

- [ ] **Step 8: Implement `/org/new/page.tsx`.**

  Renders `<CreateOrgForm>`. Requires auth (if no session, redirect to sign-in).

- [ ] **Step 9: Implement `EditOrgForm` and the `/settings` route** (admin-only; uses §13.2 Case B redirect pattern if viewer is not an admin).

- [ ] **Step 10: Implement `OrgAdminsPanel`** — add/remove admins. Uses `addOrganizationAdminAction` / `removeOrganizationAdminAction`. Enforces ≥1 admin: server returns `LastAdminError` → map to toast + inline banner.

  **Ownership note.** W2.1 ships the **full** version of `removeOrganizationAdminAction`, including the fan-out revalidation across all Leagues under the Org (see H4 / W2.8 Step 1 for the exact behavior). W2.8 references the action but does not re-implement it. This is the single source of truth.

- [ ] **Step 11: Integration test.**

  `tests/pages/org-create.spec.ts` — flow: sign in → go to `/org/new` → fill form → submit → assert redirect to `/org/[slug]`.

- [ ] **Step 12: Commit + PR.**

**Done when:** a signed-in user can create an Org, edit its name/description/logo, and promote/demote Org admins; last-admin block surfaces correctly; slug conflicts surface as inline field errors.

---

## W2.2: Create/edit League + archive

**Scope:** Create League form (under an Org), edit League settings, archive League with typed-confirm.

**Depends on:** W2.1.

**Files:**
- Create: `src/app/[locale]/league/new/page.tsx`
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/settings/page.tsx`
- Create: `src/app/[locale]/league/actions.ts`
- Create: `src/components/leagues/league/create-league-form.tsx`
- Create: `src/components/leagues/league/edit-league-form.tsx`
- Create: `src/components/leagues/league/archive-league-dialog.tsx`
- Create: `src/lib/validation/league.ts`
- Create: `src/components/leagues/shared/timezone-picker.tsx` (CC)

**Steps:**

- [ ] **Step 1: Timezone picker — write failing test.**

  Combobox over `Intl.supportedValuesOf("timeZone")`. Default value = `Intl.DateTimeFormat().resolvedOptions().timeZone`. Required field.

- [ ] **Step 2: Implement `TimezonePicker`.**

  Uses shadcn Combobox. Expose an `onChange` + `value` prop. On mount, if no value is provided, set to browser default.

- [ ] **Step 3: Commit.**

- [ ] **Step 4: League Zod schemas** — per design.md §5.3.

  ```ts
  import { SportType } from "@/lib/types/sport";
  export const leagueCreateSchema = z.object({
    name: z.string().min(2).max(100),
    sportType: z.enum(SportType),
    sportSubtype: z.string().optional(),
    description: z.string().max(1000).optional(),
    visibility: z.enum(["PUBLIC", "UNLISTED"]),
    timezone: z.string().refine(isValidIANATimezone, { error: "leagues.errors.timezoneInvalid" }),
    slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
    organizationId: z.string(),
  });
  ```

- [ ] **Step 5: Server actions** — `createLeagueAction`, `updateLeagueAction`, `archiveLeagueAction`. Follow SP-1. `archiveLeagueAction` requires typed confirm value.

- [ ] **Step 6: Write failing test for `CreateLeagueForm`.**

  Covers sport-locked-after-create (sport field is `radio`, visually disabled on edit form).

- [ ] **Step 7: Implement `CreateLeagueForm`.**

- [ ] **Step 8: Implement `EditLeagueForm`.**

  Sport field is disabled (immutable per req §9 error catalog). Other fields editable.

- [ ] **Step 9: Implement `ArchiveLeagueDialog`.**

  shadcn `AlertDialog`. Typed-confirm requires typing the League name. Default focus on the text input (per design.md §12.2 destructive-dialog rule). Copy: "This will freeze the schedule and standings. Chat goes read-only. Archived Leagues can't be un-archived in v1."

- [ ] **Step 10: Implement `/league/new/page.tsx`** — must accept `?orgId=X` and show the chosen Org in a locked field.

- [ ] **Step 11: Implement `/league/.../settings/page.tsx`** with §13.2 Case B redirect for non-admin.

- [ ] **Step 12: Wire `LeagueAdminMenu` kebab menu** (CC) onto the League header. Includes "Edit" and "Archive" entries.

- [ ] **Step 13: Integration tests.**

  Flow: sign in → create Org → create League → edit League → archive League → verify archive banner appears + league header says "Archived".

- [ ] **Step 14: Commit + PR.**

**Done when:** Org admins can create, edit, and archive a League; sport is locked post-creation; archive is typed-confirm; non-admins redirected away from `/settings` with an "admin required" toast.

---

## W2.3: League members management (direct-add, email invites, shareable links, placeholders)

**Scope:** Admin surfaces for adding members — direct-add from user search, email-invite batch, shareable link creation. Placeholder member creation with privacy warning.

**Depends on:** W2.2.

**Files:**
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/invitations/page.tsx`
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/invitations/actions.ts`
- Create: `src/components/leagues/invitation/send-invites-panel.tsx`
- Create: `src/components/leagues/invitation/invitee-search-field.tsx`
- Create: `src/components/leagues/invitation/email-invite-textarea.tsx`
- Create: `src/components/leagues/invitation/create-link-form.tsx`
- Create: `src/components/leagues/invitation/invitation-list.tsx`
- Create: `src/components/leagues/invitation/invite-link-list.tsx`
- Create: `src/components/leagues/member/create-placeholder-dialog.tsx`
- Create: `src/components/leagues/member/privacy-warning-banner.tsx`
- Create: `src/lib/validation/invitation.ts`

**Steps:**

- [ ] **Step 1: Invitation Zod schemas.**

  ```ts
  export const sendInvitationsSchema = z.object({
    aggregateId: z.string(),
    aggregateType: z.enum(["LEAGUE", "GROUP"]),
    recipients: z.array(
      z.union([
        z.object({ kind: z.literal("USER"), userId: z.string() }),
        z.object({ kind: z.literal("EMAIL"), email: z.string().email() }),
      ]),
    ).min(1).max(200),  // batch cap from backend
    role: z.enum(["MEMBER", "ADMIN"]).default("MEMBER"),
  });
  ```

- [ ] **Step 2: Server actions.**

  `sendInvitationsAction`, `resendInvitationAction`, `revokeInvitationAction`, `createInviteLinkAction`, `revokeInviteLinkAction`, `createPlaceholderAction`, `removePlaceholderAction`, `removeLeagueMemberAction`. Each follows SP-1 + §4.5a revalidation tags.

  **Shared last-admin error mapping.** `removeLeagueMemberAction` (here) and `leaveLeagueAction` (W2.8) both map `LastAdminError` to copy. Both must use the same helper to avoid UX drift. Create `src/lib/errors/league-membership-errors.ts` in this PR:

  ```ts
  import { translate } from "@/i18n/...";
  export function mapMembershipError(errorType: string): { key: string; fieldPath?: string } {
    switch (errorType) {
      case "LastAdminError":       return { key: "leagues.errors.lastAdmin" };
      case "PlaceholderCantPromote": return { key: "leagues.errors.placeholderCantPromote" };
      // ... etc
    }
  }
  ```

  W2.8 imports from this file instead of re-mapping.

- [ ] **Step 3: Write failing test for `SendInvitesPanel`.**

  Tabs: Direct add / Email invite / Shareable link. Test that:
  - Email-invite textarea validates one-email-per-line.
  - Shareable link form has expiry + use-cap fields.
  - Direct-add search returns only real users.

- [ ] **Step 4: Implement `InviteeSearchField`** — combobox over `searchUsers` query; returns `{userId, displayName}`.

- [ ] **Step 5: Implement `EmailInviteTextarea`** — validates per-line + highlights invalid emails.

- [ ] **Step 6: Implement `CreateLinkForm`** — expiry picker (optional) + use-cap number input.

- [ ] **Step 7: Implement `SendInvitesPanel`.**

  Wraps the three tabs. Submit handler calls the right action.

- [ ] **Step 8: Implement `InvitationList` + `InviteLinkList`** — per-row actions (Resend / Revoke / Convert to placeholder). When resending, UI banner: "This revokes the prior invite."

- [ ] **Step 9: Implement `PrivacyWarningBanner`.**

  **Not dismissible** — always rendered above the submit button on placeholder creation. Copy sourced from i18n key `leagues.placeholder.privacyWarning` (content design — blocked on OQ7).

- [ ] **Step 10: Implement `CreatePlaceholderDialog`.**

  Name input + privacy warning banner. Blocks submit until privacy warning is visibly rendered (guard against CSS hides).

- [ ] **Step 11: Implement `/invitations/page.tsx`** with admin-only gate (§13.2 Case B).

- [ ] **Step 12: Integration test.**

  Flow: admin → `/invitations` → enter 3 emails → submit → verify MSW sees one batch call → check the list shows 3 Sent rows → revoke one → verify status flips to Revoked.

  **Paging-duplicates test (accepted-v1 behavior per design §4.6).** Open the invitations list on tab A. In tab B, send one more invite → triggers `revalidateTag` on `league:X:invitations`. In tab A, load-more a second page. Assert the duplicate that may temporarily appear (concurrent-append hazard) resolves to a single row after `router.refresh()`. This confirms the cost is "temporary duplicate" not "permanent duplicate."

- [ ] **Step 13: Accessibility audit.**

  Privacy warning banner has `role="alert"` and is focusable. Placeholder badge has SR text per design.md §12.3.

- [ ] **Step 14: Commit + PR.**

**Done when:** admin can direct-add a user, paste ≤200 emails in one batch, create a time-limited shareable link, convert a non-signing-up person into a placeholder with a privacy warning, and see per-invite status in the list.

---

## W2.4: Invite accept / decline flow + `/invite/[token]` preview

**Scope:** Token-gated invite preview page. Accept, Decline. Works signed-in and signed-out.

**Depends on:** W2.3.

**Files:**
- Create: `src/app/[locale]/invite/[token]/page.tsx`
- Create: `src/app/[locale]/invite/[token]/not-found.tsx`
- Create: `src/app/[locale]/invite/actions.ts`
- Create: `src/components/leagues/invitation/invite-preview-card.tsx` (SC)
- Create: `src/components/leagues/invitation/accept-button.tsx` (CC)
- Create: `src/components/leagues/invitation/decline-button.tsx` (CC)

**Steps:**

- [ ] **Step 1: Server actions** — `acceptInvitationAction`, `declineInvitationAction`, `redeemInviteLinkAction`. Follow SP-1 + §4.5a tags (both `*:members` and `*:invitations`).

- [ ] **Step 2: Write failing test for `InvitePreviewCard`.**

  Test that for an invite-only Group, only the inviting admin's name is shown (OQ6 decision). For a public League, full admin list is visible. Expiry / remaining uses render.

- [ ] **Step 3: Implement `InvitePreviewCard`.**

  SC. Fetches `invitePreview(token)` — an unauthenticated-allowed query (backend §4.16).

- [ ] **Step 4: Implement `AcceptButton`.**

  CC. If signed in → calls `acceptInvitationAction` → redirects to aggregate page on success. If signed out → bounces to sign-in with `?returnTo=/invite/[token]`.

- [ ] **Step 5: Implement `DeclineButton`.**

  CC. Works signed-out. Calls `declineInvitationAction`. On success → toast + navigate home.

- [ ] **Step 6: Implement `/invite/[token]/page.tsx`.**

  SC. Backend contract (`resolveInvite(token: String!): InvitePreview!`): **one** non-null type, discriminated by an `InviteStatus` enum on `InvitePreview.status`. Not a union of error typenames.

  Expected fields on `InvitePreview`:
  - `status: InviteStatus!` — one of `PENDING | EXPIRED | REVOKED | FULL | ACCEPTED` (confirm exact values in P0 Step 7).
  - `usesRemaining: Int`, `expiresAt: DateTime` — for display and UX copy.
  - Aggregate preview fields (name, sport, admin list, etc.) populated only when `status === PENDING`; null for terminal states.
  - If the token doesn't exist at all, the call throws a `NotFound`-shaped GraphQL error caught by the page and mapped to `notFound()`.

  Branch on `preview.status`:

  | `status` value | Copy key | Page renders |
  |---|---|---|
  | `PENDING` | — | preview card with Accept / Decline |
  | `EXPIRED` | `leagues.errors.inviteExpired` | error card: "Ask the sender to resend" |
  | `REVOKED` | `leagues.errors.inviteRevoked` | error card: admin revoked this link |
  | `FULL` | `leagues.errors.inviteFull` | error card: "Ask for a direct invite" |
  | `ACCEPTED` | redirect + toast | bounce signed-in members to aggregate page; bounce signed-out viewers to sign-in preserving `returnTo` |

  Rationale: the `ACCEPTED` case handles already-redeemed links without a separate `InviteAlreadyRedeemedError`. Whether the **current viewer** is the one who already accepted (vs a different user who used the same single-use link) is distinguishable via `preview.redeemedByViewer: Boolean` — confirm in P0 that this scalar exists; otherwise treat `ACCEPTED` as "someone redeemed this" and send everyone to sign-in-then-aggregate.

  **P0 Step 7 must confirm** (update P0 to add): the exact `InviteStatus` enum values; whether a `redeemedByViewer` scalar exists; whether `resolveInvite` is the correct operation name (not `invitePreview` as earlier plan drafts claimed).

- [ ] **Step 7: Integration tests.**

  - Signed-out path: visit `/invite/<token>`, click Accept → routed to sign-in → after sign-in, redirected to `/invite/<token>`, click Accept → lands on League.
  - Signed-in path: click Accept → lands on League; verify member count incremented.
  - Decline: signed-out → Decline button works and calls action.
  - Already-redeemed link: visit with same token → server returns `InviteAlreadyRedeemedError` (H8 table) → page bounces to aggregate with a toast "You're already in this League" (for existing members) or to sign-in preserving `returnTo=/invite/[token]` (for signed-out users whose invite has already been used). Do **not** collapse to `notFound()`.

- [ ] **Step 8: Commit + PR.**

**Done when:** the full invite loop (send → accept → join + chat) works end-to-end for both signed-in and signed-out recipients, and decline fires the inviter's notification.

---

## W2.5: Seasons CRUD + mark complete

**Scope:** Create/edit/delete Season (with guard against deletion if games exist), manual status toggle to Completed.

**Depends on:** W2.2.

**Files:**
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/season/actions.ts`
- Create: `src/components/leagues/season/create-season-dialog.tsx`
- Create: `src/components/leagues/season/edit-season-dialog.tsx`
- Create: `src/components/leagues/season/delete-season-dialog.tsx`
- Create: `src/components/leagues/season/mark-season-complete-button.tsx`
- Create: `src/lib/validation/season.ts`

**Steps:**

- [ ] **Step 1: Season Zod schemas.**

  ```ts
  export const seasonCreateSchema = z.object({
    leagueId: z.string(),
    name: z.string().min(2).max(100),
    startDate: z.iso.date().optional(),
    endDate: z.iso.date().optional(),
  }).refine((v) => !v.startDate || !v.endDate || v.startDate <= v.endDate, {
    error: "leagues.errors.seasonDatesInverted",
    path: ["endDate"],
  });
  ```

- [ ] **Step 2: Server actions** — `createSeasonAction`, `updateSeasonAction`, `setSeasonStatusAction`, `deleteSeasonAction`.

  `deleteSeasonAction` surfaces `SeasonHasGamesError` → map to inline error banner (req §9).

- [ ] **Step 3-6: Dialogs for create/edit/delete + `MarkSeasonCompleteButton`** (with confirmation; admin-only).

- [ ] **Step 7: Mount the dialogs on the League `overview` tab.**

  Admin sees a "New Season" button. Row-level kebab for each Season with edit/complete/delete.

- [ ] **Step 8: Integration test.**

  Create Season → edit name → try to delete when games exist → see error → games deleted first → delete succeeds.

- [ ] **Step 9: Commit + PR.**

**Done when:** admin can create/edit/delete Seasons, and can flip Active → Completed; deletion is blocked with helpful copy when games exist.

---

## W2.6: League Teams CRUD (inside a Season)

**Scope:** Create/edit/delete LeagueTeam with captain picker and roster picker.

**Depends on:** W2.5.

**Files:**
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/season/[seasonId]/teams/page.tsx`
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/season/[seasonId]/teams/new/page.tsx`
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/season/[seasonId]/teams/[teamId]/edit/page.tsx`
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/season/[seasonId]/teams/actions.ts`
- Create: `src/components/leagues/team/team-card.tsx` (SC)
- Create: `src/components/leagues/team/team-detail-drawer.tsx` (CC)
- Create: `src/components/leagues/team/create-edit-team-form.tsx` (CC)
- Create: `src/components/leagues/team/captain-picker.tsx` (CC — gated to team roster)
- Create: `src/components/leagues/team/player-picker.tsx` (CC — gated to League players)

**Steps:**

- [ ] **Step 1: Team Zod schema** (design.md §5.1).

  Name, color (hex swatch), captain (userId), roster (array of leaguePlayerIds). Refine: captain must be in roster.

- [ ] **Step 2: Server actions** — `createLeagueTeamAction`, `updateLeagueTeamAction`, `deleteLeagueTeamAction`, `addLeaguePlayerToTeamAction`, `removeLeaguePlayerFromTeamAction`, `swapLeagueTeamPlayerAction`.

- [ ] **Step 3-6: Component tests and implementations.**

  - `CaptainPicker`: only rostered players.
  - `PlayerPicker`: League players; placeholder badge visible.
  - `CreateEditTeamForm`: name, color swatch (6 preset + custom picker), captain, roster.
  - `TeamCard`: read-only preview.
  - `TeamDetailDrawer`: expanded roster with add/remove.

- [ ] **Step 7: Integration test.**

  Flow: admin → Season page → Teams tab → Create team (red) → add 6 players → set captain → edit captain → delete one roster entry → delete team.

- [ ] **Step 8: Commit + PR.**

**Done when:** admin can create/edit/delete teams, assign captains (validated to be on roster), and add/remove players (including placeholders).

---

## W2.7: Copy teams from previous Season

**Scope:** 3-step wizard — pick source Season, preview via `dryRun=true`, confirm via `dryRun=false`.

**Depends on:** W2.6.

**Files:**
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/season/[seasonId]/copy-teams/page.tsx`
- Create: `src/components/leagues/team/copy-teams-wizard.tsx` (CC)

**Steps:**

- [ ] **Step 1: Test the wizard flow.**

  - Step 1: source-Season picker.
  - Step 2: preview (read-only, renders teams + captains from dry-run).
  - Step 3: confirm → calls `copyTeamsFromPreviousSeasonAction({dryRun: false})`.

- [ ] **Step 2: Implement the wizard** using shadcn `Tabs` or a `Stepper` pattern with URL query param (`?step=1|2|3`) so back-button works.

- [ ] **Step 3: Server action** — `copyTeamsFromPreviousSeasonAction(input, {dryRun})`.

  **Response is a union.** Per backend impl plan, the mutation returns `CopyTeamsFromPreviousSeasonResult` — a union of:
  - `PlannedCopyResponse` (dry-run): lists the teams + captains that *would* be copied, without persisting.
  - `AppliedCopyResponse` (real run): lists the actually-created team IDs.
  - Plus any error typenames (e.g., `SeasonNotFoundError`, `SourceSeasonEmptyError`).

  Fragment needed in `src/lib/graphql-fragments.ts`:

  ```ts
  export const copyTeamsFromPreviousSeasonResultFragment = {
    __typename: true,
    __on: [
      {
        __typeName: "PlannedCopyResponse",
        plannedTeams: {
          name: true, color: true,
          captain: playerRefFragment,
          roster: { nodes: leaguePlayerFragment },
        },
      },
      {
        __typeName: "AppliedCopyResponse",
        createdTeams: teamFragment,
      },
      errorFragment,
    ],
  };
  ```

  Wizard's Step 2 (preview) reads `__typename === "PlannedCopyResponse"` and iterates `plannedTeams`. Step 3 (confirm) calls the same action with `dryRun: false` and expects `AppliedCopyResponse`, then navigates to the Season's Teams tab.

- [ ] **Step 4: Integration test.**

  Create two Seasons with teams in the first. Run the wizard → preview → confirm → verify new Season has the same team shape.

- [ ] **Step 5: Commit + PR.**

**Done when:** Rick can copy Spring 2026's teams into Fall 2026 in ≤3 clicks; dry-run preview shows what will happen before committing.

---

## W2.8: Promote/demote admins, remove member, leave with last-admin block

**Scope:** Admin promote/demote on both aggregates. Self-removal with last-admin check. Remove another member. Promote/demote notification side-effect.

**Depends on:** W2.3.

**Files:**
- Modify: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/members/actions.ts`
- Create: `src/components/leagues/member/promote-demote-button.tsx`
- Create: `src/components/leagues/member/remove-member-dialog.tsx`
- Create: `src/components/leagues/member/leave-aggregate-dialog.tsx`
- Create: `src/components/leagues/member/member-search-filter.tsx` (CC — OQ5)

**Steps:**

- [ ] **Step 1: Server actions** — `promoteToLeagueAdminAction`, `demoteFromLeagueAdminAction`, `leaveLeagueAction`. `removeLeagueMemberAction` already exists (W2.3). `removeOrganizationAdminAction` already exists (W2.1) and owns the full cross-League fan-out — do NOT re-implement here; the W2.1 version is authoritative.

  Each handles the `LastAdminError` return and maps it to inline copy per req §9 via the `mapMembershipError` helper (W2.3 Step 2, H10).

  **Special case — Org-admin demote (UX8, req §0):** the confirmation dialog (see Step 3 below) must list the Leagues the target will lose implicit League-Admin powers on. The dialog's pre-flight fetches that list; it does **not** duplicate the revalidation fan-out that lives inside `removeOrganizationAdminAction`.

  **Background on the fan-out.** Design §4.5a shows `removeOrganizationAdmin` with no tags — that is a gap. `removeOrganizationAdminAction` (W2.1 Step 3) fills the gap by:

  1. Fetching `league { id }` for every League under the Org (one extra query).
  2. Calling the backend mutation.
  3. On success, revalidating:
     - `user:${targetUserId}:leagues`
     - `league:${id}` **for every League under the Org**

  Tag-count is bounded by Leagues-per-Org (rarely >5, spot-verify in P0 that this is the expected scale). Integration test asserts a demoted admin's next League page view no longer shows the admin kebab menu.

- [ ] **Step 2: `PromoteDemoteButton`** — gated by `viewerIsAdmin`; not shown for placeholders.

- [ ] **Step 3: `RemoveMemberDialog`** — typed-confirm for admin removal of another member; simpler confirm for self-removal.

- [ ] **Step 4: `LeaveAggregateDialog`** — calls `leaveLeagueAction`; if `LastAdminError` returned, show: "You're the last admin. Promote another member first."

- [ ] **Step 5: `MemberSearchFilter`** — debounced input + role filter. Per OQ5, mounted when >40 members; render always for simplicity but collapse to no-op when roster is small.

- [ ] **Step 6: Integration test — UX8 Org-demote cascade.**

  Setup: Org with 2 Leagues, 2 Org admins. Demote one → confirmation lists both Leagues → proceed → verify demoted admin loses League-Admin on both.

- [ ] **Step 7: Commit + PR.**

**Done when:** admin can promote/demote/remove; self-leave blocks if last admin; Org-admin demote shows League-cascade list; search filter works on lists >40 members.

---

# Wave 3 — Group + recurring game nights

Mirror-patterns where Leagues already solved the problem. New patterns are the recurring-series + RSVP work.

## W3.1: Create/edit/archive Group

**Scope:** Group CRUD. Archive cascades to ending all active series.

**Depends on:** W2.2 (shared patterns: timezone picker, slug preview, archive dialog).

**Files:**
- Create: `src/app/[locale]/group/new/page.tsx`
- Create: `src/app/[locale]/group/[groupSlug]/settings/page.tsx`
- Create: `src/app/[locale]/group/actions.ts`
- Create: `src/components/leagues/group/create-group-form.tsx`
- Create: `src/components/leagues/group/edit-group-form.tsx`
- Create: `src/components/leagues/group/archive-group-dialog.tsx`
- Create: `src/lib/validation/group.ts`

**Steps:**

- [ ] **Step 1: Zod schema + actions** — mirrors W2.2 minus sport-locking. Visibility is hardcoded `UNLISTED` (req §2.3).

- [ ] **Step 2: ArchiveGroupDialog** — copy warns about series cascade. Typed-confirm.

- [ ] **Step 3: Group layout + pages (shell only — no tabs yet).**

  `src/app/[locale]/group/[groupSlug]/layout.tsx` fetches group, renders header + tab-bar (empty tabs until subsequent PRs).

- [ ] **Step 4: Commit + PR.**

**Done when:** any signed-in user can create a Group, edit it, archive it (with typed confirm); invite-only visibility is enforced and not surfaced as a toggle.

---

## W3.2: Group members management

**Scope:** Mirror of W2.3 minus captain field.

**Depends on:** W3.1, W2.3.

**Files:**
- Create: `src/app/[locale]/group/[groupSlug]/members/page.tsx`
- Create: `src/app/[locale]/group/[groupSlug]/members/actions.ts`

**Steps:**

- [ ] **Step 1: Reuse `MemberList`, `MemberRow`, `CreatePlaceholderDialog` from W1.2/W2.3** with `aggregateKind="GROUP"` prop. No captain chip (prop-gated).

- [ ] **Step 2: Server actions** — `addGroupMemberAction`, `removeGroupMemberAction`. Tags per design.md §4.5a.

- [ ] **Step 3-4: Implement page + integration test. Commit + PR.**

**Done when:** admin can see/manage Group members with the same shape as League members, minus captain.

---

## W3.3: Group invites

**Scope:** Mirror of W2.4 — Group invites don't create roster rows (membership alone suffices per req §2.6).

**Depends on:** W3.2, W2.4.

**Files:**
- Create: `src/app/[locale]/group/[groupSlug]/invitations/page.tsx`
- Create: `src/app/[locale]/group/[groupSlug]/invitations/actions.ts`

**Steps:**

- [ ] **Step 1: Reuse `SendInvitesPanel`, `InvitationList`, `InviteLinkList`** with `aggregateType="GROUP"`.

- [ ] **Step 2: Server actions** — same shapes, different revalidation tags.

- [ ] **Step 3: `/invite/[token]` already handles Groups** (W2.4). Only path-specific logic is the preview narrowing — OQ6 says only the inviting admin's name is visible for invite-only Groups.

- [ ] **Step 4: Integration test — invite flow on a Group.** Verify the preview hides other admins.

- [ ] **Step 5: Commit + PR.**

**Done when:** a Group admin can invite members; invitee-preview narrows admin list to inviter only for UNLISTED Groups.

---

## W3.4: Create/edit/end GameSeries + skip dates + upcoming occurrences

**Scope:** The recurring-series engine. Weekly/biweekly only. Days-of-week multi-pick.

**Depends on:** W3.1.

**Files:**
- Create: `src/app/[locale]/group/[groupSlug]/series/page.tsx`
- Create: `src/app/[locale]/group/[groupSlug]/series/new/page.tsx`
- Create: `src/app/[locale]/group/[groupSlug]/series/[seriesId]/page.tsx` → redirect to `./upcoming`
- Create: `src/app/[locale]/group/[groupSlug]/series/[seriesId]/upcoming/page.tsx`
- Create: `src/app/[locale]/group/[groupSlug]/series/[seriesId]/settings/page.tsx`
- Create: `src/app/[locale]/group/[groupSlug]/series/actions.ts`
- Create: `src/components/leagues/series/series-card.tsx`
- Create: `src/components/leagues/series/create-edit-series-form.tsx`
- Create: `src/components/leagues/series/skip-date-picker.tsx`
- Create: `src/components/leagues/series/occurrence-card.tsx`
- Create: `src/components/leagues/series/occurrence-list.tsx`
- Create: `src/components/leagues/series/end-series-dialog.tsx`
- Create: `src/lib/validation/game-series.ts`

**Steps:**

- [ ] **Step 1: GameSeries Zod schema** (design.md §5.3).

  ```ts
  export const gameSeriesCreateSchema = z.object({
    groupId: z.string(),
    name: z.string().max(100).optional(),
    recurrence: z.enum(["WEEKLY", "BIWEEKLY"]),
    daysOfWeek: z.array(z.enum(["SUN","MON","TUE","WED","THU","FRI","SAT"])).min(1),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    durationMinutes: z.number().int().min(15).max(480),
    locationName: z.string().optional(),
    maxParticipants: z.number().int().min(1).optional(),
    endKind: z.enum(["NEVER", "DATE", "COUNT"]),
    endDate: z.iso.date().optional(),
    endCount: z.number().int().min(1).max(260).optional(),
  }).superRefine((v, ctx) => {
    if (v.endKind === "DATE" && (!v.endDate || dateGreaterThanYearsFromNow(v.endDate, 5))) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "leagues.errors.seriesEndDateTooFar" });
    }
    if (v.endKind === "COUNT" && !v.endCount) {
      ctx.addIssue({ code: "custom", path: ["endCount"], message: "leagues.errors.seriesEndCountRequired" });
    }
  });
  ```

- [ ] **Step 2: Server actions** — `createGameSeriesAction`, `updateGameSeriesAction`, `addSkipDateAction`, `removeSkipDateAction`, `endGameSeriesAction`.

- [ ] **Step 3: Tests + implementations** for each component.

  - `CreateEditSeriesForm`: days-of-week as a `ToggleGroup` with text labels. Recurrence summary preview ("Every Friday at 7:00 PM") via composable i18n keys (design.md §10.4).
  - `OccurrenceCard`: renders date, time, cap, location. **W3.4 scope: read-only display + admin-only "Skip this date" affordance.** No RSVP controls, no "Log this game" button, no disabled placeholder. Non-admin members see the card as informational only until W3.5 ships. W3.5 adds the RSVP chip group; W3.7 adds the "Log this game" button. Each is a clean layered addition — no dead buttons at any point in the sequence.
  - `SkipDatePicker`: multi-date calendar; server action appends to `skipDates`.
  - `OccurrenceList`: paginated from `GameSeries.upcomingOccurrences(from, to)` — capped at 100 per backend.

- [ ] **Step 4: Series page** — header + the series card + occurrences.

- [ ] **Step 5: Integration test.**

  Create a WEEKLY series with `daysOfWeek=[FRI]`, start time 19:00, end date 12 weeks out → verify 12 occurrences render. Add a skip → verify it drops out.

- [ ] **Step 6: Commit + PR.**

**Done when:** a Group admin can create/edit/end a series, add/remove skip dates, and see occurrences rendered in the series's timezone.

---

## W3.5: RSVP per-occurrence + waitlist + guest +1

**Scope:** Member RSVP on occurrences. Waitlist auto-promote when Yes drops. Guest +1.

**Depends on:** W3.4.

**Files:**
- Create: `src/components/leagues/rsvp/rsvp-chip.tsx`
- Create: `src/components/leagues/rsvp/rsvp-chip-group.tsx` (CC — ToggleGroup wrapper)
- Create: `src/components/leagues/rsvp/guest-plus-one-input.tsx`
- Modify: `src/app/[locale]/group/[groupSlug]/series/actions.ts` — add `upsertOccurrenceRsvpAction`, `removeOccurrenceRsvpAction`.

**Steps:**

- [ ] **Step 1: `RsvpChipGroup`** — ToggleGroup over Yes/No/Maybe.

  **Not fully optimistic on Yes.** An optimistic flip to Yes that then resolves to Waitlist produces a visible Yes→Waitlist flash — a jarring false-affordance. Instead:

  - **No / Maybe**: optimistic flip is fine (terminal state from the client's perspective).
  - **Yes on an uncapped occurrence (`occurrence.maxParticipants == null`)**: optimistic flip fine.
  - **Yes on any capped occurrence (`occurrence.maxParticipants != null`)**: render an indeterminate **"submitting…"** state (spinner + dimmed label) until the server responds, then flip to the server's actual resolution (Yes or Waitlist).

  Rationale: `yesCount` read at page-render time is stale at click time. A member who sees `yesCount=3, cap=5` may find the last two slots filled between render and click. Optimistically flipping to Yes and then being demoted to Waitlist produces the same Yes→Waitlist flash we want to avoid. The only safe rule is **capped-means-submit-first** regardless of the displayed `yesCount`.

  On error, rollback to prior state + toast.

- [ ] **Step 2: Waitlist handling.**

  If server returns `CapacityFullError` or resolves the RSVP to Waitlist, chip displays "On waitlist (Yes intended)" per req §2.8. Use a secondary "intent" + "resolved" display for the single chip.

- [ ] **Step 3: `GuestPlusOneInput`** — appears when current RSVP is Yes. Free-text name. Saves via the same `upsertOccurrenceRsvpAction`.

- [ ] **Step 4: Mount on `OccurrenceCard`.**

  Chip group + optional guest input below the chip. Admin-only tracked-placeholder checkbox (OQ8) hidden unless `viewerIsAdmin`.

- [ ] **Step 5: Integration test.**

  - Set cap to 2; have 3 members Yes → third lands on waitlist.
  - First drops → second promotes → notification assertion (fake the notification event).

- [ ] **Step 6: Commit + PR.**

**Done when:** members can RSVP, waitlist behavior is visible, guest +1 works, and capped occurrences auto-promote correctly.

---

## W3.6: Standing RSVP toggle

**Scope:** "I'm in every Friday" one-click toggle per series. Overrides per-occurrence still win.

**Depends on:** W3.5.

**Files:**
- Create: `src/components/leagues/rsvp/standing-rsvp-toggle.tsx`
- Modify: `src/app/[locale]/group/[groupSlug]/series/actions.ts` — `upsertStandingRsvpAction`, `removeStandingRsvpAction`.

**Steps:**

- [ ] **Step 1: `StandingRsvpToggle`** — shadcn `Switch`. Label via composable i18n ("I'm in every {day}").

- [ ] **Step 2: Mount prominently on the series page header.**

- [ ] **Step 3: Integration test.**

  Toggle on → navigate to an un-RSVPed future occurrence → verify the chip shows Yes. Override to No on that occurrence → toggle stays on. Check the next occurrence → still Yes (standing).

- [ ] **Step 4: Commit + PR.**

**Done when:** toggling standing RSVP on/off auto-fills and un-fills forward occurrences while respecting per-occurrence overrides.

---

## W3.7: Materialize occurrence into a Game

**Scope:** "Log this game" on an occurrence materializes a real Game. Races resolve to the same Game.

**Depends on:** W3.5.

**Files:**
- Modify: `src/components/leagues/series/occurrence-card.tsx` — "Log this game" button.
- Modify: `src/app/[locale]/group/[groupSlug]/series/actions.ts` — `createGameFromSeriesOccurrenceAction`.

**Steps:**

- [ ] **Step 1: Action** — `createGameFromSeriesOccurrenceAction`.

  On race, backend returns the existing `gameId` — the action treats this as success and navigates to the Game page.

- [ ] **Step 2: Log-this-game button on `OccurrenceCard`.**

  Any member of the Group can log (design.md §13.2 and req §3.2).

- [ ] **Step 3: Integration test.**

  - Single-click → navigates to Game page with Yes-RSVPs prefilled as participants.
  - **Concurrent-actor race.** Playwright debounces rapid clicks client-side, which hides the real bug. Test the actual race at the MSW layer. Configure the `createGameFromSeriesOccurrence` handler with (a) a per-call counter, (b) an artificial delay so two calls are genuinely in-flight concurrently, and (c) a fixed `gameId` returned for both:

    ```ts
    let callCount = 0;
    server.use(
      graphql.mutation("CreateGameFromSeriesOccurrence", async () => {
        callCount += 1;
        await sleep(120);                            // force overlap
        return HttpResponse.json({ data: { createGameFromSeriesOccurrence: { game: { id: "fixed-game-id" } } } });
      }),
    );
    ```

    Drive two concurrent action calls from the client (e.g., via `Promise.all([action(), action()])` in a test-only harness, or two browser tabs in a Playwright multi-context test). Assert:
    - `callCount === 2` (both calls actually reached MSW — the race fired for real).
    - Both action calls resolve successfully.
    - Both navigate to `/game/fixed-game-id` (not two different ids).
    - No duplicate game row on the occurrence card after revalidation.

  This exercises the real bug pattern: two different tabs / two different users tapping Log-this-game at the same time. Without the delay + counter, the test passes trivially and doesn't prove anything.

- [ ] **Step 4: Commit + PR.**

**Done when:** tapping Log-this-game creates a Game and navigates to it; concurrent clicks don't duplicate.

---

# Wave 4 — Scheduling + score reporting

The most operationally critical wave.

## W4.1: Create/reschedule/cancel a single scheduled League game

**Scope:** Single-game schedule flow. Admin forms for creating a game inside a Season, rescheduling, and canceling.

**Depends on:** W2.6 (Teams exist).

**Files:**
- Create: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/season/[seasonId]/scheduled-games/new/page.tsx` (single-game form; multi-date lands in W4.2)
- Modify: `src/app/[locale]/game/actions.ts` — `rescheduleGameAction`, `cancelGameAction`.
- Create: `src/components/leagues/season/scheduled-game-form.tsx`
- Create: `src/components/leagues/season/reschedule-game-dialog.tsx`
- Create: `src/components/leagues/season/cancel-game-dialog.tsx`

**Steps:**

- [ ] **Step 1: Scheduled game Zod schema** — date/time in Season TZ, home team, away team, optional location.

- [ ] **Step 2: Server actions** — `createScheduledGameAction`, `rescheduleGameAction`, `cancelGameAction`. Each revalidates per §4.5a.

- [ ] **Step 3-4: Form + dialog implementations + tests.**

- [ ] **Step 5: Mount actions on the schedule page** (per-row kebab: reschedule / cancel).

- [ ] **Step 6: Integration test.**

  Create a Red vs Blue Saturday 10am → reschedule to 11am → cancel → verify the game is no longer on the schedule tab but remains in the DB (status = CANCELLED).

- [ ] **Step 7: Commit + PR.**

**Done when:** admin can create a single Season-scoped League game, reschedule it, or cancel it.

---

## W4.2: Multi-date schedule grid form

**Scope:** Rick's primary flow — "10 Saturdays × 3 games in one sitting." Grid where rows are dates and columns are game slots. Copy-down-column + "repeat this row weekly for N weeks."

**Depends on:** W4.1, P0 (batch mutation `createScheduledGames` confirmed).

**Files:**
- Modify: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/season/[seasonId]/scheduled-games/new/page.tsx` — swap the single form for the grid (or keep single + add grid as new route).
- Create: `src/components/leagues/season/schedule-grid-form.tsx` (CC — large)
- Modify: schedule action to accept batch input.

**Steps:**

- [ ] **Step 1: Grid Zod schema.**

  Array of `{ date, slots: [{ time, homeTeamId, awayTeamId, locationId? }] }`. Refine: at least one row; all rows structurally valid.

- [ ] **Step 2: Implement grid form** with:
  - "Add row" / "Duplicate row below" / "Repeat weekly for N weeks" controls.
  - Column-level "apply to all rows" for time / location.
  - Per-cell validation errors.

  **Copy-down affordance:** small Copy icon on each cell that fills the same column below.

- [ ] **Step 3: Batch server action.**

  Call `createScheduledGamesAction(input)` which maps to the `createScheduledGames` backend mutation (cap 50 per call). If >50 rows, split client-side into N batches, show progress bar.

  **Partial-success handling.** Backend returns a per-row error array with a `index` field **scoped to the per-batch input**. When the UI batches 150 rows into 3 calls of 50, the `index` in batch-2's response is `0..49` but maps to grid rows `50..99`. The wrapper action must translate:

  ```ts
  const BATCH_SIZE = 50;
  const gridErrorsByRow = new Map<number, BatchRowError>();

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const batchStart = batchIdx * BATCH_SIZE;
    const batchInput = rows.slice(batchStart, batchStart + BATCH_SIZE);
    const response = await authMutate({ createScheduledGames: { __args: { input: batchInput }, ... } });
    for (const err of response.errors ?? []) {
      gridErrorsByRow.set(batchStart + err.index, err);  // translate batch-local → grid-wide
    }
    onProgress?.({ done: batchStart + batchInput.length, total: rows.length });
  }
  return gridErrorsByRow;
  ```

  The grid form uses `gridErrorsByRow` to render a per-row error badge. Integration test asserts: submit 120 rows where row 73 is invalid → only row 73's cell gets an error highlight (not row 23, which would be the bug).

- [ ] **Step 4: Fallback path** if backend batch is unavailable: sequential `createScheduledGame` calls with progress. (P0 should eliminate this fallback.)

- [ ] **Step 5: Integration test.**

  Enter 10 rows × 3 slots (30 games) → verify batch submit succeeds → schedule tab shows 30 games.

- [ ] **Step 6: Commit + PR.**

**Done when:** Rick can schedule 30 games in one form submission.

---

## W4.3: Forfeit flow

**Scope:** Admin-only dialog to forfeit a game and pick the winning team. Never offered on Group games.

**Depends on:** W1.4 (game page badge).

**Files:**
- Create: `src/components/leagues/game-affordances/forfeit-game-dialog.tsx`
- Modify: `src/app/[locale]/game/actions.ts` — `forfeitGameAction`.

**Steps:**

- [ ] **Step 1: Action** — `forfeitGameAction({ gameId, winnerTeamInstanceId })`. Revalidates per §4.5a.

- [ ] **Step 2: Dialog** — winner picker (dropdown of TeamInstances on the game). Typed-confirm (low bar — just a confirm button; no typed-value required for forfeit per design — revisit if product wants stricter).

- [ ] **Step 3: Mount on the game page** — visible iff `game.league != null` (object-ref, not scalar ID) AND `viewerIsAdmin` (OR equivalent capability flag if exposed). Never mount on Group games (`game.group != null` → forfeit hidden).

  Revalidation tags for `forfeitGameAction` use **`game.season.id`** (not a scalar `seasonId`): the action selects `game.season { id }` from the mutation response and passes it to `revalidateTag(\`season:${game.season.id}:standings\`)`.

- [ ] **Step 4: Integration test.**

  Forfeit Red vs Blue in favor of Blue → game outcome becomes `FORFEITED` with Blue as winner → standings update.

- [ ] **Step 5: Commit + PR.**

**Done when:** admin can forfeit a League game; Group games never surface the control; standings reflect the forfeit immediately.

---

## W4.4: Report Result wizard — Phase A (sport-specific score form)

**Scope:** Dialog that embeds the sport-specific team-score form. Not yet wired to submit; Phase B (W4.5) adds the submit sequencing.

**Depends on:** W1.4 (game page badge + fields), P0 (atomic `reportGameResultWithScore` confirmed).

**Files:**
- Create: `src/components/leagues/report-result/report-result-wizard.tsx` (CC)
- Create: `src/components/leagues/report-result/report-result-launcher.tsx` (CC)
- Create: `src/components/leagues/report-result/sport-score-form-router.tsx` (CC — dynamic per sport)

**Steps:**

- [ ] **Step 1: Launcher component.**

  Button visible iff `game.viewerCanReportResult === true`. Opens the wizard dialog.

- [ ] **Step 2: Wizard shell.**

  shadcn `Dialog`. Two phases visually — Phase A = form, Phase B = confirm. Phase A is the focus here; Phase B placeholder says "Next →".

- [ ] **Step 3: Sport router.**

  Dynamic-imports the sport-specific score form component from `src/components/game/scoreboard/`:

  ```tsx
  const BaseballScoreForm = dynamic(() => import("@/components/game/scoreboard/baseball-score-form").then(m => m.BaseballScoreForm), { ssr: false });
  // ... etc per sport
  ```

  Wizard reads `game.sport` and mounts the matching form. Each sport form already has a submit-shape that the wizard captures via a prop-based `onChange({ scores })`.

- [ ] **Step 4: Pre-populate.**

  On wizard open, read existing team metadata via the game fragment. If `game.outcome === "SCORE_ENTERED"`, scores are already present — pre-fill the form. If `NOT_REPORTED`, leave blank.

- [ ] **Step 5: Accessibility.**

  Dialog focus trap (shadcn default). Initial focus on first empty team-score input. Phase A → B transition uses `ref.focus()` on the confirmation heading (heading has `tabindex="-1"`).

  **Suspense-during-dynamic-import edge case.** The sport-specific score form is `dynamic`-imported (design.md §14.1); while its chunk is loading, the dialog shows a Suspense fallback. Users who start tabbing during the fallback state can land focus outside the dialog if the fallback has no focusable element. Fix: the Suspense fallback inside the dialog must render one focusable placeholder (a disabled button labeled "Loading score form…") so focus trap has something to anchor to.

- [ ] **Step 6: Unit test.**

  Mount the wizard with a basketball game → basketball form shows. Soccer game → soccer form. Pre-populated values render.

  Keyboard test: open wizard → tab once while Suspense fallback is mounted (simulate slow import with an artificial delay) → assert focus stays inside the dialog (not on `document.body`, not on the page behind).

- [ ] **Step 7: Commit + PR.**

**Done when:** clicking "Report result" on an eligible League game opens the dialog, renders the correct sport's score form, and pre-fills any existing scores; no submit yet.

---

## W4.5: Report Result wizard — Phase B + atomic submit + partial-failure recovery

**Scope:** Wire the single `reportGameResultWithScore` mutation. Surface errors inline. Handle external-race and stale-write scenarios.

**Depends on:** W4.4, **W4.7** (for `useGameLiveRefresh.suspend/resume`). W4.7 is ahead of this PR in the critical path.

**Files:**
- Modify: `src/components/leagues/report-result/report-result-wizard.tsx`
- Create: `src/app/[locale]/game/report-result-actions.ts`
- Modify: `src/lib/graphql-fragments.ts` — `reportGameResultWithScoreResultFragment`.

**Steps:**

- [ ] **Step 1: Server action** — `reportGameResultWithScoreAction`.

  ```ts
  "use server";
  export async function reportGameResultWithScoreAction(input) {
    // session check, Zod (includes @oneOf exclusivity refine), then authMutate
    const result = await authMutate({
      reportGameResultWithScore: {
        __args: { input: { gameId, scores: { [sportKey]: sportPayload } } }, // @oneOf
        ...reportGameResultWithScoreResultFragment,
      },
    });
    const extracted = extractMutationResult(result.reportGameResultWithScore);
    if (!extracted.success) return extracted;
    revalidateTag(`game:${gameId}`);
    revalidateTag(`game:${gameId}:result`);
    return { success: true, data: extracted.data };
  }
  ```

  **`@oneOf` exclusivity — Zod refine.** `json-to-graphql-query` serializes object keys literally and does **not** enforce `@oneOf` exclusivity. A stale-state bug that leaves two sport keys in `scores` gets rejected server-side with a generic error. The Zod schema must enforce exactly one key:

  ```ts
  const oneSportOnly = (s: Record<string, unknown>) =>
    Object.values(s).filter((v) => v !== undefined).length === 1;

  export const reportGameResultWithScoreSchema = z.object({
    gameId: z.string(),
    scores: z.object({
      // one optional field per sport, each using its own score schema
    }).refine(oneSportOnly, { error: "leagues.errors.reportScoresOneOfViolation" }),
  });
  ```

  Unit tests: zero keys → error; two keys → error; exactly one → pass. P0 Step 7 also confirms that the backend returns a mapped union error for an `@oneOf` violation (not a 500).

- [ ] **Step 2: Error mapping.**

  Per design.md §6.4 table. Map each union member to wizard state:
  - `ScoreValidationError` → inline field errors via `form.setFieldMeta`.
  - `GameAlreadyConfirmedError` → banner + Refresh button.
  - `InsufficientRoleError` → "You're no longer the captain" + Close button.
  - `RateLimitError` → inline "Try again in {X}." Submit disabled until retry window.

- [ ] **Step 3: Phase B UI.**

  Reads computed winner from Phase A's scores. Button: "Report and notify {opposing captain name}". Cancel as secondary.

- [ ] **Step 4: External-race suppression.**

  Wizard calls `useGameLiveRefresh.suspend()` **synchronously inside the Report-result button's `onClick` handler**, before the dialog opens. Not in a `useEffect` on mount — that would leave a ~1-frame window where a debounced refresh can land during the wizard's first render and unmount it. `resume()` fires in an `onOpenChange(false)` handler (close/submit/dispose).

  At the provider level, the suspend check happens **at dispatch time** (when the notification event is observed from the bus), not at flush time (after the debounce window). A suspended listener's events go straight into its `bufferedEventRef`; the debounce queue only batches non-suspended listeners. This means a suspend() call between dispatch-N and the trailing-edge flush still buffers event N (correct behavior).

  **Hard dependency: W4.5 requires W4.7 to land first.** Earlier drafts of this plan allowed W4.5 to ship before W4.7 with a no-op `suspend/resume` and a narrowed "Done when." That's been reversed — during the interim window, an in-dialog `router.refresh()` fired by an incoming notification would unmount the wizard mid-typing and silently discard the captain's scores. That is a UX regression bad enough to block ship.

  Re-order: land W4.7 (NotificationProvider + `useGameLiveRefresh`) **before** W4.5 (wizard submit). The "Wave 4" dependency diagram and critical-path list in §PR dependency map reflect this ordering.

- [ ] **Step 5: Integration test.**

  - Happy: report → outcome flips to `REPORTED_AWAITING_CONFIRM` → wizard closes.
  - ScoreValidationError → inline field errors render.
  - GameAlreadyConfirmedError → banner shows + Refresh closes dialog.
  - RateLimitError → button disabled with countdown copy.

- [ ] **Step 6: Commit + PR.**

**Done when:** the wizard submits a score-report atomically and handles `ScoreValidationError`, `GameAlreadyConfirmedError`, `InsufficientRoleError`, and `RateLimitError` with the correct UI surface. External-race-during-typing protection is in scope here — W4.7 precedes this PR and provides the `suspend/resume` hook; wiring it into the wizard is part of this PR's work.

---

## W4.6: Confirm / Dispute dialogs + admin override

**Scope:** Confirm and Dispute buttons for the opposing captain. Admin override path. Self-confirm block.

**Depends on:** W4.5.

**Files:**
- Create: `src/components/leagues/report-result/confirm-dispute-panel.tsx` (CC)
- Create: `src/components/leagues/report-result/dispute-dialog.tsx` (CC)
- Create: `src/components/leagues/report-result/admin-override-menu.tsx` (CC)
- Create: `src/components/leagues/report-result/delete-confirmed-result-dialog.tsx` (CC)
- Modify: `src/app/[locale]/game/report-result-actions.ts` — add `confirmGameResultAction`, `disputeGameResultAction`, `deleteConfirmedResultAction`.

**Steps:**

- [ ] **Step 1: Actions.**

  `confirmGameResultAction(gameId, { onBehalfOfCaptain?: bool })` — Admins pass `onBehalfOfCaptain=true` which records audit.

  `disputeGameResultAction(gameId, note?)` — 200-char note max. Backend enforces 1 dispute per 24h per user per game.

  `deleteConfirmedResultAction(gameId)` — admin-only destructive.

- [ ] **Step 2: `ConfirmDisputePanel`.**

  Renders only when `game.viewerCanConfirmResult === true`. Two buttons: Confirm (primary) and Dispute (secondary).

  - Confirm click → confirmation dialog → calls action → optimistic badge flip to `CONFIRMED_WIN/DRAW`.
  - Dispute click → `DisputeDialog` with optional note textarea.

- [ ] **Step 3: `DisputeDialog`.**

  RateLimitError → inline "You recently disputed. Try again later."
  No optimism (terminal action per design.md §4.5b).

- [ ] **Step 4: `AdminOverrideMenu`.**

  For admins who aren't the captain. Kebab on the game page. Options: "Confirm as admin", "Dispute as admin", "Delete confirmed result". Each routes through a confirmation dialog.

- [ ] **Step 5: `DeleteConfirmedResultDialog`.**

  Typed-confirm value: `delete` (per SP-9a). Copy nudges: "Agree with both captains first, then re-enter the score." Default focus on the typed-input field per design.md §12.2.

- [ ] **Step 6: UX9 Captain-swap handling.**

  If `viewerCanConfirmResult === false` but the game is in `REPORTED_AWAITING_CONFIRM`, render: "You are no longer the captain of {team}. {NewCaptainName} will be asked to confirm." (Requires `game.viewerGameRole` + new-captain derivation.)

- [ ] **Step 7: Integration tests.**

  - Happy: reporter reports → opposing captain confirms → outcome `CONFIRMED_WIN`.
  - Dispute: opposing captain disputes → badge flips to `SCORE_ENTERED` (or back to a disputed state per backend) → reporter sees "Disputed by {name}, please re-enter".
  - Admin override: admin confirms on captain's behalf → audit field records admin.
  - Captain swap: reporter captain removed mid-flow → UI shows "no longer captain" copy.

- [ ] **Step 8: Commit + PR.**

**Done when:** the opposing captain can Confirm or Dispute, admins can override, and captain-swap mid-flow surfaces the right copy.

---

## W4.7: `useGameLiveRefresh` / `useSeasonLiveRefresh` + NotificationProvider

**Scope:** Notification-driven `router.refresh()` for open game/Season pages. Single-subscription / many-listeners pattern.

**Depends on:** W4.4 (wizard exists as a consumer of `suspend/resume`; Phase A lands in W4.4). This PR lands **before** W4.5 and W4.6 so they can wire the hook from day one — shipping W4.5 first would cause mid-typing wizard unmounts on incoming notifications.

**Files:**
- Create: `src/components/notification/notification-provider.tsx` (CC — top-level)
- Modify: `src/app/[locale]/layout.tsx` (or the nearest shell) — mount the provider.
- Modify: existing `useNotificationSubscription` to emit through the provider's bus.
- Modify: `src/components/notification/notification-bell.tsx` — becomes one listener.
- Create: `src/hooks/use-game-live-refresh.ts`
- Create: `src/hooks/use-season-live-refresh.ts`

**Steps:**

- [ ] **Step 1: `NotificationProvider` with listener bus.**

  **Mount location matters.** Mount at the highest stable point in the tree — the non-locale-bound root layout if one exists, otherwise the first layout whose identity does not change across locale / route transitions. **Do not mount inside `[locale]/layout.tsx`** unless that layout is verified to not remount on locale change (it usually does in next-intl). A remount tears down the socket and buffers + every mid-session subscription is lost.

  Signed-out users: the provider renders a bus but opens no socket (the subscribe call no-ops when `session?.user` is null). On sign-in, the provider opens the socket. On sign-out, it closes.

  ```tsx
  type Listener = { predicate: (n: NotificationEvent) => boolean; callback: (n: NotificationEvent) => void };

  export function NotificationProvider({ session, children }) {
    // Bus lives in a ref, scoped to this provider instance. On sign-out → sign-in
    // (same or different user), the effect below tears down the socket AND clears
    // the bus, so listeners registered under the previous session do not leak into
    // the next one. Components re-register via useEffect when they remount.
    const busRef = useRef(new Map<symbol, Listener>());

    useEffect(() => {
      if (!session?.user) {
        busRef.current.clear();  // signed-out: drop any lingering listeners
        return;
      }
      const unsub = subscribeToNotificationEvents((n) => {
        for (const { predicate, callback } of busRef.current.values()) {
          if (predicate(n)) callback(n);
        }
      });
      return () => {
        unsub();
        busRef.current.clear();  // teardown on user change
      };
    }, [session?.user?.id]);

    const addListener = useCallback((predicate, callback) => {
      const key = Symbol();
      busRef.current.set(key, { predicate, callback });
      return () => busRef.current.delete(key);
    }, []);

    return <Context.Provider value={{ addListener }}>{children}</Context.Provider>;
  }
  ```

  **Consequence:** consumer hooks (`useGameLiveRefresh`, `useSeasonLiveRefresh`, `NotificationBell`) must re-register via `useEffect` each time they mount. Because they all follow the standard pattern of `useEffect(() => ctx.addListener(...), [deps])`, a provider re-mount (sign-in/sign-out) naturally retriggers their effects on the next render and listeners re-attach. No manual handoff required.

- [ ] **Step 2: Convert `NotificationBell` into one listener** via `addListener(() => true, renderToast)`.

- [ ] **Step 3: `useGameLiveRefresh(gameId)`.**

  ```ts
  export function useGameLiveRefresh(gameId: string) {
    const router = useRouter();
    const { addListener } = useNotificationBus();
    const suspendedRef = useRef(false);
    const bufferedEventRef = useRef<NotificationEvent | null>(null);

    // Re-register on every gameId change. SPA navigation /game/1 → /game/2
    // keeps the same hook instance mounted; without this effect, listeners
    // from the previous gameId leak into the new page. The dep array is the
    // critical part: [gameId, addListener].
    useEffect(() => {
      const triggerTypes = new Set([
        "GAME_RESULT_REPORTED",
        "GAME_RESULT_CONFIRMED",
        "GAME_RESULT_DISPUTED",
        "GAME_FORFEITED",
        "GAME_SCHEDULED",
        "GAME_RESCHEDULED",
        "GAME_CANCELLED",
      ]);
      const predicate = (n: NotificationEvent) =>
        triggerTypes.has(n.__typename) && n.payload.game.id === gameId;

      const onEvent = (n: NotificationEvent) => {
        if (suspendedRef.current) {
          bufferedEventRef.current = n; // one-deep buffer
          return;                       // short-circuit: no debounce enqueue
        }
        debouncedRefresh();              // provider-level 300ms trailing
      };

      return addListener(predicate, onEvent);  // returns unregister fn
    }, [gameId, addListener]);

    // suspend is synchronous — callers invoke it inside an onClick handler
    // (not a useEffect) to close the race between "dialog about to open"
    // and "notification fires during first render."
    const suspend = useCallback(() => { suspendedRef.current = true; }, []);

    const resume = useCallback(() => {
      suspendedRef.current = false;
      if (bufferedEventRef.current) {
        router.refresh();
        bufferedEventRef.current = null;
      }
    }, [router]);

    return { suspend, resume, bufferedEvent: bufferedEventRef.current };
  }
  ```

  Debounce window 300ms per design.md §9.1c. **Debounce lives at the provider**, not at the listener — but the provider consults each listener's `suspendedRef` at dispatch time, before enqueueing. This is the only correct ordering; a provider-only debounce that doesn't check suspend-state at dispatch will still flush into a suspended listener.

- [ ] **Step 4: `useSeasonLiveRefresh(seasonId)`.**

  Listener predicate needs to identify "this notification's game belongs to the Season I'm looking at." Strategy depends on what P0 Step 7 finds for `NotificationGame` payload:

  - **Preferred (if backend extends `NotificationGame`):** payload includes `season: { id }` (object ref). Predicate is `n.__typename ∈ {GAME_RESULT_CONFIRMED, GAME_FORFEITED} && n.payload.game.season?.id === seasonId`. One cheap in-memory check per event.

  - **Fallback (if payload stays `{id, sportType}` only):** accept over-refresh. Predicate is `n.__typename ∈ {GAME_RESULT_CONFIRMED, GAME_FORFEITED}` — fires `router.refresh()` on **every** such event regardless of Season. Cost: a viewer on Season A's standings page gets refreshed when Season B's game is confirmed. Acceptable for v1 because (a) debounce collapses bursts, (b) standings page re-fetches are cheap, (c) most viewers care about exactly one Season at a time. Do NOT fetch-to-decide per event — that defeats the purpose.

  Decision recorded in P0 output. Hook code sketch uses whichever path P0 confirms.

- [ ] **Step 5: Wire into game page + wizard + Season standings.**

  - Game page `[id]/page.tsx` subtree mounts a client wrapper that calls `useGameLiveRefresh(id)`.
  - The wizard calls `suspend()` on open, `resume()` on close/submit.
  - Season standings page mounts `useSeasonLiveRefresh(seasonId)`.

- [ ] **Step 6: Integration test.**

  - Open game page as reporter → simulate `GAME_RESULT_CONFIRMED` via MSW websocket mock → verify page refreshes (badge flips).
  - Open wizard → simulate event → verify banner in dialog + no unmount.
  - Open Season standings → simulate burst of 5 `GAME_RESULT_CONFIRMED` → verify one refresh (debounced).

- [ ] **Step 7: Commit + PR.**

**Done when:** open game/Season pages reflect state changes pushed from the backend without manual refresh; the wizard isn't ambushed by mid-typing refreshes; notification bursts don't cause refresh storms.

---

# Wave 5 — Chat integration + calendar + polish

## W5.1: Chat tab on League and Group pages

**Scope:** Mount chat inside the League/Group chat tab. Path A (embedded) if P1 was shipped; Path B (link-out) otherwise.

**Depends on:** P1 (Path A only); W1.2 / W3.1 (tab routing).

**Files:**
- Modify: `src/app/[locale]/league/[orgSlug]/[leagueSlug]/chat/page.tsx`
- Modify: `src/app/[locale]/group/[groupSlug]/chat/page.tsx`
- Modify: `src/lib/graphql-fragments.ts` — extend `chatRoomInlineFragments` with `LeagueChatRoom` and `CasualGroupChatRoom`.

**Path A steps:**

- [ ] **Step 1: Add the new chat-room typenames** to `chatRoomInlineFragments`.

- [ ] **Step 2: Fetch the aggregate's chat room id** — `league.chatRoomId` or `group.chatRoomId` via the existing fragments.

- [ ] **Step 3: Mount `<EmbeddedConversation>`** in the chat tab page.

- [ ] **Step 4: Integration test — full chat loop** (send, receive, archived read-only).

**Path B steps:**

- [ ] **Step 1: Render a card with "Open chat" that links to `/chat?room={chatRoomId}`.**

- [ ] **Step 2: Integration test — link navigates to `/chat` and renders the correct room.**

- [ ] **Step 3: Commit + PR.**

**Done when:** members can read/send messages from the League or Group chat tab; archived aggregates show a disabled compose bar.

---

## W5.2: Archived-aggregate compose-disabled state

**Scope:** When an aggregate is archived, the chat's compose bar is disabled with explanatory copy.

**Depends on:** W5.1.

**Files:**
- Modify: `src/components/chat/embedded-conversation.tsx` — accept `disabled` + `disabledReason` props.

**Steps:**

- [ ] **Step 1: Wire `disabled={league.status === 'ARCHIVED'} disabledReason={t("leagues.chat.archivedDisabled")}`** on the embedded conversation.

- [ ] **Step 2: Integration test** — archive a League → verify the compose bar is disabled with copy.

- [ ] **Step 3: Commit + PR.**

**Done when:** archived Leagues/Groups have a disabled compose bar with plain-English copy.

---

## W5.3: Calendar subscribe modal per aggregate

**Scope:** Per-aggregate modal with prefilled URL + platform-specific copy-paste help.

**Depends on:** P0 (§13 gap: `User.icalToken` lazy-create resolver confirmed).

**Files:**
- Create: `src/components/leagues/calendar/subscribe-calendar-button.tsx`
- Create: `src/components/leagues/calendar/subscribe-calendar-modal.tsx`
- Create: `src/components/leagues/calendar/calendar-url-field.tsx`
- Modify: `src/lib/graphql-fragments.ts` — `meIcalTokenFragment`.

**Steps:**

- [ ] **Step 1: Fetch `me.icalToken`** server-side when the modal mounts (lazy-create on first read). Tag `user:${me.id}:calendar-token`.

- [ ] **Step 2: Build the subscription URL** server-side.

  **Base URL:** `NEXT_PUBLIC_API_SERVER_URL` is already the backend **origin** (verified at `env.example:14` — e.g., `http://localhost:8080`). The GraphQL `/graphql` path is appended at call-time in `graphql-request.ts`. Reuse `NEXT_PUBLIC_API_SERVER_URL` directly for iCal URLs — no new env var.

  URL shape depends on P0 Step 7's resolution of the backend requirements.md vs design.md conflict. Current candidates:

  - Design says: `${API_SERVER_URL}/ical/league/${orgSlug}/${leagueSlug}.ics?token=${icalToken}` and `${API_SERVER_URL}/ical/group/${groupSlug}.ics?token=${icalToken}`.
  - Requirements says: single-slug form for Leagues.

  P0 picks one; this step encodes the winner. Do not ship URL construction before P0 is resolved.

- [ ] **Step 3: `CalendarUrlField`** — read-only textarea with a Copy button; `navigator.clipboard.writeText`. No masking.

- [ ] **Step 4: Platform-help tabs** — shadcn `Tabs` (Google / Outlook / Apple). Dynamic-imported (design.md §14.1).

- [ ] **Step 5: Mount `SubscribeCalendarButton`** on the League and Group pages.

- [ ] **Step 6: Hide the button for unauthenticated viewers.** Show disabled tooltip for signed-in non-members ("Join this League to subscribe").

- [ ] **Step 7: Integration test.**

  - Signed-in member → modal shows URL with correct shape.
  - Click Copy → `navigator.clipboard.writeText` called.

- [ ] **Step 8: Commit + PR.**

**Done when:** any member can grab a subscription URL for their League or Group with one click.

---

## W5.4: Settings → Calendar Sync + Rotate Token dialog

**Scope:** `/settings/calendar` page lists every subscribed aggregate and offers Rotate with enumerated consequences.

**Depends on:** W5.3.

**Files:**
- Create: `src/app/[locale]/settings/calendar/page.tsx`
- Create: `src/app/[locale]/settings/calendar/actions.ts`
- Create: `src/components/leagues/calendar/calendar-token-panel.tsx`
- Create: `src/components/leagues/calendar/rotate-token-button.tsx`
- Create: `src/components/leagues/calendar/rotate-token-dialog.tsx`

**Steps:**

- [ ] **Step 1: Page fetches `myLeagues` + `myGroups` + `me.icalToken`** in parallel.

- [ ] **Step 2: `CalendarTokenPanel`** — masked token preview, per-aggregate row with name + URL + per-row Copy.

- [ ] **Step 3: `RotateTokenDialog`** — enumerates affected aggregates by name. Typed-confirm "rotate". Default focus on the text input.

- [ ] **Step 4: `rotateIcalTokenAction`** — revalidates `user:${id}:calendar-token`.

- [ ] **Step 5: Integration test.**

  Join 5 aggregates → visit `/settings/calendar` → verify all 5 listed → click Rotate → verify dialog enumerates all 5 names → type "rotate" → confirm → URL token changes.

- [ ] **Step 6: Commit + PR.**

**Done when:** users can see every subscription URL, rotate with full awareness of consequences, and typed-confirm reduces accidental rotation.

---

## W5.5: User profile — LeaguesAndGroups section

**Scope:** New section on `/user/[username]` listing the user's Leagues and Groups, privacy-gated.

**Depends on:** W1.2, W3.1.

**Files:**
- Create: `src/components/leagues/shared/leagues-and-groups-section.tsx`
- Modify: the user profile page to render the section.

**Steps:**

- [ ] **Step 1: Fetch `user.leagues` + `user.groups`** per the profile privacy rules.

  **Privacy contract must exist server-side.** The viewer-scoped resolvers `User.leagues(viewer)` and `User.groups(viewer)` must filter results to what `viewer` is allowed to see:
  - Public Leagues → visible to everyone.
  - UNLISTED Leagues → only visible to members.
  - Groups (always UNLISTED in v1) → only visible to members.

  P0 must confirm these filters exist on the backend. If they don't, this PR is blocked — the frontend cannot filter after-the-fact without leaking aggregate existence via response shape.

- [ ] **Step 2: Render two lists** with aggregate cards linking to `/league/...` or `/group/...`.

- [ ] **Step 3: Integration test.**

- [ ] **Step 4: Commit + PR.**

**Done when:** a user's profile shows their leagues/groups per visibility rules.

---

## W5.6: Discover page — Organizations tab

**Scope:** Add Organizations as a top-level Discover tab (OQ3).

**Depends on:** W1.1.

**Files:**
- Modify: `src/app/[locale]/search/page.tsx` (or the Discover equivalent) — add `Organizations` tab.
- Create: `src/components/leagues/shared/organizations-tab.tsx`
- Create: `src/components/leagues/shared/org-card.tsx`

**Steps:**

- [ ] **Step 1: Fetch `organizations(filter)`** with pagination.

- [ ] **Step 2: Render `OrgCard` list with nested League chips (up to 3 per org; "+N more" if >3).**

- [ ] **Step 3: Invite-only Groups are never listed — enforced by filter (only Leagues and Orgs surface).**

- [ ] **Step 4: Integration test.**

- [ ] **Step 5: Commit + PR.**

**Done when:** Discover has an Organizations tab with paginated Orgs + nested Leagues; Groups never appear.

---

# Wave 6 — Notifications + final polish

## W6.1: 17 new notification inline fragments

**Scope:** Add fragments + copy for the 17 notification types in req §2.14.

**Depends on:** W4.7 (NotificationProvider exists).

**Files:**
- Modify: `src/lib/graphql-fragments.ts` — extend `notificationInlineFragments`.
- Modify: `src/components/notification/notification-bell.tsx` — add copy mapping for each typename.
- Modify: `messages/en.json` — fill `leagues.notifications.*` keys.

**Steps:**

- [ ] **Step 1: Add one `__on` entry per notification typename** with the payload shape per backend.

- [ ] **Step 2: Add one i18n key per typename** mapped to user-facing copy.

- [ ] **Step 3: Add copy mapping** in the notification renderer.

- [ ] **Step 4: Unit test each typename renders correctly** with a mock event.

- [ ] **Step 5: Empty-key audit.**

  Walk `messages/en.json` for every key under `leagues.*`. Assert no value is `""`, `"TODO"`, or starts with `"[TODO]"`. Write a simple Vitest that reads the JSON and fails on empty/TODO values. P2 scaffolded the tree with empty values — this step is the ship gate.

  Content-design blockers listed in Appendix C must all be cleared before this step can pass. If any remain unresolved, W6.1 blocks on content-design, not on engineering.

- [ ] **Step 6: Commit + PR.**

**Done when:** all 17 notification types render with correct copy **and** no i18n key under `leagues.*` is empty or `"TODO"`.

---

## W6.2: `useSeasonLiveRefresh` hook wired to standings

**Scope:** Already shipped in W4.7. This PR validates Season standings live-updates in a dedicated integration test + ensures `useSeasonLiveRefresh` is mounted on the standings page.

**Depends on:** W4.7.

**Steps:**

- [ ] **Step 1: Audit — verify standings page mounts the hook.**

- [ ] **Step 2: Integration test** — simulate a `GAME_RESULT_CONFIRMED` event while a viewer is on the standings page → verify row updates without manual refresh.

- [ ] **Step 3: Commit + PR.**

**Done when:** standings visibly update in a second browser tab when a game result is confirmed in another tab.

---

## W6.3: Report-an-issue dialog on the Game page

**Scope:** New `ReportAnIssueDialog` on the game page. Uses existing `reportGameIssue` mutation.

**Depends on:** W1.4.

**Files:**
- Create: `src/components/leagues/game-affordances/report-an-issue-dialog.tsx`
- Modify: `src/app/[locale]/game/actions.ts` — `reportGameIssueAction` if not already present.

**Steps:**

- [ ] **Step 1: Dialog** — concernType select + note textarea. Rate-limit handling (3/24h/user per design.md §11.5).

- [ ] **Step 2: Mount on the game page** for affected users (participant or member of owning aggregate).

- [ ] **Step 3: Integration test.**

- [ ] **Step 4: Commit + PR.**

**Done when:** affected users can report an issue on a game and see rate-limit copy if throttled.

---

## W6.4: Empty-state + loading-state audit across all routes

**Scope:** Systematic audit pass across every new route. Add any missed empty states or loading skeletons.

**Depends on:** Everything else.

**Steps:**

- [ ] **Step 1: Walk every route added in W1-W5.**

  For each, confirm:
  - `loading.tsx` renders a skeleton.
  - Empty data path renders a designed empty state (not a bare "no rows").
  - Error state renders a `error.tsx` boundary.

  Use the list in requirements.md §9 "Empty states worth designing for explicitly" as a checklist.

- [ ] **Step 2: Fill gaps.**

  Add the missing empty states. Each is one commit.

- [ ] **Step 3: Manual QA pass in dev server** — click through every route.

- [ ] **Step 4: Commit + PR.**

**Done when:** no empty data path renders blank; all routes have skeletons and error boundaries.

---

## W6.5: Skills audit — `/web-design-guidelines` + `/vercel-react-best-practices`

**Scope:** Full sweep against both review skills before ship.

**Depends on:** Everything else.

**Steps:**

- [ ] **Step 1: Invoke `/web-design-guidelines`** and walk through every new UI surface.

  Checklist per surface:
  - Heading hierarchy (no skipped levels).
  - Every interactive element keyboard-reachable.
  - `prefers-reduced-motion` respected.
  - Touch targets ≥ 44×44 (spot check on RSVP chips, member action buttons, schedule grid cells).
  - Status / role / color contrast not color-only.

- [ ] **Step 2: Invoke `/vercel-react-best-practices`.**

  Checklist:
  - Every server action does session check + Zod re-validation.
  - No class instances / Dates / functions across SC→CC boundary.
  - Parallel data fetching where applicable.
  - Stable callbacks on deep subtree props.
  - Bundle split points applied narrowly (no cargo-cult `dynamic`).

- [ ] **Step 3: Fix issues inline, one commit per fix.**

- [ ] **Step 4: Final commits + PR.**

**Done when:** both skill audits pass with no outstanding issues; the feature is ready to ship.

---

# Appendix A — File Manifest

Every file introduced by this plan, grouped by directory. Reference for a reviewer catching up on the feature.

### `src/app/[locale]/org/`
- `[orgSlug]/{page,loading,error,not-found}.tsx`
- `[orgSlug]/settings/page.tsx`
- `[orgSlug]/admins/page.tsx`
- `new/page.tsx`
- `actions.ts`

### `src/app/[locale]/league/`
- `[orgSlug]/[leagueSlug]/{layout,page,loading,error,not-found}.tsx`
- `[orgSlug]/[leagueSlug]/{overview,members,teams,chat,schedule,standings,invitations,settings}/page.tsx`
- `[orgSlug]/[leagueSlug]/season/[seasonId]/{layout,page}.tsx`
- `[orgSlug]/[leagueSlug]/season/[seasonId]/{standings,schedule,history,teams}/page.tsx`
- `[orgSlug]/[leagueSlug]/season/[seasonId]/teams/new/page.tsx`
- `[orgSlug]/[leagueSlug]/season/[seasonId]/teams/[teamId]/edit/page.tsx`
- `[orgSlug]/[leagueSlug]/season/[seasonId]/copy-teams/page.tsx`
- `[orgSlug]/[leagueSlug]/season/[seasonId]/scheduled-games/new/page.tsx`
- `new/page.tsx`
- `actions.ts`, `invitations/actions.ts`, `season/actions.ts`, `teams/actions.ts`, `scheduled-games/actions.ts`

### `src/app/[locale]/group/`
- `[groupSlug]/{layout,page,loading,error,not-found}.tsx`
- `[groupSlug]/{overview,members,chat,series,settings,invitations}/page.tsx`
- `[groupSlug]/series/[seriesId]/{page,upcoming,settings}/page.tsx`
- `[groupSlug]/series/new/page.tsx`
- `new/page.tsx`
- `actions.ts`, `members/actions.ts`, `series/actions.ts`, `invitations/actions.ts`

### `src/app/[locale]/invite/`
- `[token]/{page,not-found}.tsx`
- `actions.ts`

### `src/app/[locale]/settings/calendar/`
- `page.tsx`
- `actions.ts`

### `src/app/[locale]/game/`
- Modifications to `page.tsx` and `actions.ts` for breadcrumbs, forfeit, report-result actions, report-an-issue.

### `src/components/leagues/`
- `organization/{org-header,org-admin-list,leagues-under-org,league-card,create-org-form,edit-org-form,org-admins-panel}.tsx`
- `league/{league-header,league-tab-bar,archive-banner,create-league-form,edit-league-form,archive-league-dialog,league-admin-menu}.tsx`
- `season/{season-header,season-tab-bar,standings-table,schedule-grid,history-list,create-season-dialog,edit-season-dialog,delete-season-dialog,mark-season-complete-button,scheduled-game-form,reschedule-game-dialog,cancel-game-dialog,schedule-grid-form,copy-teams-wizard,seasons-list}.tsx`
- `team/{team-card,team-detail-drawer,create-edit-team-form,captain-picker,player-picker,teams-preview}.tsx`
- `member/{member-list,member-row,placeholder-badge,member-search-filter,promote-demote-button,remove-member-dialog,leave-aggregate-dialog,create-placeholder-dialog,privacy-warning-banner}.tsx`
- `invitation/{send-invites-panel,invitee-search-field,email-invite-textarea,create-link-form,invitation-list,invite-link-list,invite-preview-card,accept-button,decline-button}.tsx`
- `group/{group-header,create-group-form,edit-group-form,archive-group-dialog,group-tab-bar,group-archive-banner,next-games-panel,series-list-panel,log-a-game-cta}.tsx`
- `series/{series-header,series-card,create-edit-series-form,skip-date-picker,occurrence-card,occurrence-list,end-series-dialog}.tsx`
- `rsvp/{rsvp-chip,rsvp-chip-group,guest-plus-one-input,standing-rsvp-toggle}.tsx`
- `report-result/{report-result-launcher,report-result-wizard,sport-score-form-router,confirm-dispute-panel,dispute-dialog,admin-override-menu,delete-confirmed-result-dialog}.tsx`
- `game-affordances/{league-season-breadcrumb,group-breadcrumb,game-result-badge,forfeit-game-dialog,report-an-issue-dialog}.tsx`
- `calendar/{subscribe-calendar-button,subscribe-calendar-modal,calendar-url-field,calendar-token-panel,rotate-token-button,rotate-token-dialog}.tsx`
- `shared/{leagues-and-groups-section,organizations-tab,org-card,timezone-picker,slug-preview,visibility-pill,game-row}.tsx`

### `src/lib/`
- `data/league.ts` — `fetchLeagueForViewer`.
- `action-result.ts` (if needed — SP-2).
- `validation/{organization,league,season,team,group,game-series,invitation}.ts`
- `types/{organization,league,season,team,group,game-series,invitation,rsvp}.ts`
- Extensions to `graphql-fragments.ts`, `graphql-request.ts`, `graphql-result.ts`.

### `src/hooks/`
- `use-game-live-refresh.ts`
- `use-season-live-refresh.ts`

### `src/components/notification/`
- `notification-provider.tsx`

### `src/components/chat/`
- `embedded-conversation.tsx` (P1 — Path A only).

### `messages/`
- `en.json` — fully filled-in `leagues.*` keys.

### `tests/`
- `tests/fixtures/graphql-handlers.ts` extensions per aggregate.
- `tests/pages/` new spec files per route.

---

# Appendix B — Conventions + validation checklist

### Conventions clarified

- **Typography wrapping scope.** SP-8 says "every text node uses `<Typography>`." That means visible text nodes rendered as children. It does **not** mean `aria-label`, `alt`, `title`, or other string attributes passed to DOM elements — those are plain strings.
- **Validation duplication.** When client and server both validate the same invariant (e.g., captain must be in roster — W2.6), the **server's error copy wins** for the rendered message. Client-side Zod's message serves as a pre-flight UX hint; on server rejection, replace with the mapped server-side key.
- **Barrel-file ban.** Project rule from CLAUDE.md — no `index.ts` re-exports. This plan creates multiple new folders (`src/lib/types/`, `src/lib/validation/`, `src/lib/errors/`, `src/hooks/`, `src/components/leagues/*`) that are tempting candidates for barrels. Every import must be direct: `import { ... } from "@/lib/validation/league"`, not `from "@/lib/validation"`.
- **W6.5 exit criteria.** The audit-pass PR is not time-boxed. It exits when every finding from `/web-design-guidelines` and `/vercel-react-best-practices` is either (a) fixed with a commit, or (b) documented as a deliberate v1 cut with a follow-up ticket number. A running checklist lives in `.claudedoc/0097-leagues/w6-5-audit.md` and must be committed alongside the PR.

### Validation checklist before any PR is opened

Every PR in this plan must satisfy:

- [ ] `npm run lint` passes.
- [ ] `npm run build` passes (type check).
- [ ] `npm test` passes (no new failures).
- [ ] `npx playwright test --project=chromium tests/<spec>.spec.ts 2>&1 | tee /tmp/pw.txt` passes for each new spec.
- [ ] Every user-facing string has an i18n key.
- [ ] Every text node uses `<Typography>`.
- [ ] Every server action does session-check + Zod re-validation.
- [ ] Every SC fetch is tagged per §4.5a.
- [ ] Every mutation action calls `revalidateTag` per §4.5a.
- [ ] No barrel files.
- [ ] Imports from `@/i18n/navigation` for `Link`, `redirect`, `useRouter`, `usePathname`, `getPathname`.
- [ ] No Dates, class instances, or functions crossed the SC→CC boundary.
- [ ] Accessibility: heading hierarchy + keyboard paths + `prefers-reduced-motion` + 44×44 targets.
- [ ] Destructive dialogs focus Cancel by default; typed-confirm for Archive / Rotate / Delete.
- [ ] `/vercel-react-best-practices` invoked before writing code.
- [ ] `/web-design-guidelines` invoked before writing UI.

---

# Appendix C — Single open-issues tracker

All open questions, content-design blockers, and backend asks live here. Previous versions split these across three appendices; consolidated for a single source of truth.

Columns: **ID** = unique identifier. **Kind** = `ContentCopy | BackendAsk | ProductQ | FrontendRisk`. **Owner** = who unblocks. **Gates** = which waves / PRs are blocked until resolved.

| ID | Kind | Issue | Owner | Gates |
|---|---|---|---|---|
| O1 | ContentCopy | `leagues.placeholder.privacyWarning` copy (OQ7, req §2.6) | Content design | W2.3 ships with placeholder; W6.1 gate |
| O2 | ContentCopy | `leagues.report.captainNoLongerCaptain` copy (UX9) | Content design | W4.6; also admin-override variant — separate key? |
| O3 | ContentCopy | `leagues.calendar.rotateWarningBody` copy (UX4) | Content design | W5.4 |
| O4 | ContentCopy | `leagues.league.archive.warningBody`, `leagues.group.archive.warningBody` | Content design | W2.2, W3.1 |
| O5 | ContentCopy | Email-invite subject + body (req §8; mirrored to backend Thymeleaf per design §10.7) | Content design + backend | W2.3 |
| O6 | ContentCopy | `leagues.notifications.*` — all 17 entries | Content design | W6.1 gate |
| O7 | BackendAsk | `Game.winner: TeamInstance?` — recommended ask (design §6.2). Fallback: `deriveWinner()` helper (W1.4 Step 3a). | Backend | W1.4 (has fallback) |
| O8 | BackendAsk | `Game.viewerIsTeamCaptain: Boolean!` OR `CAPTAIN` in `GameRole` enum | Backend — verify in P0 | W4.6 UX9 |
| O9 | BackendAsk | Reverse-cursor pagination on `ScrollSubrange` — runtime verify in P0 | Backend | W1.3 schedule lists |
| O10 | BackendAsk | `lastEditedBy` / `lastEditedAt` on versioned entities — deferred to v1.1 | Backend | v1.1 (accepted cut) |
| O11 | BackendAsk | Atomic `reportGameResultWithScore` — confirmed shipped | Backend | W4.5 (unblocked) |
| O12 | BackendAsk | `NotificationGame` payload extension with aggregate refs (`season.id`, `league.id`, `group.id`) | Backend — verify in P0 | W4.7, W6.2 (has fallback) |
| O13 | BackendAsk | `InvitePreview.status` enum values + `redeemedByViewer` scalar | Backend — verify in P0 | W2.4 |
| O14 | BackendAsk | iCal URL shape — requirements.md vs design.md conflict | Backend | W5.3 |
| O15 | BackendAsk | `@oneOf` violation returns a mapped union-member error, not 500 | Backend — verify in P0 | W4.5 |
| O16 | BackendAsk | `copyTeamsFromPreviousSeason(dryRun)` + `CopyTeamsFromPreviousSeasonResult` union members | Backend — verify in P0 | W2.7 |
| O17 | BackendAsk | `User.leagues(viewer)` / `User.groups(viewer)` enforces visibility server-side | Backend — verify in P0 | W5.5 |
| O18 | BackendAsk | Rate-limit on `resolveInvite(token)` (anti-enumeration) | Backend | W2.4 (risk acceptance in plan) |
| O19 | BackendAsk | `organizations(filter)` enforces invite-only-Group hiding server-side | Backend — verify in P0 | W5.6 |
| O20 | ProductQ | Notification channel matrix (OQ4, req §6) — push vs email vs in-app vs silent per type | Product | W6.1 (copy + wiring depends) |
| O21 | ProductQ | Sport without a score form: render generic panel or gate `viewerCanReportResult` backend-side? | Product + backend | W4.4 |
| O22 | ProductQ | Captain-swap draft loss — accept "typed input lost" or scope local-storage draft? | Product | W4.5 (current: accept) |
| O23 | ProductQ | Season-standings trickle-refresh (30 events/hour → 30 refreshes) — accept or add coalescing? | Product | W6.2 (current: accept) |
| O24 | ProductQ | Progress indication threshold for full-Season batch scheduling | Product | W4.2 (current: show progress when >1 batch) |
| O25 | FrontendRisk | Cross-device session cache invalidation (revalidateTag on device A doesn't reach device B) | Accepted for v1 | — |
| O26 | FrontendRisk | SP-5 `unstable_cache` behavior requires Playwright-level test (not pure Vitest) to verify | Implementation | P0 Step 6 |

---

---

---

**End of plan.**
