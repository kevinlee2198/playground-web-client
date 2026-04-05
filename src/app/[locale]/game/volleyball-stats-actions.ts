"use server";

import { errorFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";
import type { SaveVolleyballStatisticsData, SaveVolleyballStatisticsInput } from "@/lib/types/stats/volleyball";
import { revalidatePath } from "next/cache";

interface VolleyballStatsActionResult {
  success: boolean;
  statisticsId?: string;
  statisticsIds?: string[];
  errorType?: string;
  message?: string;
}

const STAT_FIELDS = [
  "kills",
  "attackErrors",
  "attackAttempts",
  "aces",
  "serviceErrors",
  "blocks",
  "blockErrors",
  "digs",
  "receptionErrors",
  "assists",
] as const;

function buildStatFields(
  data: SaveVolleyballStatisticsData,
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
  kills: true,
  attackErrors: true,
  attackAttempts: true,
  aces: true,
  serviceErrors: true,
  blocks: true,
  blockErrors: true,
  digs: true,
  receptionErrors: true,
  assists: true,
  points: true,
} as const;

/**
 * Save a single set of volleyball statistics
 */
export async function saveVolleyballStatistics(
  input: SaveVolleyballStatisticsInput,
): Promise<VolleyballStatsActionResult> {
  try {
    const mutationInput: Record<string, unknown> = {
      playerId: input.playerId,
      gameId: input.gameId,
      ...buildStatFields(input),
    };

    const response = await authMutate({
      saveVolleyballStatistics: {
        __args: { input: mutationInput },
        __typename: true,
        __on: [
          {
            __typeName: "SaveVolleyballStatisticsResponse",
            volleyballStatistics: RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.saveVolleyballStatistics, "SaveVolleyballStatisticsResponse");
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statisticsId: result.data.volleyballStatistics.id };
  } catch (error) {
    console.error("Failed to save volleyball statistics:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save volleyball statistics" };
  }
}

/**
 * Save multiple sets of volleyball statistics
 */
export async function saveVolleyballStatisticsBulk(
  gameId: number,
  statistics: SaveVolleyballStatisticsData[],
): Promise<VolleyballStatsActionResult> {
  try {
    if (statistics.length === 0) {
      return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: "No statistics provided" };
    }

    const statisticsInput = statistics.map((stat) => ({
      playerId: stat.playerId,
      ...buildStatFields(stat),
    }));

    const response = await authMutate({
      saveVolleyballStatisticsBulk: {
        __args: { input: { gameId, statistics: statisticsInput } },
        __typename: true,
        __on: [
          {
            __typeName: "SaveVolleyballStatisticsBulkResponse",
            statistics: RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.saveVolleyballStatisticsBulk, "SaveVolleyballStatisticsBulkResponse");
    if (!result.success) return result;

    const statisticsIds = result.data.statistics.map(
      (stat: { id: string }) => stat.id,
    );

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statisticsIds };
  } catch (error) {
    console.error("Failed to save volleyball statistics bulk:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save volleyball statistics" };
  }
}
