/** Follow state for the viewer relative to a user profile */
export interface FollowRelationship {
  viewerFollowsUser: boolean;
  userFollowsViewer: boolean;
}

export function isMutualFollow(rel: FollowRelationship): boolean {
  return rel.viewerFollowsUser && rel.userFollowsViewer;
}

/**
 * A Follow edge node as returned by the followers/following FollowConnection.
 * The `Follow` type in the schema has nested `follower: User!` and `following: User!`.
 * For the followers query, the user to display is `node.follower`.
 * For the following query, the user to display is `node.following`.
 */
export interface FollowNode {
  id: string;
  follower: FollowUserRef;
  following: FollowUserRef;
  createdDate: string;
}

/** A user reference nested inside a Follow node */
export interface FollowUserRef {
  id: string;
  username: string;
  displayName: string;
  profilePicture: {
    __typename: "ImageResource";
    thumbnailUrl: string | null;
  } | null;
  /** Whether the viewer follows this user (null when unauthenticated) */
  viewerFollowsUser: boolean | null;
  /** Whether this user follows the viewer (null when unauthenticated) */
  userFollowsViewer: boolean | null;
}

/** Input for follow/unfollow/removeFollower mutations */
export interface FollowUserInput {
  userId: string;
}

/** Updated user counts returned after follow/unfollow mutations */
export interface FollowUserState {
  id: string;
  viewerFollowsUser: boolean;
  userFollowsViewer: boolean;
  followerCount: number;
  followingCount: number;
}

/** Response from the followUser mutation */
export interface FollowUserResponse {
  user: FollowUserState;
}

/** Response from the unfollowUser mutation */
export interface UnfollowUserResponse {
  user: FollowUserState;
  wasMutualFollow: boolean;
}

/** Response from the blockUser mutation */
export interface BlockUserResponse {
  userId: string;
}

/** Response from the unblockUser mutation */
export interface UnblockUserResponse {
  userId: string;
}

/** Response from the removeFollower mutation */
export interface RemoveFollowerResponse {
  userId: string;
}
