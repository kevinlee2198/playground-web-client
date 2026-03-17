import { describe, it, expect, vi, beforeEach } from "vitest";
import { MutationErrorType } from "@/lib/graphql-result";
import type { SaveBasketballBoxScoreInput, SaveBasketballBoxScoreData } from "@/lib/types/stats/basketball";

const { mockAuthMutate } = vi.hoisted(() => ({
  mockAuthMutate: vi.fn(),
}));

vi.mock("@/lib/graphql-request", () => ({
  authMutate: mockAuthMutate,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { saveBasketballBoxScore, saveBasketballBoxScores } from "@/app/[locale]/game/box-score-actions";
import { revalidatePath } from "next/cache";

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

function makeBoxScoreFields(id: string) {
  return {
    basketballBoxScore: {
      id,
      player: { id: "10", user: { displayName: "Alice" } },
      points: 20,
      assists: 5,
      totalRebounds: 8,
      offensiveRebounds: 3,
      defensiveRebounds: 5,
      steals: 2,
      blocks: 1,
      turnovers: 3,
      personalFouls: 2,
      fieldGoalsMade: 8,
      fieldGoalsAttempted: 15,
      fieldGoalPercentage: 0.533,
      threePointersMade: 2,
      threePointersAttempted: 5,
      threePointerPercentage: 0.4,
      twoPointersMade: 2,
      twoPointersAttempted: 4,
      twoPointerPercentage: 0.5,
      freeThrowsMade: 6,
      freeThrowsAttempted: 8,
      freeThrowPercentage: 0.75,
    },
  };
}

function makeBoxScoresFields(ids: string[]) {
  return {
    basketballBoxScores: ids.map((id) => ({
      id,
      player: { id: "10", user: { displayName: "Alice" } },
      points: 10,
      assists: 3,
      totalRebounds: 4,
      offensiveRebounds: 1,
      defensiveRebounds: 3,
      steals: 1,
      blocks: 0,
      turnovers: 2,
      personalFouls: 1,
      fieldGoalsMade: 4,
      fieldGoalsAttempted: 8,
      fieldGoalPercentage: 0.5,
      threePointersMade: 1,
      threePointersAttempted: 2,
      threePointerPercentage: 0.5,
      twoPointersMade: 2,
      twoPointersAttempted: 4,
      twoPointerPercentage: 0.5,
      freeThrowsMade: 2,
      freeThrowsAttempted: 2,
      freeThrowPercentage: 1.0,
    })),
  };
}

// ---------------------------------------------------------------------------
// saveBasketballBoxScore
// ---------------------------------------------------------------------------

describe("saveBasketballBoxScore", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success with boxScoreId on a successful mutation", async () => {
    mockMutateSuccess("saveBasketballBoxScore", "SaveBasketballBoxScoreResponse", makeBoxScoreFields("abc-123"));

    const input: SaveBasketballBoxScoreInput = {
      playerId: 10,
      gameId: 1,
      assists: 5,
      steals: 2,
    };

    const result = await saveBasketballBoxScore(input);

    expect(result).toEqual({ success: true, boxScoreId: "abc-123" });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("only includes defined stat fields in the mutation input (PATCH semantics)", async () => {
    mockMutateSuccess("saveBasketballBoxScore", "SaveBasketballBoxScoreResponse", makeBoxScoreFields("def-456"));

    const input: SaveBasketballBoxScoreInput = {
      playerId: 10,
      gameId: 1,
      assists: 7,
      blocks: 3,
    };

    await saveBasketballBoxScore(input);

    const mutationInput = getMutationInput("saveBasketballBoxScore");

    expect(mutationInput.playerId).toBe(10);
    expect(mutationInput.gameId).toBe(1);
    expect(mutationInput.assists).toBe(7);
    expect(mutationInput.blocks).toBe(3);

    const omittedFields = [
      "steals", "turnovers", "personalFouls",
      "offensiveRebounds", "defensiveRebounds",
      "threePointersMade", "threePointersAttempted",
      "twoPointersMade", "twoPointersAttempted",
      "freeThrowsMade", "freeThrowsAttempted",
    ];
    for (const field of omittedFields) {
      expect(field in mutationInput).toBe(false);
    }
  });

  it("includes null stat fields (explicit clear) in the mutation input", async () => {
    mockMutateSuccess("saveBasketballBoxScore", "SaveBasketballBoxScoreResponse", makeBoxScoreFields("ghi-789"));

    const input: SaveBasketballBoxScoreInput = {
      playerId: 10,
      gameId: 1,
      assists: null,
    };

    await saveBasketballBoxScore(input);

    const mutationInput = getMutationInput("saveBasketballBoxScore");
    expect("assists" in mutationInput).toBe(true);
    expect(mutationInput.assists).toBeNull();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Unauthorized");

    const input: SaveBasketballBoxScoreInput = { playerId: 10, gameId: 1 };
    const result = await saveBasketballBoxScore(input);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Unauthorized",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("saveBasketballBoxScore", "BoxScoreNotFoundError", "Box score not found");

    const input: SaveBasketballBoxScoreInput = { playerId: 10, gameId: 1 };
    const result = await saveBasketballBoxScore(input);

    expect(result).toEqual({
      success: false,
      errorType: "BoxScoreNotFoundError",
      message: "Box score not found",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const input: SaveBasketballBoxScoreInput = { playerId: 10, gameId: 1 };
    const result = await saveBasketballBoxScore(input);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to save basketball box score",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// saveBasketballBoxScores
// ---------------------------------------------------------------------------

describe("saveBasketballBoxScores", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success with boxScoreIds on a successful batch mutation", async () => {
    mockMutateSuccess("saveBasketballBoxScores", "SaveBasketballBoxScoresResponse", makeBoxScoresFields(["id-1", "id-2"]));

    const scores: SaveBasketballBoxScoreData[] = [
      { playerId: 10, assists: 5 },
      { playerId: 11, steals: 3 },
    ];

    const result = await saveBasketballBoxScores(1, scores);

    expect(result).toEqual({ success: true, boxScoreIds: ["id-1", "id-2"] });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("returns VALIDATION_ERROR for an empty scores array without calling authMutate", async () => {
    const result = await saveBasketballBoxScores(1, []);

    expect(mockAuthMutate).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.VALIDATION_ERROR,
      message: "No box scores provided",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("passes the gameId and per-player stat fields to the mutation", async () => {
    mockMutateSuccess("saveBasketballBoxScores", "SaveBasketballBoxScoresResponse", makeBoxScoresFields(["id-1"]));

    const scores: SaveBasketballBoxScoreData[] = [
      { playerId: 10, assists: 4, blocks: 2 },
    ];

    await saveBasketballBoxScores(42, scores);

    const mutationInput = getMutationInput("saveBasketballBoxScores");
    expect(mutationInput.gameId).toBe(42);

    const boxScores = mutationInput.basketballBoxScores as Record<string, unknown>[];
    expect(boxScores).toHaveLength(1);
    expect(boxScores[0].playerId).toBe(10);
    expect(boxScores[0].assists).toBe(4);
    expect(boxScores[0].blocks).toBe(2);
    expect("steals" in boxScores[0]).toBe(false);
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Server error");

    const scores: SaveBasketballBoxScoreData[] = [{ playerId: 10 }];
    const result = await saveBasketballBoxScores(1, scores);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Server error",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const scores: SaveBasketballBoxScoreData[] = [{ playerId: 10 }];
    const result = await saveBasketballBoxScores(1, scores);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to save basketball box scores",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
