# Game CRUD - Design Document

## Overview

This document outlines the technical design for the Game CRUD feature based on the requirements in `requirements.md`. The feature enables authenticated users with a player profile to create, view, update, delete, start, and end games. It also supports participant management and basketball box scores.

---

## Component Architecture

### Component Hierarchy

```
src/app/[locale]/games/
  page.tsx                      # Server component - game list with filters
  loading.tsx                   # Skeleton for game list page

src/app/[locale]/game/[id]/
  page.tsx                      # Server component - game detail page
  loading.tsx                   # Skeleton for game detail page

src/app/[locale]/game/
  actions.ts                    # Server actions for game CRUD
  participant-actions.ts        # Server actions for participant management
  box-score-actions.ts          # Server actions for box score mutations

src/components/game/
  game-card.tsx                 # Client - game card for list display
  game-list-filters.tsx         # Client - filter controls
  game-list-sort.tsx            # Client - sort controls
  game-infinite-list.tsx        # Client - infinite scroll container
  game-status-badge.tsx         # Client - color-coded status badge
  create-game-dialog.tsx        # Client - dialog wrapper for create form
  create-game-form.tsx          # Client - create game form
  update-game-form.tsx          # Client - update game form (start date)
  game-detail-header.tsx        # Client - header with status and actions
  delete-game-dialog.tsx        # Client - delete confirmation dialog
  game-participants.tsx         # Client - participants section orchestrator
  team-card.tsx                 # Client - team display/edit card
  add-team-form.tsx             # Client - form to add a team
  individual-participant-list.tsx  # Client - individual participants list
  basketball-box-score-table.tsx   # Client - box score display table (TanStack)
  basketball-box-score-form.tsx    # Client - box score edit form

src/lib/
  constants.ts                  # Update with max team sizes
  types/game.ts                 # Update with additional game types
```

### Component Details

| Component | Type | Description |
|-----------|------|-------------|
| `games/page.tsx` | Server | Auth/player check, fetches initial games, renders list |
| `games/loading.tsx` | Server | Skeleton UI during page load |
| `game/[id]/page.tsx` | Server | Auth/player check, fetches game details, renders detail |
| `game/[id]/loading.tsx` | Server | Skeleton UI during page load |
| `actions.ts` | Server Actions | createGame, updateGame, deleteGame, startGame, endGame |
| `participant-actions.ts` | Server Actions | addTeamParticipant, addIndividualParticipant, updateTeamParticipant, removeTeamParticipant, removeIndividualParticipant, joinTeam (addPlayerToTeamInstance), leaveTeam (removePlayerFromTeamInstance) |
| `box-score-actions.ts` | Server Actions | saveBasketballBoxScore(s) mutations |
| `GameCard` | Client | Card display for game list items (reuse from profile) |
| `GameListFilters` | Client | Filter controls with URL sync |
| `GameListSort` | Client | Sort controls with URL sync |
| `GameInfiniteList` | Client | Infinite scroll with client-side edge accumulation |
| `GameStatusBadge` | Client | Color-coded badge for game status |
| `CreateGameDialog` | Client | Dialog wrapper with trigger button |
| `CreateGameForm` | Client | Form with sport selection, subtype, date picker |
| `UpdateGameForm` | Client | Form for updating start date |
| `GameDetailHeader` | Client | Header with sport info, status, action buttons |
| `DeleteGameDialog` | Client | AlertDialog for delete confirmation |
| `GameParticipants` | Client | Orchestrates team or individual participant views |
| `TeamCard` | Client | Team display with player list, edit/remove actions |
| `AddTeamForm` | Client | Form for adding a new team to a game |
| `IndividualParticipantList` | Client | List of individual participants |
| `BasketballBoxScoreTable` | Client | TanStack Table for box score display |
| `BasketballBoxScoreForm` | Client | Form for editing box scores |

---

## Data Flow

### Game List Page Flow

```
User visits /games
       |
       v
games/page.tsx (Server)
  |-- Check auth (redirect if not authenticated)
  |-- Check player profile (show PlayerRequiredModal if none)
  |-- Parse URL query params for filters/sort
  |-- Fetch initial games via authQuery with filters
  |-- Pass data to client components
       |
       v
GameListFilters + GameListSort (Client)
  |-- User changes filters -> update URL params -> trigger router refresh
       |
       v
GameInfiniteList (Client)
  |-- Renders GameCard for each game
  |-- On scroll near bottom: fetch more via server action
  |-- Accumulate edges, update endCursor
```

### Game Detail Page Flow

```
User visits /game/[id]
       |
       v
game/[id]/page.tsx (Server)
  |-- Check auth (redirect if not authenticated)
  |-- Check player profile (show PlayerRequiredModal if none)
  |-- Fetch game by id via authQuery
  |-- If null: show "Game not found" error state
  |-- Fetch basketball box scores if sportType is BASKETBALL
  |-- Pass data to client components
       |
       v
GameDetailHeader (Client)
  |-- Displays sport type, subtype, status
  |-- Action buttons: Start/End (based on status), Edit, Delete
       |
       v
GameParticipants (Client)
  |-- If team-based: renders TeamCard components
  |-- If individual: renders IndividualParticipantList
       |
       v
BasketballBoxScoreTable (Client) [Basketball only]
  |-- Displays box scores with TanStack Table
  |-- Edit button opens BasketballBoxScoreForm
```

### Create Game Flow

```
User clicks "Create Game" button
       |
       v
CreateGameDialog opens
       |
       v
CreateGameForm (Client)
  |-- User selects sport type
  |-- Subtype options update dynamically
  |-- User selects start date (defaults to now)
  |-- Form validates with Zod
       |
       v
Submit calls createGame server action
       |
       v
Server action uses authMutate with @oneOf input
       |
       v
On success: redirect to /game/[newId]
On error: toast notification
```

### Start/End Game Flow

```
User clicks "Start Game" (status: SCHEDULED)
       |
       v
startGame server action called
       |
       v
Server action uses authMutate
       |
       v
revalidatePath("/game/[id]")
       |
       v
Page refreshes, status now IN_PROGRESS
       |
       v
User clicks "End Game" (status: IN_PROGRESS)
       |
       v
endGame server action called
       |
       v
Page refreshes, status now COMPLETE
```

---

## GraphQL Operations

### Query: Fetch Games List

```typescript
// src/app/[locale]/games/page.tsx
const gamesListQuery = {
  games: {
    __args: {
      input: {
        startAfter: filterStartAfter,
        startBefore: filterStartBefore,
        endAfter: filterEndAfter,
        endBefore: filterEndBefore,
        sportType: filterSportType ? new EnumType(filterSportType) : undefined,
        playerId: filterPlayerId,
        gameStatus: filterGameStatus ? new EnumType(filterGameStatus) : undefined,
        ownerId: myGamesOnly ? currentUserId : undefined,
      },
      sort: [
        {
          field: new EnumType(sortField),
          direction: new EnumType(sortDirection),
        },
      ],
      first: 20,
      after: cursor,
    },
    edges: {
      cursor: true,
      node: {
        id: true,
        startDate: true,
        endDate: true,
        sportType: true,
        sportSubtype: true,
        gameStatus: true,
        participants: {
          __args: { first: 10 },
          edges: {
            node: {
              __on: [
                {
                  __typeName: "TeamInstance",
                  id: true,
                  name: true,
                  players: { id: true, firstName: true, lastName: true },
                },
                {
                  __typeName: "IndividualParticipant",
                  id: true,
                  player: { id: true, firstName: true, lastName: true },
                },
              ],
            },
          },
        },
      },
    },
    pageInfo: {
      hasNextPage: true,
      endCursor: true,
    },
  },
};
```

