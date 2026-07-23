# Design: Fixture Card Redesign

Status: approved direction, 2026-07-18. Decisions made interactively against rendered mocks
(session scratchpad `fixture-cards.html`, `color-volumes.html`).

## Summary

Game cards move from date-centric to matchup-centric ("fixture cards"). The existing visual
identity (cream/green/terracotta OKLCH palette, Nunito/Quicksand, 14px radius, warm shadows,
breathing dot, score-pop) is untouched — this is composition, not a re-theme.

### Approved decisions

1. **Sport color volume: full wash + watermark.** Every fixture card gets a sport-tinted
   gradient wash and an oversized watermark of the sport icon. (Considered and rejected:
   chips-only, icon-block-only. Known tradeoff, accepted: single-sport feeds render many
   same-color cards.)
2. **Headline: title, else matchup.** Card leads with the game's title when set, otherwise
   the matchup line ("Ballers vs Bricklayers"). Date demotes to metadata everywhere.
3. **Amber `#F9B335` (the logo color) becomes the celebration token** — winner marks, MVP,
   streaks, rating climbs. Never on buttons or chrome.
4. **Playground Ratings (Elo) are competitive-context-only** (future work; see §8). Games get
   a casual/competitive flag at creation; only competitive surfaces show rating chips.

## Scope

| Component | Change |
| --- | --- |
| `src/components/game/game-card.tsx` | Rebuild to fixture-card anatomy (§4). Used by feed, discover, my-games, profile history — redesign lands everywhere at once. |
| `src/components/game/sport-accent-strip.tsx` | Superseded by the wash; remove usages on the card (keep the component until all call sites migrate). |
| `src/components/game/game-detail-hero.tsx` | Adopt the wash + watermark treatment; de-duplicate the date (currently shown twice in the hero). |
| `src/app/globals.css` | Add celebration tokens (§3). |
| `src/components/game/score/game-score.tsx` | Add winner crown mark for COMPLETE games (§4.3). |
| Sport icon SVGs `public/sports/*.svg` | Reused as watermarks (inline, `aria-hidden`). |

Non-goals: navbar/tab-bar changes, marketing pages, chat, settings, compact feed-row variant
(nice-to-have follow-up, not required for v1), leagues/ratings UI (§8).

## 3. Tokens

Add to `globals.css` (both `:root` and `.dark`, exposed via `@theme inline`):

```css
/* Celebration — the logo amber, reserved for wins/achievements */
--celebrate: #f9b335;                     /* same value both themes */
--celebrate-foreground: oklch(0.45 0.09 75);   /* light: readable amber-brown ink */
/* .dark */
--celebrate-foreground: #f9b335;               /* dark: amber itself is the ink */
```

Wash recipe (per sport, using existing tokens — no new sport tokens needed):

```
background: linear-gradient(150deg, var(--sport-{sport}) 0%, var(--card) 58%);
```

Watermark: the sport's SVG, ~150px, positioned overflowing the bottom-right corner
(`right:-26px; bottom:-30px`), `color: var(--sport-{sport}-foreground)`, opacity 0.09 (light)
— verify legibility at 0.09 in dark mode, expect 0.10–0.12. `aria-hidden="true"`,
`pointer-events-none`. Card keeps `overflow-hidden` (already present).

## 4. Card anatomy

Top-to-bottom. Existing machinery (GameScore, BreathingDot, FollowingAvatars, status badges,
distance formatting) is reused, not rewritten.

```
┌─────────────────────────────────────────────┐
│ [sport chip: icon + "BASKETBALL · 5V5"]  [status] │  head row
│ Headline (title else matchup)                │  Quicksand 700
│ [score block — live/final only]              │  GameScore, score enlarged
│ location · distance          [avatars/going] │  meta row
└──────────────────── watermark, wash ────────┘
```

- **Head row**: sport chip = icon + uppercase Quicksand label in `--sport-*-foreground`
  (replaces `SportBadge` + format `Badge` pair on the card; keeps invited/visibility badges).
  Status right-aligned: date-time for SCHEDULED ("Sat · 5:30 PM" short form), `LIVE · <period>`
  with BreathingDot for IN_PROGRESS, `FINAL` for COMPLETE.
- **Headline** (Quicksand, ~19px/700): `title ?? matchup`. Matchup built from the first two
  participants via `getParticipantName` (already implemented with the unnamed-team fallback,
  `game-card.tsx:82-85`). If neither exists (no title, <2 participants): sport + format label.
