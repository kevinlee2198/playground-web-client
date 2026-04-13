import { buildConnection, emptyConnection } from "./connection";

const defaultBlockedUser = {
  id: 3,
  displayName: "Blocked User",
  username: "blockeduser",
};

export function mockBlockedUsersResponse(users?: Record<string, unknown>[]) {
  return {
    data: {
      blockedUsers: buildConnection(users ?? [defaultBlockedUser]),
    },
  };
}

export function mockEmptyBlockedResponse() {
  return { data: { blockedUsers: emptyConnection() } };
}
