import type { GameStatus, SportType } from "@/lib/constants";
import type { Edge, PageInfo } from "@/lib/graphql-connection";
import type { GameMetadata, GameParticipant } from "@/lib/types/game";

/**
 * Minimal user info nested inside a Player for feed display.
 */
export interface FeedPlayerUser {
  id: string;
  displayName: string;
  profilePicture: FeedProfilePicture | null;
}

/**
 * Profile picture for feed display.
 * We only need the thumbnailUrl for the avatar.
 */
export interface FeedProfilePicture {
  __typename: "ImageResource";
  thumbnailUrl: string | null;
}

/**
 * Player node returned within viewerFriendPlayers.
 * Includes a user reference since Player implements HasUser in the schema.
 */
export interface FeedPlayerNode {
  id: number;
  firstName: string;
  lastName: string;
  user: FeedPlayerUser;
}

/**
 * The viewer's friends who are players in a game.
 * nodes is capped by the server.
 */
export interface ViewerFriendPlayers {
  nodes: FeedPlayerNode[];
  totalCount: number;
}

/**
 * Location info for feed cards.
 */
export interface FeedLocation {
  name: string | null;
  address: {
    city: string;
    state: string;
    country: string;
  };
}

/**
 * Game node returned from the friendsActivityFeed query.
 * A separate type from GameNode — includes location and viewerFriendPlayers.
 */
export interface FeedGameNode {
  id: number;
  startDate: string;
  endDate: string | null;
  sportType: SportType;
  metadata: GameMetadata;
  gameStatus: GameStatus;
  location: FeedLocation | null;
  participants: {
    edges: Edge<GameParticipant>[];
  };
  viewerFriendPlayers: ViewerFriendPlayers;
}

/**
 * The shape returned by the loadFeedGames server action.
 */
export interface FeedGamesResult {
  edges: Edge<FeedGameNode>[];
  pageInfo: PageInfo;
}
