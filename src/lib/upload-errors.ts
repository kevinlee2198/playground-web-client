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
export function profilePictureFailureReason(
  failure: Parameters<typeof uploadFailureReason>[0],
): ProfilePictureFailureReason | null {
  const reason = uploadFailureReason(failure);
  return reason === "invalidType" ||
    reason === "fileTooLarge" ||
    reason === "uploadRateLimited"
    ? reason
    : null;
}

export type UploadRejectionReason = "NOT_UPLOADED" | "CONTENT_MISMATCH";

/** Copy key for a confirm-time rejection, or null to fall back to the path's existing message. */
export function uploadRejectionCopyKey(
  reason: UploadRejectionReason | null | undefined,
): "notUploaded" | "contentMismatch" | null {
  if (reason === "NOT_UPLOADED") return "notUploaded";
  if (reason === "CONTENT_MISMATCH") return "contentMismatch";
  return null;
}
