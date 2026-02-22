"use server";

import { resourceFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import type { Resource } from "@/lib/types/resource";

interface RequestUploadResult {
  success: boolean;
  uploadUrl?: string | null;
  resourceId?: string;
  error?: string;
}

interface ConfirmUploadResult {
  success: boolean;
  resource?: Resource;
  error?: string;
}

interface DeleteResourceResult {
  success: boolean;
  error?: string;
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
        uploadUrl: true,
        resourceId: true,
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    return {
      success: true,
      uploadUrl: response.data.requestUpload.uploadUrl,
      resourceId: response.data.requestUpload.resourceId,
    };
  } catch {
    return { success: false, error: "Failed to request upload" };
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
        uploadUrl: true,
        resourceId: true,
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    return {
      success: true,
      uploadUrl: response.data.requestUpload.uploadUrl,
      resourceId: response.data.requestUpload.resourceId,
    };
  } catch {
    return { success: false, error: "Failed to request upload" };
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
        uploadUrl: true,
        resourceId: true,
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    return {
      success: true,
      uploadUrl: response.data.requestUpload.uploadUrl,
      resourceId: response.data.requestUpload.resourceId,
    };
  } catch {
    return { success: false, error: "Failed to request upload" };
  }
}

export async function confirmUpload(
  resourceId: string,
): Promise<ConfirmUploadResult> {
  try {
    const response = await authMutate({
      confirmUpload: {
        __args: { input: { resourceId } },
        resource: resourceFragment,
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    return {
      success: true,
      resource: response.data.confirmUpload.resource,
    };
  } catch {
    return { success: false, error: "Failed to confirm upload" };
  }
}

export async function deleteResource(
  resourceId: string,
): Promise<DeleteResourceResult> {
  try {
    const response = await authMutate({
      deleteResource: {
        __args: { input: { resourceId } },
        id: true,
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete resource" };
  }
}
