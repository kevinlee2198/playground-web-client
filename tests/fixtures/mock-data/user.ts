import { TEST_USER } from "../auth.fixture";

export function mockUserResponse(overrides?: Record<string, unknown>) {
  return {
    data: {
      user: {
        id: "other-user-id",
        username: "otheruser",
        firstName: "Other",
        lastName: "User",
        displayName: "Other User",
        biography: "Another user",
        profilePicture: null,
        player: { id: "other-player-id", age: 30, height: 68, weight: 170 },
        friendship: null,
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
    id: TEST_USER.id,
    username: TEST_USER.username,
    firstName: "Test",
    lastName: "User",
    displayName: TEST_USER.name,
    biography: "A test user biography",
  });
}
