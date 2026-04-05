import {
  type GameRole,
  type GameSortField,
  type GameStatus,
  type GameVisibility,
  type PickleballScoringType,
  type SortDirection,
  type StatEntryMode,
  SportFormat,
  SportType,
} from "@/lib/constants";
import type { Edge, PageInfo } from "@/lib/graphql-connection";
import type { GameMediaNode } from "@/lib/types/game-media";
import type { ViewerGameInvitation } from "@/lib/types/game-invitation";
import type { Location } from "@/lib/types/location";

/**
 * Input for location-based game search.
 * Coordinates define the search center; radiusMeters defines the search area.
 * The backend uses ST_DWithin with these values.
 */
export interface NearLocationInput {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

/**
 * Game edge with optional distance from search center.
 * Distance is present only when the nearLocation filter was used.
 * Returned in meters — frontend converts to mi/km for display.
 * Defined as an intersection type so it stays in sync if Edge<T> changes.
 */
export type GameEdgeWithDistance = Edge<GameNode> & {
  distance: number | null;
};

/**
 * Player reference used in game participants
 */
export interface PlayerRef {
  id: number;
  user: {
    displayName: string;
    username: string;
    profilePicture: {
      __typename: "ImageResource";
      thumbnailUrl: string | null;
    } | null;
  };
}

// ---------- Game Metadata (response types -- fields are T | null for nullable) ----------

export interface BaseballGameMetadata {
  __typename: "BaseballGameMetadata";
  innings: number | null;
}

export interface BaseballParticipantMetadata {
  __typename: "BaseballParticipantMetadata";
  score: number;
}

export interface BasketballGameMetadata {
  __typename: "BasketballGameMetadata";
  basketballFormat: SportFormat.FIVE_ON_FIVE | SportFormat.THREE_ON_THREE;
  periods: number | null;
}

export interface TennisGameMetadata {
  __typename: "TennisGameMetadata";
  tennisFormat: SportFormat.SINGLES | SportFormat.DOUBLES;
  tennisBestOf: number;
  tiebreakFinalSet: boolean;
}

export interface FootballGameMetadata {
  __typename: "FootballGameMetadata";
  footballFormat: SportFormat.FLAG_FOOTBALL | SportFormat.AMERICAN_FOOTBALL;
  periods: number | null;
}

export interface PickleballGameMetadata {
  __typename: "PickleballGameMetadata";
  pickleballFormat: SportFormat.SINGLES | SportFormat.DOUBLES;
  pickleballBestOf: number | null;
  pointsPerGame: number | null;
  winByTwo: boolean | null;
  scoringType: PickleballScoringType | null;
}

export interface VolleyballGameMetadata {
  __typename: "VolleyballGameMetadata";
  volleyballFormat: SportFormat.INDOOR | SportFormat.BEACH;
  volleyballBestOf: number | null;
  pointsPerSet: number | null;
  pointsPerFinalSet: number | null;
  winByTwo: boolean | null;
}

export type GameMetadata =
  | BaseballGameMetadata
  | BasketballGameMetadata
  | TennisGameMetadata
  | FootballGameMetadata
  | PickleballGameMetadata
  | VolleyballGameMetadata;

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

export interface PickleballGameScore {
  pointsScored: number;
}

export interface PickleballParticipantMetadata {
  __typename: "PickleballParticipantMetadata";
  gamesWon: number;
  games: PickleballGameScore[];
}

export interface VolleyballSetScore {
  pointsScored: number;
}

export interface VolleyballParticipantMetadata {
  __typename: "VolleyballParticipantMetadata";
  setsWon: number;
  sets: VolleyballSetScore[];
}

export type ParticipantMetadata =
  | BaseballParticipantMetadata
  | BasketballParticipantMetadata
  | TennisParticipantMetadata
  | FootballParticipantMetadata
  | PickleballParticipantMetadata
  | VolleyballParticipantMetadata;

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
 * User reference within a game member
 */
export interface GameMemberUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  username: string;
}

/**
 * Game member (owner or editor) returned from the members connection
 */
export interface GameMember {
  id: string;
  user: GameMemberUser;
  role: GameRole;
}

/**
 * Game node returned from GraphQL queries
 */
