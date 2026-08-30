"use client";

import { Button } from "@/components/ui/button";
import { TypographyH5 } from "@/components/ui/typography";
import type { ChatRoomDetailNode } from "@/lib/types/chat";
import { ArrowLeft, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { getChatRoomDisplayName } from "./chat-utils";

interface ConversationHeaderProps {
  room: ChatRoomDetailNode;
  currentUserId: number;
  onToggleMembers: () => void;
  onBack: () => void;
}

export function ConversationHeader({
  room,
  currentUserId,
  onToggleMembers,
  onBack,
}: ConversationHeaderProps) {
  const t = useTranslations("chat");
  const tMembers = useTranslations("chat.members");
  const displayName = getChatRoomDisplayName(room, currentUserId);

  return (
    <div className="flex items-center gap-3 border-b bg-background px-4 py-3">
      {/* Back button - visible on mobile only; ≥44px touch target */}
      <Button
        variant="ghost"
        size="icon"
        className="size-11 shrink-0 md:hidden"
        onClick={onBack}
        aria-label={t("back")}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      {/* Room name */}
      <div className="flex-1 truncate">
        <TypographyH5 as="h2" className="truncate">
          {displayName}
        </TypographyH5>
      </div>

      {/* Members button — ≥44px touch target on mobile */}
      <Button
        variant="ghost"
        size="icon"
        className="size-11 shrink-0 md:size-9"
        onClick={onToggleMembers}
        aria-label={tMembers("title")}
      >
        <Users className="h-5 w-5" />
      </Button>
    </div>
  );
}