### Query: Fetch Game Detail

```typescript
// src/app/[locale]/game/[id]/page.tsx
const gameDetailQuery = (gameId: string) => ({
  game: {
    __args: { id: gameId },
    id: true,
    startDate: true,
    endDate: true,
    sportType: true,
    sportSubtype: true,
    gameStatus: true,
    participants: {
      __args: { first: 50 },
      edges: {
        cursor: true,
        node: {
          __on: [
            {
              __typeName: "TeamInstance",
              id: true,
              name: true,
              description: true,
              players: { id: true, firstName: true, lastName: true },
              attributes: true,
            },
            {
              __typeName: "IndividualParticipant",
              id: true,
              player: { id: true, firstName: true, lastName: true },
            },
          ],
        },
      },
      pageInfo: {
        hasNextPage: true,
        endCursor: true,
      },
    },
  },
});
```

### Query: Fetch Basketball Box Scores

```typescript
// src/app/[locale]/game/[id]/page.tsx
const boxScoresQuery = (gameId: string) => ({
  basketballBoxScores: {
    __args: {
      input: { gameIds: [gameId] },
      sort: [{ field: new EnumType("POINTS"), direction: new EnumType("DESC") }],
      first: 50,
    },
    edges: {
      cursor: true,
      node: {
        id: true,
        player: { id: true, firstName: true, lastName: true },
        points: true,
        assists: true,
        totalRebounds: true,
        offensiveRebounds: true,
        defensiveRebounds: true,
        steals: true,
        blocks: true,
        turnovers: true,
        personalFouls: true,
        fieldGoalsMade: true,
        fieldGoalsAttempted: true,
        fieldGoalPercentage: true,
        threePointersMade: true,
        threePointersAttempted: true,
        threePointerPercentage: true,
        twoPointersMade: true,
        twoPointersAttempted: true,
        twoPointerPercentage: true,
        freeThrowsMade: true,
        freeThrowsAttempted: true,
        freeThrowPercentage: true,
      },
    },
    pageInfo: {
      hasNextPage: true,
      endCursor: true,
    },
  },
});
```

### Mutation: Create Game

```typescript
// src/app/[locale]/game/actions.ts
export async function createGame(input: CreateGameInput) {
  // Build @oneOf input based on sport type
  let mutationInput: object;

  if (input.sportType === "BASKETBALL") {
    mutationInput = {
      basketball: {
        startDate: input.startDate,
        subtype: new EnumType(input.subtype),
      },
    };
  } else if (input.sportType === "FOOTBALL") {
    mutationInput = {
      football: {
        startDate: input.startDate,
        subtype: new EnumType(input.subtype),
      },
    };
  } else {
    mutationInput = {
      tennis: {
        startDate: input.startDate,
        subtype: new EnumType(input.subtype),
      },
    };
  }

  const response = await authMutate({
    createGame: {
      __args: { input: mutationInput },
      game: { id: true, sportType: true, sportSubtype: true, gameStatus: true },
    },
  });
  // Handle response...
}
```

### Mutation: Start Game

```typescript
// src/app/[locale]/game/actions.ts
export async function startGame(gameId: string, startDate?: Date) {
  const response = await authMutate({
    startGame: {
      __args: { input: { id: gameId, startDate: startDate?.toISOString() } },
      game: { id: true, gameStatus: true, startDate: true },
    },
  });
  // Handle response, revalidatePath...
}
```

### Mutation: End Game

```typescript
// src/app/[locale]/game/actions.ts
export async function endGame(gameId: string, endDate?: Date) {
  const response = await authMutate({
    endGame: {
      __args: { input: { id: gameId, endDate: endDate?.toISOString() } },
      game: { id: true, gameStatus: true, endDate: true },
    },
  });
  // Handle response, revalidatePath...
}
```

### Mutation: Add Team Instance

```typescript
// src/app/[locale]/game/participant-actions.ts
export async function addTeamToGame(input: AddTeamInput) {
  const response = await authMutate({
    addGameParticipant: {
      __args: {
        input: {
          teamInstance: {
            gameId: input.gameId,
            name: input.name,
            description: input.description,
            playerIds: input.playerIds,
            attributes: input.attributes,
          },
        },
      },
      participant: {
        __on: {
          __typeName: "TeamInstance",
          id: true,
          name: true,
          players: { id: true, firstName: true, lastName: true },
        },
      },
    },
  });
  // Handle response...
}
```

### Mutation: Join Team (Add Player to Team Instance)

```typescript
// src/app/[locale]/game/participant-actions.ts
export async function joinTeam(input: JoinTeamInput) {
  const response = await authMutate({
    addPlayerToTeamInstance: {
      __args: {
        input: {
          teamInstanceId: input.teamInstanceId,
          playerId: input.playerId,
        },
      },
      teamInstance: {
        id: true,
        name: true,
        players: { id: true, firstName: true, lastName: true },
      },
    },
  });
  // Handle response...
}
```

### Mutation: Leave Team (Remove Player from Team Instance)

```typescript
// src/app/[locale]/game/participant-actions.ts
export async function leaveTeam(input: LeaveTeamInput) {
  const response = await authMutate({
    removePlayerFromTeamInstance: {
      __args: {
        input: {
          teamInstanceId: input.teamInstanceId,
          playerId: input.playerId,
        },
      },
      teamInstance: {
        id: true,
        name: true,
        players: { id: true, firstName: true, lastName: true },
      },
    },
  });
  // Handle response...
}
```

### Mutation: Remove Team Participant

```typescript
// src/app/[locale]/game/participant-actions.ts
export async function removeTeamParticipant(input: RemoveTeamInstanceInput) {
  const response = await authMutate({
    removeGameParticipant: {
      __args: {
        input: {
          teamInstance: { id: input.teamInstanceId },
        },
      },
      id: true,
    },
  });
  // Handle response...
}
```

### Mutation: Remove Individual Participant

```typescript
// src/app/[locale]/game/participant-actions.ts
export async function removeIndividualParticipant(input: RemoveIndividualParticipantInput) {
  const response = await authMutate({
    removeGameParticipant: {
      __args: {
        input: {
          individual: { gameId: input.gameId, playerId: input.playerId },
        },
      },
      id: true,
    },
  });
  // Handle response...
}
```

### Mutation: Save Basketball Box Scores

```typescript
// src/app/[locale]/game/box-score-actions.ts
export async function saveBasketballBoxScores(input: SaveBoxScoresInput) {
  const response = await authMutate({
    saveBasketballBoxScores: {
      __args: {
        input: {
          basketballBoxScores: input.scores.map((score) => ({
            playerId: score.playerId,
            gameId: score.gameId,
            assists: score.assists,
            steals: score.steals,
            blocks: score.blocks,
            turnovers: score.turnovers,
            personalFouls: score.personalFouls,
            offensiveRebounds: score.offensiveRebounds,
            defensiveRebounds: score.defensiveRebounds,
            threePointersMade: score.threePointersMade,
            threePointersAttempted: score.threePointersAttempted,
            twoPointersMade: score.twoPointersMade,
            twoPointersAttempted: score.twoPointersAttempted,
            freeThrowsMade: score.freeThrowsMade,
            freeThrowsAttempted: score.freeThrowsAttempted,
          })),
        },
      },
      basketballBoxScores: {
        id: true,
        player: { id: true },
        points: true,
        // ... all fields
      },
    },
  });
  // Handle response...
}
```

