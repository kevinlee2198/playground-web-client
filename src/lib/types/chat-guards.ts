import type {
  ChatMessageNode,
  SystemChatMessageNode,
  UserChatMessageNode,
} from "@/lib/types/chat";

/** Type guard: is this a user-authored message? */
export function isUserChatMessage(
  msg: ChatMessageNode,
): msg is UserChatMessageNode {
  return (
    msg.__typename === "TextChatMessage" ||
    msg.__typename === "MediaChatMessage"
  );
}

/** Type guard: is this a system message? */
export function isSystemChatMessage(
  msg: ChatMessageNode,
): msg is SystemChatMessageNode {
  return (
    msg.__typename === "MemberJoinedChatMessage" ||
    msg.__typename === "MemberLeftChatMessage"
  );
}
