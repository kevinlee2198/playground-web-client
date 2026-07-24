import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "game.status.final": "Final",
      "game.status.live": "Live",
      "game.status.upcoming": "Upcoming",
      "game.status.ariaLabel.upcoming": "Game not yet started",
      "game.winner": "Winner",
      "profile.games.vs": "vs",
      "sports.BASKETBALL": "Basketball",
      "sports.TENNIS": "Tennis",
      "sports.FOOTBALL": "Football",
      "sportFormats.FIVE_ON_FIVE": "5v5",
      "sportFormats.THREE_ON_THREE": "3v3",
      "sportFormats.SINGLES": "Singles",
    };
    return map[key] ?? key;
  },
  useFormatter: () => ({
    dateTime: (_date: Date, opts?: Intl.DateTimeFormatOptions) => {
      if (opts?.year) return "Mar 10, 2026, 07:00 PM";
      if (opts?.month) return "Mar 10";
      return "07:00 PM";
    },
    relativeTime: () => "2 days ago",
  }),
  // Two days after the fixture's startDate — recent finals render relative time
  useNow: () => new Date("2026-03-12T19:00:00Z"),
}));

import { GameCard } from "@/components/game/game-card";
import { GameStatus, GameRole, GameVisibility, SportType, SportFormat, StatEntryMode } from "@/lib/constants";
import type { GameNode } from "@/lib/types/game";

function makeGame(overrides: Partial<GameNode> = {}): GameNode {
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
    gameStatus: GameStatus.COMPLETE,
    viewerGameRole: GameRole.OWNER,
    visibility: GameVisibility.PUBLIC,
    viewerInvitation: null,
    statEntryMode: StatEntryMode.OPEN,
    location: {
      name: "Court 1",
      address: { city: "Los Angeles", state: "CA", country: "US" },
    },
    participants: {
      edges: [
        {
          node: {
            __typename: "TeamInstance",
            id: 1,
            name: "Team Alpha",
            roster: [], guests: [],
            metadata: { __typename: "BasketballParticipantMetadata", score: 45 },
          },
          cursor: "c1",
        },
        {
          node: {
            __typename: "TeamInstance",
            id: 2,
            name: "Team Beta",
            roster: [], guests: [],
            metadata: { __typename: "BasketballParticipantMetadata", score: 38 },
          },
          cursor: "c2",
        },
      ],
    },
    ...overrides,
  };
}

describe("GameCard", () => {
  it("renders a completed game with Final status, scores, and winner crown", () => {
    render(<GameCard game={makeGame()} />);
    expect(screen.getByText("Final")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("38")).toBeInTheDocument();
    expect(screen.getByText("Team Alpha")).toBeInTheDocument();
    expect(screen.getByText("Team Beta")).toBeInTheDocument();
    expect(screen.getByText("Winner")).toBeInTheDocument();
  });

  it("shows relative date for recently completed games", () => {
    render(<GameCard game={makeGame()} />);
    expect(screen.getByText("2 days ago")).toBeInTheDocument();
  });

  it("renders a live game with Live pill and breathing dot", () => {
    render(<GameCard game={makeGame({ gameStatus: GameStatus.IN_PROGRESS })} />);
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByTestId("breathing-dot")).toBeInTheDocument();
  });

  it("adds aria-live to score block for live games", () => {
    const { container } = render(<GameCard game={makeGame({ gameStatus: GameStatus.IN_PROGRESS })} />);
    const liveRegion = container.querySelector("[aria-live='polite']");
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
  });

  it("renders an upcoming game with date prominently and no score block", () => {
    const upcoming = makeGame({
      gameStatus: GameStatus.SCHEDULED,
      participants: {
        edges: [
          {
            node: {
              __typename: "TeamInstance",
              id: 1,
              name: "Team Alpha",
              roster: [], guests: [],
              metadata: null,
            },
            cursor: "c1",
          },
          {
            node: {
              __typename: "TeamInstance",
              id: 2,
              name: "Team Beta",
              roster: [], guests: [],
              metadata: null,
            },
            cursor: "c2",
          },
        ],
      },
    });
    render(<GameCard game={upcoming} />);
    expect(screen.getByText("Team Alpha vs Team Beta")).toBeInTheDocument();
    expect(screen.getByText("Mar 10 · 07:00 PM")).toBeInTheDocument();
    // Start time must stay in the accessible name, not just the visible text
    expect(
      screen.getByLabelText("Game not yet started, Mar 10 · 07:00 PM"),
    ).toBeInTheDocument();
    expect(screen.queryByText("45")).not.toBeInTheDocument();
  });

  it("renders sport chip with visible sport and format label", () => {
    render(<GameCard game={makeGame()} />);
    expect(screen.getByText("Basketball · 5v5")).toBeInTheDocument();
  });

  it("drops chip text when the headline is the sport+format fallback", () => {
    render(
      <GameCard
        game={makeGame({
          gameStatus: GameStatus.SCHEDULED,
          participants: { edges: [] },
        })}
      />,
    );
    // Sport + format appears exactly once — the headline; the chip is icon-only
    const label = screen.getAllByText("Basketball · 5v5");
    expect(label).toHaveLength(1);
    expect(label[0].tagName).toBe("P");
  });

  it("links to game detail page", () => {
    render(<GameCard game={makeGame()} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/game/1");
  });

  it("shows location in meta row for completed games", () => {
    render(<GameCard game={makeGame()} />);
    expect(screen.getByText("Los Angeles, CA")).toBeInTheDocument();
  });

  it("applies the sport wash to the card", () => {
    const { container } = render(<GameCard game={makeGame()} />);
    const card = container.querySelector("article");
    expect(card?.className).toContain("from-sport-basketball");
  });
});
