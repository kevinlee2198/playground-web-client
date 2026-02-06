# Sport-Specific Metadata -- Design

## 1. Overview

This document describes the implementation plan for replacing untyped JSON fields (`sportSubtype`, `attributes`) with typed GraphQL union metadata on games and participants. It covers type changes, reusable query fragments, component architecture, new utilities, form changes, server action updates, and i18n additions.

---

## 2. TypeScript Type Changes

### File: `src/lib/types/game.ts`

#### 2.1 New metadata response types

```typescript
// ---------- Game Metadata (response types -- fields are T | null for nullable) ----------

export interface BasketballGameMetadata {
  __typename: "BasketballGameMetadata";
  subtype: "FIVE_ON_FIVE" | "THREE_ON_THREE";
  periods: number | null;
}

export interface TennisGameMetadata {
  __typename: "TennisGameMetadata";
  subtype: "SINGLES" | "DOUBLES";
  bestOf: number;
  tiebreakFinalSet: boolean;
}

export interface FootballGameMetadata {
  __typename: "FootballGameMetadata";
  subtype: "FLAG_FOOTBALL" | "AMERICAN_FOOTBALL";
  periods: number | null;
}

export type GameMetadata =
  | BasketballGameMetadata
  | TennisGameMetadata
  | FootballGameMetadata;

// ---------- Participant Metadata (response types) ----------

export interface BasketballParticipantMetadata {
  __typename: "BasketballParticipantMetadata";
  score: number;
}

export interface TennisSetScore {
  gamesWon: number;
  tiebreakPoints: number | null;
}

export interface TennisParticipantMetadata {
  __typename: "TennisParticipantMetadata";
  setsWon: number;
  sets: TennisSetScore[];
}

export interface FootballParticipantMetadata {
  __typename: "FootballParticipantMetadata";
  score: number;
}

export type ParticipantMetadata =
  | BasketballParticipantMetadata
  | TennisParticipantMetadata
  | FootballParticipantMetadata;
```

#### 2.2 New input types

```typescript
// ---------- Participant Metadata Input (@oneOf -- exactly one key) ----------

export interface ParticipantMetadataInput {
  basketball?: { score: number };
  tennis?: { setsWon: number; sets: { gamesWon: number; tiebreakPoints?: number }[] };
  football?: { score: number };
}

// ---------- Update Participant Scores (for scoreboard bulk save) ----------

export interface UpdateParticipantScoreEntry {
  id: number;
  isTeam: boolean;
  metadata: ParticipantMetadataInput;
}
```

#### 2.3 Modified types -- before/after diffs

**`TeamInstanceNode`** (game cards):
```diff
 export interface TeamInstanceNode {
   __typename: "TeamInstance";
   id: number;
   name: string;
   players: PlayerRef[];
+  metadata: ParticipantMetadata | null;
 }
```

**`TeamInstanceDetail`** (game detail page):
```diff
 export interface TeamInstanceDetail {
   __typename: "TeamInstance";
   id: number;
   name: string;
   description: string | null;
   players: PlayerRef[];
-  attributes: Record<string, unknown>;
+  metadata: ParticipantMetadata | null;
 }
```

**`IndividualParticipantNode`**:
```diff
 export interface IndividualParticipantNode {
   __typename: "IndividualParticipant";
   id: number;
   player: PlayerRef;
+  metadata: ParticipantMetadata | null;
 }
```

**`GameNode`**:
```diff
 export interface GameNode {
   id: number;
   startDate: string;
   endDate: string | null;
   sportType: SportType;
-  sportSubtype: SportSubtype;
+  metadata: GameMetadata;
   gameStatus: GameStatus;
   participants: {
     edges: Edge<GameParticipant>[];
   };
 }
```

**`GameDetail`**:
```diff
 export interface GameDetail {
   id: number;
   startDate: string;
   endDate: string | null;
   sportType: SportType;
-  sportSubtype: SportSubtype;
+  metadata: GameMetadata;
   gameStatus: GameStatus;
   participants: {
     edges: Edge<GameParticipantDetail>[];
     pageInfo: PageInfo;
   };
 }
```

**`CreateGameInput`** -- complete replacement:
```diff
-export interface CreateGameInput {
-  sportType: SportType;
-  subtype: SportSubtype;
-  startDate: string;
-}
+export interface CreateBasketballGameInput {
+  sportType: "BASKETBALL";
+  startDate: string;
+  metadata: {
+    subtype: "FIVE_ON_FIVE" | "THREE_ON_THREE";
+    periods?: number;
+  };
+}
+
+export interface CreateTennisGameInput {
+  sportType: "TENNIS";
+  startDate: string;
+  metadata: {
+    subtype: "SINGLES" | "DOUBLES";
+    bestOf?: number;
+    tiebreakFinalSet?: boolean;
+  };
+}
+
+export interface CreateFootballGameInput {
+  sportType: "FOOTBALL";
+  startDate: string;
+  metadata: {
+    subtype: "FLAG_FOOTBALL" | "AMERICAN_FOOTBALL";
+    periods?: number;
+  };
+}
+
+export type CreateGameInput =
+  | CreateBasketballGameInput
+  | CreateTennisGameInput
+  | CreateFootballGameInput;
```

