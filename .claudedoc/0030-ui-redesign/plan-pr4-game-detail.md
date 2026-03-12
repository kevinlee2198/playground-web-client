# PR4: Game Detail Page — Ghibli Tranquil Redesign

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the game detail page to match the Ghibli Tranquil design spec: a hero scoreboard (Server Component) with sport-themed gradient, sport emoji pill, centered enlarged score block, compact inline action buttons, and shape-accurate loading skeleton.

**Architecture:** The current game detail page has a flat layout: back link → header (title + button bar) → scoreboard card → schedule card → participants → media → box scores. The redesign splits this into: a Server Component hero (gradient wrapper, sport info, score display, metadata), a refactored Client Component score editor (extracted from the hero as a client island for edit mode), and a compact inline action bar. Score display components (`SimpleScore`, `TennisScore`) gain a `size` prop to render at hero scale. The back link stays as a simple `<Link href="/games">` (design doc Section 4 says "Simple ← Back link"). The page layout follows the design doc's narrative flow.

**Tech Stack:** React Server + Client Components, Tailwind CSS v4 with existing OKLCH tokens and sport-specific CSS variables, Lucide icons, next-intl (server: `getTranslations`, client: `useTranslations`), existing `GameScore`/`SimpleScore`/`TennisScore` from PR3, existing motion/shadow tokens from `globals.css`

---

## Context

PRs 1-3 established design tokens, navigation (tab bar, FAB, skip nav), and game cards. The game detail page is Section 4 of the design doc — the page users navigate TO from game cards. It's currently unstyled relative to the new Ghibli Tranquil aesthetic: plain card-based layout, a wide button bar header, and generic skeleton loading. This PR brings it in line with the warm, narrative-flow design established in the cards.

**What changes:**
- New hero scoreboard Server Component (the visual centerpiece)
- Score editor refactored as a client island inside the hero (with focus management)
- Score components gain size variant for hero scale
- Action buttons refactored from wide bar to compact inline row
- Page layout restructured to narrative flow
- Shape-accurate loading skeleton
- New i18n keys

**What stays the same:**
- Score edit forms (BasketballScoreForm, FootballScoreForm, TennisScoreForm) — unchanged
- GameParticipants component — unchanged (visual polish is a future PR)
- GameBoxScores component — unchanged
- GameMediaGallery component — unchanged
- All dialogs (delete, update, manage editors) — unchanged
- Back link stays as `<Link href="/games">` — just restyled

