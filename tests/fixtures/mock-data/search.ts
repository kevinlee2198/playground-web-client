import { buildConnection, emptyConnection } from "./connection";

const defaultUser = {
  id: "search-user-1",
  username: "founduser",
  displayName: "Found User",
  profilePicture: null,
};

export function mockSearchUsersResponse(users?: Record<string, unknown>[]) {
  return {
    data: {
      users: buildConnection(users ?? [defaultUser]),
    },
  };
}

export function mockEmptySearchResponse() {
  return { data: { users: emptyConnection() } };
}
