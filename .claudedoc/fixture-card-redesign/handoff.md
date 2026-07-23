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

## Open items (unchanged priority order)

- **Visual screenshot pass — still never done; biggest gap.** The new card has not been
  rendered by a human or screenshot once. Reviewer computed dark-mode pickleball/football chip
  contrast at borderline ~4.5:1 (spec §6 flagged the same). Use the Playwright-harness
  screenshot trick (see `docs/ui-review.md` provenance): upcoming/live/final, light+dark,
  390px + desktop, plus game-detail hero; add a 2-participant fixture to see matchup/scores/crown.
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
