/** Follow state for the viewer relative to a user profile */
export interface FollowRelationship {
  viewerFollowsUser: boolean;
  userFollowsViewer: boolean;
}

export function isMutualFollow(rel: FollowRelationship): boolean {
  return rel.viewerFollowsUser && rel.userFollowsViewer;
}
