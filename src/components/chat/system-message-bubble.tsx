"use client";

import { TypographyMuted } from "@/components/ui/typography";
import type { SystemChatMessageNode } from "@/lib/types/chat";
import { useTranslations } from "next-intl";

interface SystemMessageBubbleProps {
  message: SystemChatMessageNode;
}

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
    <div className="flex justify-center py-2">
      <TypographyMuted className="italic text-sm">{text}</TypographyMuted>
    </div>
  );
}
