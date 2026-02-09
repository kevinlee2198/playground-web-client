"use client";

import { Button } from "@/components/ui/button";
import type { ChatRoomDetailNode } from "@/lib/types/chat";
import { ArrowLeft, Users } from "lucide-react";
import { getChatRoomDisplayName } from "./chat-utils";

interface ConversationHeaderProps {
  room: ChatRoomDetailNode;
  currentUserId: string;
  onToggleMembers: () => void;
  onBack: () => void;
}

export function ConversationHeader({
  room,
  currentUserId,
  onToggleMembers,
  onBack,
}: ConversationHeaderProps) {
  const displayName = getChatRoomDisplayName(room, currentUserId);

  return (
    <div className="flex items-center gap-3 border-b bg-background px-4 py-3">
      {/* Back button - visible on mobile only */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onBack}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      {/* Room name */}
      <div className="flex-1 truncate">
        <h2 className="truncate text-lg font-semibold">{displayName}</h2>
      </div>

      {/* Members button */}
      <Button variant="ghost" size="icon" onClick={onToggleMembers}>
        <Users className="h-5 w-5" />
      </Button>
    </div>
  );
}
