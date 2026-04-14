import { FOLLOW_REQUESTER_USER_ID, OTHER_USER_ID } from "../test-ids";
import { buildConnection, emptyConnection } from "./connection";

export function mockFollowRequest(overrides?: Record<string, unknown>) {
  return {
    id: "follow-req-1",
    requester: {
      id: FOLLOW_REQUESTER_USER_ID,
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

export function mockFollowUserResponse() {
  return {
    data: {
      followUser: {
        __typename: "FollowUserResponse",
        user: {
          id: OTHER_USER_ID,
          viewerFollowsUser: true,
          userFollowsViewer: false,
          viewerSentFollowRequest: null,
          followerCount: 1,
          followingCount: 0,
        },
      },
    },
  };
}

export function mockFollowRequestSentResponse() {
  return {
    data: {
      followUser: {
        __typename: "FollowRequestSentResponse",
        followRequest: {
          id: "follow-req-new",
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
