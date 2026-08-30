"use client";

import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
  useMessageScrollerScrollable,
} from "@/components/ui/message-scroller";
import { TypographyMuted } from "@/components/ui/typography";
import { toast } from "@/components/ui/toast";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { Edge } from "@/lib/graphql-connection";
import type {
  ChatMessageNode,
  ChatRoomRole,
  UserChatMessageNode,
} from "@/lib/types/chat";
import { isUserChatMessage } from "@/lib/types/chat-guards";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { buildThreadItems } from "./chat-thread-utils";
import { DaySeparator } from "./day-separator";
import { MessageBubble } from "./message-bubble";
import { SystemMessageBubble } from "./system-message-bubble";

interface MessageListProps {
  messages: Edge<ChatMessageNode>[];
  currentUserId: number;
  currentUserRole: ChatRoomRole | null;
  /** Originals deleted live during this session (see conversation-view). */
  deletedMessageIds: ReadonlySet<string>;
  onReply: (message: UserChatMessageNode) => void;
  onDelete: (messageId: string) => void;
  /** Resolves to false on failure so the list can toast. Retry is the natural scroll-away/scroll-back transition — deliberately no automatic re-arm (see triggerLoadOlder). */
  onLoadOlder: () => Promise<boolean>;
  hasOlderMessages: boolean;
  isLoadingOlder: boolean;
  editingMessageId: string | null;
  onStartEdit: (messageId: string) => void;
  onSaveEdit: (messageId: string, content: string) => void;
  onCancelEdit: () => void;
}

/** Briefly highlights a jumped-to message; all loaded items stay in the DOM. */
function flashHighlight(messageId: string) {
  const el = document.getElementById(`message-${messageId}`);
  if (!el) return;
  // Permanent (idempotent) transition classes so the highlight fades for
  // motion-safe users; under reduced motion the class toggle is instant but
  // still shows a brief static background.
  el.classList.add("motion-safe:transition-colors", "duration-700");
  el.classList.add("bg-accent/20");
  window.setTimeout(() => el.classList.remove("bg-accent/20"), 1000);
}

