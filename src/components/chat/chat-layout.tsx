"use client";

import { loadChatRooms } from "@/app/[locale]/chat/actions";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { useChatSubscription } from "@/hooks/use-chat-subscription";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Edge, PageInfo } from "@/lib/graphql-connection";
import type {
  ChatMessageNode,
  ChatRoomDetailNode,
  ChatRoomListNode,
  ChatRoomMemberNode,
  ChatUser,
} from "@/lib/types/chat";
import type { ChatEvent } from "@/lib/types/chat-event";
import { MessageSquarePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
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

/** Room list event types for ChatRoomList */
type RoomListEvent =
  | { type: "upsert"; room: ChatRoomListNode }
  | { type: "remove"; roomId: string }
  | { type: "replace"; rooms: Edge<ChatRoomListNode>[]; pageInfo: PageInfo };

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

  // WebSocket event state
  const [unreadRoomIds, setUnreadRoomIds] = useState<Set<string>>(new Set());
  const [incomingEventVersion, setIncomingEventVersion] = useState(0);
  const incomingEventRef = useRef<ChatEvent | null>(null);
  const [reconnectCounter, setReconnectCounter] = useState(0);
  const [roomListEvent, setRoomListEvent] = useState<RoomListEvent | null>(
    null,
  );

  // Ref to track selectedRoomId for stable access in callbacks
  const selectedRoomIdRef = useRef(selectedRoomId);
  useEffect(() => {
    selectedRoomIdRef.current = selectedRoomId;
  }, [selectedRoomId]);

  // Sync selectedRoomId to URL (one-way sync: state -> URL)
  useEffect(() => {
    if (selectedRoomId) {
      router.replace(`${pathname}?room=${selectedRoomId}`, { scroll: false });
    } else {
      router.replace(pathname, { scroll: false });
    }
  }, [selectedRoomId, router, pathname]);

  // Dispatch event to ConversationView via version counter
  const dispatchToConversation = useCallback((event: ChatEvent) => {
    incomingEventRef.current = event;
    setIncomingEventVersion((v) => v + 1);
  }, []);

  // Stable getter for the current incoming event
  const getIncomingEvent = useCallback(() => incomingEventRef.current, []);

  // Handle incoming chat events
  const handleChatEvent = useCallback(
    (event: ChatEvent) => {
      const roomId = event.chatRoom.id;
      const isActiveRoom = roomId === selectedRoomIdRef.current;

      switch (event.__typename) {
        case "ChatMessageSentEvent": {
          // Update room list: move room to top, update last message
          setRoomListEvent({ type: "upsert", room: event.chatRoom });

          if (isActiveRoom) {
            // Pass to ConversationView for message insertion
            dispatchToConversation(event);
          } else {
            // Mark room as unread
            setUnreadRoomIds((prev) => new Set(prev).add(roomId));
          }
          break;
        }

        case "ChatMessageUpdatedEvent":
        case "ChatMessageDeletedEvent": {
          // Update room list last message if it matches
          setRoomListEvent({ type: "upsert", room: event.chatRoom });

          if (isActiveRoom) {
            dispatchToConversation(event);
          }
          break;
        }

        case "ChatRoomMemberAddedEvent": {
          if (event.member.user.id === currentUser.id) {
            // Current user was added to a new room
            setRoomListEvent({ type: "upsert", room: event.chatRoom });
            setUnreadRoomIds((prev) => new Set(prev).add(roomId));
          } else if (isActiveRoom) {
            // Someone else was added to the active room -- update member list
            setActiveRoomMembers((prev) => {
              // Re-check at update time: user may have switched rooms since dispatch
              if (roomId !== selectedRoomIdRef.current) return prev;
              if (prev.some((e) => e.node.id === event.member.id)) return prev;
              return [...prev, { cursor: event.member.id, node: event.member }];
            });
          }
          break;
        }

        case "ChatRoomMemberRemovedEvent": {
          if (event.userId === currentUser.id) {
            // Current user was removed
            setRoomListEvent({ type: "remove", roomId });
            if (isActiveRoom) {
              setSelectedRoomId(null);
              setMobileView("list");
            }
          } else if (isActiveRoom) {
            // Someone else was removed from the active room -- update member list
            setActiveRoomMembers((prev) => {
              // Re-check at update time: user may have switched rooms since dispatch
              if (roomId !== selectedRoomIdRef.current) return prev;
              return prev.filter((e) => e.node.user.id !== event.userId);
            });
          }
          break;
        }
      }
    },
    [currentUser.id, dispatchToConversation],
  );

  // Handle reconnection: re-fetch room list and signal ConversationView
  const handleReconnect = useCallback(async () => {
    const roomsResult = await loadChatRooms(20);
    if (roomsResult) {
      setRoomListEvent({
        type: "replace",
        rooms: roomsResult.edges,
        pageInfo: roomsResult.pageInfo,
      });
    }

    // Signal ConversationView to re-fetch
    setReconnectCounter((c) => c + 1);
  }, []);

  // Subscribe to chat events
  useChatSubscription({
    enabled: true,
    onEvent: handleChatEvent,
    onReconnect: handleReconnect,
  });

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    setMobileView("conversation");
    setMemberPanelOpen(false);
    // Clear unread state for this room
    setUnreadRoomIds((prev) => {
      const next = new Set(prev);
      next.delete(roomId);
      return next;
    });
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
          roomListEvent={roomListEvent}
          unreadRoomIds={unreadRoomIds}
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
            incomingEventVersion={incomingEventVersion}
            getIncomingEvent={getIncomingEvent}
            reconnectCounter={reconnectCounter}
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
