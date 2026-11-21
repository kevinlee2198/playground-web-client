import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { gameViewerCan } from "../../helpers/game-viewer-can";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "game.participants.title": "Participants",
      "game.participants.addTeam": "Add Team",
      "game.participants.noParticipants": "No participants",
      "game.participants.leaveTeam": "Leave Team",
    };
    return map[key] ?? key;
  },
}));

vi.mock("@/components/game/add-team-form", () => ({
  AddTeamForm: () => <div />,
}));

vi.mock("@/app/[locale]/game/participant-actions", () => ({
  joinTeam: vi.fn(() => Promise.resolve({ success: true })),
  leaveTeam: vi.fn(() => Promise.resolve({ success: true })),
  removeTeamParticipant: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: { add: vi.fn() },
}));

vi.mock("@/components/game/individual-participant-list", () => ({
  IndividualParticipantList: () => <div />,
}));

import { GameParticipants } from "@/components/game/game-participants";
import type {
  GameDetail,
  GameViewerCan,
  TeamInstanceDetail,
} from "@/lib/types/game";

const myTeam: TeamInstanceDetail = {
  __typename: "TeamInstance",
  id: 7,
  name: "Hawks",
  description: null,
  roster: [
    {
      __typename: "User",
      id: 1,
      displayName: "Me",
      username: "me",
      profilePicture: null,
    },
  ],
  guests: [],
  metadata: null,
};

function renderParticipants(
  viewerCan: Partial<GameViewerCan>,
  teams: TeamInstanceDetail[] = [],
) {
  const game = {
    id: 1,
    sportType: "BASEBALL",
    metadata: { __typename: "BaseballGameMetadata" },
    gameStatus: "SCHEDULED",
    visibility: "PUBLIC",
    viewerGameRole: null,
    viewerInvitation: null,
    participants: { edges: teams.map((node) => ({ node })) },
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

describe("GameParticipants Leave team", () => {
  it('hides "Leave team" when viewerCan.leave is false, for a viewer on the team', () => {
    renderParticipants({ leave: false }, [myTeam]);
    expect(screen.queryByRole("button", { name: "Leave Team" })).toBeNull();
  });

  it('shows "Leave team" when viewerCan.leave is true', () => {
    renderParticipants({ leave: true }, [myTeam]);
    expect(screen.getByRole("button", { name: "Leave Team" })).toBeTruthy();
  });
});
