import type { ChatMessageReplyTo, UserChatMessageNode } from "@/lib/types/chat";

/**
 * Get a preview content string for a message (for reply previews, list previews, etc.)
 */
export function getMessagePreviewContent(
  message: UserChatMessageNode,
  t: (key: string) => string,
): string | null {
  if (message.deletedDate) return t("deleted");

  if (message.__typename === "TextChatMessage") {
    return message.content ?? t("deleted");
  }

  // MediaChatMessage
  if (message.resource.__typename === "ImageResource") {
    return message.caption ?? t("imageAttachment");
  }
  return message.caption ?? t("fileAttachment");
}

/**
 * Get a preview content string for an in-bubble reply-to quote.
 *
 * Tests deletion FIRST (before checking the message type): a media reply
 * whose original was deleted must show the deleted placeholder, not
 * "[Image]"/"[File]". `replyTo.deletedDate` is authoritative for originals
 * deleted before load (server-resolved); `deletedIds` covers originals
 * deleted live during this session (see conversation-view's deletedMessageIds).
 */
export function getReplyPreviewContent(
  replyTo: ChatMessageReplyTo,
  t: (key: string) => string,
  deletedIds: ReadonlySet<string>,
): string {
  if (replyTo.deletedDate != null || deletedIds.has(replyTo.id)) {
    return t("deleted");
  }
  if (replyTo.__typename === "TextChatMessage") {
    return replyTo.content ?? t("deleted");
  }
  return (
    replyTo.caption ??
    (replyTo.resource.__typename === "ImageResource"
      ? t("imageAttachment")
      : t("fileAttachment"))
  );
}
