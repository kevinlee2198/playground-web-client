# Leagues — Frontend Technical Design

**Date:** 2026-04-17
**Status:** Draft
**Requirements source of truth:** `/home/kevinlee/workspace/playground/playground-web-client/.claudedoc/0097-leagues/requirements.md`
**Backend contract:** `/home/kevinlee/workspace/playground/playground-backend/.claudedoc/0102-leagues/design.md` + requirements v4
**Conventions:** `/home/kevinlee/workspace/playground/playground-web-client/CLAUDE.md`

Cross-references follow the form `req §N.N` (frontend requirements) and `backend §N.N` (backend design). This doc decides how the feature is built; it does not re-describe what it does.

---

## 1. Architecture Overview

### 1.1 Boundaries

- **Server Components** own all data fetching, auth resolution, and the decision of which public / member / admin surfaces to mount. They are the default.
- **Client Components** are leaves reserved for interactive surfaces: forms (TanStack Form), the standings table's keyboard interactions, RSVP toggles, the score-report wizard, tab switchers that need state, chat (reuses existing client layout), dialogs/modals, calendar-subscribe modal, mutation-owned lists that update optimistically.
- The **server component boundary is the authorization boundary** (req §0 + UX13). A member-only page refuses to render the member tree if the viewer isn't a member. Client gates are UX hints, not security.

### 1.2 Feature module layout

New directories added under established conventions. No barrel files (per CLAUDE.md).

```
src/app/[locale]/
  org/[orgSlug]/                         # public Org page + admin surfaces
  league/[orgSlug]/[leagueSlug]/         # League page (tabbed)
    season/[seasonId]/                   # Season page (tabs: History / Schedule / Standings)
    members/                             # Members management
    invitations/                         # Invitation tracking
    settings/                            # Admin-only edit
  group/[groupSlug]/                     # Group page (tabbed)
    series/[seriesId]/                   # Game series page
    members/
    invitations/
    settings/
  invite/[token]/                        # Token-gated accept flow (signed-in or out)
  settings/calendar/                     # Calendar sync surface (§9 + UX4)

src/components/leagues/
  organization/                          # Org header, admin list, league-under-org list
  league/                                # League header, tabs, archive dialog
  season/                                # Season header, status toggle, standings table, schedule grid
  team/                                  # Team card, create/edit form, copy-teams wizard
  member/                                # Member list, member row, placeholder badge, privacy warning
  invitation/                            # Send invites form, invite list, resend/revoke row, link creator
  group/                                 # Group header, tabs
  series/                                # Series card, create/edit form, occurrence card, skip-date picker
  rsvp/                                  # RSVP chips, standing-RSVP toggle
  report-result/                         # The UX1 wizard (§6)
  game-affordances/                      # Role-gated buttons that mount on the existing game page
  calendar/                              # Subscribe modal, rotate-token dialog
  shared/                                # slug preview, timezone picker, visibility pill
```

Split by aggregate keeps the casual/organized copy-discipline (req §8) visible at the folder level — a component named `league/season-header.tsx` will never accidentally borrow Group copy.

### 1.3 Data flow

```
[Server Component page]
   ↓ authQuery / query  (fetch + viewer-scoped flags)
   ↓ serializable data
[Client leaf component]
   ↓ calls server action from actions.ts
   ↓ authMutate
[Server action] → revalidatePath / revalidateTag → optimistic UI reconciliation
```

- One `actions.ts` per aggregate folder (`league/actions.ts`, `group/actions.ts`, `series/actions.ts`, `report-result/actions.ts`, `invitation/actions.ts`, `calendar/actions.ts`). Match existing pattern (`src/app/[locale]/game/actions.ts`).
- **Never** pass class instances, Dates, functions, or `Symbol` across the server→client boundary. Timestamps are strings; dates are `YYYY-MM-DD`; money/enums are plain strings. Per CLAUDE.md + Vercel React best-practices.
- The Relay-style `Connection { edges: [{ cursor, node }], pageInfo: { hasNextPage, endCursor } }` shape already supported in `src/lib/graphql-connection.ts` is reused verbatim.
- For paginated lists in the middle of a page (members, games, invitations), a Server-Component-renders-page-one + Client-Component-appends-pages pattern mirrors existing `game-media` pagination: SC fetches the first window, CC loads more via action.

### 1.4 Backend contract assumptions

Confirmed from backend `§4.1` queries / `§4.2–4.13` mutations + `§6.2` type definitions:

- Connections carry `first`/`after` for DESC-default lists and `last`/`before` for ASC-default lists (e.g., upcoming games). **Flag:** double-check the schema matches this — it is backwards from typical Relay, and is a deliberate choice called out in backend design §6.2.
- `League.viewerIsAdmin`, `League.viewerMembership`, `Game.viewerCanReportResult`, `Game.viewerCanConfirmResult`, `Game.viewerGameRole` are the **canonical** per-viewer capability signals (backend §6.5). The frontend must branch on these, not on id presence (req §UX3).
- `Game.result: GameResult` is null for Group games and unreported League games. `GameResult.confirmedAt IS NOT NULL` ⇒ final (counts in standings). `GameResult` with `forfeitWinnerTeamInstanceId` set ⇒ forfeit.
- Union result types land via `__typename` + `extractMutationResult()` — pattern already in `src/lib/graphql-result.ts`.

---

## 2. Routing & Page Layout

All routes under `src/app/[locale]/`. Each page-level folder may have `loading.tsx`, `error.tsx`, `not-found.tsx` as needed; client interactivity pushed into leaf components. Every route below is a Server Component unless marked `(client)`.

| Route | Purpose | Req ref | SC/CC | Loading | Error |
|---|---|---|---|---|---|
| `/org/[orgSlug]` | Public Organization page | §5 Organization | SC | yes | yes |
| `/org/[orgSlug]/admins` | Org admins management | §5 | SC shell + CC list | yes | yes |
| `/org/[orgSlug]/settings` | Edit Org / add League | §5 | SC shell + CC forms | yes | yes |
| `/org/new` | Create Organization form | §5 | CC form wrapped in SC | yes | — |
| `/league/[orgSlug]/[leagueSlug]` | League default (redirects to `/overview`) | §5 League | SC | yes | yes |
| `/league/[orgSlug]/[leagueSlug]/overview` | Seasons list + current-season preview | §5 | SC | yes | yes |
| `/league/.../members` | Members management | §5 | SC shell + CC list | yes | yes |
| `/league/.../teams` | Current Season teams preview | §5 | SC | yes | yes |
| `/league/.../chat` | Chat tab (embedded or link-out per §7) | §5 | SC + CC leaf | yes | yes |
| `/league/.../schedule` | Current Season schedule | §5 | SC | yes | yes |
| `/league/.../standings` | Current Season standings | §5 | SC | yes | yes |
| `/league/.../invitations` | Invite tracking (admin-gated — see §13.2) | §5 | SC shell + CC table | yes | yes |
| `/league/.../settings` | Edit League / archive (admin-gated) | §5 | CC form | — | — |
| `/league/.../season/[seasonId]` | Season default (redirects to `/standings`) | §5 Season | SC | yes | yes |
| `/league/.../season/[seasonId]/standings` | Season standings | §5 | SC | yes | yes |
| `/league/.../season/[seasonId]/schedule` | Season upcoming schedule | §5 | SC | yes | yes |
| `/league/.../season/[seasonId]/history` | Past games, reverse-chronological | §5 | SC | yes | yes |
| `/league/.../season/[seasonId]/teams` | Teams inside Season | §5 Teams | SC | yes | yes |
| `/league/.../season/[seasonId]/teams/new` | Create team | §5 | CC form | — | — |
| `/league/.../season/[seasonId]/copy-teams` | Copy-teams wizard | §4.3 req, §5 | CC wizard | — | — |
| `/league/.../season/[seasonId]/scheduled-games/new` | Multi-date schedule form (§5.1 W4.2) | §5 | CC form | — | — |
| `/league/new` | Create League (picks Org) | §5 | CC form | — | — |
| `/group/[groupSlug]` | Group default (redirects to `/overview`) | §5 Group | SC | yes | yes |
| `/group/[groupSlug]/overview` | Next games + quick-log CTA | §5 | SC | yes | yes |
| `/group/[groupSlug]/members` | Members management (no captain field) | §5 | SC shell + CC list | yes | yes |
| `/group/[groupSlug]/chat` | Chat tab | §5 | SC + CC leaf | yes | yes |
| `/group/[groupSlug]/series` | Series list | §5 | SC | yes | yes |
| `/group/[groupSlug]/series/[seriesId]` | Series detail + occurrences | §5 | SC + CC cards | yes | yes |
| `/group/[groupSlug]/series/[seriesId]/upcoming` | Upcoming occurrences | §5 | SC | yes | yes |
| `/group/[groupSlug]/series/[seriesId]/settings` | Series settings / end | §5 | SC shell + CC form | yes | yes |
| `/group/[groupSlug]/series/new` | Create series form | §5 | CC form | — | — |
| `/group/[groupSlug]/invitations` | Invite tracking (admin-gated) | §5 | SC shell + CC | yes | yes |
| `/group/[groupSlug]/settings` | Edit Group / archive (admin-gated) | §5 | CC form | — | — |
| `/group/new` | Create Group form | §5 | CC form | — | — |
| `/invite/[token]` | Token-gated invite preview | §2.9 | SC (auth-optional) + CC CTAs | yes | yes |
| `/settings/calendar` | Calendar sync + rotate | §2.13, UX4 | SC shell + CC actions | yes | yes |
| `/game/[id]` *(existing)* | New leaves: report-result wizard, forfeit, breadcrumb | §5, UX1 | existing SC + new CC leaves | existing | existing |
| `/discover` *(existing, may need new tab)* | Organizations + public Leagues | §5, OQ3 | existing | existing | existing |

**`league` route is nested under the Org slug** (`/league/[orgSlug]/[leagueSlug]`) rather than a flat slug because Leagues are unique within an Org, not globally (backend §2.4). This matches `LeagueRepository.findBySlugParseFormat("<orgSlug>/<leagueSlug>")`.

**`group` is a top-level flat slug** (`/group/[groupSlug]`) because Groups have no parent Org and `casual_group.slug` is globally unique (backend §2.9).

### 2.1 loading.tsx pattern

Each page's `loading.tsx` renders a skeleton matching the primary hero + first list. Reuse the `Skeleton` primitive. Skeletons live as colocated files (e.g., `league/[orgSlug]/[leagueSlug]/loading.tsx`).

### 2.2 error.tsx pattern

