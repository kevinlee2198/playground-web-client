import {
  type GameRole,
  type GameSortField,
  type GameStatus,
  type GameVisibility,
  type SortDirection,
  SportSubtype,
  SportType,
} from "@/lib/constants";
import type { Edge, PageInfo } from "@/lib/graphql-connection";
import type { Location } from "@/lib/types/location";

/**
 * Player reference used in game participants
 */
export interface PlayerRef {
  id: number;
  firstName: string;
  lastName: string;
}

// ---------- Game Metadata (response types -- fields are T | null for nullable) ----------

export interface BasketballGameMetadata {
  __typename: "BasketballGameMetadata";
  basketballSubtype: SportSubtype.FIVE_ON_FIVE | SportSubtype.THREE_ON_THREE;
  periods: number | null;
}

export interface TennisGameMetadata {
  __typename: "TennisGameMetadata";
  tennisSubtype: SportSubtype.SINGLES | SportSubtype.DOUBLES;
  bestOf: number;
  tiebreakFinalSet: boolean;
}

export interface FootballGameMetadata {
  __typename: "FootballGameMetadata";
  footballSubtype: SportSubtype.FLAG_FOOTBALL | SportSubtype.AMERICAN_FOOTBALL;
  periods: number | null;
}

export type GameMetadata =
  | BasketballGameMetadata
  | TennisGameMetadata
  | FootballGameMetadata;

// ---------- Participant Metadata (response types) ----------

export interface BasketballParticipantMetadata {
  __typename: "BasketballParticipantMetadata";
  score: number;
}

export interface TennisSetScore {
  gamesWon: number;
  tiebreakPoints: number | null;
}

export interface TennisParticipantMetadata {
  __typename: "TennisParticipantMetadata";
  setsWon: number;
  sets: TennisSetScore[];
}

export interface FootballParticipantMetadata {
  __typename: "FootballParticipantMetadata";
  score: number;
}

export type ParticipantMetadata =
  | BasketballParticipantMetadata
  | TennisParticipantMetadata
  | FootballParticipantMetadata;

/**
 * Team instance participant in a game (basic info)
 */
export interface TeamInstanceNode {
  __typename: "TeamInstance";
  id: number;
  name: string;
  players: PlayerRef[];
  metadata: ParticipantMetadata | null;
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
  metadata: ParticipantMetadata | null;
}

/**
 * Individual participant in a game (e.g., tennis singles)
 */
export interface IndividualParticipantNode {
  __typename: "IndividualParticipant";
  id: number;
  player: PlayerRef;
  metadata: ParticipantMetadata | null;
}

/**
 * Union type for game participants (basic)
 */
export type GameParticipant = TeamInstanceNode | IndividualParticipantNode;

/**
 * Union type for game participants with full details
 */
export type GameParticipantDetail =
  | TeamInstanceDetail
  | IndividualParticipantNode;

/**
 * Game node returned from GraphQL queries
 */
export interface GameNode {
  id: number;
  startDate: string;
  endDate: string | null;
  sportType: SportType;
  metadata: GameMetadata;
  gameStatus: GameStatus;
  viewerGameRole: GameRole | null;
  visibility: GameVisibility;
  location: {
    name: string | null;
    address: {
      city: string;
      state: string;
      country: string;
    };
  } | null;
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
  metadata: GameMetadata;
  gameStatus: GameStatus;
  viewerGameRole: GameRole | null;
  visibility: GameVisibility;
  location: Location | null;
  participants: {
    edges: Edge<GameParticipantDetail>[];
    pageInfo: PageInfo;
  };
  media: {
    edges: Edge<import("@/lib/types/resource").Resource>[];
    pageInfo: PageInfo;
  };
}

/**
 * Input for creating a basketball game
 */
export interface CreateBasketballGameInput {
  sportType: SportType.BASKETBALL;
  startDate: string;
  location?: {
    address: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country: string;
    };
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  metadata: {
    subtype: SportSubtype.FIVE_ON_FIVE | SportSubtype.THREE_ON_THREE;
    periods?: number;
  };
}

/**
 * Input for creating a tennis game
 */
export interface CreateTennisGameInput {
  sportType: SportType.TENNIS;
  startDate: string;
  location?: {
    address: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country: string;
    };
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  metadata: {
    subtype: SportSubtype.SINGLES | SportSubtype.DOUBLES;
    bestOf?: number;
    tiebreakFinalSet?: boolean;
  };
}

/**
 * Input for creating a football game
 */
export interface CreateFootballGameInput {
  sportType: SportType.FOOTBALL;
  startDate: string;
  location?: {
    address: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country: string;
    };
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  metadata: {
    subtype: SportSubtype.FLAG_FOOTBALL | SportSubtype.AMERICAN_FOOTBALL;
    periods?: number;
  };
}

/**
 * Union type for creating a game
 */
export type CreateGameInput =
  | CreateBasketballGameInput
  | CreateTennisGameInput
  | CreateFootballGameInput;

/**
 * Input for updating a game
 */
export interface UpdateGameInput {
  id: number;
  startDate?: string;
  /**
   * PATCH semantics for location:
   * - undefined (omit): no change
   * - null: clear the location
   * - object: set/update the location
   */
  location?: {
    address: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country: string;
    };
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  } | null;
  metadata?: {
    basketball?: {
      subtype?: SportSubtype.FIVE_ON_FIVE | SportSubtype.THREE_ON_THREE;
      periods?: number;
    };
    tennis?: {
      subtype?: SportSubtype.SINGLES | SportSubtype.DOUBLES;
      bestOf?: number;
      tiebreakFinalSet?: boolean;
    };
    football?: {
      subtype?: SportSubtype.FLAG_FOOTBALL | SportSubtype.AMERICAN_FOOTBALL;
      periods?: number;
    };
  };
}

/**
 * Input for adding a team to a game
 */
export interface AddTeamInput {
  gameId: number;
  name: string;
  description?: string;
  playerIds?: number[];
}

/**
 * Input for adding an individual participant to a game
 */
export interface AddIndividualParticipantInput {
  gameId: number;
  playerId: number;
}

// ---------- Participant Metadata Input (@oneOf -- exactly one key) ----------

export interface ParticipantMetadataInput {
  basketball?: { score: number };
  tennis?: {
    setsWon: number;
    sets: { gamesWon: number; tiebreakPoints?: number }[];
  };
  football?: { score: number };
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
  metadata?: ParticipantMetadataInput;
}

/**
 * Entry for updating participant scores (for scoreboard bulk save)
 */
export interface UpdateParticipantScoreEntry {
  id: number;
  isTeam: boolean;
  metadata: ParticipantMetadataInput;
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
  errorType?: string;
  message?: string;
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
  organizedByMe?: boolean;
}

/**
 * Sort input for game list
 */
export interface GameSortParams {
  field: GameSortField;
  direction: SortDirection;
}
