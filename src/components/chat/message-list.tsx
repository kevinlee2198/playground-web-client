"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { TypographyMuted } from "@/components/ui/typography";
import type { Edge } from "@/lib/graphql-connection";
import type {
  ChatMessageNode,
  ChatRoomRole,
  UserChatMessageNode,
} from "@/lib/types/chat";
import { isUserChatMessage } from "@/lib/types/chat-guards";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { shouldShowSender } from "./chat-utils";
import { MessageBubble } from "./message-bubble";
import { SystemMessageBubble } from "./system-message-bubble";

interface MessageListProps {
  messages: Edge<ChatMessageNode>[];
  currentUserId: number;
  currentUserRole: ChatRoomRole | null;
  onReply: (message: UserChatMessageNode) => void;
  onDelete: (messageId: string) => void;
  onLoadOlder: () => void;
  hasOlderMessages: boolean;
  isLoadingOlder: boolean;
  editingMessageId: string | null;
  onStartEdit: (messageId: string) => void;
  onSaveEdit: (messageId: string, content: string) => void;
  onCancelEdit: () => void;
}

export function MessageList({
  messages,
  currentUserId,
  currentUserRole,
  onReply,
  onDelete,
  onLoadOlder,
  hasOlderMessages,
  isLoadingOlder,
  editingMessageId,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
}: MessageListProps) {
  const t = useTranslations("chat");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const previousMessageCount = useRef(messages.length);
  const scrollHeightBeforeLoad = useRef<number | null>(null);
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);
  const isNearBottomRef = useRef(true);

  const getViewport = () =>
    scrollAreaRef.current?.querySelector<HTMLDivElement>(
      '[data-slot="scroll-area-viewport"]',
    );

  // Auto-scroll to bottom on initial mount
  useEffect(() => {
    if (isInitialMount.current && messages.length > 0) {
      const viewport = getViewport();
      if (viewport) {
        requestAnimationFrame(() => {
          viewport.scrollTop = viewport.scrollHeight;
          isInitialMount.current = false;
        });
      }
    }
  }, [messages.length]);

  // Scroll detection: track if user is near bottom and clear indicator when they scroll back
  useEffect(() => {
    const viewport = getViewport();
    if (!viewport) return;

    const handleScroll = () => {
      const nearBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <
        100;
      isNearBottomRef.current = nearBottom;

      if (nearBottom) {
        setShowNewMessageIndicator(false);
      }
    };

    viewport.addEventListener("scroll", handleScroll);
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll to bottom when new messages are added (not when loading older)
  useEffect(() => {
    if (
      !isInitialMount.current &&
      messages.length > previousMessageCount.current
    ) {
      const viewport = getViewport();
      if (viewport) {
        if (isNearBottomRef.current) {
          requestAnimationFrame(() => {
            viewport.scrollTop = viewport.scrollHeight;
          });
        } else {
          // User is scrolled up -- show indicator
          // Use queueMicrotask to defer state update and avoid synchronous setState in effect
          queueMicrotask(() => {
            setShowNewMessageIndicator(true);
          });
        }
      }
    }
    previousMessageCount.current = messages.length;
  }, [messages.length]);

  // Preserve scroll position after older messages are prepended
  useEffect(() => {
    if (scrollHeightBeforeLoad.current === null) return;

    const viewport = getViewport();
    if (!viewport) return;

    const previousHeight = scrollHeightBeforeLoad.current;
    scrollHeightBeforeLoad.current = null;
    viewport.scrollTop = viewport.scrollHeight - previousHeight;
  }, [messages.length]);

  // Intersection observer for loading older messages
  useEffect(() => {
    if (!hasOlderMessages || isLoadingOlder) return;

    const viewport = getViewport();
    if (!viewport || !sentinelRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingOlder) {
          scrollHeightBeforeLoad.current = viewport.scrollHeight;
          onLoadOlder();
        }
      },
      {
        root: viewport,
        rootMargin: "100px",
        threshold: 0.1,
      },
    );

    observerRef.current.observe(sentinelRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasOlderMessages, isLoadingOlder, onLoadOlder]);

  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      // Brief highlight effect
      element.classList.add("bg-accent/20");
      setTimeout(() => {
        element.classList.remove("bg-accent/20");
      }, 1000);
    }
  };

  const messageNodes = messages.map((edge) => edge.node);
  const groupingInfo = messageNodes.map((_, index) =>
    shouldShowSender(messageNodes, index),
  );

  return (
    <ScrollArea ref={scrollAreaRef} className="flex-1">
      <div className="flex flex-col pb-4 pt-4">
        {/* Top sentinel for reverse infinite scroll */}
        {hasOlderMessages && (
          <div ref={sentinelRef} className="h-4 w-full">
            {isLoadingOlder && (
              <div className="flex justify-center py-2">
                <TypographyMuted>Loading...</TypographyMuted>
              </div>
            )}
          </div>
        )}

        {/* Message bubbles */}
        {messageNodes.map((message, index) => {
          // System messages are rendered separately — must check BEFORE accessing .user
          if (!isUserChatMessage(message)) {
            return <SystemMessageBubble key={message.id} message={message} />;
          }

          // All .user accesses are safe below this point (narrowed to UserChatMessageNode)
          const isFirstInGroup = groupingInfo[index];

          return (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.user.id === currentUserId}
              showSender={isFirstInGroup}
              isFirstInGroup={isFirstInGroup}
              currentUserRole={currentUserRole}
              isEditing={editingMessageId === message.id}
              onReply={() => onReply(message)}
              onStartEdit={() => onStartEdit(message.id)}
              onSaveEdit={(content) => onSaveEdit(message.id, content)}
              onCancelEdit={onCancelEdit}
              onDelete={() => onDelete(message.id)}
              onScrollToReply={scrollToMessage}
            />
          );
        })}

        {/* New messages indicator */}
        {showNewMessageIndicator && (
          <div className="sticky bottom-2 flex justify-center px-4">
            <button
              onClick={() => {
                const viewport = getViewport();
                if (viewport) {
                  viewport.scrollTo({
                    top: viewport.scrollHeight,
                    behavior: "smooth",
                  });
                }
                setShowNewMessageIndicator(false);
              }}
              className={cn(
                "rounded-full bg-primary px-4 py-1.5 text-primary-foreground",
                "text-sm font-medium shadow-md",
                "hover:bg-primary/90 transition-colors",
              )}
            >
              {t("newMessages")}
            </button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
