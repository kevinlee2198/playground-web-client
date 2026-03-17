"use server";

import { errorFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";
import type {
  SaveFootballOffensiveStatsData,
  SaveFootballOffensiveStatsInput,
  SaveFootballDefensiveStatsData,
  SaveFootballDefensiveStatsInput,
  SaveFootballSpecialTeamsStatsData,
  SaveFootballSpecialTeamsStatsInput,
} from "@/lib/types/stats/football";
import { revalidatePath } from "next/cache";

interface FootballStatsActionResult {
  success: boolean;
  statsId?: string;
  statsIds?: string[];
  errorType?: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Offensive stats
// ---------------------------------------------------------------------------

const OFFENSIVE_STAT_FIELDS = [
  "completions",
  "passAttempts",
  "passingYards",
  "passingTouchdowns",
  "interceptionsThrown",
  "sacksTaken",
  "sackYardsLost",
  "rushAttempts",
  "rushingYards",
  "rushingTouchdowns",
  "fumbles",
  "fumblesLost",
  "receptions",
  "targets",
  "receivingYards",
  "receivingTouchdowns",
] as const;

function buildOffensiveStatFields(
  data: SaveFootballOffensiveStatsData,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of OFFENSIVE_STAT_FIELDS) {
    if (data[field] !== undefined) {
      result[field] = data[field];
    }
  }
  return result;
}

const OFFENSIVE_RESPONSE_FIELDS = {
  id: true,
  player: { id: true, user: { displayName: true } },
  completions: true,
  passAttempts: true,
  passingYards: true,
  passingTouchdowns: true,
  interceptionsThrown: true,
  sacksTaken: true,
  sackYardsLost: true,
  rushAttempts: true,
  rushingYards: true,
  rushingTouchdowns: true,
  fumbles: true,
  fumblesLost: true,
  receptions: true,
  targets: true,
  receivingYards: true,
  receivingTouchdowns: true,
} as const;

/**
 * Save a single set of football offensive statistics
 */
export async function saveFootballOffensiveStats(
  input: SaveFootballOffensiveStatsInput,
): Promise<FootballStatsActionResult> {
  try {
    const mutationInput: Record<string, unknown> = {
      playerId: input.playerId,
      gameId: input.gameId,
      ...buildOffensiveStatFields(input),
    };

    const response = await authMutate({
      saveFootballOffensiveStats: {
        __args: { input: mutationInput },
        __typename: true,
        __on: [
          {
            __typeName: "SaveFootballOffensiveStatsResponse",
            footballOffensiveStats: OFFENSIVE_RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(
      response.data.saveFootballOffensiveStats,
      "SaveFootballOffensiveStatsResponse",
    );
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsId: result.data.footballOffensiveStats.id };
  } catch (error) {
    console.error("Failed to save football offensive stats:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save football offensive stats" };
  }
}

/**
 * Save multiple sets of football offensive statistics
 */
export async function saveFootballOffensiveStatsBulk(
  gameId: number,
  offensiveStats: SaveFootballOffensiveStatsData[],
): Promise<FootballStatsActionResult> {
  try {
    if (offensiveStats.length === 0) {
      return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: "No statistics provided" };
    }

    const offensiveStatsInput = offensiveStats.map((stat) => ({
      playerId: stat.playerId,
      ...buildOffensiveStatFields(stat),
    }));

    const response = await authMutate({
      saveFootballOffensiveStatsBulk: {
        __args: { input: { gameId, offensiveStats: offensiveStatsInput } },
        __typename: true,
        __on: [
          {
            __typeName: "SaveFootballOffensiveStatsBulkResponse",
            offensiveStats: OFFENSIVE_RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(
      response.data.saveFootballOffensiveStatsBulk,
      "SaveFootballOffensiveStatsBulkResponse",
    );
    if (!result.success) return result;

    const statsIds = result.data.offensiveStats.map(
      (stat: { id: string }) => stat.id,
    );

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsIds };
  } catch (error) {
    console.error("Failed to save football offensive stats bulk:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save football offensive stats" };
  }
}

// ---------------------------------------------------------------------------
// Defensive stats
// ---------------------------------------------------------------------------

const DEFENSIVE_STAT_FIELDS = [
  "soloTackles",
  "assistedTackles",
  "sacks",
  "tacklesForLoss",
  "passesDefended",
  "interceptions",
  "interceptionReturnYards",
  "interceptionReturnTouchdowns",
  "forcedFumbles",
  "fumbleRecoveries",
  "fumbleReturnYards",
  "fumbleReturnTouchdowns",
  "safeties",
] as const;

function buildDefensiveStatFields(
  data: SaveFootballDefensiveStatsData,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of DEFENSIVE_STAT_FIELDS) {
    if (data[field] !== undefined) {
      result[field] = data[field];
    }
  }
  return result;
}

const DEFENSIVE_RESPONSE_FIELDS = {
  id: true,
  player: { id: true, user: { displayName: true } },
  soloTackles: true,
  assistedTackles: true,
  sacks: true,
  tacklesForLoss: true,
  passesDefended: true,
  interceptions: true,
  interceptionReturnYards: true,
  interceptionReturnTouchdowns: true,
  forcedFumbles: true,
  fumbleRecoveries: true,
  fumbleReturnYards: true,
  fumbleReturnTouchdowns: true,
  safeties: true,
} as const;

/**
 * Save a single set of football defensive statistics
 */
export async function saveFootballDefensiveStats(
  input: SaveFootballDefensiveStatsInput,
): Promise<FootballStatsActionResult> {
  try {
    const mutationInput: Record<string, unknown> = {
      playerId: input.playerId,
      gameId: input.gameId,
      ...buildDefensiveStatFields(input),
    };

    const response = await authMutate({
      saveFootballDefensiveStats: {
        __args: { input: mutationInput },
        __typename: true,
        __on: [
          {
            __typeName: "SaveFootballDefensiveStatsResponse",
            footballDefensiveStats: DEFENSIVE_RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(
      response.data.saveFootballDefensiveStats,
      "SaveFootballDefensiveStatsResponse",
    );
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsId: result.data.footballDefensiveStats.id };
  } catch (error) {
    console.error("Failed to save football defensive stats:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save football defensive stats" };
  }
}

/**
 * Save multiple sets of football defensive statistics
 */
export async function saveFootballDefensiveStatsBulk(
  gameId: number,
  defensiveStats: SaveFootballDefensiveStatsData[],
): Promise<FootballStatsActionResult> {
  try {
    if (defensiveStats.length === 0) {
      return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: "No statistics provided" };
    }

    const defensiveStatsInput = defensiveStats.map((stat) => ({
      playerId: stat.playerId,
      ...buildDefensiveStatFields(stat),
    }));

    const response = await authMutate({
      saveFootballDefensiveStatsBulk: {
        __args: { input: { gameId, defensiveStats: defensiveStatsInput } },
        __typename: true,
        __on: [
          {
            __typeName: "SaveFootballDefensiveStatsBulkResponse",
            defensiveStats: DEFENSIVE_RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(
      response.data.saveFootballDefensiveStatsBulk,
      "SaveFootballDefensiveStatsBulkResponse",
    );
    if (!result.success) return result;

    const statsIds = result.data.defensiveStats.map(
      (stat: { id: string }) => stat.id,
    );

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsIds };
  } catch (error) {
    console.error("Failed to save football defensive stats bulk:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save football defensive stats" };
  }
}

// ---------------------------------------------------------------------------
// Special teams stats
// ---------------------------------------------------------------------------

const SPECIAL_TEAMS_STAT_FIELDS = [
  "fieldGoalsMade",
  "fieldGoalsAttempted",
  "longestFieldGoal",
  "extraPointsMade",
  "extraPointsAttempted",
  "punts",
  "puntYards",
  "longestPunt",
  "puntReturns",
  "puntReturnYards",
  "puntReturnTouchdowns",
  "kickReturns",
  "kickReturnYards",
  "kickReturnTouchdowns",
] as const;

function buildSpecialTeamsStatFields(
  data: SaveFootballSpecialTeamsStatsData,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of SPECIAL_TEAMS_STAT_FIELDS) {
    if (data[field] !== undefined) {
      result[field] = data[field];
    }
  }
  return result;
}

const SPECIAL_TEAMS_RESPONSE_FIELDS = {
  id: true,
  player: { id: true, user: { displayName: true } },
  fieldGoalsMade: true,
  fieldGoalsAttempted: true,
  longestFieldGoal: true,
  extraPointsMade: true,
  extraPointsAttempted: true,
  punts: true,
  puntYards: true,
  longestPunt: true,
  puntReturns: true,
  puntReturnYards: true,
  puntReturnTouchdowns: true,
  kickReturns: true,
  kickReturnYards: true,
  kickReturnTouchdowns: true,
} as const;

/**
 * Save a single set of football special teams statistics
 */
export async function saveFootballSpecialTeamsStats(
  input: SaveFootballSpecialTeamsStatsInput,
): Promise<FootballStatsActionResult> {
  try {
    const mutationInput: Record<string, unknown> = {
      playerId: input.playerId,
      gameId: input.gameId,
      ...buildSpecialTeamsStatFields(input),
    };

    const response = await authMutate({
      saveFootballSpecialTeamsStats: {
        __args: { input: mutationInput },
        __typename: true,
        __on: [
          {
            __typeName: "SaveFootballSpecialTeamsStatsResponse",
            footballSpecialTeamsStats: SPECIAL_TEAMS_RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(
      response.data.saveFootballSpecialTeamsStats,
      "SaveFootballSpecialTeamsStatsResponse",
    );
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsId: result.data.footballSpecialTeamsStats.id };
  } catch (error) {
    console.error("Failed to save football special teams stats:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save football special teams stats" };
  }
}

/**
 * Save multiple sets of football special teams statistics
 */
export async function saveFootballSpecialTeamsStatsBulk(
  gameId: number,
  specialTeamsStats: SaveFootballSpecialTeamsStatsData[],
): Promise<FootballStatsActionResult> {
  try {
    if (specialTeamsStats.length === 0) {
      return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: "No statistics provided" };
    }

    const specialTeamsStatsInput = specialTeamsStats.map((stat) => ({
      playerId: stat.playerId,
      ...buildSpecialTeamsStatFields(stat),
    }));

    const response = await authMutate({
      saveFootballSpecialTeamsStatsBulk: {
        __args: { input: { gameId, specialTeamsStats: specialTeamsStatsInput } },
        __typename: true,
        __on: [
          {
            __typeName: "SaveFootballSpecialTeamsStatsBulkResponse",
            specialTeamsStats: SPECIAL_TEAMS_RESPONSE_FIELDS,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(
      response.data.saveFootballSpecialTeamsStatsBulk,
      "SaveFootballSpecialTeamsStatsBulkResponse",
    );
    if (!result.success) return result;

    const statsIds = result.data.specialTeamsStats.map(
      (stat: { id: string }) => stat.id,
    );

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, statsIds };
  } catch (error) {
    console.error("Failed to save football special teams stats bulk:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to save football special teams stats" };
  }
}
