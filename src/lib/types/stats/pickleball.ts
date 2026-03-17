import type { BoxScoreNode, SaveBoxScoreInput } from "./base";

/**
 * Pickleball statistics entry returned from the server.
 */
export interface PickleballStatisticsNode extends BoxScoreNode {
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
 * Input for saving pickleball statistics.
 * Patch semantics:
 * - Omit a field (undefined) to leave it unchanged
 * - Set to null to clear the value
 * - Set to a number to update
 */
export interface SavePickleballStatisticsInput extends SaveBoxScoreInput {
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
 * Per-player statistics data for bulk save (gameId is at parent level).
 * Independent interface mirroring schema — not derived from SavePickleballStatisticsInput.
 */
export interface SavePickleballStatisticsData {
  playerId: number;
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
