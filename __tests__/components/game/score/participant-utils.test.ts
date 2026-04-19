import { describe, it, expect } from "vitest";
import {
  deriveTeamName,
  getParticipantName,
} from "@/components/game/score/participant-utils";
import type {
  GameParticipant,
  GuestParticipant,
  TeamInstanceDetail,
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

  it("formats exactly three roster members with +1 overflow", () => {
    const team: GameParticipant = {
      __typename: "TeamInstance",
      id: 1,
      name: null,
      roster: [user(1, "Alice"), user(2, "Bob"), user(3, "Carol")],
      guests: [],
      metadata: null,
    };
    expect(getParticipantName(team, "Unnamed")).toBe("Alice, Bob +1");
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

  it("treats an empty-string team name the same as null (falls through to roster)", () => {
    const team: GameParticipant = {
      __typename: "TeamInstance",
      id: 1,
      name: "",
      roster: [user(1, "Alice")],
      guests: [],
      metadata: null,
    };
    expect(getParticipantName(team, "Unnamed")).toBe("Alice");
  });

  it("filters out blank/whitespace displayNames when deriving a roster label", () => {
    const team: GameParticipant = {
      __typename: "TeamInstance",
      id: 1,
      name: null,
      roster: [user(1, ""), user(2, "Bob"), user(3, "   ")],
      guests: [],
      metadata: null,
    };
    expect(getParticipantName(team, "Unnamed")).toBe("Bob");
  });

  it("exposes deriveTeamName for non-union call sites (team-card, game-stats)", () => {
    const team: TeamInstanceDetail = {
      __typename: "TeamInstance",
      id: 1,
      name: null,
      description: null,
      roster: [user(1, "Alice"), user(2, "Bob")],
      guests: [],
      metadata: null,
    };
    expect(deriveTeamName(team, "Unnamed")).toBe("Alice & Bob");
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
