import type { StatsNode, SaveStatsInput } from "./base";

/**
 * Football offensive statistics entry returned from the server.
 */
export interface FootballOffensiveStatsNode extends StatsNode {
  completions: number | null;
  passAttempts: number | null;
  passingYards: number | null;
  passingTouchdowns: number | null;
  interceptionsThrown: number | null;
  sacksTaken: number | null;
  sackYardsLost: number | null;
  rushAttempts: number | null;
  rushingYards: number | null;
  rushingTouchdowns: number | null;
  fumbles: number | null;
  fumblesLost: number | null;
  receptions: number | null;
  targets: number | null;
  receivingYards: number | null;
  receivingTouchdowns: number | null;
}

/**
 * Input for saving football offensive statistics.
 * Patch semantics:
 * - Omit a field (undefined) to leave it unchanged
 * - Set to null to clear the value
 * - Set to a number to update
 */
export interface SaveFootballOffensiveStatsInput extends SaveStatsInput {
  completions?: number | null;
  passAttempts?: number | null;
  passingYards?: number | null;
  passingTouchdowns?: number | null;
  interceptionsThrown?: number | null;
  sacksTaken?: number | null;
  sackYardsLost?: number | null;
  rushAttempts?: number | null;
  rushingYards?: number | null;
  rushingTouchdowns?: number | null;
  fumbles?: number | null;
  fumblesLost?: number | null;
  receptions?: number | null;
  targets?: number | null;
  receivingYards?: number | null;
  receivingTouchdowns?: number | null;
}

/**
 * Per-player offensive statistics data for bulk save (gameId is at parent level).
 * Independent interface mirroring schema — not derived from SaveFootballOffensiveStatsInput.
 */
export interface SaveFootballOffensiveStatsData {
  playerId: number;
  completions?: number | null;
  passAttempts?: number | null;
  passingYards?: number | null;
  passingTouchdowns?: number | null;
  interceptionsThrown?: number | null;
  sacksTaken?: number | null;
  sackYardsLost?: number | null;
  rushAttempts?: number | null;
  rushingYards?: number | null;
  rushingTouchdowns?: number | null;
  fumbles?: number | null;
  fumblesLost?: number | null;
  receptions?: number | null;
  targets?: number | null;
  receivingYards?: number | null;
  receivingTouchdowns?: number | null;
}

/**
 * Football defensive statistics entry returned from the server.
 */
export interface FootballDefensiveStatsNode extends StatsNode {
  soloTackles: number | null;
  assistedTackles: number | null;
  sacks: number | null;
  tacklesForLoss: number | null;
  passesDefended: number | null;
  interceptions: number | null;
  interceptionReturnYards: number | null;
  interceptionReturnTouchdowns: number | null;
  forcedFumbles: number | null;
  fumbleRecoveries: number | null;
  fumbleReturnYards: number | null;
  fumbleReturnTouchdowns: number | null;
  safeties: number | null;
}

/**
 * Input for saving football defensive statistics.
 * Patch semantics:
 * - Omit a field (undefined) to leave it unchanged
 * - Set to null to clear the value
 * - Set to a number to update
 */
export interface SaveFootballDefensiveStatsInput extends SaveStatsInput {
  soloTackles?: number | null;
  assistedTackles?: number | null;
  sacks?: number | null;
  tacklesForLoss?: number | null;
  passesDefended?: number | null;
  interceptions?: number | null;
  interceptionReturnYards?: number | null;
  interceptionReturnTouchdowns?: number | null;
  forcedFumbles?: number | null;
  fumbleRecoveries?: number | null;
  fumbleReturnYards?: number | null;
  fumbleReturnTouchdowns?: number | null;
  safeties?: number | null;
}

/**
 * Per-player defensive statistics data for bulk save (gameId is at parent level).
 * Independent interface mirroring schema — not derived from SaveFootballDefensiveStatsInput.
 */
export interface SaveFootballDefensiveStatsData {
  playerId: number;
  soloTackles?: number | null;
  assistedTackles?: number | null;
  sacks?: number | null;
  tacklesForLoss?: number | null;
  passesDefended?: number | null;
  interceptions?: number | null;
  interceptionReturnYards?: number | null;
  interceptionReturnTouchdowns?: number | null;
  forcedFumbles?: number | null;
  fumbleRecoveries?: number | null;
  fumbleReturnYards?: number | null;
  fumbleReturnTouchdowns?: number | null;
  safeties?: number | null;
}

/**
 * Football special teams statistics entry returned from the server.
 */
export interface FootballSpecialTeamsStatsNode extends StatsNode {
  fieldGoalsMade: number | null;
  fieldGoalsAttempted: number | null;
  longestFieldGoal: number | null;
  extraPointsMade: number | null;
  extraPointsAttempted: number | null;
  punts: number | null;
  puntYards: number | null;
  longestPunt: number | null;
  puntReturns: number | null;
  puntReturnYards: number | null;
  puntReturnTouchdowns: number | null;
  kickReturns: number | null;
  kickReturnYards: number | null;
  kickReturnTouchdowns: number | null;
}

/**
 * Input for saving football special teams statistics.
 * Patch semantics:
 * - Omit a field (undefined) to leave it unchanged
 * - Set to null to clear the value
 * - Set to a number to update
 */
export interface SaveFootballSpecialTeamsStatsInput extends SaveStatsInput {
  fieldGoalsMade?: number | null;
  fieldGoalsAttempted?: number | null;
  longestFieldGoal?: number | null;
  extraPointsMade?: number | null;
  extraPointsAttempted?: number | null;
  punts?: number | null;
  puntYards?: number | null;
  longestPunt?: number | null;
  puntReturns?: number | null;
  puntReturnYards?: number | null;
  puntReturnTouchdowns?: number | null;
  kickReturns?: number | null;
  kickReturnYards?: number | null;
  kickReturnTouchdowns?: number | null;
}

/**
 * Per-player special teams statistics data for bulk save (gameId is at parent level).
 * Independent interface mirroring schema — not derived from SaveFootballSpecialTeamsStatsInput.
 */
export interface SaveFootballSpecialTeamsStatsData {
  playerId: number;
  fieldGoalsMade?: number | null;
  fieldGoalsAttempted?: number | null;
  longestFieldGoal?: number | null;
  extraPointsMade?: number | null;
  extraPointsAttempted?: number | null;
  punts?: number | null;
  puntYards?: number | null;
  longestPunt?: number | null;
  puntReturns?: number | null;
  puntReturnYards?: number | null;
  puntReturnTouchdowns?: number | null;
  kickReturns?: number | null;
  kickReturnYards?: number | null;
  kickReturnTouchdowns?: number | null;
}
