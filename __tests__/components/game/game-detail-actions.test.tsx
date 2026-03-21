import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// ---- Mocks ----

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "game.actions.start": "Start Game",
      "game.actions.starting": "Starting...",
      "game.actions.end": "End Game",
      "game.actions.ending": "Ending...",
      "game.actions.edit": "Edit",
      "game.actions.delete": "Delete",
      "game.actions.moreOptions": "More options",
      "game.manageEditors": "Manage Editors",
      "game.success.started": "Game started",
      "game.success.ended": "Game ended",
      "game.errors.startError": "Failed to start",
      "game.errors.endError": "Failed to end",
    };
    return map[key] ?? key;
  },
}));

vi.mock("@/components/game/live/game-detail-client", () => ({
  useGameLiveContext: () => null,
}));

vi.mock("@/app/[locale]/game/actions", () => ({
  startGame: vi.fn(() => Promise.resolve({ success: true })),
  endGame: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/game/delete-game-dialog", () => ({
  DeleteGameDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="delete-dialog">Delete Dialog</div> : null,
}));

vi.mock("@/components/game/manage-editors-dialog", () => ({
  ManageEditorsDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="editors-dialog">Editors Dialog</div> : null,
}));

vi.mock("@/components/game/update-game-form", () => ({
  UpdateGameForm: () => <div data-testid="update-form">Update Form</div>,
}));

import { GameDetailActions } from "@/components/game/game-detail-actions";
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
    endDate: null,
    sportType: SportType.BASKETBALL,
    metadata: {
      __typename: "BasketballGameMetadata",
      basketballFormat: SportFormat.FIVE_ON_FIVE,
      periods: 4,
    },
    gameStatus: GameStatus.SCHEDULED,
    resultsFinalized: false,
    viewerGameRole: GameRole.OWNER,
    visibility: GameVisibility.PUBLIC,
    viewerInvitation: null,
    location: null,
    participants: {
      edges: [],
      pageInfo: {
        hasPreviousPage: false,
        hasNextPage: false,
        startCursor: null,
        endCursor: null,
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

// ---- Tests ----

describe("GameDetailActions", () => {
  it("renders nothing when viewerGameRole is null", () => {
    const { container } = render(
      <GameDetailActions game={makeGame({ viewerGameRole: null })} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders Start button for SCHEDULED games", () => {
    render(
      <GameDetailActions
        game={makeGame({ gameStatus: GameStatus.SCHEDULED })}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Start Game/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /End Game/i }),
    ).not.toBeInTheDocument();
  });

  it("renders End button for IN_PROGRESS games", () => {
    render(
      <GameDetailActions
        game={makeGame({ gameStatus: GameStatus.IN_PROGRESS })}
      />,
    );
    expect(
      screen.getByRole("button", { name: /End Game/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Start Game/i }),
    ).not.toBeInTheDocument();
  });

  it("renders no Start or End button for COMPLETE games", () => {
    render(
      <GameDetailActions
        game={makeGame({ gameStatus: GameStatus.COMPLETE })}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Start Game/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /End Game/i }),
    ).not.toBeInTheDocument();
  });

  it("renders Edit button for OWNER role", () => {
    render(
      <GameDetailActions game={makeGame({ viewerGameRole: GameRole.OWNER })} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /More options/i }));
    expect(
      screen.getByRole("menuitem", { name: "Edit" }),
    ).toBeInTheDocument();
  });

  it("renders Edit button for EDITOR role", () => {
    render(
      <GameDetailActions
        game={makeGame({ viewerGameRole: GameRole.EDITOR })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /More options/i }));
    expect(
      screen.getByRole("menuitem", { name: "Edit" }),
    ).toBeInTheDocument();
  });

  it("renders Manage Editors and Delete buttons for OWNER role", () => {
    render(
      <GameDetailActions game={makeGame({ viewerGameRole: GameRole.OWNER })} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /More options/i }));
    expect(
      screen.getByRole("menuitem", { name: /Manage Editors/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Delete/i }),
    ).toBeInTheDocument();
  });

  it("does NOT render Manage Editors or Delete buttons for EDITOR role", () => {
    render(
      <GameDetailActions
        game={makeGame({ viewerGameRole: GameRole.EDITOR })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /More options/i }));
    expect(
      screen.queryByRole("menuitem", { name: /Manage Editors/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /Delete/i }),
    ).not.toBeInTheDocument();
  });

  it("all action buttons have min-h-11 class for 44px touch targets", () => {
    render(
      <GameDetailActions
        game={makeGame({
          viewerGameRole: GameRole.OWNER,
          gameStatus: GameStatus.SCHEDULED,
        })}
      />,
    );

    const buttons = screen.getAllByRole("button");
    for (const button of buttons) {
      expect(button).toHaveClass("min-h-11");
    }
  });

  it("opens delete dialog when Delete button is clicked", () => {
    render(
      <GameDetailActions game={makeGame({ viewerGameRole: GameRole.OWNER })} />,
    );

    expect(screen.queryByTestId("delete-dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /More options/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Delete/i }));
    expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
  });

  it("opens editors dialog when Manage Editors button is clicked", () => {
    render(
      <GameDetailActions game={makeGame({ viewerGameRole: GameRole.OWNER })} />,
    );

    expect(screen.queryByTestId("editors-dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /More options/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Manage Editors/i }));
    expect(screen.getByTestId("editors-dialog")).toBeInTheDocument();
  });

  it("opens update dialog with form when Edit button is clicked", () => {
    render(
      <GameDetailActions game={makeGame({ viewerGameRole: GameRole.OWNER })} />,
    );

    expect(screen.queryByTestId("update-form")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /More options/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(screen.getByTestId("update-form")).toBeInTheDocument();
  });

  it("calls startGame action and shows success toast when Start is clicked", async () => {
    const { startGame } = await import("@/app/[locale]/game/actions");
    const { toast } = await import("sonner");

    render(
      <GameDetailActions
        game={makeGame({ gameStatus: GameStatus.SCHEDULED })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Start Game/i }));

    await waitFor(() => {
      expect(startGame).toHaveBeenCalledWith(1);
      expect(toast.success).toHaveBeenCalledWith("Game started");
    });
  });

  it("calls endGame action and shows success toast when End is clicked", async () => {
    const { endGame } = await import("@/app/[locale]/game/actions");
    const { toast } = await import("sonner");

    render(
      <GameDetailActions
        game={makeGame({ gameStatus: GameStatus.IN_PROGRESS })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /End Game/i }));

    await waitFor(() => {
      expect(endGame).toHaveBeenCalledWith(1);
      expect(toast.success).toHaveBeenCalledWith("Game ended");
    });
  });
});
