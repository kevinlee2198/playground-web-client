import { describe, it, expect, vi, beforeEach } from "vitest";
import { MutationErrorType } from "@/lib/graphql-result";
import type { SaveBasketballStatsInput, SaveBasketballStatsData } from "@/lib/types/stats/basketball";

const { mockAuthMutate } = vi.hoisted(() => ({
  mockAuthMutate: vi.fn(),
}));

vi.mock("@/lib/graphql-request", () => ({
  authMutate: mockAuthMutate,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { saveBasketballStats, saveBasketballStatsBulk } from "@/app/[locale]/game/basketball-stats-actions";
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
    basketballStats: {
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
    stats: ids.map((id) => ({
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
// saveBasketballStats
// ---------------------------------------------------------------------------

describe("saveBasketballStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success with statsId on a successful mutation", async () => {
    mockMutateSuccess("saveBasketballStats", "SaveBasketballStatsResponse", makeBoxScoreFields("abc-123"));

    const input: SaveBasketballStatsInput = {
      playerId: 10,
      gameId: 1,
      assists: 5,
      steals: 2,
    };

    const result = await saveBasketballStats(input);

    expect(result).toEqual({ success: true, statsId: "abc-123" });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("only includes defined stat fields in the mutation input (PATCH semantics)", async () => {
    mockMutateSuccess("saveBasketballStats", "SaveBasketballStatsResponse", makeBoxScoreFields("def-456"));

    const input: SaveBasketballStatsInput = {
      playerId: 10,
      gameId: 1,
      assists: 7,
      blocks: 3,
    };

    await saveBasketballStats(input);

    const mutationInput = getMutationInput("saveBasketballStats");

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
    mockMutateSuccess("saveBasketballStats", "SaveBasketballStatsResponse", makeBoxScoreFields("ghi-789"));

    const input: SaveBasketballStatsInput = {
      playerId: 10,
      gameId: 1,
      assists: null,
    };

    await saveBasketballStats(input);

    const mutationInput = getMutationInput("saveBasketballStats");
    expect("assists" in mutationInput).toBe(true);
    expect(mutationInput.assists).toBeNull();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Unauthorized");

    const input: SaveBasketballStatsInput = { playerId: 10, gameId: 1 };
    const result = await saveBasketballStats(input);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Unauthorized",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("saveBasketballStats", "BasketballStatsNotFoundError", "Stats not found");

    const input: SaveBasketballStatsInput = { playerId: 10, gameId: 1 };
    const result = await saveBasketballStats(input);

    expect(result).toEqual({
      success: false,
      errorType: "BasketballStatsNotFoundError",
      message: "Stats not found",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const input: SaveBasketballStatsInput = { playerId: 10, gameId: 1 };
    const result = await saveBasketballStats(input);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to save basketball stats",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// saveBasketballStatsBulk
// ---------------------------------------------------------------------------

describe("saveBasketballStatsBulk", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success with statsIds on a successful batch mutation", async () => {
    mockMutateSuccess("saveBasketballStatsBulk", "SaveBasketballStatsBulkResponse", makeBoxScoresFields(["id-1", "id-2"]));

    const scores: SaveBasketballStatsData[] = [
      { playerId: 10, assists: 5 },
      { playerId: 11, steals: 3 },
    ];

    const result = await saveBasketballStatsBulk(1, scores);

    expect(result).toEqual({ success: true, statsIds: ["id-1", "id-2"] });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("returns VALIDATION_ERROR for an empty scores array without calling authMutate", async () => {
    const result = await saveBasketballStatsBulk(1, []);

    expect(mockAuthMutate).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.VALIDATION_ERROR,
      message: "No stats provided",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("passes the gameId and per-player stat fields to the mutation", async () => {
    mockMutateSuccess("saveBasketballStatsBulk", "SaveBasketballStatsBulkResponse", makeBoxScoresFields(["id-1"]));

    const scores: SaveBasketballStatsData[] = [
      { playerId: 10, assists: 4, blocks: 2 },
    ];

    await saveBasketballStatsBulk(42, scores);

    const mutationInput = getMutationInput("saveBasketballStatsBulk");
    expect(mutationInput.gameId).toBe(42);

    const boxScores = mutationInput.stats as Record<string, unknown>[];
    expect(boxScores).toHaveLength(1);
    expect(boxScores[0].playerId).toBe(10);
    expect(boxScores[0].assists).toBe(4);
    expect(boxScores[0].blocks).toBe(2);
    expect("steals" in boxScores[0]).toBe(false);
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Server error");

    const scores: SaveBasketballStatsData[] = [{ playerId: 10 }];
    const result = await saveBasketballStatsBulk(1, scores);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Server error",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const scores: SaveBasketballStatsData[] = [{ playerId: 10 }];
    const result = await saveBasketballStatsBulk(1, scores);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to save basketball stats",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
