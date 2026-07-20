# Handoff: Fixture Card Redesign (2026-07-18)

Session ended mid-implementation. Branch: **`0099-fixture-card-redesign`** (off `main`, nothing
committed yet — all changes are in the working tree).

## Context

Full session arc: comprehensive UI review (findings in `docs/ui-review.md`, untracked) →
interactive design exploration with rendered mocks → approved direction → spec (`design.md`,
same folder) → implementation started. The visual mocks that drove the decisions are preserved
in `mocks/` (self-contained HTML, fonts embedded — open directly in a browser; they honor
OS dark mode).

Approved decisions (also in auto-memory `project_fixture_card_direction.md`):

1. Fixture cards with **full sport wash + watermark** (volume 3 of the three mocked options)
2. Headline = **title, else matchup** (no `title` field in schema yet → matchup-first shipped,
   title branch documented in a comment; do NOT use `description` as headline)
3. **Amber `#F9B335` = celebration token** (winner crown etc.), never chrome
4. Future: IM leagues + "Playground Rating" (never "Elo" in UI), **competitive contexts only**,
   casual/competitive flag at game creation
5. Mid-implementation addition (user asked about gradient motion): subtle **wash breathing on
   live cards only** — opacity-only overlay, `animate-wash-pulse`, `motion-reduce` guarded

## Implementation state (spec §7 plan)

| Step | Status |
| --- | --- |
| 1. Tokens: `--celebrate`/`--celebrate-foreground` (light+dark) + `@theme` exposure; `wash-pulse` keyframes + `--animate-wash-pulse`; `washClass` per sport + `getSportWashClass()` in `constants.ts` | ✅ done |
| 2. `game-card.tsx` rebuilt to fixture anatomy (head row: sport chip + status corner; headline/score block; meta row; wash + watermark; live = 2px `--live` border + wash-pulse overlay; removed `SportAccentStrip`, `SportBadge` usage, dashed upcoming border, bottom glow, big-date hero) | ✅ done |
| 3. Winner crown: `score/winner-mark.tsx` (new); `showWinner` prop through `GameScore` → Simple/Tennis/Pickleball/Volleyball score components; loser name muted; card passes `showWinner={!isLive}`; i18n key `game.winner` added | ✅ done |
| 4. `game-detail-hero.tsx`: wash + size-52 watermark; meta-row date hidden for SCHEDULED (GameHeroContent already shows it) | ✅ code done, **not visually verified** |
| 5. Tests | ❌ **not started** — see below |

### Verification so far

- `npx tsc --noEmit` ✅ clean (after fixing a scripted-edit syntax bug in pickleball/volleyball
  score components — stray commas, already fixed)
- `npm run lint` ✅ clean
- **Not run:** `npm test` (vitest), Playwright, any visual check. The new card has never been
  rendered. Do the screenshot pass before trusting the wash/watermark/live-border styling —
  especially `bg-linear-150 from-sport-* from-0% to-card to-58%` (Tailwind v4.1.18 syntax,
  believed correct but unverified in this repo).

## Next steps (in order)

1. **Visual check first**: run the Playwright-harness screenshot trick (see `docs/ui-review.md`
   provenance — a temp spec in `tests/` using `tests/fixtures/test-fixtures.ts` fixtures,
   `page.screenshot` to a scratch dir). Check: upcoming/live/final cards, light+dark, 390px +
   desktop, game-detail hero. Mock data note: default MSW fixtures produce 0–1 participants
   (headline fallback path) — add a 2-participant game fixture to see matchup + scores + crown.
2. Fix whatever the screenshots reveal (likely candidates: wash too strong/weak in dark mode,
   watermark opacity, chip contrast for football/pickleball in dark — spec §6 flags these).
3. **Unit tests**: `npm test` — look for game-card tests in `__tests__/`.
4. **Playwright**: old-card assertions will fail — known: `game-detail.spec.ts` uses
   `getByLabel(/basketball/i)` (SportBadge's `role="img"` is gone from the card; the chip shows
   the sport name as visible text — assert on text instead). Sweep `tests/pages/*.spec.ts` for
   date-as-heading and accent-strip assertions. Capture output to a file per CLAUDE.md.
5. Commit per repo convention (logically grouped; run `pr-review-toolkit:code-simplifier` +
   `code-reviewer` first — see feedback memory). Suggested grouping: (a) tokens + constants,
   (b) score components + winner mark, (c) game-card + hero, (d) test updates.

## Files touched (uncommitted)

- `src/app/globals.css` — celebrate tokens ×2 themes, `@theme` colors, `wash-pulse` keyframes + animation
- `src/lib/constants.ts` — `washClass` ×6 sports, `getSportWashClass()`
- `src/components/game/game-card.tsx` — full rewrite
- `src/components/game/game-detail-hero.tsx` — wash, watermark, date de-dup
- `src/components/game/score/winner-mark.tsx` — new
- `src/components/game/score/game-score.tsx` + `simple|tennis|pickleball|volleyball-score.tsx` — `showWinner`
- `messages/en.json` — `game.winner`
- `.claudedoc/fixture-card-redesign/` — `design.md`, `mocks/`, this file
- **Not deleted**: `src/components/game/sport-accent-strip.tsx` (now unused — leave until
  reviewer confirms, per surgical-change rule; `gradientClass` in constants is also now unused
  by the hero but may have other consumers — check before removing)

## Open questions / punch list

- `docs/ui-review.md` still has the independent bug list — most importantly the **mobile navbar
  `hidden lg:inline-flex` bug** (`navbar.tsx:47`, cva doesn't twMerge — button shows on mobile
  over the logo). One-line fix, separate commit/branch; not part of this redesign.
- Compact feed-row variant (mock's "feed scan test") — deliberately out of v1 scope.
- Backend asks queued: short `title` field on Game; later casual/competitive flag.

## Changelog check (user asked mid-session; answered for the record)

Installed → latest as of 2026-07-18: next `16.1.6` → 16.2.10; tailwindcss `4.1.18` → 4.3.3;
`@base-ui/react` `1.3.0` → 1.6.0; next-intl `4.8.2` → 4.13.2; better-auth `1.4.18` → 1.6.23.
**Nothing blocking this branch.** Notables: Tailwind 4.1.3+ interpolates gradients in OKLAB by
default (fine for the washes); Base UI 1.5 has big popup perf wins + one breaking rename
(OTPField `sanitizeValue`→`normalizeValue` — unused here); shadcn shipped a chat components
suite (June 2026) worth evaluating when tackling the chat cleanup from `docs/ui-review.md`.
Upgrades are all low-risk but belong on a separate housekeeping branch.
