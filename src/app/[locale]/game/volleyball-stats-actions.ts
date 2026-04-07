"use server";

import { errorFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";
import type { SaveVolleyballStatsData, SaveVolleyballStatsInput } from "@/lib/types/stats/volleyball";
import { revalidatePath } from "next/cache";

interface VolleyballStatsActionResult {
  success: boolean;
  statsId?: string;
  statsIds?: string[];
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
  data: SaveVolleyballStatsData,
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
export async function saveVolleyballStats(
  input: SaveVolleyballStatsInput,
): Promise<VolleyballStatsActionResult> {
  try {
    const mutationInput: Record<string, unknown> = {
      playerId: input.playerId,
      gameId: input.gameId,
      ...buildStatFields(input),
    };

    const response = await authMutate({
      saveVolleyballStats: {
        __args: { input: mutationInput },
        __typename: true,
        __on: [
          {
            __typeName: "SaveVolleyballStatsResponse",
            volleyballStats: RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.saveVolleyballStats, "SaveVolleyballStatsResponse");
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsId: result.data.volleyballStats.id };
  } catch (error) {
    console.error("Failed to save volleyball stats:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save volleyball stats" };
  }
}

/**
 * Save multiple sets of volleyball statistics
 */
export async function saveVolleyballStatsBulk(
  gameId: number,
  stats: SaveVolleyballStatsData[],
): Promise<VolleyballStatsActionResult> {
  try {
    if (stats.length === 0) {
      return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: "No stats provided" };
    }

    const statsInput = stats.map((stat) => ({
      playerId: stat.playerId,
      ...buildStatFields(stat),
    }));

    const response = await authMutate({
      saveVolleyballStatsBulk: {
        __args: { input: { gameId, stats: statsInput } },
        __typename: true,
        __on: [
          {
            __typeName: "SaveVolleyballStatsBulkResponse",
            stats: RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.saveVolleyballStatsBulk, "SaveVolleyballStatsBulkResponse");
    if (!result.success) return result;

    const statsIds = result.data.stats.map(
      (stat: { id: string }) => stat.id,
    );

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsIds };
  } catch (error) {
    console.error("Failed to save volleyball stats bulk:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save volleyball stats" };
  }
}
