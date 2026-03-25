"use server";

import { gameMediaFragment, normalizeGameMedia } from "@/lib/graphql-fragments";
import { authMutate, authQuery } from "@/lib/graphql-request";
import { MutationErrorType } from "@/lib/graphql-result";
import type {
  AddGameMediaLinkActionResult,
  DeleteGameMediaActionResult,
  ResolveUrlActionResult,
} from "@/lib/types/game-media";

export async function resolveUrl(
  url: string,
  gameId: number,
): Promise<ResolveUrlActionResult> {
  try {
    const response = await authQuery({
      resolveUrl: {
        __args: { input: { url, gameId } },
        __typename: true,
        __on: [
          {
            __typeName: "ResolveUrlResponse",
            type: true,
            source: true,
            resolvedUrl: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            embedUrl: true,
            embedWidth: true,
            embedHeight: true,
          },
          { __typeName: "GameNotFoundError", message: true },
          {
            __typeName: "DuplicateMediaError",
            message: true,
            existingGameMediaId: true,
          },
          { __typeName: "UrlResolutionError", message: true, errorCode: true },
          {
            __typeName: "RateLimitedError",
            message: true,
            retryAfterSeconds: true,
          },
          { __typeName: "GameNotInProgressError", message: true },
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

    const raw = response.data?.resolveUrl;
    if (!raw) {
      return {
        success: false,
        errorType: MutationErrorType.UNEXPECTED_ERROR,
        message: "No response from server",
      };
    }

    switch (raw.__typename) {
      case "ResolveUrlResponse":
        return {
          success: true,
          data: {
            type: raw.type,
            source: raw.source,
            resolvedUrl: raw.resolvedUrl,
            title: raw.title ?? null,
            description: raw.description ?? null,
            thumbnailUrl: raw.thumbnailUrl ?? null,
            embedUrl: raw.embedUrl ?? null,
            embedWidth: raw.embedWidth ?? null,
            embedHeight: raw.embedHeight ?? null,
          },
        };
      case "DuplicateMediaError":
        return {
          success: false,
          errorType: raw.__typename,
          message: raw.message,
          existingGameMediaId: raw.existingGameMediaId,
        };
      case "UrlResolutionError":
        return {
          success: false,
          errorType: raw.__typename,
          message: raw.message,
          errorCode: raw.errorCode,
        };
      case "RateLimitedError":
        return {
          success: false,
          errorType: raw.__typename,
          message: raw.message,
          retryAfterSeconds: raw.retryAfterSeconds,
        };
      case "GameNotFoundError":
      case "GameNotInProgressError":
        return {
          success: false,
          errorType: raw.__typename,
          message: raw.message,
        };
      default:
        return {
          success: false,
          errorType: MutationErrorType.UNEXPECTED_ERROR,
          message: "Unexpected response from server",
        };
    }
  } catch (error) {
    console.error("Failed to resolve URL:", error);
    return {
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to resolve URL",
    };
  }
}

export async function addGameMediaLink(
  url: string,
  gameId: number,
): Promise<AddGameMediaLinkActionResult> {
  try {
    const response = await authMutate({
      addGameMediaLink: {
        __args: { input: { gameId, url } },
        __typename: true,
        __on: [
          {
            __typeName: "AddGameMediaLinkResponse",
            gameMedia: gameMediaFragment,
          },
          {
            __typeName: "DuplicateMediaError",
            message: true,
            existingGameMediaId: true,
          },
          {
            __typeName: "RateLimitedError",
            message: true,
            retryAfterSeconds: true,
          },
          { __typeName: "GameNotFoundError", message: true },
          { __typeName: "GameNotInProgressError", message: true },
          { __typeName: "UrlResolutionError", message: true, errorCode: true },
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

    const raw = response.data?.addGameMediaLink;
    if (!raw) {
      return {
        success: false,
        errorType: MutationErrorType.UNEXPECTED_ERROR,
        message: "No response from server",
      };
    }

    switch (raw.__typename) {
      case "AddGameMediaLinkResponse":
        return {
          success: true,
          gameMedia: normalizeGameMedia(raw.gameMedia),
        };
      case "DuplicateMediaError":
        return {
          success: false,
          errorType: raw.__typename,
          message: raw.message,
          existingGameMediaId: raw.existingGameMediaId,
        };
      case "RateLimitedError":
        return {
          success: false,
          errorType: raw.__typename,
          message: raw.message,
          retryAfterSeconds: raw.retryAfterSeconds,
        };
      case "UrlResolutionError":
        return {
          success: false,
          errorType: raw.__typename,
          errorCode: raw.errorCode,
          message: raw.message,
        };
      case "GameNotFoundError":
      case "GameNotInProgressError":
        return {
          success: false,
          errorType: raw.__typename,
          message: raw.message,
        };
      default:
        return {
          success: false,
          errorType: MutationErrorType.UNEXPECTED_ERROR,
          message: "Unexpected response from server",
        };
    }
  } catch (error) {
    console.error("Failed to add game media link:", error);
    return {
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to add media link",
    };
  }
}

export async function deleteGameMedia(
  id: string,
): Promise<DeleteGameMediaActionResult> {
  try {
    const response = await authMutate({
      deleteGameMedia: {
        __args: { input: { id } },
        __typename: true,
        __on: [
          { __typeName: "DeleteGameMediaResponse", id: true },
          { __typeName: "GameMediaNotFoundError", message: true },
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

    const raw = response.data?.deleteGameMedia;
    if (!raw) {
      return {
        success: false,
        errorType: MutationErrorType.UNEXPECTED_ERROR,
        message: "No response from server",
      };
    }

    switch (raw.__typename) {
      case "DeleteGameMediaResponse":
        return { success: true };
      case "GameMediaNotFoundError":
        return {
          success: false,
          errorType: raw.__typename,
          message: raw.message,
        };
      default:
        return {
          success: false,
          errorType: MutationErrorType.UNEXPECTED_ERROR,
          message: "Unexpected response from server",
        };
    }
  } catch (error) {
    console.error("Failed to delete game media:", error);
    return {
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to delete media",
    };
  }
}
