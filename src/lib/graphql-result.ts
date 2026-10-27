/**
 * Typed result types for GraphQL mutations that return union result types.
 *
 * Usage:
 * 1. Request `__typename: true` and `__on: [{ __typeName: "XxxResponse", ...fields }, errorFragment]`
 * 2. Call `extractMutationResult(response.data.mutationName, "XxxResponse")`
 * 3. Check `.success` to discriminate
 */

import { ErrorClassification } from "./graphql-error-classification";
import type { GraphQLError } from "./graphql-request";

export enum MutationErrorType {
  GRAPHQL_ERROR = "GRAPHQL_ERROR",
  UNEXPECTED_ERROR = "UNEXPECTED_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
}

export type MutationSuccess<T> = { success: true; data: T };
export type MutationError = {
  success: false;
  errorType: string;
  message: string;
  isAuthorizationError: boolean;
  field: string | null;
  code: string | null;
};
export type MutationResult<T> = MutationSuccess<T> | MutationError;

/**
 * Extracts a typed result from a GraphQL union response.
 *
 * If `result.__typename` matches `successTypeName`, returns `{ success: true, data }`.
 * Otherwise returns an error carrying `errorType`, `message`, `isAuthorizationError`
 * (when `authorizationErrorType` was selected) and the `field`/`code` of an InvalidInputError.
 */
export function extractMutationResult<
  T extends {
    __typename: string;
    message?: string;
    authorizationErrorType?: string | null;
    field?: string | null;
    code?: string | null;
  },
>(result: T, successTypeName: string): MutationResult<T> {
  if (result.__typename === successTypeName) {
    return { success: true, data: result };
  }

  return {
    success: false,
    errorType: result.__typename,
    message: result.message ?? "An unexpected error occurred",
    isAuthorizationError: result.authorizationErrorType != null,
    field: result.field ?? null,
    code: result.code ?? null,
  };
}

/** Builds a MutationError from top-level GraphQL errors (FORBIDDEN means authorization). */
export function mutationErrorFromGraphQLErrors(
  errors: GraphQLError[],
): MutationError {
  return {
    success: false,
    errorType: MutationErrorType.GRAPHQL_ERROR,
    message: errors[0].message,
    isAuthorizationError: errors.some(
      (e) => e.extensions?.classification === ErrorClassification.FORBIDDEN,
    ),
    field: null,
    code: null,
  };
}
