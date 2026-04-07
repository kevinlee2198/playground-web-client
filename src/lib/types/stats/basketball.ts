import type { StatsNode, SaveStatsInput } from "./base";

/**
 * Basketball stats entry returned from the server.
 */
export interface BasketballStatsNode extends StatsNode {
  points: number | null;
  assists: number | null;
  totalRebounds: number | null;
  offensiveRebounds: number | null;
  defensiveRebounds: number | null;
  steals: number | null;
  blocks: number | null;
  turnovers: number | null;
  personalFouls: number | null;
  fieldGoalsMade: number | null;
  fieldGoalsAttempted: number | null;
  fieldGoalPercentage: number | null;
  threePointersMade: number | null;
  threePointersAttempted: number | null;
  threePointerPercentage: number | null;
  twoPointersMade: number | null;
  twoPointersAttempted: number | null;
  twoPointerPercentage: number | null;
  freeThrowsMade: number | null;
  freeThrowsAttempted: number | null;
  freeThrowPercentage: number | null;
}

/**
 * Input for saving basketball stats.
 * Patch semantics:
 * - Omit a field (undefined) to leave it unchanged
 * - Set to null to clear the value
 * - Set to a number to update
 */
export interface SaveBasketballStatsInput extends SaveStatsInput {
  assists?: number | null;
  steals?: number | null;
  blocks?: number | null;
  turnovers?: number | null;
  personalFouls?: number | null;
  offensiveRebounds?: number | null;
  defensiveRebounds?: number | null;
  threePointersMade?: number | null;
  threePointersAttempted?: number | null;
  twoPointersMade?: number | null;
  twoPointersAttempted?: number | null;
  freeThrowsMade?: number | null;
  freeThrowsAttempted?: number | null;
}

/**
 * Per-player stats data for bulk save (gameId is at parent level).
 * Independent interface mirroring schema — not derived from SaveBasketballStatsInput.
 */
export interface SaveBasketballStatsData {
  playerId: number;
  assists?: number | null;
  steals?: number | null;
  blocks?: number | null;
  turnovers?: number | null;
  personalFouls?: number | null;
  offensiveRebounds?: number | null;
  defensiveRebounds?: number | null;
  threePointersMade?: number | null;
  threePointersAttempted?: number | null;
  twoPointersMade?: number | null;
  twoPointersAttempted?: number | null;
  freeThrowsMade?: number | null;
  freeThrowsAttempted?: number | null;
}
