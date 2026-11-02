export type UploadFailureReason =
  | "invalidType"
  | "fileTooLarge"
  | "uploadRateLimited"
  | "notPermitted"
  | "targetUnavailable"
  | "targetNotFound";

/** Maps a `requestUpload` failure to the copy key that explains it, or null to fall back to the server message. */
export function uploadFailureReason(failure: {
  errorType: string;
  code: string | null;
  isAuthorizationError: boolean;
}): UploadFailureReason | null {
  if (failure.code === "UNSUPPORTED_FILE_TYPE") return "invalidType";
  if (failure.code === "FILE_TOO_LARGE") return "fileTooLarge";
  if (
    failure.code === "TARGET_NOT_ACCEPTING_MEDIA" ||
    failure.code === "TARGET_READ_ONLY"
  ) {
    return "targetUnavailable";
  }
  if (failure.errorType === "RateLimitedError") return "uploadRateLimited";
  if (failure.isAuthorizationError) return "notPermitted";
  if (failure.errorType === "UploadTargetNotFoundError") return "targetNotFound";
  return null;
}

export type ProfilePictureFailureReason = Extract<
  UploadFailureReason,
  "invalidType" | "fileTooLarge" | "uploadRateLimited"
>;

/**
 * `profile.picture.errors` only has copy for these reasons and `t` is not key-typed,
 * so any other reason must fall back to the server message rather than a missing key.
 */
export function profilePictureFailureReason(failure: {
  errorType: string;
  code: string | null;
  isAuthorizationError: boolean;
}): ProfilePictureFailureReason | null {
  const reason = uploadFailureReason(failure);
  return reason === "invalidType" ||
    reason === "fileTooLarge" ||
    reason === "uploadRateLimited"
    ? reason
    : null;
}