- **Chip de-dup rule (decided 2026-07-22, not yet implemented)**: when the headline is the
  sport+format fallback, the chip drops its text and shows the icon only — otherwise the chip
  and headline repeat the same string verbatim (confirmed redundant in the screenshot pass;
  see handoff.md). Chip text returns whenever the headline says something the chip doesn't
  (matchup now, title later). The icon stays `aria-hidden`; the visible headline provides the
  accessible sport name. Untitled <2-participant games remain the majority of discover cards
  even after `title` ships (title will be optional), so this rule is permanent, not a stopgap.
  Rationale over alternatives: suppressing the *headline* instead would hollow out the card —
  the bold headline is the fixture card's visual anchor; the sport stays announced three ways
  (icon, wash, headline). Deferred, separate decision: venue name (`location.name`) as a
  headline tier for untitled games — an IA change (fourth fallback tier, nullable location),
  not bundled into the de-dup fix.
- **Backend dependency**: `GameNode` has no `title` — only nullable `description`
  (`src/lib/types/game.ts:253`). v1 ships with matchup-first (`title` branch dormant);
  a short `title` field is requested backend-side and wired when available. Do NOT use
  `description` as the headline (free text, unbounded).

### 4.1 Upcoming (SCHEDULED)

Quiet card. Wash + watermark, headline, date/location in metadata position. The current
dashed border and centered big-date block are removed. Date format stays `useFormatter`-based.

### 4.2 Live (IN_PROGRESS)

- 2px border `--live` (upgrade from current `ring-1 ring-live/12`), `shadow-card-hover`.
- Score is the card's largest element: Quicksand 700, ~30px, `tabular-nums` (GameScore already
  renders per-sport scores; enlarge type in card context). Keep existing
  `aria-live="polite" aria-atomic` (`game-card.tsx:149-150`).
- Keep BreathingDot in status; drop the bottom glow bar (`game-card.tsx:205-207`) — the border
  replaces it.

### 4.3 Final (COMPLETE)

- Status `FINAL`; winner row gets the amber crown mark (small inline SVG, `--celebrate`,
  `aria-label` on the mark or sr-only "Winner" text — not color-only).
- Loser row de-emphasized: `--muted-foreground`, weight 600 vs 700.
- Winner determination: derive from existing GameScore data per sport; if scores are tied or
  unavailable, omit the crown (never guess).
- Date renders as relative day when recent ("Yesterday") via `next-intl` relative formatting,
  falling back to the short date.

## 5. Game detail hero

Same grammar at full volume: wash + larger watermark on `game-detail-hero.tsx`. Fix the
duplicated date (headline date + identical meta-row date). Headline mirrors card logic
(title else matchup); description becomes a subtitle line.

## 6. Accessibility requirements

- Watermark and wash are decorative only; sport remains identified by the chip's text label.
- Winner crown paired with text (sr-only "Winner") — not color-only.
- Live score block keeps `aria-live="polite"`; BreathingDot already has
  `motion-reduce:animate-none`.
- Score/date numerals: `tabular-nums`.
- Contrast: chip text (`--sport-*-foreground`) must clear 4.5:1 against the wash's darkest
  region (the token pairs were designed together; verify football/pickleball in dark mode).
- Card error/empty behavior unchanged.

## 7. Implementation plan

1. Tokens: add `--celebrate` pair to `globals.css` + `@theme inline`.
2. Extract a `SportWash`/watermark wrapper (or bake into `game-card.tsx` — prefer local until
   a second consumer exists per no-speculative-abstraction rule).
3. Rebuild `game-card.tsx` states: upcoming → live → final. Reuse GameScore/status machinery.
4. Winner crown in `game-score.tsx` for COMPLETE.
5. Apply hero treatment + date de-dup in `game-detail-hero.tsx`.
6. Remove `SportAccentStrip` usage from the card.
7. Update Playwright specs that assert on the old card (date-as-heading assertions in
   `tests/pages/home.spec.ts`, `discover.spec.ts`, `games-list.spec.ts`, etc.) and unit tests.
8. Verify: `npm run lint`, `npm test`, chromium Playwright run; visual pass via the test-harness
   screenshot approach (light + dark, 390px + desktop).

## 8. Forward-compatibility (not in this build)

- **Leagues**: league games are fixture cards whose headline is always the matchup; standings
  tables use tabular numerals, viewer's row tinted `--primary` at ~9%, leader crowned amber.
- **Playground Rating (Elo)**: rating chips reuse sport token pairs (tinted bg + sport fg +
  numeral). Visible only in competitive contexts: matchmaking search, league pages, competitive
  game surfaces. Requires a casual/competitive flag on game creation (radio-card pattern like
  visibility/stat-entry). "Elo" is mechanism naming, not UI naming.
- The card head row reserves no space for ratings — chips attach to player rows/search results,
  not fixture cards.
