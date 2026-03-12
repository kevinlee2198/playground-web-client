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
      "profile.games.vs": "vs",
      "sports.BASKETBALL": "Basketball",
      "sports.TENNIS": "Tennis",
      "sports.FOOTBALL": "Football",
      "sportSubtypes.FIVE_ON_FIVE": "5v5",
      "sportSubtypes.THREE_ON_THREE": "3v3",
      "sportSubtypes.SINGLES": "Singles",
    };
    return map[key] ?? key;
  },
  useFormatter: () => ({
    dateTime: () => "Mar 10, 2026, 07:00 PM",
  }),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

import { GameCard } from "@/components/game/game-card";
import { GameStatus, GameRole, GameVisibility, SportType, SportSubtype } from "@/lib/constants";
import type { GameNode } from "@/lib/types/game";

function makeGame(overrides: Partial<GameNode> = {}): GameNode {
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
    gameStatus: GameStatus.COMPLETE,
    viewerGameRole: GameRole.OWNER,
    visibility: GameVisibility.PUBLIC,
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
            players: [],
            metadata: { __typename: "BasketballParticipantMetadata", score: 45 },
          },
          cursor: "c1",
        },
        {
          node: {
            __typename: "TeamInstance",
            id: 2,
            name: "Team Beta",
            players: [],
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
  it("renders a completed game with Final pill and scores", () => {
    render(<GameCard game={makeGame()} />);
    expect(screen.getByText("Final")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("38")).toBeInTheDocument();
    expect(screen.getByText("Team Alpha")).toBeInTheDocument();
    expect(screen.getByText("Team Beta")).toBeInTheDocument();
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
              players: [],
              metadata: null,
            },
            cursor: "c1",
          },
          {
            node: {
              __typename: "TeamInstance",
              id: 2,
              name: "Team Beta",
              players: [],
              metadata: null,
            },
            cursor: "c2",
          },
        ],
      },
    });
    render(<GameCard game={upcoming} />);
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.getByText("Mar 10, 2026, 07:00 PM")).toBeInTheDocument();
  });

  it("renders sport emoji pill with accessibility label", () => {
    render(<GameCard game={makeGame()} />);
    expect(screen.getByLabelText("Basketball")).toBeInTheDocument();
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

  it("shows subtype badge", () => {
    render(<GameCard game={makeGame()} />);
    expect(screen.getByText("5v5")).toBeInTheDocument();
  });
});
