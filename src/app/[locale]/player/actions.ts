"use server";

import { authMutate } from "@/lib/graphql-request";
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
  id: string;
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
  error?: string;
}

export async function createPlayer(
  input: CreatePlayerInput,
): Promise<PlayerActionResult> {
  try {
    const response = await authMutate({
      createPlayer: {
        __args: { input },
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
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    revalidatePath("/player");
    return {
      success: true,
      player: response.data.createPlayer.player,
    };
  } catch (error) {
    console.error("Failed to create player:", error);
    return { success: false, error: "Failed to create player" };
  }
}

export async function updatePlayer(
  input: UpdatePlayerInput,
): Promise<PlayerActionResult> {
  try {
    // Build input object with only changed fields
    const mutationInput: Record<string, unknown> = { id: input.id };

    // Only include fields that are explicitly provided
    if (input.firstName !== undefined) mutationInput.firstName = input.firstName;
    if (input.lastName !== undefined) mutationInput.lastName = input.lastName;
    if ("age" in input) mutationInput.age = input.age;
    if ("height" in input) mutationInput.height = input.height;
    if ("weight" in input) mutationInput.weight = input.weight;
    if ("biography" in input) mutationInput.biography = input.biography;

    const response = await authMutate({
      updatePlayer: {
        __args: { input: mutationInput },
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
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    revalidatePath("/player");
    return {
      success: true,
      player: response.data.updatePlayer.player,
    };
  } catch (error) {
    console.error("Failed to update player:", error);
    return { success: false, error: "Failed to update player" };
  }
}
