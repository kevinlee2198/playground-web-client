# UI Review — Playground Web Client

> Temporary working document, 2026-07-18. Compiled from a visual walkthrough of the running app
> (18 screenshots via the Playwright/MSW harness: light/dark, desktop/mobile 390px, signed-in/out)
> plus code-level audits of theming, site flow, and component patterns.

## Verdict

The app has a real, cohesive visual identity — not stock shadcn. The design-system foundation
(typography scale, form-field wrappers, `Empty`, `FieldError`, toasts) is strong. Most problems
are **adoption drift**: newer features (chat, stats forms, settings) bypass the good foundation.
A handful of concrete bugs on top.

### Identity summary (from `src/app/globals.css`, `src/app/[locale]/layout.tsx`)

- Warm cream/forest-green/terracotta OKLCH palette ("Ghibli" per source comments):
  bg `oklch(0.96 0.018 85)`, primary green `oklch(0.54 0.10 155)`, accent terracotta
  `oklch(0.60 0.12 45)`, radius `0.875rem`.
- Fonts: Nunito (body, `--font-sans`) + Quicksand (headings, `--font-heading`).
- Warm brown-tinted 4-level shadow system; per-sport accent token pairs (6 sports); `--live` token.
- Custom motion language: breathe / shimmer / score-pop / ptr-bounce with easing + duration scale,
  reduced-motion aware.
- Dark mode stays warm brown (hue 55) rather than generic gray. `next-themes`, class attribute,
  system default; toggle only in Settings › Display.
- shadcn style is **`base-vega`** on Base UI — CLAUDE.md says "default style" (stale; fix the doc).
- Customized primitives: button press effect + extra sizes (`button-variants.ts`), card ring
  elevation, pill badges, bespoke `typography.tsx` / `user-avatar.tsx`.

---

## 1. Concrete bugs (fix first)

1. **Mobile navbar collision.** The "Create Game" button renders on mobile and overlaps the logo
   (visible at 390px on `/games` and game detail). Root cause: `src/components/playground/navbar.tsx:47`
   passes `className: "hidden lg:inline-flex"` into `buttonVariants()` — a raw `cva` call with no
   `twMerge` — so the base `inline-flex` wins over `hidden` via stylesheet order.
   Fix: `cn(buttonVariants({ variant: "default" }), "max-lg:hidden")` or a `hidden lg:block`
   wrapper (the search bar at `navbar.tsx:37` already does this correctly).
   Side effect: mobile shows **three** create-game CTAs at once (broken navbar button + page
   button + green FAB).
2. **Profile tab race.** The tab bar's Profile tab points at `/` until the username resolves
   asynchronously; an early tap goes home instead of the profile (`src/components/playground/tab-bar.tsx`).
3. **Client/server validation contradictions (fail silently).**
   - Biography: client caps 1000 *words* (`src/components/profile/editable-biography.tsx:12`)
     vs server cap 500 *chars* (`src/app/[locale]/user/[username]/actions.ts:258`).
   - Display name: client only checks non-empty vs server `max(50)`.
4. **Settings "Saved" toasts lie.** games/notifications/privacy forms fire `toast.success` on
   no-op submits (`notifications-settings-form.tsx:44-47`, `games-settings-form.tsx:56-59`,
   `privacy-settings-form.tsx:54-57`). `FieldError` wiring in all settings forms is dead code —
   no validators attached — so server rejections surface only as a generic toast.
5. **Chat page** error-boundaried under default test mocks — likely a mock gap, but the dev
   overlay counted 3 client issues on that page; verify against the real backend.

## 2. Accessibility (highest-impact first)

1. **`navbar-search` combobox invisible to screen readers** (`src/components/search/navbar-search.tsx:98`):
   placeholder-only input (no `aria-label`, no `type="search"`), results list has no
   `role="listbox"`/`option`, no `aria-activedescendant`, no live region — despite full
   keyboard-highlight logic. The correct ARIA combobox already exists in
   `src/components/location/location-autocomplete.tsx:185-299`; port it.
