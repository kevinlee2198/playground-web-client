import { describe, it, expect, vi, beforeEach } from "vitest";
import { MutationErrorType } from "@/lib/graphql-result";

const { mockAuthMutate } = vi.hoisted(() => ({
  mockAuthMutate: vi.fn(),
}));

vi.mock("@/lib/graphql-request", () => ({
  authMutate: mockAuthMutate,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import {
  requestProfilePictureUpload,
  requestGameMediaUpload,
  requestChatMediaUpload,
  confirmUpload,
  confirmGameMediaUpload,
  deleteResource,
} from "@/app/[locale]/upload/actions";
import { mutationErrorShape } from "../../helpers/mutation-error";
import { validateOperation } from "../../helpers/schema-contract";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockMutateSuccess(
  key: string,
  typeName: string,
  fields: Record<string, unknown> = {},
) {
  mockAuthMutate.mockResolvedValueOnce({
    data: { [key]: { __typename: typeName, ...fields } },
  });
}

function mockMutateGraphqlError(message: string) {
  mockAuthMutate.mockResolvedValueOnce({
    data: {},
    errors: [{ message }],
  });
}

function mockMutateUnionError(
  key: string,
  errorTypeName: string,
  message: string,
) {
  mockAuthMutate.mockResolvedValueOnce({
    data: { [key]: { __typename: errorTypeName, message } },
  });
}

function mockMutateNetworkError() {
  mockAuthMutate.mockRejectedValueOnce(new Error("Network failure"));
}

// ---------------------------------------------------------------------------
// requestProfilePictureUpload
// ---------------------------------------------------------------------------

describe("requestProfilePictureUpload", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success with uploadUrl and resourceId", async () => {
    mockMutateSuccess("requestUpload", "RequestUploadResponse", {
      uploadUrl: "https://storage.example.com/upload",
      resourceId: "res-abc",
      uploadHeaders: [],
    });

    const result = await requestProfilePictureUpload("avatar.png", "image/png", 2048);

    expect(result).toEqual({
      success: true,
      uploadUrl: "https://storage.example.com/upload",
      resourceId: "res-abc",
      uploadHeaders: [],
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns uploadHeaders on success", async () => {
    const uploadHeaders = [
      { name: "content-type", value: "image/png" },
      { name: "if-none-match", value: "*" },
    ];
    mockMutateSuccess("requestUpload", "RequestUploadResponse", {
      uploadUrl: "https://storage.example.com/upload",
      resourceId: "res-abc",
      uploadHeaders,
    });

    const result = await requestProfilePictureUpload("avatar.png", "image/png", 2048);

    expect(result).toMatchObject({ success: true, uploadHeaders });
  });

  it("selects uploadHeaders on requestUpload", async () => {
    mockMutateGraphqlError("ignored");

    await requestProfilePictureUpload("avatar.png", "image/png", 2048);

    const selection = mockAuthMutate.mock.calls[0][0];
    expect(validateOperation("mutation", selection)).toEqual([]);
    expect(JSON.stringify(selection)).toContain("uploadHeaders");
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Unauthorized");

    const result = await requestProfilePictureUpload("avatar.png", "image/png", 2048);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Unauthorized",
      code: null,
      isAuthorizationError: false,
      retryAfterSeconds: null,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("requestUpload", "UploadTargetNotFoundError", "Target not found");

    const result = await requestProfilePictureUpload("avatar.png", "image/png", 2048);

    expect(result).toEqual({
      success: false,
      errorType: "UploadTargetNotFoundError",
      message: "Target not found",
      code: null,
      isAuthorizationError: false,
      retryAfterSeconds: null,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("selects field, code and retryAfterSeconds on requestUpload", async () => {
    mockMutateGraphqlError("ignored");

    await requestProfilePictureUpload("avatar.png", "image/png", 2048);

    const selection = mockAuthMutate.mock.calls[0][0];
    expect(validateOperation("mutation", selection)).toEqual([]);
    const rendered = JSON.stringify(selection);
    expect(rendered).toContain("retryAfterSeconds");
    expect(rendered).toContain("code");
  });

  it("returns code for InvalidInputError", async () => {
    mockMutateSuccess("requestUpload", "InvalidInputError", {
      message: "Too big",
      field: "size",
      code: "FILE_TOO_LARGE",
    });

    const result = await requestProfilePictureUpload("avatar.png", "image/png", 2048);

    expect(result).toEqual({
      success: false,
      errorType: "InvalidInputError",
      message: "Too big",
      code: "FILE_TOO_LARGE",
      isAuthorizationError: false,
      retryAfterSeconds: null,
    });
  });

  it("returns retryAfterSeconds for RateLimitedError", async () => {
    mockMutateSuccess("requestUpload", "RateLimitedError", {
      message: "Slow down",
      retryAfterSeconds: 42,
    });

    const result = await requestProfilePictureUpload("avatar.png", "image/png", 2048);

    expect(result).toEqual({
      success: false,
      errorType: "RateLimitedError",
      message: "Slow down",
      code: null,
      isAuthorizationError: false,
      retryAfterSeconds: 42,
    });
  });

  it("flags UploadNotPermittedError as an authorization error", async () => {
    mockMutateSuccess("requestUpload", "UploadNotPermittedError", {
      message: "No",
      authorizationErrorType: "UploadNotPermittedError",
    });

    const result = await requestProfilePictureUpload("avatar.png", "image/png", 2048);

    expect(result).toEqual({
      success: false,
      errorType: "UploadNotPermittedError",
      message: "No",
      code: null,
      isAuthorizationError: true,
      retryAfterSeconds: null,
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await requestProfilePictureUpload("avatar.png", "image/png", 2048);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to request upload",
      code: null,
      isAuthorizationError: false,
      retryAfterSeconds: null,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// requestGameMediaUpload
// ---------------------------------------------------------------------------

describe("requestGameMediaUpload", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success with uploadUrl and resourceId", async () => {
    mockMutateSuccess("requestUpload", "RequestUploadResponse", {
      uploadUrl: "https://storage.example.com/game-upload",
      resourceId: "res-game-1",
    });

    const result = await requestGameMediaUpload("photo.jpg", "image/jpeg", 4096, 42);

    expect(result).toEqual({
      success: true,
      uploadUrl: "https://storage.example.com/game-upload",
      resourceId: "res-game-1",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("includes gameId in the mutation input context", async () => {
    mockMutateSuccess("requestUpload", "RequestUploadResponse", {
      uploadUrl: "https://storage.example.com/game-upload",
      resourceId: "res-game-2",
    });

    await requestGameMediaUpload("photo.jpg", "image/jpeg", 4096, 99);

    const callArg = mockAuthMutate.mock.calls[0][0] as Record<string, unknown>;
    const input = (
      callArg.requestUpload as { __args: { input: Record<string, unknown> } }
    ).__args.input;
    expect((input.context as Record<string, unknown>)).toHaveProperty("gameMedia");
    expect(
      ((input.context as Record<string, unknown>).gameMedia as Record<string, unknown>)
    ).toHaveProperty("gameId", 99);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Forbidden");

    const result = await requestGameMediaUpload("photo.jpg", "image/jpeg", 4096, 42);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Forbidden",
      code: null,
      isAuthorizationError: false,
      retryAfterSeconds: null,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("requestUpload", "UnsupportedFileTypeError", "File type not allowed");

    const result = await requestGameMediaUpload("photo.jpg", "image/jpeg", 4096, 42);

    expect(result).toEqual({
      success: false,
      errorType: "UnsupportedFileTypeError",
      message: "File type not allowed",
      code: null,
      isAuthorizationError: false,
      retryAfterSeconds: null,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await requestGameMediaUpload("photo.jpg", "image/jpeg", 4096, 42);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to request upload",
      code: null,
      isAuthorizationError: false,
      retryAfterSeconds: null,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// requestChatMediaUpload
// ---------------------------------------------------------------------------

describe("requestChatMediaUpload", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success with uploadUrl and resourceId", async () => {
    mockMutateSuccess("requestUpload", "RequestUploadResponse", {
      uploadUrl: "https://storage.example.com/chat-upload",
      resourceId: "res-chat-1",
    });

    const result = await requestChatMediaUpload("video.mp4", "video/mp4", 8192, "room-xyz");

    expect(result).toEqual({
      success: true,
      uploadUrl: "https://storage.example.com/chat-upload",
      resourceId: "res-chat-1",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("includes chatRoomId in the mutation input context", async () => {
    mockMutateSuccess("requestUpload", "RequestUploadResponse", {
      uploadUrl: "https://storage.example.com/chat-upload",
      resourceId: "res-chat-2",
    });

    await requestChatMediaUpload("video.mp4", "video/mp4", 8192, "room-abc");

    const callArg = mockAuthMutate.mock.calls[0][0] as Record<string, unknown>;
    const input = (
      callArg.requestUpload as { __args: { input: Record<string, unknown> } }
    ).__args.input;
    expect((input.context as Record<string, unknown>)).toHaveProperty("chatMedia");
    expect(
      ((input.context as Record<string, unknown>).chatMedia as Record<string, unknown>)
    ).toHaveProperty("chatRoomId", "room-abc");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Not authenticated");

    const result = await requestChatMediaUpload("video.mp4", "video/mp4", 8192, "room-xyz");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Not authenticated",
      code: null,
      isAuthorizationError: false,
      retryAfterSeconds: null,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("requestUpload", "ChatRoomNotFoundError", "Chat room does not exist");

    const result = await requestChatMediaUpload("video.mp4", "video/mp4", 8192, "room-xyz");

    expect(result).toEqual({
      success: false,
      errorType: "ChatRoomNotFoundError",
      message: "Chat room does not exist",
      code: null,
      isAuthorizationError: false,
      retryAfterSeconds: null,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await requestChatMediaUpload("video.mp4", "video/mp4", 8192, "room-xyz");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to request upload",
      code: null,
      isAuthorizationError: false,
      retryAfterSeconds: null,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// confirmUpload
// ---------------------------------------------------------------------------

describe("confirmUpload", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockResource = {
    __typename: "ImageResource",
    id: "res-confirm-1",
    filename: "photo.jpg",
    size: 1024,
    mimeType: "image/jpeg",
    downloadUrl: "https://storage.example.com/photo.jpg",
    createdDate: "2025-01-01",
    width: 800,
    height: 600,
    thumbnailUrl: "https://storage.example.com/thumb.jpg",
  };

  it("returns success with resource on confirmation", async () => {
    mockMutateSuccess("confirmUpload", "ConfirmUploadResponse", {
      resource: mockResource,
    });

    const result = await confirmUpload("res-confirm-1");

    expect(result).toEqual({
      success: true,
      resource: mockResource,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Resource not found");

    const result = await confirmUpload("res-missing");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Resource not found",
      rejectionReason: null,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("confirmUpload", "ResourceNotFoundError", "Upload resource missing");

    const result = await confirmUpload("res-bad");

    expect(result).toEqual({
      ...mutationErrorShape("ResourceNotFoundError", "Upload resource missing"),
      rejectionReason: null,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await confirmUpload("res-confirm-1");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to confirm upload",
      rejectionReason: null,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// confirmGameMediaUpload
// ---------------------------------------------------------------------------

describe("confirmGameMediaUpload", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockGameMedia = {
    id: "gm-1",
    game: { id: 42 },
    resource: {
      __typename: "ImageResource",
      id: "res-gm-1",
      filename: "game-photo.jpg",
      size: 2048,
      mimeType: "image/jpeg",
      downloadUrl: "https://storage.example.com/game-photo.jpg",
      createdDate: "2025-01-01",
      width: 1920,
      height: 1080,
      thumbnailUrl: "https://storage.example.com/game-thumb.jpg",
    },
    createdDate: "2025-01-01",
    uploader: { id: 1 },
  };

  it("returns success with gameMedia on confirmation", async () => {
    mockMutateSuccess("confirmGameMediaUpload", "ConfirmGameMediaUploadResponse", {
      gameMedia: mockGameMedia,
    });

    const result = await confirmGameMediaUpload("res-gm-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.gameMedia).toBeDefined();
    }
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Resource not found");

    const result = await confirmGameMediaUpload("res-missing");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Resource not found",
      rejectionReason: null,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("confirmGameMediaUpload", "ResourceNotFoundError", "Upload resource missing");

    const result = await confirmGameMediaUpload("res-bad");

    expect(result).toEqual({
      ...mutationErrorShape("ResourceNotFoundError", "Upload resource missing"),
      rejectionReason: null,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type for GameNotFoundError", async () => {
    mockMutateUnionError("confirmGameMediaUpload", "GameNotFoundError", "Game not found");

    const result = await confirmGameMediaUpload("res-bad");

    expect(result).toEqual({
      ...mutationErrorShape("GameNotFoundError", "Game not found"),
      rejectionReason: null,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await confirmGameMediaUpload("res-gm-1");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to confirm game media upload",
      rejectionReason: null,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deleteResource
// ---------------------------------------------------------------------------

describe("deleteResource", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success on deletion", async () => {
    mockMutateSuccess("deleteResource", "DeleteResourceResponse", { id: "res-del-1" });

    const result = await deleteResource("res-del-1");

    expect(result).toEqual({ success: true });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Forbidden");

    const result = await deleteResource("res-del-1");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Forbidden",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("deleteResource", "ResourceNotFoundError", "Resource does not exist");

    const result = await deleteResource("res-del-1");

    expect(result).toEqual({
      success: false,
      errorType: "ResourceNotFoundError",
      message: "Resource does not exist",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await deleteResource("res-del-1");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to delete resource",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("UploadRejectedError on confirm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("selects reason on UploadRejectedError for confirmUpload and confirmGameMediaUpload", async () => {
    mockMutateGraphqlError("ignored");
    mockMutateGraphqlError("ignored");

    await confirmUpload("res-1");
    await confirmGameMediaUpload("res-1");

    for (const [selection] of mockAuthMutate.mock.calls) {
      expect(validateOperation("mutation", selection)).toEqual([]);
      expect(JSON.stringify(selection)).toContain("UploadRejectedError");
      expect(JSON.stringify(selection)).toContain("reason");
    }
  });

  it("returns rejectionReason CONTENT_MISMATCH", async () => {
    mockMutateSuccess("confirmUpload", "UploadRejectedError", {
      message: "bad bytes",
      reason: "CONTENT_MISMATCH",
    });
    mockMutateSuccess("confirmGameMediaUpload", "UploadRejectedError", {
      message: "bad bytes",
      reason: "CONTENT_MISMATCH",
    });

    const profile = await confirmUpload("res-1");
    const game = await confirmGameMediaUpload("res-1");

    expect(profile).toMatchObject({
      success: false,
      errorType: "UploadRejectedError",
      rejectionReason: "CONTENT_MISMATCH",
    });
    expect(game).toMatchObject({
      success: false,
      errorType: "UploadRejectedError",
      rejectionReason: "CONTENT_MISMATCH",
    });
  });
});
