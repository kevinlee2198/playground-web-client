import type { BoxScoreNode, SaveBoxScoreInput } from "./base";

/**
 * Tennis match statistics entry returned from the server.
 */
export interface TennisStatisticsNode extends BoxScoreNode {
  aces: number | null;
  doubleFaults: number | null;
  firstServesIn: number | null;
  firstServeAttempts: number | null;
  firstServePointsWon: number | null;
  firstServePointsPlayed: number | null;
  secondServePointsWon: number | null;
  secondServePointsPlayed: number | null;
  breakPointsConverted: number | null;
  breakPointsFaced: number | null;
  returnPointsWon: number | null;
  returnPointsPlayed: number | null;
  winners: number | null;
  unforcedErrors: number | null;
  totalPointsWon: number | null;
}

/**
 * Input for saving tennis statistics.
 * Patch semantics:
 * - Omit a field (undefined) to leave it unchanged
 * - Set to null to clear the value
 * - Set to a number to update
 */
export interface SaveTennisStatisticsInput extends SaveBoxScoreInput {
  aces?: number | null;
  doubleFaults?: number | null;
  firstServesIn?: number | null;
  firstServeAttempts?: number | null;
  firstServePointsWon?: number | null;
  firstServePointsPlayed?: number | null;
  secondServePointsWon?: number | null;
  secondServePointsPlayed?: number | null;
  breakPointsConverted?: number | null;
  breakPointsFaced?: number | null;
  returnPointsWon?: number | null;
  returnPointsPlayed?: number | null;
  winners?: number | null;
  unforcedErrors?: number | null;
  totalPointsWon?: number | null;
}

/**
 * Per-player statistics data for bulk save (gameId is at parent level).
 * Independent interface mirroring schema — not derived from SaveTennisStatisticsInput.
 */
export interface SaveTennisStatisticsData {
  playerId: number;
  aces?: number | null;
  doubleFaults?: number | null;
  firstServesIn?: number | null;
  firstServeAttempts?: number | null;
  firstServePointsWon?: number | null;
  firstServePointsPlayed?: number | null;
  secondServePointsWon?: number | null;
  secondServePointsPlayed?: number | null;
  breakPointsConverted?: number | null;
  breakPointsFaced?: number | null;
  returnPointsWon?: number | null;
  returnPointsPlayed?: number | null;
  winners?: number | null;
  unforcedErrors?: number | null;
  totalPointsWon?: number | null;
}
