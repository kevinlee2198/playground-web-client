import { describe, expect, it } from "vitest";
import { profilePictureFailureReason, uploadFailureReason } from "@/lib/upload-errors";

function failure(
  overrides: Partial<{ errorType: string; code: string | null; isAuthorizationError: boolean }> = {},
) {
  return { errorType: "SomeError", code: null, isAuthorizationError: false, ...overrides };
}

describe("uploadFailureReason", () => {
  it.each([
    [{ errorType: "InvalidInputError", code: "UNSUPPORTED_FILE_TYPE" }, "invalidType"],
    [{ errorType: "InvalidInputError", code: "FILE_TOO_LARGE" }, "fileTooLarge"],
    [{ errorType: "InvalidInputError", code: "TARGET_NOT_ACCEPTING_MEDIA" }, "targetUnavailable"],
    [{ errorType: "InvalidInputError", code: "TARGET_READ_ONLY" }, "targetUnavailable"],
    [{ errorType: "RateLimitedError" }, "uploadRateLimited"],
    [{ errorType: "UploadNotPermittedError", isAuthorizationError: true }, "notPermitted"],
    [{ errorType: "UploadTargetNotFoundError" }, "targetNotFound"],
  ])("maps %o to %s", (overrides, reason) => {
    expect(uploadFailureReason(failure(overrides))).toBe(reason);
  });

  it("returns null for an unknown InvalidInputError code", () => {
    expect(uploadFailureReason(failure({ errorType: "InvalidInputError", code: "SOMETHING_NEW" }))).toBeNull();
  });

  it("returns null for an unrecognised error", () => {
    expect(uploadFailureReason(failure())).toBeNull();
  });
});

describe("profilePictureFailureReason", () => {
  it.each(["invalidType", "fileTooLarge", "uploadRateLimited"] as const)("keeps %s", (reason) => {
    const input = {
      invalidType: failure({ errorType: "InvalidInputError", code: "UNSUPPORTED_FILE_TYPE" }),
      fileTooLarge: failure({ errorType: "InvalidInputError", code: "FILE_TOO_LARGE" }),
      uploadRateLimited: failure({ errorType: "RateLimitedError" }),
    }[reason];
    expect(profilePictureFailureReason(input)).toBe(reason);
  });

  it.each([
    failure({ isAuthorizationError: true }),
    failure({ errorType: "UploadTargetNotFoundError" }),
    failure({ errorType: "InvalidInputError", code: "TARGET_READ_ONLY" }),
    failure(),
  ])("returns null for reasons without profile picture copy: %o", (input) => {
    expect(profilePictureFailureReason(input)).toBeNull();
  });
});
