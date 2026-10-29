import { GameStats } from "@/components/game/game-stats";
import { GameStatus, SportType } from "@/lib/constants";
import type { GameDetail } from "@/lib/types/game";
import { gameViewerCan } from "../../helpers/game-viewer-can";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({ number: (n: number) => String(n) }),
}));

describe("GameStats", () => {
  it.each(["SCHEDULED", "CANCELLED"])("renders nothing for %s", (status) => {
    const game = {
      sportType: SportType.BASKETBALL,
      gameStatus: status,
      viewerGameRole: null,
      viewerCan: gameViewerCan(),
      participants: { edges: [] },
    } as unknown as GameDetail;

    const { container } = render(<GameStats game={game} currentUserId={7} />);

    expect(container.firstChild).toBeNull();
  });

  describe("default open state", () => {
    function renderComplete(viewerCan: ReturnType<typeof gameViewerCan>) {
      const game = {
        id: 1,
        sportType: SportType.BASKETBALL,
        gameStatus: GameStatus.COMPLETE,
        viewerGameRole: null,
        viewerCan,
        participants: {
          edges: [
            {
              node: {
                __typename: "TeamInstance",
                id: 10,
                name: "Team Alpha",
                roster: [],
              },
            },
          ],
        },
      } as unknown as GameDetail;

      return render(
        <GameStats game={game} basketballStats={[]} currentUserId={7} />,
      );
    }

    it("opens sections by default when enterStats on a COMPLETE game", () => {
      renderComplete(gameViewerCan({ enterStats: true }));

      expect(screen.getByRole("button", { expanded: true })).toBeInTheDocument();
    });

    it("keeps sections closed for enterOwnStats only", () => {
      renderComplete(gameViewerCan({ enterOwnStats: true }));

      expect(screen.getByRole("button", { expanded: false })).toBeInTheDocument();
      expect(screen.queryByRole("button", { expanded: true })).toBeNull();
    });
  });
});
