/** Follow state for the viewer relative to a user profile */
export interface FollowRelationship {
  viewerFollowsUser: boolean;
  userFollowsViewer: boolean;
  viewerSentFollowRequest: { id: string } | null;
}

/** Discriminated union for follow state change callbacks */
export type FollowStateChange =
  | { type: "followed" }
  | { type: "requested"; requestId: string }
  | { type: "unfollowed" }
  | { type: "cancelled" };

export function isMutualFollow(rel: FollowRelationship): boolean {
  return rel.viewerFollowsUser && rel.userFollowsViewer;
}
