import type { GameStatus, SportSubtype, SportType } from "@/lib/constants";
import type { Edge, PageInfo } from "@/lib/graphql-connection";

/**
 * Player reference used in game participants
 */
export interface PlayerRef {
  id: number;
  firstName: string;
  lastName: string;
}

/**
 * Team instance participant in a game (basic info)
 */
export interface TeamInstanceNode {
  __typename: "TeamInstance";
  id: number;
  name: string;
  players: PlayerRef[];
}

/**
 * Team instance with full details (for game detail page)
 */
export interface TeamInstanceDetail {
  __typename: "TeamInstance";
  id: number;
  name: string;
  description: string | null;
  players: PlayerRef[];
  attributes: Record<string, unknown>;
}

/**
 * Individual participant in a game (e.g., tennis singles)
 */
export interface IndividualParticipantNode {
  __typename: "IndividualParticipant";
  id: number;
  player: PlayerRef;
}

/**
 * Union type for game participants (basic)
 */
export type GameParticipant = TeamInstanceNode | IndividualParticipantNode;

/**
 * Union type for game participants with full details
 */
export type GameParticipantDetail = TeamInstanceDetail | IndividualParticipantNode;

/**
 * Game node returned from GraphQL queries
 */
export interface GameNode {
  id: number;
  startDate: string;
  endDate: string | null;
  sportType: SportType;
  sportSubtype: SportSubtype;
  gameStatus: GameStatus;
  participants: {
    edges: Edge<GameParticipant>[];
  };
}

/**
 * Full game detail with participants connection
 */
export interface GameDetail {
  id: number;
  startDate: string;
  endDate: string | null;
  sportType: SportType;
  sportSubtype: SportSubtype;
  gameStatus: GameStatus;
  participants: {
    edges: Edge<GameParticipantDetail>[];
    pageInfo: PageInfo;
  };
}

/**
 * Input for creating a game
 */
export interface CreateGameInput {
  sportType: SportType;
  subtype: SportSubtype;
  startDate: string; // ISO date string
}

/**
 * Input for updating a game
 */
export interface UpdateGameInput {
  id: number;
  startDate?: string;
}

/**
 * Input for adding a team to a game
 */
export interface AddTeamInput {
  gameId: number;
  name: string;
  description?: string;
  playerIds?: number[];
  attributes?: Record<string, unknown>;
}

/**
 * Input for adding an individual participant to a game
 */
export interface AddIndividualParticipantInput {
  gameId: number;
  playerId: number;
}

/**
 * Input for updating a team participant.
 * Patch semantics: omit a field (undefined) to leave it unchanged.
 * Null is treated the same as omission (no way to clear fields to null).
 */
export interface UpdateTeamParticipantInput {
  teamInstanceId: number;
  name?: string;
  description?: string;
  playerIds?: number[];
  attributes?: Record<string, unknown>;
}

/**
 * Input for removing a team instance from a game
 */
export interface RemoveTeamInstanceInput {
  teamInstanceId: number;
}

/**
 * Input for removing an individual participant from a game
 */
export interface RemoveIndividualParticipantInput {
  gameId: number;
  playerId: number;
}

/**
 * Input for joining a team (adding a player to an existing team).
 * Requires a dedicated backend mutation to avoid race conditions
 * with concurrent joins via full playerIds replacement.
 */
export interface JoinTeamInput {
  teamInstanceId: number;
  playerId: number;
}

/**
 * Input for leaving a team (removing a player from an existing team).
 * Requires a dedicated backend mutation to avoid race conditions
 * with concurrent leaves via full playerIds replacement.
 */
export interface LeaveTeamInput {
  teamInstanceId: number;
  playerId: number;
}

/**
 * Result from participant mutation actions
 */
export interface ParticipantActionResult {
  success: boolean;
  participantId?: number;
  error?: string;
}

/**
 * Filter input for game list
 */
export interface GameFilterParams {
  startAfter?: string;
  startBefore?: string;
  endAfter?: string;
  endBefore?: string;
  sportType?: SportType;
  playerId?: number;
  gameStatus?: GameStatus;
  createdBy?: string; // Use createdBy instead of ownerId per backend schema
}

/**
 * Sort input for game list
 */
export interface GameSortParams {
  field: "START_DATE" | "GAME_STATUS";
  direction: "ASC" | "DESC";
}