**`UpdateGameInput`**:
```diff
 export interface UpdateGameInput {
   id: number;
   startDate?: string;
+  metadata?: {
+    basketball?: { subtype?: "FIVE_ON_FIVE" | "THREE_ON_THREE"; periods?: number };
+    tennis?: { subtype?: "SINGLES" | "DOUBLES"; bestOf?: number; tiebreakFinalSet?: boolean };
+    football?: { subtype?: "FLAG_FOOTBALL" | "AMERICAN_FOOTBALL"; periods?: number };
+  };
 }
```

**`AddTeamInput`**:
```diff
 export interface AddTeamInput {
   gameId: number;
   name: string;
   description?: string;
   playerIds?: number[];
-  attributes?: Record<string, unknown>;
 }
```

**`UpdateTeamParticipantInput`**:
```diff
 export interface UpdateTeamParticipantInput {
   teamInstanceId: number;
   name?: string;
   description?: string;
   playerIds?: number[];
-  attributes?: Record<string, unknown>;
+  metadata?: ParticipantMetadataInput;
 }
```

---

## 3. Reusable GraphQL Query Fragments

### File: `src/lib/graphql-fragments.ts` (NEW)

Multiple queries across the codebase need the same union inline fragments for `GameMetadata` and `ParticipantMetadata`. To avoid duplicating these large objects, create a shared fragments file.

```typescript
/**
 * Reusable GraphQL query fragment objects for json-to-graphql-query.
 * Import and spread these into query objects to avoid duplication.
 */

/**
 * Inline fragments for the GameMetadata union type.
 * Use as: metadata: gameMetadataFragment
 */
export const gameMetadataFragment = {
  __typename: true,
  __on: [
    {
      __typeName: "BasketballGameMetadata",
      subtype: true,
      periods: true,
    },
    {
      __typeName: "TennisGameMetadata",
      subtype: true,
      bestOf: true,
      tiebreakFinalSet: true,
    },
    {
      __typeName: "FootballGameMetadata",
      subtype: true,
      periods: true,
    },
  ],
};

/**
 * Inline fragments for the ParticipantMetadata union type.
 * Use as: metadata: participantMetadataFragment
 */
export const participantMetadataFragment = {
  __typename: true,
  __on: [
    {
      __typeName: "BasketballParticipantMetadata",
      score: true,
    },
    {
      __typeName: "TennisParticipantMetadata",
      setsWon: true,
      sets: { gamesWon: true, tiebreakPoints: true },
    },
    {
      __typeName: "FootballParticipantMetadata",
      score: true,
    },
  ],
};

/**
 * Participant node fragment for game card queries (basic info + metadata).
 * Fetches TeamInstance and IndividualParticipant inline fragments.
 */
export const participantNodeFragment = {
  __typename: true,
  __on: [
    {
      __typeName: "TeamInstance",
      id: true,
      name: true,
      players: { id: true, firstName: true, lastName: true },
      metadata: participantMetadataFragment,
    },
    {
      __typeName: "IndividualParticipant",
      id: true,
      player: { id: true, firstName: true, lastName: true },
      metadata: participantMetadataFragment,
    },
  ],
};

/**
 * Participant node fragment for game detail queries (full info + metadata).
 * Includes description on TeamInstance.
 */
export const participantDetailNodeFragment = {
  __typename: true,
  __on: [
    {
      __typeName: "TeamInstance",
      id: true,
      name: true,
      description: true,
      players: { id: true, firstName: true, lastName: true },
      metadata: participantMetadataFragment,
    },
    {
      __typeName: "IndividualParticipant",
      id: true,
      player: { id: true, firstName: true, lastName: true },
      metadata: participantMetadataFragment,
    },
  ],
};
```

**Usage pattern** -- every query that currently has inline `__on` arrays for participants and `sportSubtype: true` will import from this file:

```typescript
import {
  gameMetadataFragment,
  participantNodeFragment,
} from "@/lib/graphql-fragments";

// In query:
node: {
  id: true,
  sportType: true,
  metadata: gameMetadataFragment,
  // ...
  participants: {
    __args: { first: 10 },
    edges: {
      node: participantNodeFragment,
    },
  },
}
```

---

## 4. Constants Helper

### File: `src/lib/constants.ts`

Add one helper function:

```typescript
import type { GameMetadata } from "@/lib/types/game";

/**
 * Extract the SportSubtype value from a GameMetadata union member.
 * All metadata types share a `subtype` field whose values align with
 * the SportSubtype enum.
 */
export function getSubtypeFromMetadata(metadata: GameMetadata): SportSubtype {
  return metadata.subtype as SportSubtype;
}
```

This bridges the gap between the typed union `GameMetadata` (where each variant has its own subtype enum) and the client-side `SportSubtype` enum used for config lookups.

---

## 5. Score Formatting Utilities

### File: `src/lib/format-score.ts` (NEW)

