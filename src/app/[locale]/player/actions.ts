"use server";

import { errorFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import { extractMutationResult } from "@/lib/graphql-result";
import type { Player } from "@/lib/types/player";
import { revalidatePath } from "next/cache";

interface CreatePlayerInput {
  firstName: string;
  lastName: string;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  biography?: string | null;
}

interface UpdatePlayerInput {
  id: number;
  firstName?: string;
  lastName?: string;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  biography?: string | null;
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
              firstName: true,
              lastName: true,
              age: true,
              height: true,
              weight: true,
              biography: true,
            },
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return {
        success: false,
        errorType: "GRAPHQL_ERROR",
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
      errorType: "UNEXPECTED_ERROR",
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
    if (input.firstName !== undefined)
      mutationInput.firstName = input.firstName;
    if (input.lastName !== undefined) mutationInput.lastName = input.lastName;
    if ("age" in input) mutationInput.age = input.age;
    if ("height" in input) mutationInput.height = input.height;
    if ("weight" in input) mutationInput.weight = input.weight;
    if ("biography" in input) mutationInput.biography = input.biography;

    const response = await authMutate({
      updatePlayer: {
        __args: { input: mutationInput },
        __typename: true,
        __on: [
          {
            __typeName: "UpdatePlayerResponse",
            player: {
              id: true,
              firstName: true,
              lastName: true,
              age: true,
              height: true,
              weight: true,
              biography: true,
            },
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return {
        success: false,
        errorType: "GRAPHQL_ERROR",
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
      errorType: "UNEXPECTED_ERROR",
      message: "Failed to update player",
    };
  }
}
