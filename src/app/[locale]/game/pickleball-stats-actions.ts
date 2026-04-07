"use server";

import { errorFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";
import type { SavePickleballStatsData, SavePickleballStatsInput } from "@/lib/types/stats/pickleball";
import { revalidatePath } from "next/cache";

interface PickleballStatsActionResult {
  success: boolean;
  statsId?: string;
  statsIds?: string[];
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
  data: SavePickleballStatsData,
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
export async function savePickleballStats(
  input: SavePickleballStatsInput,
): Promise<PickleballStatsActionResult> {
  try {
    const mutationInput: Record<string, unknown> = {
      playerId: input.playerId,
      gameId: input.gameId,
      ...buildStatFields(input),
    };

    const response = await authMutate({
      savePickleballStats: {
        __args: { input: mutationInput },
        __typename: true,
        __on: [
          {
            __typeName: "SavePickleballStatsResponse",
            pickleballStats: RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.savePickleballStats, "SavePickleballStatsResponse");
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsId: result.data.pickleballStats.id };
  } catch (error) {
    console.error("Failed to save pickleball stats:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save pickleball stats" };
  }
}

/**
 * Save multiple sets of pickleball statistics
 */
export async function savePickleballStatsBulk(
  gameId: number,
  stats: SavePickleballStatsData[],
): Promise<PickleballStatsActionResult> {
  try {
    if (stats.length === 0) {
      return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: "No stats provided" };
    }

    const statsInput = stats.map((stat) => ({
      playerId: stat.playerId,
      ...buildStatFields(stat),
    }));

    const response = await authMutate({
      savePickleballStatsBulk: {
        __args: { input: { gameId, stats: statsInput } },
        __typename: true,
        __on: [
          {
            __typeName: "SavePickleballStatsBulkResponse",
            stats: RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.savePickleballStatsBulk, "SavePickleballStatsBulkResponse");
    if (!result.success) return result;

    const statsIds = result.data.stats.map(
      (stat: { id: string }) => stat.id,
    );

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsIds };
  } catch (error) {
    console.error("Failed to save pickleball stats bulk:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save pickleball stats" };
  }
}