```typescript
import type { SportType } from "@/lib/constants";
import type {
  GameParticipant,
  ParticipantMetadata,
  TennisSetScore,
  TeamInstanceNode,
  IndividualParticipantNode,
} from "@/lib/types/game";

/**
 * Returns the numeric score for basketball/football participants,
 * or null if metadata is not present.
 */
export function getSimpleScore(metadata: ParticipantMetadata | null | undefined): number | null {
  if (!metadata) return null;
  if (metadata.__typename === "BasketballParticipantMetadata" ||
      metadata.__typename === "FootballParticipantMetadata") {
    return metadata.score;
  }
  return null;
}

/**
 * Format a tennis set score like "6-4" or "7-6(4)".
 * tiebreakPoints is shown in parens next to the player who lost the tiebreak
 * (the one with 6 games when the other has 7).
 */
export function formatTennisSetScore(
  playerASet: TennisSetScore,
  playerBSet: TennisSetScore,
): string {
  const a = playerASet.gamesWon;
  const b = playerBSet.gamesWon;

  // Tiebreak: one player has 7, the other has 6
  if (a === 7 && b === 6 && playerBSet.tiebreakPoints !== null) {
    return `${a}-${b}(${playerBSet.tiebreakPoints})`;
  }
  if (b === 7 && a === 6 && playerASet.tiebreakPoints !== null) {
    return `${a}(${playerASet.tiebreakPoints})-${b}`;
  }

  return `${a}-${b}`;
}

/**
 * Check if any participant in the list has non-null metadata.
 */
export function hasScores(participants: { metadata: ParticipantMetadata | null }[]): boolean {
  return participants.some((p) => p.metadata !== null);
}

/**
 * Format the score summary for a game card.
 *
 * Basketball/Football: "78 - 65"
 * Tennis: "2-1 | 6-4, 3-6, 7-5"
 *
 * Returns null if no scores exist.
 */
export function formatGameScore(
  sportType: SportType,
  participantA: { metadata: ParticipantMetadata | null } | undefined,
  participantB: { metadata: ParticipantMetadata | null } | undefined,
): string | null {
  if (!participantA?.metadata && !participantB?.metadata) return null;

  if (sportType === "BASKETBALL" || sportType === "FOOTBALL") {
    const scoreA = getSimpleScore(participantA?.metadata);
    const scoreB = getSimpleScore(participantB?.metadata);
    const displayA = scoreA !== null ? String(scoreA) : "-";
    const displayB = scoreB !== null ? String(scoreB) : "-";
    return `${displayA} - ${displayB}`;
  }

  if (sportType === "TENNIS") {
    const metaA = participantA?.metadata;
    const metaB = participantB?.metadata;

    if (metaA?.__typename !== "TennisParticipantMetadata" ||
        metaB?.__typename !== "TennisParticipantMetadata") {
      // Fallback: show setsWon if available
      const setsA = metaA?.__typename === "TennisParticipantMetadata" ? metaA.setsWon : 0;
      const setsB = metaB?.__typename === "TennisParticipantMetadata" ? metaB.setsWon : 0;
      return `${setsA}-${setsB}`;
    }

    const setsDisplay = `${metaA.setsWon}-${metaB.setsWon}`;
    if (metaA.sets.length === 0) return setsDisplay;

    const setScores = metaA.sets.map((setA, i) => {
      const setB = metaB.sets[i];
      if (!setB) return `${setA.gamesWon}-0`;
      return formatTennisSetScore(setA, setB);
    });

    return `${setsDisplay} | ${setScores.join(", ")}`;
  }

  return null;
}

/**
 * Extract the display name from a game participant node.
 */
export function getParticipantName(
  participant: { __typename: string; name?: string; player?: { firstName: string; lastName: string } },
): string {
  if (participant.__typename === "TeamInstance" && "name" in participant) {
    return participant.name as string;
  }
  if (participant.__typename === "IndividualParticipant" && "player" in participant) {
    const p = participant.player as { firstName: string; lastName: string };
    return `${p.firstName} ${p.lastName}`;
  }
  return "Unknown";
}
```

---

## 6. Component Architecture

### 6.1 GameScoreboard (NEW)

**File:** `src/components/game/game-scoreboard.tsx` -- `"use client"`

This is the most complex new component. It has two modes: display and edit.

**Props:**
```typescript
interface GameScoreboardProps {
  game: GameDetail;
}
```

**Internal state management:**
```typescript
const [isEditing, setIsEditing] = useState(false);
const [isPending, startTransition] = useTransition();

// For basketball/football:
const [scoreA, setScoreA] = useState<number>(0);
const [scoreB, setScoreB] = useState<number>(0);

// For tennis:
const [sets, setSets] = useState<{ playerA: TennisSetScoreInput; playerB: TennisSetScoreInput }[]>([]);
```

**Sub-components (within the same file or extracted if large):**

1. **`SimpleScoreDisplay`** -- Renders basketball/football score in display mode. Large centered numbers with participant names on sides.
2. **`SimpleScoreEditor`** -- Two number inputs, save/cancel buttons.
3. **`TennisScoreDisplay`** -- Table with player names, setsWon column, then one column per set.
4. **`TennisScoreEditor`** -- Editable table with rows per set, add/remove set buttons.

**Component hierarchy:**
```
GameScoreboard
  +-- Card (shadcn)
  |   +-- CardHeader with title + edit button (Pencil icon)
  |   +-- CardContent
  |       +-- if no participants: message
  |       +-- if basketball/football:
  |       |   +-- SimpleScoreDisplay (when !isEditing)
  |       |   +-- SimpleScoreEditor (when isEditing)
  |       +-- if tennis:
  |           +-- TennisScoreDisplay (when !isEditing)
  |           +-- TennisScoreEditor (when isEditing)
```

**Edit button visibility logic:**
```typescript
const canEdit = game.gameStatus === GameStatus.IN_PROGRESS ||
                game.gameStatus === GameStatus.COMPLETE;
```
The edit button (Pencil icon) is only rendered when `canEdit` is true.

**Save flow:**
1. User clicks Save
2. Component builds `UpdateParticipantScoreEntry[]` from local state
3. Calls `updateParticipantScores` server action
4. On success: exit edit mode, show toast
5. On error: show error toast, remain in edit mode

