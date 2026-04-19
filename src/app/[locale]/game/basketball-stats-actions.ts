"use server";

import { errorFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";
import type { SaveBasketballStatsData, SaveBasketballStatsInput } from "@/lib/types/stats/basketball";
import { revalidatePath } from "next/cache";

interface BasketballStatsActionResult {
  success: boolean;
  statsId?: string;
  statsIds?: string[];
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
 * Build a mutation input record from a stats data object.
 * Only includes stat fields that are explicitly provided (not undefined),
 * preserving PATCH semantics where undefined means "leave unchanged".
 */
function buildStatFields(
  data: SaveBasketballStatsData,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of STAT_FIELDS) {
    if (data[field] !== undefined) {
      result[field] = data[field];
    }
  }
  return result;
}

const RESPONSE_FIELDS = {
  id: true,
  user: { id: true, displayName: true },
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
} as const;

/**
 * Save basketball stats for a single user
 */
export async function saveBasketballStats(
  input: SaveBasketballStatsInput,
): Promise<BasketballStatsActionResult> {
  try {
    const mutationInput: Record<string, unknown> = {
      userId: input.userId,
      gameId: input.gameId,
      ...buildStatFields(input),
    };

    const response = await authMutate({
      saveBasketballStats: {
        __args: { input: mutationInput },
        __typename: true,
        __on: [
          {
            __typeName: "SaveBasketballStatsResponse",
            basketballStats: RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.saveBasketballStats, "SaveBasketballStatsResponse");
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsId: result.data.basketballStats.id };
  } catch (error) {
    console.error("Failed to save basketball stats:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save basketball stats" };
  }
}

/**
 * Save basketball stats for multiple users
 */
export async function saveBasketballStatsBulk(
  gameId: number,
  scores: SaveBasketballStatsData[],
): Promise<BasketballStatsActionResult> {
  try {
    if (scores.length === 0) {
      return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: "No stats provided" };
    }

    const stats = scores.map((score) => ({
      userId: score.userId,
      ...buildStatFields(score),
    }));

    const response = await authMutate({
      saveBasketballStatsBulk: {
        __args: { input: { gameId, stats } },
        __typename: true,
        __on: [
          {
            __typeName: "SaveBasketballStatsBulkResponse",
            stats: RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.saveBasketballStatsBulk, "SaveBasketballStatsBulkResponse");
    if (!result.success) return result;

    const statsIds = result.data.stats.map(
      (entry: { id: string }) => entry.id,
    );

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsIds };
  } catch (error) {
    console.error("Failed to save basketball stats bulk:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save basketball stats" };
  }
}
