import type { UserChatMessageNode } from "@/lib/types/chat";

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
