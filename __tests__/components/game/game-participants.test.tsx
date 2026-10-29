import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { gameViewerCan } from "../../helpers/game-viewer-can";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "game.participants.title": "Participants",
      "game.participants.addTeam": "Add Team",
      "game.participants.noParticipants": "No participants",
    };
    return map[key] ?? key;
  },
}));

vi.mock("@/components/game/add-team-form", () => ({
  AddTeamForm: () => <div />,
}));

vi.mock("@/components/game/team-card", () => ({
  TeamCard: () => <div />,
}));

vi.mock("@/components/game/individual-participant-list", () => ({
  IndividualParticipantList: () => <div />,
}));

import { GameParticipants } from "@/components/game/game-participants";
import type { GameDetail, GameViewerCan } from "@/lib/types/game";

function renderParticipants(viewerCan: Partial<GameViewerCan>) {
  const game = {
    id: 1,
    sportType: "BASEBALL",
    metadata: { __typename: "BaseballGameMetadata" },
    gameStatus: "SCHEDULED",
    visibility: "PUBLIC",
    viewerGameRole: null,
    viewerInvitation: null,
    participants: { edges: [] },
    viewerCan: gameViewerCan(viewerCan),
  } as unknown as GameDetail;
  return render(<GameParticipants game={game} currentUserId={1} />);
}

describe("GameParticipants Add Team", () => {
  it("PUBLIC non-manager with join=true sees no Add Team", () => {
    renderParticipants({ join: true, addParticipants: false });
    expect(screen.queryByText("Add Team")).toBeNull();
  });

  it("manager sees Add Team", () => {
    renderParticipants({ addParticipants: true });
    expect(screen.getByText("Add Team")).toBeTruthy();
  });
});
