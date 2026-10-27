/** Expected shape of an error produced by `extractMutationResult` for a typed error with no extra fields. */
export function mutationErrorShape(errorType: string, message: string) {
  return {
    success: false,
    errorType,
    message,
    isAuthorizationError: false,
    field: null,
    code: null,
  };
}
