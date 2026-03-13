import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

// ---- Mocks ----

vi.mock("next-intl/server", () => ({
  getTranslations: () => {
    const t = (key: string) => {
      const map: Record<string, string> = {
        "game.status.live": "Live",
        "game.status.upcoming": "Upcoming",
        "game.status.final": "Final",
        "game.detail.hero.scheduled": "Scheduled for",
        "sportSubtypes.FIVE_ON_FIVE": "5v5",
        "sportSubtypes.THREE_ON_THREE": "3v3",
        "sportSubtypes.SINGLES": "Singles",
        "sportSubtypes.DOUBLES": "Doubles",
        "sportSubtypes.FLAG_FOOTBALL": "Flag Football",
        "sportSubtypes.AMERICAN_FOOTBALL": "American Football",
        "sports.BASKETBALL": "Basketball",
        "sports.TENNIS": "Tennis",
        "sports.FOOTBALL": "Football",
      };
      return map[key] ?? key;
    };
    return Promise.resolve(t);
  },
  getFormatter: () =>
    Promise.resolve({
      dateTime: (date: Date) => date.toISOString(),
    }),
}));

vi.mock("@/components/game/game-score-block", () => ({
  GameScoreBlock: ({
    statusPill,
  }: {
    statusPill: ReactNode;
  }) => (
    <div data-testid="game-score-block">
      <div data-testid="status-pill-slot">{statusPill}</div>
    </div>
  ),
}));

vi.mock("@/components/game/sport-emoji-pill", () => ({
  SportEmojiPill: ({ sportType }: { sportType: string }) => (
    <span data-testid="sport-emoji-pill" data-sport={sportType}>
      {sportType}
    </span>
  ),
}));

vi.mock("@/components/game/breathing-dot", () => ({
  BreathingDot: ({ className }: { className?: string }) => (
    <span data-testid="breathing-dot" className={className} />
  ),
}));

import { GameDetailHero } from "@/components/game/game-detail-hero";
import {
  GameRole,
  GameStatus,
  GameVisibility,
  SportSubtype,
  SportType,
} from "@/lib/constants";
import type { GameDetail } from "@/lib/types/game";

// ---- Test fixtures ----

function makeGame(overrides: Partial<GameDetail> = {}): GameDetail {
  return {
    id: 1,
    startDate: "2026-03-10T19:00:00Z",
    endDate: "2026-03-10T21:00:00Z",
    sportType: SportType.BASKETBALL,
    metadata: {
      __typename: "BasketballGameMetadata",
      basketballSubtype: SportSubtype.FIVE_ON_FIVE,
      periods: 4,
    },
    gameStatus: GameStatus.IN_PROGRESS,
    viewerGameRole: GameRole.OWNER,
    visibility: GameVisibility.PUBLIC,
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

// ---- Helper ----

async function renderHero(
  gameOverrides: Partial<GameDetail> = {},
  locationText: string | null = null,
) {
  return render(
    await GameDetailHero({
      game: makeGame(gameOverrides),
      locationText,
    }),
  );
}

// ---- Tests ----

describe("GameDetailHero", () => {
  it("renders sport emoji pill and subtype badge centered", async () => {
    await renderHero();

    expect(screen.getByTestId("sport-emoji-pill")).toBeInTheDocument();
    expect(screen.getByText("5v5")).toBeInTheDocument();
  });

  it("renders 'Live' status pill for IN_PROGRESS game", async () => {
    await renderHero({ gameStatus: GameStatus.IN_PROGRESS });

    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("renders 'Final' status pill for COMPLETE game", async () => {
    await renderHero({ gameStatus: GameStatus.COMPLETE });

    expect(screen.getByText("Final")).toBeInTheDocument();
  });

  it("renders 'Upcoming' status pill for SCHEDULED game", async () => {
    await renderHero({ gameStatus: GameStatus.SCHEDULED });

    expect(screen.getByText("Upcoming")).toBeInTheDocument();
  });

  it("renders GameScoreBlock for IN_PROGRESS game", async () => {
    await renderHero({ gameStatus: GameStatus.IN_PROGRESS });

    expect(screen.getByTestId("game-score-block")).toBeInTheDocument();
  });

  it("renders GameScoreBlock for COMPLETE game", async () => {
    await renderHero({ gameStatus: GameStatus.COMPLETE });

    expect(screen.getByTestId("game-score-block")).toBeInTheDocument();
  });

  it("renders 'Scheduled for' label and date prominently for SCHEDULED game (no score block)", async () => {
    await renderHero({ gameStatus: GameStatus.SCHEDULED });

    expect(screen.getByText("Scheduled for")).toBeInTheDocument();
    expect(screen.queryByTestId("game-score-block")).not.toBeInTheDocument();
  });

  it("renders venue and date metadata", async () => {
    await renderHero({}, "Los Angeles, CA");

    expect(screen.getByText("Los Angeles, CA")).toBeInTheDocument();
  });

  it("does not render location when locationText is null", async () => {
    await renderHero();

    expect(screen.queryByTestId("map-pin")).not.toBeInTheDocument();
  });

  it("shows breathing dot on status pill for live game", async () => {
    await renderHero({ gameStatus: GameStatus.IN_PROGRESS });

    const pillSlot = screen.getByTestId("status-pill-slot");
    expect(pillSlot.querySelector("[data-testid='breathing-dot']")).toBeInTheDocument();
  });

  it("does not show breathing dot on status pill for non-live game", async () => {
    await renderHero({ gameStatus: GameStatus.COMPLETE });

    expect(screen.queryByTestId("breathing-dot")).not.toBeInTheDocument();
  });

  it("applies sport-themed gradient background for basketball", async () => {
    const { container } = await renderHero({
      sportType: SportType.BASKETBALL,
      gameStatus: GameStatus.COMPLETE,
    });

    const section = container.querySelector("section");
    expect(section?.className).toContain("bg-sport-basketball/5");
  });

  it("applies sport-themed gradient background for tennis", async () => {
    const { container } = await renderHero({
      sportType: SportType.TENNIS,
      gameStatus: GameStatus.COMPLETE,
      metadata: {
        __typename: "TennisGameMetadata",
        tennisSubtype: SportSubtype.SINGLES,
        bestOf: 3,
        tiebreakFinalSet: false,
      },
    });

    const section = container.querySelector("section");
    expect(section?.className).toContain("bg-sport-tennis/5");
  });

  it("applies sport-themed gradient background for football", async () => {
    const { container } = await renderHero({
      sportType: SportType.FOOTBALL,
      gameStatus: GameStatus.COMPLETE,
      metadata: {
        __typename: "FootballGameMetadata",
        footballSubtype: SportSubtype.FLAG_FOOTBALL,
        periods: 4,
      },
    });

    const section = container.querySelector("section");
    expect(section?.className).toContain("bg-sport-football/5");
  });

  it("applies ring treatment for live games", async () => {
    const { container } = await renderHero({
      gameStatus: GameStatus.IN_PROGRESS,
    });

    const section = container.querySelector("section");
    expect(section?.className).toContain("ring-1");
    expect(section?.className).toContain("ring-live/12");
  });

  it("does not apply ring treatment for non-live games", async () => {
    const { container } = await renderHero({
      gameStatus: GameStatus.COMPLETE,
    });

    const section = container.querySelector("section");
    expect(section?.className).not.toContain("ring-live/12");
  });

  it("renders formatted date in metadata row", async () => {
    await renderHero({ startDate: "2026-03-10T19:00:00.000Z" });

    expect(screen.getAllByText("2026-03-10T19:00:00.000Z").length).toBeGreaterThan(0);
  });
});
