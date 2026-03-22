import { buildConnection, emptyConnection } from "./connection";
import { mockGame } from "./games";

export function mockFeedResponse(games?: (Record<string, unknown> & { id?: string })[]) {
  const nodes = (games ?? [mockGame()]).map((game) => ({
    ...game,
    viewerFollowingPlayers: { nodes: [], totalCount: 0 },
  }));
  return {
    data: {
      followingActivityFeed: buildConnection(nodes),
    },
  };
}

export function mockEmptyFeedResponse() {
  return { data: { followingActivityFeed: emptyConnection() } };
}
