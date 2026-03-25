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
  deleteResource,
} from "@/app/[locale]/upload/actions";

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
    });

    const result = await requestProfilePictureUpload("avatar.png", "image/png", 2048);

    expect(result).toEqual({
      success: true,
      uploadUrl: "https://storage.example.com/upload",
      resourceId: "res-abc",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Unauthorized");

    const result = await requestProfilePictureUpload("avatar.png", "image/png", 2048);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Unauthorized",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("requestUpload", "FileTooLargeError", "File exceeds size limit");

    const result = await requestProfilePictureUpload("avatar.png", "image/png", 2048);

    expect(result).toEqual({
      success: false,
      errorType: "FileTooLargeError",
      message: "File exceeds size limit",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await requestProfilePictureUpload("avatar.png", "image/png", 2048);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to request upload",
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
      kind: "resource",
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
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("confirmUpload", "ResourceNotFoundError", "Upload resource missing");

    const result = await confirmUpload("res-bad");

    expect(result).toEqual({
      success: false,
      errorType: "ResourceNotFoundError",
      message: "Upload resource missing",
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