export interface GameNode {
  id: number;
  description: string | null;
  startDate: string;
  endDate: string | null;
  sportType: SportType;
  metadata: GameMetadata;
  gameStatus: GameStatus;
  viewerGameRole: GameRole | null;
  visibility: GameVisibility;
  statEntryMode: StatEntryMode;
  viewerInvitation: ViewerGameInvitation | null;
  location: {
    name: string | null;
    address: {
      city: string;
      state: string | null;
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
  description: string | null;
  startDate: string;
  endDate: string | null;
  sportType: SportType;
  metadata: GameMetadata;
  gameStatus: GameStatus;
  viewerGameRole: GameRole | null;
  visibility: GameVisibility;
  statEntryMode: StatEntryMode;
  viewerInvitation: ViewerGameInvitation | null;
  location: Location | null;
  participants: {
    edges: Edge<GameParticipantDetail>[];
    pageInfo: PageInfo;
  };
  media: {
    edges: Edge<GameMediaNode>[];
    pageInfo: PageInfo;
  };
}

/**
 * Input for creating a baseball game
 */
export interface CreateBaseballGameInput {
  sportType: SportType.BASEBALL;
  startDate: string;
  description?: string;
  location?: {
    address: {
      street?: string;
      city: string;
      state?: string;
      postalCode?: string;
      country: string;
    };
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  visibility?: GameVisibility;
  statEntryMode?: StatEntryMode;
  metadata: {
    innings?: number;
  };
}

/**
 * Input for creating a basketball game
 */
export interface CreateBasketballGameInput {
  sportType: SportType.BASKETBALL;
  startDate: string;
  description?: string;
  location?: {
    address: {
      street?: string;
      city: string;
      state?: string;
      postalCode?: string;
      country: string;
    };
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  visibility?: GameVisibility;
  statEntryMode?: StatEntryMode;
  metadata: {
    format: SportFormat.FIVE_ON_FIVE | SportFormat.THREE_ON_THREE;
    periods?: number;
  };
}

/**
 * Input for creating a tennis game
 */
export interface CreateTennisGameInput {
  sportType: SportType.TENNIS;
  startDate: string;
  description?: string;
  location?: {
    address: {
      street?: string;
      city: string;
      state?: string;
      postalCode?: string;
      country: string;
    };
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  visibility?: GameVisibility;
  statEntryMode?: StatEntryMode;
  metadata: {
    format: SportFormat.SINGLES | SportFormat.DOUBLES;
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
  description?: string;
  location?: {
    address: {
      street?: string;
      city: string;
      state?: string;
      postalCode?: string;
      country: string;
    };
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  visibility?: GameVisibility;
  statEntryMode?: StatEntryMode;
  metadata: {
    format: SportFormat.FLAG_FOOTBALL | SportFormat.AMERICAN_FOOTBALL;
    periods?: number;
  };
}

/**
 * Input for creating a pickleball game
 */
export interface CreatePickleballGameInput {
  sportType: SportType.PICKLEBALL;
  startDate: string;
  description?: string;
  location?: {
    address: {
      street?: string;
      city: string;
      state?: string;
      postalCode?: string;
      country: string;
    };
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  visibility?: GameVisibility;
  statEntryMode?: StatEntryMode;
  metadata: {
    format: SportFormat.SINGLES | SportFormat.DOUBLES;
    bestOf?: number;
    pointsPerGame?: number;
    winByTwo?: boolean;
    scoringType?: PickleballScoringType;
  };
}

/**
 * Input for creating a volleyball game
 */
export interface CreateVolleyballGameInput {
  sportType: SportType.VOLLEYBALL;
  startDate: string;
  description?: string;
  location?: {
    address: {
      street?: string;
      city: string;
      state?: string;
      postalCode?: string;
      country: string;
    };
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  visibility?: GameVisibility;
  statEntryMode?: StatEntryMode;
  metadata: {
    format: SportFormat.INDOOR | SportFormat.BEACH;
    bestOf?: number;
    pointsPerSet?: number;
    pointsPerFinalSet?: number;
    winByTwo?: boolean;
  };
}

/**
 * Union type for creating a game
 */
export type CreateGameInput =
  | CreateBaseballGameInput
  | CreateBasketballGameInput
  | CreateTennisGameInput
  | CreateFootballGameInput
  | CreatePickleballGameInput
  | CreateVolleyballGameInput;

/**
 * Input for updating a game
 */
export interface UpdateGameInput {
  id: number;
  description?: string | null;
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
      city: string;
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
    baseball?: {
      innings?: number;
    };
    basketball?: {
      format?: SportFormat.FIVE_ON_FIVE | SportFormat.THREE_ON_THREE;
      periods?: number;
    };
    tennis?: {
      format?: SportFormat.SINGLES | SportFormat.DOUBLES;
      bestOf?: number;
      tiebreakFinalSet?: boolean;
    };
    football?: {
      format?: SportFormat.FLAG_FOOTBALL | SportFormat.AMERICAN_FOOTBALL;
      periods?: number;
    };
    pickleball?: {
      format?: SportFormat.SINGLES | SportFormat.DOUBLES;
      bestOf?: number;
      pointsPerGame?: number;
      winByTwo?: boolean;
      scoringType?: PickleballScoringType;
    };
    volleyball?: {
      format?: SportFormat.INDOOR | SportFormat.BEACH;
      bestOf?: number;
      pointsPerSet?: number;
      pointsPerFinalSet?: number;
      winByTwo?: boolean;
    };
  };
  visibility?: GameVisibility;
  statEntryMode?: StatEntryMode;
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
  baseball?: { score: number };
  basketball?: { score: number };
  tennis?: {
    setsWon: number;
    sets: { gamesWon: number; tiebreakPoints?: number | null }[];
  };
  football?: { score: number };
  pickleball?: {
    gamesWon: number;
    games: { pointsScored: number }[];
  };
  volleyball?: {
    setsWon: number;
    sets: { pointsScored: number }[];
  };
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
  id: number;
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
  invitedToMe?: boolean;
  myGames?: boolean;
  nearLocation?: NearLocationInput;
}

/**
 * Sort input for game list
 */
export interface GameSortParams {
  field: GameSortField;
  direction: SortDirection;
}