Each aggregate root gets an `error.tsx` (required Client Component, per CLAUDE.md file conventions). Render a neutral fallback and a retry button. Do not render admin affordances inside the error boundary (the error boundary does not know the viewer's role).

### 2.3 not-found.tsx pattern

`/league/.../not-found.tsx` distinguishes "League doesn't exist" from "you can't see this invite-only Group" — the backend returns `null` in both cases, so for Groups we render a generic "not found" to avoid leaking existence (req §2.3).

### 2.4 Metadata

Every page-level Server Component exports `generateMetadata`. Uses `cache()` (from `react`) when the metadata query overlaps the main-content query — see `user/[username]/page.tsx` for the pattern. League / Group names drive the title; archived state is reflected ("… (Archived)").

---

## 3. Component Breakdown

Component-per-row per page. Props shapes described in prose; concrete types in §4.

### 3.1 Organization page (`/org/[orgSlug]`)

| Component | SC/CC | Responsibility |
|---|---|---|
| `OrgHeader` | SC | Name, logo, description, admin-count badge. Admin dropdown (edit / manage admins) gated by `viewerIsAdmin`. |
| `OrgAdminList` | SC | Avatar row of admins; overflow → dialog (CC). |
| `LeaguesUnderOrg` | SC | Paginated list of Leagues with status/visibility chip. Public viewer only sees public. |
| `LeagueCard` | SC | Name, sport, current-season badge, member count. |
| `CreateLeagueButton` | CC | Visible to Org admins only. Opens `/league/new?orgId=...`. |

### 3.2 League page (`/league/[orgSlug]/[leagueSlug]`)

| Component | SC/CC | Responsibility |
|---|---|---|
| `LeagueHeader` | SC | Name, logo, sport pill, visibility pill, timezone, archive-banner (if archived). |
| `LeagueTabBar` | CC | Presentational — renders `<Link scroll={false}>` per tab; reads current tab from `usePathname()`. No panel mounting. See §3.2 tab-routing rule. Tabs per req §5: Seasons, Members, Current Season Teams, Chat, Schedule, Standings, (admin: Settings, Invitations). |
| `overview/page.tsx` | SC | Paginated SeasonList + current-Season preview (default tab). |
| `members/page.tsx` | SC | Real + placeholder members intermixed (OQ5). |
| `teams/page.tsx` | SC | Preview of current Season's teams. |
| `chat/page.tsx` | SC hosting a CC | Mounts embeddable chat — see §7. |
| `schedule/page.tsx` | SC | Delegates to current Season schedule when one is active. |
| `standings/page.tsx` | SC | Delegates to `Season.standings`. |
| `invitations/page.tsx` | SC | Admin-only; see §3.9. |
| `ArchiveBanner` | SC | Shown at top if `League.status === ARCHIVED`. Copy: "This League is archived — history stays, no new edits." |
| `LeagueAdminMenu` | CC | Kebab menu (edit, archive) shown when `viewerIsAdmin`. |

**Tab routing — nested segments, not Parallel Routes.** Each tab is its own URL segment with its own `page.tsx` under a shared `layout.tsx`. Tab bar renders `<Link>` per tab; client-side navigation replaces only the leaf segment.

```
src/app/[locale]/league/[orgSlug]/[leagueSlug]/
  layout.tsx              ← fetches shared League data; renders LeagueHeader + LeagueTabBar + {children}
  page.tsx                ← /league/... default → redirects to /overview or renders summary
  overview/page.tsx       ← Seasons list + current Season preview
  members/page.tsx
  teams/page.tsx          ← current-season teams preview
  chat/page.tsx           ← embedded conversation or link-out per §7
  schedule/page.tsx
  standings/page.tsx
  settings/page.tsx       ← admin-only; see §13.2 Case B redirect pattern
  invitations/page.tsx    ← admin-only; same pattern
```

- **Shared `layout.tsx`** fetches the League once (via `fetchLeagueForViewer`, §4.4); `<LeagueHeader>` and `<LeagueTabBar>` live in the layout and don't re-render across tab navigations.
- **Each tab's `page.tsx`** is an independent Server Component with its own data fetch + optional `loading.tsx` / `error.tsx`. Not-visited tabs never execute.
- **`LeagueTabBar`** (CC) is purely presentational: it renders `<Link href="./standings" scroll={false}>` per tab, reads the active segment from `usePathname()` to set `aria-current="page"`. No searchParams parsing; no panel mounting logic.
- **Parallel Routes are NOT used** — they're the right primitive for simultaneous slots (modal + main content), not for one-tab-at-a-time.

Apply the same nested-segment pattern to:
- Group page (`overview/`, `members/`, `chat/`, `series/`)
- Season page (`schedule/`, `history/`, `standings/`)
- Series page (`upcoming/`, `settings/`)

### 3.3 Season page (`/league/.../season/[seasonId]`)

| Component | SC/CC | Responsibility |
|---|---|---|
| `SeasonHeader` | SC | Season name, start/end dates, ACTIVE/COMPLETED chip, "Mark Complete" button (CC) for admin. |
| `SeasonTabBar` | CC | Presentational tab bar — renders `<Link scroll={false}>` to `standings/` / `schedule/` / `history/` nested-segment pages. No client state, no panel mounting. See §3.2. |
| `ScheduleGrid` | SC shell + CC rows | Upcoming games grouped by date. Admin affordances per-row (reschedule/cancel/forfeit). See §5.8 multi-date schedule form. |
| `StandingsTable` | CC | Full table with sortable columns, tabindex for keyboard nav. Empty state per OQ11 — shows all teams at 0-0 with "No games played yet." copy; decision locked (see §15). |
| `HistoryList` | SC | DESC chronological; same `ScheduleGrid` row shape but read-only unless admin re-tags. |
| `CopyTeamsWizard` | CC | 3 steps: pick source season, preview teams + captains, confirm. Uses `copyTeamsFromPreviousSeason` with `dryRun=true` then `dryRun=false` (backend §4.7). |

### 3.4 Teams inside Season

| Component | SC/CC | Responsibility |
|---|---|---|
| `TeamCard` | SC | Name, color swatch, captain, roster count. Admin CTA: edit / delete. |
| `TeamDetailDrawer` | CC | Expanded roster with add/remove player. Opened from card click. |
| `CreateEditTeamForm` | CC | Name, color, captain picker (from team roster only), player picker (from League roster). |
| `PlayerPicker` | CC | Combobox over `League.players`. Surfaces placeholder badge visibly. |

**Captain-picker rule** — the captain picker is filtered to rostered players only, since a captain must be on the team's roster (backend §2.7 service-level invariant). Validation mirrors the backend check; on error the server returns an error type and we map to inline field error.

### 3.5 Group page (`/group/[groupSlug]`)

| Component | SC/CC | Responsibility |
|---|---|---|
| `GroupHeader` | SC | Same shape as LeagueHeader; no Org pill; no "Season" anywhere (req §8). |
| `GroupTabBar` | CC | Presentational — same shape as `LeagueTabBar`. Tabs: Next games, Members, Chat, Game Series. No "Teams" tab (req §5). See §3.2. |
| `NextGamesPanel` | SC | The next 4 upcoming occurrences across all active series. OQ2 decision: **4 occurrences**, with "View all" link (see §15). |
| `SeriesListPanel` | SC | Active series cards + collapsed archived ones. |
| `LogAGameCTA` | CC | Primary CTA on mobile; opens "pick a series + occurrence" picker if >1 active series, otherwise goes straight to the materialize flow. Addresses OQ10 (see §15). |
| `GroupArchiveBanner` | SC | "This Group is archived — future RSVPs are read-only." |

### 3.6 Game Series page

| Component | SC/CC | Responsibility |
|---|---|---|
| `SeriesHeader` | SC | Name, recurrence summary (composable i18n — req §8), location, cap, skip-dates button. |
| `StandingRsvpToggle` | CC | Prominent "I'm in every {day}" switch. Toggling calls `upsertStandingRsvp` / `removeStandingRsvp`. Optimistic. |
| `OccurrenceList` | SC | Paginated `GameSeries.upcomingOccurrences(from, to)` (capped at 100 per backend §4.1). |
| `OccurrenceCard` | CC | Date/time, RSVP counts (Yes/Maybe/Waitlist), "Log this game", "Skip this date". Shows viewer's own RSVP chip. |
| `RsvpChip` | CC | Yes / No / Maybe / Waitlist. Shows "Waitlisted (Yes intended)" when capped (req §2.8). |
| `GuestPlusOneInput` | CC | Appears on Yes RSVP. Free-text name. |

### 3.7 Member management (League + Group)

| Component | SC/CC | Responsibility |
|---|---|---|
| `MemberList` | SC | Sortable real + placeholder intermixed, with distinct badge. |
| `MemberRow` | SC | Avatar, displayName, role pill, captain chip (League only), departure-reason chip if removed. |
| `MemberSearchFilter` | CC | Needed once roster >40 (OQ5). Debounced input + role filter. |
| `PromoteDemoteButton` | CC | Gated by viewerIsAdmin; not available for placeholders. |
| `RemoveMemberDialog` | CC | Confirm dialog. Self-removal checks `LastAdminError`. |
| `CreatePlaceholderDialog` | CC | Name input + **privacy warning banner** (req §2.6, §8). Warning is mandatory UI, not a "don't show again" nag. |
| `PlaceholderBadge` | Server-renderable | Visible label — copy via i18n key `leagues.roster.placeholderBadge`. |

### 3.8 Score Report Wizard — see §6 (load-bearing).

### 3.9 Invitation surfaces

| Component | SC/CC | Responsibility |
|---|---|---|
| `SendInvitesPanel` | CC | Three tabs: Direct add, Email invite, Shareable link. Batch cap 200 per backend §4.11. |
| `InviteeSearchField` | CC | Combobox over users; returns `{userId}`. |
| `EmailInviteTextarea` | CC | Multi-email field; validates one-per-line + basic regex; local-only (backend still re-validates). |
| `CreateLinkForm` | CC | Expiry + use-cap (optional). |
| `InvitationList` | SC + CC | Per-invite row: Sent / Accepted / Expired / Revoked (req §8). Actions: Resend / Revoke / Convert-to-placeholder. |
| `InviteLinkList` | SC | Active links (expiry + remaining uses), revoke action. |
| `ResendInvitationRevokeFlow` | CC | When resending, UI tells user "this revokes the prior invite" (req §2.9). |

### 3.10 Invite accept flow (`/invite/[token]`)

| Component | SC/CC | Responsibility |
|---|---|---|
| `InvitePreviewCard` | SC | Aggregate name, sport, admin list (narrowed for invite-only Groups — OQ6 decision: **only inviting admin name**, see §15), member count (coarsened for UNLISTED — req §2.9), inviter, expiry, uses remaining. |
| `AcceptButton` | CC | If signed in, calls `acceptInvitation({invitationId | token})`. If signed out, bounces to sign-in with `?returnTo=/invite/[token]`. |
| `DeclineButton` | CC | Works signed-out. Calls `declineInvitation(invitationId)`. |

### 3.11 Calendar subscribe modal (per aggregate)

| Component | SC/CC | Responsibility |
|---|---|---|
| `SubscribeCalendarButton` | CC | Opens modal for signed-in members. Hidden for unauthenticated Viewers. Signed-in non-members see a disabled state with tooltip "Join this {League/Group} to subscribe." (Edge case — unauthenticated users can't reach invite-only Groups anyway; this affects public Leagues.) |
| `SubscribeCalendarModal` | CC | Shows the prefilled URL (built client-side from user's ical token + aggregate slug + server base URL), Copy button, step-by-step help for Google / Outlook / Apple. |
| `CalendarUrlField` | CC | Displays the subscription URL; "Copy" writes to clipboard. No masking (the URL is the artifact; masking adds friction without security benefit). |

### 3.12 Calendar settings (`/settings/calendar`)

| Component | SC/CC | Responsibility |
|---|---|---|
| `CalendarTokenPanel` | SC | Masked token preview; list of all subscribed aggregates (derived: `myLeagues` + `myGroups` queries) with per-aggregate URL. |
| `RotateTokenButton` | CC | Opens `RotateTokenDialog`. |
| `RotateTokenDialog` | CC | **Consequence-first copy** (req UX4): "All your calendar subscriptions will stop updating until you re-add each URL." Enumerates the affected League/Group names. Requires typing the word "rotate" to confirm. |

### 3.13 Game page additions (existing route `/game/[id]`)

New leaf components mount conditionally on the existing `GameDetailClient`. They do not replace existing surfaces.

| Component | SC/CC | Responsibility |
|---|---|---|
| `LeagueSeasonBreadcrumb` | SC | Rendered when `Game.leagueId` + `Game.seasonId` are non-null. |
| `GroupBreadcrumb` | SC | Rendered when `Game.groupId` is non-null. Includes series back-link when `Game.sourceSeriesId` is non-null. |
| `ReportResultLauncher` | CC | Visible iff `Game.viewerCanReportResult` is true. Opens the wizard (§6). |
| `ConfirmDisputePanel` | CC | Visible iff `Game.viewerCanConfirmResult`. Two buttons, both go through confirmation dialogs. |
| `ForfeitGameDialog` | CC | Admin-only. Team picker + confirm. |
| `GameResultBadge` | SC | Renders one of five states (req UX2). See §6.2 state matrix. |
| `ReportAnIssueDialog` | CC | `reportGameIssue` — existing pattern; new drop-in. |

### 3.14 Discover page additions

| Component | SC/CC | Responsibility |
|---|---|---|
| `OrganizationsTab` | SC | New top-level tab (OQ3 decision: **top-level**). Lists Organizations with the leagues nested under each. |
| `OrgCard` | SC | Logo + name + league count + sport summary. |

**Invite-only Groups are never listed** per req §2.3 — we explicitly do not introduce a "my Groups" section on Discover; those live under profile and on the user's home feed.

### 3.15 User profile additions

A single new section on the existing profile page: `LeaguesAndGroups` lists the user's Leagues + Groups via `myLeagues` + `myGroups`. Behind a visibility check (the profile's existing privacy rules apply).

---

## 4. Data Fetching Strategy

### 4.1 Query composition

All GraphQL built with `json-to-graphql-query` (CLAUDE.md mandates — no plain strings). Reuse `graphql-fragments.ts` wherever possible; add new fragments for the new types.

### 4.2 New fragments (`src/lib/graphql-fragments.ts`)

Proposed additions (names, not full shapes):

- `membershipFragment` — `{ id, user: userRefFragment, role, joinedDate, departedDate, departureReason }`
- `leaguePlayerFragment` — `{ id, displayName, status, user?: userRefFragment }` (null user → placeholder)
- `leagueCardFragment` — `{ id, slug, name, sportType, visibility, status, organization: { slug, name }, currentSeason?: { id, name } }`
- `seasonFragment` — `{ id, name, status, startDate, endDate }`
- `teamFragment` — `{ id, name, color, captain?: userRefFragment, roster: { nodes: leaguePlayerFragment } }`
- `groupCardFragment` — similar to leagueCardFragment minus organization
- `gameSeriesFragment` — `{ id, name, rrule, dtstart, durationMinutes, locationName, skipDates, maxParticipants, status }`
- `occurrenceFragment` — `{ localOccurrenceDate, startInstant, endInstant, skipped, resolvedToGameId? }`
- `rsvpFragment` — `{ id, status, guestName, source }`
- `standingRowFragment` — `{ rank, team: teamFragment, gamesPlayed, wins, losses, draws, winPct }`
- `gameResultFragment` — `{ reportedAt, reportedBy: userRefFragment, confirmedAt, confirmedBy?: userRefFragment, disputedAt, disputedBy?: userRefFragment, disputeNote, forfeitWinnerTeamInstanceId }`
- `invitationFragment` — `{ id, status, role, email, invitee?: userRefFragment, invitedBy: userRefFragment, sentAt, expiresAt }`
- `invitePreviewFragment` — the `InvitePreview` type (backend §4.16)
- `viewerCapabilitiesFragment` — `{ viewerCanReportResult, viewerCanConfirmResult, viewerCanRaiseFlag, viewerGameRole }` — used on Game queries

### 4.3 Parallel fetching on the Season page

**Composition via sibling Suspense boundaries, not a single batched query.** The Season page renders three distinct tabs (History, Schedule, Standings) + a metadata header. Each has different fetch latency — standings aggregation is flagged slow in backend §14 — so they should stream in independently rather than block on the slowest sibling.

Structure:

```
<SeasonPageLayout>         ← fetches seasonFragment + viewer capabilities
  <Suspense fallback={<HeaderSkeleton/>}>
    <SeasonHeader seasonId={id} />
  </Suspense>
  <Suspense fallback={<StandingsSkeleton/>}>
    <StandingsPanel seasonId={id} />
  </Suspense>
  <Suspense fallback={<ScheduleSkeleton/>}>
    <SchedulePanel seasonId={id} />
  </Suspense>
  <Suspense fallback={<HistorySkeleton/>}>
    <HistoryPanel seasonId={id} />
  </Suspense>
</SeasonPageLayout>
```

Each `*Panel` is its own Server Component with its own `authQuery`. Spring GraphQL's dataloader batches resolver calls at the server; the cost of separate HTTP roundtrips is offset by progressive streaming (user sees header → standings → schedule → history as each resolves).

**Correct field shapes** (per backend §6.2):

- `Season.standings: [StandingRow!]!` — **plain list, not a Connection**. Consume as `season.standings.map(...)`, not `season.standings.nodes`.
- `Season.games(first, after, sort): GameConnection!` — Connection-shaped. Use this for both Schedule and History with different `sort` args. Alias in `json-to-graphql-query` via `__aliasFor`:

```
authQuery({
  season: { __args: { id: seasonId }, ...seasonFragment,
    standings: standingRowFragment,     // [StandingRow!]! — plain list
  },
})
```

```
// Separate query for the Schedule panel:
authQuery({
  season: { __args: { id: seasonId },
    games: { __args: { first: 50, sort: new EnumType("SCHEDULED_AT_ASC") }, ...gameConnectionFragment },
  },
})
```

```
// Separate query for the History panel:
authQuery({
  season: { __args: { id: seasonId },
    games: { __args: { first: 50, sort: new EnumType("SCHEDULED_AT_DESC") }, ...gameConnectionFragment },
  },
})
```

With nested-segment routing (§3.2), each Season tab's `page.tsx` is its own fetch anyway — `/season/[id]/standings`, `/season/[id]/schedule`, `/season/[id]/history` never render simultaneously. The sibling-Suspense composition is what happens on the Season *default* page (redirects to standings) or if the design later consolidates into a single-page-with-Suspense.

**`Season.schedule` and `Season.history` do not exist** — the previous version of this doc invented them. Don't query those names. Use `Season.games` with `sort: SCHEDULED_AT_ASC` (schedule) vs `sort: SCHEDULED_AT_DESC` (history).

### 4.4 Unauthenticated viewers on public League pages

Backend resolved the auth contradiction (gap §14): `LeagueController.league(idOrSlug)` is `@PreAuthorize("permitAll()")` and Cerbos enforces visibility — anonymous callers get a `League` back for PUBLIC Leagues, and `null` for UNLISTED. `Organization` and its `leagues` field follow the same pattern. Groups remain auth-required (invite-only by definition).

Pattern used by the page:

```
const session = await auth.api.getSession({ headers });
const q = session?.user ? authQuery : query;   // query = no Bearer token
const result = await q({ league: { __args: { idOrSlug }, ...leagueSelection } });
if (!result.league) notFound();                // null means hidden-to-this-viewer OR not found
return <LeaguePageClient league={result.league} viewer={session?.user ?? null} />;
```

**Cached once per request.** Wrap the fetcher in React's `cache()` so sibling Parallel-Route slots (Standings, Members, etc.) share one fetch. Each slot's own `page.tsx` calls `fetchLeagueForViewer(slug)` and gets the memoized result.

```
import { cache } from "react";
export const fetchLeagueForViewer = cache(async (idOrSlug: string) => {
  const session = await auth.api.getSession({ headers: await headers() });
  const q = session?.user ? authQuery : query;
  const { league } = await q({ league: { __args: { idOrSlug }, ...leagueSelection } });
  return league ? { league, viewer: session?.user ?? null } : null;
});
```

Slots call `fetchLeagueForViewer(slug)` and either `notFound()` on null or render their slot.

### 4.5 Revalidation strategy — tags, not paths

**Tag-based revalidation (`revalidateTag`), not path-based.** A single mutation can affect multiple pages: `confirmGameResult` refreshes the Game page, the Season Standings, the Season Schedule (if the game was unfinalized there), the League page summary, and any member's profile showing the game. Path-based revalidation would require listing five paths per mutation and getting them wrong the first few times.

Every `authQuery` that reads aggregate-scoped data tags its fetch: `{ next: { tags: ["league:42:standings", "season:99:standings"] } }`. Mutations call `revalidateTag(...)` with the relevant tags. The tag namespace:

```
league:{id}                 ← base League data
league:{id}:members
league:{id}:invitations
league:{id}:current-season
season:{id}                 ← base Season data
season:{id}:standings
season:{id}:schedule
season:{id}:history
team:{id}                   ← base Team data + roster
team:{id}:roster
group:{id}                  ← base Group data
group:{id}:members
series:{id}                 ← base GameSeries data
series:{id}:occurrences
series:{id}:standing-rsvps
game:{id}                   ← base Game data
game:{id}:result            ← League games only
game:{id}:participants
user:{id}:leagues           ← myLeagues for this user
user:{id}:groups            ← myGroups for this user
user:{id}:calendar-token    ← for the iCal settings page
```

### 4.5a Revalidation matrix — mutation → tags

| Mutation | Tags to invalidate |
|---|---|
| `createOrganization` | — (new page, nothing to invalidate) |
| `updateOrganization` | (org-slug-derived aggregate if any visible org pages cache it; v1 doesn't need org tags) |
| `addOrganizationAdmin` / `removeOrganizationAdmin` | — (admin list re-fetch on next view) |
| `createLeague` | `user:{creator}:leagues` |
| `updateLeague` | `league:{id}` |
| `archiveLeague` | `league:{id}`, `user:{member}:leagues` (∀ members) |
| `addLeagueMember` / accept-invite-flow → becomes member | `league:{id}:members`, `user:{invitee}:leagues` |
| `removeLeagueMember` | `league:{id}:members`, `user:{removed}:leagues`, `user:{removed}:calendar-token` (URL still 200s but payload changes) |
| `promoteToLeagueAdmin` / `demoteFromLeagueAdmin` | `league:{id}:members`, `user:{targetUserId}:leagues` (their `myLeagues` badge reflects new role) |
| `createSeason` | `league:{id}` (current-season may change), `league:{id}:current-season` |
| `updateSeason` / `setSeasonStatus` | `season:{id}`, `league:{id}:current-season` if this is current |
| `createLeagueTeam` / `updateLeagueTeam` / `deleteLeagueTeam` | `season:{seasonId}`, `team:{id}`, `season:{seasonId}:standings` (if team has games) |
| `copyTeamsFromPreviousSeason` | `season:{targetId}` |
| `addLeaguePlayerToTeam` / `removeLeaguePlayerFromTeam` / `swapLeagueTeamPlayer` | `team:{id}:roster`, `league:{id}:members` (placeholder count may change) |
| `createGroup` | `user:{creator}:groups` |
| `updateGroup` / `archiveGroup` | `group:{id}`, `user:{member}:groups` (∀ members) |
| `addGroupMember` / `removeGroupMember` | `group:{id}:members`, `user:{affected}:groups`, `user:{affected}:calendar-token` |
| `createGameSeries` / `updateGameSeries` / `endGameSeries` | `series:{id}`, `group:{groupId}` |
| `addGameSeriesSkipDate` / `removeGameSeriesSkipDate` | `series:{id}:occurrences` |
| `createGameFromSeriesOccurrence` | `series:{seriesId}:occurrences`, `group:{groupId}`, `game:{newGameId}` |
| `upsertOccurrenceRsvp` / `removeOccurrenceRsvp` | `series:{seriesId}:occurrences` |
| `upsertStandingRsvp` / `removeStandingRsvp` | `series:{seriesId}:standing-rsvps`, `series:{seriesId}:occurrences` |
| `createScheduledGame` / `createScheduledGames` | `season:{seasonId}:schedule`, `league:{leagueId}` |
| `rescheduleGame` / `cancelGame` | `game:{id}`, `season:{seasonId}:schedule`, `season:{seasonId}:history` (only for history crossover) |
| `forfeitGame` | `game:{id}`, `game:{id}:result`, `season:{seasonId}:standings`, `season:{seasonId}:schedule`, `season:{seasonId}:history` |
| `reportGameResult` (incl. the atomic bundled mutation if backend §9) | `game:{id}`, `game:{id}:result` |
| `confirmGameResult` | `game:{id}`, `game:{id}:result`, `season:{seasonId}:standings`, `league:{leagueId}` |
| `disputeGameResult` | `game:{id}`, `game:{id}:result` |
| `sendInvitations` / `resendInvitation` / `revokeInvitation` | `league:{id}:invitations` or `group:{id}:invitations` |
| `acceptInvitation` | `league:{id}:members` or `group:{id}:members`, `user:{accepter}:leagues` or `:groups`, `league:{id}:invitations` or `group:{id}:invitations` (invite row status flipped to ACCEPTED) |
| `declineInvitation` | `league:{id}:invitations` or `group:{id}:invitations` |
| `createInviteLink` / `revokeInviteLink` | `league:{id}:invitations` or `group:{id}:invitations` |
| `redeemInviteLink` | same as `acceptInvitation`: `*:members`, `user:*:leagues` or `:groups`, `*:invitations` (remaining-use counter decrements) |
| `rotateIcalToken` | `user:{id}:calendar-token` |
| `reportGameIssue` | — (fire-and-forget; notification is the artifact) |

**Rules of the road:**

- Every read tags its fetch. Forgetting a tag means mutations can't invalidate it — that's a bug, not a feature.
- A server action may call `revalidateTag` multiple times. Order doesn't matter.
- `revalidatePath` is still used for route-level invalidation when entire pages should refresh (e.g., after `archiveLeague`, the full League route tree). Prefer tags otherwise.
- **No `next: { revalidate: N }` timers.** All data is either viewer-scoped (not cached) or mutation-invalidated.

### 4.5b Optimistic UX

- **RSVP toggle / standing RSVP toggle** — flip local state immediately; on error rollback + toast.
- **Confirm score** — flip `GameResultBadge` to CONFIRMED immediately; revalidate tags on server response; rollback on error.
- **Dispute** — no optimism (terminal action, deserves explicit feedback).

### 4.6 Paginated connection consumption

Every list uses `edges[].cursor / node` with `pageInfo.endCursor + hasNextPage`. The existing `forwardPageInfoFragment` covers it.

**"Load more" pattern — SC owns page 1, CC appends via `useOptimistic`:**

- Server Component renders page 1 with `initialEdges` and `initialCursor` props to a Client Component list.
- Client Component uses `useOptimistic` for the accumulated edges, initialized from `initialEdges`.
- "Load more" click calls a server action → returns page 2's edges + next cursor → CC appends.
- **On route revalidation** (tag-invalidated, §4.5): SC re-fetches page 1; the CC's `initialEdges` prop changes; CC resets its local `useOptimistic` state via `useEffect`-keyed-on-initial-prop to avoid gap/duplicate with freshly-loaded page 1.

Accept that concurrent appends (another tab adding a member) cause temporary duplicates until the user refreshes — the cost is acceptable for v1. Heavy-use lists (member management for a 55-player League) should prefer search + filter over deep pagination.

ASC-default lists (upcoming schedule) use backwards cursor (`last`/`before`) per backend design §6.2. Frontend-contract-gaps.md §4 flags verification; fallback is DESC + client-reverse if Spring GraphQL can't do reverse cursors.

### 4.7 Search / discover endpoints

`leagues(filter: LeagueFilterInput)` and `organizations(filter)` (backend §6.2) power Discover. The filter fields are already shape-compatible with existing search conventions.

---

## 5. Forms

TanStack Form + Zod v4 everywhere. Zod v4 syntax: `{ error: "..." }` not `invalid_type_error`. Schemas live in `src/lib/validation/<domain>.ts` and are imported by both the form component and (where applicable) the server action for defense-in-depth.

**Server-action input validation is mandatory** (Vercel best-practices). Every server action re-validates with the same Zod schema before calling GraphQL. Rationale: client validation can be bypassed; GraphQL errors are coarse.

### 5.1 Form catalog

| Form | Path | Fields | Notes |
|---|---|---|---|
| Create Organization | `/org/new` | name, description, logo, slug preview | Slug auto-generated with live-preview + "change" toggle. |
| Edit Organization | `/org/[orgSlug]/settings` | same + admins management | Uses `updateOrganization` with `@Version`. |
| Create League | `/league/new?orgId=X` | name, sport (required, locked after create), sport subtype, description, logo, visibility, **timezone (required — defaults to Intl browser TZ)**, slug preview | Sport is a radio group; locked after save. Timezone picker uses existing browser TZ list. |
| Edit League | `/league/.../settings` | all of the above minus sport (immutable) | `SportTypeImmutableError` never actually renders — the sport field is disabled. Defensive copy covers the case of a bad deep-link. |
| Create / Edit Season | (modal from League) | name, optional start/end dates | Start ≤ end check in Zod. |
| Create / Edit Team | `/league/.../season/[seasonId]/teams/new` | name (not unique within Season), color (hex swatch), captain (picker), roster (multi-pick) | Captain must be in roster — Zod `refine` cross-field check. |
| Copy Teams wizard | `/league/.../season/[seasonId]/copy-teams` | source season, team subset, carryCaptains | Step 1: pick source. Step 2: preview via `dryRun=true`. Step 3: confirm via `dryRun=false`. Explicit two-call pattern. |
| Create Group | `/group/new` | name, default sport (optional), description, logo, **timezone (required)**, slug preview | visibility hardcoded UNLISTED (req §2.3). |
| Edit Group | `/group/[groupSlug]/settings` | same | |
| Create / Edit GameSeries | `/group/[groupSlug]/series/new` | name (default generated), recurrence (WEEKLY/BIWEEKLY), days-of-week picker, start time, duration, location, max participants, optional end (by date or by count) | Zod: `refine` to check end ≤ 5 years, count ≤ 260, weekly/biweekly only. |
| Skip-date picker | (dialog on series page) | date list multi-pick | |
| Send Invitations | `/league/.../invitations` or `/group/.../invitations` | three-tab: `direct / email / link` | Batch cap 200 enforced client-side + re-checked server-side. |
| Create Placeholder | dialog | displayName | Privacy warning banner is rendered above the submit button, inline, not dismissible. |
| Report Game Issue | dialog on game page | concernType, note | Existing pattern. |
| Rotate Token | dialog in `/settings/calendar` | typed "rotate" confirm | Destructive confirmation. |
| Forfeit Game | dialog on game page | winnerTeamInstanceId | Admin-only. |
| Report Result | wizard | sport-metadata form + confirm | **See §6.** |

### 5.2 Validation UX

- **Inline field errors** on blur; disabled submit while form is invalid.
- **Form-level error banner** at top for server-origin errors that don't map to a single field.
- **Optimistic success toast** after server action returns success.
- **Stale-write recovery — honest answer.** When an update returns `StaleWriteError`, the form shows a non-dismissible banner: "{Name} was updated by someone else. Your changes weren't saved. Copy anything you typed that you want to keep, then refresh."

  One button: **Refresh** — calls `router.refresh()`, which re-fetches the SC data and remounts the form with fresh `defaultValues`. Typed input is lost. (Earlier revisions proposed a second "Discard" button with identical behavior; it's been dropped since two buttons doing the same thing adds ambiguity without value.) TanStack Form does not re-apply `defaultValues` to a mounted form in response to prop changes, so "preserve typed values through refresh" is not achievable without per-field reconciliation — out of scope for v1.

  The honest trade: stale-write is rare enough that losing 30 seconds of typed input is acceptable. A v1.1 enhancement could surface the changed fields as a diff so the user can choose per-field; don't build that now.
- **Timezone field.** Use a `Combobox` over `Intl.supportedValuesOf("timeZone")`; default to `Intl.DateTimeFormat().resolvedOptions().timeZone` on mount for create forms. Required everywhere (req §2.2, §2.3).

### 5.3 Schema snippets

Zod v4 discipline per CLAUDE.md: `z.number({ error: "..." })` (not `invalid_type_error`), `z.enum(EnumObject)` (not `z.enum([...values])`).

```
// leagueCreateSchema (prose, not code — exact syntax varies)
name: z.string().min(2).max(100)
sportType: z.enum(SportType)              // pass the TS enum object directly
sportSubtype: z.enum(SportSubtype).optional()
description: z.string().max(1000).optional()
visibility: z.enum(["PUBLIC","UNLISTED"])
timezone: z.string().refine(isValidIANATimezone, { message: "leagues.league.errors.timezoneInvalid" })

// gameSeriesCreateSchema
recurrence: z.enum(["WEEKLY","BIWEEKLY"])
daysOfWeek: z.array(z.enum(DAY_NAMES)).min(1)
startTime: z.string().regex(/^\d{2}:\d{2}$/)
durationMinutes: z.number().int().min(15).max(480)
endKind: z.enum(["NEVER","DATE","COUNT"])
endDate: z.iso.date().optional()
endCount: z.number().int().min(1).max(260).optional()
// cross-field refine: if endKind==="DATE" then endDate required AND ≤ today+5y
```

Refer to an existing Zod v4 schema in the codebase (e.g., `src/app/[locale]/game/schemas.ts` or similar) for canonical Zod v4 patterns before writing new schemas. Snippets above are directional, not copy-pasteable.

---

## 6. UX1 Score-Report Wizard (load-bearing)

Req §2.10, §4.4, §6 UX1, UX3, UX10 converge here. This is the most failure-prone surface. The wizard must make "enter score" and "report" feel like one atomic action to the user, while handling the two-mutation reality underneath.

### 6.1 Location

Component: `src/components/leagues/report-result/report-result-wizard.tsx` (CC). Mounted from `ReportResultLauncher` on the game page when `Game.viewerCanReportResult === true`. `ReportResultLauncher` is a thin button; the wizard itself lives in a `Dialog` (shadcn).

### 6.2 State machine

Backend exposes `Game.outcome: GameOutcome!` — a single discriminated enum the frontend reads directly. All six visual states map 1:1 to enum values; no client-side synthesis.

**Backend-exposed fields used by the wizard:**
- `Game.outcome: GameOutcome!` — `NOT_REPORTED | SCORE_ENTERED | REPORTED_AWAITING_CONFIRM | CONFIRMED_WIN | CONFIRMED_DRAW | FORFEITED`. Batch-mapped resolver.
- `Game.result: GameResult?` — full reporter/confirmer/disputer fields + timestamps.
- `Game.status: GameStatus!` — includes `FORFEITED` enum value.
- `Game.sportAllowsDraws: Boolean!` — used for "Confirmed — draw" copy variant.
- `Game.viewerGameRole: GameRole!` — `ADMIN | CAPTAIN | PARTICIPANT | SCOREKEEPER | SPECTATOR` with precedence `ADMIN > CAPTAIN > PARTICIPANT > SPECTATOR` (backend picks the single highest-precedence role the viewer holds).
- `Game.viewerCanReportResult: Boolean!`, `Game.viewerCanConfirmResult: Boolean!` — the gating booleans for buttons.

**State machine — direct read of `Game.outcome`:**

| Outcome value | Who sees what |
|---|---|
| `NOT_REPORTED` | Reporter (captain/admin via `viewerCanReportResult`) sees "Report result" CTA. Opposing captain sees nothing. |
| `SCORE_ENTERED` | Score present but not yet reported. Same CTA state as NOT_REPORTED from the UI perspective — the wizard pre-populates team scores on open. |
| `REPORTED_AWAITING_CONFIRM` | Reporter sees "Waiting for {opposing captain name} to confirm." Opposing captain (via `viewerCanConfirmResult`) sees Confirm / Dispute. |
| `CONFIRMED_WIN` | Everyone sees "Confirmed by {name}" + winner chip (from `Game.result.confirmedBy` + a winner derivation — see note). |
| `CONFIRMED_DRAW` | "Confirmed — draw." (Only possible when `sportAllowsDraws` is true for the game's sport.) |
| `FORFEITED` | "W (forfeit)" / "L (forfeit)" chips. Derived from `Game.status = FORFEITED` + `GameResult.forfeitWinnerTeamInstanceId`. No confirmation buttons. |

**Winner rendering:** `CONFIRMED_WIN` shows the winning team. The backend's `GameOutcome` enum carries only the outcome discriminator; the winning `TeamInstance` is accessed through `Game.teamInstances` + the team-metadata scores. Frontend applies the same per-sport ranking the backend uses (highest basketball score, most games won in paddle-sport, etc.) — or, ideally, the backend adds `Game.winner: TeamInstance?` as a convenience resolver. If it doesn't, the frontend picks the winner from whichever team metadata field represents "final points/games/runs won" per sport. This is one spot worth asking backend to simplify with a `winner` field.

> Since backend's `GameOutcomeService` already computes the winner internally to resolve `outcome`, exposing that TeamInstance as a nullable field on `Game` costs backend one line and saves the frontend per-sport logic. **Recommended ask** (lower priority than the Blockers they already resolved): add `Game.winner: TeamInstance` as the authoritative winner field.

### 6.3 Wizard flow — single atomic mutation

Backend resolved the 3-mutation problem (gap §9) by exposing `reportGameResultWithScore(input)` — a single mutation that writes team metadata scores and creates the GameResult in one DB transaction. Sport-specific input uses `@oneOf` (`basketball: BasketballScoreInput`, `soccer: SoccerScoreInput`, etc.) — not polymorphic JSON. The wizard's "one action" UX matches reality at the protocol level.

**Wizard structure.** A single dialog with two visual phases, one submit button:

**Phase A — inline sport-specific score form:**
- Reuse sport-specific team-score form components from `src/components/game/scoreboard/` where they exist; build missing ones following the same pattern.
- Pre-populate from current team metadata (if scores were already entered via the existing direct-entry flow — `Game.outcome == SCORE_ENTERED`).
- Zod-validates per sport (score ≥ 0, no nulls where required, etc.).

**Phase B — confirmation copy:**
- "Report and notify {opposing captain name}." — one primary submit button.
- Shows the implied winner ("Red wins 12–7") derived client-side from Phase A's values.
- Secondary: Cancel, which discards the unsaved scores and the report intent.

**Submit — one mutation:**

```
await authMutate({
  reportGameResultWithScore: { __args: { input: {
    gameId,
    scores: { [sportDiscriminator]: sportSpecificScoresPayload }  // @oneOf
  }}, ...reportGameResultWithScoreResultFragment }
});
```

Result is a union: `ReportGameResultWithScoreResponse | ScoreValidationError | GameAlreadyConfirmedError | InsufficientRoleError | RateLimitError`. Map each to wizard state via `mapErrorToKey` (§11.2).

### 6.4 Failure handling

Since there's one atomic mutation, "partial failure" collapses to "the one call failed for one of several reasons." The wizard keeps form state intact on any failure; the user fixes and re-submits.

| Union member | Wizard behavior |
|---|---|
| `ReportGameResultWithScoreResponse` | Success. Close dialog. Optimistic: outcome flips to `REPORTED_AWAITING_CONFIRM`. Revalidate tags per §4.5a. |
| `ScoreValidationError` | Show inline field errors per `TeamScoreError.field` using `form.setFieldMeta(...)` (§12.3). Wizard stays open. |
| `GameAlreadyConfirmedError` | External concurrency — the opposing captain confirmed something first. Show banner: "This game's result was just confirmed elsewhere. Refresh to see the latest." Submit button replaced with **Refresh** which calls `router.refresh()` + closes dialog. |
| `InsufficientRoleError` | Captain lost their captain status between opening the wizard and submitting. Show banner: "You're no longer the captain of {team}. Ask the new captain to report the result." Submit disabled; Close button is primary. |
| `RateLimitError` | Show banner: "You've submitted too many reports recently. Try again in {retryAfterSeconds, formatted}." Submit disabled until the server's retry window elapses; wizard stays open so the user doesn't lose typed state. |

**External-race mid-typing.** If a notification arrives indicating the game was reported/confirmed/disputed while the wizard is open (§9.1a), the wizard **does not** auto-refresh. Instead, a banner appears inside the dialog: "Someone else just updated this game. Refresh to see." Refresh is user-initiated. Rationale: unexpected auto-refresh while typing is hostile; see §9.1a.

**Stale-write on the same game.** The atomic mutation runs under a single transaction with the game's `@Version`. If an admin edited the game between wizard-open and submit, the server may respond with `StaleWriteError` (if exposed in the union; otherwise surfaced as `UnknownError` and treated similarly). Banner: "This game was updated by someone else. Refresh to see the latest." Same recovery as the stale-write pattern in §11.3 — one **Refresh** button, typed input lost (honest per M11). No two-step retry; the atomic mutation is the retry unit.

### 6.5 Self-confirm, dispute, and race-on-captain-swap

- **Self-confirm block.** Backend returns `SelfConfirmBlockedError`. Wizard doesn't surface Confirm/Dispute at all when the viewer is the reporter — UI gates by `viewerCanConfirmResult`, which is false for the reporter.
- **Dispute.** Separate, smaller dialog — not the full wizard. Optional note (200 chars). On success: toast + revalidate. On `RateLimitError` (1 per 24h per game per user): inline error "You recently disputed this result. Try again later." (req §9).
- **Captain swap between Report and Confirm (UX9).** When the former captain opens the game, `viewerCanConfirmResult === false` now. The UI renders: "You are no longer the captain of {team}. {NewCaptainName} will be asked to confirm." — a notice block. The frontend derives "no longer the captain" from `Game.viewerGameRole` being `SPECTATOR` or `PARTICIPANT` instead of captain role. **Flag:** backend contract does not explicitly expose "captain" as a `GameRole` value — confirm whether `GameRole` enum includes a CAPTAIN variant or whether it's inferred separately via `LeagueTeam.captainUserId`. If the latter, we need a `Game.viewerIsTeamCaptain: Boolean!` scalar. Adding to backend-contract-gaps list.

### 6.6 Admin override

- Admin can confirm on a captain's behalf. Wizard copy changes slightly: "Confirm on {captain name}'s behalf (recorded)" — user is made aware that the action is logged.
- Admin can delete a confirmed result. Lives on the admin kebab menu, not the wizard. Opens a `DangerDialog` with the req §2.10 copy nudge ("agree with both captains first, then re-enter").

### 6.7 Forfeit path

Separate flow (`ForfeitGameDialog`), not routed through the wizard. Admin-only. Picks winner from a dropdown of TeamInstances on the game. On success: game chips flip to "W/L (forfeit)", standings revalidate. **Forfeit button is never offered on Group games** (req §9 defensive copy) — gated by `Game.leagueId != null` *and* `viewerIsAdmin`.

---

## 7. Chat Integration

### 7.1 Current reality (investigated during design)

The existing chat stack in `src/components/chat/` is **not** trivially embeddable. `ConversationView` takes 9 props — `roomId`, `currentUser`, `onBack`, `onToggleMembers`, `onLastMessageUpdate`, `onRoomLoaded`, `incomingEventVersion`, `getIncomingEvent`, `reconnectCounter` — and the last three are subscription plumbing owned by `ChatLayout`. Mounting `ConversationView` bare on a League Chat tab means re-implementing:

- WebSocket subscription lifecycle (`useChatSubscription`).
- Event-fanout versioning to the view.
- "Mark as read" semantics.
- `onLastMessageUpdate` threading (which a tab panel has no use for — there's no room list).

Pretending this is a three-bullet extension was wrong in the prior revision. Pick one of the two paths below before implementation.

### 7.2 Path A (preferred) — extract `<EmbeddedConversation>` from `ChatLayout`

One-time refactor of the existing chat module: pull the subscription + reconnect handling out of `ChatLayout` into a new wrapper component `<EmbeddedConversation roomId={string} currentUser={User} />` that owns its own subscription lifecycle and trusts the incoming `roomId` prop.

- `EmbeddedConversation` is what the new `@chat/page.tsx` parallel-route slot mounts.
- `ChatLayout` (the full-route chat shell at `/chat?room=X`) is rewritten to use `<EmbeddedConversation>` internally, plus its own room-list navigation. No regression; the existing chat app gets the same widget.
- Compose disabled-state (§7.3) is a prop on `<EmbeddedConversation>`.

Cost: one chat-module refactor PR before any League/Group chat tab ships. Benefit: real reuse, consistent behavior across `/chat`, League tabs, and Group tabs.

**This refactor is a prerequisite PR, not an in-stream change.** Sequencing in §19 must put it before League/Group chat tabs.

### 7.3 Path B (fallback) — link-to-full-chat-room, don't embed

If the chat module refactor is too expensive for v1, the Chat tab is not a conversation view — it's a card that says:

> "Chat with your {League|Group} members."
> [Open Chat →] (links to `/chat?room={chatRoomId}`)

The user opens chat in a separate route. One click away, no embedded concerns, no refactor. Less slick, but shippable today.

Decision is product's; the design accommodates either. If Path B ships, §3.2 removes the `@chat` parallel-route slot from League/Group pages and adds an `OpenChatButton` CC to the page header instead.

### 7.4 Archived-aggregate disabled compose

Either path: the compose bar needs a disabled state with explanatory copy when the aggregate is archived (req §2.2, §2.12). For Path A, add `disabled` + `disabledReason` props on `EmbeddedConversation`. For Path B, the "Open Chat" link routes to the standard `/chat?room=X` which reads the room's archived status from the backend and disables its own compose.

### 7.5 Membership + subscription scope

Backend already handles chat membership sync (`LeagueChatRoomSyncListener`, backend §9.3). The existing `useChatSubscription` hook subscribes to **all** `chatEvents` for the current user; joining a League auto-adds the user server-side; events flow without client reconnect. No change needed on either path.

### 7.6 Typename fragments

`LeagueChatRoom` and `CasualGroupChatRoom` are new `__typename`s on the `ChatRoom` interface. Extend `chatRoomInlineFragments` in `graphql-fragments.ts` with the two typenames — `LeagueChatRoom` has `leagueId`, `CasualGroupChatRoom` has `groupId`. The existing chat UI already branches on typename for display; the new discriminators slot in alongside `DirectMessageChatRoom` and `GroupChatRoom` without modification to the switch.

**Confirm during implementation:** backend uses `LeagueChatRoom` and `CasualGroupChatRoom` as separate GraphQL types vs. `ChatRoom` with a discriminator field. The frontend design assumes separate types; if backend chose a discriminator field pattern, §7.6 becomes a different small change.

---

## 8. iCal Subscribe + Token Rotation

### 8.1 The one-token / N-URL model (req §2.13, UX4)

Confirmed backend model:

- **One `icalToken` per user** — `User.icalToken` (backend §11.3).
- **One URL per (user, aggregate)** — aggregate slug + token as query param.
- **URL shape:** `https://<host>/ical/league/{orgSlug}%2F{leagueSlug}.ics?token={icalToken}` and `https://<host>/ical/group/{groupSlug}.ics?token={icalToken}`.
  **Flag to backend:** backend §12.1 routing uses `league/{slug}.ics` with `findByOrgSlugAndLeagueSlugParse` parsing `<orgSlug>/<leagueSlug>`. URL-encoding the `/` as `%2F` is the cleanest path here; confirm backend supports this form or add separate `/ical/league/{orgSlug}/{leagueSlug}.ics` routes.
- **Token lifecycle:** generated lazily on first access OR via `rotateIcalToken` mutation (backend §12.5).

### 8.2 Subscribe modal (§3.11)

Backend resolved the bootstrap (gap §13) — `User.icalToken: String!` is a GraphQL resolver field with lazy-create semantics: `query { me { icalToken } }` returns an existing token OR generates a new one on first access. No separate bootstrap mutation; no chance of accidentally invalidating a prior token.

Per-aggregate modal. Mounts a `SubscribeCalendarButton` on the League/Group page. On click, the modal:

1. Server Component reads `me.icalToken` (lazy-create if needed) via the standard `authQuery`.
2. Builds the subscription URL server-side from the token + aggregate slug + server base URL.
3. Renders the URL in a `CalendarUrlField` with a Copy button (no mask — the URL is the artifact the user pastes; masking adds friction without security benefit since the token is in the URL either way).
4. Provides platform-specific copy-paste instructions (tabs: Google / Outlook / Apple).

URL shapes (per backend §12.1, resolved in gap §5):
- `{base}/ical/league/{orgSlug}/{leagueSlug}.ics?token={icalToken}`
- `{base}/ical/group/{groupSlug}.ics?token={icalToken}`

No `%2F` encoding; nested path for League feeds matches the web URL shape.

### 8.3 Settings → Calendar Sync (§3.12)

Central page listing **every aggregate the user belongs to** that has a subscription URL. Drives home the "rotating breaks all five" point (UX4).

- Fetches `myLeagues` + `myGroups` in parallel (two queries, single `authQuery`).
- Each row: aggregate name, URL (masked), per-row Copy button.
- One `Rotate token` button at the top.
- `RotateTokenDialog`:
  - Lists the affected aggregates by name, with count: "Rotating will stop updates to all 5 of your calendar subscriptions."
  - Typed-confirm (type "rotate"). Reduces accidental-tap risk per UX4.
  - On success: refresh the page; the listed URLs now carry the new token.

### 8.4 Removed-from-aggregate silent-empty (UX7)

Backend already handles this: URL returns `200 OK` with an empty VCALENDAR when the user lost access (backend §12.4). Frontend surfaces a banner on the League/Group settings page of the *removed* user if we can detect it — but v1 leaves this alone and relies on the in-app removal notification. Accepted UX risk per req UX7.

---

## 9. Real-Time Updates

### 9.1 What needs real-time, and how each is wired

| Surface | Signal needed | Mechanism |
|---|---|---|
| Chat messages | Push new messages to open room | Existing `chatEvents` subscription — no new wiring. |
| Score confirmation → Season standings | Standings refresh after confirm on another tab / device | `confirmGameResult` server action calls `revalidateTag("season:{id}:standings", "league:{id}", "game:{id}:result")`. See §4.5a. |
| **Game page live on opposing captain's screen** | Report arrives while they're looking at the game | See §9.1a — notification-driven `router.refresh()`. |
| **Game page live on reporter's screen** | Opposing captain confirms or disputes while reporter is looking | Same pattern — notification-driven `router.refresh()`. |
| Waitlist promotion | Promoted member sees their RSVP flip | In-app notification #14 arrives; if the user has the series page open, the notification handler calls `router.refresh()`. Otherwise on-next-open. |
| Schedule / history updates on mutation | Admin reschedules / cancels / forfeits | Tag-based revalidation (§4.5a). Connected viewers see changes on next navigation. Live-viewer refresh uses the notification handler below. |

### 9.1a Notification fan-out — single subscription, many listeners

**Important architectural constraint:** the `graphql-ws-client.ts` WebSocket client is a process-level singleton, and `useNotificationSubscription` already subscribes to `notificationEvents` at the navbar level (existing `NotificationBell`). Spawning a second subscribe call from the Game page would open another `notificationEvents` subscription on the same socket — duplicating backend fan-out work for no benefit.

**The pattern: one subscription, in-process event bus, many listeners.**

Lift the existing single `notificationEvents` subscription into a top-level `NotificationProvider` mounted at the app shell (root `layout.tsx`). The provider owns:

- The one WS subscription.
- An in-memory `Map<listenerId, (event) => void>` of listeners.
- An `addListener(predicate, callback)` API that returns an unsubscribe function.

`NotificationBell` becomes one listener (`predicate = always true`; renders the toast).

New hooks for the leagues feature:

- `useGameLiveRefresh(gameId)` — adds a listener `(n) => n.gameId === gameId && TRIGGER_TYPES.includes(n.__typename)`, calls `router.refresh()` on match.
- `useSeasonLiveRefresh(seasonId)` — adds a listener for `GAME_RESULT_CONFIRMED` / `GAME_FORFEITED` whose payload game belongs to the season; calls `router.refresh()` on match.

Neither hook opens a new subscription. Both are cheap.

Notification typenames that trigger `router.refresh()` on the Game page:

- `GAME_RESULT_REPORTED` — opposing captain needs Confirm/Dispute buttons to appear.
- `GAME_RESULT_CONFIRMED` — reporter and spectators need to see the confirmed badge.
- `GAME_RESULT_DISPUTED` — reporter needs to see the dispute banner and re-enter.
- `GAME_FORFEITED` — everyone on the page needs the forfeit badge.
- `GAME_SCHEDULED`, `GAME_RESCHEDULED`, `GAME_CANCELLED` — participants viewing the game see live edits.

**Why `router.refresh()` and not optimistic state.** Multiple actors can race (reporter admin-overrides, opposing captain disputes, admin deletes). Server-authoritative re-fetch is simpler than reconciling three possible local-state diffs. Same trade-off the existing chat layer makes.

### 9.1b Suppress auto-refresh while the wizard is open

If the Report-Result wizard dialog is mounted and the user is mid-typing, an auto `router.refresh()` is hostile — it re-fetches the SC tree, may unmount ancestors, and users lose context.

`useGameLiveRefresh` exposes a `suspend()` function. The wizard calls `suspend()` on open, `resume()` on close/submit/dispose. While suspended:

- Incoming `GAME_RESULT_REPORTED` / `GAME_RESULT_CONFIRMED` / `GAME_RESULT_DISPUTED` / `GAME_FORFEITED` events for this game are **buffered** (one-deep).
- If an event is buffered, the wizard surfaces a banner inside the dialog: "Someone else just updated this game. Refresh to see the latest." + a Refresh button that calls `resume()` + `router.refresh()` (which closes the dialog via ancestor remount).
- On `resume()` with no buffered event, no action — live-refresh returns to normal.

Events for other games on the page (none, in v1) are unaffected.

### 9.1c Debouncing

Notifications can fire in bursts during a batch-schedule operation (30 `GAME_SCHEDULED` in succession). The provider's listener dispatch debounces identical listener IDs: collect over a 300ms window, fire one `router.refresh()` at the trailing edge. Prevents refresh storms.

**Debounce does not drop events across distinct listener IDs** — it only collapses duplicate refreshes for the same surface. The buffered-while-suspended event in §9.1b is preserved across the debounce window.

### 9.2 Subscriptions — no new ones in v1

Backend §4.15: "None for v1 beyond existing `notificationEvents(userId)`. Chat messaging subscriptions live in `notification` module, unchanged."

So the frontend leans on:

- **`notificationEvents`** — already wired. The new notification typenames (17 of them, req §2.14) need new inline fragments in `notificationInlineFragments`. Each typename's payload shape → its i18n key.
- **`chatEvents`** — already wired.
- **Server-action `revalidatePath`** after every write. This is the primary refresh mechanism for standings, schedule, and members.

### 9.3 Optimistic updates (minimize polling)

- **RSVP toggle.** Flip local state immediately; on error rollback + toast.
- **Standing RSVP toggle.** Same. Server also runs a sweep (backend §5.2) that the next page load reflects.
- **Confirm score.** Flip `GameResultBadge` to CONFIRMED immediately; on error rollback.

### 9.4 When to use `router.refresh()`

For server-data refreshes that don't map to a single `revalidatePath` (e.g., after copy-teams completes and we want the Season page to re-render with new teams), the client calls `router.refresh()`. This is the escape hatch; use sparingly.

---

## 10. i18n Key Structure

### 10.1 Namespacing

Root keys added to `messages/en.json`:

```
leagues.organization.*
leagues.league.*
leagues.season.*
leagues.team.*
leagues.group.*
leagues.series.*
leagues.rsvp.*
leagues.invitation.*
leagues.invitePreview.*
leagues.placeholder.*
leagues.report.*      # score-report wizard copy
leagues.forfeit.*
leagues.chat.*        # archived-aggregate disabled compose copy only
leagues.calendar.*
leagues.notifications.*   # 17 types
leagues.errors.*      # full error copy catalog per req §9
leagues.empty.*       # empty states per req §9
leagues.roles.*       # Admin, Member, Captain
leagues.status.*      # nested per entity (see 10.2)
```

### 10.2 League-vs-Group and Season-vs-Year discipline

Req §8 demands the UI never says "casual league" or "group season." At the i18n layer this means **no shared keys across aggregates**. Every user-facing string lives under `leagues.league.*` or `leagues.group.*` — even if English happens to use the same word.

```
leagues.league.archive.confirmTitle      = "Archive this League?"
leagues.group.archive.confirmTitle       = "Archive this Group?"
leagues.league.schedule.title            = "Schedule"
leagues.group.schedule.title             = "Next games"     # Groups don't say "Schedule"
leagues.league.pastGamesHeading          = "Past seasons"   # uses "Season"
leagues.group.pastGamesHeading           = "Past games by year"   # uses "Year"
```

The price: some duplication. The payoff: translators in languages where casual/organized play words differ can diverge without a global `contextKey` param.

### 10.3 Status keys nested per entity

Req §8:

```
leagues.status.season.ACTIVE       = "Active"
leagues.status.season.COMPLETED    = "Completed"
leagues.status.league.ACTIVE       = "Active"
leagues.status.league.ARCHIVED     = "Archived"
leagues.status.group.ACTIVE        = "Active"
leagues.status.group.ARCHIVED      = "Archived"
leagues.status.invitation.SENT     = "Sent"
leagues.status.invitation.ACCEPTED = "Accepted"
leagues.status.invitation.EXPIRED  = "Expired"
leagues.status.invitation.REVOKED  = "Revoked"
leagues.status.rsvp.YES            = "Yes"
leagues.status.rsvp.NO             = "No"
leagues.status.rsvp.MAYBE          = "Maybe"
leagues.status.rsvp.WAITLIST       = "Waitlist"
```

### 10.4 Recurrence composition

Req §8: "Every Friday at 7:00 PM starting March 15 — may be two or three separate phrases in another locale."

```
leagues.series.recurrence.weekly.on     = "Every {day, select, ...}"
leagues.series.recurrence.biweekly.on   = "Every other {day, select, ...}"
leagues.series.recurrence.time          = "at {time}"
leagues.series.recurrence.startingFrom  = "starting {date}"
leagues.series.recurrence.endBy         = "until {date}"
leagues.series.recurrence.endCount      = "for {count, plural, one {# time} other {# times}}"
```

The UI composes parts via `next-intl` ICU. Pluralization + ordering live in each locale.

### 10.5 Score-report copy (req §8)

```
leagues.report.cta                = "Report result"
leagues.report.waitingFor         = "Waiting for {captain} to confirm"
leagues.report.confirmedBy        = "Confirmed by {name}"
leagues.report.disputedBy.toReporter  = "Disputed by {name} — please re-enter the scores"
leagues.report.disputedBy.toOthers    = "Disputed by {name}"
leagues.report.selfConfirmBlocked = "The opposing captain needs to confirm. You can't confirm your own report."
leagues.report.adminOverride      = "Admin override — {name} confirmed"
leagues.report.retryReport        = "Retry report"
leagues.report.scoresSavedReportFailed = "Your scores were saved, but the report couldn't be sent. Try reporting again."
```

### 10.6 Error catalog

Every error string in req §9 gets a key under `leagues.errors.*`. Server action maps `errorType` (the union-member typename) to an i18n key, then `getTranslations()` resolves it.

```
leagues.errors.sportMismatch           = "This League is for {sport}. This game is {gameSport}."
leagues.errors.sportImmutable          = "Sport can't be changed after the League is created."
leagues.errors.timezoneMissing         = "Please choose a timezone."
leagues.errors.inviteExpired           = "This invite has expired."
leagues.errors.inviteRevoked           = "This invite has been revoked."
leagues.errors.inviteFull              = "This invite has reached its use limit."
leagues.errors.lastAdmin               = "You're the last admin. Promote another member first."
leagues.errors.placeholderCantPromote  = "Placeholder members can't be promoted — they don't have an account."
... etc for every bullet in req §9
```

### 10.7 Email invite template

Req §8 calls out "Email invite template — subject and body with League/Group name and inviter name interpolation. Deliverability is backend's; copy is frontend's."

**Flag:** The email template lives server-side (Spring Boot templating). Frontend owns *copy*, not the template engine. Proposed handoff: content keys live in the frontend repo under `leagues.emailInvite.*` and are either (a) shipped to backend as a JSON catalog via a build step, or (b) mirrored into a backend i18n resource. Needs coordination — call out for implementation. (Default: option b — we commit the same copy to both repos and add a test asserting parity.)

---

## 11. Error Handling

### 11.1 Rendering surfaces

| Error origin | Render surface | Owner component |
|---|---|---|
| Form field validation (Zod) | Inline below field | `FormTextField` etc. |
| Single-field server error | Inline below field | Form component |
| Form-wide server error | Banner at form top | Form component |
| Mutation action failure (not form) | Toast via `sonner` | Calling CC |
| Page-level fetch failure | `error.tsx` boundary | Route segment |
| Empty state | Dedicated empty UI | Tab panel / list component |
| Stale write | Banner + refresh button + preserved form state | Form component |
| Rate limit | Toast or inline (context-dependent) | Calling CC |

### 11.2 Server-error → user-copy mapping

Server actions return a discriminated `MutationResult<T>` (existing `src/lib/graphql-result.ts`). The `errorType` field carries the union-member typename (e.g., `SlugUnavailableError`). A new helper `mapErrorToKey(errorType): i18nKey` resolves typename → `leagues.errors.*` key. Unknown typenames fall through to `leagues.errors.generic`.

Action return shape:

```
type LeagueActionResult<T> =
  | { success: true, data: T }
  | { success: false, errorType: string, message: string, fieldPath?: string }
```

`fieldPath` lets the form component target inline rendering (e.g., `errorType === "SlugUnavailableError"` → `fieldPath = "slug"`).

### 11.3 Stale-write recovery

On `StaleWriteError`:

- The form stays as-is — values not auto-reset.
- Non-dismissible banner: "{Name} was updated by someone else. Your changes weren't saved. Copy anything you typed that you want to keep, then refresh."
- One button: **Refresh** — calls `router.refresh()`, remounts with fresh server data; typed input is lost.

This is the honest answer: TanStack Form does not re-apply `defaultValues` to a mounted form when props change, so "preserve values through refresh" is not achievable without per-field reconciliation (v1.1 scope). Losing typed input on a rare stale-write is accepted v1 behavior.

This pattern applies to all forms targeting `@Version`-tracked entities: Organization, League, Group, Season, LeagueTeam, GameSeries, and core Game (backend §3.1).

### 11.4 Defensive no-op errors

- **Joining via already-redeemed link** — backend treats as no-op. Frontend shows an info toast: "You're already in this {League/Group}."
- **Skipped-occurrence RSVP** — silently voided per req §2.8. Frontend does not surface.
- **Race on "Log this game"** — second attempt resolves to the same Game. Frontend navigates to the Game page regardless; the race is invisible.

### 11.5 Rate-limit feedback

Backend exposes `RateLimitError` from: `sendInvitations` (10/hr/owner), `resendInvitation` (3/hr/invite), `reportGameIssue` (3/24h/user), `disputeGameResult` (1/24h/gameId/user).

Frontend:

- Inline on the action's dialog: "You've sent too many invites recently. Try again later."
- For `disputeGameResult`, specific copy: "You recently disputed this result. Try again later." (req §9).

---

## 12. Accessibility & Motion

Per `/web-design-guidelines` skill — load before implementation, apply as review criteria.

### 12.1 Heading hierarchy per page

- `h1` — page's primary entity name (League name, Group name, Season name).
- `h2` — tab-panel titles ("Schedule", "Members", "Standings").
- `h3` — list sections inside a panel ("Upcoming occurrences", "Archived series").
- `h4`+ — card titles.

No skipped levels. Implemented with `Typography` components from `src/components/ui/typography.tsx`.

### 12.2 Keyboard paths

- **Tab navigation.** Primary action (Report, Confirm, RSVP toggle) comes first in tab order on mobile; long lists use an "skip to first item" invisible link.
- **Standings table.** Native `<table>` navigation — Tab moves between focusable elements (team-row links, sort header buttons). Column headers are `<button>` with `aria-pressed` and `aria-sort` that updates on click. Row focus is via the team-name link (keyboard-activatable). Seasons cap at ~32 teams (backend §14) so no virtualization + no arrow-key grid pattern in v1 — if a future release needs it, spec it with roving tabindex + focus management. The simpler table is more accessible by default.
- **RSVP chip group.** Implemented with `ToggleGroup` from shadcn (already have `src/components/ui/toggle-group.tsx`) which is keyboard-accessible out of the box.
- **Standing RSVP toggle.** shadcn `Switch` — accessible by default.
- **Report Result wizard.** Focus traps within dialog per shadcn/Base UI standard. Initial focus: the first empty team-score input in Phase A. **On Phase A → Phase B transition:** manually move focus to the confirmation heading (via `ref.focus()`) so screen-reader users re-establish context; the heading has `tabindex="-1"` to accept programmatic focus. Escape closes the dialog (with "unsaved changes" confirmation if the form is dirty).
- **Destructive dialogs — Forfeit, Rotate token, Archive, Delete confirmed result, Remove member.** All shadcn `AlertDialog`. **Default focus on Cancel, not on the destructive action.** The user must deliberately Tab to (or click) the destructive button. Applies per `/web-design-guidelines` destructive-action rule. Escape dismisses (Cancel).
- **Typed-confirm destructive dialogs — Rotate token, Archive League/Group.** Default focus on the typed-confirm text input (the user must type before Confirm enables); Cancel is focus-next.
- **Invite-accept CTA.** Accept and Decline are both keyboard-reachable before any login-link fallback for signed-out viewers.

### 12.3 ARIA

- `aria-live="polite"` on the score-report wizard's phase-change announcement ("Scores saved. Sending report…"). This fires **in addition to** programmatic focus-move (§12.2) — `aria-live` alone is insufficient for context re-establishment.
- `aria-current="page"` on active tab (the `<Link>` rendered by `LeagueTabBar` / `GroupTabBar` / `SeasonTabBar`).
- `role="status"` for waitlist chip ("You're on the waitlist" — req §2.8).
- `aria-sort` on standings column headers (ascending/descending/none), updated on sort change.
- `aria-describedby` on every form field pointing to its help/error slot.
- **Server-returned field errors wire into TanStack Form.** When a server action returns `{ errorType, fieldPath, message }`, the form calls `form.setFieldMeta(fieldPath, (meta) => ({ ...meta, errors: [translate(message)] }))` — this is the TanStack Form v1 API (there is no `setFieldError` method). TanStack Form re-wires `aria-invalid` and `aria-describedby` automatically; without this step, SR users won't hear the error even though `aria-invalid` looks correct in devtools for Zod errors. Common regression; test it. `fieldPath` uses dot-notation to match TanStack Form's nested-field paths (e.g., `"settings.timezone"` for a nested form object).
- Placeholder badge: `<span aria-label="Placeholder — no account">Placeholder</span>` beside the member's name. Alternative (cleaner for SR): on the member row, add `<span class="sr-only">Placeholder member — no account.</span>` after the name, and let the badge be `aria-hidden="true"`. Implementation picks the pattern that reads best in practice.

### 12.4 `prefers-reduced-motion`

- Tab switching: default transition is `duration-200` fade; `@media (prefers-reduced-motion)` → `duration-0`.
- Score-report wizard phase-change: slide animation disabled under reduced-motion. **`aria-live` announcement still fires** — reduced-motion suppresses motion, not semantics.
- Optimistic RSVP chip flip: under reduced-motion, remove the transition but still change text/icon + color + `aria-live` update. Color-only is an accessibility anti-pattern (§12.5) — keep the text.
- Uses Tailwind's `motion-safe:` / `motion-reduce:` utilities (already in v4).

### 12.5 Color, contrast, semantics

- Team color swatches are **decorative** (`aria-hidden="true"`). Team name (always a text sibling in the same cell/row) is the accessible identifier.
- Status pills (ACTIVE / ARCHIVED / COMPLETED) use text + icon + color — never color alone.
- Captain badge is text ("Captain") — never a colored dot only.
- Forfeit chip is `"W (forfeit)"` — text-content-complete, not icon-only.
- RSVP chip (Yes / No / Maybe / Waitlist) uses text + color + icon.
- Sort direction on standings: `aria-sort` attribute + visible arrow icon + column label — color never differs between sorted and unsorted states.

### 12.6 Touch targets

Minimum 44×44 per WCAG is the default for **all** interactive surfaces in this feature. Specific callouts where it's easy to forget:

- RSVP chips — current chip sizes in the codebase need spot-check; may need padding.
- Standing RSVP switch (shadcn `Switch` — verify base size meets 44×44 including touch-area padding).
- "Log this game" on mobile (primary CTA — definitely 44×44).
- Copy button on calendar URL.
- Member-row action buttons (Promote / Demote / Remove / Create Placeholder).
- Occurrence-card actions (Log this game / Skip this date).
- Rotate-token / Archive / Forfeit buttons in dialogs.

When a visual size needs to be smaller (dense member list on desktop), pad the hit area with `p-*` so the *tappable* region stays 44×44 even if the rendered chrome is smaller.

### 12.7 Form error announcements

TanStack Form + `FormField` components (existing pattern) already wire `aria-invalid` and `aria-describedby`. No new work here — follow the `game/add-team-form.tsx` pattern.

---

## 13. Authorization on the Client

### 13.1 Signals

Per backend §6.5, the canonical signals are:

- `viewerIsAdmin` — boolean on Organization, League, Group.
- `viewerMembership` — Membership | null on League, Group.
- `viewerCanReportResult`, `viewerCanConfirmResult`, `viewerCanRaiseFlag` — booleans on Game (req UX3: "branch on the per-viewer capability the backend exposes on each game").
- `viewerGameRole` — GameRole enum on Game.

These must be selected on every page that gates admin/member surfaces.

### 13.2 Server-side gating (primary) — two cases, two behaviors

**Case A — visibility-gated.** The viewer is not supposed to know the aggregate exists. Use `notFound()` to render the standard 404 page so existence isn't leaked.

- Invite-only Group at `/group/[slug]` when the viewer isn't a member.
- Invite-only League at `/league/.../[leagueSlug]` when the viewer isn't a member.
- Any descendant route of the above (Season, Team, GameSeries, etc.).

Backend returns `null` for these reads; component checks null → `notFound()`.

**Case B — capability-gated.** The aggregate is visible; the viewer just can't do this action.

- `/league/.../settings` when the League is public but the viewer isn't an admin.
- `/league/.../invitations` likewise.
- `/league/.../season/[id]/teams/new` likewise.

Behavior: `redirect()` back to the parent page (the aggregate home) and — if possible — surface a flash toast ("Admin access required") via a URL search param the parent page reads. Do **not** `notFound()`, because the parent page does exist and leaking "I tried to edit" is harmless.

Implementation: `import { notFound } from "next/navigation"` (not available from `@/i18n/navigation`) + `import { redirect } from "@/i18n/navigation"` (next-intl-wrapped) + `searchParams?.msg === "admin-required"` handling in the parent layout's flash-banner slot.

**Flash-param hygiene.** The parent page clears the `msg` param after displaying the toast so it doesn't re-fire on Back-button navigation: a small Client Component reads `searchParams`, fires the toast on mount, then `history.replaceState(null, "", pathname)` to strip the param.

### 13.3 Client-side gating (convenience only)

- Client components receive role flags as props and branch on them to conditionally render buttons (the **hint**). This is not enforced — a clever user could mount the wizard; their mutation call still goes through the backend which re-enforces via Cerbos.
- Per req §0: "Client gates are convenience, not security."

### 13.4 Pattern

```
// Server Component
const league = await authQuery({ league: { ..., viewerIsAdmin: true, viewerMembership: { role } }});
return <LeaguePageClient league={league} isAdmin={league.viewerIsAdmin} myRole={league.viewerMembership?.role} />;

// Client Component branches
{isAdmin && <LeagueAdminMenu leagueId={league.id} />}
```

No separate "useCurrentRole" hook. Role flags flow via props, not context — per CLAUDE.md "default to Server Components" discipline.

### 13.5 Captain detection

See frontend-contract-gaps.md §2 — backend needs to expose `Game.viewerIsCaptain: Boolean!` or add `CAPTAIN` to the `GameRole` enum. The UX9 captain-swap copy path depends on this. The fallback (traversing `Game.participants[].TeamInstance.sourceTeamId → LeagueTeam.captainUserId === me`) is indirect and expensive and shouldn't ship.

### 13.6 Server actions must fail-fast on missing auth

Per `/vercel-react-best-practices` server-auth-actions rule: every server action **re-checks** session at the top before any other work, and short-circuits on missing auth.

```
"use server";
export async function updateLeagueAction(input: UpdateLeagueInput) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { success: false, errorType: "Unauthenticated", message: "Please sign in." };
  }
  // ... Zod re-validation ... authMutate ...
}
```

Rationale: `authMutate` attaches the Bearer token but doesn't validate the caller **before** making the GraphQL roundtrip. A null session would produce a cryptic server-side auth failure deeper in the stack. The fail-fast check costs microseconds and saves a failing roundtrip — also makes error copy predictable.

Backend's Cerbos layer is the **authoritative** authz check; this client-side fail-fast is purely latency / UX protection.

---

## 14. Performance

### 14.1 Bundle split points — behind-interaction only

The App Router already route-splits page modules. `dynamic({ ssr: false })` adds value only for heavy components that load **behind a user interaction** on a page users typically visit without triggering that interaction. Apply narrowly:

- **Score-report wizard** — `dynamic(() => import(...), { ssr: false })` on the launcher. The wizard mounts only when the user clicks "Report result." Most Game page visits don't open the wizard.
  - **Per-sport score forms inside the wizard.** The wizard shell loads when opened; the sport-specific score form (basketball form vs paddle-sport form vs baseball form, etc.) is further `dynamic`-imported keyed on `Game.sport` so a wiffleball league's users never ship the basketball form's bundle. One tier deeper than the wizard's own split.
- **Calendar subscribe modal** — `dynamic` on the launcher. Platform-help tabs (Google / Outlook / Apple) are content-heavy and only load when the user taps Subscribe.
- **Forfeit / Rotate-token / Archive confirm dialogs** — dialog components dynamic-imported on launcher click. Admins rarely trigger these.

**Do not dynamic-import**:
- `StandingsTable` per-route — it ships with the `@standings` parallel-route slot, which is already its own chunk. No win from dynamic-import.
- Schedule multi-date form — only mounts at `.../season/[id]/scheduled-games/new`; route-split already handles it.
- Copy teams wizard — same.
- Chat components — split via the Parallel Routes `@chat` slot.

Principle: if a component ships only on one route and the route isn't already loaded without the component, route-splitting is doing the work. Adding `dynamic` on top is cargo-cult and costs a client-runtime suspense boundary for no payload savings.

### 14.2 Parallel data fetching

**Season page** — one `authQuery` with three parallel field selections (standings + schedule + history), batched by Spring GraphQL (§4.3).

**League page** — split: the header + currentSeason fetch synchronously (first render); tab panels fetch via their own `Suspense` boundaries with `loading.tsx`. User sees header immediately; panels stream in.

**Group page** — same pattern; next-games + series-list streaming under Suspense.

### 14.3 Standings table: N+1 defense

`Season.standings` returns pre-aggregated `StandingRow` with `team: LeagueTeam` embedded (backend §4.13). **Don't** re-query team info per row — select everything in the top-level query.

### 14.4 Memoization

- `useMemo` only where profiled; premature memoization is noise.
- Stable callbacks (`useCallback`) on props passed to deep subtree components like `StandingsTable`. Rationale per `/vercel-react-best-practices`: stable callbacks prevent subtree re-render.

### 14.5 Image / logo sizing

League / Group / Org logos served through `resourceFragment` with `thumbnailUrl`. Use `next/image` with explicit `sizes`. Avatars: 40×40 on card, 64×64 on header, 96×96 on settings.

### 14.6 Connection over-fetching

Default page size: 20. Exception: standings (all teams, no pagination — Seasons rarely have >32 teams). Calendar-URL list: all user memberships on settings page.

---

## 15. Open Design Questions — Resolutions

Each open question from req §6 resolved here with rationale. Where the answer is "punt and flag," that's called out.

1. **Season-picker on create-game** — **Auto-select the active Season if unambiguous, prompt otherwise.** A League with one active Season auto-selects; two overlapping active Seasons (rare but allowed per req §2.4) force a picker.
2. **"Next games" horizon on Group page** — **Show the next 4 occurrences.** "View all" link routes to series page. 4 fits mobile viewport; Maya's use case is glance-at-home, not browse.
3. **Organizations on Discover** — **Top-level tab.** Matches casual-persona review preference (req §6 OQ3).
4. **Notification channel matrix** — **Flag, not resolve.** This is a product decision worth a separate doc. Proposed default until product decides: reschedule/cancel/forfeit = push + in-app badge. Report/confirm/dispute = in-app badge. Pre-game reminder = push. Invite received = email + in-app. (See §16 open questions.)
5. **Search and filter on members** — **Show a search input always, with type-to-filter over the current (paginated) window.** Once >40 members, add a server-side search param.
6. **Invite preview privacy for invite-only Groups** — **Show only the inviting admin's name.** Protects other admins from hostile forwarding. Full admin list is visible post-accept.
7. **Placeholder privacy warning copy** — **Flag, content design owns.** Frontend ships the i18n key and the banner component; copy-team owns the exact words.
8. **Guest vs placeholder at play time** — **Free-text guest is the default; placeholder requires an admin-only "Track long-term" checkbox** on the guest name input. Members see a single "+1 name" free-text field; admins see the field + the checkbox. Ticking the checkbox turns the guest into a placeholder (routes through the privacy-warning dialog).
9. **Multi-date schedule form shape** — **Grid form: rows are dates, columns are game slots (Red vs Blue 10am, Green vs Gold 11:30, …). Copy-down-column and "repeat this row weekly for N weeks" affordances.** Detailed component spec lives in `ScheduleGrid` component impl; the form takes an array of `ScheduledGame` rows and submits via one `createScheduledGames` batch mutation. **Flag to backend:** backend §4.6 lists only singular `createScheduledGame`. A batch variant would be a significant UX win. **Backend contract gap.**
10. **Home-screen quick-log for casual Groups** — **Primary CTA on the mobile tab-bar when the viewer is a member of at least one Group: "Log a game."** Taps to an aggregate picker (if >1 Group), then to the materialize flow.
11. **Standings on a brand-new Season** — **Show all teams at 0-0, with "No games played yet." copy below the table.** Not an empty-state illustration — the table shape is itself useful context.
12. **Co-admin concurrency "last edited by"** — **Add a `lastEditedBy: User` + `lastEditedAt: DateTime` field to each versioned entity.** Display as "last edited by Dana 2 min ago" on the game / team / season edit forms. Backend already has `@Version` and audit fields (backend §3.1); surfacing them to GraphQL is cheap. **Backend contract gap** if these aren't already exposed.

---

## 16. Open Questions Requiring Human Input

These are beyond the design agent's authority to resolve:

1. **Notification channel matrix (OQ4).** Which of the 17 notification types (req §2.14) fire as push vs email vs in-app vs silent? Requires product decision; implementation must know before building notification fan-out UI.
2. **Email invite template repo location.** Does the copy live only in frontend i18n, only in backend resources, or mirrored? Affects the shipping process and translator workflow.
3. **Placeholder privacy warning copy (OQ7).** Content design hasn't provided the exact wording. Frontend ships the banner with a placeholder string blocked on copy.
4. **Captain-swap disambiguation copy (UX9).** "You are no longer the captain of {team}" — needs content-design review because it's a face-saving moment. Proposed copy works; confirm.
5. **Multi-date schedule batch API (OQ9).** A `createScheduledGames` batch mutation would transform this UX. Is it possible in backend scope? If not, frontend executes N sequential `createScheduledGame` calls with a progress bar — degraded UX.
6. **"Last edited by" field (OQ12).** Confirm backend exposes `lastEditedBy` on the versioned entities. If not, accept as v1 cut.

---

## 17. Backend Contract Gaps / Flags

**Authoritative list lives at** `playground-backend/.claudedoc/0102-leagues/frontend-contract-gaps.md`. As of the 2026-04-18 backend revision, **12 of 14 gaps are resolved**. Status:

**Resolved (12):**

| # | Gap | Backend contract |
|---|---|---|
| 1 | `Game.sportAllowsDraws` | `extend type Game { sportAllowsDraws: Boolean! }` — static per sport |
| 2 | Captain signal | `GameRole` enum includes `CAPTAIN`; `Game.viewerGameRole` returns highest-precedence role |
| 3 | `createScheduledGames` batch | Cap 50 per call, per-row transactions, partial-success error array |
| 5 | iCal URL shape | Nested `{orgSlug}/{leagueSlug}` path; no `%2F` encoding |
| 7 | Email invite template | Backend owns (Thymeleaf); reads `PlaygroundUser.settings.locale` |
| 8 | `RateLimitError.retryAfterSeconds` | Added; sourced from Bucket4j |
| 9 | Atomic `reportGameResultWithScore` | `@oneOf` sport-specific input; single DB transaction |
| 10 | `Game.outcome` enum | 6-state discriminated enum; replaces all state-machine synthesis |
| 11 | `Game.league` / `.season` / `.group` / `.sourceSeries` object refs | Batch-mapped; single-query breadcrumbs |
| 12 | `GameSeriesOccurrence.myRsvp` | Batched resolver |
| 13 | `User.icalToken` lazy-create | Bootstrap via `me { icalToken }` query; no rotation needed |
| 14 | Public-League read without auth | `@PreAuthorize("permitAll()")` + Cerbos visibility |

**Outstanding (2):**

- **§4 Reverse-cursor pagination** — Major. Backend spec says `last`/`before` is used but Spring GraphQL `ScrollSubrange` reverse-direction support needs runtime verification. Fallback: DESC-sort + client-reverse if it doesn't work.
- **§6 `lastEditedBy` / `lastEditedAt`** — Minor. Explicitly deferred to v1.1 by backend.

No gaps remain as W1.4 / W2.x / W4.x / W5.x blockers. Previous "fallback if unresolved" language in earlier sections (§4.4, §6.2, §6.3, §8.2) has been removed — the resolved contract is the design.

Non-gaps (checked):
- `Organization.status` — not exposed, matches requirements §2.1 non-archivable stance.

---

## 18. Requirements-Doc Amendments

Small corrections / clarifications worth folding back into `requirements.md`:

- **§2.10 — forfeit's visual state.** Req lists 5 visual states + forfeit. Forfeit is state #6; the doc already acknowledges it. Minor: call it "state 6" explicitly so implementation can key off a single discriminator.
- **§6 UX3.** "Branch on the per-viewer capability the backend exposes" — good. Recommend the doc additionally name the field (`Game.viewerCanReportResult`) so implementation doesn't invent one.
- **§5 "Existing pages that gain affordances" / Game page.** Doesn't mention the breadcrumb-back-to-series case for Group-materialized games. It's implied but worth a bullet for clarity.
- **§6 OQ8** (guest vs placeholder). The design lands on "admin-only checkbox to track long-term." Recommend folding that into the requirements doc so QA has something to verify against.
- **§6 OQ12.** "Last edited by" needs a visible surface per-entity. Requirements currently only scopes "games, teams, scheduled games." Design extends it to Seasons, Leagues, Groups, GameSeries (anything versioned). Either narrow or broaden in the doc.
- **§2.14 notification catalog.** All 17 exist; the doc doesn't spell out the channel per notification. OQ4 captures this. Worth making the channel matrix an explicit table in requirements once product decides.
- **§2.13.** Calling the subscription model "one token per user, one URL per aggregate" is clear. The *rotation warning copy* needs to enumerate the URLs by name (design decision). Requirements currently says "state it in plain words" — tighter language: "enumerate the affected subscriptions by aggregate name."

---

## 19. Implementation Sequencing — PR Plan

Real PR breakdown by dependency. Each row is a shippable unit sized for one PR. Prerequisites listed in parentheses.

### Pre-work (before any League/Group PR)

- **P0** — Confirm the seven Blocker backend gaps (frontend-contract-gaps.md §§1, 2, 3, 9, 10, 13, 14). PR-level decisions on each before Wave 1 starts.
- **P1** — Chat module refactor (§7.2 Path A — extract `<EmbeddedConversation>`). Not leagues-scoped but leagues depends on it. Only needed if Path A is chosen over Path B.
- **P2** — i18n scaffolding: add the `leagues.*` namespace skeleton to `messages/en.json` with empty strings for every key defined in §10. Content fill can stream in as PRs land.

### Wave 1 — Organization + League read-only (no mutations)

Dependencies: P0 (gap §14 resolved for public-League reads).

- **W1.1** — Organization page (`/org/[slug]`) + new fragments (`organizationCardFragment`, admin list). Read-only.
- **W1.2** — League page read surfaces: header, Seasons tab list, Members tab (no admin affordances), Chat tab placeholder, Standings + Schedule tabs that delegate to Season. Parallel-route scaffolding. Uses `fetchLeagueForViewer` branch (§4.4).
- **W1.3** — Season page read surfaces: three parallel-route slots (`@standings`, `@schedule`, `@history`), each with its own Server Component + `loading.tsx`. Standings table + schedule/history lists.
- **W1.4** — Game page additions (read-only): breadcrumbs for league/season/group, `GameResultBadge` (reads outcome signal — falls back to fabricated state if gap §10 unresolved).

### Wave 2 — Organization + League mutations (no score wizard, no chat embed)

Dependencies: Wave 1.

- **W2.1** — Create/edit Organization, add/remove Org admins.
- **W2.2** — Create/edit League, archive League. Settings tab (admin-only, `redirect()` for non-admin per §13.2 Case B).
- **W2.3** — League members management: direct-add, email invites, shareable link, per-invite status table, resend/revoke, placeholder creation with privacy warning.
- **W2.4** — Decline invite flow, Accept invite flow including auto-roster, invite preview page. Depends on W2.3 (send-invite UI must exist before accept/decline can be tested end-to-end).
- **W2.5** — Create/edit Season, mark Complete.
- **W2.6** — Create/edit/delete LeagueTeam, captain picker, player picker.
- **W2.7** — Copy teams from previous Season (3-step wizard, dry-run preview).
- **W2.8** — Promote/demote admins, remove member, leave aggregate (with last-admin block).

### Wave 3 — Group + recurring game nights

Dependencies: Wave 2 (shared invite + member + chat patterns).

- **W3.1** — Create/edit Group, archive Group (with series cascade).
- **W3.2** — Group members management (mirrors W2.3 minus captain).
- **W3.3** — Group invites (mirrors W2.4 — no auto-roster).
- **W3.4** — Create/edit GameSeries, skip dates, end series. Upcoming occurrence list.
- **W3.5** — RSVP per-occurrence (incl. guest +1). Waitlist auto-promote. `upsertOccurrenceRsvp` action.
- **W3.6** — Standing RSVP toggle. `upsertStandingRsvp` / `removeStandingRsvp`.
- **W3.7** — Materialize occurrence into a Game (`createGameFromSeriesOccurrence`).

### Wave 4 — Scheduling + score reporting

Dependencies: Wave 2 (Teams exist), Wave 3 (Groups exist for cross-cutting game page), plus backend gap §3 (`createScheduledGames` batch) ideally resolved.

- **W4.1** — Create scheduled League game (single). Reschedule, cancel.
- **W4.2** — Multi-date schedule grid form (uses batch mutation from gap §3; falls back to client-side fan-out if not resolved).
- **W4.3** — Forfeit flow (admin-only dialog).
- **W4.4** — Report Result wizard Phase A (embed sport metadata forms per-team).
- **W4.5** — Report Result wizard Phase B + submit sequencing + partial-failure recovery (§6.4). Depends on gap §9 resolution for atomic vs 3-mutation path.
- **W4.6** — Confirm / Dispute dialogs. Admin override path.
- **W4.7** — `useGameLiveRefresh` hook + notification-driven `router.refresh()`.

### Wave 5 — Chat integration + calendar + polish

Dependencies: P1 (chat refactor if Path A).

- **W5.1** — Chat tab on League and Group pages (embedded `<EmbeddedConversation>` or link-out per §7.2/§7.3).
- **W5.2** — Archived-aggregate compose-disabled state.
- **W5.3** — Calendar subscribe modal per aggregate (§8.2). Depends on gap §13 (bootstrap token).
- **W5.4** — Settings → Calendar Sync (§8.3) with Rotate Token dialog + affected-aggregate enumeration.
- **W5.5** — User profile: LeaguesAndGroups section.
- **W5.6** — Discover page: Organizations tab.

### Wave 6 — Notifications + final polish

- **W6.1** — 17 new notification inline fragments in `notificationInlineFragments`. Payload shape per typename → i18n key.
- **W6.2** — `useSeasonLiveRefresh` hook for standings panel live-update.
- **W6.3** — `reportGameIssue` dialog on Game page.
- **W6.4** — Empty-state + loading-state audit across all routes.
- **W6.5** — Skills audit pass: `/web-design-guidelines` + `/vercel-react-best-practices` full sweep before ship.

### Critical path

P0 → W1.1–W1.4 → W2.1 → W2.2 → W4.1 → W4.4 → W4.5 → W4.6 — this is the minimum viable end-to-end that lets Rick create an Org, a League, a Season, a Team, schedule a Game, report a score, and see standings update. Everything else accelerates or polishes that path.

### Risk gates

Most of the prior risk gates have been retired — the backend resolved all seven Blockers by 2026-04-18. Remaining:

- **§4 reverse-cursor pagination** unverified — if Spring GraphQL can't do reverse cursors cleanly at implementation time, list queries that need ASC+backward pagination (upcoming schedule going further out) fall back to DESC-sort + client-reverse. Affects W1.3 scheduling lists at most; not a wave-blocker.
- **P1 chat refactor** scheduling — if the `<EmbeddedConversation>` extract isn't done in time for W5.1, that wave ships Path B (link to full chat) instead of embedded. Flag to the chat team before W3 kicks off so they have runway.

---

## 20. Skills Invoked

- **`/vercel-react-best-practices`** applied as review criteria for: server-vs-client boundaries (§1.1), server-action input validation (§5), parallel data fetching (§4.3, §14.2), serialization across the boundary (§1.3), stable callbacks + memoization (§14.4), bundle split points (§14.1).
- **`/web-design-guidelines`** applied as review criteria for: heading hierarchy (§12.1), ARIA + keyboard paths (§12.2, §12.3), `prefers-reduced-motion` (§12.4), color/contrast/semantics (§12.5), touch targets (§12.6), form error patterns (§12.7).

Both skills should be re-invoked by the implementation and adversarial-reviewer agents before writing / reviewing code.
