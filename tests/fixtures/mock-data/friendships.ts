import { buildConnection, emptyConnection } from "./connection";

const defaultBlockedUser = {
  id: "friendship-1",
  status: "BLOCKED",
  requester: {
    id: "test-user-id",
    displayName: "Test User",
    firstName: "Test",
    lastName: "User",
  },
  addressee: {
    id: "blocked-user-id",
    displayName: "Blocked User",
    firstName: "Blocked",
    lastName: "User",
  },
};

export function mockBlockedUsersResponse(users?: Record<string, unknown>[]) {
  return {
    data: {
      friendships: buildConnection(users ?? [defaultBlockedUser]),
    },
  };
}

export function mockEmptyBlockedResponse() {
  return { data: { friendships: emptyConnection() } };
}
