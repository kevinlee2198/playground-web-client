# PR 3: Game Cards — Ghibli Tranquil Redesign

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the game card component to match the Ghibli Tranquil design spec: sport accent strip, emoji pill, centered score block with recessed background, three visual states (completed/live/upcoming), warm hover animation, card skeleton with shimmer, and breathing dot animation for live games.

**Architecture:** The existing `GameCard` component (`src/components/game/game-card.tsx`) is rewritten in-place. Score display components (`simple-score.tsx`, `tennis-score.tsx`) are replaced with a new centered score block layout. A new `BreathingDot` component handles the live indicator animation (with `prefers-reduced-motion` support). A sport-specific accent strip and emoji pill replace the current icon-in-circle + badge pattern. A shape-accurate card skeleton replaces generic loading. The card entry animation and hover lift use the existing motion tokens from `globals.css`. All changes cascade to both the feed (`ActivityFeed`) and game browse (`GameInfiniteList`) since they both render `GameCard`.

**Tech Stack:** React client components, Tailwind CSS v4 with CSS custom properties (OKLCH), Lucide icons, next-intl, existing motion/shadow/sport tokens from `globals.css`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/app/globals.css` | Add `@keyframes breathe` and `@keyframes shimmer` animations, add `.animate-breathe` and `.animate-shimmer` utilities |
| Create | `src/components/game/breathing-dot.tsx` | Breathing terracotta dot for live games — respects `prefers-reduced-motion` |
| Create | `src/components/game/sport-accent-strip.tsx` | 3px gradient strip at top of card using sport-specific color |
| Create | `src/components/game/sport-emoji-pill.tsx` | Small rounded pill with sport emoji + aria-label |
| Modify | `src/components/game/game-card.tsx` | Full redesign: accent strip, emoji pill, score block, three card moods, hover animation |
| Modify | `src/components/game/score/game-score.tsx` | Update to centered score block layout with participant names, large scores, and status pill |
| Modify | `src/components/game/score/simple-score.tsx` | New centered layout: name—score—pill—score—name |
| Modify | `src/components/game/score/tennis-score.tsx` | New centered layout with set scores below |
| Create | `src/components/game/game-card-skeleton.tsx` | Shape-accurate skeleton matching new card anatomy |
| Modify | `src/components/ui/skeleton.tsx` | Add warm shimmer effect (inner span overlay) |
| Modify | `src/components/game/friend-avatars.tsx` | Minor: remove sport label (accent strip handles identification now) |
| Modify | `messages/en.json` | Add new i18n keys for card states |
| Create | `__tests__/components/game/game-card.test.tsx` | Tests for card rendering in all 3 states |
| Create | `__tests__/components/game/breathing-dot.test.tsx` | Tests for animation class and reduced motion |
| Create | `__tests__/components/game/sport-emoji-pill.test.tsx` | Tests for emoji rendering and aria-label |
| Create | `__tests__/components/game/game-card-skeleton.test.tsx` | Tests for skeleton structure |

---

## Chunk 1: Foundation — Animations, Breathing Dot, Sport Visuals

### Task 1: Add keyframe animations to globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add `@keyframes breathe` and `@keyframes shimmer` to the `@theme inline` block**

Add after the existing `--ease-gentle` line in `@theme inline`:

```css
/* Animation durations */
--animate-breathe: breathe var(--duration-breath) ease-in-out infinite;
--animate-shimmer: shimmer 1.5s linear infinite;
```

Then add keyframes after the `@layer base` block:

```css
@keyframes breathe {
  0%, 100% { opacity: 0.4; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1); }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(game-card): add breathe and shimmer keyframe animations"
```

---

### Task 2: Create BreathingDot component

**Files:**
- Create: `src/components/game/breathing-dot.tsx`
- Create: `__tests__/components/game/breathing-dot.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// __tests__/components/game/breathing-dot.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BreathingDot } from "@/components/game/breathing-dot";