---

## TypeScript Types

### Game Types

```typescript
// src/lib/types/game.ts (update existing file)

import type { GameStatus, SportSubtype, SportType } from "@/lib/constants";
import type { Edge, PageInfo } from "@/lib/graphql-connection";

// Existing types remain...

/**
 * Full game detail with participants connection
 */
export interface GameDetail {
  id: string;
  startDate: string;
  endDate?: string | null;
  sportType: SportType;
  sportSubtype: SportSubtype;
  gameStatus: GameStatus;
  participants: {
    edges: Edge<GameParticipant>[];
    pageInfo: PageInfo;
  };
}

/**
 * Team instance with full details
 */
export interface TeamInstanceDetail {
  __typename: "TeamInstance";
  id: string;
  name: string;
  description?: string | null;
  players: PlayerRef[];
  attributes: Record<string, unknown>;
}

/**
 * Basketball box score entry
 */
export interface BasketballBoxScoreNode {
  id: string;
  player: PlayerRef;
  points?: number | null;
  assists?: number | null;
  totalRebounds?: number | null;
  offensiveRebounds?: number | null;
  defensiveRebounds?: number | null;
  steals?: number | null;
  blocks?: number | null;
  turnovers?: number | null;
  personalFouls?: number | null;
  fieldGoalsMade?: number | null;
  fieldGoalsAttempted?: number | null;
  fieldGoalPercentage?: number | null;
  threePointersMade?: number | null;
  threePointersAttempted?: number | null;
  threePointerPercentage?: number | null;
  twoPointersMade?: number | null;
  twoPointersAttempted?: number | null;
  twoPointerPercentage?: number | null;
  freeThrowsMade?: number | null;
  freeThrowsAttempted?: number | null;
  freeThrowPercentage?: number | null;
}

/**
 * Input for creating a game
 */
export interface CreateGameInput {
  sportType: SportType;
  subtype: SportSubtype;
  startDate: string; // ISO date string
}

/**
 * Input for updating a game
 */
export interface UpdateGameInput {
  id: string;
  startDate?: string;
}

/**
 * Input for adding a team to a game
 */
export interface AddTeamInput {
  gameId: string;
  name: string;
  description?: string;
  playerIds?: string[];
  attributes?: Record<string, unknown>;
}

/**
 * Input for saving basketball box scores
 */
export interface SaveBasketballBoxScoreInput {
  playerId: string;
  gameId: string;
  assists?: number;
  steals?: number;
  blocks?: number;
  turnovers?: number;
  personalFouls?: number;
  offensiveRebounds?: number;
  defensiveRebounds?: number;
  threePointersMade?: number;
  threePointersAttempted?: number;
  twoPointersMade?: number;
  twoPointersAttempted?: number;
  freeThrowsMade?: number;
  freeThrowsAttempted?: number;
}

/**
 * Filter input for game list
 */
export interface GameFilterParams {
  startAfter?: string;
  startBefore?: string;
  endAfter?: string;
  endBefore?: string;
  sportType?: SportType;
  playerId?: string;
  gameStatus?: GameStatus;
  ownerId?: string;
}

/**
 * Sort input for game list
 */
export interface GameSortParams {
  field: "START_DATE" | "GAME_STATUS";
  direction: "ASC" | "DESC";
}
```

---

## Constants Update

### Max Team Sizes

```typescript
// src/lib/constants.ts (add to existing file)

/**
 * Maximum team sizes per sport subtype.
 * These are UI guidelines for roster limits including bench players.
 */
export const MaxTeamSize = {
  FIVE_ON_FIVE: 15,        // 5 starters + 10 bench
  THREE_ON_THREE: 6,       // 3 starters + 3 bench
  FLAG_FOOTBALL: 15,       // Typical flag football roster
  AMERICAN_FOOTBALL: 53,   // NFL-style roster
  DOUBLES: 2,              // Tennis doubles pair
  SINGLES: 1,              // Tennis singles (individual, not team)
} as const;

export type MaxTeamSizeKey = keyof typeof MaxTeamSize;

export function getMaxTeamSize(subtype: SportSubtype): number {
  return MaxTeamSize[subtype as MaxTeamSizeKey] ?? 15;
}

/**
 * Box score sort field enum
 */
export enum BoxScoreSortField {
  POINTS = "POINTS",
  ASSISTS = "ASSISTS",
  TOTAL_REBOUNDS = "TOTAL_REBOUNDS",
  STEALS = "STEALS",
  BLOCKS = "BLOCKS",
}
```

---

## Form Handling and Validation

### Create Game Zod Schema

```typescript
// src/components/game/create-game-form.tsx
import { z } from "zod";
import { SportType, getSubtypes } from "@/lib/constants";

export const createGameSchema = z.object({
  sportType: z.enum(["BASKETBALL", "FOOTBALL", "TENNIS"], {
    required_error: "game.validation.sportTypeRequired",
  }),
  subtype: z.string().min(1, "game.validation.subtypeRequired"),
  startDate: z.date({
    required_error: "game.validation.startDateRequired",
  }),
}).refine((data) => {
  // Validate subtype matches sport type
  const validSubtypes = getSubtypes(data.sportType as keyof typeof SportType);
  return validSubtypes.includes(data.subtype as any);
}, {
  message: "game.validation.invalidSubtype",
  path: ["subtype"],
});

export type CreateGameFormValues = z.infer<typeof createGameSchema>;
```

### Update Game Zod Schema

```typescript
// src/components/game/update-game-form.tsx
import { z } from "zod";

export const updateGameSchema = z.object({
  startDate: z.date({
    required_error: "game.validation.startDateRequired",
  }),
});

export type UpdateGameFormValues = z.infer<typeof updateGameSchema>;
```

### Add Team Zod Schema

```typescript
// src/components/game/add-team-form.tsx
import { z } from "zod";

export const addTeamSchema = z.object({
  name: z.string().min(1, "game.validation.teamNameRequired").max(255),
  description: z.string().max(1000).optional(),
  playerIds: z.array(z.string()).optional(),
});

export type AddTeamFormValues = z.infer<typeof addTeamSchema>;
```

### Basketball Box Score Zod Schema

```typescript
// src/components/game/basketball-box-score-form.tsx
import { z } from "zod";

const nonNegativeInt = z.number().int().min(0).nullable().optional();

export const basketballBoxScoreSchema = z.object({
  playerId: z.string(),
  assists: nonNegativeInt,
  steals: nonNegativeInt,
  blocks: nonNegativeInt,
  turnovers: nonNegativeInt,
  personalFouls: nonNegativeInt,
  offensiveRebounds: nonNegativeInt,
  defensiveRebounds: nonNegativeInt,
  threePointersMade: nonNegativeInt,
  threePointersAttempted: nonNegativeInt,
  twoPointersMade: nonNegativeInt,
  twoPointersAttempted: nonNegativeInt,
  freeThrowsMade: nonNegativeInt,
  freeThrowsAttempted: nonNegativeInt,
}).refine((data) => {
  // Validate attempted >= made for shooting stats
  if (data.threePointersMade && data.threePointersAttempted) {
    if (data.threePointersMade > data.threePointersAttempted) return false;
  }
  if (data.twoPointersMade && data.twoPointersAttempted) {
    if (data.twoPointersMade > data.twoPointersAttempted) return false;
  }
  if (data.freeThrowsMade && data.freeThrowsAttempted) {
    if (data.freeThrowsMade > data.freeThrowsAttempted) return false;
  }
  return true;
}, {
  message: "Made shots cannot exceed attempted shots",
});

export type BasketballBoxScoreFormValues = z.infer<typeof basketballBoxScoreSchema>;
```

