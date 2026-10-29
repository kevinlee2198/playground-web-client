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
      "game.actions.finalizeResults": "Finalize Results",
      "game.actions.unfinalizeResults": "Unfinalize Results",
      "game.invitations.inviteUsers": "Invite Users",
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

vi.mock("@/components/ui/toast", () => ({
  toast: { add: vi.fn() },
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
  StatEntryMode,
} from "@/lib/constants";
import type { GameDetail } from "@/lib/types/game";
import { gameViewerCan } from "../../helpers/game-viewer-can";

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
    viewerGameRole: GameRole.OWNER,
    viewerCan: gameViewerCan(),
    visibility: GameVisibility.PUBLIC,
    statEntryMode: StatEntryMode.OPEN,
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

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: /More options/i }));
}

describe("GameDetailActions", () => {
  it("renders nothing when every flag is false", () => {
    const { container } = render(<GameDetailActions game={makeGame()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when every flag is false even for an OWNER role", () => {
    const { container } = render(
      <GameDetailActions game={makeGame({ viewerGameRole: GameRole.OWNER })} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders actions for a viewer with no GameRole when viewerCan.start is true", () => {
    render(
      <GameDetailActions
        game={makeGame({
          viewerGameRole: null,
          viewerCan: gameViewerCan({ start: true, update: true }),
        })}
      />,
    );
    expect(screen.getByRole("button", { name: /Start Game/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /More options/i })).toBeInTheDocument();
  });

  it("hides the overflow trigger when no menu item is allowed", () => {
    render(
      <GameDetailActions game={makeGame({ viewerCan: gameViewerCan({ start: true }) })} />,
    );
    expect(screen.getByRole("button", { name: /Start Game/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /More options/i })).not.toBeInTheDocument();
  });

  it("renders End button only from viewerCan.end", () => {
    render(
      <GameDetailActions
        game={makeGame({
          gameStatus: GameStatus.IN_PROGRESS,
          viewerCan: gameViewerCan({ end: true }),
        })}
      />,
    );
    expect(screen.getByRole("button", { name: /End Game/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Start Game/i })).not.toBeInTheDocument();
  });

  it("swaps Start for End when flags change", () => {
    const { rerender } = render(
      <GameDetailActions game={makeGame({ viewerCan: gameViewerCan({ start: true }) })} />,
    );
    expect(screen.getByRole("button", { name: /Start Game/i })).toBeInTheDocument();
    rerender(
      <GameDetailActions
        game={makeGame({
          gameStatus: GameStatus.IN_PROGRESS,
          viewerCan: gameViewerCan({ end: true }),
        })}
      />,
    );
    expect(screen.queryByRole("button", { name: /Start Game/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /End Game/i })).toBeInTheDocument();
  });

  it("shows Edit only from viewerCan.update", () => {
    render(
      <GameDetailActions game={makeGame({ viewerCan: gameViewerCan({ update: true }) })} />,
    );
    openMenu();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Manage Editors/i })).not.toBeInTheDocument();
  });

  it("shows Invite only from viewerCan.invite", () => {
    const { rerender } = render(
      <GameDetailActions game={makeGame({ viewerCan: gameViewerCan({ update: true }) })} />,
    );
    openMenu();
    expect(screen.queryByRole("menuitem", { name: /Invite Users/i })).not.toBeInTheDocument();
    rerender(
      <GameDetailActions
        game={makeGame({ viewerCan: gameViewerCan({ update: true, invite: true }) })}
      />,
    );
    expect(screen.getByRole("menuitem", { name: /Invite Users/i })).toBeInTheDocument();
  });

  it("shows Finalize only when finalizeResults", () => {
    const { rerender } = render(
      <GameDetailActions
        game={makeGame({
          gameStatus: GameStatus.COMPLETE,
          viewerCan: gameViewerCan({ update: true }),
        })}
      />,
    );
    openMenu();
    expect(screen.queryByRole("menuitem", { name: /Finalize Results/i })).not.toBeInTheDocument();
    rerender(
      <GameDetailActions
        game={makeGame({
          gameStatus: GameStatus.COMPLETE,
          viewerCan: gameViewerCan({ finalizeResults: true }),
        })}
      />,
    );
    expect(screen.getByRole("menuitem", { name: /^Finalize Results/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Unfinalize/i })).not.toBeInTheDocument();
  });

  it("shows Unfinalize only when unfinalizeResults", () => {
    const { rerender } = render(
      <GameDetailActions
        game={makeGame({
          gameStatus: GameStatus.FINALIZED,
          viewerCan: gameViewerCan({ update: true }),
        })}
      />,
    );
    openMenu();
    expect(screen.queryByRole("menuitem", { name: /Unfinalize/i })).not.toBeInTheDocument();
    rerender(
      <GameDetailActions
        game={makeGame({
          gameStatus: GameStatus.FINALIZED,
          viewerCan: gameViewerCan({ unfinalizeResults: true }),
        })}
      />,
    );
    expect(screen.getByRole("menuitem", { name: /Unfinalize Results/i })).toBeInTheDocument();
  });

  it("shows Manage Editors and Delete only from their flags", () => {
    const { rerender } = render(
      <GameDetailActions game={makeGame({ viewerCan: gameViewerCan({ manageEditors: true }) })} />,
    );
    openMenu();
    expect(screen.getByRole("menuitem", { name: /Manage Editors/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Delete/i })).not.toBeInTheDocument();
    rerender(
      <GameDetailActions
        game={makeGame({ viewerCan: gameViewerCan({ manageEditors: true, delete: true }) })}
      />,
    );
    expect(screen.getByRole("menuitem", { name: /Delete/i })).toBeInTheDocument();
  });

  it("shows only server-granted controls on a cancelled game", () => {
    render(
      <GameDetailActions
        game={makeGame({
          gameStatus: GameStatus.CANCELLED,
          viewerGameRole: GameRole.OWNER,
          viewerCan: gameViewerCan({ manageEditors: true }),
        })}
      />,
    );
    expect(screen.queryByRole("button", { name: /Start Game/i })).not.toBeInTheDocument();
    openMenu();
    expect(screen.getAllByRole("menuitem")).toHaveLength(1);
    expect(screen.getByRole("menuitem", { name: /Manage Editors/i })).toBeInTheDocument();
  });

  it("all action buttons have min-h-11 class for 44px touch targets", () => {
    render(
      <GameDetailActions
        game={makeGame({ viewerCan: gameViewerCan({ start: true, update: true }) })}
      />,
    );
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveClass("min-h-11");
    }
  });

  it("opens delete dialog when Delete is clicked", () => {
    render(
      <GameDetailActions game={makeGame({ viewerCan: gameViewerCan({ delete: true }) })} />,
    );
    expect(screen.queryByTestId("delete-dialog")).not.toBeInTheDocument();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /Delete/i }));
    expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
  });

  it("opens editors dialog when Manage Editors is clicked", () => {
    render(
      <GameDetailActions game={makeGame({ viewerCan: gameViewerCan({ manageEditors: true }) })} />,
    );
    expect(screen.queryByTestId("editors-dialog")).not.toBeInTheDocument();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /Manage Editors/i }));
    expect(screen.getByTestId("editors-dialog")).toBeInTheDocument();
  });

  it("opens update dialog with form when Edit is clicked", () => {
    render(
      <GameDetailActions game={makeGame({ viewerCan: gameViewerCan({ update: true }) })} />,
    );
    expect(screen.queryByTestId("update-form")).not.toBeInTheDocument();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(screen.getByTestId("update-form")).toBeInTheDocument();
  });

  it("calls startGame action and shows success toast when Start is clicked", async () => {
    const { startGame } = await import("@/app/[locale]/game/actions");
    const { toast } = await import("@/components/ui/toast");

    render(
      <GameDetailActions game={makeGame({ viewerCan: gameViewerCan({ start: true }) })} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Start Game/i }));

    await waitFor(() => {
      expect(startGame).toHaveBeenCalledWith(1);
      expect(toast.add).toHaveBeenCalledWith({ title: "Game started", type: "success" });
    });
  });

  it("calls endGame action and shows success toast when End is clicked", async () => {
    const { endGame } = await import("@/app/[locale]/game/actions");
    const { toast } = await import("@/components/ui/toast");

    render(
      <GameDetailActions
        game={makeGame({
          gameStatus: GameStatus.IN_PROGRESS,
          viewerCan: gameViewerCan({ end: true }),
        })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /End Game/i }));

    await waitFor(() => {
      expect(endGame).toHaveBeenCalledWith(1);
      expect(toast.add).toHaveBeenCalledWith({ title: "Game ended", type: "success" });
    });
  });
});
