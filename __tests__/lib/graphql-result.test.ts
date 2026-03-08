import { describe, expect, it } from "vitest";
import { extractMutationResult } from "@/lib/graphql-result";

describe("extractMutationResult", () => {
  it("returns success when __typename matches", () => {
    const result = extractMutationResult(
      { __typename: "CreatePlayerResponse", player: { id: "1" } },
      "CreatePlayerResponse",
    );
    expect(result).toEqual({
      success: true,
      data: { __typename: "CreatePlayerResponse", player: { id: "1" } },
    });
  });

  it("returns error when __typename does not match", () => {
    const result = extractMutationResult(
      { __typename: "PlayerAlreadyExistsError", message: "Player already exists" },
      "CreatePlayerResponse",
    );
    expect(result).toEqual({
      success: false,
      errorType: "PlayerAlreadyExistsError",
      message: "Player already exists",
    });
  });

  it("returns error with fallback message when message is missing", () => {
    const result = extractMutationResult(
      { __typename: "SomeError" },
      "CreatePlayerResponse",
    );
    expect(result).toEqual({
      success: false,
      errorType: "SomeError",
      message: "An unexpected error occurred",
    });
  });
});
