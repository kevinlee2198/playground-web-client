import { BasketballStatsTable } from "@/components/game/basketball-stats-table";
import { GameStatus } from "@/lib/constants";
import type { UserRef } from "@/lib/types/game";
import type { BasketballStatsNode } from "@/lib/types/stats/basketball";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({ number: (n: number) => String(n) }),
}));

vi.mock("@/app/[locale]/game/basketball-stats-actions", () => ({
  saveBasketballStats: vi.fn(),
}));

vi.mock("@/components/game/basketball-stats-form", () => ({
  BasketballStatsForm: () => null,
}));

vi.mock("@/components/ui/toast", () => ({ toast: { error: vi.fn() } }));

// Render select options inline so the picker contents are observable.
vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => (
    <div data-testid="picker-option">{children}</div>
  ),
}));

function makeUser(id: number): UserRef {
  return {
    __typename: "User",
    id,
    displayName: `User ${id}`,
    username: `user${id}`,
    profilePicture: null,
  };
}

function makeStats(userId: number): { node: BasketballStatsNode } {
  return {
    node: {
      id: userId * 100,
      user: makeUser(userId),
      points: 10,
      assists: 1,
      totalRebounds: 1,
      offensiveRebounds: 0,
      defensiveRebounds: 1,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      personalFouls: 0,
      fieldGoalsMade: 1,
      fieldGoalsAttempted: 2,
      fieldGoalPercentage: 50,
      threePointersMade: 0,
      threePointersAttempted: 0,
      threePointerPercentage: null,
      twoPointersMade: 1,
      twoPointersAttempted: 2,
      twoPointerPercentage: 50,
      freeThrowsMade: 0,
      freeThrowsAttempted: 0,
      freeThrowPercentage: null,
    },
  };
}

function renderTable(
  props: Partial<React.ComponentProps<typeof BasketballStatsTable>> = {},
) {
  return render(
    <BasketballStatsTable
      gameId={1}
      teamName="Team"
      stats={[makeStats(7), makeStats(8)]}
      gameStatus={GameStatus.IN_PROGRESS}
      availableUsers={[makeUser(7), makeUser(8), makeUser(9), makeUser(10)]}
      canEnterStats={false}
      canEnterOwnStats={false}
      currentUserId={7}
      {...props}
    />,
  );
}

describe("BasketballStatsTable", () => {
  it("shows edit controls on every row when canEnterStats on an IN_PROGRESS game", () => {
    renderTable({ canEnterStats: true });

    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
    expect(screen.getAllByTestId("picker-option")).toHaveLength(2);
  });

  it("SELF_REPORT participant sees edit only on their own row", () => {
    renderTable({
      canEnterOwnStats: true,
      stats: [makeStats(7), makeStats(8)],
      availableUsers: [makeUser(8), makeUser(9)],
    });

    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(1);
    // The viewer already has stats, and other users are not offered.
    expect(screen.queryByTestId("picker-option")).not.toBeInTheDocument();
  });

  it("offers only the viewer in the picker when only canEnterOwnStats", () => {
    renderTable({
      canEnterOwnStats: true,
      stats: [makeStats(8)],
      availableUsers: [makeUser(7), makeUser(8), makeUser(9)],
    });

    const options = screen.getAllByTestId("picker-option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("User 7");
  });

  it("hides edit controls when both flags are false", () => {
    renderTable();

    expect(
      screen.queryByRole("button", { name: "Edit" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("picker-option")).not.toBeInTheDocument();
  });

  it("hides edit controls on FINALIZED even when canEnterStats", () => {
    renderTable({ canEnterStats: true, gameStatus: GameStatus.FINALIZED });

    expect(
      screen.queryByRole("button", { name: "Edit" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("picker-option")).not.toBeInTheDocument();
  });
});
