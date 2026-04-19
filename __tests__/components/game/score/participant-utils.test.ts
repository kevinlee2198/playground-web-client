import { describe, it, expect } from "vitest";
import { getParticipantName } from "@/components/game/score/participant-utils";
import type { GameParticipant, UserRef } from "@/lib/types/game";

const aliceUser: UserRef = {
  __typename: "User",
  id: 1,
  username: "alice",
  displayName: "Alice",
  profilePicture: null,
};

describe("getParticipantName", () => {
  it("returns the team name when TeamInstance.name is set", () => {
    const team: GameParticipant = {
      __typename: "TeamInstance",
      id: 1,
      name: "Red Dragons",
      roster: [],
      guests: [],
      metadata: null,
    };
    expect(getParticipantName(team, "Unnamed Team")).toBe("Red Dragons");
  });

  it("falls back to the provided string when TeamInstance.name is null", () => {
    const unnamedTeam: GameParticipant = {
      __typename: "TeamInstance",
      id: 1,
      name: null,
      roster: [],
      guests: [],
      metadata: null,
    };
    expect(getParticipantName(unnamedTeam, "Unnamed Team")).toBe(
      "Unnamed Team",
    );
  });

  it("returns the user displayName for an individual user participant", () => {
    const individual: GameParticipant = {
      __typename: "IndividualParticipant",
      id: 2,
      participant: aliceUser,
      metadata: null,
    };
    expect(getParticipantName(individual, "Unnamed Team")).toBe("Alice");
  });

  it("returns the guest displayName for an individual guest participant", () => {
    const individual: GameParticipant = {
      __typename: "IndividualParticipant",
      id: 3,
      participant: {
        __typename: "GuestParticipant",
        id: "guest-1",
        displayName: "Jamie (guest)",
      },
      metadata: null,
    };
    expect(getParticipantName(individual, "Unnamed Team")).toBe(
      "Jamie (guest)",
    );
  });
});
