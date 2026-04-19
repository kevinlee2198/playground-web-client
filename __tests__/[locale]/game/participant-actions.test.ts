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

import {
  addTeamParticipant,
  addIndividualParticipant,
  updateTeamParticipant,
  joinTeam,
  leaveTeam,
  removeTeamParticipant,
  removeIndividualParticipant,
  updateParticipantScores,
} from "@/app/[locale]/game/participant-actions";
import { revalidatePath } from "next/cache";

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
    data: null,
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
// addTeamParticipant
// ---------------------------------------------------------------------------

describe("addTeamParticipant", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success with participantId when mutation succeeds", async () => {
    mockMutateSuccess("addGameParticipant", "AddGameParticipantResponse", {
      participant: {
        __typename: "TeamInstance",
        id: 42,
        name: "Team A",
        description: null,
        roster: [],
        metadata: null,
      },
    });

    const result = await addTeamParticipant({ gameId: 1, name: "Team A" });

    expect(result).toEqual({ success: true, participantId: 42 });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("includes optional fields in mutation input when provided", async () => {
    mockMutateSuccess("addGameParticipant", "AddGameParticipantResponse", {
      participant: {
        __typename: "TeamInstance",
        id: 7,
        name: "Team B",
        description: "A great team",
        roster: [],
        metadata: null,
      },
    });

    await addTeamParticipant({
      gameId: 1,
      name: "Team B",
      description: "A great team",
      userIds: [10, 11],
    });

    const callArg = mockAuthMutate.mock.calls[0][0];
    const teamInput = callArg.addGameParticipant.__args.input.teamInstance;
    expect(teamInput.description).toBe("A great team");
    expect(teamInput.userIds).toEqual([10, 11]);
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("addGameParticipant", "GameNotFoundError", "Game not found");

    const result = await addTeamParticipant({ gameId: 99, name: "Team X" });

    expect(result).toEqual({
      success: false,
      errorType: "GameNotFoundError",
      message: "Game not found",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Unauthorized");

    const result = await addTeamParticipant({ gameId: 1, name: "Team A" });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Unauthorized",
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await addTeamParticipant({ gameId: 1, name: "Team A" });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to add team participant",
    });
  });
});

// ---------------------------------------------------------------------------
// addIndividualParticipant
// ---------------------------------------------------------------------------

describe("addIndividualParticipant", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success with participantId when mutation succeeds", async () => {
    mockMutateSuccess("addGameParticipant", "AddGameParticipantResponse", {
      participant: {
        __typename: "IndividualParticipant",
        id: 55,
        participant: { __typename: "User", id: 10, displayName: "Alice" },
        metadata: null,
      },
    });

    const result = await addIndividualParticipant({ gameId: 1, userId: 10 });

    expect(result).toEqual({ success: true, participantId: 55 });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("addGameParticipant", "UserAlreadyParticipatingError", "User is already participating");

    const result = await addIndividualParticipant({ gameId: 1, userId: 10 });

    expect(result).toEqual({
      success: false,
      errorType: "UserAlreadyParticipatingError",
      message: "User is already participating",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Unauthorized");

    const result = await addIndividualParticipant({ gameId: 1, userId: 10 });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Unauthorized",
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await addIndividualParticipant({ gameId: 1, userId: 10 });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to add individual participant",
    });
  });
});

// ---------------------------------------------------------------------------
// updateTeamParticipant
// ---------------------------------------------------------------------------

describe("updateTeamParticipant", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success with participantId when mutation succeeds", async () => {
    mockMutateSuccess("updateGameParticipant", "UpdateGameParticipantResponse", {
      participant: {
        __typename: "TeamInstance",
        id: 42,
        name: "Updated Team",
        description: null,
        roster: [],
        metadata: null,
      },
    });

    const result = await updateTeamParticipant({
      teamInstanceId: 42,
      name: "Updated Team",
    });

    expect(result).toEqual({ success: true, participantId: 42 });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("maps teamInstanceId to id in the mutation input", async () => {
    mockMutateSuccess("updateGameParticipant", "UpdateGameParticipantResponse", {
      participant: {
        __typename: "TeamInstance",
        id: 7,
        name: "Team",
        description: null,
        roster: [],
        metadata: null,
      },
    });

    await updateTeamParticipant({ teamInstanceId: 7 });

    const callArg = mockAuthMutate.mock.calls[0][0];
    const teamInput = callArg.updateGameParticipant.__args.input.teamInstance;
    expect(teamInput.id).toBe(7);
  });

  it("includes optional fields when provided", async () => {
    mockMutateSuccess("updateGameParticipant", "UpdateGameParticipantResponse", {
      participant: {
        __typename: "TeamInstance",
        id: 7,
        name: "Team",
        description: "New desc",
        roster: [],
        metadata: null,
      },
    });

    await updateTeamParticipant({
      teamInstanceId: 7,
      name: "Team",
      description: "New desc",
      userIds: [1, 2],
    });

    const callArg = mockAuthMutate.mock.calls[0][0];
    const teamInput = callArg.updateGameParticipant.__args.input.teamInstance;
    expect(teamInput.name).toBe("Team");
    expect(teamInput.description).toBe("New desc");
    expect(teamInput.userIds).toEqual([1, 2]);
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("updateGameParticipant", "TeamInstanceNotFoundError", "Team instance not found");

    const result = await updateTeamParticipant({ teamInstanceId: 99 });

    expect(result).toEqual({
      success: false,
      errorType: "TeamInstanceNotFoundError",
      message: "Team instance not found",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Forbidden");

    const result = await updateTeamParticipant({ teamInstanceId: 42 });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Forbidden",
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await updateTeamParticipant({ teamInstanceId: 42 });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to update team participant",
    });
  });
});

