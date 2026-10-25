import { GameStats } from "@/components/game/game-stats";
import { SportType } from "@/lib/constants";
import type { GameDetail } from "@/lib/types/game";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("GameStats", () => {
  it.each(["SCHEDULED", "CANCELLED"])("renders nothing for %s", (status) => {
    const game = {
      sportType: SportType.BASKETBALL,
      gameStatus: status,
      viewerGameRole: null,
      participants: { edges: [] },
    } as unknown as GameDetail;

    const { container } = render(<GameStats game={game} />);

    expect(container.firstChild).toBeNull();
  });
});