**Review-driven decisions (from adversarial + simplifier reviews):**
- Hero is a Server Component with a client island for score editing — reduces client JS bundle (Vercel React best practices: "Default to Server Components")
- No `GameDetailBack` component — `document.referrer` is unreliable in SPAs, design doc says "simple back link"
- No dropdown menu for actions — hides common actions, design doc says "inline pencil icons". Keep inline buttons, restyle compactly
- Focus management added for edit mode transitions (WCAG, addendum Section 20)
- Hero handles <2 participants and no-score gracefully
- Dark mode hero gradient uses higher opacity (`dark:bg-sport-{sport}/15`)
- One hero background style + live modifier — dashed-border upcoming is a card idiom, not a page idiom

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/components/game/score/simple-score.tsx` | Add `size?: "sm" \| "lg"` prop for hero-scale rendering |
| Modify | `src/components/game/score/tennis-score.tsx` | Add `size?: "sm" \| "lg"` prop for hero-scale rendering |
| Modify | `src/components/game/score/game-score.tsx` | Pass `size` prop through to sport-specific components |
| Create | `src/components/game/game-detail-hero.tsx` | **Server Component** — hero wrapper: gradient, sport info, metadata. Renders `GameScoreBlock` client island |
| Create | `src/components/game/game-score-block.tsx` | **Client Component** — score display (GameScore size="lg") + edit toggle + score forms + focus management |
| Create | `src/components/game/game-detail-actions.tsx` | **Client Component** — compact inline action buttons (start/end + edit/editors/delete) with dialogs |
| Modify | `src/app/[locale]/game/[id]/page.tsx` | Restructure layout with hero, action bar, narrative flow |
| Modify | `src/app/[locale]/game/[id]/loading.tsx` | Shape-accurate hero skeleton |
| Modify | `messages/en.json` | Add new i18n keys |
| Create | `__tests__/components/game/game-detail-hero.test.tsx` | Tests for hero (server component rendering) |
| Create | `__tests__/components/game/game-score-block.test.tsx` | Tests for score block (edit toggle, focus management) |
| Create | `__tests__/components/game/game-detail-actions.test.tsx` | Tests for action bar |
| Delete | `src/components/game/game-detail-header.tsx` | Replaced by hero + actions |
| Delete | `src/components/game/game-scoreboard.tsx` | Replaced by `GameScoreBlock` |
| Delete | `src/components/game/scoreboard/basketball-score-display.tsx` | Dead code — only imported by deleted GameScoreboard |
| Delete | `src/components/game/scoreboard/football-score-display.tsx` | Dead code |
| Delete | `src/components/game/scoreboard/tennis-score-display.tsx` | Dead code |

**Components reused as-is:**
- `src/components/game/sport-emoji-pill.tsx`
- `src/components/game/breathing-dot.tsx`
- `src/components/game/score/game-score.tsx` (with new `size` prop)
- `src/components/game/scoreboard/*-score-form.tsx` — all score forms unchanged

---

## Task 1: Add size variant to score display components

**Files:**
- Modify: `src/components/game/score/simple-score.tsx`
- Modify: `src/components/game/score/tennis-score.tsx`
- Modify: `src/components/game/score/game-score.tsx`

- [ ] **Step 1: Update `GameScore` to accept and pass `size` prop**

```tsx
interface GameScoreProps {
  sportType: SportType;
  participants: GameParticipant[];
  statusPill?: ReactNode;
  size?: "sm" | "lg";
}

export function GameScore({ sportType, participants, statusPill, size = "sm" }: GameScoreProps) {
  // pass size to SimpleScore and TennisScore in each case
}
```

- [ ] **Step 2: Update `SimpleScore` with size-dependent classes**

Add `size?: "sm" | "lg"` prop (default `"sm"`). Size-dependent classes:
- Names: `"sm"` → `text-sm`, `"lg"` → `text-base sm:text-lg`
- Scores: `"sm"` → `text-3xl`, `"lg"` → `text-5xl sm:text-6xl`

- [ ] **Step 3: Update `TennisScore` with size-dependent classes**

Same pattern. Additionally scale set score pills: `"sm"` → `text-xs px-2 py-0.5`, `"lg"` → `text-sm px-3 py-1`.

- [ ] **Step 4: Run tests**

```bash
npm test -- --run __tests__/components/game/
```

Existing game card tests pass since default `size="sm"` preserves current behavior.

- [ ] **Step 5: Commit**

```bash
git add src/components/game/score/
git commit -m "feat(score): add size variant to score display components for hero/card reuse"
```

---

## Task 2: Add i18n keys

**Files:**
- Modify: `messages/en.json`

- [ ] **Step 1: Add new keys under `game.detail`**

```json
{
  "game": {
    "detail": {
      "backToGames": "Back to Games",
      "hero": {
        "scheduled": "Scheduled for"
      }
    }
  }
}
```

Most keys already exist (`game.status.*`, `game.actions.*`, `sports.*`, `sportSubtypes.*`). Only add genuinely new ones. No `noScores` key — `GameScore` renders `"-"` for missing scores.

- [ ] **Step 2: Commit**

```bash
git add messages/en.json
git commit -m "feat(i18n): add game detail hero keys"
```

---

## Task 3: Create score block client island

**Files:**
- Create: `src/components/game/game-score-block.tsx`
- Create: `__tests__/components/game/game-score-block.test.tsx`

This is the client island rendered inside the Server Component hero. It handles score display, edit toggle, and score forms.

- [ ] **Step 1: Write tests**

Key test cases:
- Renders `GameScore` with `size="lg"` when game has ≥2 participants with scores
- Shows "No scores yet" fallback when `GameScore` returns null (both metadata null)
- Shows "Not enough participants" when <2 participants
- Shows edit pencil button when `canEdit` is true (viewerGameRole set + game is IN_PROGRESS or COMPLETE)
- Does NOT show edit button when `canEdit` is false
- Toggles to score form when edit pencil is clicked
- **Focus management**: on edit activation, first form input receives focus
- **Focus management**: on save/cancel, focus returns to pencil button
- Applies `aria-live="polite"` and `aria-atomic={true}` when game is live

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run __tests__/components/game/game-score-block.test.tsx
```

- [ ] **Step 3: Implement component**

```tsx
// game-score-block.tsx
"use client";

import { GameScore } from "@/components/game/score/game-score";
import { Button } from "@/components/ui/button";
import { GameStatus, SportType } from "@/lib/constants";
import type { GameDetail } from "@/lib/types/game";
import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useEffect } from "react";
import { BasketballScoreForm } from "./scoreboard/basketball-score-form";
import { FootballScoreForm } from "./scoreboard/football-score-form";
import { TennisScoreForm } from "./scoreboard/tennis-score-form";

interface GameScoreBlockProps {
  game: GameDetail;
}

export function GameScoreBlock({ game }: GameScoreBlockProps) {
  const t = useTranslations();
  const [isEditing, setIsEditing] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);

  const participants = game.participants.edges.map((e) => e.node);
  const isLive = game.gameStatus === GameStatus.IN_PROGRESS;
  const canEdit = game.viewerGameRole != null &&
    (game.gameStatus === GameStatus.IN_PROGRESS || game.gameStatus === GameStatus.COMPLETE);

  // Focus management: move focus to form on edit, back to pencil on save/cancel
  useEffect(() => {
    if (isEditing && formContainerRef.current) {
      const firstInput = formContainerRef.current.querySelector("input");
      if (firstInput) requestAnimationFrame(() => firstInput.focus());
    }
    if (!isEditing && editButtonRef.current) {
      // Only refocus if we were previously editing (not initial render)
      // This is handled by the handleSuccess/handleCancel callbacks
    }
  }, [isEditing]);

  const handleSuccess = () => {
    setIsEditing(false);
    requestAnimationFrame(() => editButtonRef.current?.focus());
  };
  const handleCancel = () => {
    setIsEditing(false);
    requestAnimationFrame(() => editButtonRef.current?.focus());
  };

  if (participants.length < 2) {
    return (
      <p className="text-center text-sm text-muted-foreground py-4">
        {t("game.scoreboard.noParticipants")}
      </p>
    );
  }

  // ... render GameScore size="lg" with status pill, or score form when editing
  // Wrap in aria-live="polite" aria-atomic={true} when isLive
  // Edit pencil button (min-h-11 min-w-11 for 44px touch target)
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --run __tests__/components/game/game-score-block.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/game/game-score-block.tsx __tests__/components/game/game-score-block.test.tsx
git commit -m "feat(game-detail): add score block client island with edit toggle and focus management"
```

---

## Task 4: Create hero scoreboard Server Component

**Files:**
- Create: `src/components/game/game-detail-hero.tsx`
- Create: `__tests__/components/game/game-detail-hero.test.tsx`

The hero is a **Server Component** — no `"use client"` directive. It uses `getTranslations` and `getFormatter` from `next-intl/server`. The only client interactivity (score editing) is handled by the `GameScoreBlock` client island rendered inside it.

- [ ] **Step 1: Write tests**

Key test cases:
- Renders sport emoji pill and subtype badge (centered)
- Renders status pill with correct label per game status
- Renders `GameScoreBlock` for IN_PROGRESS and COMPLETE games
- Renders date prominently for SCHEDULED (no score block)
- Renders venue and date metadata
- Shows breathing dot on status pill for live games
- Applies sport-themed gradient background with `dark:` higher opacity
- Live games: warmer background + terracotta ring

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement hero component**

```tsx
// game-detail-hero.tsx — NO "use client" directive (Server Component)

import { BreathingDot } from "@/components/game/breathing-dot";
import { GameScoreBlock } from "@/components/game/game-score-block";
import { SportEmojiPill } from "@/components/game/sport-emoji-pill";
import { Badge } from "@/components/ui/badge";
import { TypographyMuted } from "@/components/ui/typography";
import { GameStatus, getSubtypeFromMetadata } from "@/lib/constants";
import type { GameDetail } from "@/lib/types/game";
import { cn } from "@/lib/utils";
import { Calendar, MapPin } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

interface GameDetailHeroProps {
  game: GameDetail;
  locationText: string | null;
  locale: string;
}

export async function GameDetailHero({ game, locationText, locale }: GameDetailHeroProps) {
  const t = await getTranslations();
  const format = await getFormatter();
  // ...
}
```

**Layout (top to bottom):**
1. Sport emoji pill + subtype badge (centered)
2. Score block (`<GameScoreBlock>` client island) or upcoming date display — with status pill
3. Venue + date metadata (centered, muted)

**Background treatment:**
- Base: rounded-3xl with sport-themed gradient at low opacity (`bg-sport-{sport}/5 dark:bg-sport-{sport}/15`)
- Live modifier: add `ring-1 ring-live/12` and slightly warmer background (`bg-secondary/80`)
- Upcoming: same base style, no special treatment (dashed border is a card idiom, not page)

**Status pill rendering:**
- Reuse the same `Badge` + `BreathingDot` pattern from `GameCard`
- `aria-live` is on the `GameScoreBlock` (client component), not the hero itself

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add src/components/game/game-detail-hero.tsx __tests__/components/game/game-detail-hero.test.tsx
git commit -m "feat(game-detail): add hero scoreboard server component with sport gradient and live treatment"
```

---

## Task 5: Create compact action bar

**Files:**
- Create: `src/components/game/game-detail-actions.tsx`
- Create: `__tests__/components/game/game-detail-actions.test.tsx`

Replaces the current `GameDetailHeader` button bar. Keeps all buttons inline (no dropdown — per code simplifier review, hiding Edit behind a menu hurts discoverability).

- [ ] **Step 1: Write tests**

Key test cases:
- Renders nothing when `viewerGameRole` is null
- Renders Start button for SCHEDULED games
- Renders End button for IN_PROGRESS games
- Renders no Start/End for COMPLETE games
- Renders Edit button for any role (OWNER or EDITOR)
- Renders Manage Editors and Delete buttons for OWNER role only
- All three dialogs render and open/close correctly (DeleteGameDialog, ManageEditorsDialog, UpdateGameForm in Dialog)
- Action buttons have 44px minimum touch targets

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement action bar**

Compact row of inline buttons below the hero. Uses `size="sm"` for secondary actions. Renders all three dialog components with controlled `useState` hooks (same pattern as current `GameDetailHeader` lines 159-185).

```tsx
// game-detail-actions.tsx
"use client";

import { endGame, startGame } from "@/app/[locale]/game/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GameRole, GameStatus } from "@/lib/constants";
import type { GameDetail } from "@/lib/types/game";
import { Pencil, Play, StopCircle, Trash2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DeleteGameDialog } from "./delete-game-dialog";
import { ManageEditorsDialog } from "./manage-editors-dialog";
import { UpdateGameForm } from "./update-game-form";

interface GameDetailActionsProps {
  game: GameDetail;
}

export function GameDetailActions({ game }: GameDetailActionsProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showEditorsDialog, setShowEditorsDialog] = useState(false);

  if (game.viewerGameRole == null) return null;

  // ... Start/End buttons (primary), Edit/Editors/Delete buttons (outline/destructive, size="sm")
  // Must render all three dialog components at the bottom:
  // <DeleteGameDialog gameId={game.id} open={showDeleteDialog} onOpenChange={setShowDeleteDialog} />
  // <ManageEditorsDialog gameId={game.id} open={showEditorsDialog} onOpenChange={setShowEditorsDialog} />
  // <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
  //   <DialogContent><DialogHeader><DialogTitle>{t("game.actions.edit")}</DialogTitle></DialogHeader>
  //   <UpdateGameForm gameId={game.id} currentStartDate={game.startDate} metadata={game.metadata}
  //     sportType={game.sportType} currentLocation={game.location} onSuccess={() => setShowUpdateDialog(false)} />
  //   </DialogContent>
  // </Dialog>
}
```

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add src/components/game/game-detail-actions.tsx __tests__/components/game/game-detail-actions.test.tsx
git commit -m "feat(game-detail): add compact inline action bar with dialog rendering"
```

---

## Task 6: Restructure page layout and loading skeleton

**Files:**
- Modify: `src/app/[locale]/game/[id]/page.tsx`
- Modify: `src/app/[locale]/game/[id]/loading.tsx`
- Delete: 5 replaced component files

- [ ] **Step 1: Update page.tsx**

```tsx
// Key additions to the render function:
const locationText = game.location ? formatAddress(game.location.address) : null;

// New layout:
<main id="main-content" className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
  {/* 1. Back navigation — simple styled link, no client component */}
  <div className="mb-6">
    <Link href="/games" className={cn(buttonVariants({ variant: "ghost" }), "gap-1.5 text-muted-foreground")}>
      <ArrowLeft className="size-4" />
      {t("game.detail.backToGames")}
    </Link>
  </div>

  {/* 2. Hero scoreboard (Server Component) */}
  <GameDetailHero game={game} locationText={locationText} locale={locale} />

  {/* 3. Action bar */}
  <GameDetailActions game={game} />

  {/* 4. Participants */}
  <section className="mt-8">
    <GameParticipants game={game} currentPlayerId={player.id} />
  </section>

  {/* 5. Box Scores */}
  <section className="mt-8">
    <GameBoxScores game={game} />
  </section>

  {/* 6. Media Gallery */}
  <section className="mt-8">
    <GameMediaGallery gameId={game.id} initialMedia={game.media.edges}
      initialPageInfo={game.media.pageInfo} canUpload={canUpload} isParticipant={isParticipant} />
  </section>
