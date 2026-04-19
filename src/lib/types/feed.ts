import type { GameRole, GameStatus, GameVisibility, SportType, StatEntryMode } from "@/lib/constants";
import type { Edge, PageInfo } from "@/lib/graphql-connection";
import type { GameMetadata, GameParticipant } from "@/lib/types/game";
import type { ViewerGameInvitation } from "@/lib/types/game-invitation";

/**
 * Minimal user info for feed display.
 */
export interface FeedUser {
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
 * The viewer's followed users who are participants in a game.
 * `nodes` is capped by the server at 10.
 */
export interface ViewerFollowingUsers {
  nodes: FeedUser[];
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
 * A separate type from GameNode — includes location and viewerFollowingUsers.
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
  viewerFollowingUsers: ViewerFollowingUsers;
}

/**
 * The shape returned by the loadFeedGames server action.
 */
export interface FeedGamesResult {
  edges: Edge<FeedGameNode>[];
  pageInfo: PageInfo;
}
