import type {
  ChatMessageNode,
  ChatRoomDetailNode,
  ChatRoomListNode,
} from "@/lib/types/chat";
import {
  isSystemChatMessage,
  isUserChatMessage,
} from "@/lib/types/chat-guards";

export interface TimeLabels {
  yesterday: string;
  yesterdayWithTime: (time: string) => string;
  justNow: string;
  minutesAgo: (count: number) => string;
  hoursAgo: (count: number) => string;
}

/**
 * Format message time for display in the message bubble
 * - For today's messages: "3:42 PM"
 * - For yesterday: "Yesterday 3:42 PM"
 * - For this year: "Jan 5 3:42 PM"
 * - For older: "Jan 5, 2024 3:42 PM"
 */
export function formatMessageTime(
  dateString: string,
  locale: string,
  labels: Pick<TimeLabels, "yesterdayWithTime">,
): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const messageDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (messageDate.getTime() === today.getTime()) {
    // Today: "3:42 PM"
    return timeFormatter.format(date);
  } else if (messageDate.getTime() === yesterday.getTime()) {
    // Yesterday: "Yesterday 3:42 PM"
    return labels.yesterdayWithTime(timeFormatter.format(date));
  } else if (date.getFullYear() === now.getFullYear()) {
    // This year: "Jan 5 3:42 PM"
    const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return dateTimeFormatter.format(date);
  } else {
    // Older: "Jan 5, 2024 3:42 PM"
    const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return dateTimeFormatter.format(date);
  }
}

/**
 * Format relative time for display in chat room list preview
 * - < 1 min: "Just now"
 * - < 60 min: "5m ago"
 * - < 24 hours: "3h ago"
 * - Yesterday: "Yesterday"
 * - This year: "Jan 5"
 * - Older: "Jan 5, 2024"
 */
export function formatRelativeTime(
  dateString: string,
  locale: string,
  labels: TimeLabels,
): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const messageDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  if (diffMinutes < 1) {
    return labels.justNow;
  } else if (diffMinutes < 60) {
    return labels.minutesAgo(diffMinutes);
  } else if (diffHours < 24 && messageDate.getTime() === today.getTime()) {
    return labels.hoursAgo(diffHours);
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return labels.yesterday;
  } else if (date.getFullYear() === now.getFullYear()) {
    const dateFormatter = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    });
    return dateFormatter.format(date);
  } else {
    const dateFormatter = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return dateFormatter.format(date);
  }
}

/**
 * Check if a chat room is a direct message room
 */
export function isDirectMessageRoom(
  room: ChatRoomListNode | ChatRoomDetailNode,
): boolean {
  return room.__typename === "DirectMessageChatRoom";
}

/**
 * Get display name for a chat room
 * - Direct messages: other user's display name
 * - Group chats: room name
 */
export function getChatRoomDisplayName(
  room: ChatRoomListNode | ChatRoomDetailNode,
  currentUserId: number,
): string {
  if (room.__typename === "GroupChatRoom") return room.name;
  const otherMember = room.members.edges.find(
    (e) => e.node.user.id !== currentUserId,
  );
  if (!otherMember) return "Chat";
  return otherMember.node.user.displayName;
}

/**
 * Determine if sender name/avatar should be shown for a message.
 * System messages always break the grouping.
 * Messages are grouped when:
 * - Same user as previous message
 * - Not a system message
 * - Time gap is less than 5 minutes
 */
export function shouldShowSender(
  messages: ChatMessageNode[],
  index: number,
): boolean {
  if (index === 0) return true;
  const current = messages[index];
  const previous = messages[index - 1];

  // System messages always show independently (they break grouping)
  if (isSystemChatMessage(current) || isSystemChatMessage(previous))
    return true;

  // Both are user messages at this point
  if (isUserChatMessage(current) && isUserChatMessage(previous)) {
    // Different sender
    if (current.user.id !== previous.user.id) return true;

    // Time gap > 5 minutes breaks the group
    const timeDiff =
      new Date(current.createdDate).getTime() -
      new Date(previous.createdDate).getTime();
    if (timeDiff > 5 * 60 * 1000) return true;
  }

  return false;
}
