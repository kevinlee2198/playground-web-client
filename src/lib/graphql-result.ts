/**
 * Typed result types for GraphQL mutations that return union result types.
 *
 * Usage:
 * 1. Request `__typename: true` and `__on: [{ __typeName: "XxxResponse", ...fields }, errorFragment]`
 * 2. Call `extractMutationResult(response.data.mutationName, "XxxResponse")`
 * 3. Check `.success` to discriminate
 */

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
};
export type MutationResult<T> = MutationSuccess<T> | MutationError;

/**
 * Extracts a typed result from a GraphQL union response.
 *
 * If `result.__typename` matches `successTypeName`, returns `{ success: true, data }`.
 * Otherwise returns `{ success: false, errorType, message }`.
 */
export function extractMutationResult<
  T extends { __typename: string; message?: string },
>(result: T, successTypeName: string): MutationResult<T> {
  if (result.__typename === successTypeName) {
    return { success: true, data: result };
  }

  return {
    success: false,
    errorType: result.__typename,
    message: result.message ?? "An unexpected error occurred",
  };
}
