import { buildConnection, emptyConnection } from "./connection";

// Follow request for the incoming requests list
export function mockFollowRequest(overrides?: Record<string, unknown>) {
  return {
    id: "follow-req-1",
    requester: {
      id: "requester-user-id",
      username: "requesteruser",
      displayName: "Requester User",
      profilePicture: null,
    },
    createdDate: new Date().toISOString(),
    ...overrides,
  };
}

export function mockFollowRequestsResponse(requests?: Record<string, unknown>[]) {
  const nodes = requests ?? [mockFollowRequest()];
  return { data: { followRequests: buildConnection(nodes) } };
}

export function mockEmptyFollowRequestsResponse() {
  return { data: { followRequests: emptyConnection() } };
}

// Follow user mutation responses
export function mockFollowUserResponse(overrides?: Record<string, unknown>) {
  return {
    data: {
      followUser: {
        __typename: "FollowUserResponse",
        user: {
          id: "other-user-id",
          viewerFollowsUser: true,
          userFollowsViewer: false,
          viewerSentFollowRequest: null,
          followerCount: 1,
          followingCount: 0,
          ...overrides,
        },
      },
    },
  };
}

export function mockFollowRequestSentResponse(overrides?: Record<string, unknown>) {
  return {
    data: {
      followUser: {
        __typename: "FollowRequestSentResponse",
        followRequest: {
          id: "follow-req-new",
          ...overrides,
        },
      },
    },
  };
}

export function mockCancelFollowRequestResponse() {
  return {
    data: {
      cancelFollowRequest: {
        __typename: "CancelFollowRequestResponse",
        id: "follow-req-1",
      },
    },
  };
}

export function mockApproveFollowRequestResponse() {
  return {
    data: {
      approveFollowRequest: {
        __typename: "ApproveFollowRequestResponse",
        follow: { id: "follow-1" },
      },
    },
  };
}

export function mockDeclineFollowRequestResponse() {
  return {
    data: {
      declineFollowRequest: {
        __typename: "DeclineFollowRequestResponse",
        id: "follow-req-1",
      },
    },
  };
}