---

## State Management

### GameInfiniteList State

```typescript
// src/components/game/game-infinite-list.tsx
"use client";

import { useCallback, useState, useTransition, useRef, useEffect } from "react";
import { loadMoreGamesAction } from "@/app/[locale]/games/actions";
import type { Edge, PageInfo } from "@/lib/graphql-connection";
import type { GameNode } from "@/lib/types/game";

interface GameInfiniteListProps {
  initialEdges: Edge<GameNode>[];
  initialPageInfo: PageInfo;
  filters: GameFilterParams;
  sort: GameSortParams;
}

export function GameInfiniteList({
  initialEdges,
  initialPageInfo,
  filters,
  sort,
}: GameInfiniteListProps) {
  const [edges, setEdges] = useState(initialEdges);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [isPending, startTransition] = useTransition();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (!pageInfo.hasNextPage || isPending || !pageInfo.endCursor) return;

    startTransition(async () => {
      const result = await loadMoreGamesAction(
        filters,
        sort,
        pageInfo.endCursor!
      );
      if (result) {
        setEdges((prev) => [...prev, ...result.edges]);
        setPageInfo(result.pageInfo);
      }
    });
  }, [pageInfo, isPending, filters, sort]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "100px" }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [loadMore]);

  // Reset when filters/sort change (handled by parent re-render with new initialEdges)
  useEffect(() => {
    setEdges(initialEdges);
    setPageInfo(initialPageInfo);
  }, [initialEdges, initialPageInfo]);

  return (
    <>
      <div className="grid gap-4">
        {edges.map((edge) => (
          <GameCard key={edge.node.id} game={edge.node} />
        ))}
      </div>

      {/* Infinite scroll trigger */}
      <div ref={loadMoreRef} className="h-10 flex justify-center items-center">
        {isPending && <Loader2 className="h-6 w-6 animate-spin" />}
        {!pageInfo.hasNextPage && edges.length > 0 && (
          <p className="text-muted-foreground text-sm">End of games</p>
        )}
      </div>
    </>
  );
}
```

### GameDetailHeader State

```typescript
// src/components/game/game-detail-header.tsx
"use client";

import { useState, useTransition } from "react";
import { startGame, endGame, deleteGame } from "@/app/[locale]/game/actions";

interface GameDetailHeaderProps {
  game: GameDetail;
  currentPlayerId: string;
}

export function GameDetailHeader({ game, currentPlayerId }: GameDetailHeaderProps) {
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleStart = () => {
    startTransition(async () => {
      const result = await startGame(game.id);
      if (result.success) {
        toast.success(t("game.success.started"));
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleEnd = () => {
    startTransition(async () => {
      const result = await endGame(game.id);
      if (result.success) {
        toast.success(t("game.success.ended"));
      } else {
        toast.error(result.error);
      }
    });
  };

  // ... render with action buttons based on game.gameStatus
}
```

---

## Server Actions

### Game Actions

```typescript
// src/app/[locale]/game/actions.ts
"use server";

import { authMutate } from "@/lib/graphql-request";
import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { EnumType } from "json-to-graphql-query";
import type { CreateGameInput, UpdateGameInput } from "@/lib/types/game";

interface GameActionResult {
  success: boolean;
  gameId?: string;
  error?: string;
}

export async function createGame(input: CreateGameInput): Promise<GameActionResult> {
  try {
    // Build @oneOf input based on sport type
    let mutationInput: object;

    if (input.sportType === "BASKETBALL") {
      mutationInput = {
        basketball: {
          startDate: input.startDate,
          subtype: new EnumType(input.subtype),
        },
      };
    } else if (input.sportType === "FOOTBALL") {
      mutationInput = {
        football: {
          startDate: input.startDate,
          subtype: new EnumType(input.subtype),
        },
      };
    } else {
      mutationInput = {
        tennis: {
          startDate: input.startDate,
          subtype: new EnumType(input.subtype),
        },
      };
    }

    const response = await authMutate({
      createGame: {
        __args: { input: mutationInput },
        game: { id: true },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    const gameId = response.data.createGame.game.id;
    revalidatePath("/games");
    return { success: true, gameId };
  } catch (error) {
    console.error("Failed to create game:", error);
    return { success: false, error: "Failed to create game" };
  }
}

export async function updateGame(input: UpdateGameInput): Promise<GameActionResult> {
  try {
    const mutationInput: Record<string, unknown> = { id: input.id };
    if (input.startDate) mutationInput.startDate = input.startDate;

    const response = await authMutate({
      updateGame: {
        __args: { input: mutationInput },
        game: { id: true, startDate: true },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    revalidatePath(`/game/${input.id}`);
    return { success: true, gameId: input.id };
  } catch (error) {
    console.error("Failed to update game:", error);
    return { success: false, error: "Failed to update game" };
  }
}

export async function deleteGame(gameId: string): Promise<GameActionResult> {
  try {
    const response = await authMutate({
      deleteGame: {
        __args: { input: { id: gameId } },
        id: true,
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    revalidatePath("/games");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete game:", error);
    return { success: false, error: "Failed to delete game" };
  }
}

export async function startGame(gameId: string): Promise<GameActionResult> {
  try {
    const response = await authMutate({
      startGame: {
        __args: { input: { id: gameId } },
        game: { id: true, gameStatus: true, startDate: true },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    revalidatePath(`/game/${gameId}`);
    return { success: true, gameId };
  } catch (error) {
    console.error("Failed to start game:", error);
    return { success: false, error: "Failed to start game" };
  }
}

export async function endGame(gameId: string): Promise<GameActionResult> {
  try {
    const response = await authMutate({
      endGame: {
        __args: { input: { id: gameId } },
        game: { id: true, gameStatus: true, endDate: true },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    revalidatePath(`/game/${gameId}`);
    return { success: true, gameId };
  } catch (error) {
    console.error("Failed to end game:", error);
    return { success: false, error: "Failed to end game" };
  }
}

export async function loadMoreGames(
  filters: GameFilterParams,
  sort: GameSortParams,
  after: string
) {
  // Build query with filters and cursor
  const response = await authQuery({
    games: {
      __args: {
        input: filters,
        sort: [{ field: new EnumType(sort.field), direction: new EnumType(sort.direction) }],
        first: 20,
        after,
      },
      // ... same fields as initial query
    },
  });

  return response.data?.games;
}
```

---

## Page Implementation

### Games List Page

