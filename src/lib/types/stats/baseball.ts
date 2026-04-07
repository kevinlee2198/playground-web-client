import type { StatsNode, SaveStatsInput } from "./base";

// ---------------------------------------------------------------------------
// Batting
// ---------------------------------------------------------------------------

/**
 * Baseball batting statistics entry returned from the server.
 */
export interface BaseballBattingStatsNode extends StatsNode {
  atBats: number | null;
  runs: number | null;
  hits: number | null;
  doubles: number | null;
  triples: number | null;
  homeRuns: number | null;
  rbi: number | null;
  walks: number | null;
  strikeouts: number | null;
  stolenBases: number | null;
  caughtStealing: number | null;
  hitByPitch: number | null;
  sacrifices: number | null;
  battingAverage: number | null;
}

/**
 * Input for saving baseball batting statistics.
 * Patch semantics:
 * - Omit a field (undefined) to leave it unchanged
 * - Set to null to clear the value
 * - Set to a number to update
 */
export interface SaveBaseballBattingStatsInput extends SaveStatsInput {
  atBats?: number | null;
  runs?: number | null;
  hits?: number | null;
  doubles?: number | null;
  triples?: number | null;
  homeRuns?: number | null;
  rbi?: number | null;
  walks?: number | null;
  strikeouts?: number | null;
  stolenBases?: number | null;
  caughtStealing?: number | null;
  hitByPitch?: number | null;
  sacrifices?: number | null;
}

/**
 * Per-player batting statistics data for bulk save (gameId is at parent level).
 * Independent interface mirroring schema — not derived from SaveBaseballBattingStatsInput.
 */
export interface SaveBaseballBattingStatsData {
  playerId: number;
  atBats?: number | null;
  runs?: number | null;
  hits?: number | null;
  doubles?: number | null;
  triples?: number | null;
  homeRuns?: number | null;
  rbi?: number | null;
  walks?: number | null;
  strikeouts?: number | null;
  stolenBases?: number | null;
  caughtStealing?: number | null;
  hitByPitch?: number | null;
  sacrifices?: number | null;
}

// ---------------------------------------------------------------------------
// Pitching
// ---------------------------------------------------------------------------

/**
 * Baseball pitching statistics entry returned from the server.
 */
export interface BaseballPitchingStatsNode extends StatsNode {
  inningsPitched: number | null;
  hitsAllowed: number | null;
  runsAllowed: number | null;
  earnedRuns: number | null;
  walks: number | null;
  strikeouts: number | null;
  homeRunsAllowed: number | null;
  hitBatsmen: number | null;
  wildPitches: number | null;
  pitchCount: number | null;
  win: boolean | null;
  loss: boolean | null;
  creditedSave: boolean | null;
  era: number | null;
}

/**
 * Input for saving baseball pitching statistics.
 * Patch semantics:
 * - Omit a field (undefined) to leave it unchanged
 * - Set to null to clear the value
 * - Set to a number/boolean to update
 */
export interface SaveBaseballPitchingStatsInput extends SaveStatsInput {
  inningsPitched?: number | null;
  hitsAllowed?: number | null;
  runsAllowed?: number | null;
  earnedRuns?: number | null;
  walks?: number | null;
  strikeouts?: number | null;
  homeRunsAllowed?: number | null;
  hitBatsmen?: number | null;
  wildPitches?: number | null;
  pitchCount?: number | null;
  win?: boolean | null;
  loss?: boolean | null;
  creditedSave?: boolean | null;
}

/**
 * Per-player pitching statistics data for bulk save (gameId is at parent level).
 * Independent interface mirroring schema — not derived from SaveBaseballPitchingStatsInput.
 */
export interface SaveBaseballPitchingStatsData {
  playerId: number;
  inningsPitched?: number | null;
  hitsAllowed?: number | null;
  runsAllowed?: number | null;
  earnedRuns?: number | null;
  walks?: number | null;
  strikeouts?: number | null;
  homeRunsAllowed?: number | null;
  hitBatsmen?: number | null;
  wildPitches?: number | null;
  pitchCount?: number | null;
  win?: boolean | null;
  loss?: boolean | null;
  creditedSave?: boolean | null;
}

// ---------------------------------------------------------------------------
// Fielding
// ---------------------------------------------------------------------------

/**
 * Baseball fielding statistics entry returned from the server.
 */
export interface BaseballFieldingStatsNode extends StatsNode {
  putouts: number | null;
  assists: number | null;
  errors: number | null;
  fieldingPercentage: number | null;
}

/**
 * Input for saving baseball fielding statistics.
 * Patch semantics:
 * - Omit a field (undefined) to leave it unchanged
 * - Set to null to clear the value
 * - Set to a number to update
 */
export interface SaveBaseballFieldingStatsInput extends SaveStatsInput {
  putouts?: number | null;
  assists?: number | null;
  errors?: number | null;
}

/**
 * Per-player fielding statistics data for bulk save (gameId is at parent level).
 * Independent interface mirroring schema — not derived from SaveBaseballFieldingStatsInput.
 */
export interface SaveBaseballFieldingStatsData {
  playerId: number;
  putouts?: number | null;
  assists?: number | null;
  errors?: number | null;
}