**Tennis setsWon computation:**
Before submitting, compute `setsWon` client-side:
```typescript
const setsWonA = sets.filter(s => s.playerA.gamesWon > s.playerB.gamesWon).length;
const setsWonB = sets.filter(s => s.playerB.gamesWon > s.playerA.gamesWon).length;
```

**shadcn components used:** `Card`, `CardHeader`, `CardContent`, `CardTitle`, `Button`, `Input`, `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`.

### 6.2 Game Card Changes

**File:** `src/components/game/game-card.tsx`

Changes:
- Replace `game.sportSubtype` with `getSubtypeFromMetadata(game.metadata)`
- After the participant names display, add a score line using `formatGameScore()`
- Import `getSubtypeFromMetadata` from constants, `formatGameScore` from format-score

```diff
-import type { GameNode, IndividualParticipantNode, TeamInstanceNode } from "@/lib/types/game";
+import type { GameNode, IndividualParticipantNode, TeamInstanceNode, GameParticipant } from "@/lib/types/game";
+import { getSubtypeFromMetadata } from "@/lib/constants";
+import { formatGameScore, getParticipantName } from "@/lib/format-score";

 // In JSX, subtype badge:
-{t(`sportSubtypes.${game.sportSubtype}`)}
+{t(`sportSubtypes.${getSubtypeFromMetadata(game.metadata)}`)}

 // After participant names, add score:
+const participants = game.participants.edges.map((e) => e.node);
+const scoreText = participants.length >= 2
+  ? formatGameScore(game.sportType, participants[0], participants[1])
+  : null;
+
+{scoreText && (
+  <div className="text-sm font-semibold">{scoreText}</div>
+)}
```

### 6.3 Profile Game Card Changes

**File:** `src/components/profile/game-card.tsx`

Same pattern as 6.2:
- Replace `game.sportSubtype` references with `getSubtypeFromMetadata(game.metadata)`
- Add score display using `formatGameScore()`

### 6.4 Game Detail Header Changes

**File:** `src/components/game/game-detail-header.tsx`

```diff
+import { getSubtypeFromMetadata } from "@/lib/constants";
+import type { GameMetadata } from "@/lib/types/game";

 // Subtype text:
-const subtypeText = t(`sportSubtypes.${game.sportSubtype}`);
+const subtypeText = t(`sportSubtypes.${getSubtypeFromMetadata(game.metadata)}`);

 // Optionally add secondary metadata line:
+const metadataDescription = getMetadataDescription(game.metadata, t);
+
+{metadataDescription && (
+  <p className="mt-1 text-sm text-muted-foreground">{metadataDescription}</p>
+)}
```

The `getMetadataDescription` helper (local to the component):
```typescript
function getMetadataDescription(
  metadata: GameMetadata,
  t: (key: string, values?: Record<string, unknown>) => string,
): string | null {
  switch (metadata.__typename) {
    case "BasketballGameMetadata":
    case "FootballGameMetadata":
      return metadata.periods
        ? t("game.metadata.periods", { count: metadata.periods })
        : null;
    case "TennisGameMetadata": {
      const parts: string[] = [t("game.metadata.bestOf", { count: metadata.bestOf })];
      parts.push(
        metadata.tiebreakFinalSet
          ? t("game.metadata.tiebreakFinalSet")
          : t("game.metadata.noTiebreakFinalSet"),
      );
      return parts.join(", ");
    }
    default:
      return null;
  }
}
```

Additionally, pass `metadata` and `sportType` to `UpdateGameForm`:
```diff
 <UpdateGameForm
   gameId={game.id}
   currentStartDate={game.startDate}
+  metadata={game.metadata}
+  sportType={game.sportType}
   onSuccess={() => setShowUpdateDialog(false)}
 />
```

### 6.5 Game Participants Changes

**File:** `src/components/game/game-participants.tsx`

```diff
-const participationType = getParticipationType(game.sportSubtype);
+const participationType = getParticipationType(getSubtypeFromMetadata(game.metadata));

-const maxParticipants = getMaxParticipants(game.sportSubtype);
+const maxParticipants = getMaxParticipants(getSubtypeFromMetadata(game.metadata));
```

### 6.6 Team Card Changes

**File:** `src/components/game/team-card.tsx`

No reference to `team.attributes` in the current template JSX (it is only on the type). The type change from `attributes` to `metadata` on `TeamInstanceDetail` is sufficient. No JSX changes needed -- the team card does not display scores (the scoreboard handles that).

### 6.7 Individual Participant List

**File:** `src/components/game/individual-participant-list.tsx`

No display changes needed. The type `GameParticipantDetail` union automatically picks up the new `metadata` field from `IndividualParticipantNode`.

### 6.8 Game Detail Page Layout Changes

**File:** `src/app/[locale]/game/[id]/page.tsx`

```diff
+import { GameScoreboard } from "@/components/game/game-scoreboard";
+import {
+  gameMetadataFragment,
+  participantDetailNodeFragment,
+} from "@/lib/graphql-fragments";

 // In the JSX, insert scoreboard between header and schedule card:
 <GameDetailHeader game={game} currentPlayerId={player.id} />

+{/* Scoreboard */}
+<div className="mb-8">
+  <GameScoreboard game={game} />
+</div>
+
 {/* Schedule Info */}
 <Card className="mb-8">
```

---

## 7. Create / Update Form Changes

### 7.1 Create Game Form

**File:** `src/components/game/create-game-form.tsx`

**New shadcn component needed:** `Collapsible` from shadcn/ui. Install via:
```bash
npx shadcn@latest add collapsible
```

