"use server";

import type { Edge, PageInfo } from "@/lib/graphql-connection";
import {
  errorFragment,
  gameInvitationFragment,
} from "@/lib/graphql-fragments";
import { authMutate, authQuery } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";
import type {
  GameInvitation,
  InvitationActionResult,
  SendInvitationResult,
  SendInvitationsResult,
} from "@/lib/types/game-invitation";
import { EnumType } from "json-to-graphql-query";
import { revalidatePath } from "next/cache";

/**
 * Send a single game invitation to a user
 */
export async function sendGameInvitation(
  gameId: number,
  userId: string,
): Promise<SendInvitationResult> {
  try {
    const response = await authMutate({
      sendGameInvitation: {
        __args: { input: { gameId, userId } },
        __typename: true,
        __on: [
          {
            __typeName: "SendGameInvitationResponse",
            invitation: { id: true, status: true },
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.sendGameInvitation, "SendGameInvitationResponse");
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, invitation: result.data.invitation };
  } catch (error) {
    console.error("Failed to send game invitation:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to send invitation" };
  }
}

/**
 * Send bulk game invitations to multiple users
 */
export async function sendGameInvitations(
  gameId: number,
  userIds: string[],
): Promise<SendInvitationsResult> {
  try {
    const response = await authMutate({
      sendGameInvitations: {
        __args: { input: { gameId, userIds } },
        __typename: true,
        __on: [
          {
            __typeName: "SendGameInvitationsResponse",
            results: {
              userId: true,
              invitation: { id: true, status: true },
              error: { message: true },
            },
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.sendGameInvitations, "SendGameInvitationsResponse");
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, results: result.data.results };
  } catch (error) {
    console.error("Failed to send game invitations:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to send invitations" };
  }
}

/**
 * Accept a game invitation (invitee action)
 */
export async function acceptGameInvitation(
  invitationId: string,
): Promise<InvitationActionResult> {
  try {
    const response = await authMutate({
      acceptGameInvitation: {
        __args: { input: { invitationId } },
        __typename: true,
        __on: [
          {
            __typeName: "AcceptGameInvitationResponse",
            invitation: { id: true, status: true },
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.acceptGameInvitation, "AcceptGameInvitationResponse");
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true };
  } catch (error) {
    console.error("Failed to accept game invitation:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to accept invitation" };
  }
}

/**
 * Decline a game invitation (invitee action)
 */
export async function declineGameInvitation(
  invitationId: string,
): Promise<InvitationActionResult> {
  try {
    const response = await authMutate({
      declineGameInvitation: {
        __args: { input: { invitationId } },
        __typename: true,
        __on: [
          {
            __typeName: "DeclineGameInvitationResponse",
            id: true,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.declineGameInvitation, "DeclineGameInvitationResponse");
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true };
  } catch (error) {
    console.error("Failed to decline game invitation:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to decline invitation" };
  }
}

/**
 * Cancel a game invitation (organizer action)
 */
export async function cancelGameInvitation(
  invitationId: string,
): Promise<InvitationActionResult> {
  try {
    const response = await authMutate({
      cancelGameInvitation: {
        __args: { input: { invitationId } },
        __typename: true,
        __on: [
          {
            __typeName: "CancelGameInvitationResponse",
            invitation: { id: true, status: true },
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.cancelGameInvitation, "CancelGameInvitationResponse");
    if (!result.success) return result;

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true };
  } catch (error) {
    console.error("Failed to cancel game invitation:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to cancel invitation" };
  }
}

/**
 * Load invitations for a game via the Game.invitations nested connection field.
 * Only managers (owner/editor) see results; non-managers get an empty connection.
 */
export async function loadGameInvitations(
  gameId: number,
  status?: string,
  first = 50,
  after?: string,
): Promise<{
  edges: Edge<GameInvitation>[];
  pageInfo: PageInfo;
} | null> {
  try {
    const invitationArgs: Record<string, unknown> = { first };
    if (status) invitationArgs.status = new EnumType(status);
    if (after) invitationArgs.after = after;

    const response = await authQuery({
      game: {
        __args: { id: gameId },
        invitations: {
          __args: invitationArgs,
          edges: {
            cursor: true,
            node: gameInvitationFragment,
          },
          pageInfo: {
            hasNextPage: true,
            endCursor: true,
          },
        },
      },
    });

    if (response.errors?.length > 0) return null;
    return response.data?.game?.invitations ?? null;
  } catch (error) {
    console.error("Failed to load game invitations:", error);
    return null;
  }
}
