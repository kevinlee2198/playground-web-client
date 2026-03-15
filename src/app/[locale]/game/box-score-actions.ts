"use server";

import { errorFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";
import type { SaveBasketballBoxScoreData, SaveBasketballBoxScoreInput } from "@/lib/types/stats/basketball";
import { revalidatePath } from "next/cache";

interface BoxScoreActionResult {
  success: boolean;
  boxScoreId?: string;
  boxScoreIds?: string[];
  errorType?: string;
  message?: string;
}

const STAT_FIELDS = [
  "assists",
  "steals",
  "blocks",
  "turnovers",
  "personalFouls",
  "offensiveRebounds",
  "defensiveRebounds",
  "threePointersMade",
  "threePointersAttempted",
  "twoPointersMade",
  "twoPointersAttempted",
  "freeThrowsMade",
  "freeThrowsAttempted",
] as const;

/**
 * Build a mutation input record from a box score data object.
 * Only includes stat fields that are explicitly provided (not undefined),
 * preserving PATCH semantics where undefined means "leave unchanged".
 */
function buildStatFields(
  data: SaveBasketballBoxScoreData,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of STAT_FIELDS) {
    if (data[field] !== undefined) {
      result[field] = data[field];
    }
  }
  return result;
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
      ...buildStatFields(input),
    };

    const response = await authMutate({
      saveBasketballBoxScore: {
        __args: { input: mutationInput },
        __typename: true,
        __on: [
          {
            __typeName: "SaveBasketballBoxScoreResponse",
            basketballBoxScore: {
              id: true,
              player: { id: true, user: { displayName: true } },
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
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.saveBasketballBoxScore, "SaveBasketballBoxScoreResponse");
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, boxScoreId: result.data.basketballBoxScore.id };
  } catch (error) {
    console.error("Failed to save basketball box score:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save basketball box score" };
  }
}

/**
 * Save multiple basketball box scores
 */
export async function saveBasketballBoxScores(
  gameId: number,
  scores: SaveBasketballBoxScoreData[],
): Promise<BoxScoreActionResult> {
  try {
    if (scores.length === 0) {
      return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: "No box scores provided" };
    }

    const basketballBoxScores = scores.map((score) => ({
      playerId: score.playerId,
      ...buildStatFields(score),
    }));

    const response = await authMutate({
      saveBasketballBoxScores: {
        __args: { input: { gameId, basketballBoxScores } },
        __typename: true,
        __on: [
          {
            __typeName: "SaveBasketballBoxScoresResponse",
            basketballBoxScores: {
              id: true,
              player: { id: true, user: { displayName: true } },
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
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
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
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save basketball box scores" };
  }
}
