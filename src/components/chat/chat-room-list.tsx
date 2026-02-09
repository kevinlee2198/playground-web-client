"use client";

import { loadChatRooms } from "@/app/[locale]/chat/actions";
import { ChatRoomListItem } from "@/components/chat/chat-room-list-item";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Edge, PageInfo } from "@/lib/graphql-connection";
import type { ChatMessageNode, ChatRoomListNode } from "@/lib/types/chat";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

interface ChatRoomListProps {
  initialRooms: Edge<ChatRoomListNode>[];
  initialPageInfo: PageInfo;
  selectedRoomId: string | null;
  currentUserId: string;
  onSelectRoom: (roomId: string) => void;
  onNewChatClick: () => void;
  newRoom: ChatRoomListNode | null;
  lastMessageUpdate: { roomId: string; message: ChatMessageNode } | null;
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
            <EmptyTitle>{t("noRooms")}</EmptyTitle>
            <EmptyDescription>{t("createFirst")}</EmptyDescription>
          </EmptyHeader>
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
            />
          ))}

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} className="h-px" />

          {isLoading && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
