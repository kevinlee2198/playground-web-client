"use server";

import { participantMetadataFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import type {
  AddIndividualParticipantInput,
  AddTeamInput,
  JoinTeamInput,
  LeaveTeamInput,
  ParticipantActionResult,
  RemoveIndividualParticipantInput,
  RemoveTeamInstanceInput,
  UpdateParticipantScoreEntry,
  UpdateTeamParticipantInput,
} from "@/lib/types/game";
import { revalidatePath } from "next/cache";

/**
 * Add a team to a game
 */
export async function addTeamParticipant(
  input: AddTeamInput,
): Promise<ParticipantActionResult> {
  try {
    const mutationInput: Record<string, unknown> = {
      gameId: input.gameId,
      name: input.name,
    };

    if (input.description !== undefined)
      mutationInput.description = input.description;
    if (input.playerIds !== undefined)
      mutationInput.playerIds = input.playerIds;

    const response = await authMutate({
      addGameParticipant: {
        __args: {
          input: {
            teamInstance: mutationInput,
          },
        },
        participant: {
          __on: {
            __typeName: "TeamInstance",
            id: true,
            name: true,
            description: true,
            players: {
              id: true,
              firstName: true,
              lastName: true,
            },
            metadata: participantMetadataFragment,
          },
        },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    const participantId = response.data.addGameParticipant.participant.id;
    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, participantId };
  } catch (error) {
    console.error("Failed to add team participant:", error);
    return { success: false, error: "Failed to add team participant" };
  }
}

/**
 * Add an individual participant to a game
 */
export async function addIndividualParticipant(
  input: AddIndividualParticipantInput,
): Promise<ParticipantActionResult> {
  try {
    const response = await authMutate({
      addGameParticipant: {
        __args: {
          input: {
            individual: {
              gameId: input.gameId,
              playerId: input.playerId,
            },
          },
        },
        participant: {
          __on: {
            __typeName: "IndividualParticipant",
            id: true,
            player: {
              id: true,
              firstName: true,
              lastName: true,
            },
            metadata: participantMetadataFragment,
          },
        },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    const participantId = response.data.addGameParticipant.participant.id;
    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, participantId };
  } catch (error) {
    console.error("Failed to add individual participant:", error);
    return { success: false, error: "Failed to add individual participant" };
  }
}

/**
 * Update a team participant (name, description, players, attributes)
 */
export async function updateTeamParticipant(
  input: UpdateTeamParticipantInput,
): Promise<ParticipantActionResult> {
  try {
    const mutationInput: Record<string, unknown> = {
      id: input.teamInstanceId,
    };

    if (input.name !== undefined) mutationInput.name = input.name;
    if (input.description !== undefined)
      mutationInput.description = input.description;
    if (input.playerIds !== undefined)
      mutationInput.playerIds = input.playerIds;
    if (input.metadata !== undefined) mutationInput.metadata = input.metadata;

    const response = await authMutate({
      updateGameParticipant: {
        __args: {
          input: {
            teamInstance: mutationInput,
          },
        },
        participant: {
          __on: {
            __typeName: "TeamInstance",
            id: true,
            name: true,
            description: true,
            players: {
              id: true,
              firstName: true,
              lastName: true,
            },
            metadata: participantMetadataFragment,
          },
        },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    const participantId = response.data.updateGameParticipant.participant.id;
    // Note: We need to know the gameId to revalidate the path. This might need to be passed in.
    // For now, we'll use a wildcard revalidation
    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true, participantId };
  } catch (error) {
    console.error("Failed to update team participant:", error);
    return { success: false, error: "Failed to update team participant" };
  }
}

/**
 * Join a team (add a player to an existing team instance).
 * Uses the addPlayerToTeamInstance mutation to atomically add a player
 * without race conditions from concurrent roster modifications.
 */
export async function joinTeam(
  input: JoinTeamInput,
): Promise<ParticipantActionResult> {
  try {
    const response = await authMutate({
      addPlayerToTeamInstance: {
        __args: {
          input: {
            teamInstanceId: input.teamInstanceId,
            playerId: input.playerId,
          },
        },
        teamInstance: {
          id: true,
          name: true,
          players: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true };
  } catch (error) {
    console.error("Failed to join team:", error);
    return { success: false, error: "Failed to join team" };
  }
}

/**
 * Leave a team (remove a player from an existing team instance).
 * Uses the removePlayerFromTeamInstance mutation to atomically remove a player
 * without race conditions from concurrent roster modifications.
 */
export async function leaveTeam(
  input: LeaveTeamInput,
): Promise<ParticipantActionResult> {
  try {
    const response = await authMutate({
      removePlayerFromTeamInstance: {
        __args: {
          input: {
            teamInstanceId: input.teamInstanceId,
            playerId: input.playerId,
          },
        },
        teamInstance: {
          id: true,
          name: true,
          players: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true };
  } catch (error) {
    console.error("Failed to leave team:", error);
    return { success: false, error: "Failed to leave team" };
  }
}

/**
 * Remove a team instance from a game
 */
export async function removeTeamParticipant(
  input: RemoveTeamInstanceInput,
): Promise<ParticipantActionResult> {
  try {
    const response = await authMutate({
      removeGameParticipant: {
        __args: {
          input: {
            teamInstance: {
              id: input.teamInstanceId,
            },
          },
        },
        id: true,
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true };
  } catch (error) {
    console.error("Failed to remove team participant:", error);
    return { success: false, error: "Failed to remove team participant" };
  }
}

/**
 * Remove an individual participant from a game
 */
export async function removeIndividualParticipant(
  input: RemoveIndividualParticipantInput,
): Promise<ParticipantActionResult> {
  try {
    const response = await authMutate({
      removeGameParticipant: {
        __args: {
          input: {
            individual: {
              gameId: input.gameId,
              playerId: input.playerId,
            },
          },
        },
        id: true,
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true };
  } catch (error) {
    console.error("Failed to remove individual participant:", error);
    return { success: false, error: "Failed to remove individual participant" };
  }
}

/**
 * Bulk update participant scores via the updateGameParticipants mutation.
 * Used by the GameScoreboard save button.
 */
export async function updateParticipantScores(
  entries: UpdateParticipantScoreEntry[],
): Promise<ParticipantActionResult> {
  try {
    // Determine if team or individual based on first entry
    const isTeam = entries[0]?.isTeam ?? true;

    let mutationInput: object;

    if (isTeam) {
      mutationInput = {
        teamInstances: {
          teamInstances: entries.map((e) => ({
            id: e.id,
            metadata: e.metadata,
          })),
        },
      };
    } else {
      mutationInput = {
        individuals: {
          individuals: entries.map((e) => ({
            id: e.id,
            metadata: e.metadata,
          })),
        },
      };
    }

    const response = await authMutate({
      updateGameParticipants: {
        __args: { input: mutationInput },
        participants: {
          __on: [
            {
              __typeName: "TeamInstance",
              id: true,
              metadata: participantMetadataFragment,
            },
            {
              __typeName: "IndividualParticipant",
              id: true,
              metadata: participantMetadataFragment,
            },
          ],
        },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    revalidatePath("/[locale]/game/[id]", "page");
    return { success: true };
  } catch (error) {
    console.error("Failed to update participant scores:", error);
    return { success: false, error: "Failed to update scores" };
  }
}
