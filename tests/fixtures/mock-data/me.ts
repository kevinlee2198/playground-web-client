import { TEST_USER, TEST_PLAYER_ID } from "../auth.fixture";

export function mockMeResponse(overrides?: Record<string, unknown>) {
  return {
    data: {
      me: {
        id: TEST_USER.id,
        username: TEST_USER.username,
        firstName: "Test",
        lastName: "User",
        displayName: TEST_USER.name,
        email: TEST_USER.email,
        biography: "A test user biography",
        profilePicture: null,
        player: { id: TEST_PLAYER_ID, age: 25, height: 72, weight: 180 },
        ...overrides,
      },
    },
  };
}
