import { render, screen } from "@testing-library/react";
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
        "sportFormats.FIVE_ON_FIVE": "5v5",
        "sportFormats.THREE_ON_THREE": "3v3",
        "sportFormats.SINGLES": "Singles",
        "sportFormats.DOUBLES": "Doubles",
        "sportFormats.FLAG_FOOTBALL": "Flag Football",
        "sportFormats.AMERICAN_FOOTBALL": "American Football",
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

vi.mock("@/components/game/live/game-hero-content", () => ({
  GameHeroContent: ({
    game,
    formattedDate,
  }: {
    game: { gameStatus: string };
    formattedDate: string;
  }) => (
    <div data-testid="game-hero-content" data-status={game.gameStatus}>
      <span data-testid="formatted-date">{formattedDate}</span>
    </div>
  ),
}));

vi.mock("@/components/game/sport-badge", () => ({
  SportBadge: ({ sportType }: { sportType: string }) => (
    <span data-testid="sport-badge" data-sport={sportType}>
      {sportType}
    </span>
  ),
}));

import { GameDetailHero } from "@/components/game/game-detail-hero";
import {
  GameRole,
  GameStatus,
  GameVisibility,
  SportFormat,
  SportType,
  StatEntryMode,
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
    viewerGameRole: GameRole.OWNER,
    visibility: GameVisibility.PUBLIC,
    viewerInvitation: null,
    statEntryMode: StatEntryMode.OPEN,
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
  it("renders sport emoji pill and format badge centered", async () => {
    await renderHero();

    expect(screen.getByTestId("sport-badge")).toBeInTheDocument();
    expect(screen.getByText("5v5")).toBeInTheDocument();
  });

  it("renders GameHeroContent for IN_PROGRESS game", async () => {
    await renderHero({ gameStatus: GameStatus.IN_PROGRESS });

    expect(screen.getByTestId("game-hero-content")).toBeInTheDocument();
    expect(screen.getByTestId("game-hero-content")).toHaveAttribute(
      "data-status",
      "IN_PROGRESS",
    );
  });

  it("renders GameHeroContent for COMPLETE game", async () => {
    await renderHero({ gameStatus: GameStatus.COMPLETE });

    expect(screen.getByTestId("game-hero-content")).toBeInTheDocument();
    expect(screen.getByTestId("game-hero-content")).toHaveAttribute(
      "data-status",
      "COMPLETE",
    );
  });

  it("renders GameHeroContent for SCHEDULED game", async () => {
    await renderHero({ gameStatus: GameStatus.SCHEDULED });

    expect(screen.getByTestId("game-hero-content")).toBeInTheDocument();
    expect(screen.getByTestId("game-hero-content")).toHaveAttribute(
      "data-status",
      "SCHEDULED",
    );
  });

  it("renders venue and date metadata", async () => {
    await renderHero({}, "Los Angeles, CA");

    expect(screen.getByText("Los Angeles, CA")).toBeInTheDocument();
  });

  it("does not render location when locationText is null", async () => {
    await renderHero();

    expect(screen.queryByTestId("map-pin")).not.toBeInTheDocument();
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
        tennisFormat: SportFormat.SINGLES,
        tennisBestOf: 3,
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
        footballFormat: SportFormat.FLAG_FOOTBALL,
        periods: 4,
      },
    });

    const section = container.querySelector("section");
    expect(section?.className).toContain("bg-sport-football/5");
  });

  it("renders formatted date in metadata row", async () => {
    await renderHero({ startDate: "2026-03-10T19:00:00.000Z" });

    expect(screen.getAllByText("2026-03-10T19:00:00.000Z").length).toBeGreaterThan(0);
  });
});