export function MessageList(props: MessageListProps) {
  const { isLoadingOlder } = props;
  const t = useTranslations("chat");
  const prefersReducedMotion = usePrefersReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);

  return (
    <MessageScrollerProvider
      autoScroll
      defaultScrollPosition="end"
      scrollEdgeThreshold={100}
    >
      <MessageScroller className="flex-1">
        <MessageScrollerViewport ref={viewportRef} aria-label={t("thread.ariaLabel")}>
          <MessageScrollerContent
            className="gap-1 py-4"
            aria-busy={isLoadingOlder || undefined}
          >
            <MessageListInner {...props} viewportRef={viewportRef} />
          </MessageScrollerContent>
        </MessageScrollerViewport>

        {/* Load-older indicator: absolute overlay, sibling of Viewport — NOT a Content child */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-2"
          aria-hidden="true"
        >
          {isLoadingOlder && (
            <TypographyMuted className="rounded-full bg-background/90 px-3 py-1 shadow-sm">
              {t("loading.messages")}
            </TypographyMuted>
          )}
        </div>

        <MessageScrollerButton
          direction="end"
          behavior={prefersReducedMotion ? "auto" : "smooth"}
          aria-label={t("thread.jumpToLatest")}
        />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

interface MessageListInnerProps extends MessageListProps {
  viewportRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Hooks that depend on `MessageScrollerProvider` context (`useMessageScroller`,
 * `useMessageScrollerScrollable`) must be called from a component rendered
 * INSIDE the provider — they throw outside it. Hence this inner component.
 */
function MessageListInner({
  messages,
  currentUserId,
  currentUserRole,
  deletedMessageIds,
  onReply,
  onDelete,
  onLoadOlder,
  hasOlderMessages,
  isLoadingOlder,
  editingMessageId,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  viewportRef,
}: MessageListInnerProps) {
  const t = useTranslations("chat");
  const prefersReducedMotion = usePrefersReducedMotion();
  const { scrollToMessage } = useMessageScroller();
  const { start } = useMessageScrollerScrollable();

  const messageNodes = useMemo(() => messages.map((e) => e.node), [messages]);
  const threadItems = useMemo(
    () => buildThreadItems(messageNodes),
    [messageNodes],
  );

  // Edge-triggered load-older: fire only on the true→false transition of
  // `start` (the top edge becoming unreachable), never level-triggered —
  // `useMessageScrollerScrollable` starts as a placeholder before
  // measurement and updates on a deferred rAF, so a level-triggered check
  // would eagerly fetch on every mount and double-fire in the stale window.
  const prevStart = useRef(start);

  const triggerLoadOlder = useCallback(async () => {
    const success = await onLoadOlder();
    if (!success) {
      toast.add({ title: t("errors.loadOlder"), type: "error" });
      // No re-arm here: setting prevStart back to true would be consumed by
      // the very next effect run (isLoadingOlder flipping is a dependency),
      // creating an unbounded fetch/toast loop under real network latency.
      // Retry is the natural start false→true→false transition: scroll away
      // and back to the top.
    }
  }, [onLoadOlder, t]);

  useEffect(() => {
    const was = prevStart.current;
    prevStart.current = start;
    if (was && !start && hasOlderMessages && !isLoadingOlder) {
      void triggerLoadOlder();
    }
  }, [start, hasOlderMessages, isLoadingOlder, triggerLoadOlder]);

  // Short-thread fallback: if the top edge is never reachable (thread
  // shorter than the viewport), `start` never transitions. Measure the
  // viewport directly, guarded against a failure busy-loop by only firing
  // when the item count changed since the last attempt.
  const lastFallbackCount = useRef(-1);
  useEffect(() => {
    if (!hasOlderMessages || isLoadingOlder) return;
    if (lastFallbackCount.current === threadItems.length) return;
    const raf = requestAnimationFrame(() => {
      const vp = viewportRef.current;
      if (vp && vp.scrollHeight <= vp.clientHeight) {
        lastFallbackCount.current = threadItems.length;
        void triggerLoadOlder();
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [hasOlderMessages, isLoadingOlder, threadItems.length, viewportRef, triggerLoadOlder]);

  const onScrollToReply = useCallback(
    (messageId: string) => {
      const ok = scrollToMessage(messageId, {
        align: "center",
        // JS scroll — CSS `motion-safe` classes don't affect `scrollTo`.
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
      if (!ok) {
        toast.add({ title: t("notices.originalNotAvailable"), type: "info" });
        return;
      }
      flashHighlight(messageId);
    },
    [scrollToMessage, prefersReducedMotion, t],
  );

  return (
    <>
      {threadItems.map((item) => {
        const dayMarker = item.isDayStart && (
          <DaySeparator timestamp={item.dayTimestamp} />
        );

        if (!isUserChatMessage(item.message)) {
          return (
            <MessageScrollerItem
              key={item.message.id}
              messageId={item.message.id}
              className={cn(item.isGroupStart && "mt-3")}
            >
              {dayMarker}
              <SystemMessageBubble message={item.message} />
            </MessageScrollerItem>
          );
        }

        const message = item.message;
        return (
          <MessageScrollerItem
            key={message.id}
            messageId={message.id}
            className={cn(item.isGroupStart && "mt-3")}
          >
            {dayMarker}
            <MessageBubble
              message={message}
              isOwn={message.user.id === currentUserId}
              isGroupStart={item.isGroupStart}
              currentUserRole={currentUserRole}
              isEditing={editingMessageId === message.id}
              deletedMessageIds={deletedMessageIds}
              onReply={() => onReply(message)}
              onStartEdit={() => onStartEdit(message.id)}
              onSaveEdit={(content) => onSaveEdit(message.id, content)}
              onCancelEdit={onCancelEdit}
              onDelete={() => onDelete(message.id)}
              onScrollToReply={onScrollToReply}
            />
          </MessageScrollerItem>
        );
      })}
    </>
  );
}