```typescript
// src/app/[locale]/games/page.tsx
import { auth } from "@/lib/auth";
import { authQuery } from "@/lib/graphql-request";
import { redirect } from "@/i18n/navigation";
import { headers } from "next/headers";
import { EnumType } from "json-to-graphql-query";
import { GameSortField, SortDirection, GameStatus } from "@/lib/constants";
import { GameInfiniteList } from "@/components/game/game-infinite-list";
import { GameListFilters } from "@/components/game/game-list-filters";
import { GameListSort } from "@/components/game/game-list-sort";
import { CreateGameDialog } from "@/components/game/create-game-dialog";
import { PlayerRequiredModal } from "@/components/player/player-required-modal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Games | Playground",
  description: "Browse and manage games",
};

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GamesPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const queryParams = await searchParams;

  // Auth check
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect({ href: "/", locale });
  }

  // Fetch current player
  const meResponse = await authQuery({
    me: {
      id: true,
      player: { id: true },
    },
  });

  const currentUserId = meResponse.data?.me?.id;
  const currentPlayer = meResponse.data?.me?.player;

  // If no player, show modal
  if (!currentPlayer) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PlayerRequiredModal open={true} onOpenChange={() => {}} />
      </main>
    );
  }

  // Parse filters from URL
  const filters = {
    startAfter: queryParams.startAfter as string | undefined,
    startBefore: queryParams.startBefore as string | undefined,
    sportType: queryParams.sportType as string | undefined,
    gameStatus: queryParams.gameStatus as string | undefined,
    ownerId: queryParams.myGames === "true" ? currentUserId : undefined,
  };

  // Parse sort from URL
  const sortField = (queryParams.sortField as string) || "START_DATE";
  const sortDirection = (queryParams.sortDir as string) || "DESC";

  // Fetch initial games
  const gamesResponse = await authQuery({
    games: {
      __args: {
        input: {
          ...filters,
          sportType: filters.sportType ? new EnumType(filters.sportType) : undefined,
          gameStatus: filters.gameStatus ? new EnumType(filters.gameStatus) : undefined,
        },
        sort: [{
          field: new EnumType(sortField),
          direction: new EnumType(sortDirection),
        }],
        first: 20,
      },
      edges: {
        cursor: true,
        node: {
          id: true,
          startDate: true,
          endDate: true,
          sportType: true,
          sportSubtype: true,
          gameStatus: true,
          participants: {
            __args: { first: 10 },
            edges: {
              node: {
                __on: [
                  {
                    __typeName: "TeamInstance",
                    id: true,
                    name: true,
                    players: { id: true, firstName: true, lastName: true },
                  },
                  {
                    __typeName: "IndividualParticipant",
                    id: true,
                    player: { id: true, firstName: true, lastName: true },
                  },
                ],
              },
            },
          },
        },
      },
      pageInfo: {
        hasNextPage: true,
        endCursor: true,
      },
    },
  });

  const games = gamesResponse.data?.games;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Games</h1>
        <CreateGameDialog />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters Sidebar */}
        <aside className="lg:w-64 shrink-0">
          <GameListFilters currentFilters={filters} />
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          <GameListSort
            currentSort={{ field: sortField, direction: sortDirection }}
            myGames={filters.ownerId === currentUserId}
          />

          {games?.edges.length === 0 ? (
            <EmptyState />
          ) : (
            <GameInfiniteList
              initialEdges={games?.edges ?? []}
              initialPageInfo={games?.pageInfo ?? { hasNextPage: false, endCursor: null }}
              filters={filters}
              sort={{ field: sortField, direction: sortDirection }}
            />
          )}
        </div>
      </div>
    </main>
  );
}
```

### Game Detail Page

```typescript
// src/app/[locale]/game/[id]/page.tsx
import { auth } from "@/lib/auth";
import { authQuery } from "@/lib/graphql-request";
import { redirect, notFound } from "@/i18n/navigation";
import { headers } from "next/headers";
import { GameDetailHeader } from "@/components/game/game-detail-header";
import { GameParticipants } from "@/components/game/game-participants";
import { BasketballBoxScoreTable } from "@/components/game/basketball-box-score-table";
import { PlayerRequiredModal } from "@/components/player/player-required-modal";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const response = await authQuery({
    game: {
      __args: { id },
      sportType: true,
      sportSubtype: true,
    },
  });
  const game = response.data?.game;

  return {
    title: game ? `${game.sportType} Game | Playground` : "Game | Playground",
  };
}

export default async function GameDetailPage({ params }: PageProps) {
  const { locale, id } = await params;

  // Auth check
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect({ href: "/", locale });
  }

  // Fetch current player
  const meResponse = await authQuery({
    me: {
      id: true,
      player: { id: true },
    },
  });

  const currentPlayerId = meResponse.data?.me?.player?.id;

  if (!currentPlayerId) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PlayerRequiredModal open={true} onOpenChange={() => {}} />
      </main>
    );
  }

  // Fetch game details
  const gameResponse = await authQuery({
    game: {
      __args: { id },
      id: true,
      startDate: true,
      endDate: true,
      sportType: true,
      sportSubtype: true,
      gameStatus: true,
      participants: {
        __args: { first: 50 },
        edges: {
          cursor: true,
          node: {
            __on: [
              {
                __typeName: "TeamInstance",
                id: true,
                name: true,
                description: true,
                players: { id: true, firstName: true, lastName: true },
                attributes: true,
              },
              {
                __typeName: "IndividualParticipant",
                id: true,
                player: { id: true, firstName: true, lastName: true },
              },
            ],
          },
        },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
    },
  });

  const game = gameResponse.data?.game;

  if (!game) {
    notFound();
  }

  // Fetch box scores for basketball games
  let boxScores = null;
  if (game.sportType === "BASKETBALL") {
    const boxScoreResponse = await authQuery({
      basketballBoxScores: {
        __args: {
          input: { gameIds: [id] },
          first: 50,
        },
        edges: {
          node: {
            id: true,
            player: { id: true, firstName: true, lastName: true },
            points: true,
            assists: true,
            totalRebounds: true,
            offensiveRebounds: true,
            defensiveRebounds: true,
            steals: true,
            blocks: true,
            turnovers: true,
            personalFouls: true,
            fieldGoalsMade: true,
            fieldGoalsAttempted: true,
            fieldGoalPercentage: true,
            threePointersMade: true,
            threePointersAttempted: true,
            threePointerPercentage: true,
            twoPointersMade: true,
            twoPointersAttempted: true,
            twoPointerPercentage: true,
            freeThrowsMade: true,
            freeThrowsAttempted: true,
            freeThrowPercentage: true,
          },
        },
      },
    });
    boxScores = boxScoreResponse.data?.basketballBoxScores?.edges ?? [];
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <GameDetailHeader game={game} currentPlayerId={currentPlayerId} />

      <div className="mt-8 space-y-8">
        <GameParticipants
          game={game}
          currentPlayerId={currentPlayerId}
        />

        {game.sportType === "BASKETBALL" && (
          <BasketballBoxScoreTable
            gameId={game.id}
            boxScores={boxScores}
            gameStatus={game.gameStatus}
          />
        )}
      </div>
    </main>
  );
}
```

---

## Basketball Box Score Table (TanStack Table)

Following the existing `src/components/ui/table.tsx` pattern which provides styled table primitives, we will use TanStack Table for the data table logic.

