import { buildConnection, emptyConnection } from "./connection";

export function mockBlockedUsersResponse(
  users?: Record<string, unknown>[],
) {
  const defaultUsers = [
    {
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
    },
  ];
  return {
    data: {
      friendships: buildConnection(users ?? defaultUsers),
    },
  };
}

export function mockEmptyBlockedResponse() {
  return { data: { friendships: emptyConnection() } };
}
