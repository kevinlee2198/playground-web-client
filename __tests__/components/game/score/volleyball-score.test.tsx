import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VolleyballScore } from "@/components/game/score/volleyball-score";
import type { GameParticipant } from "@/lib/types/game";

function makeParticipant(
  id: number,
  name: string,
  setsWon: number,
  sets: { pointsScored: number }[],
): GameParticipant {
  return {
    __typename: "TeamInstance",
    id,
    name,
    roster: [], guests: [],
    metadata: {
      __typename: "VolleyballParticipantMetadata",
      setsWon,
      sets,
    },
  };
}

describe("VolleyballScore", () => {
  it("renders sets won for both teams", () => {
    const a = makeParticipant(1, "Team A", 3, [
      { pointsScored: 25 },
      { pointsScored: 23 },
      { pointsScored: 25 },
    ]);
    const b = makeParticipant(2, "Team B", 0, [
      { pointsScored: 20 },
      { pointsScored: 25 },
      { pointsScored: 18 },
    ]);

    render(<VolleyballScore participantA={a} participantB={b} />);

    expect(screen.getByText("Team A")).toBeInTheDocument();
    expect(screen.getByText("Team B")).toBeInTheDocument();
  });

  it("renders per-set scores as pills", () => {
    const a = makeParticipant(1, "Team A", 2, [
      { pointsScored: 25 },
      { pointsScored: 25 },
    ]);
    const b = makeParticipant(2, "Team B", 0, [
      { pointsScored: 20 },
      { pointsScored: 18 },
    ]);

    render(<VolleyballScore participantA={a} participantB={b} />);

    expect(screen.getByText("25-20")).toBeInTheDocument();
    expect(screen.getByText("25-18")).toBeInTheDocument();
  });

  it("does not render set pills when no sets exist", () => {
    const a = makeParticipant(1, "Team A", 0, []);
    const b = makeParticipant(2, "Team B", 0, []);

    const { container } = render(
      <VolleyballScore participantA={a} participantB={b} />,
    );

    const pills = container.querySelectorAll(".rounded-full");
    expect(pills.length).toBe(0);
  });

  it("renders nothing when both participants have no metadata", () => {
    const a: GameParticipant = {
      __typename: "TeamInstance",
      id: 1,
      name: "Team A",
      roster: [], guests: [],
      metadata: null,
    };
    const b: GameParticipant = {
      __typename: "TeamInstance",
      id: 2,
      name: "Team B",
      roster: [], guests: [],
      metadata: null,
    };

    render(<VolleyballScore participantA={a} participantB={b} />);

    // setsWon defaults to 0 for both
    expect(screen.getByText("Team A")).toBeInTheDocument();
    expect(screen.getByText("Team B")).toBeInTheDocument();
  });

  it("renders status pill when provided", () => {
    const a = makeParticipant(1, "Team A", 1, [{ pointsScored: 25 }]);
    const b = makeParticipant(2, "Team B", 0, [{ pointsScored: 20 }]);

    render(
      <VolleyballScore
        participantA={a}
        participantB={b}
        statusPill={<span data-testid="pill">Live</span>}
      />,
    );

    expect(screen.getByTestId("pill")).toBeInTheDocument();
  });
});
