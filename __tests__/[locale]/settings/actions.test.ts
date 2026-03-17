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
import { loadBlockedUsers } from "@/app/[locale]/settings/actions";

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
// loadBlockedUsers
// ---------------------------------------------------------------------------

describe("loadBlockedUsers", () => {
  beforeEach(() => vi.clearAllMocks());

  const emptyConnection = {
    edges: [],
    pageInfo: { hasNextPage: false, endCursor: null },
  };

  it("returns edges and pageInfo on success", async () => {
    const mockFriendships = {
      edges: [
        {
          cursor: "c1",
          node: {
            id: "f1",
            requester: { id: "u1", username: "alice", firstName: "Alice", lastName: "Smith" },
            addressee: { id: "u2", username: "bob", firstName: "Bob", lastName: "Jones" },
          },
        },
      ],
      pageInfo: { hasNextPage: false, endCursor: "c1" },
    };
    mockQuerySuccess({ friendships: mockFriendships });

    const result = await loadBlockedUsers(10);

    expect(result).toEqual(mockFriendships);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("passes pagination cursor when after is provided", async () => {
    mockQuerySuccess({ friendships: emptyConnection });

    await loadBlockedUsers(10, "cursor456");

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const friendshipsArgs = (
      callArg.friendships as { __args: Record<string, unknown> }
    ).__args;
    expect(friendshipsArgs).toHaveProperty("after", "cursor456");
    expect(friendshipsArgs).toHaveProperty("first", 10);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("omits after from args when not provided", async () => {
    mockQuerySuccess({ friendships: emptyConnection });

    await loadBlockedUsers(10);

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const friendshipsArgs = (
      callArg.friendships as { __args: Record<string, unknown> }
    ).__args;
    expect(friendshipsArgs).not.toHaveProperty("after");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns null on top-level graphql errors", async () => {
    mockAuthQuery.mockResolvedValueOnce({
      data: {},
      errors: [{ message: "Unauthorized" }],
    });

    const result = await loadBlockedUsers(10);

    expect(result).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns null on network error", async () => {
    mockQueryNetworkError();

    const result = await loadBlockedUsers(10);

    expect(result).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