```typescript
// src/components/game/basketball-box-score-table.tsx
"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import type { BasketballBoxScoreNode } from "@/lib/types/game";
import type { GameStatus } from "@/lib/constants";
import { BasketballBoxScoreForm } from "./basketball-box-score-form";

interface BasketballBoxScoreTableProps {
  gameId: string;
  boxScores: { node: BasketballBoxScoreNode }[];
  gameStatus: GameStatus;
}

export function BasketballBoxScoreTable({
  gameId,
  boxScores,
  gameStatus,
}: BasketballBoxScoreTableProps) {
  const t = useTranslations("game.boxScore.basketball");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "points", desc: true },
  ]);
  const [editingScore, setEditingScore] = useState<BasketballBoxScoreNode | null>(null);

  const canEdit = gameStatus === "IN_PROGRESS" || gameStatus === "COMPLETE";

  const data = useMemo(
    () => boxScores.map((edge) => edge.node),
    [boxScores]
  );

  const columns: ColumnDef<BasketballBoxScoreNode>[] = useMemo(
    () => [
      {
        accessorKey: "player",
        header: "Player",
        cell: ({ row }) => {
          const player = row.original.player;
          return `${player.firstName} ${player.lastName}`;
        },
        enableSorting: false,
      },
      {
        accessorKey: "points",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            {t("points")}
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => row.original.points ?? "-",
      },
      {
        accessorKey: "assists",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            {t("assists")}
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => row.original.assists ?? "-",
      },
      {
        accessorKey: "totalRebounds",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            {t("totalRebounds")}
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => row.original.totalRebounds ?? "-",
      },
      {
        accessorKey: "steals",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            {t("steals")}
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => row.original.steals ?? "-",
      },
      {
        accessorKey: "blocks",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            {t("blocks")}
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => row.original.blocks ?? "-",
      },
      {
        accessorKey: "turnovers",
        header: t("turnovers"),
        cell: ({ row }) => row.original.turnovers ?? "-",
      },
      {
        accessorKey: "personalFouls",
        header: t("personalFouls"),
        cell: ({ row }) => row.original.personalFouls ?? "-",
      },
      {
        id: "fg",
        header: t("fieldGoals"),
        cell: ({ row }) => {
          const made = row.original.fieldGoalsMade;
          const attempted = row.original.fieldGoalsAttempted;
          if (made == null && attempted == null) return "-";
          return `${made ?? 0}/${attempted ?? 0}`;
        },
      },
      {
        accessorKey: "fieldGoalPercentage",
        header: t("fieldGoalPercentage"),
        cell: ({ row }) => {
          const pct = row.original.fieldGoalPercentage;
          return pct != null ? `${(pct * 100).toFixed(1)}%` : "-";
        },
      },
      {
        id: "3pt",
        header: t("threePointers"),
        cell: ({ row }) => {
          const made = row.original.threePointersMade;
          const attempted = row.original.threePointersAttempted;
          if (made == null && attempted == null) return "-";
          return `${made ?? 0}/${attempted ?? 0}`;
        },
      },
      {
        id: "ft",
        header: t("freeThrows"),
        cell: ({ row }) => {
          const made = row.original.freeThrowsMade;
          const attempted = row.original.freeThrowsAttempted;
          if (made == null && attempted == null) return "-";
          return `${made ?? 0}/${attempted ?? 0}`;
        },
      },
      ...(canEdit
        ? [
            {
              id: "actions",
              header: "",
              cell: ({ row }: { row: { original: BasketballBoxScoreNode } }) => (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingScore(row.original)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ),
            },
          ]
        : []),
    ],
    [t, canEdit]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  if (data.length === 0) {
    return (
      <section>
        <h2 className="text-xl font-semibold mb-4">{t("title")}</h2>
        <p className="text-muted-foreground">{t("noBoxScores")}</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">{t("title")}</h2>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editingScore && (
        <BasketballBoxScoreForm
          gameId={gameId}
          initialData={editingScore}
          open={true}
          onOpenChange={(open) => !open && setEditingScore(null)}
        />
      )}
    </section>
  );
}
```

---

## Navbar Integration

Update the `NavbarAuthLinks` component to include a "Games" link.

```typescript
// src/components/playground/navbar-auth-links.tsx (update)
"use client";

import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import { useTranslations } from "next-intl";
import { NavigationMenuItem, NavigationMenuLink } from "../ui/navigation-menu";
import { TypographyP } from "../ui/typography";

export function NavbarAuthLinks() {
  const { data: session } = useSession();
  const t = useTranslations();

  if (!session?.user) return null;

  return (
    <>
      <NavigationMenuItem>
        <NavigationMenuLink asChild>
          <Link
            href="/games"
            className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary"
          >
            <TypographyP>{t("header.games")}</TypographyP>
          </Link>
        </NavigationMenuLink>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <NavigationMenuLink asChild>
          <Link
            href="/player"
            className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary"
          >
            <TypographyP>{t("header.player")}</TypographyP>
          </Link>
        </NavigationMenuLink>
      </NavigationMenuItem>
    </>
  );
}
```

---

## shadcn/ui Components Available

