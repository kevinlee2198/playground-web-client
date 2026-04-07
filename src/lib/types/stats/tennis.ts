import type { StatsNode, SaveStatsInput } from "./base";

/**
 * Tennis match stats entry returned from the server.
 */
export interface TennisStatsNode extends StatsNode {
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
 * Input for saving tennis stats.
 * Patch semantics:
 * - Omit a field (undefined) to leave it unchanged
 * - Set to null to clear the value
 * - Set to a number to update
 */
export interface SaveTennisStatsInput extends SaveStatsInput {
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
 * Per-player stats data for bulk save (gameId is at parent level).
 * Independent interface mirroring schema — not derived from SaveTennisStatsInput.
 */
export interface SaveTennisStatsData {
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
