"use server";

import { errorFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";
import type { SaveTennisStatsData, SaveTennisStatsInput } from "@/lib/types/stats/tennis";
import { revalidatePath } from "next/cache";

interface TennisStatsActionResult {
  success: boolean;
  statsId?: string;
  statsIds?: string[];
  errorType?: string;
  message?: string;
}

const STAT_FIELDS = [
  "aces",
  "doubleFaults",
  "firstServesIn",
  "firstServeAttempts",
  "firstServePointsWon",
  "firstServePointsPlayed",
  "secondServePointsWon",
  "secondServePointsPlayed",
  "breakPointsConverted",
  "breakPointsFaced",
  "returnPointsWon",
  "returnPointsPlayed",
  "winners",
  "unforcedErrors",
  "totalPointsWon",
] as const;

function buildStatFields(
  data: SaveTennisStatsData,
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
  player: { id: true, user: { displayName: true } },
  aces: true,
  doubleFaults: true,
  firstServesIn: true,
  firstServeAttempts: true,
  firstServePointsWon: true,
  firstServePointsPlayed: true,
  secondServePointsWon: true,
  secondServePointsPlayed: true,
  breakPointsConverted: true,
  breakPointsFaced: true,
  returnPointsWon: true,
  returnPointsPlayed: true,
  winners: true,
  unforcedErrors: true,
  totalPointsWon: true,
} as const;

/**
 * Save a single set of tennis stats
 */
export async function saveTennisStats(
  input: SaveTennisStatsInput,
): Promise<TennisStatsActionResult> {
  try {
    const mutationInput: Record<string, unknown> = {
      playerId: input.playerId,
      gameId: input.gameId,
      ...buildStatFields(input),
    };

    const response = await authMutate({
      saveTennisStats: {
        __args: { input: mutationInput },
        __typename: true,
        __on: [
          {
            __typeName: "SaveTennisStatsResponse",
            tennisStats: RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.saveTennisStats, "SaveTennisStatsResponse");
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsId: result.data.tennisStats.id };
  } catch (error) {
    console.error("Failed to save tennis stats:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save tennis stats" };
  }
}

/**
 * Save multiple sets of tennis stats
 */
export async function saveTennisStatsBulk(
  gameId: number,
  stats: SaveTennisStatsData[],
): Promise<TennisStatsActionResult> {
  try {
    if (stats.length === 0) {
      return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: "No stats provided" };
    }

    const statsInput = stats.map((stat) => ({
      playerId: stat.playerId,
      ...buildStatFields(stat),
    }));

    const response = await authMutate({
      saveTennisStatsBulk: {
        __args: { input: { gameId, stats: statsInput } },
        __typename: true,
        __on: [
          {
            __typeName: "SaveTennisStatsBulkResponse",
            stats: RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.saveTennisStatsBulk, "SaveTennisStatsBulkResponse");
    if (!result.success) return result;

    const statsIds = result.data.stats.map(
      (stat: { id: string }) => stat.id,
    );

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsIds };
  } catch (error) {
    console.error("Failed to save tennis stats bulk:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save tennis stats" };
  }
}
