import type { StatsNode, SaveStatsInput } from "./base";

/**
 * Volleyball stats entry returned from the server.
 */
export interface VolleyballStatsNode extends StatsNode {
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
 * Input for saving volleyball stats.
 * Patch semantics:
 * - Omit a field (undefined) to leave it unchanged
 * - Set to null to clear the value
 * - Set to a number to update
 */
export interface SaveVolleyballStatsInput extends SaveStatsInput {
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
 * Per-user stats data for bulk save (gameId is at parent level).
 * Independent interface mirroring schema — not derived from SaveVolleyballStatsInput.
 */
export interface SaveVolleyballStatsData {
  userId: number;
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
