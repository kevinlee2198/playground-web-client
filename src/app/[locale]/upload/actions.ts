"use server";

import { errorFragment, gameMediaFragment, normalizeGameMedia, resourceFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";
import type { GameMediaNode } from "@/lib/types/game-media";
import type { Resource } from "@/lib/types/resource";
import { z } from "zod";

interface RequestUploadResult {
  success: boolean;
  uploadUrl?: string | null;
  resourceId?: string;
  errorType?: string;
  message?: string;
}

export type ConfirmUploadResult =
  | { success: true; resource: Resource }
  | { success: false; errorType: string; message: string };

export type ConfirmGameMediaUploadResult =
  | { success: true; gameMedia: GameMediaNode }
  | { success: false; errorType: string; message: string };

interface DeleteResourceResult {
  success: boolean;
  errorType?: string;
  message?: string;
}

const uploadInputSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(127),
  size: z.number().int().positive(),
});

async function requestUpload(
  filename: string,
  mimeType: string,
  size: number,
  context: Record<string, unknown>,
): Promise<RequestUploadResult> {
  try {
    const validated = uploadInputSchema.parse({ filename, mimeType, size });
    const response = await authMutate({
      requestUpload: {
        __args: {
          input: { ...validated, context },
        },
        __typename: true,
        __on: [
          { __typeName: "RequestUploadResponse", uploadUrl: true, resourceId: true },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.requestUpload, "RequestUploadResponse");
    if (!result.success) {
      return { success: false, errorType: result.errorType, message: result.message };
    }

    return {
      success: true,
      uploadUrl: result.data.uploadUrl,
      resourceId: result.data.resourceId,
    };
  } catch {
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to request upload" };
  }
}

export async function requestProfilePictureUpload(
  filename: string,
  mimeType: string,
  size: number,
): Promise<RequestUploadResult> {
  return requestUpload(filename, mimeType, size, { userProfilePicture: { placeholder: true } });
}

export async function requestGameMediaUpload(
  filename: string,
  mimeType: string,
  size: number,
  gameId: number,
): Promise<RequestUploadResult> {
  return requestUpload(filename, mimeType, size, { gameMedia: { gameId } });
}

export async function requestChatMediaUpload(
  filename: string,
  mimeType: string,
  size: number,
  chatRoomId: string,
): Promise<RequestUploadResult> {
  return requestUpload(filename, mimeType, size, { chatMedia: { chatRoomId } });
}

export async function confirmUpload(
  resourceId: string,
): Promise<ConfirmUploadResult> {
  try {
    const response = await authMutate({
      confirmUpload: {
        __args: { input: { resourceId } },
        __typename: true,
        __on: [
          { __typeName: "ConfirmUploadResponse", resource: resourceFragment },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return {
        success: false,
        errorType: MutationErrorType.GRAPHQL_ERROR,
        message: response.errors[0].message,
      };
    }

    const result = extractMutationResult(response.data.confirmUpload, "ConfirmUploadResponse");
    if (!result.success) return result;

    return { success: true, resource: result.data.resource };
  } catch {
    return {
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to confirm upload",
    };
  }
}

export async function confirmGameMediaUpload(
  resourceId: string,
): Promise<ConfirmGameMediaUploadResult> {
  try {
    const response = await authMutate({
      confirmGameMediaUpload: {
        __args: { input: { resourceId } },
        __typename: true,
        __on: [
          {
            __typeName: "ConfirmGameMediaUploadResponse",
            gameMedia: gameMediaFragment,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return {
        success: false,
        errorType: MutationErrorType.GRAPHQL_ERROR,
        message: response.errors[0].message,
      };
    }

    const result = extractMutationResult(response.data.confirmGameMediaUpload, "ConfirmGameMediaUploadResponse");
    if (!result.success) return result;

    return { success: true, gameMedia: normalizeGameMedia(result.data.gameMedia) };
  } catch {
    return {
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to confirm game media upload",
    };
  }
}

export async function deleteResource(
  resourceId: string,
): Promise<DeleteResourceResult> {
  try {
    const response = await authMutate({
      deleteResource: {
        __args: { input: { resourceId } },
        __typename: true,
        __on: [
          { __typeName: "DeleteResourceResponse", id: true },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.deleteResource, "DeleteResourceResponse");
    if (!result.success) {
      return { success: false, errorType: result.errorType, message: result.message };
    }

    return { success: true };
  } catch {
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to delete resource" };
  }
}
