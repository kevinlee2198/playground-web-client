import { describe, it, expect, vi, beforeEach } from "vitest";
import { MutationErrorType } from "@/lib/graphql-result";
import { SportType, SportSubtype, GameSortField, SortDirection, GameStatus } from "@/lib/constants";

const { mockAuthMutate, mockAuthQuery, mockQuery } = vi.hoisted(() => ({
  mockAuthMutate: vi.fn(),
  mockAuthQuery: vi.fn(),
  mockQuery: vi.fn(),
}));

vi.mock("@/lib/graphql-request", () => ({
  authMutate: mockAuthMutate,
  authQuery: mockAuthQuery,
  query: mockQuery,
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({ user: { id: "u1" } }),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import {
  createGame,
  updateGame,
  deleteGame,
  startGame,
  endGame,
  loadMoreGames,
  loadGameMembers,
  addGameEditor,
  removeGameEditor,
  transferGameOwnership,
  loadGameMedia,
} from "@/app/[locale]/game/actions";

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
// createGame
// ---------------------------------------------------------------------------

describe("createGame", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success with gameId on basketball game creation", async () => {
    mockMutateSuccess("createGame", "CreateGameResponse", {
      game: { id: 42, sportType: "BASKETBALL", metadata: {}, gameStatus: "SCHEDULED", startDate: "2025-01-01" },
    });

    const result = await createGame({
      sportType: SportType.BASKETBALL,
      startDate: "2025-01-01",
      metadata: { subtype: SportSubtype.FIVE_ON_FIVE, periods: 4 },
    });

    expect(result).toEqual({ success: true, gameId: 42 });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/games", "page");
  });

  it("uses lowercase sport type as @oneOf key", async () => {
    mockMutateSuccess("createGame", "CreateGameResponse", {
      game: { id: 10, sportType: "TENNIS", metadata: {}, gameStatus: "SCHEDULED", startDate: "2025-06-01" },
    });

    await createGame({
      sportType: SportType.TENNIS,
      startDate: "2025-06-01",
      metadata: { subtype: SportSubtype.SINGLES, bestOf: 3, tiebreakFinalSet: true },
    });

    const mutInput = getMutationInput("createGame");
    expect(Object.keys(mutInput)).toEqual(["tennis"]);
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/games", "page");
  });

  it("includes location with coordinates when provided", async () => {
    mockMutateSuccess("createGame", "CreateGameResponse", {
      game: { id: 5, sportType: "FOOTBALL", metadata: {}, gameStatus: "SCHEDULED", startDate: "2025-03-01" },
    });

    await createGame({
      sportType: SportType.FOOTBALL,
      startDate: "2025-03-01",
      metadata: { subtype: SportSubtype.FLAG_FOOTBALL },
      location: {
        address: { city: "Boston", country: "USA" },
        coordinates: { latitude: 42.36, longitude: -71.06 },
      },
    });

    const callArg = mockAuthMutate.mock.calls[0][0] as Record<string, unknown>;
    const footballInput = (
      callArg.createGame as { __args: { input: { football: { location: unknown } } } }
    ).__args.input.football;
    expect(footballInput.location).toMatchObject({
      address: { city: "Boston", country: "USA" },
      coordinates: { latitude: 42.36, longitude: -71.06 },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/games", "page");
  });

  it("omits coordinates key when not provided", async () => {
    mockMutateSuccess("createGame", "CreateGameResponse", {
      game: { id: 6, sportType: "FOOTBALL", metadata: {}, gameStatus: "SCHEDULED", startDate: "2025-03-01" },
    });

    await createGame({
      sportType: SportType.FOOTBALL,
      startDate: "2025-03-01",
      metadata: { subtype: SportSubtype.FLAG_FOOTBALL },
      location: {
        address: { city: "Boston", country: "USA" },
      },
    });

    const callArg = mockAuthMutate.mock.calls[0][0] as Record<string, unknown>;
    const footballInput = (
      callArg.createGame as { __args: { input: { football: { location: Record<string, unknown> } } } }
    ).__args.input.football;
    expect(footballInput.location).not.toHaveProperty("coordinates");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/games", "page");
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Unauthorized");

    const result = await createGame({
      sportType: SportType.BASKETBALL,
      startDate: "2025-01-01",
      metadata: { subtype: SportSubtype.FIVE_ON_FIVE },
    });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Unauthorized",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("createGame", "GameAlreadyExistsError", "Game already exists");

    const result = await createGame({
      sportType: SportType.BASKETBALL,
      startDate: "2025-01-01",
      metadata: { subtype: SportSubtype.FIVE_ON_FIVE },
    });

    expect(result).toEqual({
      success: false,
      errorType: "GameAlreadyExistsError",
      message: "Game already exists",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await createGame({
      sportType: SportType.BASKETBALL,
      startDate: "2025-01-01",
      metadata: { subtype: SportSubtype.FIVE_ON_FIVE },
    });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to create game",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateGame
// ---------------------------------------------------------------------------

describe("updateGame", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success with gameId on update", async () => {
    mockMutateSuccess("updateGame", "UpdateGameResponse", {
      game: { id: 7, startDate: "2025-02-01", metadata: {} },
    });

    const result = await updateGame({ id: 7, startDate: "2025-02-01" });

    expect(result).toEqual({ success: true, gameId: 7 });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("only sends provided fields (PATCH semantics)", async () => {
    mockMutateSuccess("updateGame", "UpdateGameResponse", {
      game: { id: 8, startDate: "2025-03-01", metadata: {} },
    });

    await updateGame({ id: 8, startDate: "2025-03-01" });

    const mutInput = getMutationInput("updateGame");
    expect(mutInput).toHaveProperty("id", 8);
    expect(mutInput).toHaveProperty("startDate", "2025-03-01");
    expect(mutInput).not.toHaveProperty("description");
    expect(mutInput).not.toHaveProperty("metadata");
    expect(mutInput).not.toHaveProperty("location");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("sends metadata with basketball subtype when basketball metadata provided", async () => {
    mockMutateSuccess("updateGame", "UpdateGameResponse", {
      game: { id: 9, startDate: "2025-04-01", metadata: {} },
    });

    await updateGame({
      id: 9,
      metadata: { basketball: { subtype: SportSubtype.THREE_ON_THREE, periods: 2 } },
    });

    const mutInput = getMutationInput("updateGame");
    expect(mutInput).toHaveProperty("metadata");
    expect((mutInput.metadata as Record<string, unknown>)).toHaveProperty("basketball");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Not authorized");

    const result = await updateGame({ id: 1, startDate: "2025-01-01" });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Not authorized",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("updateGame", "GameNotFoundError", "Game not found");

    const result = await updateGame({ id: 1, startDate: "2025-01-01" });

    expect(result).toEqual({
      success: false,
      errorType: "GameNotFoundError",
      message: "Game not found",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await updateGame({ id: 1 });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to update game",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deleteGame
// ---------------------------------------------------------------------------

describe("deleteGame", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success on deletion", async () => {
    mockMutateSuccess("deleteGame", "DeleteGameResponse", { id: 99 });

    const result = await deleteGame(99);

    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/games", "page");
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Forbidden");

    const result = await deleteGame(99);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Forbidden",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("deleteGame", "GameNotFoundError", "Game not found");

    const result = await deleteGame(99);

    expect(result).toEqual({
      success: false,
      errorType: "GameNotFoundError",
      message: "Game not found",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await deleteGame(99);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to delete game",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// startGame
// ---------------------------------------------------------------------------

describe("startGame", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success with gameId", async () => {
    mockMutateSuccess("startGame", "StartGameResponse", {
      game: { id: 11, gameStatus: "IN_PROGRESS", startDate: "2025-01-10" },
    });

    const result = await startGame(11);

    expect(result).toEqual({ success: true, gameId: 11 });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("includes startDate in mutation input when provided", async () => {
    mockMutateSuccess("startGame", "StartGameResponse", {
      game: { id: 12, gameStatus: "IN_PROGRESS", startDate: "2025-01-15" },
    });

    await startGame(12, "2025-01-15");

    const mutInput = getMutationInput("startGame");
    expect(mutInput).toHaveProperty("startDate", "2025-01-15");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("omits startDate from mutation input when not provided", async () => {
    mockMutateSuccess("startGame", "StartGameResponse", {
      game: { id: 13, gameStatus: "IN_PROGRESS", startDate: "2025-01-20" },
    });

    await startGame(13);

    const mutInput = getMutationInput("startGame");
    expect(mutInput).not.toHaveProperty("startDate");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Game already started");

    const result = await startGame(11);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Game already started",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("startGame", "InvalidGameStatusError", "Cannot start a completed game");

    const result = await startGame(11);

    expect(result).toEqual({
      success: false,
      errorType: "InvalidGameStatusError",
      message: "Cannot start a completed game",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await startGame(11);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to start game",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// endGame
// ---------------------------------------------------------------------------

describe("endGame", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success with gameId", async () => {
    mockMutateSuccess("endGame", "EndGameResponse", {
      game: { id: 20, gameStatus: "COMPLETE", endDate: "2025-01-10" },
    });

    const result = await endGame(20);

    expect(result).toEqual({ success: true, gameId: 20 });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("includes endDate when provided", async () => {
    mockMutateSuccess("endGame", "EndGameResponse", {
      game: { id: 21, gameStatus: "COMPLETE", endDate: "2025-01-11" },
    });

    await endGame(21, "2025-01-11");

    const mutInput = getMutationInput("endGame");
    expect(mutInput).toHaveProperty("endDate", "2025-01-11");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Game not in progress");

    const result = await endGame(20);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Game not in progress",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("endGame", "InvalidGameStatusError", "Cannot end a scheduled game");

    const result = await endGame(20);

    expect(result).toEqual({
      success: false,
      errorType: "InvalidGameStatusError",
      message: "Cannot end a scheduled game",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await endGame(20);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to end game",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// loadMoreGames
// ---------------------------------------------------------------------------

describe("loadMoreGames", () => {
  const defaultSort = { field: GameSortField.START_DATE, direction: SortDirection.DESC };
  const emptyConnection = { edges: [], pageInfo: { hasNextPage: false, endCursor: null } };

  beforeEach(() => vi.clearAllMocks());

  function mockQuerySuccess(data: Record<string, unknown>) {
    mockAuthQuery.mockResolvedValueOnce({ data });
  }

  function getQueryInput(): Record<string, unknown> {
    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    return (callArg.games as { __args: { input: Record<string, unknown> } }).__args.input;
  }

  it("returns games connection on success", async () => {
    const mockGames = {
      edges: [{ cursor: "c1", node: { id: 1 } }],
      pageInfo: { hasNextPage: false, endCursor: "c1" },
    };
    mockQuerySuccess({ games: mockGames });

    const result = await loadMoreGames({}, defaultSort, "cursor1");

    expect(result).toEqual(mockGames);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("includes sportType as EnumType when filter provided", async () => {
    mockQuerySuccess({ games: emptyConnection });

    await loadMoreGames({ sportType: SportType.BASKETBALL }, defaultSort, "");

    const gamesArgs = getQueryInput();
    expect(gamesArgs).toHaveProperty("sportType");
    expect(typeof gamesArgs.sportType).toBe("object");
  });

  it("includes gameStatus as EnumType when filter provided", async () => {
    mockQuerySuccess({ games: emptyConnection });

    await loadMoreGames({ gameStatus: GameStatus.SCHEDULED }, defaultSort, "");

    const gamesArgs = getQueryInput();
    expect(gamesArgs).toHaveProperty("gameStatus");
    expect(typeof gamesArgs.gameStatus).toBe("object");
  });

  it("includes playerId filter when provided", async () => {
    mockQuerySuccess({ games: emptyConnection });

    await loadMoreGames({ playerId: 5 }, defaultSort, "");

    const gamesArgs = getQueryInput();
    expect(gamesArgs).toHaveProperty("playerId", 5);
  });

  it("includes organizedByMe filter when provided", async () => {
    mockQuerySuccess({ games: emptyConnection });

    await loadMoreGames({ organizedByMe: true }, defaultSort, "");

    const gamesArgs = getQueryInput();
    expect(gamesArgs).toHaveProperty("organizedByMe", true);
  });

  it("passes sort field and direction as EnumType objects", async () => {
    mockQuerySuccess({ games: emptyConnection });

    await loadMoreGames({}, { field: GameSortField.END_DATE, direction: SortDirection.ASC }, "");

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const sortArgs = (callArg.games as { __args: { sort: unknown[] } }).__args.sort;
    expect(Array.isArray(sortArgs)).toBe(true);
    expect(sortArgs.length).toBe(1);
    expect(typeof (sortArgs[0] as Record<string, unknown>).field).toBe("object");
    expect(typeof (sortArgs[0] as Record<string, unknown>).direction).toBe("object");
  });

  it("returns null on network failure", async () => {
    mockAuthQuery.mockRejectedValueOnce(new Error("Network error"));

    const result = await loadMoreGames({}, defaultSort, "");

    expect(result).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// loadGameMembers
// ---------------------------------------------------------------------------

describe("loadGameMembers", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockEdges = [
    {
      cursor: "c1",
      node: {
        id: "m1",
        user: { id: "u1", firstName: "Alice", lastName: "Smith", username: "alice" },
        role: "OWNER",
      },
    },
  ];

  it("returns members on success", async () => {
    mockAuthQuery.mockResolvedValueOnce({
      data: { game: { members: { edges: mockEdges } } },
    });

    const result = await loadGameMembers(1);

    expect(result).toEqual({ members: mockEdges });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns empty members array when edges is null", async () => {
    mockAuthQuery.mockResolvedValueOnce({
      data: { game: { members: { edges: null } } },
    });

    const result = await loadGameMembers(1);

    expect(result).toEqual({ members: [] });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns null on network failure", async () => {
    mockAuthQuery.mockRejectedValueOnce(new Error("Network error"));

    const result = await loadGameMembers(1);

    expect(result).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// addGameEditor
// ---------------------------------------------------------------------------

describe("addGameEditor", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockMember = {
    id: "m1",
    user: { id: "u1", firstName: "Bob", lastName: "Jones", username: "bob" },
    role: "EDITOR",
  };

  it("returns success with gameMember on success", async () => {
    mockMutateSuccess("addGameEditor", "AddGameEditorResponse", {
      gameMember: mockMember,
    });

    const result = await addGameEditor(1, "u1");

    expect(result).toEqual({ success: true, gameMember: mockMember });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("User not found");

    const result = await addGameEditor(1, "u1");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "User not found",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("addGameEditor", "UserAlreadyEditorError", "User is already an editor");

    const result = await addGameEditor(1, "u1");

    expect(result).toEqual({
      success: false,
      errorType: "UserAlreadyEditorError",
      message: "User is already an editor",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await addGameEditor(1, "u1");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to add editor",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// removeGameEditor
// ---------------------------------------------------------------------------

describe("removeGameEditor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success on removal", async () => {
    mockMutateSuccess("removeGameEditor", "RemoveGameEditorResponse", { id: "m1" });

    const result = await removeGameEditor(1, "u1");

    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Member not found");

    const result = await removeGameEditor(1, "u1");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Member not found",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("removeGameEditor", "GameMemberNotFoundError", "Editor not found");

    const result = await removeGameEditor(1, "u1");

    expect(result).toEqual({
      success: false,
      errorType: "GameMemberNotFoundError",
      message: "Editor not found",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await removeGameEditor(1, "u1");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to remove editor",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// transferGameOwnership
// ---------------------------------------------------------------------------

describe("transferGameOwnership", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockMember = {
    id: "m2",
    user: { id: "u2", firstName: "Carol", lastName: "White", username: "carol" },
    role: "OWNER",
  };

  it("returns success with gameMember on transfer", async () => {
    mockMutateSuccess("transferGameOwnership", "TransferGameOwnershipResponse", {
      gameMember: mockMember,
    });

    const result = await transferGameOwnership(1, "u2");

    expect(result).toEqual({ success: true, gameMember: mockMember });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Target user not found");

    const result = await transferGameOwnership(1, "u2");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Target user not found",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("transferGameOwnership", "UserNotGameMemberError", "User is not a member");

    const result = await transferGameOwnership(1, "u2");

    expect(result).toEqual({
      success: false,
      errorType: "UserNotGameMemberError",
      message: "User is not a member",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await transferGameOwnership(1, "u2");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to transfer ownership",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// loadGameMedia
// ---------------------------------------------------------------------------

describe("loadGameMedia", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockMedia = {
    edges: [
      {
        cursor: "c1",
        node: {
          __typename: "ImageResource",
          id: "r1",
          filename: "photo.jpg",
          size: 1024,
          mimeType: "image/jpeg",
          downloadUrl: "https://example.com/photo.jpg",
          createdDate: "2025-01-01",
          width: 800,
          height: 600,
          thumbnailUrl: "https://example.com/thumb.jpg",
        },
      },
    ],
    pageInfo: { hasNextPage: false, endCursor: "c1" },
  };

  it("returns media connection on success", async () => {
    mockAuthQuery.mockResolvedValueOnce({
      data: { game: { media: mockMedia } },
    });

    const result = await loadGameMedia(1, 10);

    expect(result).toEqual(mockMedia);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("passes after cursor when provided", async () => {
    mockAuthQuery.mockResolvedValueOnce({
      data: { game: { media: mockMedia } },
    });

    await loadGameMedia(1, 10, "cursor123");

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const mediaArgs = (
      callArg.game as { media: { __args: Record<string, unknown> } }
    ).media.__args;
    expect(mediaArgs).toHaveProperty("after", "cursor123");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("omits after from args when not provided", async () => {
    mockAuthQuery.mockResolvedValueOnce({
      data: { game: { media: mockMedia } },
    });

    await loadGameMedia(1, 10);

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const mediaArgs = (
      callArg.game as { media: { __args: Record<string, unknown> } }
    ).media.__args;
    expect(mediaArgs).not.toHaveProperty("after");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns null on top-level errors", async () => {
    mockAuthQuery.mockResolvedValueOnce({
      data: { game: null },
      errors: [{ message: "Not found" }],
    });

    const result = await loadGameMedia(1, 10);

    expect(result).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns null when game.media is missing", async () => {
    mockAuthQuery.mockResolvedValueOnce({
      data: { game: { media: null } },
    });

    const result = await loadGameMedia(1, 10);

    expect(result).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns null on network failure", async () => {
    mockAuthQuery.mockRejectedValueOnce(new Error("Timeout"));

    const result = await loadGameMedia(1, 10);

    expect(result).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