- `Button` - `/src/components/ui/button.tsx`
- `Card`, `CardHeader`, `CardTitle`, `CardContent` - `/src/components/ui/card.tsx`
- `Input` - `/src/components/ui/input.tsx`
- `Label` - `/src/components/ui/label.tsx`
- `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` - `/src/components/ui/form.tsx`
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem` - `/src/components/ui/select.tsx`
- `Badge` - `/src/components/ui/badge.tsx`
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` - `/src/components/ui/dialog.tsx`
- `Skeleton` - `/src/components/ui/skeleton.tsx`
- `Calendar` - `/src/components/ui/calendar.tsx`
- `Popover`, `PopoverTrigger`, `PopoverContent` - `/src/components/ui/popover.tsx`
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` - `/src/components/ui/table.tsx`
- `DropdownMenu` - `/src/components/ui/dropdown-menu.tsx`
- `DateTimePicker` - `/src/components/ui/date-time-picker.tsx` (needs enhancement for form integration)
- `AlertDialog` - For delete confirmation dialog
- `Tabs` or `ToggleGroup` - For "My Games" / "All Games" toggle
- `Sheet` - For mobile filter drawer

---

## i18n Keys

Add to `messages/en.json`:

```json
{
  "header": {
    "home": "Home",
    "player": "Player",
    "games": "Games"
  },
  "game": {
    "title": "Games",
    "myGames": "My Games",
    "allGames": "All Games",
    "createTitle": "Create Game",
    "editTitle": "Edit Game",
    "detailTitle": "Game Details",
    "notFound": "Game not found",
    "notFoundDescription": "The game you are looking for does not exist or has been removed.",
    "noGames": "No games found",
    "noGamesDescription": "Try adjusting your filters or create a new game.",
    "form": {
      "sportType": "Sport",
      "sportSubtype": "Format",
      "startDate": "Start Date",
      "selectSport": "Select a sport",
      "selectFormat": "Select a format"
    },
    "status": {
      "scheduled": "Scheduled",
      "inProgress": "In Progress",
      "complete": "Complete"
    },
    "actions": {
      "create": "Create Game",
      "edit": "Edit Game",
      "delete": "Delete Game",
      "start": "Start Game",
      "end": "End Game",
      "save": "Save",
      "cancel": "Cancel",
      "starting": "Starting...",
      "ending": "Ending...",
      "saving": "Saving...",
      "deleting": "Deleting..."
    },
    "deleteConfirmation": {
      "title": "Delete Game",
      "description": "Are you sure you want to delete this game? This action cannot be undone.",
      "confirm": "Delete",
      "cancel": "Cancel"
    },
    "participants": {
      "title": "Participants",
      "noParticipants": "No participants yet",
      "addTeam": "Add Team",
      "editTeam": "Edit Team",
      "removeTeam": "Remove Team",
      "joinTeam": "Join Team",
      "leaveTeam": "Leave Team",
      "joinGame": "Join Game",
      "leaveGame": "Leave Game",
      "removeParticipant": "Remove",
      "teamName": "Team Name",
      "teamDescription": "Team Description",
      "players": "Players",
      "noPlayers": "No players on this team"
    },
    "boxScore": {
      "title": "Box Scores",
      "noBoxScores": "No box scores recorded yet",
      "addBoxScores": "Add Box Scores",
      "editBoxScores": "Edit Box Scores",
      "saveBoxScores": "Save Box Scores",
      "basketball": {
        "points": "PTS",
        "assists": "AST",
        "totalRebounds": "REB",
        "offensiveRebounds": "OREB",
        "defensiveRebounds": "DREB",
        "steals": "STL",
        "blocks": "BLK",
        "turnovers": "TO",
        "personalFouls": "PF",
        "fieldGoals": "FG",
        "fieldGoalPercentage": "FG%",
        "threePointers": "3PT",
        "threePointerPercentage": "3PT%",
        "twoPointers": "2PT",
        "twoPointerPercentage": "2PT%",
        "freeThrows": "FT",
        "freeThrowPercentage": "FT%"
      }
    },
    "filters": {
      "title": "Filters",
      "startDateRange": "Start Date Range",
      "endDateRange": "End Date Range",
      "sportType": "Sport Type",
      "gameStatus": "Status",
      "player": "Player",
      "clearFilters": "Clear Filters",
      "from": "From",
      "to": "To",
      "allSports": "All Sports",
      "allStatuses": "All Statuses"
    },
    "sort": {
      "title": "Sort",
      "startDate": "Start Date",
      "gameStatus": "Status",
      "ascending": "Oldest First",
      "descending": "Newest First"
    },
    "validation": {
      "sportTypeRequired": "Sport type is required",
      "subtypeRequired": "Sport format is required",
      "startDateRequired": "Start date is required",
      "teamNameRequired": "Team name is required",
      "invalidSubtype": "Invalid format for selected sport"
    },
    "success": {
      "created": "Game created successfully",
      "updated": "Game updated successfully",
      "deleted": "Game deleted successfully",
      "started": "Game started",
      "ended": "Game ended",
      "participantAdded": "Participant added",
      "participantRemoved": "Participant removed",
      "teamUpdated": "Team updated",
      "boxScoresSaved": "Box scores saved"
    },
    "errors": {
      "loadError": "Failed to load games",
      "createError": "Failed to create game",
      "updateError": "Failed to update game",
      "deleteError": "Failed to delete game",
      "startError": "Failed to start game",
      "endError": "Failed to end game",
      "participantError": "Failed to update participants",
      "boxScoreError": "Failed to save box scores",
      "retry": "Retry"
    }
  }
}
```

---

## Alternative Approaches Considered

### 1. Filter State: URL Params vs React State

**Chosen: URL Query Parameters**

**Trade-offs:**
- Shareable/bookmarkable filtered views
- Browser back/forward navigation works naturally
- Initial server-side rendering with filters applied
- Slightly more complex state sync

**Alternative (React state) would provide:**
- Simpler implementation
- No URL parsing logic
- But filters reset on page refresh

### 2. Infinite Scroll vs Pagination Controls

**Chosen: Infinite Scroll with IntersectionObserver**

**Trade-offs:**
- Better mobile UX
- Seamless browsing experience
- More complex state management (edge accumulation)

**Alternative (pagination buttons) would provide:**
- Simpler implementation
- Explicit user control over page navigation
- Direct URL linking to specific pages

### 3. Box Score Table: TanStack Table vs Custom Table

**Chosen: TanStack Table with existing table primitives**

**Trade-offs:**
- Built-in sorting, filtering capabilities
- Consistent with existing `src/components/ui/table.tsx` styling
- Flexible column definitions
- Additional dependency

**Alternative (custom table) would provide:**
- Fewer dependencies
- Full control over implementation
- But more code to maintain

### 4. Create Game Form: Dialog vs Dedicated Page

**Chosen: Dialog modal**

**Trade-offs:**
- Quick access without leaving current context
- Consistent with typical SaaS patterns
- Faster UX flow

**Alternative (dedicated page /games/new) would provide:**
- More space for complex forms
- Better URL sharing
- But requires navigation away from list

---

## API Suggestions / Improvements

### Current Schema Assessment

The GraphQL schema adequately supports all required operations:
- `games` query with comprehensive filtering and sorting
- `game` query for single game fetch
- All necessary mutations: createGame, updateGame, deleteGame, startGame, endGame
- Participant management mutations with @oneOf pattern
- Basketball box score queries and mutations

### Potential Improvements

1. **Add `ownerId` filter to GameFilterInput**

   The requirements mention filtering by owner for "My Games", but the current schema's `GameFilterInput` does not include `ownerId`. This needs to be added to the backend:

   ```graphql
   input GameFilterInput {
     # existing fields...
     ownerId: ID  # Add this field
   }
   ```

   **Impact:** Without this, "My Games" filtering would need to be done client-side, which is inefficient for large datasets.

2. **Add `owner` field to Game type**

   To display who created the game:

   ```graphql
   type Game implements Node {
     # existing fields...
     owner: User!  # Add this field
   }
   ```

3. **Consider adding `totalRebounds` computation**

   Currently, `totalRebounds` is stored separately from `offensiveRebounds` and `defensiveRebounds`. Consider making it a computed field on the server to ensure consistency.

---

## File Structure Summary

```
src/
  app/
    [locale]/
      games/
        page.tsx              # Server - game list page
        loading.tsx           # Loading skeleton
      game/
        [id]/
          page.tsx            # Server - game detail page
          loading.tsx         # Loading skeleton
        actions.ts            # Server actions for game CRUD
        participant-actions.ts  # Server actions for participants
        box-score-actions.ts  # Server actions for box scores
  components/
    game/
      game-card.tsx           # Reuse existing from profile
      game-list-filters.tsx   # Client - filter controls
      game-list-sort.tsx      # Client - sort controls
      game-infinite-list.tsx  # Client - infinite scroll
      game-status-badge.tsx   # Client - status badge
      create-game-dialog.tsx  # Client - create dialog wrapper
      create-game-form.tsx    # Client - create form
      update-game-form.tsx    # Client - update form
      game-detail-header.tsx  # Client - detail header
      delete-game-dialog.tsx  # Client - delete confirmation
      game-participants.tsx   # Client - participants section
      team-card.tsx           # Client - team card
      add-team-form.tsx       # Client - add team form
      individual-participant-list.tsx  # Client - individuals
      basketball-box-score-table.tsx   # Client - box scores table
      basketball-box-score-form.tsx    # Client - box score edit
    playground/
      navbar-auth-links.tsx   # Update - add Games link
  lib/
    constants.ts              # Update - add MaxTeamSize constants
    types/
      game.ts                 # Update - add new game types
messages/
  en.json                     # Update - add game translations
