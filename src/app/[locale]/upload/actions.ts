"use server";

import { errorFragment, resourceFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";
import type { Resource } from "@/lib/types/resource";

interface RequestUploadResult {
  success: boolean;
  uploadUrl?: string | null;
  resourceId?: string;
  errorType?: string;
  message?: string;
}

interface ConfirmUploadResult {
  success: boolean;
  resource?: Resource;
  errorType?: string;
  message?: string;
}

interface DeleteResourceResult {
  success: boolean;
  errorType?: string;
  message?: string;
}

export async function requestProfilePictureUpload(
  filename: string,
  mimeType: string,
  size: number,
): Promise<RequestUploadResult> {
  try {
    const response = await authMutate({
      requestUpload: {
        __args: {
          input: {
            filename,
            mimeType,
            size,
            context: {
              userProfilePicture: { placeholder: true },
            },
          },
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

export async function requestGameMediaUpload(
  filename: string,
  mimeType: string,
  size: number,
  gameId: number,
): Promise<RequestUploadResult> {
  try {
    const response = await authMutate({
      requestUpload: {
        __args: {
          input: {
            filename,
            mimeType,
            size,
            context: {
              gameMedia: { gameId },
            },
          },
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

export async function requestChatMediaUpload(
  filename: string,
  mimeType: string,
  size: number,
  chatRoomId: string,
): Promise<RequestUploadResult> {
  try {
    const response = await authMutate({
      requestUpload: {
        __args: {
          input: {
            filename,
            mimeType,
            size,
            context: {
              chatMedia: { chatRoomId },
            },
          },
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
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.confirmUpload, "ConfirmUploadResponse");
    if (!result.success) {
      return { success: false, errorType: result.errorType, message: result.message };
    }

    return {
      success: true,
      resource: result.data.resource,
    };
  } catch {
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to confirm upload" };
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
