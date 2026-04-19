import { TEST_USER } from "../auth.fixture";
import { TEST_BACKEND_USER_ID } from "../test-ids";

export function mockMeResponse(overrides?: Record<string, unknown>) {
  return {
    data: {
      me: {
        id: TEST_BACKEND_USER_ID,
        username: TEST_USER.username,
        firstName: "Test",
        lastName: "User",
        displayName: TEST_USER.name,
        email: TEST_USER.email,
        biography: "A test user biography",
        profilePicture: null,
        preferences: {
          measurementUnit: "METRIC",
          notificationsEnabled: true,
          emailDigestFrequency: "WEEKLY",
          profileVisibility: "PUBLIC",
          showOnlineStatus: true,
          showGameHistory: true,
          showStatistics: true,
          preferredSports: ["BASEBALL", "BASKETBALL"],
        },
        ...overrides,
      },
    },
  };
}
