"use server";

import { errorFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";
import type { Player } from "@/lib/types/player";
import { revalidatePath } from "next/cache";

interface CreatePlayerInput {
  age?: number | null;
  height?: number | null;
  weight?: number | null;
}

interface UpdatePlayerInput {
  id: number;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
}

interface PlayerActionResult {
  success: boolean;
  player?: Player;
  errorType?: string;
  message?: string;
}

export async function createPlayer(
  input: CreatePlayerInput,
): Promise<PlayerActionResult> {
  try {
    const response = await authMutate({
      createPlayer: {
        __args: { input },
        __typename: true,
        __on: [
          {
            __typeName: "CreatePlayerResponse",
            player: {
              id: true,
              age: true,
              height: true,
              weight: true,
            },
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

    const result = extractMutationResult(
      response.data.createPlayer,
      "CreatePlayerResponse",
    );
    if (!result.success) return result;

    revalidatePath("/[locale]/player", "page");
    return { success: true, player: result.data.player };
  } catch (error) {
    console.error("Failed to create player:", error);
    return {
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to create player",
    };
  }
}

export async function updatePlayer(
  input: UpdatePlayerInput,
): Promise<PlayerActionResult> {
  try {
    // Build input object with only changed fields
    const mutationInput: Record<string, unknown> = { id: input.id };

    // Only include fields that are explicitly provided
    if ("age" in input) mutationInput.age = input.age;
    if ("height" in input) mutationInput.height = input.height;
    if ("weight" in input) mutationInput.weight = input.weight;

    const response = await authMutate({
      updatePlayer: {
        __args: { input: mutationInput },
        __typename: true,
        __on: [
          {
            __typeName: "UpdatePlayerResponse",
            player: {
              id: true,
              age: true,
              height: true,
              weight: true,
            },
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

    const result = extractMutationResult(
      response.data.updatePlayer,
      "UpdatePlayerResponse",
    );
    if (!result.success) return result;

    revalidatePath("/[locale]/player", "page");
    return { success: true, player: result.data.player };
  } catch (error) {
    console.error("Failed to update player:", error);
    return {
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to update player",
    };
  }
}
