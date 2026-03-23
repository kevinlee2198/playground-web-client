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
    const mockBlockedUsers = {
      edges: [
        {
          cursor: "c1",
          node: {
            id: "u2",
            displayName: "Bob Jones",
            username: "bob",
          },
        },
      ],
      pageInfo: { hasNextPage: false, endCursor: "c1" },
    };
    mockQuerySuccess({ blockedUsers: mockBlockedUsers });

    const result = await loadBlockedUsers(10);

    expect(result).toEqual(mockBlockedUsers);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("passes pagination cursor when after is provided", async () => {
    mockQuerySuccess({ blockedUsers: emptyConnection });

    await loadBlockedUsers(10, "cursor456");

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const blockedUsersArgs = (
      callArg.blockedUsers as { __args: Record<string, unknown> }
    ).__args;
    expect(blockedUsersArgs).toHaveProperty("after", "cursor456");
    expect(blockedUsersArgs).toHaveProperty("first", 10);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("omits after from args when not provided", async () => {
    mockQuerySuccess({ blockedUsers: emptyConnection });

    await loadBlockedUsers(10);

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const blockedUsersArgs = (
      callArg.blockedUsers as { __args: Record<string, unknown> }
    ).__args;
    expect(blockedUsersArgs).not.toHaveProperty("after");
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
