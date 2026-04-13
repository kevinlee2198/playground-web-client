import { TEST_BACKEND_USER_ID } from "../test-ids";
import { buildConnection, emptyConnection } from "./connection";

const defaultUser = {
  id: TEST_BACKEND_USER_ID,
  username: "founduser",
  firstName: "Found",
  lastName: "User",
  displayName: "Found User",
  profilePicture: null,
};

export function mockSearchUsersResponse(users?: Record<string, unknown>[]) {
  return {
    data: {
      searchUsers: buildConnection(users ?? [defaultUser]),
    },
  };
}

export function mockEmptySearchResponse() {
  return { data: { searchUsers: emptyConnection() } };
}
