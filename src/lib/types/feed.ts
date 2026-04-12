import type { GameRole, GameStatus, GameVisibility, SportType, StatEntryMode } from "@/lib/constants";
import type { Edge, PageInfo } from "@/lib/graphql-connection";
import type { GameMetadata, GameParticipant } from "@/lib/types/game";
import type { ViewerGameInvitation } from "@/lib/types/game-invitation";

/**
 * Minimal user info nested inside a Player for feed display.
 */
export interface FeedPlayerUser {
  id: number;
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
 * Player node returned within viewerFollowingPlayers.
 * Includes a user reference since Player implements HasUser in the schema.
 */
export interface FeedPlayerNode {
  id: number;
  user: FeedPlayerUser;
}

/**
 * The viewer's followed users who are players in a game.
 * nodes is capped by the server.
 */
export interface ViewerFollowingPlayers {
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
    state: string | null;
    country: string;
  };
}

/**
 * Game node returned from the followingActivityFeed query.
 * A separate type from GameNode — includes location and viewerFollowingPlayers.
 */
export interface FeedGameNode {
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
  location: FeedLocation | null;
  participants: {
    edges: Edge<GameParticipant>[];
  };
  viewerFollowingPlayers: ViewerFollowingPlayers;
}

/**
 * The shape returned by the loadFeedGames server action.
 */
export interface FeedGamesResult {
  edges: Edge<FeedGameNode>[];
  pageInfo: PageInfo;
}
