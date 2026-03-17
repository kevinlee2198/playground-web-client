import { describe, it, expect, vi, beforeEach } from "vitest";
import { MutationErrorType } from "@/lib/graphql-result";

const { mockAuthMutate } = vi.hoisted(() => ({
  mockAuthMutate: vi.fn(),
}));

vi.mock("@/lib/graphql-request", () => ({
  authMutate: mockAuthMutate,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import {
  sendFriendRequest,
  acceptFriendRequest,
  blockUser,
  unblockUser,
  updateUser,
  updatePlayer,
} from "@/app/[locale]/user/[username]/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockMutateSuccess(
  key: string,
  typeName: string,
  fields: Record<string, unknown> = {},
) {
  mockAuthMutate.mockResolvedValueOnce({
    data: { [key]: { __typename: typeName, ...fields } },
  });
}

function mockMutateGraphqlError(message: string) {
  mockAuthMutate.mockResolvedValueOnce({
    data: {},
    errors: [{ message }],
  });
}

function mockMutateUnionError(
  key: string,
  errorTypeName: string,
  message: string,
) {
  mockAuthMutate.mockResolvedValueOnce({
    data: { [key]: { __typename: errorTypeName, message } },
  });
}

function mockMutateNetworkError() {
  mockAuthMutate.mockRejectedValueOnce(new Error("Network failure"));
}

function getMutationInput(key: string): Record<string, unknown> {
  const callArg = mockAuthMutate.mock.calls[0][0] as Record<string, unknown>;
  return (callArg[key] as { __args: { input: Record<string, unknown> } }).__args.input;
}

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const mockFriendship = {
  id: "f1",
  status: "PENDING",
  requester: { id: "u1" },
  addressee: { id: "u2" },
};

// ---------------------------------------------------------------------------
// sendFriendRequest
// ---------------------------------------------------------------------------

describe("sendFriendRequest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success with friendship on success", async () => {
    mockMutateSuccess("sendFriendRequest", "SendFriendRequestResponse", {
      friendship: mockFriendship,
    });

    const result = await sendFriendRequest("u2");

    expect(result).toEqual({ success: true, friendship: mockFriendship });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("passes userId in mutation input", async () => {
    mockMutateSuccess("sendFriendRequest", "SendFriendRequestResponse", {
      friendship: mockFriendship,
    });

    await sendFriendRequest("user-123");

    const mutInput = getMutationInput("sendFriendRequest");
    expect(mutInput).toEqual({ userId: "user-123" });
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Unauthorized");

    const result = await sendFriendRequest("u2");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Unauthorized",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("sendFriendRequest", "FriendRequestAlreadySentError", "Already sent");

    const result = await sendFriendRequest("u2");

    expect(result).toEqual({
      success: false,
      errorType: "FriendRequestAlreadySentError",
      message: "Already sent",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await sendFriendRequest("u2");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to send friend request",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// acceptFriendRequest
// ---------------------------------------------------------------------------

describe("acceptFriendRequest", () => {
  beforeEach(() => vi.clearAllMocks());

  const acceptedFriendship = { ...mockFriendship, status: "ACCEPTED" };

  it("returns success with friendship on success", async () => {
    mockMutateSuccess("acceptFriendRequest", "AcceptFriendRequestResponse", {
      friendship: acceptedFriendship,
    });

    const result = await acceptFriendRequest("u1");

    expect(result).toEqual({ success: true, friendship: acceptedFriendship });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("passes requesterId in mutation input", async () => {
    mockMutateSuccess("acceptFriendRequest", "AcceptFriendRequestResponse", {
      friendship: acceptedFriendship,
    });

    await acceptFriendRequest("requester-456");

    const mutInput = getMutationInput("acceptFriendRequest");
    expect(mutInput).toEqual({ requesterId: "requester-456" });
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Request not found");

    const result = await acceptFriendRequest("u1");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Request not found",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("acceptFriendRequest", "FriendRequestNotFoundError", "No request found");

    const result = await acceptFriendRequest("u1");

    expect(result).toEqual({
      success: false,
      errorType: "FriendRequestNotFoundError",
      message: "No request found",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await acceptFriendRequest("u1");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to accept friend request",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// blockUser
// ---------------------------------------------------------------------------

describe("blockUser", () => {
  beforeEach(() => vi.clearAllMocks());

  const blockedFriendship = { ...mockFriendship, status: "BLOCKED" };

  it("returns success with friendship on success", async () => {
    mockMutateSuccess("blockUser", "BlockUserResponse", {
      friendship: blockedFriendship,
    });

    const result = await blockUser("u2");

    expect(result).toEqual({ success: true, friendship: blockedFriendship });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("passes userId in mutation input", async () => {
    mockMutateSuccess("blockUser", "BlockUserResponse", {
      friendship: blockedFriendship,
    });

    await blockUser("target-789");

    const mutInput = getMutationInput("blockUser");
    expect(mutInput).toEqual({ userId: "target-789" });
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("User not found");

    const result = await blockUser("u2");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "User not found",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("blockUser", "CannotBlockSelfError", "Cannot block yourself");

    const result = await blockUser("u2");

    expect(result).toEqual({
      success: false,
      errorType: "CannotBlockSelfError",
      message: "Cannot block yourself",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await blockUser("u2");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to block user",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// unblockUser
// ---------------------------------------------------------------------------

describe("unblockUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success (no friendship) on success", async () => {
    mockMutateSuccess("unblockUser", "UnblockUserResponse");

    const result = await unblockUser("u2");

    expect(result).toEqual({ success: true });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("passes userId in mutation input", async () => {
    mockMutateSuccess("unblockUser", "UnblockUserResponse");

    await unblockUser("unblock-999");

    const mutInput = getMutationInput("unblockUser");
    expect(mutInput).toEqual({ userId: "unblock-999" });
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("User not found");

    const result = await unblockUser("u2");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "User not found",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("unblockUser", "UserNotBlockedError", "User is not blocked");

    const result = await unblockUser("u2");

    expect(result).toEqual({
      success: false,
      errorType: "UserNotBlockedError",
      message: "User is not blocked",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await unblockUser("u2");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to unblock user",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateUser
// ---------------------------------------------------------------------------

describe("updateUser", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockUser = { id: "u1", displayName: "Alice", biography: "Hello" };

  it("returns success with user data on success", async () => {
    mockMutateSuccess("updateUser", "UpdateUserResponse", {
      user: mockUser,
    });

    const result = await updateUser({ displayName: "Alice" });

    expect(result).toEqual({ success: true, user: mockUser });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/user/[username]", "page");
  });

  it("sends only displayName when only displayName provided (PATCH semantics)", async () => {
    mockMutateSuccess("updateUser", "UpdateUserResponse", {
      user: mockUser,
    });

    await updateUser({ displayName: "New Name" });

    const mutInput = getMutationInput("updateUser");
    expect(mutInput).toEqual({ displayName: "New Name" });
    expect(mutInput).not.toHaveProperty("biography");
  });

  it("sends only biography when only biography provided (PATCH semantics)", async () => {
    mockMutateSuccess("updateUser", "UpdateUserResponse", {
      user: { ...mockUser, biography: "Updated bio" },
    });

    await updateUser({ biography: "Updated bio" });

    const mutInput = getMutationInput("updateUser");
    expect(mutInput).toEqual({ biography: "Updated bio" });
    expect(mutInput).not.toHaveProperty("displayName");
  });

  it("sends null biography to clear the value (PATCH semantics)", async () => {
    mockMutateSuccess("updateUser", "UpdateUserResponse", {
      user: { ...mockUser, biography: null },
    });

    await updateUser({ biography: null });

    const mutInput = getMutationInput("updateUser");
    expect(mutInput).toHaveProperty("biography", null);
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Unauthorized");

    const result = await updateUser({ displayName: "Alice" });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Unauthorized",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR when response typename does not match", async () => {
    mockAuthMutate.mockResolvedValueOnce({
      data: { updateUser: { __typename: "UpdateUserError", message: "Not allowed" } },
    });

    const result = await updateUser({ displayName: "Alice" });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Unexpected response",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR when data.updateUser is null", async () => {
    mockAuthMutate.mockResolvedValueOnce({
      data: { updateUser: null },
    });

    const result = await updateUser({ displayName: "Alice" });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Unexpected response",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await updateUser({ displayName: "Alice" });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to update user",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updatePlayer
// ---------------------------------------------------------------------------

describe("updatePlayer", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockPlayer = { id: 1, age: 25, height: 180, weight: 75 };

  it("returns success with player data on success", async () => {
    mockMutateSuccess("updatePlayer", "UpdatePlayerResponse", {
      player: mockPlayer,
    });

    const result = await updatePlayer({ age: 25, height: 180, weight: 75 });

    expect(result).toEqual({ success: true, player: mockPlayer });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/user/[username]", "page");
  });

  it("only sends age when only age provided (PATCH semantics)", async () => {
    mockMutateSuccess("updatePlayer", "UpdatePlayerResponse", {
      player: { ...mockPlayer, age: 30 },
    });

    await updatePlayer({ age: 30 });

    const mutInput = getMutationInput("updatePlayer");
    expect(mutInput).toHaveProperty("age", 30);
    expect(mutInput).not.toHaveProperty("height");
    expect(mutInput).not.toHaveProperty("weight");
  });

  it("only sends height when only height provided (PATCH semantics)", async () => {
    mockMutateSuccess("updatePlayer", "UpdatePlayerResponse", {
      player: { ...mockPlayer, height: 185 },
    });

    await updatePlayer({ height: 185 });

    const mutInput = getMutationInput("updatePlayer");
    expect(mutInput).toHaveProperty("height", 185);
    expect(mutInput).not.toHaveProperty("age");
    expect(mutInput).not.toHaveProperty("weight");
  });

  it("only sends weight when only weight provided (PATCH semantics)", async () => {
    mockMutateSuccess("updatePlayer", "UpdatePlayerResponse", {
      player: { ...mockPlayer, weight: 80 },
    });

    await updatePlayer({ weight: 80 });

    const mutInput = getMutationInput("updatePlayer");
    expect(mutInput).toHaveProperty("weight", 80);
    expect(mutInput).not.toHaveProperty("age");
    expect(mutInput).not.toHaveProperty("height");
  });

  it("sends null age to clear the value (PATCH semantics)", async () => {
    mockMutateSuccess("updatePlayer", "UpdatePlayerResponse", {
      player: { ...mockPlayer, age: null },
    });

    await updatePlayer({ age: null });

    const mutInput = getMutationInput("updatePlayer");
    expect(mutInput).toHaveProperty("age", null);
    expect(mutInput).not.toHaveProperty("height");
    expect(mutInput).not.toHaveProperty("weight");
  });

  it("sends null height to clear the value (PATCH semantics)", async () => {
    mockMutateSuccess("updatePlayer", "UpdatePlayerResponse", {
      player: { ...mockPlayer, height: null },
    });

    await updatePlayer({ height: null });

    const mutInput = getMutationInput("updatePlayer");
    expect(mutInput).toHaveProperty("height", null);
  });

  it("sends null weight to clear the value (PATCH semantics)", async () => {
    mockMutateSuccess("updatePlayer", "UpdatePlayerResponse", {
      player: { ...mockPlayer, weight: null },
    });

    await updatePlayer({ weight: null });

    const mutInput = getMutationInput("updatePlayer");
    expect(mutInput).toHaveProperty("weight", null);
  });

  it("sends empty object when no fields provided", async () => {
    mockMutateSuccess("updatePlayer", "UpdatePlayerResponse", {
      player: mockPlayer,
    });

    await updatePlayer({});

    const mutInput = getMutationInput("updatePlayer");
    expect(mutInput).toEqual({});
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Unauthorized");

    const result = await updatePlayer({ age: 25 });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Unauthorized",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("updatePlayer", "PlayerNotFoundError", "Player does not exist");

    const result = await updatePlayer({ age: 25 });

    expect(result).toEqual({
      success: false,
      errorType: "PlayerNotFoundError",
      message: "Player does not exist",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await updatePlayer({ age: 25 });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to update player",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
