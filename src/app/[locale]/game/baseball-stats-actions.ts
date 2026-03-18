"use server";

import { errorFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";
import type {
  SaveBaseballBattingStatsData,
  SaveBaseballBattingStatsInput,
  SaveBaseballPitchingStatsData,
  SaveBaseballPitchingStatsInput,
  SaveBaseballFieldingStatsData,
  SaveBaseballFieldingStatsInput,
} from "@/lib/types/stats/baseball";
import { revalidatePath } from "next/cache";

interface BaseballStatsActionResult {
  success: boolean;
  statsId?: string;
  statsIds?: string[];
  errorType?: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Batting stats
// ---------------------------------------------------------------------------

const BATTING_STAT_FIELDS = [
  "atBats",
  "runs",
  "hits",
  "doubles",
  "triples",
  "homeRuns",
  "rbi",
  "walks",
  "strikeouts",
  "stolenBases",
  "caughtStealing",
  "hitByPitch",
  "sacrifices",
] as const;

function buildBattingStatFields(
  data: SaveBaseballBattingStatsData,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of BATTING_STAT_FIELDS) {
    if (data[field] !== undefined) {
      result[field] = data[field];
    }
  }
  return result;
}

const BATTING_RESPONSE_FIELDS = {
  id: true,
  player: { id: true, user: { displayName: true } },
  atBats: true,
  runs: true,
  hits: true,
  doubles: true,
  triples: true,
  homeRuns: true,
  rbi: true,
  walks: true,
  strikeouts: true,
  stolenBases: true,
  caughtStealing: true,
  hitByPitch: true,
  sacrifices: true,
  battingAverage: true,
} as const;

/**
 * Save a single set of baseball batting statistics
 */
export async function saveBaseballBattingStats(
  input: SaveBaseballBattingStatsInput,
): Promise<BaseballStatsActionResult> {
  try {
    const mutationInput: Record<string, unknown> = {
      playerId: input.playerId,
      gameId: input.gameId,
      ...buildBattingStatFields(input),
    };

    const response = await authMutate({
      saveBaseballBattingStats: {
        __args: { input: mutationInput },
        __typename: true,
        __on: [
          {
            __typeName: "SaveBaseballBattingStatsResponse",
            baseballBattingStats: BATTING_RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(
      response.data.saveBaseballBattingStats,
      "SaveBaseballBattingStatsResponse",
    );
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsId: result.data.baseballBattingStats.id };
  } catch (error) {
    console.error("Failed to save baseball batting stats:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save baseball batting stats" };
  }
}

/**
 * Save multiple sets of baseball batting statistics
 */
export async function saveBaseballBattingStatsBulk(
  gameId: number,
  battingStats: SaveBaseballBattingStatsData[],
): Promise<BaseballStatsActionResult> {
  try {
    if (battingStats.length === 0) {
      return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: "No statistics provided" };
    }

    const battingStatsInput = battingStats.map((stat) => ({
      playerId: stat.playerId,
      ...buildBattingStatFields(stat),
    }));

    const response = await authMutate({
      saveBaseballBattingStatsBulk: {
        __args: { input: { gameId, battingStats: battingStatsInput } },
        __typename: true,
        __on: [
          {
            __typeName: "SaveBaseballBattingStatsBulkResponse",
            battingStats: BATTING_RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(
      response.data.saveBaseballBattingStatsBulk,
      "SaveBaseballBattingStatsBulkResponse",
    );
    if (!result.success) return result;

    const statsIds = result.data.battingStats.map(
      (stat: { id: string }) => stat.id,
    );

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsIds };
  } catch (error) {
    console.error("Failed to save baseball batting stats bulk:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save baseball batting stats" };
  }
}

// ---------------------------------------------------------------------------
// Pitching stats
// ---------------------------------------------------------------------------

const PITCHING_STAT_FIELDS = [
  "inningsPitched",
  "hitsAllowed",
  "runsAllowed",
  "earnedRuns",
  "walks",
  "strikeouts",
  "homeRunsAllowed",
  "hitBatsmen",
  "wildPitches",
  "pitchCount",
  "win",
  "loss",
  "creditedSave",
] as const;

function buildPitchingStatFields(
  data: SaveBaseballPitchingStatsData,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of PITCHING_STAT_FIELDS) {
    if (data[field] !== undefined) {
      result[field] = data[field];
    }
  }
  return result;
}

const PITCHING_RESPONSE_FIELDS = {
  id: true,
  player: { id: true, user: { displayName: true } },
  inningsPitched: true,
  hitsAllowed: true,
  runsAllowed: true,
  earnedRuns: true,
  walks: true,
  strikeouts: true,
  homeRunsAllowed: true,
  hitBatsmen: true,
  wildPitches: true,
  pitchCount: true,
  win: true,
  loss: true,
  creditedSave: true,
  era: true,
} as const;

/**
 * Save a single set of baseball pitching statistics
 */
export async function saveBaseballPitchingStats(
  input: SaveBaseballPitchingStatsInput,
): Promise<BaseballStatsActionResult> {
  try {
    const mutationInput: Record<string, unknown> = {
      playerId: input.playerId,
      gameId: input.gameId,
      ...buildPitchingStatFields(input),
    };

    const response = await authMutate({
      saveBaseballPitchingStats: {
        __args: { input: mutationInput },
        __typename: true,
        __on: [
          {
            __typeName: "SaveBaseballPitchingStatsResponse",
            baseballPitchingStats: PITCHING_RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(
      response.data.saveBaseballPitchingStats,
      "SaveBaseballPitchingStatsResponse",
    );
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsId: result.data.baseballPitchingStats.id };
  } catch (error) {
    console.error("Failed to save baseball pitching stats:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save baseball pitching stats" };
  }
}

/**
 * Save multiple sets of baseball pitching statistics
 */
export async function saveBaseballPitchingStatsBulk(
  gameId: number,
  pitchingStats: SaveBaseballPitchingStatsData[],
): Promise<BaseballStatsActionResult> {
  try {
    if (pitchingStats.length === 0) {
      return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: "No statistics provided" };
    }

    const pitchingStatsInput = pitchingStats.map((stat) => ({
      playerId: stat.playerId,
      ...buildPitchingStatFields(stat),
    }));

    const response = await authMutate({
      saveBaseballPitchingStatsBulk: {
        __args: { input: { gameId, pitchingStats: pitchingStatsInput } },
        __typename: true,
        __on: [
          {
            __typeName: "SaveBaseballPitchingStatsBulkResponse",
            pitchingStats: PITCHING_RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(
      response.data.saveBaseballPitchingStatsBulk,
      "SaveBaseballPitchingStatsBulkResponse",
    );
    if (!result.success) return result;

    const statsIds = result.data.pitchingStats.map(
      (stat: { id: string }) => stat.id,
    );

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsIds };
  } catch (error) {
    console.error("Failed to save baseball pitching stats bulk:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save baseball pitching stats" };
  }
}

// ---------------------------------------------------------------------------
// Fielding stats
// ---------------------------------------------------------------------------

const FIELDING_STAT_FIELDS = [
  "putouts",
  "assists",
  "errors",
] as const;

function buildFieldingStatFields(
  data: SaveBaseballFieldingStatsData,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of FIELDING_STAT_FIELDS) {
    if (data[field] !== undefined) {
      result[field] = data[field];
    }
  }
  return result;
}

const FIELDING_RESPONSE_FIELDS = {
  id: true,
  player: { id: true, user: { displayName: true } },
  putouts: true,
  assists: true,
  errors: true,
  fieldingPercentage: true,
} as const;

/**
 * Save a single set of baseball fielding statistics
 */
export async function saveBaseballFieldingStats(
  input: SaveBaseballFieldingStatsInput,
): Promise<BaseballStatsActionResult> {
  try {
    const mutationInput: Record<string, unknown> = {
      playerId: input.playerId,
      gameId: input.gameId,
      ...buildFieldingStatFields(input),
    };

    const response = await authMutate({
      saveBaseballFieldingStats: {
        __args: { input: mutationInput },
        __typename: true,
        __on: [
          {
            __typeName: "SaveBaseballFieldingStatsResponse",
            baseballFieldingStats: FIELDING_RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(
      response.data.saveBaseballFieldingStats,
      "SaveBaseballFieldingStatsResponse",
    );
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsId: result.data.baseballFieldingStats.id };
  } catch (error) {
    console.error("Failed to save baseball fielding stats:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save baseball fielding stats" };
  }
}

/**
 * Save multiple sets of baseball fielding statistics
 */
export async function saveBaseballFieldingStatsBulk(
  gameId: number,
  fieldingStats: SaveBaseballFieldingStatsData[],
): Promise<BaseballStatsActionResult> {
  try {
    if (fieldingStats.length === 0) {
      return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: "No statistics provided" };
    }

    const fieldingStatsInput = fieldingStats.map((stat) => ({
      playerId: stat.playerId,
      ...buildFieldingStatFields(stat),
    }));

    const response = await authMutate({
      saveBaseballFieldingStatsBulk: {
        __args: { input: { gameId, fieldingStats: fieldingStatsInput } },
        __typename: true,
        __on: [
          {
            __typeName: "SaveBaseballFieldingStatsBulkResponse",
            fieldingStats: FIELDING_RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(
      response.data.saveBaseballFieldingStatsBulk,
      "SaveBaseballFieldingStatsBulkResponse",
    );
    if (!result.success) return result;

    const statsIds = result.data.fieldingStats.map(
      (stat: { id: string }) => stat.id,
    );

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsIds };
  } catch (error) {
    console.error("Failed to save baseball fielding stats bulk:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save baseball fielding stats" };
  }
}
