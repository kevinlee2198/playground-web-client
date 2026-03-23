/** A user as returned from the searchUsers query */
export interface UserSearchNode {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  /** null when unauthenticated */
  viewerFollowsUser: boolean | null;
  userFollowsViewer: boolean | null;
}

/** Result shape returned by the searchUsers server action */
export interface SearchUsersResult {
  success: boolean;
  edges: UserSearchEdge[] | null;
  pageInfo: SearchPageInfo | null;
  error: string | null;
}

export interface UserSearchEdge {
  cursor: string;
  node: UserSearchNode;
}

export interface SearchPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}