</main>
```

Key changes vs current:
- Remove `GameDetailHeader` and `GameScoreboard` imports
- Remove schedule info Card (date/location now in hero metadata)
- Add `ArrowLeft` import from lucide-react for back link
- Add `locationText` computation before render
- Reorder: hero → actions → participants → box scores → media
- Narrow max-width from `max-w-7xl` to `max-w-4xl`
- Keep "no player profile" and "game not found" early returns unchanged

- [ ] **Step 2: Update loading.tsx**

Shape-accurate skeleton:

```tsx
<main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
  <div className="mb-6"><Skeleton className="h-10 w-36" /></div>
  <div className="rounded-3xl bg-secondary/50 p-6 sm:p-8">
    <div className="flex items-center justify-center gap-2 mb-6">
      <Skeleton className="size-7 rounded-full" />
      <Skeleton className="h-5 w-20 rounded-full" />
    </div>
    <div className="flex items-center justify-between gap-4 px-4 sm:px-8">
      <div className="flex-1 text-center space-y-2">
        <Skeleton className="mx-auto h-5 w-24" />
        <Skeleton className="mx-auto h-14 w-20" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
      <div className="flex-1 text-center space-y-2">
        <Skeleton className="mx-auto h-5 w-24" />
        <Skeleton className="mx-auto h-14 w-20" />
      </div>
    </div>
    <div className="flex items-center justify-center gap-4 mt-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-24" />
    </div>
  </div>
  <div className="mt-8 space-y-4">
    <Skeleton className="h-6 w-32" />
    <Skeleton className="h-32 w-full rounded-2xl" />
    <Skeleton className="h-32 w-full rounded-2xl" />
  </div>
