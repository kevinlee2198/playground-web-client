import { describe, expect, it } from "vitest";
import messages from "../../messages/en.json";
import {
  profilePictureFailureReason,
  uploadFailureReason,
  type UploadFailureReason,
} from "@/lib/upload-errors";

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

describe("copy for every reason", () => {
  // Record keys force this list to match UploadFailureReason at compile time.
  const reasons: Record<UploadFailureReason, true> = {
    invalidType: true,
    fileTooLarge: true,
    uploadRateLimited: true,
    notPermitted: true,
    targetUnavailable: true,
    targetNotFound: true,
  };
  const profileReasons = ["invalidType", "fileTooLarge", "uploadRateLimited"];

  it.each([
    ["game.media.errors", messages.game.media.errors],
    ["chat.media.errors", messages.chat.media.errors],
  ])("%s has a string for every reason", (_path, errors) => {
    for (const reason of Object.keys(reasons)) {
      expect(typeof (errors as Record<string, unknown>)[reason]).toBe("string");
    }
  });

  it("profile.picture.errors has a string for each profile reason", () => {
    for (const reason of profileReasons) {
      expect(typeof (messages.profile.picture.errors as Record<string, unknown>)[reason]).toBe("string");
    }
  });
});