**Zod schema changes:**
```typescript
const createGameSchema = z
  .object({
    sportType: z.enum(sportTypeKeys, {
      message: t("game.validation.sportTypeRequired"),
    }),
    subtype: z.enum(sportSubtypeKeys, {
      message: t("game.validation.subtypeRequired"),
    }),
    startDate: z.date({
      message: t("game.validation.startDateRequired"),
    }),
    // Advanced options -- all optional
    periods: z.coerce.number().int().positive({ message: t("game.validation.periodsPositive") }).optional(),
    bestOf: z.coerce.number().refine((v) => v === 3 || v === 5, {
      message: t("game.validation.bestOfRequired"),
    }).optional(),
    tiebreakFinalSet: z.boolean().optional(),
  })
  .refine(/* existing subtype validation */);
```

**Advanced Options UI:**

After the Start Date field, add:
```tsx
{selectedSportType && (
  <Collapsible>
    <CollapsibleTrigger asChild>
      <Button variant="link" type="button" className="px-0">
        {t("game.form.advancedOptions")}
        <ChevronDown className="ml-1 h-4 w-4" />
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent className="space-y-4 pt-2">
      {/* Basketball / Football: periods */}
      {(selectedSportType === "BASKETBALL" || selectedSportType === "FOOTBALL") && (
        <FormField
          control={form.control}
          name="periods"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("game.form.periods")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  placeholder={/* default based on subtype */}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Tennis: bestOf + tiebreakFinalSet */}
      {selectedSportType === "TENNIS" && (
        <>
          <FormField
            control={form.control}
            name="bestOf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("game.form.bestOf")}</FormLabel>
                <FormControl>
                  <Select value={field.value?.toString()} onValueChange={(v) => field.onChange(Number(v))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("game.form.bestOfPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tiebreakFinalSet"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel>{t("game.form.tiebreakFinalSet")}</FormLabel>
              </FormItem>
            )}
          />
        </>
      )}
    </CollapsibleContent>
  </Collapsible>
)}
```

**Form submission changes:**

```typescript
const handleSubmit = async (values: FormData) => {
  const sportType = values.sportType as SportType;

  let input: CreateGameInput;

  if (sportType === "BASKETBALL") {
    input = {
      sportType: "BASKETBALL",
      startDate: values.startDate.toISOString(),
      metadata: {
        subtype: values.subtype as "FIVE_ON_FIVE" | "THREE_ON_THREE",
        ...(values.periods !== undefined && { periods: values.periods }),
      },
    };
  } else if (sportType === "FOOTBALL") {
    input = {
      sportType: "FOOTBALL",
      startDate: values.startDate.toISOString(),
      metadata: {
        subtype: values.subtype as "FLAG_FOOTBALL" | "AMERICAN_FOOTBALL",
        ...(values.periods !== undefined && { periods: values.periods }),
      },
    };
  } else {
    input = {
      sportType: "TENNIS",
      startDate: values.startDate.toISOString(),
      metadata: {
        subtype: values.subtype as "SINGLES" | "DOUBLES",
        ...(values.bestOf !== undefined && { bestOf: values.bestOf }),
        ...(values.tiebreakFinalSet !== undefined && { tiebreakFinalSet: values.tiebreakFinalSet }),
      },
    };
  }

  const result = await createGame(input);
  // ... rest unchanged
};
```

### 7.2 Update Game Form

**File:** `src/components/game/update-game-form.tsx`

**Props changes:**
```diff
 interface UpdateGameFormProps {
   gameId: number;
   currentStartDate: string;
+  metadata: GameMetadata;
+  sportType: SportType;
   onSuccess?: () => void;
 }
```

**Form schema:**
Same optional fields as create form (`periods`, `bestOf`, `tiebreakFinalSet`), pre-populated from `metadata` prop.

**Default values:**
```typescript
const form = useForm<FormData>({
  resolver: zodResolver(updateGameSchema),
  defaultValues: {
    startDate: new Date(currentStartDate),
    periods: metadata.__typename === "BasketballGameMetadata" || metadata.__typename === "FootballGameMetadata"
      ? metadata.periods ?? undefined
      : undefined,
    bestOf: metadata.__typename === "TennisGameMetadata" ? metadata.bestOf : undefined,
    tiebreakFinalSet: metadata.__typename === "TennisGameMetadata" ? metadata.tiebreakFinalSet : undefined,
  },
});
```

**Submission:**
Only include `metadata` in the `UpdateGameInput` if any metadata field was changed from its original value. Build the `@oneOf` `metadata` object matching the game's sport type.

---

## 8. Server Action Changes

### 8.1 `src/app/[locale]/game/actions.ts`

#### `createGame`

```diff
 export async function createGame(input: CreateGameInput): Promise<GameActionResult> {
   try {
     let mutationInput: object;

     if (input.sportType === "BASKETBALL") {
       mutationInput = {
         basketball: {
           startDate: input.startDate,
-          subtype: new EnumType(input.subtype),
+          metadata: {
+            subtype: new EnumType(input.metadata.subtype),
+            ...(input.metadata.periods !== undefined && { periods: input.metadata.periods }),
+          },
         },
       };
     } else if (input.sportType === "FOOTBALL") {
       mutationInput = {
         football: {
           startDate: input.startDate,
-          subtype: new EnumType(input.subtype),
+          metadata: {
+            subtype: new EnumType(input.metadata.subtype),
+            ...(input.metadata.periods !== undefined && { periods: input.metadata.periods }),
+          },
         },
       };
     } else {
       mutationInput = {
         tennis: {
           startDate: input.startDate,
-          subtype: new EnumType(input.subtype),
+          metadata: {
+            subtype: new EnumType(input.metadata.subtype),
+            ...(input.metadata.bestOf !== undefined && { bestOf: input.metadata.bestOf }),
+            ...(input.metadata.tiebreakFinalSet !== undefined && { tiebreakFinalSet: input.metadata.tiebreakFinalSet }),
+          },
         },
       };
     }

     const response = await authMutate({
       createGame: {
         __args: { input: mutationInput },
         game: {
           id: true,
           sportType: true,
-          sportSubtype: true,
+          metadata: gameMetadataFragment,
           gameStatus: true,
           startDate: true,
         },
       },
     });
     // ... rest unchanged
```

