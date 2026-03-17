"use server";

import { errorFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";
import type { SavePickleballStatisticsData, SavePickleballStatisticsInput } from "@/lib/types/stats/pickleball";
import { revalidatePath } from "next/cache";

interface PickleballStatsActionResult {
  success: boolean;
  statisticsId?: string;
  statisticsIds?: string[];
  errorType?: string;
  message?: string;
}

const STAT_FIELDS = [
  "aces",
  "faults",
  "doubleFaults",
  "pointsWon",
  "winners",
  "unforcedErrors",
  "forcedErrors",
  "dinks",
  "drives",
  "drops",
  "lobs",
  "volleys",
  "overheads",
] as const;

function buildStatFields(
  data: SavePickleballStatisticsData,
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
  faults: true,
  doubleFaults: true,
  pointsWon: true,
  winners: true,
  unforcedErrors: true,
  forcedErrors: true,
  dinks: true,
  drives: true,
  drops: true,
  lobs: true,
  volleys: true,
  overheads: true,
} as const;

/**
 * Save a single set of pickleball statistics
 */
export async function savePickleballStatistics(
  input: SavePickleballStatisticsInput,
): Promise<PickleballStatsActionResult> {
  try {
    const mutationInput: Record<string, unknown> = {
      playerId: input.playerId,
      gameId: input.gameId,
      ...buildStatFields(input),
    };

    const response = await authMutate({
      savePickleballStatistics: {
        __args: { input: mutationInput },
        __typename: true,
        __on: [
          {
            __typeName: "SavePickleballStatisticsResponse",
            pickleballStatistics: RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.savePickleballStatistics, "SavePickleballStatisticsResponse");
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statisticsId: result.data.pickleballStatistics.id };
  } catch (error) {
    console.error("Failed to save pickleball statistics:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save pickleball statistics" };
  }
}

/**
 * Save multiple sets of pickleball statistics
 */
export async function savePickleballStatisticsBulk(
  gameId: number,
  statistics: SavePickleballStatisticsData[],
): Promise<PickleballStatsActionResult> {
  try {
    if (statistics.length === 0) {
      return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: "No statistics provided" };
    }

    const statisticsInput = statistics.map((stat) => ({
      playerId: stat.playerId,
      ...buildStatFields(stat),
    }));

    const response = await authMutate({
      savePickleballStatisticsBulk: {
        __args: { input: { gameId, statistics: statisticsInput } },
        __typename: true,
        __on: [
          {
            __typeName: "SavePickleballStatisticsBulkResponse",
            statistics: RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.savePickleballStatisticsBulk, "SavePickleballStatisticsBulkResponse");
    if (!result.success) return result;

    const statisticsIds = result.data.statistics.map(
      (stat: { id: string }) => stat.id,
    );

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statisticsIds };
  } catch (error) {
    console.error("Failed to save pickleball statistics bulk:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save pickleball statistics" };
  }
}
