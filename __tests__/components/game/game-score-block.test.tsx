import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

// ---- Mocks ----

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "game.scoreboard.noParticipants": "Add participants to track scores",
      "game.scoreboard.edit": "Edit Score",
    };
    return map[key] ?? key;
  },
}));

vi.mock("@/components/game/live/game-detail-client", () => ({
  useGameLiveContext: () => null,
}));

vi.mock("@/components/game/score/game-score", () => ({
  GameScore: ({
    size,
    statusPill,
  }: {
    size?: string;
    statusPill?: ReactNode;
  }) => (
    <div data-testid="game-score" data-size={size}>
      {statusPill}
    </div>
  ),
}));

vi.mock("@/components/game/score/participant-utils", () => ({
  getParticipantName: (p: { __typename: string; name?: string }) =>
    p.__typename === "TeamInstance" ? p.name : "Player Name",
}));

vi.mock("@/components/game/scoreboard/basketball-score-form", () => ({
  BasketballScoreForm: ({
    onSuccess,
    onCancel,
  }: {
    onSuccess: () => void;
    onCancel: () => void;
  }) => (
    <div data-testid="basketball-score-form">
      <input data-testid="form-input" />
      <button data-testid="save-btn" onClick={onSuccess}>
        Save
      </button>
      <button data-testid="cancel-btn" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

vi.mock("@/components/game/scoreboard/football-score-form", () => ({
  FootballScoreForm: ({
    onSuccess,
    onCancel,
  }: {
    onSuccess: () => void;
    onCancel: () => void;
  }) => (
    <div data-testid="football-score-form">
      <input data-testid="form-input" />
      <button data-testid="save-btn" onClick={onSuccess}>
        Save
      </button>
      <button data-testid="cancel-btn" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

vi.mock("@/components/game/scoreboard/tennis-score-form", () => ({
  TennisScoreForm: ({
    onSuccess,
    onCancel,
  }: {
    onSuccess: () => void;
    onCancel: () => void;
  }) => (
    <div data-testid="tennis-score-form">
      <input data-testid="form-input" />
      <button data-testid="save-btn" onClick={onSuccess}>
        Save
      </button>
      <button data-testid="cancel-btn" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

import { GameScoreBlock } from "@/components/game/game-score-block";
import {
  GameRole,
  GameStatus,
  GameVisibility,
  SportFormat,
  SportType,
} from "@/lib/constants";
import type { GameDetail } from "@/lib/types/game";

// ---- Test fixtures ----

function makeGame(overrides: Partial<GameDetail> = {}): GameDetail {
  return {
    id: 1,
    description: null,
    startDate: "2026-03-10T19:00:00Z",
    endDate: "2026-03-10T21:00:00Z",
    sportType: SportType.BASKETBALL,
    metadata: {
      __typename: "BasketballGameMetadata",
      basketballFormat: SportFormat.FIVE_ON_FIVE,
      periods: 4,
    },
    gameStatus: GameStatus.IN_PROGRESS,
    resultsFinalized: false,
    viewerGameRole: GameRole.OWNER,
    visibility: GameVisibility.PUBLIC,
    viewerInvitation: null,
    location: null,
    participants: {
      edges: [
        {
          cursor: "c1",
          node: {
            __typename: "TeamInstance",
            id: 10,
            name: "Team Alpha",
            description: null,
            players: [],
            metadata: {
              __typename: "BasketballParticipantMetadata",
              score: 45,
            },
          },
        },
        {
          cursor: "c2",
          node: {
            __typename: "TeamInstance",
            id: 11,
            name: "Team Beta",
            description: null,
            players: [],
            metadata: {
              __typename: "BasketballParticipantMetadata",
              score: 38,
            },
          },
        },
      ],
      pageInfo: {
        hasPreviousPage: false,
        hasNextPage: false,
        startCursor: "c1",
        endCursor: "c2",
      },
    },
    media: {
      edges: [],
      pageInfo: {
        hasPreviousPage: false,
        hasNextPage: false,
        startCursor: null,
        endCursor: null,
      },
    },
    ...overrides,
  };
}

function makeGameWithFewParticipants(): GameDetail {
  return makeGame({
    participants: {
      edges: [
        {
          cursor: "c1",
          node: {
            __typename: "TeamInstance",
            id: 10,
            name: "Team Alpha",
            description: null,
            players: [],
            metadata: null,
          },
        },
      ],
      pageInfo: {
        hasPreviousPage: false,
        hasNextPage: false,
        startCursor: "c1",
        endCursor: "c1",
      },
    },
  });
}

// ---- Tests ----

describe("GameScoreBlock", () => {
  it("renders GameScore with size='lg' when game has >=2 participants with scores", () => {
    render(
      <GameScoreBlock
        game={makeGame()}
        statusPill={<span data-testid="status-pill">Live</span>}
      />,
    );

    const gameScore = screen.getByTestId("game-score");
    expect(gameScore).toBeInTheDocument();
    expect(gameScore).toHaveAttribute("data-size", "lg");
    expect(screen.getByTestId("status-pill")).toBeInTheDocument();
  });

  it('shows "Add participants to track scores" when <2 participants', () => {
    render(
      <GameScoreBlock
        game={makeGameWithFewParticipants()}
        statusPill={<span>Live</span>}
      />,
    );

    expect(
      screen.getByText("Add participants to track scores"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("game-score")).not.toBeInTheDocument();
  });

  it("shows edit pencil button when canEdit is true (viewerGameRole set + IN_PROGRESS)", () => {
    render(
      <GameScoreBlock
        game={makeGame({
          viewerGameRole: GameRole.OWNER,
          gameStatus: GameStatus.IN_PROGRESS,
        })}
        statusPill={<span>Live</span>}
      />,
    );

    const editButton = screen.getByRole("button", { name: "Edit Score" });
    expect(editButton).toBeInTheDocument();
  });

  it("shows edit pencil button when canEdit is true (viewerGameRole set + COMPLETE)", () => {
    render(
      <GameScoreBlock
        game={makeGame({
          viewerGameRole: GameRole.EDITOR,
          gameStatus: GameStatus.COMPLETE,
        })}
        statusPill={<span>Final</span>}
      />,
    );

    const editButton = screen.getByRole("button", { name: "Edit Score" });
    expect(editButton).toBeInTheDocument();
  });

  it("does NOT show edit button when viewerGameRole is null", () => {
    render(
      <GameScoreBlock
        game={makeGame({
          viewerGameRole: null,
          gameStatus: GameStatus.IN_PROGRESS,
        })}
        statusPill={<span>Live</span>}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Edit Score" }),
    ).not.toBeInTheDocument();
  });

  it("does NOT show edit button when game is SCHEDULED", () => {
    render(
      <GameScoreBlock
        game={makeGame({
          viewerGameRole: GameRole.OWNER,
          gameStatus: GameStatus.SCHEDULED,
        })}
        statusPill={<span>Upcoming</span>}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Edit Score" }),
    ).not.toBeInTheDocument();
  });

  it("toggles to score form when edit pencil is clicked (basketball)", () => {
    render(
      <GameScoreBlock
        game={makeGame({ sportType: SportType.BASKETBALL })}
        statusPill={<span>Live</span>}
      />,
    );

    expect(screen.getByTestId("game-score")).toBeInTheDocument();
    expect(
      screen.queryByTestId("basketball-score-form"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit Score" }));

    expect(screen.getByTestId("basketball-score-form")).toBeInTheDocument();
    expect(screen.queryByTestId("game-score")).not.toBeInTheDocument();
  });

  it("toggles to football score form when edit pencil is clicked", () => {
    render(
      <GameScoreBlock
        game={makeGame({
          sportType: SportType.FOOTBALL,
          metadata: {
            __typename: "FootballGameMetadata",
            footballFormat: SportFormat.FLAG_FOOTBALL,
            periods: 4,
          },
        })}
        statusPill={<span>Live</span>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Score" }));

    expect(screen.getByTestId("football-score-form")).toBeInTheDocument();
  });

  it("toggles to tennis score form when edit pencil is clicked", () => {
    render(
      <GameScoreBlock
        game={makeGame({
          sportType: SportType.TENNIS,
          metadata: {
            __typename: "TennisGameMetadata",
            tennisFormat: SportFormat.SINGLES,
            tennisBestOf: 3,
            tiebreakFinalSet: true,
          },
        })}
        statusPill={<span>Live</span>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Score" }));

    expect(screen.getByTestId("tennis-score-form")).toBeInTheDocument();
  });

  it("exits editing mode and restores pencil button on save", () => {
    render(
      <GameScoreBlock
        game={makeGame()}
        statusPill={<span>Live</span>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Score" }));
    fireEvent.click(screen.getByTestId("save-btn"));

    expect(
      screen.getByRole("button", { name: "Edit Score" }),
    ).toBeInTheDocument();
  });

  it("exits editing mode and restores pencil button on cancel", () => {
    render(
      <GameScoreBlock
        game={makeGame()}
        statusPill={<span>Live</span>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Score" }));
    fireEvent.click(screen.getByTestId("cancel-btn"));

    expect(
      screen.getByRole("button", { name: "Edit Score" }),
    ).toBeInTheDocument();
  });

  it("applies aria-live='polite' and aria-atomic={true} when game is live", () => {
    const { container } = render(
      <GameScoreBlock
        game={makeGame({ gameStatus: GameStatus.IN_PROGRESS })}
        statusPill={<span>Live</span>}
      />,
    );

    const liveRegion = container.querySelector("[aria-live='polite']");
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
  });

  it("does NOT apply aria-live when game is not live", () => {
    const { container } = render(
      <GameScoreBlock
        game={makeGame({ gameStatus: GameStatus.COMPLETE })}
        statusPill={<span>Final</span>}
      />,
    );

    const liveRegion = container.querySelector("[aria-live='polite']");
    expect(liveRegion).not.toBeInTheDocument();
  });
});