describe("BreathingDot", () => {
  it("renders a dot with aria-hidden", () => {
    render(<BreathingDot />);
    const dot = screen.getByTestId("breathing-dot");
    expect(dot).toHaveAttribute("aria-hidden", "true");
  });

  it("has the animate-breathe class", () => {
    render(<BreathingDot />);
    const dot = screen.getByTestId("breathing-dot");
    expect(dot.className).toContain("animate-breathe");
  });

  it("applies reduced motion styles", () => {
    render(<BreathingDot />);
    const dot = screen.getByTestId("breathing-dot");
    // The motion-reduce:animate-none class should be present
    expect(dot.className).toContain("motion-reduce:animate-none");
  });

  it("accepts custom className", () => {
    render(<BreathingDot className="ml-2" />);
    const dot = screen.getByTestId("breathing-dot");
    expect(dot.className).toContain("ml-2");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/components/game/breathing-dot.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement BreathingDot**

```tsx
// src/components/game/breathing-dot.tsx
import { cn } from "@/lib/utils";

interface BreathingDotProps {
  className?: string;
}

export function BreathingDot({ className }: BreathingDotProps) {
  return (
    <span
      data-testid="breathing-dot"
      aria-hidden="true"
      className={cn(
        "inline-block size-2 rounded-full bg-live animate-breathe motion-reduce:animate-none",
        className,
      )}
    />
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/components/game/breathing-dot.test.tsx`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/game/breathing-dot.tsx __tests__/components/game/breathing-dot.test.tsx
git commit -m "feat(game-card): add BreathingDot component with reduced-motion support"
```

---

### Task 3: Create SportAccentStrip component

**Files:**
- Create: `src/components/game/sport-accent-strip.tsx`

- [ ] **Step 1: Implement SportAccentStrip**

```tsx
// src/components/game/sport-accent-strip.tsx
import { cn } from "@/lib/utils";
import type { SportType } from "@/lib/constants";

const sportGradientClass: Record<SportType, string> = {
  BASKETBALL: "bg-sport-basketball-foreground",
  TENNIS: "bg-sport-tennis-foreground",
  FOOTBALL: "bg-sport-football-foreground",
};

interface SportAccentStripProps {
  sportType: SportType;
  className?: string;
}

export function SportAccentStrip({ sportType, className }: SportAccentStripProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-[3px] w-full rounded-t-xl", sportGradientClass[sportType], className)}
    />
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/game/sport-accent-strip.tsx
git commit -m "feat(game-card): add SportAccentStrip with sport-specific colors"
```

---

### Task 4: Create SportEmojiPill component

**Files:**
- Create: `src/components/game/sport-emoji-pill.tsx`
- Create: `__tests__/components/game/sport-emoji-pill.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// __tests__/components/game/sport-emoji-pill.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "sports.BASKETBALL": "Basketball",
      "sports.TENNIS": "Tennis",
      "sports.FOOTBALL": "Football",
    };
    return map[key] ?? key;
  },
}));

import { SportEmojiPill } from "@/components/game/sport-emoji-pill";
import { SportType } from "@/lib/constants";

