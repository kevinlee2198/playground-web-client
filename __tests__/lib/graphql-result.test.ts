import { describe, expect, it } from "vitest";
import { extractMutationResult } from "@/lib/graphql-result";

describe("extractMutationResult", () => {
  it("returns success when __typename matches", () => {
    const result = extractMutationResult(
      { __typename: "CreateUserResponse", user: { id: "1" } },
      "CreateUserResponse",
    );
    expect(result).toEqual({
      success: true,
      data: { __typename: "CreateUserResponse", user: { id: "1" } },
    });
  });

  it("returns error when __typename does not match", () => {
    const result = extractMutationResult(
      { __typename: "UserAlreadyExistsError", message: "User already exists" },
      "CreateUserResponse",
    );
    expect(result).toEqual({
      success: false,
      errorType: "UserAlreadyExistsError",
      message: "User already exists",
    });
  });

  it("returns error with fallback message when message is missing", () => {
    const result = extractMutationResult(
      { __typename: "SomeError" },
      "CreateUserResponse",
    );
    expect(result).toEqual({
      success: false,
      errorType: "SomeError",
      message: "An unexpected error occurred",
    });
  });
});
