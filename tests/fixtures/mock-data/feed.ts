import { buildConnection, emptyConnection } from "./connection";
import { mockGame } from "./games";

export function mockFeedResponse(games?: Record<string, unknown>[]) {
  const nodes = (games ?? [mockGame()]).map((game) => ({
    ...game,
    viewerFriendPlayers: { nodes: [], totalCount: 0 },
  }));
  return {
    data: {
      friendsActivityFeed: buildConnection(nodes),
    },
  };
}

export function mockEmptyFeedResponse() {
  return { data: { friendsActivityFeed: emptyConnection() } };
}