#### `updateGame`

```diff
 export async function updateGame(input: UpdateGameInput): Promise<GameActionResult> {
   try {
     const mutationInput: Record<string, unknown> = { id: input.id };
     if (input.startDate) mutationInput.startDate = input.startDate;
+    if (input.metadata) {
+      // Build @oneOf GameMetadataInput with EnumType for subtype values
+      const metadataInput: Record<string, unknown> = {};
+      if (input.metadata.basketball) {
+        const b: Record<string, unknown> = {};
+        if (input.metadata.basketball.subtype) b.subtype = new EnumType(input.metadata.basketball.subtype);
+        if (input.metadata.basketball.periods !== undefined) b.periods = input.metadata.basketball.periods;
+        metadataInput.basketball = b;
+      } else if (input.metadata.tennis) {
+        const t: Record<string, unknown> = {};
+        if (input.metadata.tennis.subtype) t.subtype = new EnumType(input.metadata.tennis.subtype);
+        if (input.metadata.tennis.bestOf !== undefined) t.bestOf = input.metadata.tennis.bestOf;
+        if (input.metadata.tennis.tiebreakFinalSet !== undefined) t.tiebreakFinalSet = input.metadata.tennis.tiebreakFinalSet;
+        metadataInput.tennis = t;
+      } else if (input.metadata.football) {
+        const f: Record<string, unknown> = {};
+        if (input.metadata.football.subtype) f.subtype = new EnumType(input.metadata.football.subtype);
+        if (input.metadata.football.periods !== undefined) f.periods = input.metadata.football.periods;
+        metadataInput.football = f;
+      }
+      mutationInput.metadata = metadataInput;
+    }

     const response = await authMutate({
       updateGame: {
         __args: { input: mutationInput },
         game: {
           id: true,
           startDate: true,
+          metadata: gameMetadataFragment,
         },
       },
     });
     // ... rest unchanged
```

#### `loadMoreGames`

```diff
 // In the query node:
-sportSubtype: true,
+metadata: gameMetadataFragment,

 // In participant node:
-node: {
-  __typename: true,
-  __on: [
-    { __typeName: "TeamInstance", id: true, name: true, players: { ... } },
-    { __typeName: "IndividualParticipant", id: true, player: { ... } },
-  ],
-},
+node: participantNodeFragment,
```

### 8.2 `src/app/[locale]/game/participant-actions.ts`

#### `addTeamParticipant`

```diff
-if (input.attributes !== undefined) mutationInput.attributes = input.attributes;

 // In response query, replace attributes with metadata:
-attributes: true,
+metadata: participantMetadataFragment,
```

#### `updateTeamParticipant`

```diff
-if (input.attributes !== undefined) mutationInput.attributes = input.attributes;
+if (input.metadata !== undefined) mutationInput.metadata = input.metadata;

 // In response query:
-attributes: true,
+metadata: participantMetadataFragment,
```

#### `addIndividualParticipant`

```diff
 // In response query, add metadata:
 participant: {
   __on: {
     __typeName: "IndividualParticipant",
     id: true,
     player: { id: true, firstName: true, lastName: true },
+    metadata: participantMetadataFragment,
   },
 },
```

#### New action: `updateParticipantScores`

```typescript
import type { UpdateParticipantScoreEntry } from "@/lib/types/game";
import type { SportType } from "@/lib/constants";

/**
 * Bulk update participant scores via the updateGameParticipants mutation.
 * Used by the GameScoreboard save button.
 */
export async function updateParticipantScores(
  entries: UpdateParticipantScoreEntry[],
): Promise<ParticipantActionResult> {
  try {
    // Determine if team or individual based on first entry
    const isTeam = entries[0]?.isTeam ?? true;

    let mutationInput: object;

    if (isTeam) {
      mutationInput = {
        teamInstances: {
          teamInstances: entries.map((e) => ({
            id: e.id,
            metadata: e.metadata,
          })),
        },
      };
    } else {
      mutationInput = {
        individuals: {
          individuals: entries.map((e) => ({
            id: e.id,
            metadata: e.metadata,
          })),
        },
      };
    }

    const response = await authMutate({
      updateGameParticipants: {
        __args: { input: mutationInput },
        participants: {
          __on: [
            {
              __typeName: "TeamInstance",
              id: true,
              metadata: participantMetadataFragment,
            },
            {
              __typeName: "IndividualParticipant",
              id: true,
              metadata: participantMetadataFragment,
            },
          ],
        },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true };
  } catch (error) {
    console.error("Failed to update participant scores:", error);
    return { success: false, error: "Failed to update scores" };
  }
}
```

### 8.3 `src/app/[locale]/user/[username]/actions.ts`

