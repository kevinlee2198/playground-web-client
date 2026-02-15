"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Edge, PageInfo } from "@/lib/graphql-connection";
import type {
  ChatMessageNode,
  ChatRoomDetailNode,
  ChatRoomListNode,
  ChatRoomMemberNode,
  ChatUser,
} from "@/lib/types/chat";
import { MessageSquarePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { ChatRoomList } from "./chat-room-list";
import { ConversationView } from "./conversation-view";
import { CreateChatRoomDialog } from "./create-chat-room-dialog";
import { MemberListPanel } from "./member-list-panel";

interface ChatLayoutProps {
  initialRooms: Edge<ChatRoomListNode>[];
  initialPageInfo: PageInfo;
  currentUser: ChatUser;
  initialRoomId: string | null;
}

type MobileView = "list" | "conversation";

export function ChatLayout({
  initialRooms,
  initialPageInfo,
  currentUser,
  initialRoomId,
}: ChatLayoutProps) {
  const t = useTranslations("chat");
  const router = useRouter();
  const pathname = usePathname();

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    initialRoomId,
  );
  const [mobileView, setMobileView] = useState<MobileView>(
    initialRoomId ? "conversation" : "list",
  );
  const [memberPanelOpen, setMemberPanelOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // State for the member panel - populated by ConversationView via callback
  const [activeRoom, setActiveRoom] = useState<ChatRoomDetailNode | null>(null);
  const [activeRoomMembers, setActiveRoomMembers] = useState<
    Edge<ChatRoomMemberNode>[]
  >([]);

  // State for new room - passed to ChatRoomList to prepend
  const [newRoom, setNewRoom] = useState<ChatRoomListNode | null>(null);

  // State for last message update - passed to ChatRoomList
  const [lastMessageUpdate, setLastMessageUpdate] = useState<{
    roomId: string;
    message: ChatMessageNode;
  } | null>(null);

  // Sync selectedRoomId to URL (one-way sync: state -> URL)
  useEffect(() => {
    if (selectedRoomId) {
      router.replace(`${pathname}?room=${selectedRoomId}`, { scroll: false });
    } else {
      router.replace(pathname, { scroll: false });
    }
  }, [selectedRoomId, router, pathname]);

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    setMobileView("conversation");
    setMemberPanelOpen(false);
  };

  const handleBack = () => {
    setMobileView("list");
    setMemberPanelOpen(false);
  };

  const handleRoomLastMessageUpdate = useCallback(
    (roomId: string, message: ChatMessageNode) => {
      setLastMessageUpdate({ roomId, message });
    },
    [],
  );

  const handleNewRoomCreated = (room: ChatRoomListNode) => {
    setNewRoom(room);
    setSelectedRoomId(room.id);
    setMobileView("conversation");
    setCreateDialogOpen(false);
  };

  const handleToggleMembers = () => {
    setMemberPanelOpen((prev) => !prev);
  };

  const handleRoomLoaded = useCallback((room: ChatRoomDetailNode) => {
    setActiveRoom(room);
    setActiveRoomMembers(room.members.edges);
  }, []);

  const handleMembersChange = useCallback(
    (members: Edge<ChatRoomMemberNode>[]) => {
      setActiveRoomMembers(members);
    },
    [],
  );

  return (
    <div className="flex h-full">
      {/* Left Panel - Chat Room List */}
      <div
        className={`w-full shrink-0 border-r md:w-80 ${
          mobileView === "conversation" ? "hidden md:flex" : "flex"
        } flex-col`}
      >
        <ChatRoomList
          initialRooms={initialRooms}
          initialPageInfo={initialPageInfo}
          selectedRoomId={selectedRoomId}
          currentUserId={currentUser.id}
          onSelectRoom={handleRoomSelect}
          onNewChatClick={() => setCreateDialogOpen(true)}
          newRoom={newRoom}
          lastMessageUpdate={lastMessageUpdate}
        />
      </div>

      {/* Right Panel - Conversation View or Empty State */}
      <div
        className={`flex-1 ${
          mobileView === "list" ? "hidden md:flex" : "flex"
        } flex-col`}
      >
        {selectedRoomId ? (
          <ConversationView
            roomId={selectedRoomId}
            currentUser={currentUser}
            onBack={handleBack}
            onToggleMembers={handleToggleMembers}
            onLastMessageUpdate={handleRoomLastMessageUpdate}
            onRoomLoaded={handleRoomLoaded}
          />
        ) : (
          <Empty className="border-none">
            <EmptyHeader>
              <EmptyMedia>
                <MessageSquarePlus className="h-12 w-12 text-muted-foreground/50" />
              </EmptyMedia>
              <EmptyDescription>{t("noConversation")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>

      {/* Create Chat Room Dialog */}
      <CreateChatRoomDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onRoomCreated={handleNewRoomCreated}
        currentUserId={currentUser.id}
      />

      {/* Member List Panel */}
      {activeRoom && selectedRoomId && (
        <MemberListPanel
          open={memberPanelOpen}
          onOpenChange={setMemberPanelOpen}
          roomId={selectedRoomId}
          members={activeRoomMembers}
          currentUserId={currentUser.id}
          isDirectMessage={activeRoom.__typename === "DirectMessageChatRoom"}
          onMembersChange={handleMembersChange}
        />
      )}
    </div>
  );
}
