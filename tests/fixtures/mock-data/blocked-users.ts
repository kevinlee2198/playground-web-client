import { BLOCKED_USER_ID } from "../test-ids";
import { buildConnection, emptyConnection } from "./connection";

const defaultBlockedUser = {
  id: BLOCKED_USER_ID,
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