#### `loadMoreGames`

```diff
+import { gameMetadataFragment, participantNodeFragment } from "@/lib/graphql-fragments";

 // In the query node:
-sportSubtype: true,
+metadata: gameMetadataFragment,

 // In participant node:
-node: { __typename: true, __on: [...] },
+node: participantNodeFragment,
```

### 8.4 `src/app/[locale]/user/[username]/page.tsx`

#### `buildGamesQuery`

Same changes as 8.3 -- replace `sportSubtype` with `metadata` fragment, replace inline participant `__on` with `participantNodeFragment`.

### 8.5 `src/app/[locale]/games/page.tsx`

Same pattern: replace `sportSubtype: true` with `metadata: gameMetadataFragment` and inline participant `__on` with `participantNodeFragment`.

### 8.6 `src/app/[locale]/game/[id]/page.tsx`

#### `generateMetadata`

```diff
 const response = await authQuery({
   game: {
     __args: { id },
     sportType: true,
-    sportSubtype: true,
+    metadata: gameMetadataFragment,
   },
 });

 if (game) {
+  const subtype = getSubtypeFromMetadata(game.metadata);
   return {
     title: `${game.sportType} Game | Playground`,
-    description: `${game.sportType} - ${game.sportSubtype}`,
+    description: `${game.sportType} - ${subtype}`,
   };
 }
```

#### Main game detail query

```diff
-sportSubtype: true,
+metadata: gameMetadataFragment,

 // Replace participant inline fragments:
-node: {
-  __typename: true,
-  __on: [
-    { __typeName: "TeamInstance", id: true, name: true, description: true, players: { ... }, attributes: true },
-    { __typeName: "IndividualParticipant", id: true, player: { ... } },
-  ],
-},
+node: participantDetailNodeFragment,
```

---

## 9. i18n Keys

### File: `messages/en.json`

Add the following keys under the existing `"game"` namespace:

```json
{
  "game": {
    "scoreboard": {
      "title": "Score",
      "noParticipants": "Add participants to track scores",
      "noScores": "No scores recorded",
      "edit": "Edit Score",
      "save": "Save Score",
      "cancel": "Cancel",
      "saving": "Saving...",
      "scoreUpdated": "Score updated",
      "scoreUpdateError": "Failed to update score",
      "set": "Set",
      "sets": "Sets",
      "addSet": "Add Set",
      "removeSet": "Remove Set",
      "gamesWon": "Games",
      "tiebreakPoints": "TB",
      "setsWon": "Sets Won",
      "points": "Points"
    },
    "form": {
      "advancedOptions": "Advanced Options",
      "periods": "Number of Periods",
      "periodsPlaceholder": "Default: {default}",
      "bestOf": "Best Of",
      "bestOfPlaceholder": "Default: 3",
      "tiebreakFinalSet": "Tiebreak in Final Set"
    },
    "metadata": {
      "periods": "{count, plural, one {# Period} other {# Periods}}",
      "bestOf": "Best of {count}",
      "tiebreakFinalSet": "Final Set Tiebreak",
      "noTiebreakFinalSet": "No Final Set Tiebreak"
    },
    "validation": {
      "periodsPositive": "Periods must be a positive number",
      "bestOfRequired": "Best of must be 3 or 5",
      "scoreNonNegative": "Score must be 0 or greater",
      "gamesWonNonNegative": "Games won must be 0 or greater",
      "tiebreakPointsNonNegative": "Tiebreak points must be 0 or greater"
    }
  }
}
```

These keys merge into the existing `game` namespace. The `game.form` and `game.validation` namespaces already exist, so these are additive.

---

## 10. shadcn/ui Components