describe("SportEmojiPill", () => {
  it("renders basketball emoji with correct aria-label", () => {
    render(<SportEmojiPill sportType={SportType.BASKETBALL} />);
    const pill = screen.getByLabelText("Basketball");
    expect(pill).toBeInTheDocument();
    expect(pill.textContent).toContain("🏀");
  });

  it("renders tennis emoji with correct aria-label", () => {
    render(<SportEmojiPill sportType={SportType.TENNIS} />);
    const pill = screen.getByLabelText("Tennis");
    expect(pill).toBeInTheDocument();
    expect(pill.textContent).toContain("🎾");
  });

  it("renders football emoji with correct aria-label", () => {
    render(<SportEmojiPill sportType={SportType.FOOTBALL} />);
    const pill = screen.getByLabelText("Football");
    expect(pill).toBeInTheDocument();
    expect(pill.textContent).toContain("🏈");
  });

  it("uses sport-specific background color class", () => {
    render(<SportEmojiPill sportType={SportType.BASKETBALL} />);
    const pill = screen.getByLabelText("Basketball");
    expect(pill.className).toContain("bg-sport-basketball");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/components/game/sport-emoji-pill.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement SportEmojiPill**

```tsx
// src/components/game/sport-emoji-pill.tsx
"use client";

import { cn } from "@/lib/utils";
import type { SportType } from "@/lib/constants";
import { useTranslations } from "next-intl";

const sportEmoji: Record<SportType, string> = {
  BASKETBALL: "🏀",
  TENNIS: "🎾",
  FOOTBALL: "🏈",
};

const sportBgClass: Record<SportType, string> = {
  BASKETBALL: "bg-sport-basketball",
  TENNIS: "bg-sport-tennis",
  FOOTBALL: "bg-sport-football",
};

interface SportEmojiPillProps {
  sportType: SportType;
  className?: string;
}

export function SportEmojiPill({ sportType, className }: SportEmojiPillProps) {
  const t = useTranslations();

  return (
    <span
      aria-label={t(`sports.${sportType}`)}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-sm",
        sportBgClass[sportType],
        className,
      )}
    >
      {sportEmoji[sportType]}
    </span>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/components/game/sport-emoji-pill.test.tsx`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/game/sport-emoji-pill.tsx __tests__/components/game/sport-emoji-pill.test.tsx
git commit -m "feat(game-card): add SportEmojiPill with accessibility labels"
```

---

## Chunk 2: Score Block Redesign

### Task 5: Add i18n keys for card states

**Files:**
- Modify: `messages/en.json`

- [ ] **Step 1: Add new keys under the `game` namespace**

Add these keys to the existing `game` object in `messages/en.json`:

```json
"game.status.final": "Final",
"game.status.upcoming": "Upcoming",
"game.status.live": "Live",
"game.status.liveWithTime": "{period} {time}",
"game.score.winner": "Winner"
```

**Important:** Keep all existing keys. Only add new ones.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add messages/en.json
git commit -m "feat(game-card): add i18n keys for card status states"
```

---

### Task 6: Redesign SimpleScore to centered score block layout

**Files:**
- Modify: `src/components/game/score/simple-score.tsx`

The new layout shows:
```
Team A Name        Final        Team B Name
      45                  38
```
Left name/score on the left, right name/score on the right, status pill centered. Winning score in forest green (`text-primary`). The whole block sits on a recessed deep cream background (`bg-secondary`) for completed/live games, or stays flat for upcoming.

- [ ] **Step 1: Rewrite SimpleScore with centered layout**

```tsx
// src/components/game/score/simple-score.tsx
import { cn } from "@/lib/utils";
import type {
  GameParticipant,
  IndividualParticipantNode,
  ParticipantMetadata,
  TeamInstanceNode,
} from "@/lib/types/game";

function getSimpleScore(
  metadata: ParticipantMetadata | null | undefined,
): number | null {
  if (!metadata) return null;
  if (
    metadata.__typename === "BasketballParticipantMetadata" ||
    metadata.__typename === "FootballParticipantMetadata"
  ) {
    return metadata.score;
  }
  return null;
}

function getParticipantName(participant: GameParticipant): string {
  if (participant.__typename === "TeamInstance") {
    return (participant as TeamInstanceNode).name;
  }
  const p = participant as IndividualParticipantNode;
  return p.player ? `${p.player.firstName} ${p.player.lastName}` : "Unknown";
}

interface SimpleScoreProps {
  participantA: GameParticipant;
  participantB: GameParticipant;
  statusPill?: React.ReactNode;
}

export function SimpleScore({ participantA, participantB, statusPill }: SimpleScoreProps) {
  const scoreA = getSimpleScore(participantA.metadata);
  const scoreB = getSimpleScore(participantB.metadata);
  const nameA = getParticipantName(participantA);
  const nameB = getParticipantName(participantB);

  const aWins = scoreA !== null && scoreB !== null && scoreA > scoreB;
  const bWins = scoreA !== null && scoreB !== null && scoreB > scoreA;

  return (
    <div className="flex items-center justify-between gap-2">
      {/* Left participant */}
      <div className="flex-1 text-center min-w-0">
        <p className="truncate text-sm font-semibold font-heading">{nameA}</p>
        <p
          className={cn(
            "text-3xl font-bold font-heading tabular-nums",
            aWins && "text-primary",
          )}
        >
          {scoreA !== null ? scoreA : "-"}
        </p>
      </div>

      {/* Center status pill */}
      <div className="shrink-0">{statusPill}</div>

      {/* Right participant */}
      <div className="flex-1 text-center min-w-0">
        <p className="truncate text-sm font-semibold font-heading">{nameB}</p>
        <p
          className={cn(
            "text-3xl font-bold font-heading tabular-nums",
            bWins && "text-primary",
          )}
        >
          {scoreB !== null ? scoreB : "-"}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds (may have type errors until GameScore is updated — check and fix)

- [ ] **Step 3: Commit**

```bash
git add src/components/game/score/simple-score.tsx
git commit -m "feat(game-card): redesign SimpleScore with centered layout and winner highlighting"
```

---

### Task 7: Redesign TennisScore to centered layout

**Files:**
- Modify: `src/components/game/score/tennis-score.tsx`

- [ ] **Step 1: Rewrite TennisScore with centered layout**

```tsx
// src/components/game/score/tennis-score.tsx
import { cn } from "@/lib/utils";
import type {
  GameParticipant,
  IndividualParticipantNode,
  TeamInstanceNode,
  TennisParticipantMetadata,
  TennisSetScore,
} from "@/lib/types/game";

function formatSetScore(
  playerASet: TennisSetScore,
  playerBSet: TennisSetScore,
): string {
  const a = playerASet.gamesWon;
  const b = playerBSet.gamesWon;

  if (a === 7 && b === 6 && playerBSet.tiebreakPoints !== null) {
    return `${a}-${b}(${playerBSet.tiebreakPoints})`;
  }
  if (b === 7 && a === 6 && playerASet.tiebreakPoints !== null) {
    return `${a}(${playerASet.tiebreakPoints})-${b}`;
  }

  return `${a}-${b}`;
}

function getParticipantName(participant: GameParticipant): string {
  if (participant.__typename === "TeamInstance") {
    return (participant as TeamInstanceNode).name;
  }
  const p = participant as IndividualParticipantNode;
  return p.player ? `${p.player.firstName} ${p.player.lastName}` : "Unknown";
}

interface TennisScoreProps {
  participantA: GameParticipant;
  participantB: GameParticipant;
  statusPill?: React.ReactNode;
}

export function TennisScore({ participantA, participantB, statusPill }: TennisScoreProps) {
  const metaA = participantA.metadata;
  const metaB = participantB.metadata;
  const nameA = getParticipantName(participantA);
  const nameB = getParticipantName(participantB);

  const setsA = metaA?.__typename === "TennisParticipantMetadata" ? metaA.setsWon : 0;
  const setsB = metaB?.__typename === "TennisParticipantMetadata" ? metaB.setsWon : 0;

  const aWins = setsA > setsB;
  const bWins = setsB > setsA;

  // Compute set-by-set scores if available
  const tennisA = metaA?.__typename === "TennisParticipantMetadata" ? (metaA as TennisParticipantMetadata) : null;
  const tennisB = metaB?.__typename === "TennisParticipantMetadata" ? (metaB as TennisParticipantMetadata) : null;

  const setScores = tennisA && tennisB && tennisA.sets.length > 0
    ? tennisA.sets.map((setA, i) => {
        const setB = tennisB.sets[i];
        if (!setB) return `${setA.gamesWon}-0`;
        return formatSetScore(setA, setB);
      })
    : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        {/* Left participant */}
        <div className="flex-1 text-center min-w-0">
          <p className="truncate text-sm font-semibold font-heading">{nameA}</p>
          <p
            className={cn(
              "text-3xl font-bold font-heading tabular-nums",
              aWins && "text-primary",
            )}
          >
            {setsA}
          </p>
        </div>

        {/* Center status pill */}
        <div className="shrink-0">{statusPill}</div>

        {/* Right participant */}
        <div className="flex-1 text-center min-w-0">
          <p className="truncate text-sm font-semibold font-heading">{nameB}</p>
          <p
            className={cn(
              "text-3xl font-bold font-heading tabular-nums",
              bWins && "text-primary",
            )}
          >
            {setsB}
          </p>
        </div>
      </div>

      {/* Set-by-set scores */}
      {setScores && (
        <div className="flex items-center justify-center gap-2">
          {setScores.map((score, i) => (
            <span
              key={i}
              className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums"
            >
              {score}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/game/score/tennis-score.tsx
git commit -m "feat(game-card): redesign TennisScore with centered layout and set pills"
```

---

### Task 8: Update GameScore to pass statusPill to score components

**Files:**
- Modify: `src/components/game/score/game-score.tsx`

- [ ] **Step 1: Add statusPill prop and pass it through**

```tsx
// src/components/game/score/game-score.tsx
import { SimpleScore } from "@/components/game/score/simple-score";
import { TennisScore } from "@/components/game/score/tennis-score";
import { SportType } from "@/lib/constants";
import type { GameParticipant } from "@/lib/types/game";

interface GameScoreProps {
  sportType: SportType;
  participants: GameParticipant[];
  statusPill?: React.ReactNode;
}

export function GameScore({ sportType, participants, statusPill }: GameScoreProps) {
  if (participants.length < 2) return null;

  const [a, b] = participants;
  if (!a.metadata && !b.metadata) return null;

  switch (sportType) {
    case SportType.BASKETBALL:
    case SportType.FOOTBALL:
      return <SimpleScore participantA={a} participantB={b} statusPill={statusPill} />;
    case SportType.TENNIS:
      return <TennisScore participantA={a} participantB={b} statusPill={statusPill} />;
    default:
      return null;
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. The `statusPill` prop is optional, so GameCard continues to work without passing it until Task 9 updates it.

- [ ] **Step 3: Commit**

```bash
git add src/components/game/score/game-score.tsx
git commit -m "feat(game-card): update GameScore to accept and pass statusPill"
```

---

## Chunk 3: Game Card Redesign

### Task 9: Redesign the GameCard component

**Files:**
- Modify: `src/components/game/game-card.tsx`

This is the main task. The card anatomy from the design spec (top to bottom):
1. Friend context bar (optional, feed only — already exists)
2. Sport accent strip (3px colored bar)
3. Sport emoji pill + subtype info
4. Score block (recessed cream background for completed/live, flat for upcoming)
5. Meta row (location, date)

Three card moods:
- **Completed**: Standard card, recessed score block, "Final" pill
- **Live**: Faint terracotta border, breathing dot on status pill
- **Upcoming**: Lighter card, no recessed block, date/time where scores would be, dashed border

- [ ] **Step 1: Rewrite GameCard**

```tsx
// src/components/game/game-card.tsx
"use client";

import { BreathingDot } from "@/components/game/breathing-dot";
import { FriendAvatars } from "@/components/game/friend-avatars";
import { GameScore } from "@/components/game/score/game-score";
import { SportAccentStrip } from "@/components/game/sport-accent-strip";
import { SportEmojiPill } from "@/components/game/sport-emoji-pill";
import { Badge } from "@/components/ui/badge";
import { TypographyMuted } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import {
  GameStatus,
  getSubtypeFromMetadata,
} from "@/lib/constants";
import type { ViewerFriendPlayers } from "@/lib/types/feed";
import type { GameNode } from "@/lib/types/game";
import { cn } from "@/lib/utils";
import { Calendar, MapPin } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

function getLocationText(location: {
  name: string | null;
  address: { city: string; state: string; country: string };
}): string {
  const { city, state, country } = location.address;
  if (city) return state ? `${city}, ${state}` : city;
  if (state) return `${state}, ${country}`;
  return country;
}

interface GameCardProps {
  game: GameNode & {
    viewerFriendPlayers?: ViewerFriendPlayers;
  };
}

export function GameCard({ game }: GameCardProps) {
  const t = useTranslations();
  const format = useFormatter();

  const isLive = game.gameStatus === GameStatus.IN_PROGRESS;
  const isUpcoming = game.gameStatus === GameStatus.SCHEDULED;
  const isComplete = game.gameStatus === GameStatus.COMPLETE;

  const formattedDate = format.dateTime(new Date(game.startDate), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const participants = game.participants.edges.map((e) => e.node);
  const locationText = game.location ? getLocationText(game.location) : null;
  const subtype = getSubtypeFromMetadata(game.metadata);

  // Status pill varies by game state
  const statusPill = (
    <Badge
      variant={isLive ? "default" : isUpcoming ? "secondary" : "outline"}
      className={cn(
        "text-xs",
        isLive && "bg-live text-live-foreground gap-1.5",
      )}
    >
      {isLive ? <BreathingDot className="size-1.5" /> : null}
      {isComplete ? t("game.status.final") : null}
      {isLive ? t("game.status.live") : null}
      {isUpcoming ? t("game.status.upcoming") : null}
    </Badge>
  );

  return (
    <Link href={`/game/${game.id}`} className="block group/game-card">
      <article
        className={cn(
          "overflow-hidden rounded-2xl bg-card text-card-foreground shadow-card transition-[transform,box-shadow] duration-[var(--duration-normal)] ease-[var(--ease-default)] touch-action-manipulation",
          "group-hover/game-card:-translate-y-0.5 group-hover/game-card:shadow-card-hover",
          isLive && "ring-1 ring-live/12",
          isUpcoming && "border border-dashed border-border bg-card/80",
          !isUpcoming && !isLive && "ring-1 ring-foreground/10",
        )}
      >
        {/* Sport accent strip */}
        <SportAccentStrip sportType={game.sportType} />

        <div className="space-y-3 p-4 sm:p-5">
          {/* Friend context — only shown in feed when data is present */}
          {game.viewerFriendPlayers ? (
            <FriendAvatars
              friends={game.viewerFriendPlayers.nodes}
              totalCount={game.viewerFriendPlayers.totalCount}
              sportType={game.sportType}
            />
          ) : null}

          {/* Sport info row: emoji pill + subtype */}
          <div className="flex items-center gap-2">
            <SportEmojiPill sportType={game.sportType} />
            <Badge variant="outline" className="text-xs">
              {t(`sportSubtypes.${subtype}`)}
            </Badge>
          </div>

          {/* Score block */}
          {isUpcoming ? (
            /* Upcoming: show date/time prominently instead of scores */
            <div className="flex items-center justify-center py-4">
              <div className="text-center">
                {participants.length >= 2 ? (
                  <p className="text-sm font-semibold font-heading text-muted-foreground mb-2">
                    {getParticipantsDisplay(participants, t)}
                  </p>
                ) : null}
                <p className="text-2xl font-bold font-heading">{formattedDate}</p>
                <div className="mt-2">{statusPill}</div>
              </div>
            </div>
          ) : (
            /* Completed / Live: recessed score block with ARIA live for live games */
            <div
              className={cn(
                "rounded-xl p-4",
                isLive ? "bg-secondary/80" : "bg-secondary",
              )}
              {...(isLive ? { "aria-live": "polite", "aria-atomic": true } : {})}
            >
              {participants.length >= 2 ? (
                <GameScore
                  sportType={game.sportType}
                  participants={participants}
                  statusPill={statusPill}
                />
              ) : (
                <div className="flex items-center justify-center py-2">
                  {statusPill}
                </div>
              )}
            </div>
          )}

          {/* Meta row — only for completed/live (upcoming already shows date) */}
          {!isUpcoming && (
            <div className="flex flex-wrap items-center gap-4">
              <TypographyMuted className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                {formattedDate}
              </TypographyMuted>
              {locationText ? (
                <TypographyMuted className="flex items-center gap-1 min-w-0">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="truncate">{locationText}</span>
                </TypographyMuted>
              ) : null}
            </div>
          )}

          {/* Location for upcoming (date is already shown) */}
          {isUpcoming && locationText ? (
            <div className="flex items-center justify-center">
              <TypographyMuted className="flex items-center gap-1">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">{locationText}</span>
              </TypographyMuted>
            </div>
          ) : null}
        </div>

        {/* Live: bottom terracotta glow */}
        {isLive ? (
          <div aria-hidden="true" className="h-[2px] bg-live/20" />
        ) : null}
      </article>
    </Link>
  );
}

/** Extract participant display names for upcoming games (no scores) */
function getParticipantsDisplay(
  participants: GameNode["participants"]["edges"][number]["node"][],
  t: (key: string) => string,
): string {
  const first = participants[0];
  if (first.__typename === "TeamInstance") {
    return participants
      .filter((p) => p.__typename === "TeamInstance")
      .map((p) => (p as import("@/lib/types/game").TeamInstanceNode).name)
      .slice(0, 2)
      .join(` ${t("profile.games.vs")} `);
  }
  return participants
    .filter((p) => p.__typename === "IndividualParticipant")
    .map((p) => {
      const ip = p as import("@/lib/types/game").IndividualParticipantNode;
      return ip.player ? `${ip.player.firstName} ${ip.player.lastName}` : "Unknown";
    })
    .slice(0, 2)
    .join(` ${t("profile.games.vs")} `);
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. Fix any type errors.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: Passes

- [ ] **Step 4: Commit**

```bash
git add src/components/game/game-card.tsx
git commit -m "feat(game-card): redesign with accent strip, emoji pill, score block, and 3 card moods"
```

---

### Task 10: Update FriendAvatars to remove sport label

**Files:**
- Modify: `src/components/game/friend-avatars.tsx`

The sport label is now handled by the accent strip and emoji pill, so the friend context bar simplifies to just names + "played".

- [ ] **Step 1: Remove sportType prop and sport label from summary text**

Update the component to remove the `sportType` prop. Change the summary text patterns:
- `"You played"` (no sport label)
- `"Sofia played"`
- `"Sofia, Alex, and 2 others played"`

```tsx
// src/components/game/friend-avatars.tsx
"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar";
import { TypographySmall } from "@/components/ui/typography";
import type { FeedPlayerNode } from "@/lib/types/feed";
import { useTranslations } from "next-intl";

interface FriendAvatarsProps {
  friends: FeedPlayerNode[];
  totalCount: number;
}

function getInitials(player: FeedPlayerNode): string {
  return `${player.firstName.charAt(0)}${player.lastName.charAt(0)}`.toUpperCase();
}

function getDisplayName(player: FeedPlayerNode): string {
  return player.user.displayName ?? `${player.firstName} ${player.lastName}`;
}

export function FriendAvatars({
  friends,
  totalCount,
}: FriendAvatarsProps) {
  const t = useTranslations();

  let summaryText: string;
  if (friends.length === 0) {
    summaryText = t("feed.youPlayed");
  } else if (friends.length === 1) {
    const othersCount = totalCount - 1;
    if (othersCount > 0) {
      const othersKey = othersCount === 1 ? "feed.other" : "feed.others";
      summaryText = `${getDisplayName(friends[0])} ${t("feed.and")} ${othersCount} ${t(othersKey)} ${t("feed.played")}`;
    } else {
      summaryText = `${getDisplayName(friends[0])} ${t("feed.played")}`;
    }
  } else {
    const othersCount = totalCount - 2;
    if (othersCount > 0) {
      const othersKey = othersCount === 1 ? "feed.other" : "feed.others";
      summaryText = `${getDisplayName(friends[0])}, ${getDisplayName(friends[1])}, ${t("feed.and")} ${othersCount} ${t(othersKey)} ${t("feed.played")}`;
    } else {
      summaryText = `${getDisplayName(friends[0])} ${t("feed.and")} ${getDisplayName(friends[1])} ${t("feed.played")}`;
    }
  }

  const visibleFriends = friends.slice(0, 3);

  return (
    <div className="flex items-center gap-3">
      {visibleFriends.length > 0 && (
        <AvatarGroup>
          {visibleFriends.map((friend) => (
            <Avatar key={friend.id} size="sm">
              {friend.user.profilePicture?.thumbnailUrl && (
                <AvatarImage
                  src={friend.user.profilePicture.thumbnailUrl}
                  alt={getDisplayName(friend)}
                />
              )}
              <AvatarFallback>{getInitials(friend)}</AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>
      )}
      <TypographySmall className="text-muted-foreground font-normal">
        {summaryText}
      </TypographySmall>
    </div>
  );
}
```

- [ ] **Step 2: Update GameCard to not pass sportType to FriendAvatars**

In `game-card.tsx`, remove the `sportType` prop from the `<FriendAvatars>` call:

```tsx
<FriendAvatars
  friends={game.viewerFriendPlayers.nodes}
  totalCount={game.viewerFriendPlayers.totalCount}
/>
```

- [ ] **Step 3: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: Both pass. No unused imports.

- [ ] **Step 4: Commit**

```bash
git add src/components/game/friend-avatars.tsx src/components/game/game-card.tsx
git commit -m "refactor(game-card): simplify FriendAvatars — sport label now handled by accent strip"
```

---

## Chunk 4: Skeleton & Tests

### Task 11: Update Skeleton component with warm shimmer

**Files:**
- Modify: `src/components/ui/skeleton.tsx`

The design addendum requires replacing `animate-pulse` with a warm gradient sweep.

- [ ] **Step 1: Update Skeleton with shimmer overlay**

```tsx
// src/components/ui/skeleton.tsx
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted relative overflow-hidden rounded-md", className)}
      {...props}
    >
      <span className="absolute inset-0 animate-shimmer will-change-transform bg-gradient-to-r from-transparent via-card/40 to-transparent" />
    </div>
  )
}

export { Skeleton }
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/skeleton.tsx
git commit -m "feat(skeleton): replace pulse with warm shimmer animation"
```

---

### Task 12: Create GameCardSkeleton

**Files:**
- Create: `src/components/game/game-card-skeleton.tsx`
- Create: `__tests__/components/game/game-card-skeleton.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// __tests__/components/game/game-card-skeleton.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GameCardSkeleton } from "@/components/game/game-card-skeleton";

describe("GameCardSkeleton", () => {
  it("renders the skeleton container", () => {
    render(<GameCardSkeleton />);
    const skeleton = screen.getByTestId("game-card-skeleton");
    expect(skeleton).toBeInTheDocument();
  });

  it("contains skeleton elements for accent strip, emoji pill, score block, and meta", () => {
    const { container } = render(<GameCardSkeleton />);
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    // At least: accent strip, emoji pill, subtype badge, 2 names, 2 scores, center pill, 2 meta items
    expect(skeletons.length).toBeGreaterThanOrEqual(8);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/components/game/game-card-skeleton.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement GameCardSkeleton**

```tsx
// src/components/game/game-card-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function GameCardSkeleton() {
  return (
    <div
      data-testid="game-card-skeleton"
      className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 shadow-card"
    >
      {/* Accent strip */}
      <Skeleton className="h-[3px] w-full rounded-none" />

      <div className="space-y-3 p-4 sm:p-5">
        {/* Sport info row */}
        <div className="flex items-center gap-2">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>

        {/* Score block */}
        <div className="rounded-xl bg-secondary p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 space-y-2 text-center">
              <Skeleton className="mx-auto h-4 w-20" />
              <Skeleton className="mx-auto h-8 w-10" />
            </div>
            <Skeleton className="h-5 w-12 rounded-full" />
            <div className="flex-1 space-y-2 text-center">
              <Skeleton className="mx-auto h-4 w-20" />
              <Skeleton className="mx-auto h-8 w-10" />
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/components/game/game-card-skeleton.test.tsx`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/game/game-card-skeleton.tsx __tests__/components/game/game-card-skeleton.test.tsx
git commit -m "feat(game-card): add shape-accurate GameCardSkeleton"
```

---

### Task 13: Write GameCard integration tests

**Files:**
- Create: `__tests__/components/game/game-card.test.tsx`

- [ ] **Step 1: Write comprehensive tests**

```tsx
// __tests__/components/game/game-card.test.tsx
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "game.status.final": "Final",
      "game.status.live": "Live",
      "game.status.upcoming": "Upcoming",
      "game.score.winner": "Winner",
      "profile.games.vs": "vs",
      "sports.BASKETBALL": "Basketball",
      "sports.TENNIS": "Tennis",
      "sports.FOOTBALL": "Football",
      "sportSubtypes.FIVE_ON_FIVE": "5v5",
      "sportSubtypes.THREE_ON_THREE": "3v3",
      "sportSubtypes.SINGLES": "Singles",
      "feed.youPlayed": "You played",
      "feed.played": "played",
      "feed.and": "and",
      "feed.other": "other",
      "feed.others": "others",
    };
    return map[key] ?? key;
  },
  useFormatter: () => ({
    dateTime: () => "Mar 10, 2026, 07:00 PM",
  }),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

import { GameCard } from "@/components/game/game-card";
import { GameStatus, GameRole, GameVisibility, SportType, SportSubtype } from "@/lib/constants";
import type { GameNode } from "@/lib/types/game";

function makeGame(overrides: Partial<GameNode> = {}): GameNode {
  return {
    id: 1,
    startDate: "2026-03-10T19:00:00Z",
    endDate: "2026-03-10T21:00:00Z",
    sportType: SportType.BASKETBALL,
    metadata: {
      __typename: "BasketballGameMetadata",
      basketballSubtype: SportSubtype.FIVE_ON_FIVE,
      periods: 4,
    },
    gameStatus: GameStatus.COMPLETE,
    viewerGameRole: GameRole.OWNER,
    visibility: GameVisibility.PUBLIC,
    location: {
      name: "Court 1",
      address: { city: "Los Angeles", state: "CA", country: "US" },
    },
    participants: {
      edges: [
        {
          node: {
            __typename: "TeamInstance",
            id: 1,
            name: "Team Alpha",
            players: [],
            metadata: { __typename: "BasketballParticipantMetadata", score: 45 },
          },
          cursor: "c1",
        },
        {
          node: {
            __typename: "TeamInstance",
            id: 2,
            name: "Team Beta",
            players: [],
            metadata: { __typename: "BasketballParticipantMetadata", score: 38 },
          },
          cursor: "c2",
        },
      ],
    },
    ...overrides,
  };
}

describe("GameCard", () => {
  it("renders a completed game with Final pill and scores", () => {
    render(<GameCard game={makeGame()} />);
    expect(screen.getByText("Final")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("38")).toBeInTheDocument();
    expect(screen.getByText("Team Alpha")).toBeInTheDocument();
    expect(screen.getByText("Team Beta")).toBeInTheDocument();
  });

  it("renders a live game with Live pill and breathing dot", () => {
    render(<GameCard game={makeGame({ gameStatus: GameStatus.IN_PROGRESS })} />);
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByTestId("breathing-dot")).toBeInTheDocument();
  });

  it("adds aria-live to score block for live games", () => {
    const { container } = render(<GameCard game={makeGame({ gameStatus: GameStatus.IN_PROGRESS })} />);
    const liveRegion = container.querySelector("[aria-live='polite']");
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
  });

  it("renders an upcoming game with date prominently and no score block", () => {
    const upcoming = makeGame({
      gameStatus: GameStatus.SCHEDULED,
      participants: {
        edges: [
          {
            node: {
              __typename: "TeamInstance",
              id: 1,
              name: "Team Alpha",
              players: [],
              metadata: null,
            },
            cursor: "c1",
          },
          {
            node: {
              __typename: "TeamInstance",
              id: 2,
              name: "Team Beta",
              players: [],
              metadata: null,
            },
            cursor: "c2",
          },
        ],
      },
    });
    render(<GameCard game={upcoming} />);
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.getByText("Mar 10, 2026, 07:00 PM")).toBeInTheDocument();
  });

  it("renders sport emoji pill with accessibility label", () => {
    render(<GameCard game={makeGame()} />);
    expect(screen.getByLabelText("Basketball")).toBeInTheDocument();
  });

  it("links to game detail page", () => {
    render(<GameCard game={makeGame()} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/game/1");
  });

  it("shows location in meta row for completed games", () => {
    render(<GameCard game={makeGame()} />);
    expect(screen.getByText("Los Angeles, CA")).toBeInTheDocument();
  });

  it("shows subtype badge", () => {
    render(<GameCard game={makeGame()} />);
    expect(screen.getByText("5v5")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run __tests__/components/game/game-card.test.tsx`
Expected: All tests PASS. If any fail, debug and fix the GameCard component.

- [ ] **Step 3: Commit**

```bash
git add __tests__/components/game/game-card.test.tsx
git commit -m "test(game-card): add tests for completed, live, and upcoming card states"
```

---

### Task 14: Final verification

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: Run build + lint**

Run: `npm run build && npm run lint`
Expected: Both pass

- [ ] **Step 3: Verify no unused imports/files**

Check that the old `GameStatusBadge` component (`src/components/game/game-status-badge.tsx`) is still used elsewhere. If it's only used by the old GameCard, consider whether other pages still import it. If it is still imported by game detail or other components, leave it. If only GameCard used it, leave it for now — cleanup can be a separate PR.

- [ ] **Step 4: Commit any fixes**

If any fixes were needed, commit them:

```bash
git add -A
git commit -m "fix(game-card): address build/test issues from final verification"
```
