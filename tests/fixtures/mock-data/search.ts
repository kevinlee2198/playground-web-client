import { buildConnection, emptyConnection } from "./connection";

const defaultUser = {
  id: 1,
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