2. **Keyboard-unreachable interactives** (`<div onClick>`, no role/tabIndex/key handler):
   `src/components/chat/reply-preview.tsx:27-33`, `src/components/notification/notification-item.tsx:269-277`.
3. **Silent error banners** (no `role="alert"`): `create-game-form.tsx:631`,
   `update-game-form.tsx:682`, `add-team-form.tsx:98`, 8/10 sport stats forms. Shared
   `FieldError` (`src/components/ui/field.tsx:177-226`) already does this right.
4. **Icon-only buttons missing `aria-label`**: `conversation-header.tsx:26,41`,
   `message-input.tsx:188` (send), `message-actions-menu.tsx:32`, `reply-preview.tsx:41`,
   `scoreboard/volleyball-score-form.tsx:206`, `scoreboard/pickleball-score-form.tsx:206`.
5. **No `aria-live` for incoming chat messages** (`message-list.tsx:180-247`); "new messages"
   pill is a plain button.
6. **Stats tables lack header semantics**: `TableHead` has no default `scope`
   (`src/components/ui/table.tsx:68`); player-name cells are `<td>` not `<th scope="row">`
   (e.g. `basketball-stats-table.tsx:253`). Affects all 10 stats tables + score tables.
7. **Duplicate `<h1>` per page**: navbar wordmark is `TypographyH1` on every page
   (`navbar.tsx:33`); profile/search render a second `<h1>` (`profile-header.tsx:85`,
   `editable-display-name.tsx:134`, `search/page.tsx:34`).
8. **Reduced-motion unsystematic**: ~24 `animate-spin` sites without `motion-reduce` guards
   (follow-button, game-infinite-list, invite/manage dialogs, activity-feed, search, chat…).
9. **Hover-only affordances**: `message-bubble.tsx:245-268` action menu + timestamp are
   `opacity-0 group-hover:opacity-100` — unreachable on touch, absent on focus.
10. **Focus not restored** after `mobile-search-overlay` closes (`mobile-search-overlay.tsx:80-107`).
11. `transition-all` in `button-variants.ts:4`, `badge.tsx:8`, `switch.tsx:19`, `tabs.tsx:61`,
    `navigation-menu.tsx:59,135` (anti-pattern; list properties explicitly).

## 3. Visual/UX findings (from screenshots)

- **Empty placeholder blocks** on About + Get Started: large blank beige rectangles where feature
  imagery should go. Biggest "unfinished" signal. (Copy there is genuinely charming — keep it.)
- **Game cards have no title** — the date is the dominant element; the game description never
  appears on cards; detail hero repeats the same date twice ("July 18, 2026 at 05:32 PM" in the
  headline and again in the meta row).
- **`/games` label collision** — top tabs (Discover / My Games) and inner toggle
  (All Games / My Games) reuse "My Games" for different concepts.
- **`/search` is bare** — heading + input + button, no empty-state guidance; contrast with good
  `Empty` usage elsewhere.
- **Brand mismatch**: amber `#F9B335` logo (`public/playground-logo.svg`) sits outside the
  green/terracotta token system. Either add amber as a real token or recolor the mark.
- **Layout width jumps** between routes: home/feed narrow-centered, settings left-aligned wide,
  profile leaves a large dead right column (Follow / Message / kebab stack vertically).
- **Privacy page mixes save models** — manual "Save changes" for visibility select + auto-save
  toggles on the same page ("Auto-saves" label helps but the split is confusing).
- About hero reuses the home headline "Where Friends Come to Play" (duplicate messaging);
  crown motif is awkwardly cropped at the right edge.
- Sport filter chips on mobile wrap awkwardly (orphan 6th icon); "Get Started →" link floats
  oddly right-aligned above the feed.

## 4. Consistency drift (systemic theme)

Three generations of code coexist:

- **Exemplary older components**: `follow-button.tsx` (`aria-pressed`, `sr-only` live status,
  undo toast), inline profile editors (optimistic + rollback, focus restore, keyboard save/cancel),
  `location-autocomplete.tsx` (textbook combobox), live-game announcer + `aria-live` scores,
  `notification-bell` (optimistic mark-as-read, race-safe rollback, WS + poll fallback).
