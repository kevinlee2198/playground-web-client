"use client";

import {
  formatRelativeTime,
  getChatRoomDisplayName,
} from "@/components/chat/chat-utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TypographyMuted } from "@/components/ui/typography";
import type { ChatRoomListNode } from "@/lib/types/chat";
import { isUserChatMessage } from "@/lib/types/chat-guards";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";

interface ChatRoomListItemProps {
  room: ChatRoomListNode;
  isSelected: boolean;
  currentUserId: string;
  onClick: () => void;
  hasUnread: boolean;
}

export function ChatRoomListItem({
  room,
  isSelected,
  currentUserId,
  onClick,
  hasUnread,
}: ChatRoomListItemProps) {
  const t = useTranslations("chat");
  const tTime = useTranslations("chat.time");
  const locale = useLocale();
  const timeLabels = {
    yesterday: tTime("yesterday"),
    yesterdayWithTime: (time: string) => tTime("yesterdayWithTime", { time }),
    justNow: tTime("justNow"),
    minutesAgo: (count: number) => tTime("minutesAgo", { count }),
    hoursAgo: (count: number) => tTime("hoursAgo", { count }),
  };

  // Get display name based on whether it's a DM or group chat
  const displayName = getChatRoomDisplayName(room, currentUserId);

  // Get the first letter for the avatar fallback
  const avatarFallback = displayName.charAt(0).toUpperCase();

  // Get last message preview
  const lastMessage = room.chatMessages?.edges[0]?.node;

  let lastMessagePreview = "";
  let lastMessageTime = "";

  if (lastMessage) {
    lastMessageTime = formatRelativeTime(
      lastMessage.createdDate,
      locale,
      timeLabels,
    );

    if (isUserChatMessage(lastMessage)) {
      if (lastMessage.deletedDate) {
        lastMessagePreview = t("message.deleted");
      } else if (lastMessage.__typename === "TextChatMessage") {
        const content = lastMessage.content;
        if (content) {
          lastMessagePreview =
            content.length > 50 ? content.substring(0, 50) + "..." : content;
        }
      } else if (lastMessage.__typename === "MediaChatMessage") {
        if (lastMessage.resource.__typename === "ImageResource") {
          lastMessagePreview = t("message.imageAttachment");
        } else {
          lastMessagePreview = t("message.fileAttachment");
        }
      }
    } else if (lastMessage.__typename === "MemberJoinedChatMessage") {
      lastMessagePreview = t("systemMessage.memberJoined", {
        name: lastMessage.member.displayName,
      });
    } else if (lastMessage.__typename === "MemberLeftChatMessage") {
      lastMessagePreview = t("systemMessage.memberLeft", {
        name: lastMessage.member.displayName,
      });
    }
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 p-3 text-left transition-colors hover:bg-accent/50",
        isSelected && "bg-accent",
      )}
    >
      <Avatar size="default" className="shrink-0 mt-0.5">
        <AvatarFallback>{avatarFallback}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h3 className="font-semibold text-sm truncate">{displayName}</h3>
          <div className="flex items-center gap-1.5 shrink-0">
            {lastMessageTime && (
              <span className="text-xs text-muted-foreground">
                {lastMessageTime}
              </span>
            )}
            {hasUnread && (
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            )}
          </div>
        </div>

        {lastMessagePreview && (
          <TypographyMuted
            className={cn(
              "truncate",
              lastMessage &&
                isUserChatMessage(lastMessage) &&
                lastMessage.deletedDate &&
                "italic",
            )}
          >
            {lastMessagePreview}
          </TypographyMuted>
        )}
      </div>
    </button>
  );
}
