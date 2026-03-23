"use client";

import { loadChatRooms } from "@/app/[locale]/chat/actions";
import { ChatRoomListItem } from "@/components/chat/chat-room-list-item";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TypographyMuted } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import type { Edge, PageInfo } from "@/lib/graphql-connection";
import type { ChatMessageNode, ChatRoomListNode } from "@/lib/types/chat";
import { MessageCircle, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

/** Room list event types from ChatLayout */
type RoomListEvent =
  | { type: "upsert"; room: ChatRoomListNode }
  | { type: "remove"; roomId: string }
  | { type: "replace"; rooms: Edge<ChatRoomListNode>[]; pageInfo: PageInfo };

interface ChatRoomListProps {
  initialRooms: Edge<ChatRoomListNode>[];
  initialPageInfo: PageInfo;
  selectedRoomId: string | null;
  currentUserId: string;
  onSelectRoom: (roomId: string) => void;
  onNewChatClick: () => void;
  newRoom: ChatRoomListNode | null;
  lastMessageUpdate: { roomId: string; message: ChatMessageNode } | null;
  roomListEvent: RoomListEvent | null;
  unreadRoomIds: Set<string>;
}

export function ChatRoomList({
  initialRooms,
  initialPageInfo,
  selectedRoomId,
  currentUserId,
  onSelectRoom,
  onNewChatClick,
  newRoom,
  lastMessageUpdate,
  roomListEvent,
  unreadRoomIds,
}: ChatRoomListProps) {
  const t = useTranslations("chat");
  const [rooms, setRooms] = useState<Edge<ChatRoomListNode>[]>(initialRooms);
  const [pageInfo, setPageInfo] = useState<PageInfo>(initialPageInfo);
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Prepend new room when created
  useEffect(() => {
    if (!newRoom) return;
    setRooms((prev) => {
      // Avoid duplicates
      if (prev.some((e) => e.node.id === newRoom.id)) return prev;
      return [{ cursor: newRoom.id, node: newRoom }, ...prev];
    });
  }, [newRoom]);

  // Update room's last message when a new message is sent
  useEffect(() => {
    if (!lastMessageUpdate) return;

    const { roomId, message } = lastMessageUpdate;

    setRooms((prevRooms) => {
      return prevRooms.map((edge) => {
        if (edge.node.id === roomId) {
          return {
            ...edge,
            node: {
              ...edge.node,
              chatMessages: {
                edges: [{ node: message }],
              },
            },
          };
        }
        return edge;
      });
    });
  }, [lastMessageUpdate]);

  // Process WebSocket room list events
  useEffect(() => {
    if (!roomListEvent) return;

    switch (roomListEvent.type) {
      case "upsert": {
        setRooms((prev) => {
          // Remove existing entry if present
          const filtered = prev.filter(
            (e) => e.node.id !== roomListEvent.room.id,
          );
          // Prepend to top
          return [
            { cursor: roomListEvent.room.id, node: roomListEvent.room },
            ...filtered,
          ];
        });
        break;
      }
      case "remove": {
        setRooms((prev) =>
          prev.filter((e) => e.node.id !== roomListEvent.roomId),
        );
        break;
      }
      case "replace": {
        setRooms(roomListEvent.rooms);
        setPageInfo(roomListEvent.pageInfo);
        break;
      }
    }
  }, [roomListEvent]);

  // Load more rooms when sentinel comes into view
  const loadMore = useCallback(async () => {
    if (!pageInfo.hasNextPage || isLoading) return;

    setIsLoading(true);
    try {
      const result = await loadChatRooms(20, pageInfo.endCursor || undefined);
      if (result) {
        setRooms((prev) => [...prev, ...result.edges]);
        setPageInfo(result.pageInfo);
      }
    } catch (error) {
      console.error("Failed to load more chat rooms:", error);
    } finally {
      setIsLoading(false);
    }
  }, [pageInfo, isLoading]);

  // Set up IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "100px" },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [loadMore]);

  // Empty state
  if (rooms.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b">
          <Button className="w-full" variant="outline" onClick={onNewChatClick}>
            <Plus className="mr-2 h-4 w-4" />
            {t("newChat")}
          </Button>
        </div>
        <Empty className="flex-1 border-none">
          <EmptyHeader>
            {/* TODO: Replace with custom illustration */}
            <EmptyMedia variant="icon">
              <MessageCircle />
            </EmptyMedia>
            <EmptyTitle className="font-display font-semibold">
              {t("noRooms")}
            </EmptyTitle>
            <EmptyDescription>{t("createFirst")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/search" className={buttonVariants({ variant: "outline" })}>
              {t("findPeople")}
            </Link>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <Button className="w-full" variant="outline" onClick={onNewChatClick}>
          <Plus className="mr-2 h-4 w-4" />
          {t("newChat")}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {rooms.map((edge) => (
            <ChatRoomListItem
              key={edge.node.id}
              room={edge.node}
              isSelected={selectedRoomId === edge.node.id}
              currentUserId={currentUserId}
              onClick={() => onSelectRoom(edge.node.id)}
              hasUnread={unreadRoomIds.has(edge.node.id)}
            />
          ))}

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} className="h-px" />

          {isLoading && (
            <div className="p-4 text-center">
              <TypographyMuted>Loading...</TypographyMuted>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
