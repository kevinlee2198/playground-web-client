# Handoff: Fixture Card Redesign (updated 2026-07-22)

Branch: **`0099-fixture-card-redesign`**. Six commits landed; working tree clean.
Previous handoff (2026-07-18, pre-commit state) is in git history at `95fa0db`.

## Committed

| Commit | What |
| --- | --- |
| `1b7be58` | feat(design): wash + celebrate tokens, contrast-retuned sport foregrounds, wash-pulse keyframes |
| `fe448ac` | feat(game): WinnerMark crown + `showWinner` plumbing through all score components |
| `01cfb19` | feat(game): fixture-card rebuild + detail-hero wash/watermark |
| `139c1c9` | test(game): card/hero tests rewritten for fixture anatomy |
| `95fa0db` | docs: redesign spec + mocks, `docs/ui-review.md`, `docs/ux-walkthrough.md` |
| (HEAD) | refactor(game): extract ParticipantName from score components |

Verification of the first five commits (2026-07-19): `npx tsc --noEmit` clean, `npm run lint`
clean, vitest **723/723**, Playwright chromium **112 passed / 1 skipped (pre-existing) /
0 failed**.

Pre-commit review of `01cfb19` (per the user's standing rule, both subagents ran):

- **Reviewer's important finding — fixed**: upcoming card's `aria-label` ("Game not yet
  started") overrode the visible date, hiding the start time from screen readers entirely
  (meta row also omits the date for upcoming). Accessible name is now
  `"Game not yet started, Mar 10 · 07:00 PM"`; test asserts it.
- **Also fixed**: `touch-action-manipulation` → `touch-manipulation` (was a silent no-op;
  not a real Tailwind utility).
- **Simplifier applied**: `sportFormatLabel` de-dup; status block flattened to `if/else`
  producing a `statusIndicator: ReactNode`; simple/tennis score files reformatted to match
  pickleball/volleyball.

### ParticipantName extraction (HEAD commit)

User-approved extraction of the winner-crown `<p>` block duplicated 8× across the four score
components (originally proposed by the simplifier):

- **New** `src/components/game/score/participant-name.tsx` — props `name`, `size` ("sm"|"lg",
  moves the old `nameClass` mapping inside), `isWinner` (crown), `isLoser` (muted).
- `simple|tennis|pickleball|volleyball-score.tsx` — both `<p>` blocks replaced with
  `<ParticipantName name={...} size={size} isWinner={showWinner && aWins} isLoser={showWinner && bWins} />`
  (A/B swapped for side B); `WinnerMark` import and `nameClass` const removed from all four;
  simple-score also dropped its now-unused `cn` import.

Verified 2026-07-22: `npx tsc --noEmit` clean, `npm run lint` clean, vitest **723/723**,
Playwright chromium **112 passed / 1 skipped / 0 failed** — identical to the pre-extraction
baseline. Reviewer-only pre-commit pass (simplifier skipped since the diff was
simplifier-proposed): clean — byte-identical markup confirmed, A/B prop wiring correct, no
orphaned imports. Non-blocking note: component keeps the raw `<p>` (not Typography), carried
forward deliberately for byte-identical parity.

## Visual screenshot pass — DONE 2026-07-22

Temp Playwright spec (deleted after the run) rendered all 6 sports across upcoming/live/final
on `/en/games` plus the game-detail hero, light+dark × 390px+desktop (8 shots, reviewed by
Claude; user has not seen them — regenerate on request). Results:

- **Rendering: clean everywhere.** Washes, watermarks, crowns, muted losers, live borders,
  set/game pills, status corners all render as spec'd in both themes and widths. No layout
  breakage. Live-card wash pulse peaks at 0.9 opacity — peak state looks good, not
  overpowering.
- **Chip contrast: passes AA, no token change required.** Computed from the OKLCH tokens at
  the worst case (chip over the wash's from-color): dark 4.61–4.99:1 (lowest is baseball,
  not pickleball/football as previously estimated), light 4.66–4.76:1; over the plain card
  6.6–7.2:1 dark. Optional: bump dark fg lightness ~+0.02 for margin.
- **Finding — headline duplication (design decision needed):** cards without 2 participants
  show the chip ("BASKETBALL · 5V5") directly above an identical headline ("Basketball ·
  5v5") — the sport+format fallback repeats the chip text verbatim. Most upcoming/discover
  cards will look like this until the backend `title` field lands.
- **Minor — FINAL vs FINALIZED:** completed cards show "FINAL" (COMPLETE) but "FINALIZED"
  (FINALIZED status) in the corner. Two labels for what reads as the same viewer-facing
  state.
- Next dev overlay "1 Issue" during the run = graphql-ws WebSocket to `ws://localhost:8080`
  refused (no backend in harness; MSW can't intercept WS). Environment artifact, not a bug.
- The known mobile-navbar Create-Game-over-logo bug is plainly visible in the dark-mobile
  shots (separate branch, tracked below).

## Open items (unchanged priority order)
- **Orphan cleanup — awaiting user decision.** `SportAccentStrip` and
  `getSportGradientClass`/`gradientClass` have zero references (LSP findReferences:
  declaration-only). Why: the redesign replaced their only call sites — the strip was the old
  card's top accent, the gradient was the old hero's flat tint; both superseded by the wash.
  User asked *why* but has **not** said delete. If approved: small `chore` commit.
- Mobile navbar `hidden lg:inline-flex` bug (`navbar.tsx:47`) — one-liner, **separate branch**.
- Backend asks queued: short `title` field on Game (headline branch is commented in
  game-card.tsx/hero); later casual/competitive flag.
- Dependency upgrades (Next 16.2.10, Tailwind 4.3.3, Base UI 1.6, next-intl 4.13, better-auth
  1.6 — details in the 2026-07-18 handoff at `95fa0db`) — nothing blocking; separate
  housekeeping branch.
- Compact feed-row variant — deliberately out of v1 scope.
