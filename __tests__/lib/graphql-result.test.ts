import { describe, expect, it } from "vitest";
import type { GraphQLError } from "@/lib/graphql-request";
import {
  extractMutationResult,
  mutationErrorFromGraphQLErrors,
  MutationErrorType,
} from "@/lib/graphql-result";
import { mutationErrorShape } from "../helpers/mutation-error";

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
    expect(result).toEqual(
      mutationErrorShape("UserAlreadyExistsError", "User already exists"),
    );
  });

  it("returns error with fallback message when message is missing", () => {
    const result = extractMutationResult(
      { __typename: "SomeError" },
      "CreateUserResponse",
    );
    expect(result).toEqual(
      mutationErrorShape("SomeError", "An unexpected error occurred"),
    );
  });

  it("flags AuthorizationError implementers", () => {
    const result = extractMutationResult(
      {
        __typename: "InsufficientLeagueRoleError",
        message: "m",
        authorizationErrorType: "InsufficientLeagueRoleError",
      },
      "CreateInviteLinkResponse",
    );
    expect(result).toEqual({
      ...mutationErrorShape("InsufficientLeagueRoleError", "m"),
      isAuthorizationError: true,
    });
  });

  it("carries InvalidInputError field and code", () => {
    const result = extractMutationResult(
      {
        __typename: "InvalidInputError",
        message: "bad",
        field: "measurementUnit",
        code: "NULL_NOT_ALLOWED",
      },
      "CreateInviteLinkResponse",
    );
    expect(result).toEqual({
      ...mutationErrorShape("InvalidInputError", "bad"),
      field: "measurementUnit",
      code: "NULL_NOT_ALLOWED",
    });
  });
});

describe("mutationErrorFromGraphQLErrors", () => {
  const graphQLError = (classification: string): GraphQLError =>
    ({
      message: "boom",
      locations: [],
      path: [],
      extensions: { classification },
    }) as GraphQLError;

  it("maps top-level FORBIDDEN to an authorization error", () => {
    expect(
      mutationErrorFromGraphQLErrors([graphQLError("FORBIDDEN")]),
    ).toEqual({
      ...mutationErrorShape(MutationErrorType.GRAPHQL_ERROR, "boom"),
      isAuthorizationError: true,
    });
  });

  it("keeps non-FORBIDDEN top-level errors non-authorization", () => {
    expect(
      mutationErrorFromGraphQLErrors([graphQLError("BAD_REQUEST")]),
    ).toEqual(mutationErrorShape(MutationErrorType.GRAPHQL_ERROR, "boom"));
  });
});
