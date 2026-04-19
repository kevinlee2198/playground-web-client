import { describe, it, expect } from "vitest";
import { getParticipantName } from "@/components/game/score/participant-utils";
import type {
  GameParticipant,
  GuestParticipant,
  UserRef,
} from "@/lib/types/game";

function user(id: number, displayName: string): UserRef {
  return {
    __typename: "User",
    id,
    username: displayName.toLowerCase(),
    displayName,
    profilePicture: null,
  };
}

function guest(id: string, displayName: string): GuestParticipant {
  return { __typename: "GuestParticipant", id, displayName };
}

describe("getParticipantName", () => {
  it("returns the team name when TeamInstance.name is set", () => {
    const team: GameParticipant = {
      __typename: "TeamInstance",
      id: 1,
      name: "Red Dragons",
      roster: [user(1, "Alice")],
      guests: [],
      metadata: null,
    };
    expect(getParticipantName(team, "Unnamed")).toBe("Red Dragons");
  });

  it("uses the lone roster member when the team has no name", () => {
    const team: GameParticipant = {
      __typename: "TeamInstance",
      id: 1,
      name: null,
      roster: [user(1, "Alice")],
      guests: [],
      metadata: null,
    };
    expect(getParticipantName(team, "Unnamed")).toBe("Alice");
  });

  it("joins two roster names with &", () => {
    const team: GameParticipant = {
      __typename: "TeamInstance",
      id: 1,
      name: null,
      roster: [user(1, "Alice"), user(2, "Bob")],
      guests: [],
      metadata: null,
    };
    expect(getParticipantName(team, "Unnamed")).toBe("Alice & Bob");
  });

  it("shows the first two names and a +N overflow for larger rosters", () => {
    const team: GameParticipant = {
      __typename: "TeamInstance",
      id: 1,
      name: null,
      roster: [user(1, "Alice"), user(2, "Bob"), user(3, "Carol"), user(4, "Dan")],
      guests: [],
      metadata: null,
    };
    expect(getParticipantName(team, "Unnamed")).toBe("Alice, Bob +2");
  });

  it("includes guests alongside roster members when deriving a team name", () => {
    const team: GameParticipant = {
      __typename: "TeamInstance",
      id: 1,
      name: null,
      roster: [user(1, "Alice")],
      guests: [guest("g1", "Jamie")],
      metadata: null,
    };
    expect(getParticipantName(team, "Unnamed")).toBe("Alice & Jamie");
  });

  it("falls back to the provided string when no name, no roster, and no guests", () => {
    const team: GameParticipant = {
      __typename: "TeamInstance",
      id: 1,
      name: null,
      roster: [],
      guests: [],
      metadata: null,
    };
    expect(getParticipantName(team, "Unnamed Team")).toBe("Unnamed Team");
  });

  it("returns the user displayName for an individual user participant", () => {
    const individual: GameParticipant = {
      __typename: "IndividualParticipant",
      id: 2,
      participant: user(1, "Alice"),
      metadata: null,
    };
    expect(getParticipantName(individual, "Unnamed")).toBe("Alice");
  });

  it("returns the guest displayName for an individual guest participant", () => {
    const individual: GameParticipant = {
      __typename: "IndividualParticipant",
      id: 3,
      participant: guest("guest-1", "Jamie (guest)"),
      metadata: null,
    };
    expect(getParticipantName(individual, "Unnamed")).toBe("Jamie (guest)");
  });
});
