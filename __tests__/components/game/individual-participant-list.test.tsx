import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "game.participants.joinGame": "Join Game",
      "game.participants.leaveGame": "Leave Game",
      "game.participants.removeMember": "Remove member",
      "game.participants.noParticipants": "No participants",
    };
    return map[key] ?? key;
  },
}));

vi.mock("@/app/[locale]/game/participant-actions", () => ({
  addIndividualParticipant: vi.fn(() => Promise.resolve({ success: true })),
  removeIndividualParticipant: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: { add: vi.fn() },
}));

import { IndividualParticipantList } from "@/components/game/individual-participant-list";
import type { GameParticipantDetail } from "@/lib/types/game";

const otherParticipant = {
  __typename: "IndividualParticipant",
  id: 11,
  participant: {
    __typename: "User",
    id: 2,
    username: "bob",
    displayName: "Bob",
    avatarUrl: null,
  },
} as unknown as GameParticipantDetail;

type Props = Parameters<typeof IndividualParticipantList>[0];

function renderList(overrides: Partial<Props> = {}) {
  const props: Props = {
    participants: [otherParticipant],
    gameId: 1,
    currentUserId: 1,
    atParticipantLimit: false,
    canJoin: false,
    canManageParticipants: false,
    ...overrides,
  };
  return render(<IndividualParticipantList {...props} />);
}

describe("IndividualParticipantList", () => {
  it("shows Join only when canJoin", () => {
    const { rerender } = renderList({ canJoin: true });
    expect(screen.getByText("Join Game")).toBeTruthy();
    rerender(
      <IndividualParticipantList
        participants={[otherParticipant]}
        gameId={1}
        currentUserId={1}
        atParticipantLimit={false}
        canJoin={false}
        canManageParticipants={false}
      />,
    );
    expect(screen.queryByText("Join Game")).toBeNull();
  });

  it("hides Join at the participant limit even when canJoin", () => {
    renderList({ canJoin: true, atParticipantLimit: true });
    expect(screen.queryByText("Join Game")).toBeNull();
  });

  it("shows remove buttons only when canManageParticipants", () => {
    const { unmount } = renderList({ canManageParticipants: false });
    expect(screen.queryByLabelText(/Remove member/)).toBeNull();
    unmount();
    renderList({ canManageParticipants: true });
    expect(screen.getByLabelText("Remove member Bob")).toBeTruthy();
  });

  it("a PUBLIC game no longer implies Join", () => {
    // visibility is not a prop anymore; only canJoin decides
    renderList({ canJoin: false });
    expect(screen.queryByText("Join Game")).toBeNull();
  });

  it("hides Join when the cancelled-game flags arrive", () => {
    const base = {
      participants: [otherParticipant],
      gameId: 1,
      currentUserId: 1,
      atParticipantLimit: false,
      canManageParticipants: false,
    };
    const { rerender } = render(
      <IndividualParticipantList {...base} canJoin />,
    );
    expect(screen.getByText("Join Game")).toBeTruthy();
    rerender(<IndividualParticipantList {...base} canJoin={false} />);
    expect(screen.queryByText("Join Game")).toBeNull();
  });

  it("still shows Leave for the current participant regardless of flags", () => {
    const mine = {
      ...otherParticipant,
      id: 12,
      participant: {
        ...(otherParticipant as never as { participant: object }).participant,
        id: 1,
      },
    } as unknown as GameParticipantDetail;
    renderList({ participants: [mine] });
    expect(screen.getByText("Leave Game")).toBeTruthy();
    expect(screen.queryByText("Join Game")).toBeNull();
  });
});