</main>
```

- [ ] **Step 3: Delete replaced components**

- `src/components/game/game-detail-header.tsx` — split into hero + actions
- `src/components/game/game-scoreboard.tsx` — replaced by `GameScoreBlock`
- `src/components/game/scoreboard/basketball-score-display.tsx` — dead code
- `src/components/game/scoreboard/football-score-display.tsx` — dead code
- `src/components/game/scoreboard/tennis-score-display.tsx` — dead code

The `scoreboard/*-score-form.tsx` files are KEPT — `GameScoreBlock` imports them.

- [ ] **Step 4: Run build and tests**

```bash
npm run build && npm test -- --run
```

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/game/[id]/page.tsx src/app/[locale]/game/[id]/loading.tsx
git rm src/components/game/game-detail-header.tsx src/components/game/game-scoreboard.tsx src/components/game/scoreboard/basketball-score-display.tsx src/components/game/scoreboard/football-score-display.tsx src/components/game/scoreboard/tennis-score-display.tsx
git commit -m "feat(game-detail): restructure page with hero, action bar, and narrative flow"
```

---

## Task 7: Final integration and visual verification

- [ ] **Step 1: Run full test suite**

```bash
npm test -- --run
```

- [ ] **Step 2: Run lint and build**

```bash
npm run lint && npm run build
```

- [ ] **Step 3: Visual verification (manual)**

- [ ] Completed game: hero shows sport gradient, scores in large text, winner in green, "Final" pill
- [ ] Live game: hero has terracotta ring, breathing dot on status pill, warmer background
- [ ] Upcoming game: hero shows date prominently, "Upcoming" pill, standard background (no dashed border)
- [ ] Back link navigates to /games
- [ ] Action buttons: Start/End prominent, Edit/Editors/Delete inline and compact
- [ ] Score edit: pencil opens form inside hero, focus moves to first input, save/cancel returns focus to pencil
- [ ] Loading skeleton matches hero shape with shimmer
- [ ] Dark mode: hero gradient visible (higher opacity), all elements render correctly
- [ ] Mobile: hero responsive, all interactive elements ≥44px touch target

- [ ] **Step 4: Final commit if any fixes needed**

---

## Verification

1. `npm test -- --run` — all tests pass
2. `npm run build` — builds without errors
3. `npm run lint` — no lint errors
4. Manual: navigate from feed card → game detail → back link goes to /games
5. Manual: all three game states render correctly in hero
6. Manual: score edit works, focus management works (pencil → form → pencil)
7. Manual: dark mode hero gradient is visible
8. Manual: action buttons and dialogs all function correctly
