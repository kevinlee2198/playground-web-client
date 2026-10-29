import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ChatRoomMemberNode, ChatRoomViewerCan } from "@/lib/types/chat";

const { mockAddToast, mockUpdateMemberRole, mockLeaveChat } = vi.hoisted(() => ({
  mockAddToast: vi.fn(),
  mockUpdateMemberRole: vi.fn(),
  mockLeaveChat: vi.fn(),
}));

vi.mock("@/app/[locale]/chat/actions", () => ({
  addMember: vi.fn(),
  removeMember: vi.fn(),
  updateMemberRole: mockUpdateMemberRole,
  leaveChat: mockLeaveChat,
}));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/ui/toast", () => ({ toast: { add: mockAddToast } }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({ dateTime: () => "date" }),
}));
vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("next/dynamic", () => ({ default: () => () => null }));

import { MemberListPanel } from "@/components/chat/member-list-panel";

const allTrue: ChatRoomViewerCan = {
  sendMessage: true,
  addMember: true,
  removeMember: true,
  rename: true,
  leave: true,
  updateMemberRole: true,
};
const allFalse: ChatRoomViewerCan = {
  sendMessage: false,
  addMember: false,
  removeMember: false,
  rename: false,
  leave: false,
  updateMemberRole: false,
};

function member(id: number, role: "OWNER" | "ADMIN" | "MEMBER") {
  return {
    cursor: `c${id}`,
    node: {
      id: `m${id}`,
      role,
      joinedDate: "2025-01-01T00:00:00Z",
      user: { id, displayName: `User ${id}` },
    } as unknown as ChatRoomMemberNode,
  };
}

function renderPanel(
  viewerCan: ChatRoomViewerCan,
  currentUserRole: "OWNER" | "ADMIN" | "MEMBER",
  members = [member(1, currentUserRole), member(2, "MEMBER"), member(3, "ADMIN")],
  onRoomRefresh = vi.fn(),
) {
  render(
    <MemberListPanel
      open
      onOpenChange={vi.fn()}
      roomId="room1"
      members={members}
      currentUserId={1}
      isDirectMessage={false}
      onMembersChange={vi.fn()}
      currentUserRole={currentUserRole}
      viewerCan={viewerCan}
      onRoomRefresh={onRoomRefresh}
    />,
  );
  return onRoomRefresh;
}

describe("MemberListPanel viewerCan gating", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("hides Leave and Add for a managed room", () => {
    renderPanel(allFalse, "MEMBER");
    expect(screen.queryByText("leaveChat")).toBeNull();
    expect(screen.queryByText("add")).toBeNull();
  });

  it("shows Leave and Add from flags", () => {
    renderPanel(allTrue, "MEMBER");
    expect(screen.getByText("leaveChat")).toBeTruthy();
    expect(screen.getByText("add")).toBeTruthy();
  });

  it("hides role controls when updateMemberRole is false even for the owner", () => {
    renderPanel({ ...allTrue, updateMemberRole: false }, "OWNER");
    expect(screen.queryByText("promoteToAdmin")).toBeNull();
    expect(screen.queryByText("demoteToMember")).toBeNull();
    expect(screen.queryByText("transferOwnership")).toBeNull();
  });

  it("hides remove buttons when removeMember is false even for the owner", () => {
    renderPanel({ ...allTrue, removeMember: false }, "OWNER");
    expect(screen.queryByText("remove")).toBeNull();
  });

  it("refreshes the room after transferring ownership", async () => {
    mockUpdateMemberRole.mockResolvedValueOnce({ success: true });
    const onRoomRefresh = renderPanel(allTrue, "OWNER");
    fireEvent.click(screen.getByText("transferOwnership"));
    const buttons = await screen.findAllByText("transferOwnership");
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => expect(onRoomRefresh).toHaveBeenCalledTimes(1));
  });

  it("refreshes the room after a promote", async () => {
    mockUpdateMemberRole.mockResolvedValueOnce({ success: true });
    const onRoomRefresh = renderPanel(allTrue, "OWNER");
    fireEvent.click(screen.getByText("promoteToAdmin"));
    await waitFor(() => expect(onRoomRefresh).toHaveBeenCalledTimes(1));
  });

  it("shows the managed-room message on ManagedChatRoomError", async () => {
    mockLeaveChat.mockResolvedValueOnce({
      success: false,
      errorType: "ManagedChatRoomError",
      message: "x",
    });
    renderPanel(allTrue, "MEMBER");
    fireEvent.click(screen.getByText("leaveChat"));
    const buttons = await screen.findAllByText("leaveChat");
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "errors.managedRoom", type: "error" }),
      ),
    );
  });
});