// ---------------------------------------------------------------------------
// joinTeam
// ---------------------------------------------------------------------------

describe("joinTeam", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success when mutation succeeds", async () => {
    mockMutateSuccess("addUserToTeamInstance", "AddUserToTeamInstanceResponse", {
      teamInstance: {
        id: 42,
        name: "Team A",
        roster: [{ id: 10, displayName: "Alice" }],
      },
    });

    const result = await joinTeam({ teamInstanceId: 42, userId: 10 });

    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("passes teamInstanceId and userId in mutation input", async () => {
    mockMutateSuccess("addUserToTeamInstance", "AddUserToTeamInstanceResponse", {
      teamInstance: { id: 42, name: "Team A", roster: [] },
    });

    await joinTeam({ teamInstanceId: 42, userId: 10 });

    const callArg = mockAuthMutate.mock.calls[0][0];
    const input = callArg.addUserToTeamInstance.__args.input;
    expect(input.teamInstanceId).toBe(42);
    expect(input.userId).toBe(10);
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("addUserToTeamInstance", "UserAlreadyOnTeamError", "User is already on this team");

    const result = await joinTeam({ teamInstanceId: 42, userId: 10 });

    expect(result).toEqual({
      success: false,
      errorType: "UserAlreadyOnTeamError",
      message: "User is already on this team",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Unauthorized");

    const result = await joinTeam({ teamInstanceId: 42, userId: 10 });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Unauthorized",
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await joinTeam({ teamInstanceId: 42, userId: 10 });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to join team",
    });
  });
});

// ---------------------------------------------------------------------------
// leaveTeam
// ---------------------------------------------------------------------------

describe("leaveTeam", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success when mutation succeeds", async () => {
    mockMutateSuccess("removeUserFromTeamInstance", "RemoveUserFromTeamInstanceResponse", {
      teamInstance: { id: 42, name: "Team A", roster: [] },
    });

    const result = await leaveTeam({ teamInstanceId: 42, userId: 10 });

    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("passes teamInstanceId and userId in mutation input", async () => {
    mockMutateSuccess("removeUserFromTeamInstance", "RemoveUserFromTeamInstanceResponse", {
      teamInstance: { id: 42, name: "Team A", roster: [] },
    });

    await leaveTeam({ teamInstanceId: 42, userId: 10 });

    const callArg = mockAuthMutate.mock.calls[0][0];
    const input = callArg.removeUserFromTeamInstance.__args.input;
    expect(input.teamInstanceId).toBe(42);
    expect(input.userId).toBe(10);
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("removeUserFromTeamInstance", "UserNotOnTeamError", "User is not on this team");

    const result = await leaveTeam({ teamInstanceId: 42, userId: 10 });

    expect(result).toEqual({
      success: false,
      errorType: "UserNotOnTeamError",
      message: "User is not on this team",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Unauthorized");

    const result = await leaveTeam({ teamInstanceId: 42, userId: 10 });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Unauthorized",
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await leaveTeam({ teamInstanceId: 42, userId: 10 });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to leave team",
    });
  });
});

// ---------------------------------------------------------------------------
// removeTeamParticipant
// ---------------------------------------------------------------------------

describe("removeTeamParticipant", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success when mutation succeeds", async () => {
    mockMutateSuccess("removeGameParticipant", "RemoveGameParticipantResponse", { id: 42 });

    const result = await removeTeamParticipant({ teamInstanceId: 42 });

    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("passes teamInstanceId as id in mutation input", async () => {
    mockMutateSuccess("removeGameParticipant", "RemoveGameParticipantResponse", { id: 42 });

    await removeTeamParticipant({ teamInstanceId: 42 });

    const callArg = mockAuthMutate.mock.calls[0][0];
    const input = callArg.removeGameParticipant.__args.input;
    expect(input.teamInstance.id).toBe(42);
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("removeGameParticipant", "TeamInstanceNotFoundError", "Team instance not found");

    const result = await removeTeamParticipant({ teamInstanceId: 99 });

    expect(result).toEqual({
      success: false,
      errorType: "TeamInstanceNotFoundError",
      message: "Team instance not found",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Forbidden");

    const result = await removeTeamParticipant({ teamInstanceId: 42 });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Forbidden",
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await removeTeamParticipant({ teamInstanceId: 42 });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to remove team participant",
    });
  });
});

