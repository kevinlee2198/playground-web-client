import type { BoxScoreNode, SaveBoxScoreInput } from "./base";

/**
 * Basketball box score entry returned from the server.
 */
export interface BasketballBoxScoreNode extends BoxScoreNode {
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
 * Input for saving a basketball box score.
 * Patch semantics:
 * - Omit a field (undefined) to leave it unchanged
 * - Set to null to clear the value
 * - Set to a number to update
 */
export interface SaveBasketballBoxScoreInput extends SaveBoxScoreInput {
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
 * Per-player box score data for bulk save (gameId is at parent level).
 * Independent interface mirroring schema — not derived from SaveBasketballBoxScoreInput.
 */
export interface SaveBasketballBoxScoreData {
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
