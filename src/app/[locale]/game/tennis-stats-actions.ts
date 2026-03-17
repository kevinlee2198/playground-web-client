"use server";

import { errorFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";
import type { SaveTennisStatisticsData, SaveTennisStatisticsInput } from "@/lib/types/stats/tennis";
import { revalidatePath } from "next/cache";

interface TennisStatsActionResult {
  success: boolean;
  statisticsId?: string;
  statisticsIds?: string[];
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
  data: SaveTennisStatisticsData,
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
 * Save a single set of tennis statistics
 */
export async function saveTennisStatistics(
  input: SaveTennisStatisticsInput,
): Promise<TennisStatsActionResult> {
  try {
    const mutationInput: Record<string, unknown> = {
      playerId: input.playerId,
      gameId: input.gameId,
      ...buildStatFields(input),
    };

    const response = await authMutate({
      saveTennisStatistics: {
        __args: { input: mutationInput },
        __typename: true,
        __on: [
          {
            __typeName: "SaveTennisStatisticsResponse",
            tennisStatistics: RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.saveTennisStatistics, "SaveTennisStatisticsResponse");
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statisticsId: result.data.tennisStatistics.id };
  } catch (error) {
    console.error("Failed to save tennis statistics:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save tennis statistics" };
  }
}

/**
 * Save multiple sets of tennis statistics
 */
export async function saveTennisStatisticsBulk(
  gameId: number,
  statistics: SaveTennisStatisticsData[],
): Promise<TennisStatsActionResult> {
  try {
    if (statistics.length === 0) {
      return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: "No statistics provided" };
    }

    const statisticsInput = statistics.map((stat) => ({
      playerId: stat.playerId,
      ...buildStatFields(stat),
    }));

    const response = await authMutate({
      saveTennisStatisticsBulk: {
        __args: { input: { gameId, statistics: statisticsInput } },
        __typename: true,
        __on: [
          {
            __typeName: "SaveTennisStatisticsBulkResponse",
            statistics: RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.saveTennisStatisticsBulk, "SaveTennisStatisticsBulkResponse");
    if (!result.success) return result;

    const statisticsIds = result.data.statistics.map(
      (stat: { id: string }) => stat.id,
    );

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statisticsIds };
  } catch (error) {
    console.error("Failed to save tennis statistics bulk:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save tennis statistics" };
  }
}
