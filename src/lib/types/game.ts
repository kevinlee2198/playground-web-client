import type { GameStatus, SportSubtype, SportType } from "@/lib/constants";
import type { Edge } from "@/lib/graphql-connection";

/**
 * Player reference used in game participants
 */
export interface PlayerRef {
  id: string;
  firstName: string;
  lastName: string;
}

/**
 * Team instance participant in a game
 */
export interface TeamInstanceNode {
  __typename: "TeamInstance";
  id: string;
  name: string;
  players: PlayerRef[];
}

/**
 * Individual participant in a game (e.g., tennis singles)
 */
export interface IndividualParticipantNode {
  __typename: "IndividualParticipant";
  id: string;
  player: PlayerRef | null;
}

/**
 * Union type for game participants
 */
export type GameParticipant = TeamInstanceNode | IndividualParticipantNode;

/**
 * Game node returned from GraphQL queries
 */
export interface GameNode {
  id: string;
  startDate: string;
  endDate?: string | null;
  sportType: SportType;
  sportSubtype: SportSubtype;
  gameStatus: GameStatus;
  participants: {
    edges: Edge<GameParticipant>[];
  };
}