// ---------------------------------------------------------------------------
// removeIndividualParticipant
// ---------------------------------------------------------------------------

describe("removeIndividualParticipant", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success when mutation succeeds", async () => {
    mockMutateSuccess("removeGameParticipant", "RemoveGameParticipantResponse", { id: 55 });

    const result = await removeIndividualParticipant({ id: 55 });

    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("passes id in individual input", async () => {
    mockMutateSuccess("removeGameParticipant", "RemoveGameParticipantResponse", { id: 55 });

    await removeIndividualParticipant({ id: 55 });

    const callArg = mockAuthMutate.mock.calls[0][0];
    const input = callArg.removeGameParticipant.__args.input;
    expect(input.individual.id).toBe(55);
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("removeGameParticipant", "ParticipantNotFoundError", "Participant not found");

    const result = await removeIndividualParticipant({ id: 99 });

    expect(result).toEqual({
      success: false,
      errorType: "ParticipantNotFoundError",
      message: "Participant not found",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Forbidden");

    const result = await removeIndividualParticipant({ id: 55 });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Forbidden",
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await removeIndividualParticipant({ id: 55 });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to remove individual participant",
    });
  });
});

// ---------------------------------------------------------------------------
// updateParticipantScores
// ---------------------------------------------------------------------------

describe("updateParticipantScores", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends teamInstances input when isTeam=true", async () => {
    mockMutateSuccess("updateGameParticipants", "UpdateGameParticipantsResponse", { participants: [] });

    await updateParticipantScores([
      { id: 1, isTeam: true, metadata: { basketball: { score: 10 } } },
      { id: 2, isTeam: true, metadata: { basketball: { score: 20 } } },
    ]);

    const callArg = mockAuthMutate.mock.calls[0][0];
    const input = callArg.updateGameParticipants.__args.input;
    expect(input.teamInstances).toBeDefined();
    expect(input.individuals).toBeUndefined();
    expect(input.teamInstances.teamInstances).toEqual([
      { id: 1, metadata: { basketball: { score: 10 } } },
      { id: 2, metadata: { basketball: { score: 20 } } },
    ]);
  });

  it("sends individuals input when isTeam=false", async () => {
    mockMutateSuccess("updateGameParticipants", "UpdateGameParticipantsResponse", { participants: [] });

    await updateParticipantScores([
      {
        id: 10,
        isTeam: false,
        metadata: { tennis: { setsWon: 2, sets: [{ gamesWon: 6, tiebreakPoints: null }] } },
      },
    ]);

    const callArg = mockAuthMutate.mock.calls[0][0];
    const input = callArg.updateGameParticipants.__args.input;
    expect(input.individuals).toBeDefined();
    expect(input.teamInstances).toBeUndefined();
    expect(input.individuals.individuals).toEqual([
      {
        id: 10,
        metadata: {
          tennis: {
            setsWon: 2,
            sets: [{ gamesWon: 6, tiebreakPoints: null }],
          },
        },
      },
    ]);
  });

  it("defaults to isTeam=true when entries array is empty", async () => {
    mockMutateSuccess("updateGameParticipants", "UpdateGameParticipantsResponse", { participants: [] });

    await updateParticipantScores([]);

    const callArg = mockAuthMutate.mock.calls[0][0];
    const input = callArg.updateGameParticipants.__args.input;
    expect(input.teamInstances).toBeDefined();
    expect(input.teamInstances.teamInstances).toEqual([]);
  });

  it("returns success when mutation succeeds", async () => {
    mockMutateSuccess("updateGameParticipants", "UpdateGameParticipantsResponse", { participants: [] });

    const result = await updateParticipantScores([
      { id: 1, isTeam: true, metadata: { basketball: { score: 5 } } },
    ]);

    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("updateGameParticipants", "InvalidMetadataError", "Invalid metadata");

    const result = await updateParticipantScores([
      { id: 1, isTeam: true, metadata: { basketball: { score: 5 } } },
    ]);

    expect(result).toEqual({
      success: false,
      errorType: "InvalidMetadataError",
      message: "Invalid metadata",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Unauthorized");

    const result = await updateParticipantScores([
      { id: 1, isTeam: true, metadata: { basketball: { score: 5 } } },
    ]);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Unauthorized",
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await updateParticipantScores([
      { id: 1, isTeam: true, metadata: { basketball: { score: 5 } } },
    ]);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to update scores",
    });
  });
});
