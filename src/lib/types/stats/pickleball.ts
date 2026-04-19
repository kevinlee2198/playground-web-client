import type { StatsNode, SaveStatsInput } from "./base";

/**
 * Pickleball stats entry returned from the server.
 */
export interface PickleballStatsNode extends StatsNode {
  aces: number | null;
  faults: number | null;
  doubleFaults: number | null;
  pointsWon: number | null;
  winners: number | null;
  unforcedErrors: number | null;
  forcedErrors: number | null;
  dinks: number | null;
  drives: number | null;
  drops: number | null;
  lobs: number | null;
  volleys: number | null;
  overheads: number | null;
}

/**
 * Input for saving pickleball stats.
 * Patch semantics:
 * - Omit a field (undefined) to leave it unchanged
 * - Set to null to clear the value
 * - Set to a number to update
 */
export interface SavePickleballStatsInput extends SaveStatsInput {
  aces?: number | null;
  faults?: number | null;
  doubleFaults?: number | null;
  pointsWon?: number | null;
  winners?: number | null;
  unforcedErrors?: number | null;
  forcedErrors?: number | null;
  dinks?: number | null;
  drives?: number | null;
  drops?: number | null;
  lobs?: number | null;
  volleys?: number | null;
  overheads?: number | null;
}

/**
 * Per-user stats data for bulk save (gameId is at parent level).
 * Independent interface mirroring schema — not derived from SavePickleballStatsInput.
 */
export interface SavePickleballStatsData {
  userId: number;
  aces?: number | null;
  faults?: number | null;
  doubleFaults?: number | null;
  pointsWon?: number | null;
  winners?: number | null;
  unforcedErrors?: number | null;
  forcedErrors?: number | null;
  dinks?: number | null;
  drives?: number | null;
  drops?: number | null;
  lobs?: number | null;
  volleys?: number | null;
  overheads?: number | null;
}
