"use server";

import type { Edge, PageInfo } from "@/lib/graphql-connection";
import {
  gameMetadataFragment,
  participantNodeFragment,
  resourceFragment,
} from "@/lib/graphql-fragments";
import { authMutate, authQuery } from "@/lib/graphql-request";
import type {
  CreateGameInput,
  GameFilterParams,
  GameSortParams,
  UpdateGameInput,
} from "@/lib/types/game";
import type { Resource } from "@/lib/types/resource";
import { EnumType } from "json-to-graphql-query";
import { revalidatePath } from "next/cache";

interface GameActionResult {
  success: boolean;
  gameId?: number;
  error?: string;
}

/**
 * Create a new game with sport-specific input using @oneOf pattern
 */
export async function createGame(
  input: CreateGameInput,
): Promise<GameActionResult> {
  try {
    // Build @oneOf input based on sport type — the key must be the lowercase sport name
    const sportKey = input.sportType.toLowerCase() as
      | "basketball"
      | "football"
      | "tennis";
    const metadata: Record<string, unknown> = {
      subtype: new EnumType(input.metadata.subtype),
    };
    if ("periods" in input.metadata && input.metadata.periods !== undefined) {
      metadata.periods = input.metadata.periods;
    }
    if ("bestOf" in input.metadata && input.metadata.bestOf !== undefined) {
      metadata.bestOf = input.metadata.bestOf;
    }
    if (
      "tiebreakFinalSet" in input.metadata &&
      input.metadata.tiebreakFinalSet !== undefined
    ) {
      metadata.tiebreakFinalSet = input.metadata.tiebreakFinalSet;
    }

    const sportInput: Record<string, unknown> = {
      startDate: input.startDate,
      metadata,
    };

    if (input.location) {
      sportInput.location = {
        address: input.location.address,
        ...(input.location.coordinates && {
          coordinates: input.location.coordinates,
        }),
      };
    }

    const mutationInput = { [sportKey]: sportInput };

    const response = await authMutate({
      createGame: {
        __args: { input: mutationInput },
        game: {
          id: true,
          sportType: true,
          metadata: gameMetadataFragment,
          gameStatus: true,
          startDate: true,
        },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    const gameId = response.data.createGame.game.id;
    revalidatePath("/[locale]/games", "page");
    return { success: true, gameId };
  } catch (error) {
    console.error("Failed to create game:", error);
    return { success: false, error: "Failed to create game" };
  }
}

/**
 * Update game start date
 */
export async function updateGame(
  input: UpdateGameInput,
): Promise<GameActionResult> {
  try {
    const mutationInput: Record<string, unknown> = { id: input.id };
    if (input.startDate) mutationInput.startDate = input.startDate;

    if (input.metadata) {
      // Build @oneOf GameMetadataInput with EnumType for subtype values
      const metadataInput: Record<string, unknown> = {};
      if (input.metadata.basketball) {
        const b: Record<string, unknown> = {};
        if (input.metadata.basketball.subtype)
          b.subtype = new EnumType(input.metadata.basketball.subtype);
        if (input.metadata.basketball.periods !== undefined)
          b.periods = input.metadata.basketball.periods;
        metadataInput.basketball = b;
      } else if (input.metadata.tennis) {
        const t: Record<string, unknown> = {};
        if (input.metadata.tennis.subtype)
          t.subtype = new EnumType(input.metadata.tennis.subtype);
        if (input.metadata.tennis.bestOf !== undefined)
          t.bestOf = input.metadata.tennis.bestOf;
        if (input.metadata.tennis.tiebreakFinalSet !== undefined)
          t.tiebreakFinalSet = input.metadata.tennis.tiebreakFinalSet;
        metadataInput.tennis = t;
      } else if (input.metadata.football) {
        const f: Record<string, unknown> = {};
        if (input.metadata.football.subtype)
          f.subtype = new EnumType(input.metadata.football.subtype);
        if (input.metadata.football.periods !== undefined)
          f.periods = input.metadata.football.periods;
        metadataInput.football = f;
      }
      mutationInput.metadata = metadataInput;
    }

    if (input.location !== undefined) {
      mutationInput.location = input.location;
    }

    const response = await authMutate({
      updateGame: {
        __args: { input: mutationInput },
        game: {
          id: true,
          startDate: true,
          metadata: gameMetadataFragment,
        },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, gameId: input.id };
  } catch (error) {
    console.error("Failed to update game:", error);
    return { success: false, error: "Failed to update game" };
  }
}

/**
 * Delete a game
 */
export async function deleteGame(gameId: number): Promise<GameActionResult> {
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

    revalidatePath("/[locale]/games", "page");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete game:", error);
    return { success: false, error: "Failed to delete game" };
  }
}

/**
 * Start a game (SCHEDULED -> IN_PROGRESS)
 */
export async function startGame(
  gameId: number,
  startDate?: string,
): Promise<GameActionResult> {
  try {
    const mutationInput: Record<string, unknown> = { id: gameId };
    if (startDate) mutationInput.startDate = startDate;

    const response = await authMutate({
      startGame: {
        __args: { input: mutationInput },
        game: {
          id: true,
          gameStatus: true,
          startDate: true,
        },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, gameId };
  } catch (error) {
    console.error("Failed to start game:", error);
    return { success: false, error: "Failed to start game" };
  }
}

/**
 * End a game (IN_PROGRESS -> COMPLETE)
 */
export async function endGame(
  gameId: number,
  endDate?: string,
): Promise<GameActionResult> {
  try {
    const mutationInput: Record<string, unknown> = { id: gameId };
    if (endDate) mutationInput.endDate = endDate;

    const response = await authMutate({
      endGame: {
        __args: { input: mutationInput },
        game: {
          id: true,
          gameStatus: true,
          endDate: true,
        },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, gameId };
  } catch (error) {
    console.error("Failed to end game:", error);
    return { success: false, error: "Failed to end game" };
  }
}

/**
 * Load more games for infinite scroll pagination
 */
export async function loadMoreGames(
  filters: GameFilterParams,
  sort: GameSortParams,
  after: string,
) {
  try {
    const filterInput: Record<string, unknown> = {};

    if (filters.startAfter) filterInput.startAfter = filters.startAfter;
    if (filters.startBefore) filterInput.startBefore = filters.startBefore;
    if (filters.endAfter) filterInput.endAfter = filters.endAfter;
    if (filters.endBefore) filterInput.endBefore = filters.endBefore;
    if (filters.sportType)
      filterInput.sportType = new EnumType(filters.sportType);
    if (filters.playerId) filterInput.playerId = filters.playerId;
    if (filters.gameStatus)
      filterInput.gameStatus = new EnumType(filters.gameStatus);
    if (filters.createdBy) filterInput.createdBy = filters.createdBy;

    const response = await authQuery({
      games: {
        __args: {
          input: filterInput,
          sort: [
            {
              field: new EnumType(sort.field),
              direction: new EnumType(sort.direction),
            },
          ],
          first: 20,
          after,
        },
        edges: {
          cursor: true,
          node: {
            id: true,
            startDate: true,
            endDate: true,
            sportType: true,
            metadata: gameMetadataFragment,
            gameStatus: true,
            location: {
              name: true,
              address: {
                city: true,
                state: true,
                country: true,
              },
            },
            participants: {
              __args: { first: 10 },
              edges: {
                node: participantNodeFragment,
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

    return response.data?.games;
  } catch (error) {
    console.error("Failed to load more games:", error);
    return null;
  }
}

/**
 * Load media for a game (paginated)
 */
export async function loadGameMedia(
  gameId: number,
  first: number,
  after?: string,
): Promise<{ edges: Edge<Resource>[]; pageInfo: PageInfo } | null> {
  try {
    const response = await authQuery({
      game: {
        __args: { id: gameId },
        media: {
          __args: {
            first,
            ...(after ? { after } : {}),
          },
          edges: {
            cursor: true,
            node: resourceFragment,
          },
          pageInfo: {
            hasNextPage: true,
            endCursor: true,
          },
        },
      },
    });

    if (response.errors?.length > 0) {
      return null;
    }

    return response.data?.game?.media || null;
  } catch (error) {
    console.error("Failed to load game media:", error);
    return null;
  }
}