### Already available (no install needed):
- `Card`, `CardHeader`, `CardContent`, `CardTitle` -- scoreboard container
- `Button` -- edit/save/cancel buttons
- `Input` -- score number inputs
- `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell` -- tennis score table
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` -- bestOf select
- `Switch` -- tiebreakFinalSet toggle
- `Badge` -- subtype badges (already used)
- `Dialog` -- update form dialog (already used)

### Need to install:
- **`Collapsible`** -- for the Advanced Options section in create/update forms
  ```bash
  npx shadcn@latest add collapsible
  ```

---

## 11. Implementation Phases

### Phase 1: Foundation (no UI changes yet)
1. Create `src/lib/graphql-fragments.ts` with reusable fragment objects
2. Create `src/lib/format-score.ts` with formatting utilities
3. Add `getSubtypeFromMetadata` to `src/lib/constants.ts`
4. Update all types in `src/lib/types/game.ts`

### Phase 2: Query / Action Updates (backend contract)
5. Update `src/app/[locale]/game/actions.ts` -- `createGame`, `updateGame`, `loadMoreGames`
6. Update `src/app/[locale]/game/participant-actions.ts` -- remove `attributes`, add `metadata` fragments, add `updateParticipantScores`
7. Update `src/app/[locale]/user/[username]/actions.ts` -- `loadMoreGames`
8. Update `src/app/[locale]/user/[username]/page.tsx` -- `buildGamesQuery`
9. Update `src/app/[locale]/games/page.tsx` -- inline query
10. Update `src/app/[locale]/game/[id]/page.tsx` -- `generateMetadata` + main query + layout

### Phase 3: Display Components
11. Update `src/components/game/game-card.tsx` -- subtype + score display
12. Update `src/components/profile/game-card.tsx` -- subtype + score display
13. Update `src/components/game/game-detail-header.tsx` -- subtype + metadata description
14. Update `src/components/game/game-participants.tsx` -- use `getSubtypeFromMetadata`
15. Create `src/components/game/game-scoreboard.tsx` -- display mode only first

### Phase 4: Scoreboard Editing
16. Add inline editing to `GameScoreboard` -- simple score editor (basketball/football)
17. Add tennis score editor to `GameScoreboard`
18. Wire save flow to `updateParticipantScores` server action

### Phase 5: Forms
19. Install `collapsible` shadcn component
20. Update `src/components/game/create-game-form.tsx` -- Advanced Options
21. Update `src/components/game/update-game-form.tsx` -- Advanced Options with pre-population

### Phase 6: i18n + Cleanup
22. Add all new i18n keys to `messages/en.json`
23. Remove any remaining `sportSubtype` / `attributes` references
24. Run `npm run build` and `npm run lint` to verify

---

## 12. Design Feedback and Alternatives

### 12.1 Fragment approach

**Chosen:** Shared fragment objects in `src/lib/graphql-fragments.ts`.

**Alternative:** Inline the union fragments everywhere. This is simpler for small projects but leads to 6+ copies of identical 20-line objects. Any schema change (e.g., adding a new sport) would require updating every copy. The shared fragment approach is strongly preferred.

### 12.2 Scoreboard as server vs client component

**Chosen:** Client component (`"use client"`) because it needs interactive editing state (toggling edit mode, controlled inputs, optimistic updates).

**Alternative:** Server component for display with a client island for editing. This would split the component into `GameScoreboardServer` + `GameScoreboardEditor`, adding complexity for marginal benefit since the scoreboard data is already fetched server-side and passed as props. Not recommended.

### 12.3 Tennis score editor -- controlled vs uncontrolled

**Chosen:** Fully controlled state with `useState` arrays. This ensures computed `setsWon` stays in sync and validation is straightforward.

**Alternative:** Use `react-hook-form` with dynamic field arrays (`useFieldArray`). This adds a dependency on the form library for a component that is not a traditional form. The controlled approach is simpler for this case.

### 12.4 Bulk vs individual score mutation

**Chosen:** `updateGameParticipants` (bulk) mutation for saving scores. This sends both participants' scores in a single request, avoiding inconsistent states.

**Alternative:** Two sequential `updateGameParticipant` calls. This risks partial failures (player A score saved, player B fails). The bulk approach is safer and matches the GraphQL schema design.

### 12.5 Schema observation

The `CreateGameInput` in the GraphQL schema uses `@oneOf` at the sport level (the `startDate` lives inside each sport branch, e.g., `CreateBasketballGameInput.startDate`). This means the current client code that sends `subtype` directly inside the sport branch needs to change to send it inside a nested `metadata` object. The schema confirms this is correct: `CreateBasketballGameInput` has `metadata: CreateBasketballGameMetadataInput!` which contains `subtype: BasketballSubtype!`. The `subtype` is no longer a direct field on the sport input; it is nested one level deeper.

### 12.6 No schema changes needed

The GraphQL schema already supports all required operations:
- `CreateGameInput` with `@oneOf` and nested metadata
- `UpdateGameInput` with optional `metadata: GameMetadataInput`
- `UpdateGameParticipantsInput` with `@oneOf` for bulk team/individual updates
- `ParticipantMetadataInput` with `@oneOf` for basketball/tennis/football scores
- All union types (`GameMetadata`, `ParticipantMetadata`) support inline fragments

No backend API changes are needed.

---

## 13. Files Summary

| File | Status | Description |
|------|--------|-------------|
| `src/lib/types/game.ts` | MODIFY | New metadata types, remove `sportSubtype`/`attributes` |
| `src/lib/constants.ts` | MODIFY | Add `getSubtypeFromMetadata` helper |
| `src/lib/graphql-fragments.ts` | NEW | Reusable GraphQL fragment objects |
| `src/lib/format-score.ts` | NEW | Score formatting utilities |
| `src/components/game/game-scoreboard.tsx` | NEW | Scoreboard with inline editing |
| `src/components/game/game-card.tsx` | MODIFY | Score display, subtype path |
| `src/components/profile/game-card.tsx` | MODIFY | Score display, subtype path |
| `src/components/game/game-detail-header.tsx` | MODIFY | Subtype path, metadata description, pass props to UpdateGameForm |
| `src/components/game/game-participants.tsx` | MODIFY | Subtype path |
| `src/components/game/team-card.tsx` | MODIFY | Type change only (attributes -> metadata) |
| `src/components/game/individual-participant-list.tsx` | MODIFY | Type change only |
| `src/components/game/create-game-form.tsx` | MODIFY | Advanced Options section |
| `src/components/game/update-game-form.tsx` | MODIFY | Advanced Options, new props |
| `src/app/[locale]/game/actions.ts` | MODIFY | Mutation/query updates |
| `src/app/[locale]/game/participant-actions.ts` | MODIFY | Remove attributes, add score action |
| `src/app/[locale]/game/[id]/page.tsx` | MODIFY | Query, layout, scoreboard |
| `src/app/[locale]/games/page.tsx` | MODIFY | Query shape |
| `src/app/[locale]/user/[username]/actions.ts` | MODIFY | Query shape |
| `src/app/[locale]/user/[username]/page.tsx` | MODIFY | Query shape |
| `messages/en.json` | MODIFY | New i18n keys |
| `src/components/ui/collapsible.tsx` | NEW (shadcn) | Install via `npx shadcn@latest add collapsible` |
