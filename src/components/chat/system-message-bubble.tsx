"use client";

import { Marker, MarkerContent } from "@/components/ui/marker";
import type { SystemChatMessageNode } from "@/lib/types/chat";
import { useTranslations } from "next-intl";

interface SystemMessageBubbleProps {
  message: SystemChatMessageNode;
}

/**
 * Centered notice (no flanking lines) — deliberately distinct from a day
 * separator so "joined/left" is never mistaken for a date. Unlike the day
 * separator, this IS announced as content (no aria-hidden): it's real
 * information, not decoration.
 */
export function SystemMessageBubble({ message }: SystemMessageBubbleProps) {
  const t = useTranslations("chat.systemMessage");

  let text: string;
  switch (message.__typename) {
    case "MemberJoinedChatMessage":
      text = t("memberJoined", { name: message.member.displayName });
      break;
    case "MemberLeftChatMessage":
      text = t("memberLeft", { name: message.member.displayName });
      break;
    default: {
      // Exhaustiveness check
      const _exhaustive: never = message;
      text = "";
      void _exhaustive;
    }
  }

  return (
    <Marker className="justify-center py-2">
      <MarkerContent className="flex-none italic">{text}</MarkerContent>
    </Marker>
  );
}
