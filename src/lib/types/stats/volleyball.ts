import type { BoxScoreNode, SaveBoxScoreInput } from "./base";

/**
 * Volleyball statistics entry returned from the server.
 */
export interface VolleyballStatisticsNode extends BoxScoreNode {
  kills: number | null;
  attackErrors: number | null;
  attackAttempts: number | null;
  aces: number | null;
  serviceErrors: number | null;
  blocks: number | null;
  blockErrors: number | null;
  digs: number | null;
  receptionErrors: number | null;
  assists: number | null;
  points: number | null;
}

/**
 * Input for saving volleyball statistics.
 * Patch semantics:
 * - Omit a field (undefined) to leave it unchanged
 * - Set to null to clear the value
 * - Set to a number to update
 */
export interface SaveVolleyballStatisticsInput extends SaveBoxScoreInput {
  kills?: number | null;
  attackErrors?: number | null;
  attackAttempts?: number | null;
  aces?: number | null;
  serviceErrors?: number | null;
  blocks?: number | null;
  blockErrors?: number | null;
  digs?: number | null;
  receptionErrors?: number | null;
  assists?: number | null;
}

/**
 * Per-player statistics data for bulk save (gameId is at parent level).
 * Independent interface mirroring schema -- not derived from SaveVolleyballStatisticsInput.
 */
export interface SaveVolleyballStatisticsData {
  playerId: number;
  kills?: number | null;
  attackErrors?: number | null;
  attackAttempts?: number | null;
  aces?: number | null;
  serviceErrors?: number | null;
  blocks?: number | null;
  blockErrors?: number | null;
  digs?: number | null;
  receptionErrors?: number | null;
  assists?: number | null;
}
