"use server";

import { errorFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import { extractMutationResult } from "@/lib/graphql-result";
import type { SaveBasketballBoxScoreInput } from "@/lib/types/stats/basketball";
import { revalidatePath } from "next/cache";

interface BoxScoreActionResult {
  success: boolean;
  boxScoreId?: string;
  boxScoreIds?: string[];
  errorType?: string;
  message?: string;
}

/**
 * Save a single basketball box score
 */
export async function saveBasketballBoxScore(
  input: SaveBasketballBoxScoreInput,
): Promise<BoxScoreActionResult> {
  try {
    const mutationInput: Record<string, unknown> = {
      playerId: input.playerId,
      gameId: input.gameId,
    };

    // Only include fields that are explicitly provided
    if (input.assists !== undefined) mutationInput.assists = input.assists;
    if (input.steals !== undefined) mutationInput.steals = input.steals;
    if (input.blocks !== undefined) mutationInput.blocks = input.blocks;
    if (input.turnovers !== undefined)
      mutationInput.turnovers = input.turnovers;
    if (input.personalFouls !== undefined)
      mutationInput.personalFouls = input.personalFouls;
    if (input.offensiveRebounds !== undefined)
      mutationInput.offensiveRebounds = input.offensiveRebounds;
    if (input.defensiveRebounds !== undefined)
      mutationInput.defensiveRebounds = input.defensiveRebounds;
    if (input.threePointersMade !== undefined)
      mutationInput.threePointersMade = input.threePointersMade;
    if (input.threePointersAttempted !== undefined)
      mutationInput.threePointersAttempted = input.threePointersAttempted;
    if (input.twoPointersMade !== undefined)
      mutationInput.twoPointersMade = input.twoPointersMade;
    if (input.twoPointersAttempted !== undefined)
      mutationInput.twoPointersAttempted = input.twoPointersAttempted;
    if (input.freeThrowsMade !== undefined)
      mutationInput.freeThrowsMade = input.freeThrowsMade;
    if (input.freeThrowsAttempted !== undefined)
      mutationInput.freeThrowsAttempted = input.freeThrowsAttempted;

    const response = await authMutate({
      saveBasketballBoxScore: {
        __args: { input: mutationInput },
        __typename: true,
        __on: [
          {
            __typeName: "SaveBasketballBoxScoreResponse",
            basketballBoxScore: {
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
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: "GRAPHQL_ERROR", message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.saveBasketballBoxScore, "SaveBasketballBoxScoreResponse");
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, boxScoreId: result.data.basketballBoxScore.id };
  } catch (error) {
    console.error("Failed to save basketball box score:", error);
    return { success: false, errorType: "UNEXPECTED_ERROR", message: "Failed to save basketball box score" };
  }
}

/**
 * Save multiple basketball box scores
 */
export async function saveBasketballBoxScores(
  scores: SaveBasketballBoxScoreInput[],
): Promise<BoxScoreActionResult> {
  try {
    if (scores.length === 0) {
      return { success: false, errorType: "VALIDATION_ERROR", message: "No box scores provided" };
    }

    // Build the input array
    const basketballBoxScores = scores.map((score) => {
      const mutationInput: Record<string, unknown> = {
        playerId: score.playerId,
        gameId: score.gameId,
      };

      // Only include fields that are explicitly provided
      if (score.assists !== undefined) mutationInput.assists = score.assists;
      if (score.steals !== undefined) mutationInput.steals = score.steals;
      if (score.blocks !== undefined) mutationInput.blocks = score.blocks;
      if (score.turnovers !== undefined)
        mutationInput.turnovers = score.turnovers;
      if (score.personalFouls !== undefined)
        mutationInput.personalFouls = score.personalFouls;
      if (score.offensiveRebounds !== undefined)
        mutationInput.offensiveRebounds = score.offensiveRebounds;
      if (score.defensiveRebounds !== undefined)
        mutationInput.defensiveRebounds = score.defensiveRebounds;
      if (score.threePointersMade !== undefined)
        mutationInput.threePointersMade = score.threePointersMade;
      if (score.threePointersAttempted !== undefined)
        mutationInput.threePointersAttempted = score.threePointersAttempted;
      if (score.twoPointersMade !== undefined)
        mutationInput.twoPointersMade = score.twoPointersMade;
      if (score.twoPointersAttempted !== undefined)
        mutationInput.twoPointersAttempted = score.twoPointersAttempted;
      if (score.freeThrowsMade !== undefined)
        mutationInput.freeThrowsMade = score.freeThrowsMade;
      if (score.freeThrowsAttempted !== undefined)
        mutationInput.freeThrowsAttempted = score.freeThrowsAttempted;

      return mutationInput;
    });

    const response = await authMutate({
      saveBasketballBoxScores: {
        __args: { input: { basketballBoxScores } },
        __typename: true,
        __on: [
          {
            __typeName: "SaveBasketballBoxScoresResponse",
            basketballBoxScores: {
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
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: "GRAPHQL_ERROR", message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.saveBasketballBoxScores, "SaveBasketballBoxScoresResponse");
    if (!result.success) return result;

    const boxScoreIds = result.data.basketballBoxScores.map(
      (boxScore: { id: string }) => boxScore.id,
    );

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, boxScoreIds };
  } catch (error) {
    console.error("Failed to save basketball box scores:", error);
    return { success: false, errorType: "UNEXPECTED_ERROR", message: "Failed to save basketball box scores" };
  }
}