```

---

## Implementation Order

1. **Infrastructure**
   - Update `src/lib/constants.ts` with MaxTeamSize constants
   - Update `src/lib/types/game.ts` with new types
   - Update `messages/en.json` with i18n keys

2. **Server Actions**
   - Create `src/app/[locale]/game/actions.ts`
   - Create `src/app/[locale]/game/participant-actions.ts`
   - Create `src/app/[locale]/game/box-score-actions.ts`

3. **Game List Page**
   - Create `src/components/game/game-list-filters.tsx`
   - Create `src/components/game/game-list-sort.tsx`
   - Create `src/components/game/game-infinite-list.tsx`
   - Create `src/app/[locale]/games/page.tsx`
   - Create `src/app/[locale]/games/loading.tsx`

4. **Create Game**
   - Create `src/components/game/create-game-form.tsx`
   - Create `src/components/game/create-game-dialog.tsx`

5. **Game Detail Page**
   - Create `src/components/game/game-status-badge.tsx`
   - Create `src/components/game/game-detail-header.tsx`
   - Create `src/components/game/delete-game-dialog.tsx`
   - Create `src/components/game/update-game-form.tsx`
   - Create `src/app/[locale]/game/[id]/page.tsx`
   - Create `src/app/[locale]/game/[id]/loading.tsx`

6. **Participants**
   - Create `src/components/game/team-card.tsx`
   - Create `src/components/game/add-team-form.tsx`
   - Create `src/components/game/individual-participant-list.tsx`
   - Create `src/components/game/game-participants.tsx`

7. **Box Scores**
   - Create `src/components/game/basketball-box-score-table.tsx`
   - Create `src/components/game/basketball-box-score-form.tsx`

8. **Navbar Integration**
   - Update `src/components/playground/navbar-auth-links.tsx`

9. **Testing and Polish**
   - Verify all CRUD operations
   - Test infinite scroll
   - Test filter/sort combinations
   - Responsive design verification
   - Box score table sorting

---

## Acceptance Criteria Mapping

| AC # | Requirement | Implementation |
|------|-------------|----------------|
| 1 | Navigate to /games via navbar | `NavbarAuthLinks` update |
| 2 | Game list displays sport, subtype, date, status | `GameCard` component |
| 3 | Filter by date range, sport, player, status | `GameListFilters` component |
| 4 | Sort by start date and status | `GameListSort` component |
| 5 | Infinite scroll pagination | `GameInfiniteList` component |
| 6 | My Games toggle | `GameListSort` with ownerId filter |
| 7 | Click game navigates to detail | `GameCard` Link wrapper |
| 8 | Detail shows sport, status, schedule, participants, box scores | `GameDetailPage` and child components |
| 9 | Create game with sport, subtype, date | `CreateGameForm` + `CreateGameDialog` |
| 10 | Start date defaults to current time | Form default value |
| 11 | Redirect to detail after create | Server action redirect |
| 12 | Update start date | `UpdateGameForm` |
| 13 | Delete with confirmation | `DeleteGameDialog` (AlertDialog) |
| 14 | Redirect to list after delete | Server action redirect |
| 15 | Start SCHEDULED game | `GameDetailHeader` action button |
| 16 | End IN_PROGRESS game | `GameDetailHeader` action button |
| 17 | Add/edit/remove teams or individuals | `GameParticipants` + forms |
| 18 | Join/leave game | Team/individual participant actions |
| 19 | Basketball box score table | `BasketballBoxScoreTable` |
| 20 | Box scores sortable | TanStack Table sorting |
| 21 | Save/edit box scores | `BasketballBoxScoreForm` |
| 22 | Loading skeletons | `loading.tsx` files |
| 23 | Loading indicators during mutations | Button disabled state + spinner |
| 24 | Error messages | Toast notifications |
| 25 | i18n translation keys | `messages/en.json` updates |
| 26 | Responsive design | Tailwind responsive classes + Sheet for mobile |
| 27 | Player required modal | `PlayerRequiredModal` usage |

---

## Security Considerations

### Input Validation

- All form inputs validated client-side with Zod for UX
- Server-side validation performed by GraphQL backend
- Date inputs validated as valid DateTime values
- Box score shooting stats validated (made <= attempted)

### Authentication

- All game pages check `auth.api.getSession()` on server
- Redirect unauthenticated users to home page
- All mutations use `authMutate` which includes Bearer token

### Authorization Notes

- Current implementation allows any authenticated user with player profile to perform all operations
- Future iteration will add owner-only restrictions for update/delete
- UI design accommodates future authorization changes

---

## Date/Time Handling

### DateTimePicker Enhancement

The existing `src/components/ui/date-time-picker.tsx` needs enhancement to work with react-hook-form:

```typescript
// src/components/game/game-date-time-picker.tsx
"use client";

import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

interface GameDateTimePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
  className?: string;
}

export const GameDateTimePicker = forwardRef<HTMLDivElement, GameDateTimePickerProps>(
  ({ value, onChange, disabled, className }, ref) => {
    const handleDateSelect = (date: Date | undefined) => {
      if (!date) {
        onChange(undefined);
        return;
      }
      // Preserve existing time if value exists
      if (value) {
        date.setHours(value.getHours(), value.getMinutes());
      }
      onChange(date);
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const [hours, minutes] = e.target.value.split(":").map(Number);
      const newDate = value ? new Date(value) : new Date();
      newDate.setHours(hours, minutes);
      onChange(newDate);
    };

    return (
      <div ref={ref} className={cn("flex gap-2", className)}>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-40 justify-start text-left font-normal",
                !value && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(value, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleDateSelect}
              disabled={disabled}
            />
          </PopoverContent>
        </Popover>
        <Input
          type="time"
          value={value ? format(value, "HH:mm") : ""}
          onChange={handleTimeChange}
          disabled={disabled}
          className="w-28"
        />
      </div>
    );
  }
);

GameDateTimePicker.displayName = "GameDateTimePicker";
```

---

## Feedback Notes

### Schema Issues Identified

1. **Missing `ownerId` in GameFilterInput**: The requirements specify a "My Games" filter using `ownerId`, but this field is not present in the current schema. **Recommendation:** Add `ownerId: ID` to `GameFilterInput` on the backend.

2. **No `owner` field on Game type**: To display who created a game, the `owner` field should be added to the `Game` type. This would also help with future authorization checks on the frontend.

3. **~~Join/Leave Team mutations~~ (RESOLVED)**: The schema now provides dedicated mutations for adding/removing individual players from team instances: `addPlayerToTeamInstance`, `addPlayersToTeamInstance`, `removePlayerFromTeamInstance`, `removePlayersFromTeamInstance`. These replace the previously planned `joinTeam`/`leaveTeam` placeholder mutations and avoid race conditions from concurrent roster modifications via `updateGameParticipant`.

### Design Decisions Requiring Confirmation

1. **DateTimePicker component**: The existing `date-time-picker.tsx` is a basic implementation. Should we enhance it in-place or create a new form-compatible version specifically for the game feature?

2. **Mobile Filter UX**: Requirements mention a Sheet for mobile filters. Should filters be in a collapsible panel by default on desktop and Sheet on mobile, or always Sheet?

3. **Participant Pagination**: The requirements mention paginating participants if large. Should we implement infinite scroll for participants or a "Load More" button pattern (matching existing `GameHistory` component)?