- **Copy-paste-drifted stats forms**: two field idioms (hand-written `form.Field` vs `STAT_FIELDS`
  map); three section-heading treatments (h4 medium / h4 semibold / `TypographySmall`); only
  basketball has client validation — with hardcoded English (`basketball-stats-form.tsx:67,75,83`);
  tennis score form fully labeled while volleyball/pickleball skip labels.
- **Convention-free chat**: `message-input`, `create-chat-room-dialog` are raw `useState` (no
  TanStack Form/Zod), un-i18n'd `"Loading..."` ×3, no skeletons, no empty state in `message-list`,
  not optimistic; reconnect flashes full-screen "Loading…" (`conversation-view.tsx:152,398`).

Other splits:

- Two empty-state systems: `<Empty>` (games, game-history, notifications, search, chat-room-list)
  vs ad-hoc text (`discover-feed.tsx:334`, `blocked-users-list.tsx:65`, `follow-list-dialog.tsx:222`,
  `follow-requests-list.tsx:225`, `mobile-search-overlay.tsx:216`, `navbar-search.tsx:129`).
- `game-card` is a bespoke `<article>` (not shadcn `Card`); chat-room/notification/search rows each
  invent their own markup — no shared entity-row primitive.
- Follow state re-derived in four places with divergent optimism (`follow-button.tsx:37`,
  `follow-actions.tsx:65`, `profile-interactive-section.tsx:29`, `follow-list-dialog.tsx:162`);
  follower count doesn't sync into `FollowCounts` dialog.
- Destructive confirmations asymmetric: present for delete-game/media/message, remove-member,
  remove-picture, block, transfer/leave; **absent** for unblock (`follow-actions.tsx:97`,
  `blocked-users-list.tsx:22`), remove-follower (`follow-list-dialog.tsx:150`),
  decline-follow-request (`follow-requests-list.tsx:53`).
- Skeleton drift: `game/[id]/loading.tsx:83-100` re-inlines the stats skeleton;
  `follow-requests-list.tsx:198-209` hand-rolls `animate-pulse`.
- i18n leaks: basketball labels/messages, `"User"`/`"Edit"` across all 10 stats tables
  (`basketball-stats-table.tsx:252,289`), `add-team-form.tsx:80,91`, chat concatenated strings
  (`member-list-panel.tsx:127,155,277`, `reply-preview.tsx:24`, `message-button.tsx:32,35`),
  English `aria-label` in `recent-searches-list.tsx:59`.
- `create-game-form`/`update-game-form` each inline ~90 duplicate lines of advanced-options
  Select markup (create `:346-536`, update `:398-588`) instead of `FormSelectField`.
- `display-settings-form.tsx:63` has no pending/disabled state; settings pages use three different
  interaction models (sync / explicit save / auto-save + save) behind identical shells.

## 5. Flow & IA notes

- Route map is healthy: no orphan pages, no broken internal links. `/settings/blocked` is now a
  redirect into Privacy (docs/ux-walkthrough.md is stale on this).
- Discoverability gaps: `/resource/*` pages are footer-only; `/search` has no standing nav entry;
  settings reachable only via avatar dropdown.
- Missing `loading.tsx` on `/`, `/chat`, `/search`, `/game` (create); single error boundary at
  the `[locale]` level covers everything (no per-route boundaries).
- Nice touches: sign-in returns to the current page (`callbackURL`); private games redirect anon
  users to `/`; profile→chat bridge via `createDirectMessage` → `/chat?room={id}`.

## 6. Suggested starting order

1. Navbar mobile `hidden` bug (`navbar.tsx:47`) — one-line fix, visible on every mobile page.
2. Port `location-autocomplete` ARIA pattern into `navbar-search`.
3. Add `role="alert"` to game-form / stats-form error banners (or route through `FieldError`).
4. Real content/images for About + Get Started placeholder blocks.
5. Give game cards a title line; de-duplicate the date on the detail hero.
6. Reconcile biography/display-name client validation with server rules.
7. Fix settings no-op success toasts + attach real validators.
8. Sweep: `aria-label` on icon buttons, `motion-reduce` guards, i18n leaks, `th scope`.
