import { TEST_BACKEND_USER_ID, TEST_USER } from "../auth.fixture";

export function mockUserResponse(overrides?: Record<string, unknown>) {
  return {
    data: {
      user: {
        id: 2,
        username: "otheruser",
        firstName: "Other",
        lastName: "User",
        displayName: "Other User",
        biography: "Another user",
        profilePicture: null,
        player: { id: "other-player-id", age: 30, height: 68, weight: 170 },
        followerCount: 0,
        followingCount: 0,
        viewerFollowsUser: null,
        userFollowsViewer: null,
        viewerSentFollowRequest: null,
        ...overrides,
      },
    },
  };
}

export function mockUserNotFoundResponse() {
  return { data: { user: null } };
}

export function mockOwnUserResponse() {
  return mockUserResponse({
    id: TEST_BACKEND_USER_ID,
    username: TEST_USER.username,
    firstName: "Test",
    lastName: "User",
    displayName: TEST_USER.name,
    biography: "A test user biography",
  });
}
