import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuthQuery } = vi.hoisted(() => ({
  mockAuthQuery: vi.fn(),
}));

vi.mock("@/lib/graphql-request", () => ({
  authQuery: mockAuthQuery,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { loadFeedGames } from "@/app/[locale]/feed/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockQuerySuccess(data: Record<string, unknown>) {
  mockAuthQuery.mockResolvedValueOnce({ data });
}

function mockQueryNetworkError() {
  mockAuthQuery.mockRejectedValueOnce(new Error("Network failure"));
}

// ---------------------------------------------------------------------------
// loadFeedGames
// ---------------------------------------------------------------------------

describe("loadFeedGames", () => {
  beforeEach(() => vi.clearAllMocks());

  const emptyConnection = {
    edges: [],
    pageInfo: { hasNextPage: false, endCursor: null },
  };

  it("returns edges and pageInfo on success", async () => {
    const mockFeed = {
      edges: [
        {
          cursor: "c1",
          node: {
            id: 1,
            startDate: "2025-01-01",
            endDate: null,
            sportType: "BASKETBALL",
            gameStatus: "SCHEDULED",
            resultsFinalized: false,
            viewerGameRole: "PARTICIPANT",
            visibility: "PUBLIC",
            metadata: {},
            location: null,
            participants: { edges: [] },
            viewerFriendPlayers: [],
          },
        },
      ],
      pageInfo: { hasNextPage: false, endCursor: "c1" },
    };
    mockQuerySuccess({ friendsActivityFeed: mockFeed });

    const result = await loadFeedGames();

    expect(result).toEqual(mockFeed);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("passes pagination cursor when after is provided", async () => {
    mockQuerySuccess({ friendsActivityFeed: emptyConnection });

    await loadFeedGames(10, "cursor123");

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const feedArgs = (
      callArg.friendsActivityFeed as { __args: Record<string, unknown> }
    ).__args;
    expect(feedArgs).toHaveProperty("after", "cursor123");
    expect(feedArgs).toHaveProperty("first", 10);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("omits after from args when not provided", async () => {
    mockQuerySuccess({ friendsActivityFeed: emptyConnection });

    await loadFeedGames(10);

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const feedArgs = (
      callArg.friendsActivityFeed as { __args: Record<string, unknown> }
    ).__args;
    expect(feedArgs).not.toHaveProperty("after");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns null on top-level graphql errors", async () => {
    mockAuthQuery.mockResolvedValueOnce({
      data: {},
      errors: [{ message: "Unauthorized" }],
    });

    const result = await loadFeedGames();

    expect(result).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns null on network error", async () => {
    mockQueryNetworkError();

    const result = await loadFeedGames();

    expect(result).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
