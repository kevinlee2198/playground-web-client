"use server";

import { authMutate, authQuery } from "@/lib/graphql-request";
import { revalidatePath } from "next/cache";
import { EnumType } from "json-to-graphql-query";
import type { CreateGameInput, UpdateGameInput, GameFilterParams, GameSortParams } from "@/lib/types/game";

interface GameActionResult {
  success: boolean;
  gameId?: number;
  error?: string;
}

/**
 * Create a new game with sport-specific input using @oneOf pattern
 */
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
        game: {
          id: true,
          sportType: true,
          sportSubtype: true,
          gameStatus: true,
          startDate: true,
        },
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

/**
 * Update game start date
 */
export async function updateGame(input: UpdateGameInput): Promise<GameActionResult> {
  try {
    const mutationInput: Record<string, unknown> = { id: input.id };
    if (input.startDate) mutationInput.startDate = input.startDate;

    const response = await authMutate({
      updateGame: {
        __args: { input: mutationInput },
        game: {
          id: true,
          startDate: true,
        },
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

    revalidatePath("/games");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete game:", error);
    return { success: false, error: "Failed to delete game" };
  }
}

/**
 * Start a game (SCHEDULED -> IN_PROGRESS)
 */
export async function startGame(gameId: number, startDate?: string): Promise<GameActionResult> {
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

    revalidatePath(`/game/${gameId}`);
    return { success: true, gameId };
  } catch (error) {
    console.error("Failed to start game:", error);
    return { success: false, error: "Failed to start game" };
  }
}

/**
 * End a game (IN_PROGRESS -> COMPLETE)
 */
export async function endGame(gameId: number, endDate?: string): Promise<GameActionResult> {
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

    revalidatePath(`/game/${gameId}`);
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
  after: string
) {
  try {
    const filterInput: Record<string, unknown> = {};

    if (filters.startAfter) filterInput.startAfter = filters.startAfter;
    if (filters.startBefore) filterInput.startBefore = filters.startBefore;
    if (filters.endAfter) filterInput.endAfter = filters.endAfter;
    if (filters.endBefore) filterInput.endBefore = filters.endBefore;
    if (filters.sportType) filterInput.sportType = new EnumType(filters.sportType);
    if (filters.playerId) filterInput.playerId = filters.playerId;
    if (filters.gameStatus) filterInput.gameStatus = new EnumType(filters.gameStatus);
    if (filters.createdBy) filterInput.createdBy = filters.createdBy;

    const response = await authQuery({
      games: {
        __args: {
          input: filterInput,
          sort: [{
            field: new EnumType(sort.field),
            direction: new EnumType(sort.direction)
          }],
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

    return response.data?.games;
  } catch (error) {
    console.error("Failed to load more games:", error);
    return null;
  }
}
